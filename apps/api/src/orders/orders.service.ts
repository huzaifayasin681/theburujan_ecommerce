import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ['REFUNDED'],
};
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly jobs: JobsService,
  ) {}
  async listMine(userId: string, page: number) {
    const limit = 20;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (Math.max(1, page) - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          currency: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return {
      data,
      meta: { page: Math.max(1, page), limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async getAuthorized(user: AuthUser, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { select: { provider: true, status: true, amount: true, currency: true } },
        shipments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order)
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order was not found' });
    if (
      order.userId !== user.id &&
      !user.roles.includes('SUPER_ADMIN') &&
      !user.permissions.includes('orders.read')
    )
      throw new ForbiddenException({
        code: 'ORDER_FORBIDDEN',
        message: 'You cannot access this order',
      });
    return order;
  }
  async cancelMine(userId:string,id:string){const order=await this.prisma.order.findFirst({where:{id,userId}});if(!order)throw new NotFoundException({code:'ORDER_NOT_FOUND',message:'Order was not found'});return this.transition(id,'CANCELLED',userId,'Cancelled by customer')}
  async transition(id: string, to: OrderStatus, actorId: string, notes?: string) {
    const changedOrder = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (!order)
          throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order was not found' });
        if (!ORDER_TRANSITIONS[order.status].includes(to))
          throw new ConflictException({
            code: 'INVALID_ORDER_TRANSITION',
            message: `Order cannot transition from ${order.status} to ${to}`,
          });
        const changed = await tx.order.updateMany({
          where: { id, status: order.status },
          data: { status: to },
        });
        if (changed.count !== 1)
          throw new ConflictException({
            code: 'ORDER_CHANGED',
            message: 'Order was modified by another request',
          });
        if (to === 'CONFIRMED') await this.inventory.commitOrder(tx, id);
        if (to === 'CANCELLED') await this.inventory.cancelOrder(tx, id);
        if (to === 'DELIVERED') {
          await tx.shipment.updateMany({ where: { orderId: id, deliveredAt: null }, data: { deliveredAt: new Date() } });
          await tx.payment.updateMany({ where: { orderId: id, provider: 'COD', status: 'PENDING' }, data: { status: 'PAID', transactionId: `COD-${order.orderNumber}` } });
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: order.status,
            toStatus: to,
            changedById: actorId,
            notes,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'order.status_changed',
            resourceType: 'Order',
            resourceId: id,
            metadata: { from: order.status, to },
          },
        });
        return tx.order.findUniqueOrThrow({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const template = to === 'CONFIRMED' ? 'order-confirmed' : to === 'PROCESSING' ? 'order-processing' : to === 'DELIVERED' ? 'order-delivered' : to === 'CANCELLED' ? 'order-cancelled' : undefined;
    if (template) await this.jobs.sendEmail({ to: changedOrder.email, template, variables: { orderNumber: changedOrder.orderNumber } }, `order:${changedOrder.id}:${to.toLowerCase()}`);
    return changedOrder;
  }
  async ship(id: string, actorId: string, input: { carrier: string; trackingNumber: string; trackingUrl?: string }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order was not found' });
      if (order.status !== 'PACKED') throw new ConflictException({ code: 'INVALID_ORDER_TRANSITION', message: `Order cannot be shipped from ${order.status}` });
      const changed = await tx.order.updateMany({ where: { id, status: 'PACKED' }, data: { status: 'SHIPPED' } });
      if (changed.count !== 1) throw new ConflictException({ code: 'ORDER_CHANGED', message: 'Order was modified by another request' });
      const shipment = await tx.shipment.create({ data: { orderId: id, carrier: input.carrier, trackingNumber: input.trackingNumber, trackingUrl: input.trackingUrl, shippedAt: new Date() } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: 'PACKED', toStatus: 'SHIPPED', changedById: actorId, notes: `Shipped with ${input.carrier}; tracking ${input.trackingNumber}` } });
      await tx.auditLog.create({ data: { actorId, action: 'order.shipped', resourceType: 'Order', resourceId: id, metadata: { shipmentId: shipment.id, carrier: input.carrier, trackingNumber: input.trackingNumber } } });
      return shipment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id }, select: { orderNumber: true, email: true } });
    await this.jobs.sendEmail({ to: order.email, template: 'order-shipped', variables: { orderNumber: order.orderNumber, trackingNumber: result.trackingNumber ?? '' } }, `order:${id}:shipped`);
    return result;
  }
}
