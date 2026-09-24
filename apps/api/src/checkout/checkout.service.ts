import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ulid } from 'ulid';
import { addMoney, money, multiplyMoney, percentage } from '../common/money';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

type AddressInput = { name: string; phone: string; country: string; state: string; city: string; postalCode: string; line1: string; line2?: string };
type CheckoutInput = { email: string; shippingAddress: AddressInput; billingAddress: AddressInput; shippingMethodId: string; paymentProvider: 'COD' | 'STRIPE' | 'PAYPAL'; couponCode?: string; customerNote?: string; acceptTerms: boolean };

const jsonStrings = (value: Prisma.JsonValue | null): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const postalMatches = (postalCode: string, patterns: string[]): boolean =>
  patterns.length === 0 || patterns.some((pattern) =>
    pattern.endsWith('*')
      ? postalCode.toUpperCase().startsWith(pattern.slice(0, -1).toUpperCase())
      : postalCode.toUpperCase() === pattern.toUpperCase(),
  );

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService, private readonly inventory: InventoryService, private readonly config: ConfigService, private readonly jobs: JobsService) {}
  async placeOrder(userId: string, key: string, input: CheckoutInput) {
    if (key.length < 16 || key.length > 128) throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'A unique Idempotency-Key of at least 16 characters is required' });
    if (!input.acceptTerms) throw new BadRequestException({ code: 'TERMS_REQUIRED', message: 'Terms must be accepted' });
    const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: key }, include: { payments: true } });
    if (existing) { const payment = existing.payments[0]; if (!payment) throw new ConflictException({ code: 'ORDER_PAYMENT_MISSING', message: 'Existing order has no payment record' }); return { order: existing, payment: { id: payment.id, provider: payment.provider, status: payment.status, clientSecret: null } }; }
    const result = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, expiresAt: { gt: new Date() } },
        include: { items: { include: {
          product: { include: { categories: true, taxClass: { include: { rates: { where: { active: true }, orderBy: { priority: 'desc' } } } } } },
          variant: { include: { inventory: true, values: { include: { value: { include: { attribute: true } } } } } },
        } } },
      });
      if (!cart?.items.length) throw new BadRequestException({ code: 'CART_EMPTY', message: 'Your cart is empty' });
      const shipping = await tx.shippingMethod.findFirst({ where: { id: input.shippingMethodId, active: true, zone: { active: true } }, include: { zone: true } });
      const addressCountry = input.shippingAddress.country.trim().toUpperCase();
      const addressState = input.shippingAddress.state.trim().toUpperCase();
      const countries = shipping ? jsonStrings(shipping.zone.countries).map((value) => value.toUpperCase()) : [];
      const states = shipping ? jsonStrings(shipping.zone.states).map((value) => value.toUpperCase()) : [];
      const postals = shipping ? jsonStrings(shipping.zone.postalCodes) : [];
      if (!shipping || !countries.includes(addressCountry) || (states.length > 0 && !states.includes(addressState)) || !postalMatches(input.shippingAddress.postalCode, postals)) {
        throw new NotFoundException({ code: 'SHIPPING_UNAVAILABLE', message: 'Selected shipping method is unavailable for this address' });
      }
      const lineSubtotals = cart.items.map((item) => multiplyMoney(item.variant.salePrice ?? item.variant.price ?? item.product.salePrice ?? item.product.basePrice, item.quantity));
      const subtotal = addMoney(...lineSubtotals);
      let discount = money(0);
      const coupon = input.couponCode ? await tx.coupon.findUnique({ where: { code: input.couponCode.trim().toUpperCase() }, include: { products: true, variants: true, categories: true, customers: true } }) : null;
      if (input.couponCode) {
        const now = new Date();
        if (!coupon || !coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt <= now) || (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) || (coupon.minimumSpend && subtotal.lessThan(coupon.minimumSpend))) throw new ConflictException({ code: 'COUPON_INVALID', message: 'Coupon is invalid or no longer eligible' });
        if (coupon.perUserLimit && await tx.couponUsage.count({ where: { couponId: coupon.id, userId } }) >= coupon.perUserLimit) throw new ConflictException({ code: 'COUPON_LIMIT', message: 'Coupon usage limit reached' });
        if (coupon.customers.length > 0 && !coupon.customers.some((entry) => entry.userId === userId)) throw new ConflictException({ code: 'COUPON_CUSTOMER_RESTRICTED', message: 'Coupon is not available for this account' });
        if (coupon.firstOrderOnly && await tx.order.count({ where: { userId, status: { not: 'CANCELLED' } } }) > 0) throw new ConflictException({ code: 'COUPON_FIRST_ORDER_ONLY', message: 'Coupon is valid only for a first order' });
        const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        if (coupon.minimumQuantity && totalQuantity < coupon.minimumQuantity) throw new ConflictException({ code: 'COUPON_MINIMUM_QUANTITY', message: 'Cart does not meet the coupon quantity requirement' });
        const eligibleLines = cart.items.map((item, index) => {
          const productRestricted = coupon.products.length > 0;
          const variantRestricted = coupon.variants.length > 0;
          const categoryRestricted = coupon.categories.length > 0;
          const eligible = (!productRestricted || coupon.products.some((entry) => entry.productId === item.productId))
            && (!variantRestricted || coupon.variants.some((entry) => entry.variantId === item.variantId))
            && (!categoryRestricted || coupon.categories.some((entry) => item.product.categories.some((category) => category.categoryId === entry.categoryId)));
          return eligible ? lineSubtotals[index] ?? money(0) : money(0);
        });
        const eligibleSubtotal = addMoney(...eligibleLines);
        if (eligibleSubtotal.isZero() && (coupon.products.length > 0 || coupon.variants.length > 0 || coupon.categories.length > 0)) throw new ConflictException({ code: 'COUPON_NOT_APPLICABLE', message: 'Coupon does not apply to cart items' });
        discount = coupon.type === 'PERCENTAGE' ? percentage(eligibleSubtotal, coupon.value) : coupon.type === 'FIXED_CART' ? Prisma.Decimal.min(subtotal, coupon.value) : coupon.type === 'FIXED_PRODUCT' ? Prisma.Decimal.min(eligibleSubtotal, coupon.value) : money(0);
        if (coupon.maximumDiscount) discount = Prisma.Decimal.min(discount, coupon.maximumDiscount);
      }
      const pricedLines = cart.items.map((item, index) => {
        const line = lineSubtotals[index] ?? money(0);
        const lineDiscount = subtotal.isZero() ? money(0) : discount.times(line).div(subtotal).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
        const taxable = line.minus(lineDiscount);
        const rate = item.product.taxClass?.rates.find((candidate) => {
          if (candidate.country.toUpperCase() !== addressCountry) return false;
          if (candidate.state && candidate.state.toUpperCase() !== addressState) return false;
          return !candidate.postalPattern || postalMatches(input.shippingAddress.postalCode, [candidate.postalPattern]);
        });
        const lineTax = !rate ? money(0) : rate.inclusive
          ? taxable.times(rate.rate).div(money(100).plus(rate.rate)).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
          : percentage(taxable, rate.rate);
        return { item, unit: money(item.variant.salePrice ?? item.variant.price ?? item.product.salePrice ?? item.product.basePrice), line, lineDiscount, lineTax, inclusiveTax: Boolean(rate?.inclusive) };
      });
      const tax = addMoney(...pricedLines.map((line) => line.lineTax));
      const exclusiveTax = addMoney(...pricedLines.filter((line) => !line.inclusiveTax).map((line) => line.lineTax));
      const totalWeightGrams = cart.items.reduce((sum, item) => sum + (item.variant.weightGrams ?? item.product.weightGrams ?? 0) * item.quantity, 0);
      const rules = shipping.rules && typeof shipping.rules === 'object' && !Array.isArray(shipping.rules) ? shipping.rules as Record<string, Prisma.JsonValue> : {};
      const minimumWeight = typeof rules.minimumWeightGrams === 'number' ? rules.minimumWeightGrams : null;
      const maximumWeight = typeof rules.maximumWeightGrams === 'number' ? rules.maximumWeightGrams : null;
      const minimumSubtotal = typeof rules.minimumSubtotal === 'number' || typeof rules.minimumSubtotal === 'string' ? money(rules.minimumSubtotal) : null;
      const maximumSubtotal = typeof rules.maximumSubtotal === 'number' || typeof rules.maximumSubtotal === 'string' ? money(rules.maximumSubtotal) : null;
      if ((minimumWeight !== null && totalWeightGrams < minimumWeight) || (maximumWeight !== null && totalWeightGrams > maximumWeight) || (minimumSubtotal && subtotal.lessThan(minimumSubtotal)) || (maximumSubtotal && subtotal.greaterThan(maximumSubtotal))) throw new ConflictException({ code: 'SHIPPING_RULE_MISMATCH', message: 'Cart does not meet the selected shipping method requirements' });
      const shippingTotal = coupon?.type === 'FREE_SHIPPING' || (shipping.freeAbove && subtotal.greaterThanOrEqualTo(shipping.freeAbove)) ? money(0) : money(shipping.basePrice);
      const grandTotal = subtotal.minus(discount).plus(exclusiveTax).plus(shippingTotal);
      const status = input.paymentProvider === 'COD' ? 'CONFIRMED' : 'PENDING';
      const order = await tx.order.create({ data: {
        id: randomUUID(), orderNumber: `BRJ-${ulid().slice(-12)}`, userId, email: input.email.toLowerCase(), status,
        currency: this.config.get('STORE_CURRENCY', 'USD'), subtotal, discountTotal: discount, taxTotal: tax, shippingTotal, grandTotal,
        shippingAddress: input.shippingAddress as Prisma.InputJsonValue, billingAddress: input.billingAddress as Prisma.InputJsonValue,
        customerNote: input.customerNote, idempotencyKey: key,
        items: { create: pricedLines.map(({ item, unit, line, lineDiscount, lineTax, inclusiveTax }) => ({ productId: item.productId, variantId: item.variantId, productName: item.product.name, sku: item.variant.sku, variantSnapshot: item.variant.values.map(({ value }) => ({ attribute: value.attribute.name, value: value.value })), unitPrice: unit, taxTotal: lineTax, discountTotal: lineDiscount, quantity: item.quantity, lineTotal: line.minus(lineDiscount).plus(inclusiveTax ? money(0) : lineTax) })) },
        statusHistory: { create: { toStatus: status, changedById: userId, notes: 'Order placed' } },
      } });
      for (const item of cart.items) await this.inventory.reserve(tx, item.variantId, item.quantity, order.id, new Date(Date.now() + 15 * 60_000));
      if (input.paymentProvider === 'COD') await this.inventory.commitOrder(tx, order.id);
      const payment = await tx.payment.create({ data: { orderId: order.id, provider: input.paymentProvider as PaymentProvider, idempotencyKey: `payment:${key}`, amount: grandTotal, currency: order.currency, status: 'PENDING', metadata: input.paymentProvider === 'COD' ? { collection: 'on_delivery' } : undefined } });
      if (coupon) { await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } }); await tx.couponUsage.create({ data: { couponId: coupon.id, userId, orderId: order.id, discountAmount: discount } }); }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.notification.create({ data: { userId, channel: 'IN_APP', type: 'ORDER_PLACED', subject: `Order ${order.orderNumber} received`, body: 'Your order has been placed and is being prepared.', data: { orderId: order.id } } });
      return { order, payment: { id: payment.id, provider: payment.provider, status: payment.status, clientSecret: null } };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000, maxWait: 5_000 }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return this.prisma.order.findUniqueOrThrow({ where: { idempotencyKey: key }, include: { payments: true } }).then((order) => { const payment = order.payments[0]; if (!payment) throw new ConflictException({ code: 'ORDER_PAYMENT_MISSING', message: 'Existing order has no payment record' }); return { order, payment: { id: payment.id, provider: payment.provider, status: payment.status, clientSecret: null } }; });
      throw error;
    });
    await this.jobs.sendEmail({ to: input.email.toLowerCase(), template: 'order', variables: { orderNumber: result.order.orderNumber } }, `order:${result.order.id}:placed`);
    return result;
  }
}
