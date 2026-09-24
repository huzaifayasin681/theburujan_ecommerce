import * as Papa from 'papaparse';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InventoryReason,
  Prisma,
  ProductStatus,
  Visibility,
  ReviewStatus,
  ReturnStatus,
  UserStatus,
  CouponType
} from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { money } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';
const pageOf = (query: Record<string, string>) => ({
  page: Math.max(1, Number(query.page) || 1),
  limit: Math.min(100, Math.max(1, Number(query.limit) || 20)),
});
const forbiddenSettingKey = /(password|secret|token|credential|private|smtp|stripe|paypal|s3)/i;
const publicSettingKeys = new Set(['storeName','logoUrl','faviconUrl','supportEmail','supportPhone','storeAddress','currencyDisplay','seoTitle','seoDescription','socialLinks','maintenanceMode','announcementEnabled','announcementText','homeHeroEyebrow','homeHeroTitle','homeHeroDescription','homeHeroImage','homeHeroImageAlt','homeHeroFallback','homeHeroLink','homeHeroButton','shippingPolicySummary','returnPolicySummary']);

type ProductCsvRow = {
  name?: string;
  slug?: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  basePrice?: string;
  salePrice?: string;
  status?: string;
};

type ProductAttributeInput = { name: string; values: string[] };
type ProductVariantInput = {
  id?: string;
  sku: string;
  price?: string;
  salePrice?: string;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  imageId?: string;
  active?: boolean;
  attributes: Record<string, string>;
};
type ProductImageInput = { mediaId: string; altText?: string; featured?: boolean };

type ProductInput = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string;
  richDescription?: string;
  basePrice: string;
  salePrice?: string;
  costPrice?: string;
  status: ProductStatus;
  visibility?: Visibility;
  brandId?: string;
  taxClassId?: string;
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  seoTitle?: string;
  seoDescription?: string;
  initialStock?: number;
  categoryIds?: string[];
  tags?: string[];
  mediaIds?: string[];
  images?: ProductImageInput[];
  attributes?: ProductAttributeInput[];
  variants?: ProductVariantInput[];
};
type CouponInput = { code: string; type: CouponType; value: string; minimumSpend?: string; maximumDiscount?: string; usageLimit?: number; perUserLimit?: number; startsAt?: string; expiresAt?: string; firstOrderOnly?: boolean; minimumQuantity?: number; stackable?: boolean; active?: boolean; productIds?: string[]; variantIds?: string[]; categoryIds?: string[]; customerIds?: string[] };

function validateMoney(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  try {
    const decimal = new Prisma.Decimal(value);
    if (decimal.isNegative() || decimal.decimalPlaces() > 4) throw new Error();
    return decimal.toFixed(decimal.decimalPlaces());
  } catch {
    throw new BadRequestException({ code: 'INVALID_MONEY', message: `${field} must be a non-negative monetary amount with at most four decimal places` });
  }
}

function normalizeVariants(attributes: ProductAttributeInput[] | undefined, variants: ProductVariantInput[] | undefined) {
  if (!attributes?.length && !variants?.length) return { attributes: [], variants: [] };
  if (!attributes?.length || !variants?.length) throw new BadRequestException({ code: 'VARIANT_CONFIGURATION_INVALID', message: 'Attributes and variants must be provided together' });
  const names = attributes.map((attribute) => attribute.name.trim());
  if (new Set(names).size !== names.length) throw new BadRequestException({ code: 'DUPLICATE_ATTRIBUTE', message: 'Attribute names must be unique' });
  const normalizedAttributes = attributes.map((attribute) => {
    const values = attribute.values.map((value) => value.trim()).filter(Boolean);
    if (!attribute.name.trim() || !values.length || new Set(values).size !== values.length) throw new BadRequestException({ code: 'ATTRIBUTE_VALUES_INVALID', message: `Attribute ${attribute.name || '(unnamed)'} must have unique values` });
    return { name: attribute.name.trim(), values };
  });
  const keys = new Set<string>();
  const skus = new Set<string>();
  const normalizedVariants = variants.map((variant) => {
    const suppliedNames = Object.keys(variant.attributes).sort();
    const expectedNames = [...names].sort();
    if (suppliedNames.join('\u0000') !== expectedNames.join('\u0000')) throw new BadRequestException({ code: 'VARIANT_ATTRIBUTES_INVALID', message: `Variant ${variant.sku} must select one value for every attribute` });
    for (const attribute of normalizedAttributes) {
      const selected = variant.attributes[attribute.name];
      if (!selected || !attribute.values.includes(selected)) throw new BadRequestException({ code: 'VARIANT_VALUE_INVALID', message: `Variant ${variant.sku} has an invalid ${attribute.name} value` });
    }
    const combinationKey = expectedNames.map((name) => `${name}=${variant.attributes[name]}`).join('|');
    if (keys.has(combinationKey)) throw new BadRequestException({ code: 'DUPLICATE_VARIANT', message: 'Variant combinations must be unique' });
    if (skus.has(variant.sku)) throw new BadRequestException({ code: 'DUPLICATE_VARIANT_SKU', message: 'Variant SKUs must be unique' });
    keys.add(combinationKey);
    skus.add(variant.sku);
    return { ...variant, combinationKey, price: validateMoney(variant.price, 'Variant price'), salePrice: validateMoney(variant.salePrice, 'Variant sale price') };
  });
  return { attributes: normalizedAttributes, variants: normalizedVariants };
}
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService,private readonly config:ConfigService) {}
  async analytics(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400_000);
    const end = to ? new Date(to) : new Date();
    const where = { createdAt: { gte: start, lte: end } };
    const [orders, customers, products, lowStock, outOfStock, refunds, statuses, topProducts, pendingReturns, revenueByDay, salesByCategory, returningCustomers] =
      await this.prisma.$transaction([
        this.prisma.order.aggregate({
          where: { ...where, status: { not: 'CANCELLED' } },
          _sum: { grandTotal: true, discountTotal: true },
          _count: true,
        }),
        this.prisma.user.count({
          where: {
            createdAt: { gte: start, lte: end },
            roles: { some: { role: { name: 'USER' } } },
          },
        }),
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.inventory.count({ where: { available: { lte: 5 } } }),
        this.prisma.inventory.count({ where: { available: { lte: 0 } } }),
        this.prisma.refund.aggregate({
          where: { createdAt: { gte: start, lte: end }, status: 'SUCCEEDED' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where,
          _count: true,
          orderBy: { status: 'asc' },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId', 'productName'],
          where: { order: { ...where, status: { not: 'CANCELLED' } } },
          _sum: { quantity: true, lineTotal: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
        this.prisma.returnRequest.count({ where: { status: { in: ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REFUND_PENDING', 'MORE_INFO_REQUIRED'] } } }),
        this.prisma.$queryRaw<Array<{ day: string; revenue: string; orders: bigint }>>(Prisma.sql`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day, COALESCE(SUM(grandTotal), 0) AS revenue, COUNT(*) AS orders FROM ${Prisma.raw('`Order`')} WHERE createdAt >= ${start} AND createdAt <= ${end} AND status <> 'CANCELLED' GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d') ORDER BY day ASC`),
        this.prisma.$queryRaw<Array<{ category: string; revenue: string; quantity: bigint }>>(Prisma.sql`SELECT c.name AS category, COALESCE(SUM(oi.lineTotal), 0) AS revenue, SUM(oi.quantity) AS quantity FROM ${Prisma.raw('`OrderItem`')} oi JOIN ${Prisma.raw('`Order`')} o ON o.id = oi.orderId JOIN ${Prisma.raw('`ProductCategory`')} pc ON pc.productId = oi.productId JOIN ${Prisma.raw('`Category`')} c ON c.id = pc.categoryId WHERE o.createdAt >= ${start} AND o.createdAt <= ${end} AND o.status <> 'CANCELLED' GROUP BY c.id, c.name ORDER BY revenue DESC LIMIT 10`),
        this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*) AS count FROM (SELECT userId FROM ${Prisma.raw('`Order`')} WHERE userId IS NOT NULL AND createdAt >= ${start} AND createdAt <= ${end} AND status <> 'CANCELLED' GROUP BY userId HAVING COUNT(*) > 1) returning_customers`),
      ]);
    const gross = orders._sum.grandTotal ?? money(0),
      discounts = orders._sum.discountTotal ?? money(0),
      refunded = refunds._sum.amount ?? money(0);
    return {
      range: { from: start, to: end },
      currency: this.config.get('STORE_CURRENCY', 'USD'),
      grossSales: gross,
      discounts,
      refunds: refunded,
      netSales: gross.minus(refunded),
      orderCount: orders._count,
      averageOrderValue: orders._count ? gross.div(orders._count) : money(0),
      newCustomers: customers,
      productCount: products,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      refundCount: refunds._count,
      pendingReturnCount: pendingReturns,
      statusDistribution: statuses,
      topProducts,
      revenueByDay: revenueByDay.map((row) => ({ day: row.day, revenue: row.revenue, orders: Number(row.orders) })),
      salesByCategory: salesByCategory.map((row) => ({ category: row.category, revenue: row.revenue, quantity: Number(row.quantity) })),
      returningCustomers: Number(returningCustomers[0]?.count ?? 0),
    };
  }
  async products(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(q.search
        ? { OR: [{ name: { contains: q.search } }, { sku: { contains: q.search } }] }
        : {}),
      ...(q.status ? { status: q.status as ProductStatus } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { brand: true, variants: { include: { inventory: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  product(id:string){return this.prisma.product.findUniqueOrThrow({where:{id},include:{brand:true,taxClass:true,categories:{include:{category:true}},tags:{include:{tag:true}},images:{orderBy:{sortOrder:'asc'}},attributes:{include:{values:{orderBy:{sortOrder:'asc'}}},orderBy:{sortOrder:'asc'}},variants:{include:{values:{include:{value:{include:{attribute:true}}}},inventory:true}}}})}
  async exportProducts(res: Response) {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        brand: true,
        categories: { include: { category: true } },
      },
    });
    
    const rows = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      shortDescription: p.shortDescription,
      basePrice: p.basePrice.toString(),
      salePrice: p.salePrice?.toString() || '',
      status: p.status,
      brand: p.brand?.name || '',
      categories: p.categories.map(c => c.category.name).join(';'),
    }));

    const csv = Papa.unparse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('products.csv');
    return res.send(csv);
  }

  async importProducts(actorId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'CSV file required' });
    
    const text = file.buffer.toString('utf8');
    const parsed = Papa.parse<ProductCsvRow>(text, { header: true, skipEmptyLines: true });
    
    const report = { total: parsed.data.length, success: 0, failed: 0, errors: [] as { row: number; error: string }[] };
    const seenSkus = new Set<string>();
    const seenSlugs = new Set<string>();
    for (const [index, row] of parsed.data.entries()) {
      try {
        if (!row.name || !row.slug || !row.sku || !row.basePrice || !row.status) throw new Error('Missing required fields (name, slug, sku, basePrice, status)');
        if (!Object.values(ProductStatus).includes(row.status as ProductStatus)) throw new Error('Invalid product status');
        validateMoney(row.basePrice, 'Base price');
        validateMoney(row.salePrice, 'Sale price');
        if (seenSkus.has(row.sku) || seenSlugs.has(row.slug)) throw new Error('Duplicate SKU or slug in import');
        seenSkus.add(row.sku); seenSlugs.add(row.slug);
      } catch (error: unknown) { report.errors.push({ row: index + 1, error: error instanceof Error ? error.message : 'Invalid row' }); }
    }
    if (report.errors.length) {
      report.failed = parsed.data.length;
      await this.prisma.auditLog.create({ data: { actorId, action: 'products.import.rejected', resourceType: 'Product', resourceId: 'bulk', metadata: report as unknown as Prisma.InputJsonValue } });
      return report;
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of parsed.data) {
          await tx.product.upsert({ where: { sku: row.sku! }, update: { name: row.name!, slug: row.slug!, description: row.description || '', shortDescription: row.shortDescription || '', basePrice: validateMoney(row.basePrice, 'Base price')!, salePrice: validateMoney(row.salePrice, 'Sale price') || null, status: row.status as ProductStatus }, create: { name: row.name!, slug: row.slug!, sku: row.sku!, description: row.description || '', shortDescription: row.shortDescription || '', basePrice: validateMoney(row.basePrice, 'Base price')!, salePrice: validateMoney(row.salePrice, 'Sale price') || null, status: row.status as ProductStatus } });
        }
      });
      report.success = parsed.data.length;
    } catch (error: unknown) { report.failed = parsed.data.length; report.errors.push({ row: 0, error: error instanceof Error ? error.message : 'Import transaction failed; no rows were written' }); }
    
    await this.prisma.auditLog.create({
      data: { actorId, action: 'products.import', resourceType: 'Product', resourceId: 'bulk', metadata: report as unknown as Prisma.InputJsonValue }
    });

    return report;
  }

  async createProduct(
    actorId: string,
    data: ProductInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { initialStock = 0, mediaIds, images, attributes, variants, categoryIds = [], tags = [], ...rawProductData } = data;
      const basePrice = validateMoney(rawProductData.basePrice, 'Base price')!;
      const salePrice = validateMoney(rawProductData.salePrice, 'Sale price');
      const costPrice = validateMoney(rawProductData.costPrice, 'Cost price');
      if (salePrice && new Prisma.Decimal(salePrice).greaterThan(basePrice)) throw new BadRequestException({ code: 'SALE_PRICE_INVALID', message: 'Sale price cannot exceed base price' });
      const normalized = normalizeVariants(attributes, variants);
      const product = await tx.product.create({ data: { ...rawProductData, basePrice, salePrice, costPrice, brandId: rawProductData.brandId || null, taxClassId: rawProductData.taxClassId || null, currency: this.config.get('STORE_CURRENCY', 'USD'), visibility: rawProductData.visibility ?? 'PUBLIC' } });

      await this.syncProductRelations(tx, product.id, actorId, { mediaIds, images, categoryIds, tags });
      if (normalized.variants.length) await this.syncProductVariants(tx, product.id, actorId, normalized.attributes, normalized.variants);
      else {
        const variant = await tx.productVariant.create({ data: { productId: product.id, sku: product.sku, combinationKey: 'default', inventory: { create: { available: initialStock } } }, include: { inventory: true } });
        if (initialStock > 0 && variant.inventory) await tx.inventoryTransaction.create({ data: { inventoryId: variant.inventory.id, reason: 'RESTOCK', availableDelta: initialStock, actorId, referenceType: 'Product', referenceId: product.id, note: 'Initial product stock' } });
      }
  
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'product.created',
          resourceType: 'Product',
          resourceId: product.id,
        },
      });
      return product;
    });
  }
  async editProduct(
    actorId: string,
    id: string,
    data: ProductInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id }, select: { id: true } });
      if (!existing) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product was not found' });
      const { initialStock: _initialStock, mediaIds, images, attributes, variants, categoryIds, tags, ...rawProductData } = data;
      const basePrice = validateMoney(rawProductData.basePrice, 'Base price')!;
      const salePrice = validateMoney(rawProductData.salePrice, 'Sale price');
      const costPrice = validateMoney(rawProductData.costPrice, 'Cost price');
      if (salePrice && new Prisma.Decimal(salePrice).greaterThan(basePrice)) throw new BadRequestException({ code: 'SALE_PRICE_INVALID', message: 'Sale price cannot exceed base price' });
      const product = await tx.product.update({ where: { id }, data: { ...rawProductData, basePrice, salePrice, costPrice, brandId: rawProductData.brandId || null, taxClassId: rawProductData.taxClassId || null } });
      if (mediaIds !== undefined || images !== undefined || categoryIds !== undefined || tags !== undefined) await this.syncProductRelations(tx, id, actorId, { mediaIds, images, categoryIds, tags });
      if (attributes !== undefined || variants !== undefined) {
        const normalized = normalizeVariants(attributes, variants);
        await this.syncProductVariants(tx, id, actorId, normalized.attributes, normalized.variants);
      }
      await tx.auditLog.create({
        data: { actorId, action: 'product.updated', resourceType: 'Product', resourceId: id },
      });
      return product;
    });
  }

  private async syncProductRelations(tx: Prisma.TransactionClient, productId: string, actorId: string, input: { mediaIds?: string[]; images?: ProductImageInput[]; categoryIds?: string[]; tags?: string[] }) {
    if (input.categoryIds !== undefined) {
      const found = await tx.category.count({ where: { id: { in: input.categoryIds }, active: true } });
      if (found !== input.categoryIds.length) throw new BadRequestException({ code: 'CATEGORY_INVALID', message: 'One or more categories are unavailable' });
      await tx.productCategory.deleteMany({ where: { productId } });
      if (input.categoryIds.length) await tx.productCategory.createMany({ data: input.categoryIds.map((categoryId) => ({ productId, categoryId })) });
    }
    if (input.tags !== undefined) {
      const tags = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];
      if (tags.some((tag) => tag.length > 80)) throw new BadRequestException({ code: 'TAG_INVALID', message: 'Tags cannot exceed 80 characters' });
      await tx.productTag.deleteMany({ where: { productId } });
      for (const name of tags) {
        const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
        await tx.productTag.create({ data: { productId, tagId: tag.id } });
      }
    }
    const requestedImages: ProductImageInput[] | undefined = input.images ?? input.mediaIds?.map((mediaId, index) => ({ mediaId, featured: index === 0 }));
    if (requestedImages !== undefined) {
      const ids = requestedImages.map((image) => image.mediaId);
      if (new Set(ids).size !== ids.length) throw new BadRequestException({ code: 'DUPLICATE_MEDIA', message: 'Product images must be unique' });
      const media = await tx.media.findMany({ where: { id: { in: ids } } });
      if (media.length !== ids.length) throw new BadRequestException({ code: 'MEDIA_INVALID', message: 'One or more media items do not exist' });
      await tx.productImage.deleteMany({ where: { productId } });
      const mediaById = new Map(media.map((item) => [item.id, item]));
      const selectedFeatured = requestedImages.findIndex((item) => item.featured);
      for (const [sortOrder, image] of requestedImages.entries()) {
        const item = mediaById.get(image.mediaId)!;
        await tx.productImage.create({ data: { productId, mediaId: item.id, url: item.url, altText: image.altText || item.altText, sortOrder, featured: selectedFeatured === -1 ? sortOrder === 0 : sortOrder === selectedFeatured } });
      }
    }
    void actorId;
  }

  private async syncProductVariants(tx: Prisma.TransactionClient, productId: string, actorId: string, attributes: ProductAttributeInput[], variants: Array<ProductVariantInput & { combinationKey: string }>) {
    const valueIds = new Map<string, string>();
    for (const [sortOrder, attribute] of attributes.entries()) {
      const record = await tx.productAttribute.upsert({ where: { productId_name: { productId, name: attribute.name } }, update: { sortOrder }, create: { productId, name: attribute.name, sortOrder } });
      for (const [valueOrder, value] of attribute.values.entries()) {
        const recordValue = await tx.productAttributeValue.upsert({ where: { attributeId_value: { attributeId: record.id, value } }, update: { sortOrder: valueOrder }, create: { attributeId: record.id, value, sortOrder: valueOrder } });
        valueIds.set(`${attribute.name}\u0000${value}`, recordValue.id);
      }
    }
    const existing = await tx.productVariant.findMany({ where: { productId }, include: { inventory: true } });
    const existingIds = new Set(existing.map((variant) => variant.id));
    const retainedIds = new Set<string>();
    for (const variant of variants) {
      if (variant.id && !existingIds.has(variant.id)) throw new BadRequestException({ code: 'VARIANT_INVALID', message: 'A variant does not belong to this product' });
      const payload = { sku: variant.sku, combinationKey: variant.combinationKey, price: variant.price || null, salePrice: variant.salePrice || null, weightGrams: variant.weightGrams, active: variant.active ?? true };
      const record = variant.id
        ? await tx.productVariant.update({ where: { id: variant.id }, data: payload })
        : await tx.productVariant.create({ data: { productId, ...payload } });
      retainedIds.add(record.id);
      await tx.variantAttributeValue.deleteMany({ where: { variantId: record.id } });
      await tx.variantAttributeValue.createMany({ data: Object.entries(variant.attributes).map(([name, value]) => ({ variantId: record.id, valueId: valueIds.get(`${name}\u0000${value}`)! })) });
      const inventory = await tx.inventory.findUnique({ where: { variantId: record.id } });
      if (!inventory) {
        const created = await tx.inventory.create({ data: { variantId: record.id, available: variant.stock, lowStockThreshold: variant.lowStockThreshold ?? 5 } });
        if (variant.stock > 0) await tx.inventoryTransaction.create({ data: { inventoryId: created.id, reason: 'RESTOCK', availableDelta: variant.stock, actorId, referenceType: 'ProductVariant', referenceId: record.id, note: 'Initial variant stock' } });
      } else {
        const delta = variant.stock - inventory.available;
        await tx.inventory.update({ where: { id: inventory.id }, data: { available: variant.stock, lowStockThreshold: variant.lowStockThreshold ?? inventory.lowStockThreshold, version: { increment: 1 } } });
        if (delta !== 0) await tx.inventoryTransaction.create({ data: { inventoryId: inventory.id, reason: 'MANUAL_ADJUSTMENT', availableDelta: delta, actorId, referenceType: 'ProductVariant', referenceId: record.id, note: 'Stock changed in product editor' } });
      }
    }
    const deactivate = existing.filter((variant) => !retainedIds.has(variant.id)).map((variant) => variant.id);
    if (deactivate.length) await tx.productVariant.updateMany({ where: { id: { in: deactivate } }, data: { active: false } });
  }
  async archiveProduct(actorId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: { status: 'ARCHIVED', deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'product.archived', resourceType: 'Product', resourceId: id },
      });
      return product;
    });
  }
  categories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } }, children: true },
    });
  }
  async createCategory(actorId: string, data: Prisma.CategoryUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.category.create({ data });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'category.created',
          resourceType: 'Category',
          resourceId: item.id,
        },
      });
      return item;
    });
  }
  async updateCategory(actorId: string, id: string, data: Prisma.CategoryUncheckedUpdateInput & { parentId?: string }) {
    if (data.parentId === id) throw new ConflictException({ code: 'CATEGORY_CYCLE', message: 'A category cannot be its own parent' });
    if (data.parentId) { let cursor: string | null = data.parentId; while (cursor) { if (cursor === id) throw new ConflictException({ code: 'CATEGORY_CYCLE', message: 'Category hierarchy cannot contain a cycle' }); const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } }); cursor = parent?.parentId ?? null; } }
    return this.prisma.$transaction(async (tx) => { const item = await tx.category.update({ where: { id }, data }); await tx.auditLog.create({ data: { actorId, action: 'category.updated', resourceType: 'Category', resourceId: id } }); return item; });
  }
  async archiveCategory(actorId: string, id: string) { return this.prisma.$transaction(async (tx) => { const item = await tx.category.update({ where: { id }, data: { active: false } }); await tx.category.updateMany({ where: { parentId: id }, data: { active: false } }); await tx.auditLog.create({ data: { actorId, action: 'category.archived', resourceType: 'Category', resourceId: id } }); return item; }); }
  brands() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }
  async createBrand(actorId: string, data: Prisma.BrandCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.brand.create({ data });
      await tx.auditLog.create({
        data: { actorId, action: 'brand.created', resourceType: 'Brand', resourceId: item.id },
      });
      return item;
    });
  }
  async updateBrand(actorId: string, id: string, data: Prisma.BrandUpdateInput) { return this.prisma.$transaction(async (tx) => { const item = await tx.brand.update({ where: { id }, data }); await tx.auditLog.create({ data: { actorId, action: 'brand.updated', resourceType: 'Brand', resourceId: id } }); return item; }); }
  async archiveBrand(actorId: string, id: string) { return this.prisma.$transaction(async (tx) => { const item = await tx.brand.update({ where: { id }, data: { active: false } }); await tx.auditLog.create({ data: { actorId, action: 'brand.archived', resourceType: 'Brand', resourceId: id } }); return item; }); }
  async inventory(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.InventoryWhereInput = q.search
      ? {
          variant: {
            OR: [{ sku: { contains: q.search } }, { product: { name: { contains: q.search } } }],
          },
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          variant: { include: { product: { select: { name: true, slug: true } } } },
          transactions: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.inventory.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async inventoryDetail(id: string) {
    return this.prisma.inventory.findUniqueOrThrow({
      where: { id },
      include: {
        variant: { include: { product: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      }
    });
  }
  async adjustInventory(
    actorId: string,
    variantId: string,
    input: { quantityDelta: number; note: string },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const inventory = await tx.inventory.findUnique({ where: { variantId } });
        if (!inventory)
          throw new NotFoundException({
            code: 'INVENTORY_NOT_FOUND',
            message: 'Inventory was not found',
          });
        if (inventory.available + input.quantityDelta < 0)
          throw new ConflictException({
            code: 'INVENTORY_NEGATIVE',
            message: 'Adjustment would make inventory negative',
          });
        const updated = await tx.inventory.update({
          where: { id: inventory.id },
          data: { available: { increment: input.quantityDelta }, version: { increment: 1 } },
        });
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            reason: InventoryReason.MANUAL_ADJUSTMENT,
            availableDelta: input.quantityDelta,
            note: input.note,
            actorId,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'inventory.adjusted',
            resourceType: 'Inventory',
            resourceId: inventory.id,
            metadata: { delta: input.quantityDelta, note: input.note },
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async customer(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: 'desc' } },
        addresses: true,
        reviews: true,
        returns: true,
      }
    });
    // calculate lifetime spend
    const spend = await this.prisma.order.aggregate({
      where: { userId: id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      _sum: { grandTotal: true }
    });
    return { ...user, lifetimeSpend: spend._sum.grandTotal || 0 };
  }
  async customers(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.UserWhereInput = {
      roles: { some: { role: { name: 'USER' } } },
      ...(q.search
        ? {
            OR: [
              { email: { contains: q.search } },
              { firstName: { contains: q.search } },
              { lastName: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true, returns: true } },
          orders: { where: { status: { not: 'CANCELLED' } }, select: { grandTotal: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: data.map(({ orders, ...user }) => ({
        ...user,
        lifetimeSpend: orders.reduce((sum, order) => sum.plus(order.grandTotal), money(0)),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
  async customerStatus(actor: AuthUser, id: string, status: UserStatus) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!target)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User was not found' });
    if (
      target.roles.some(({ role }) => role.name === 'SUPER_ADMIN') &&
      !actor.roles.includes('SUPER_ADMIN')
    )
      throw new ForbiddenException({
        code: 'SUPER_ADMIN_PROTECTED',
        message: 'Super administrator accounts are protected',
      });
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { status } });
      if (status !== 'ACTIVE')
        await tx.userSession.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'customer.status_changed',
          resourceType: 'User',
          resourceId: id,
          metadata: { status },
        },
      });
      return user;
    });
  }
  async reviews(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.ReviewWhereInput = q.status ? { status: q.status as ReviewStatus } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async reviewDetail(id: string) {
    return this.prisma.review.findUniqueOrThrow({
      where: { id },
      include: { product: true, user: true }
    });
  }
  async reviewStatus(actorId: string, id: string, status: ReviewStatus) {
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.review.findUniqueOrThrow({ where: { id } });
      const review = await tx.review.update({ where: { id }, data: { status } });
      if (old.status !== status) {
        const stats = await tx.review.aggregate({
          where: { productId: review.productId, status: 'APPROVED' },
          _avg: { rating: true },
          _count: true,
        });
        await tx.product.update({
          where: { id: review.productId },
          data: { averageRating: stats._avg.rating ?? 0, reviewCount: stats._count },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'review.moderated',
          resourceType: 'Review',
          resourceId: id,
          metadata: { status },
        },
      });
      return review;
    });
  }
  async returns(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.ReturnRequestWhereInput = q.status
      ? { status: q.status as ReturnStatus }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.returnRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true } },
          user: { select: { email: true } },
          items: { include: { orderItem: true } },
          media: { include: { media: true } },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async returnDetail(id: string) {
    return this.prisma.returnRequest.findUniqueOrThrow({
      where: { id },
      include: {
        order: true,
        user: true,
        items: { include: { orderItem: true } },
        media: { include: { media: true } }
      }
    });
  }
  async returnStatus(actorId: string, id: string, input: { status: ReturnStatus; note?: string }) {
    const allowed: Record<ReturnStatus, ReturnStatus[]> = {
      REQUESTED: ['MORE_INFO_REQUIRED', 'APPROVED', 'REJECTED'],
      MORE_INFO_REQUIRED: ['REQUESTED', 'APPROVED', 'REJECTED'],
      APPROVED: ['MORE_INFO_REQUIRED', 'IN_TRANSIT', 'RECEIVED'],
      REJECTED: [],
      IN_TRANSIT: ['RECEIVED'],
      RECEIVED: ['REFUND_PENDING', 'COMPLETED'],
      REFUND_PENDING: ['COMPLETED'],
      COMPLETED: [],
    };
    return this.prisma.$transaction(
      async (tx) => {
        const current = await tx.returnRequest.findUnique({
          where: { id },
          include: { items: { include: { orderItem: true } } },
        });
        if (!current)
          throw new NotFoundException({
            code: 'RETURN_NOT_FOUND',
            message: 'Return request was not found',
          });
        if (!allowed[current.status].includes(input.status))
          throw new ConflictException({
            code: 'INVALID_RETURN_TRANSITION',
            message: `Return cannot transition from ${current.status} to ${input.status}`,
          });
        if (input.status === 'RECEIVED') {
          for (const item of current.items) {
            if (!item.orderItem.variantId) continue;
            const inventory = await tx.inventory.findUnique({
              where: { variantId: item.orderItem.variantId },
            });
            if (!inventory) continue;
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                available: { increment: item.quantity },
                sold: { decrement: item.quantity },
                version: { increment: 1 },
              },
            });
            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                reason: 'RETURN',
                availableDelta: item.quantity,
                soldDelta: -item.quantity,
                referenceType: 'RETURN',
                referenceId: id,
              },
            });
            await tx.returnItem.update({ where: { id: item.id }, data: { restock: true } });
          }
        }
        const request = await tx.returnRequest.update({
          where: { id },
          data: { status: input.status, adminNote: input.note },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'return.status_changed',
            resourceType: 'ReturnRequest',
            resourceId: id,
            metadata: { from: current.status, to: input.status },
          },
        });
        return request;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async payments(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.PaymentWhereInput = q.search
      ? {
          OR: [
            { transactionId: { contains: q.search } },
            { order: { orderNumber: { contains: q.search } } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, email: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async orders(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.OrderWhereInput = q.search
      ? { OR: [{ orderNumber: { contains: q.search } }, { email: { contains: q.search } }] }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } }, payments: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async createCoupon(actorId: string, input: CouponInput) {
    return this.prisma.$transaction(async (tx) => {
      const { productIds = [], variantIds = [], categoryIds = [], customerIds = [], startsAt, expiresAt, ...data } = input;
      const coupon = await tx.coupon.create({ data: { ...data, code: data.code.trim().toUpperCase(), startsAt: startsAt ? new Date(startsAt) : undefined, expiresAt: expiresAt ? new Date(expiresAt) : undefined, products: { create: productIds.map((productId) => ({ productId })) }, variants: { create: variantIds.map((variantId) => ({ variantId })) }, categories: { create: categoryIds.map((categoryId) => ({ categoryId })) }, customers: { create: customerIds.map((userId) => ({ userId })) } }, include: { products: true, variants: true, categories: true, customers: true } });
      await tx.auditLog.create({
        data: { actorId, action: 'coupon.created', resourceType: 'Coupon', resourceId: coupon.id },
      });
      return coupon;
    });
  }
  async coupons(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.coupon.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  coupon(id: string) { return this.prisma.coupon.findUniqueOrThrow({ where: { id }, include: { products: true, variants: true, categories: true, customers: true } }); }
  async updateCoupon(actorId: string, id: string, input: CouponInput) {
    const { productIds = [], variantIds = [], categoryIds = [], customerIds = [], startsAt, expiresAt, ...data } = input;
    return this.prisma.$transaction(async (tx) => {
      await Promise.all([tx.couponProduct.deleteMany({ where: { couponId: id } }), tx.couponVariant.deleteMany({ where: { couponId: id } }), tx.couponCategory.deleteMany({ where: { couponId: id } }), tx.couponCustomer.deleteMany({ where: { couponId: id } })]);
      const coupon = await tx.coupon.update({ where: { id }, data: { ...data, code: data.code.trim().toUpperCase(), startsAt: startsAt ? new Date(startsAt) : null, expiresAt: expiresAt ? new Date(expiresAt) : null, products: { create: productIds.map((productId) => ({ productId })) }, variants: { create: variantIds.map((variantId) => ({ variantId })) }, categories: { create: categoryIds.map((categoryId) => ({ categoryId })) }, customers: { create: customerIds.map((userId) => ({ userId })) } }, include: { products: true, variants: true, categories: true, customers: true } });
      await tx.auditLog.create({ data: { actorId, action: 'coupon.updated', resourceType: 'Coupon', resourceId: id } });
      return coupon;
    });
  }
  async deleteCoupon(actorId: string, id: string) { await this.prisma.$transaction([this.prisma.coupon.update({ where: { id }, data: { active: false } }), this.prisma.auditLog.create({ data: { actorId, action: 'coupon.deactivated', resourceType: 'Coupon', resourceId: id } })]); }
  async refunds(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true } },
          payment: { select: { provider: true, transactionId: true } },
        },
      }),
      this.prisma.refund.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  
  async createShippingZone(actorId: string, data: {name:string; country?:string; countries?:string[]; states?:string[]; postalCodes?:string[]; active?:boolean}) {
    return this.prisma.$transaction(async tx => {
      const countries = [...new Set((data.countries ?? (data.country ? [data.country] : [])).map((value) => value.trim().toUpperCase()).filter(Boolean))];
      if (!countries.length) throw new BadRequestException({ code: 'SHIPPING_COUNTRY_REQUIRED', message: 'At least one shipping country is required' });
      const zone = await tx.shippingZone.create({ data: { name: data.name.trim(), countries, states: data.states?.map((value) => value.trim().toUpperCase()) ?? [], postalCodes: data.postalCodes?.map((value) => value.trim()) ?? [], active: data.active ?? true } });
      await tx.auditLog.create({ data: { actorId, action: 'shipping_zone.created', resourceType: 'ShippingZone', resourceId: zone.id } });
      return zone;
    });
  }
  async createShippingMethod(actorId: string, data: {zoneId:string; name:string; type?:string; basePrice:string; freeAbove?:string; rules?:Record<string, unknown>; active?:boolean}) {
    return this.prisma.$transaction(async tx => {
      const zone = await tx.shippingZone.findUnique({ where: { id: data.zoneId }, select: { id: true } });
      if (!zone) throw new NotFoundException({ code: 'SHIPPING_ZONE_NOT_FOUND', message: 'Shipping zone was not found' });
      const method = await tx.shippingMethod.create({ data: { zoneId: data.zoneId, name: data.name.trim(), type: data.type ?? 'FLAT_RATE', basePrice: new Prisma.Decimal(data.basePrice), freeAbove: data.freeAbove ? new Prisma.Decimal(data.freeAbove) : null, rules: data.rules as Prisma.InputJsonValue | undefined, active: data.active ?? true } });
      await tx.auditLog.create({ data: { actorId, action: 'shipping_method.created', resourceType: 'ShippingMethod', resourceId: method.id } });
      return method;
    });
  }
  async createTaxClass(actorId: string, data: {name:string; description:string}) {
    return this.prisma.$transaction(async tx => {
      const cls = await tx.taxClass.create({ data });
      await tx.auditLog.create({ data: { actorId, action: 'tax_class.created', resourceType: 'TaxClass', resourceId: cls.id } });
      return cls;
    });
  }
  async createTaxRate(actorId: string, data: {classId:string; country:string; rate:string; state?:string; postalPattern?:string; inclusive?:boolean; priority?:number; active?:boolean}) {
    return this.prisma.$transaction(async tx => {
      const { classId, ...rest } = data; const taxClass = await tx.taxClass.findUnique({ where: { id: classId }, select: { id: true } });
      if (!taxClass) throw new NotFoundException({ code: 'TAX_CLASS_NOT_FOUND', message: 'Tax class was not found' });
      const rate = await tx.taxRate.create({ data: { ...rest, country: data.country.toUpperCase(), taxClassId: classId, rate: new Prisma.Decimal(data.rate), inclusive: data.inclusive ?? false, priority: data.priority ?? 0, active: data.active ?? true } });
      await tx.auditLog.create({ data: { actorId, action: 'tax_rate.created', resourceType: 'TaxRate', resourceId: rate.id } });
      return rate;
    });
  }

  shipping() {
    return this.prisma.shippingZone.findMany({ include: { methods: true } });
  }
  taxes() {
    return this.prisma.taxClass.findMany({ include: { rates: true } });
  }
  admins() {
    return this.prisma.user.findMany({
      where: { roles: { some: { role: { name: { in: ['ADMIN', 'SUPER_ADMIN'] } } } } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        twoFactorEnabled: true,
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
  }
  async createAdmin(actor: AuthUser, input: { email: string; password: string; firstName: string; lastName: string; roleIds: string[] }) {
    const email = input.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists' });
    const roles = await this.prisma.role.findMany({ where: { id: { in: input.roleIds } } });
    if (roles.length !== input.roleIds.length) throw new BadRequestException({ code: 'ROLE_INVALID', message: 'One or more roles do not exist' });
    if (roles.some((role) => role.name === 'SUPER_ADMIN') && !actor.roles.includes('SUPER_ADMIN')) throw new ForbiddenException({ code: 'SUPER_ADMIN_PROTECTED', message: 'Only a super administrator can grant that role' });
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }), firstName: input.firstName.trim(), lastName: input.lastName.trim(), emailVerifiedAt: new Date(), roles: { create: input.roleIds.map((roleId) => ({ roleId })) } }, select: { id: true, email: true, firstName: true, lastName: true, status: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'admin.created', resourceType: 'User', resourceId: user.id, metadata: { roleIds: input.roleIds } } });
      return user;
    });
  }
  async setAdminRoles(actor: AuthUser, userId: string, roleIds: string[]) {
    const [target, roles] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } }),
      this.prisma.role.findMany({ where: { id: { in: roleIds } } }),
    ]);
    if (!target) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Administrator was not found' });
    if (roles.length !== roleIds.length) throw new BadRequestException({ code: 'ROLE_INVALID', message: 'One or more roles do not exist' });
    const targetIsSuper = target.roles.some(({ role }) => role.name === 'SUPER_ADMIN');
    const grantsSuper = roles.some((role) => role.name === 'SUPER_ADMIN');
    if ((targetIsSuper || grantsSuper) && !actor.roles.includes('SUPER_ADMIN')) throw new ForbiddenException({ code: 'SUPER_ADMIN_PROTECTED', message: 'Only a super administrator can modify super administrators' });
    if (targetIsSuper && !grantsSuper && await this.prisma.user.count({ where: { roles: { some: { role: { name: 'SUPER_ADMIN' } } }, status: 'ACTIVE' } }) <= 1) throw new ConflictException({ code: 'LAST_SUPER_ADMIN', message: 'The final active super administrator cannot be demoted' });
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) });
      await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'admin.roles_changed', resourceType: 'User', resourceId: userId, metadata: { roleIds } } });
    });
    return this.admins();
  }
  roles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
  }
  permissions() { return this.prisma.permission.findMany({ orderBy: { key: 'asc' } }); }
  async createRole(actorId: string, input: { name: string; description?: string; permissionKeys: string[] }) {
    const name = input.name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: input.permissionKeys } } });
    if (permissions.length !== input.permissionKeys.length) throw new BadRequestException({ code: 'PERMISSION_INVALID', message: 'One or more permissions do not exist' });
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({ data: { name, description: input.description, permissions: { create: permissions.map(({ id }) => ({ permissionId: id })) } }, include: { permissions: { include: { permission: true } } } });
      await tx.auditLog.create({ data: { actorId, action: 'role.created', resourceType: 'Role', resourceId: role.id, metadata: { name, permissionKeys: input.permissionKeys } } });
      return role;
    });
  }
  async updateRole(actorId: string, id: string, input: { name: string; description?: string; permissionKeys: string[] }) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role was not found' });
    if (role.isSystem) throw new ForbiddenException({ code: 'SYSTEM_ROLE_PROTECTED', message: 'System roles cannot be modified' });
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: input.permissionKeys } } });
    if (permissions.length !== input.permissionKeys.length) throw new BadRequestException({ code: 'PERMISSION_INVALID', message: 'One or more permissions do not exist' });
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      const updated = await tx.role.update({ where: { id }, data: { name: input.name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'), description: input.description, permissions: { create: permissions.map(({ id: permissionId }) => ({ permissionId })) } }, include: { permissions: { include: { permission: true } } } });
      await tx.userSession.updateMany({ where: { user: { roles: { some: { roleId: id } } }, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId, action: 'role.updated', resourceType: 'Role', resourceId: id, metadata: { permissionKeys: input.permissionKeys } } });
      return updated;
    });
  }
  async deleteRole(actorId: string, id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role was not found' });
    if (role.isSystem) throw new ForbiddenException({ code: 'SYSTEM_ROLE_PROTECTED', message: 'System roles cannot be deleted' });
    if (role._count.users > 0) throw new ConflictException({ code: 'ROLE_IN_USE', message: 'Remove this role from administrators before deleting it' });
    await this.prisma.$transaction([this.prisma.role.delete({ where: { id } }), this.prisma.auditLog.create({ data: { actorId, action: 'role.deleted', resourceType: 'Role', resourceId: id, metadata: { name: role.name } } })]);
  }
  async media(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async notificationLog(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.notification.count(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async audit(q: Record<string, string>) {
    const { page, limit } = pageOf(q);
    const where: Prisma.AuditLogWhereInput = q.search
      ? {
          OR: [
            { action: { contains: q.search } },
            { resourceType: { contains: q.search } },
            { resourceId: { contains: q.search } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  settings() {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }
  setting(actorId: string, input: { key: string; value: unknown; isPublic: boolean }) {
    if (forbiddenSettingKey.test(input.key)) throw new BadRequestException({ code: 'SETTING_SECRET_FORBIDDEN', message: 'Credentials and secrets must be provided through environment configuration' });
    if (!/^[a-zA-Z][a-zA-Z0-9._-]{1,119}$/.test(input.key)) throw new BadRequestException({ code: 'SETTING_KEY_INVALID', message: 'Setting key is invalid' });
    if (input.isPublic && !publicSettingKeys.has(input.key) && !input.key.startsWith('feature.')) throw new BadRequestException({ code: 'SETTING_PUBLIC_FORBIDDEN', message: 'This setting cannot be exposed publicly' });
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.setting.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          value: input.value as Prisma.InputJsonValue,
          isPublic: input.isPublic,
          updatedById: actorId,
        },
        update: {
          value: input.value as Prisma.InputJsonValue,
          isPublic: input.isPublic,
          updatedById: actorId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'setting.updated',
          resourceType: 'Setting',
          resourceId: input.key,
        },
      });
      return item;
    });
  }
}
