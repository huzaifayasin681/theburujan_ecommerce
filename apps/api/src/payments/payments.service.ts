import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { PayPalGateway, StripeGateway } from './payment-provider';
const minor = (value: Prisma.Decimal) => value.times(100).toDecimalPlaces(0).toNumber();
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeGateway,
    private readonly paypal: PayPalGateway,
    private readonly inventory: InventoryService,
  ) {}
  async initialize(user: AuthUser, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!payment)
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment was not found' });
    if (
      payment.order.userId !== user.id &&
      !user.permissions.includes('orders.update') &&
      !user.roles.includes('SUPER_ADMIN')
    )
      throw new ForbiddenException({
        code: 'PAYMENT_FORBIDDEN',
        message: 'You cannot access this payment',
      });
    if (payment.status !== 'PENDING')
      throw new ConflictException({
        code: 'PAYMENT_ALREADY_INITIALIZED',
        message: 'Payment has already been initialized',
      });
    if (payment.provider === 'COD') return { provider: 'COD', clientSecret: null };
    if (!['STRIPE', 'PAYPAL'].includes(payment.provider))
      throw new BadRequestException({
        code: 'PROVIDER_UNSUPPORTED',
        message: 'Payment provider is not enabled',
      });
    const gateway = payment.provider === 'PAYPAL' ? this.paypal : this.stripe;
    const intent = await gateway.createIntent({
      amountMinor: minor(payment.amount),
      currency: payment.currency,
      idempotencyKey: payment.idempotencyKey,
      orderId: payment.orderId,
    });
    await this.prisma.payment.update({
      where: { id },
      data: {
        transactionId: intent.transactionId,
        status: intent.status,
        metadata: { initializedAt: new Date().toISOString() },
      },
    });
    return { provider: payment.provider, clientSecret: intent.clientSecret, redirectUrl:intent.redirectUrl };
  }
  async capturePayPal(user: AuthUser, providerOrderId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { provider: 'PAYPAL', transactionId: providerOrderId }, include: { order: true } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'PayPal payment was not found' });
    if (payment.order.userId !== user.id && !user.permissions.includes('orders.update') && !user.roles.includes('SUPER_ADMIN')) throw new ForbiddenException({ code: 'PAYMENT_FORBIDDEN', message: 'You cannot capture this payment' });
    if (payment.status === 'PAID') return { status: 'PAID', orderId: payment.orderId };
    if (payment.status !== 'PENDING') throw new ConflictException({ code: 'PAYMENT_NOT_CAPTURABLE', message: `Payment cannot be captured from ${payment.status}` });
    const capture = await this.paypal.captureOrder(providerOrderId, `capture:${payment.id}`);
    if (capture.status !== 'COMPLETED' || capture.captureStatus !== 'COMPLETED' || !capture.captureId) throw new ConflictException({ code: 'PAYMENT_NOT_COMPLETED', message: 'PayPal did not confirm a completed capture' });
    const captureId = capture.captureId;
    await this.prisma.$transaction(async (tx) => this.markPaid(tx, payment.id, captureId, 'PayPal capture verified by server'));
    return { status: 'PAID', orderId: payment.orderId };
  }
  async webhook(payload: Buffer, signature: string) {
    if (!this.stripe.verify(payload, signature))
      throw new UnauthorizedException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Webhook signature is invalid',
      });
    const event = JSON.parse(payload.toString('utf8')) as {
      id: string;
      type: string;
      data: { object: { id: string; status?: string; payment_intent?:string } };
    };
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.paymentEvent.findUnique({
          where: { provider_providerEventId: { provider: 'STRIPE', providerEventId: event.id } },
        });
        if (existing) return { received: true, duplicate: true };
        const payment = await tx.payment.findUnique({
          where: { transactionId: event.data.object.id },
        });
        const stored = await tx.paymentEvent.create({
          data: {
            provider: 'STRIPE',
            providerEventId: event.id,
            type: event.type,
            payloadHash,
            paymentId: payment?.id,
          },
        });
        if (payment) {
          let status: PaymentStatus | undefined;
          if (event.type === 'payment_intent.succeeded') status = 'PAID';
          if(event.type==='checkout.session.completed')status='PAID';
          if (event.type === 'payment_intent.payment_failed') status = 'FAILED';
          if (event.type === 'payment_intent.canceled') status = 'CANCELLED';
          if (status) {
            await tx.payment.update({ where: { id: payment.id }, data: { status,transactionId:event.data.object.payment_intent??payment.transactionId } });
            if (status === 'PAID') {
              const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
              if (order.status === 'PENDING') {
                await tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });
                await this.inventory.commitOrder(tx, order.id);
                await tx.orderStatusHistory.create({
                  data: {
                    orderId: order.id,
                    fromStatus: 'PENDING',
                    toStatus: 'CONFIRMED',
                    notes: 'Payment verified by provider webhook',
                  },
                });
              }
            }
          }
          await tx.paymentEvent.update({
            where: { id: stored.id },
            data: { processedAt: new Date() },
          });
        }
        return { received: true, duplicate: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async paypalWebhook(payload: Buffer, headers: Record<string, string | undefined>) {
    let event: { id: string; event_type: string; resource: { id?: string; status?: string; supplementary_data?: { related_ids?: { order_id?: string } } } };
    try { event = JSON.parse(payload.toString('utf8')) as typeof event; } catch { throw new BadRequestException({ code: 'WEBHOOK_INVALID', message: 'Webhook payload is invalid JSON' }); }
    if (!await this.paypal.verifyWebhook(event, headers)) throw new UnauthorizedException({ code: 'WEBHOOK_SIGNATURE_INVALID', message: 'PayPal webhook signature is invalid' });
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.paymentEvent.findUnique({ where: { provider_providerEventId: { provider: 'PAYPAL', providerEventId: event.id } } });
      if (existing) return { received: true, duplicate: true };
      const providerOrderId = event.resource.supplementary_data?.related_ids?.order_id;
      const payment = await tx.payment.findFirst({ where: { provider: 'PAYPAL', OR: [{ transactionId: providerOrderId ?? '' }, { transactionId: event.resource.id ?? '' }] } });
      const stored = await tx.paymentEvent.create({ data: { provider: 'PAYPAL', providerEventId: event.id, type: event.event_type, payloadHash, paymentId: payment?.id } });
      try {
        if (payment && event.event_type === 'PAYMENT.CAPTURE.COMPLETED' && event.resource.id) await this.markPaid(tx, payment.id, event.resource.id, 'PayPal capture verified by webhook');
        if (payment && ['PAYMENT.CAPTURE.DENIED', 'CHECKOUT.PAYMENT-APPROVAL.REVERSED'].includes(event.event_type)) await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: event.event_type } });
        await tx.paymentEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
      } catch (error) { await tx.paymentEvent.update({ where: { id: stored.id }, data: { error: error instanceof Error ? error.message.slice(0, 1000) : 'Webhook processing failed' } }); throw error; }
      return { received: true, duplicate: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  private async markPaid(tx: Prisma.TransactionClient, paymentId: string, transactionId: string, notes: string) {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
    if (payment.status === 'PAID') return;
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'PAID', transactionId, failureReason: null } });
    if (payment.order.status === 'PENDING') {
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'CONFIRMED' } });
      await this.inventory.commitOrder(tx, payment.orderId);
      await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: 'PENDING', toStatus: 'CONFIRMED', notes } });
    }
  }
  async refund(
    actorId: string,
    paymentId: string,
    key: string,
    input: { amountMinor: number; reason: string },
  ) {
    if (key.length < 16)
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'A unique Idempotency-Key is required',
      });
    const prior = await this.prisma.refund.findUnique({ where: { idempotencyKey: key } });
    if (prior) return prior;
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: { where: { status: 'SUCCEEDED' } }, order: { select: { status: true } } },
    });
    if (!payment || payment.status !== 'PAID' || (payment.provider !== 'COD' && !payment.transactionId))
      throw new ConflictException({
        code: 'PAYMENT_NOT_REFUNDABLE',
        message: 'Payment cannot be refunded',
      });
    if (!['DELIVERED', 'RETURNED', 'PARTIALLY_REFUNDED'].includes(payment.order.status)) throw new ConflictException({ code: 'ORDER_NOT_REFUNDABLE', message: `Order cannot be refunded from ${payment.order.status}` });
    const already = payment.refunds.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const amount = new Prisma.Decimal(input.amountMinor).div(100);
    if (amount.plus(already).greaterThan(payment.amount))
      throw new ConflictException({
        code: 'REFUND_EXCEEDS_PAYMENT',
        message: 'Refund exceeds the paid amount',
      });
    const record = await this.prisma.refund.create({
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        idempotencyKey: key,
        amount,
        currency: payment.currency,
        reason: input.reason,
        status: 'PROCESSING',
      },
    });
    try {
      const result = payment.provider === 'COD'
        ? { refundId: `COD-REFUND-${record.id}`, status: 'succeeded' as const }
        : await (payment.provider === 'PAYPAL' ? this.paypal : this.stripe).refund({ transactionId: payment.transactionId!, amountMinor: input.amountMinor, idempotencyKey: key });
      return await this.prisma.$transaction(async (tx) => {
        const refund = await tx.refund.update({
          where: { id: record.id },
          data: {
            providerRefundId: result.refundId,
            status: result.status === 'succeeded' ? 'SUCCEEDED' : 'PROCESSING',
          },
        });
        if (refund.status === 'SUCCEEDED') {
          const full = amount.plus(already).equals(payment.amount);
          const nextStatus = full ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: nextStatus },
          });
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: nextStatus },
          });
          await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: nextStatus, changedById: actorId, notes: input.reason } });
        }
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'refund.issued',
            resourceType: 'Refund',
            resourceId: refund.id,
            metadata: { amount: amount.toString() },
          },
        });
        return refund;
      });
    } catch (error) {
      await this.prisma.refund.update({ where: { id: record.id }, data: { status: 'FAILED' } });
      throw error;
    }
  }
}
