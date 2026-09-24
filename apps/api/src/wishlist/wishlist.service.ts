import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService, private readonly cart: CartService) {}

  async get(userId: string) {
    return this.prisma.wishlist.findUnique({ where: { userId }, include: { items: { orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true, slug: true, status: true, basePrice: true, salePrice: true, currency: true, images: { where: { featured: true }, take: 1 } } }, variant: { include: { inventory: true } } } } } }) ?? { items: [] };
  }

  async add(userId: string, data: { productId: string; variantId?: string }) {
    const product = await this.prisma.product.findFirst({ where: { id: data.productId, status: 'ACTIVE', deletedAt: null }, select: { id: true } });
    if (!product) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product was not found' });
    const list = await this.prisma.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
    const existing = await this.prisma.wishlistItem.findFirst({ where: { wishlistId: list.id, productId: data.productId, variantId: data.variantId ?? null } });
    if (!existing) await this.prisma.wishlistItem.create({ data: { wishlistId: list.id, ...data } });
    return this.get(userId);
  }

  async moveToCart(userId: string, id: string, quantity: number) {
    const item = await this.prisma.wishlistItem.findFirst({ where: { id, wishlist: { userId } }, include: { product: { include: { variants: { where: { active: true }, include: { inventory: true } } } } } });
    if (!item) throw new NotFoundException({ code: 'WISHLIST_ITEM_NOT_FOUND', message: 'Wishlist item was not found' });
    const variantId = item.variantId ?? item.product.variants.find((variant) => variant.inventory && variant.inventory.available - variant.inventory.reserved >= quantity)?.id;
    if (!variantId) throw new ConflictException({ code: 'OUT_OF_STOCK', message: 'No purchasable variant is currently available' });
    const cart = await this.cart.add(userId, variantId, quantity);
    await this.remove(userId, id);
    return cart;
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.wishlistItem.deleteMany({ where: { id, wishlist: { userId } } });
    if (!result.count) throw new NotFoundException({ code: 'WISHLIST_ITEM_NOT_FOUND', message: 'Wishlist item was not found' });
  }
}
