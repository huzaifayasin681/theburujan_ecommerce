import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable() export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: Record<string,string>) {
    const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where: Prisma.ProductWhereInput = { status: ProductStatus.ACTIVE, visibility: Visibility.PUBLIC, deletedAt: null,
      ...(query.search ? { OR: [{ name: { contains: query.search } }, { sku: { contains: query.search } }, { description: { contains: query.search } }, { tags: { some: { tag: { name: { contains: query.search } } } } }, { categories: { some: { category: { name: { contains: query.search } } } } }, { brand: { name: { contains: query.search } } }] } : {}),
      ...(query.category ? { categories: { some: { category: { slug: query.category, active: true } } } } : {}),
      ...(query.brand ? { brand: { slug: query.brand, active: true } } : {}),
      ...(query.minPrice || query.maxPrice ? { basePrice: { ...(query.minPrice ? { gte: query.minPrice } : {}), ...(query.maxPrice ? { lte: query.maxPrice } : {}) } } : {}),
      ...(query.rating ? { averageRating: { gte: query.rating } } : {}),
      ...(query.discount === 'true' ? { salePrice: { not: null } } : {}),
      AND: [
        ...(query.availability === 'in-stock' ? [{ variants: { some: { active: true, inventory: { available: { gt: 0 } } } } }] : []),
        ...(query.attribute && query.value ? [{ variants: { some: { values: { some: { value: { value: query.value, attribute: { name: query.attribute } } } } } } }] : []),
      ],
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput = query.sort === 'price-asc' ? { basePrice: 'asc' } : query.sort === 'price-desc' ? { basePrice: 'desc' } : query.sort === 'rating' ? { averageRating: 'desc' } : query.sort === 'best-selling' ? { soldCount: 'desc' } : { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' };
    const [data,total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip:(page-1)*limit, take:limit, orderBy, select:{ id:true,name:true,slug:true,shortDescription:true,basePrice:true,salePrice:true,currency:true,averageRating:true,reviewCount:true,brand:{select:{name:true,slug:true}},images:{where:{featured:true},take:1,select:{url:true,altText:true}},variants:{where:{active:true},select:{inventory:{select:{available:true,reserved:true}}}} } }),
      this.prisma.product.count({where}),
    ]);
    return { data: data.map(({images,variants,...product}) => ({...product,featuredImage:images[0]??null,inStock:variants.some((v)=>v.inventory && v.inventory.available-v.inventory.reserved>0)})), meta:{page,limit,total,totalPages:Math.ceil(total/limit)} };
  }
  async findBySlug(slug:string) {
    const product=await this.prisma.product.findFirst({where:{slug,status:'ACTIVE',visibility:'PUBLIC',deletedAt:null},include:{brand:true,images:{orderBy:{sortOrder:'asc'}},categories:{include:{category:true}},attributes:{orderBy:{sortOrder:'asc'},include:{values:{orderBy:{sortOrder:'asc'}}}},variants:{where:{active:true},include:{values:{include:{value:{include:{attribute:true}}}},inventory:true,image:true}},reviews:{where:{status:'APPROVED'},take:20,orderBy:{createdAt:'desc'},select:{id:true,rating:true,title:true,body:true,verifiedPurchase:true,helpfulCount:true,createdAt:true,user:{select:{firstName:true}},media:{where:{media:{visibility:'PUBLIC'}},include:{media:true}}}}}});
    if(!product) throw new NotFoundException({code:'PRODUCT_NOT_FOUND',message:'Product was not found'});
    
    const related = await this.prisma.product.findMany({
      where: {
        id: { not: product.id },
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        deletedAt: null,
        OR: [
          ...(product.brandId ? [{ brandId: product.brandId }] : []),
          ...(product.categories.length > 0 ? [{ categories: { some: { categoryId: { in: product.categories.map(c => c.categoryId) } } } }] : [])
        ]
      },
      take: 4,
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }
    });

    return { ...product, related };

  }
}
