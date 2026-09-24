import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}
  private include = {
    items: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
            status: true,
            basePrice: true,
            salePrice: true,
            currency: true,
            images: { where: { featured: true }, take: 1 },
          },
        },
        variant: {
          include: {
            inventory: true,
            values: { include: { value: { include: { attribute: true } } } },
          },
        },
      },
    },
  };
  async get(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      include: this.include,
    });
    return cart ?? { items: [] };
  }
  async add(userId: string, variantId: string, quantity: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, active: true, product: { status: 'ACTIVE', deletedAt: null } },
      include: { inventory: true, product: true },
    });
    if (
      !variant ||
      !variant.inventory ||
      variant.inventory.available - variant.inventory.reserved < quantity
    )
      throw new ConflictException({
        code: 'OUT_OF_STOCK',
        message: 'Requested quantity is unavailable',
      });
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId, expiresAt: new Date(Date.now() + 30 * 86400_000) },
      update: { expiresAt: new Date(Date.now() + 30 * 86400_000) },
    });
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, productId: variant.productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.get(userId);
  }
  async update(userId: string, id: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id, cart: { userId } },
      include: { variant: { include: { inventory: true } } },
    });
    if (!item)
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item was not found',
      });
    if (
      !item.variant.inventory ||
      item.variant.inventory.available - item.variant.inventory.reserved < quantity
    )
      throw new ConflictException({
        code: 'OUT_OF_STOCK',
        message: 'Requested quantity is unavailable',
      });
    await this.prisma.cartItem.update({ where: { id }, data: { quantity } });
    return this.get(userId);
  }
  async remove(userId: string, id: string) {
    const result = await this.prisma.cartItem.deleteMany({ where: { id, cart: { userId } } });
    if (!result.count)
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item was not found',
      });
    return this.get(userId);
  }
  async removeGuest(token: string, id: string) {
    const result = await this.prisma.cartItem.deleteMany({
      where: { id, cart: { guestTokenHash: this.hash(token) } },
    });
    if (!result.count)
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Cart item was not found',
      });
  }
  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  async getGuest(token: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { guestTokenHash: this.hash(token) },
      include: this.include,
    });
    return cart ?? { items: [] };
  }
  async addGuest(token: string, variantId: string, quantity: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, active: true, product: { status: 'ACTIVE', deletedAt: null } },
      include: { inventory: true },
    });
    if (!variant?.inventory || variant.inventory.available - variant.inventory.reserved < quantity)
      throw new ConflictException({
        code: 'OUT_OF_STOCK',
        message: 'Requested quantity is unavailable',
      });
    const guestTokenHash = this.hash(token);
    const cart = await this.prisma.cart.upsert({
      where: { guestTokenHash },
      create: { guestTokenHash, expiresAt: new Date(Date.now() + 30 * 86400_000) },
      update: { expiresAt: new Date(Date.now() + 30 * 86400_000) },
    });
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, productId: variant.productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.getGuest(token);
  }
  async mergeGuest(userId: string, token?: string) {
    if (!token) return;
    const guest = await this.prisma.cart.findUnique({
      where: { guestTokenHash: this.hash(token) },
      include: { items: true },
    });
    if (!guest) return;
    await this.prisma.$transaction(async (tx) => {
      const userCart = await tx.cart.upsert({
        where: { userId },
        create: { userId, expiresAt: new Date(Date.now() + 30 * 86400_000) },
        update: {},
      });
      for (const item of guest.items)
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
          create: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          },
          update: { quantity: { increment: item.quantity } },
        });
      await tx.cart.delete({ where: { id: guest.id } });
    });
  }
}
