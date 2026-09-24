import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsEmail,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsArray,
  IsObject,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ReviewStatus, ReturnStatus, UserStatus, Visibility } from '@prisma/client';
import { Permissions } from '../auth/auth.decorators';
import type { AuthRequest } from '../auth/auth.types';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { CouponType } from '@prisma/client';
class CouponDto {
  @IsString() @Length(2, 64) code!: string;
  @IsEnum(CouponType) type!: CouponType;
  @IsString() value!: string;
  @IsOptional() @IsString() minimumSpend?: string;
  @IsOptional() @IsString() maximumDiscount?: string;
  @IsOptional() @IsInt() usageLimit?: number;
  @IsOptional() @IsInt() perUserLimit?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() firstOrderOnly?: boolean;
  @IsOptional() @IsInt() @Min(1) minimumQuantity?: number;
  @IsOptional() @IsBoolean() stackable?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) productIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) variantIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) categoryIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) customerIds?: string[];
}

class ShippingZoneDto {
  @IsString() @Length(1, 100) name!: string;
  @IsOptional() @IsString() @Length(2, 2) country?: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) countries?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) states?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) postalCodes?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}
class ShippingMethodDto {
  @IsUUID() zoneId!: string;
  @IsString() @Length(1, 100) name!: string;
  @IsOptional() @IsString() @Length(1, 32) type?: string;
  @IsString() basePrice!: string;
  @IsOptional() @IsString() freeAbove?: string;
  @IsOptional() @IsObject() rules?: Record<string, unknown>;
  @IsOptional() @IsBoolean() active?: boolean;
}
class TaxClassDto {
  @IsString() @Length(1, 100) name!: string;
  @IsString() @Length(1, 500) description!: string;
}
class TaxRateDto {
  @IsUUID() classId!: string;
  @IsString() @Length(2, 2) country!: string;
  @IsString() rate!: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalPattern?: string;
  @IsOptional() @IsBoolean() inclusive?: boolean;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

class ProductAttributeDto {
  @IsString() @Length(1, 100) name!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) values!: string[];
}

class ProductVariantDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @Length(1, 100) sku!: string;
  @IsOptional() @IsString() price?: string;
  @IsOptional() @IsString() salePrice?: string;
  @IsInt() @Min(0) stock!: number;
  @IsOptional() @IsInt() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsInt() @Min(0) weightGrams?: number;
  @IsOptional() @IsUUID() imageId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsObject() attributes!: Record<string, string>;
}

class ProductImageDto {
  @IsUUID() mediaId!: string;
  @IsOptional() @IsString() @MaxLength(255) altText?: string;
  @IsOptional() @IsBoolean() featured?: boolean;
}

class ProductDto {
  @IsString() @Length(2, 255) name!: string;
  @IsString() @Length(2, 255) slug!: string;
  @IsString() @Length(1, 100) sku!: string;
  @IsString() @Length(10, 10000) description!: string;
  @IsString() @Length(1, 500) shortDescription!: string;
  @IsOptional() @IsString() @MaxLength(60000) richDescription?: string;
  @IsString() basePrice!: string;
  @IsOptional() @IsString() salePrice?: string;
  @IsOptional() @IsString() costPrice?: string;
  @IsEnum(ProductStatus) status!: ProductStatus;
  @IsOptional() @IsEnum(Visibility) visibility?: Visibility;
  @IsOptional() @IsUUID() brandId?: string;
  @IsOptional() @IsUUID() taxClassId?: string;
  @IsOptional() @IsInt() @Min(0) weightGrams?: number;
  @IsOptional() @IsInt() @Min(0) lengthMm?: number;
  @IsOptional() @IsInt() @Min(0) widthMm?: number;
  @IsOptional() @IsInt() @Min(0) heightMm?: number;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(170) seoDescription?: string;
  @IsOptional() @IsInt() @Min(0) initialStock?:number;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', {each: true}) categoryIds?: string[];
  @IsOptional() @IsArray() @ArrayUnique() @IsString({each: true}) tags?: string[];
  @IsOptional() @IsArray() @IsUUID("4", {each: true}) mediaIds?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
class CategoryDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(2, 160) slug!: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional() @IsString() description?: string;
  @IsBoolean() active!: boolean;
  @IsInt() sortOrder!: number;
}
class BrandDto {
  @IsString() @Length(2, 120) name!: string;
  @IsString() @Length(2, 160) slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() website?: string;
  @IsBoolean() active!: boolean;
}
class InventoryDto {
  @IsInt() quantityDelta!: number;
  @IsString() @Length(2, 500) note!: string;
}
class UserStatusDto {
  @IsEnum(UserStatus) status!: UserStatus;
}
class ReviewStatusDto {
  @IsEnum(ReviewStatus) status!: ReviewStatus;
}
class ReturnStatusDto {
  @IsEnum(ReturnStatus) status!: ReturnStatus;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
class SettingDto {
  @IsString() @Length(1, 120) key!: string;
  value!: unknown;
  @IsBoolean() isPublic!: boolean;
}
class RoleDto {
  @IsString() @Length(2, 64) name!: string;
  @IsOptional() @IsString() @Length(0, 255) description?: string;
  @IsArray() @ArrayUnique() @IsString({ each: true }) permissionKeys!: string[];
}
class AdminCreateDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID('4', { each: true }) roleIds!: string[];
}
class AdminRolesDto {
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID('4', { each: true }) roleIds!: string[];
}
@Controller('admin')
export class AdminController {
  @Permissions('settings.update') @Post('shipping/zones') createShippingZone(@Req() r: AuthRequest, @Body() b: ShippingZoneDto) { return this.service.createShippingZone(r.user.id, b); }
  @Permissions('settings.update') @Post('shipping/methods') createShippingMethod(@Req() r: AuthRequest, @Body() b: ShippingMethodDto) { return this.service.createShippingMethod(r.user.id, b); }
  @Permissions('settings.update') @Post('taxes/classes') createTaxClass(@Req() r: AuthRequest, @Body() b: TaxClassDto) { return this.service.createTaxClass(r.user.id, b); }
  @Permissions('settings.update') @Post('taxes/rates') createTaxRate(@Req() r: AuthRequest, @Body() b: TaxRateDto) { return this.service.createTaxRate(r.user.id, b); }

  constructor(private readonly service: AdminService) {}
  @Permissions('analytics.read') @Get('analytics') analytics(
    @Query('from') f?: string,
    @Query('to') t?: string,
  ) {
    return this.service.analytics(f, t);
  }
  @Permissions('products.read') @Get('products') products(@Query() q: Record<string, string>) {
    return this.service.products(q);
  }
  @Permissions('products.read') @Get('products/:id') product(@Param('id') id:string){return this.service.product(id)}
  @Permissions('products.read') @Get('products-export') exportProducts(@Res() res: Response) {
    return this.service.exportProducts(res);
  }

  @Permissions('products.create') @Post('products-import') @UseInterceptors(FileInterceptor('file')) importProducts(@Req() r: AuthRequest, @UploadedFile() file: Express.Multer.File) {
    return this.service.importProducts(r.user.id, file);
  }
  @Permissions('products.create') @Post('products') createProduct(
    @Req() r: AuthRequest,
    @Body() b: ProductDto,
  ) {
    return this.service.createProduct(r.user.id, b);
  }
  @Permissions('products.update') @Patch('products/:id') editProduct(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: ProductDto,
  ) {
    return this.service.editProduct(r.user.id, id, b);
  }
  @Permissions('products.delete') @Post('products/:id/archive') archiveProduct(
    @Req() r: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.archiveProduct(r.user.id, id);
  }
  @Permissions('products.read') @Get('categories') categories() {
    return this.service.categories();
  }
  @Permissions('products.create') @Post('categories') category(
    @Req() r: AuthRequest,
    @Body() b: CategoryDto,
  ) {
    return this.service.createCategory(r.user.id, b);
  }
  @Permissions('products.update') @Patch('categories/:id') updateCategory(@Req() r: AuthRequest, @Param('id') id: string, @Body() b: CategoryDto) { return this.service.updateCategory(r.user.id, id, b); }
  @Permissions('products.delete') @Post('categories/:id/archive') archiveCategory(@Req() r: AuthRequest, @Param('id') id: string) { return this.service.archiveCategory(r.user.id, id); }
  @Permissions('products.read') @Get('brands') brands() {
    return this.service.brands();
  }
  @Permissions('products.create') @Post('brands') brand(
    @Req() r: AuthRequest,
    @Body() b: BrandDto,
  ) {
    return this.service.createBrand(r.user.id, b);
  }
  @Permissions('products.update') @Patch('brands/:id') updateBrand(@Req() r: AuthRequest, @Param('id') id: string, @Body() b: BrandDto) { return this.service.updateBrand(r.user.id, id, b); }
  @Permissions('products.delete') @Post('brands/:id/archive') archiveBrand(@Req() r: AuthRequest, @Param('id') id: string) { return this.service.archiveBrand(r.user.id, id); }
  @Permissions('inventory.read') @Get('inventory') inventory(@Query() q: Record<string, string>) {
    return this.service.inventory(q);
  }
  @Permissions('inventory.read') @Get('inventory/:id') inventoryDetail(@Param('id') id: string) {
    return this.service.inventoryDetail(id);
  }
  @Permissions('inventory.update') @Post('inventory/:variantId/adjust') adjust(
    @Req() r: AuthRequest,
    @Param('variantId') id: string,
    @Body() b: InventoryDto,
  ) {
    return this.service.adjustInventory(r.user.id, id, b);
  }
  @Permissions('users.read') @Get('customers/:id') customer(@Param('id') id: string) {
    return this.service.customer(id);
  }
  @Permissions('users.read') @Get('customers') customers(@Query() q: Record<string, string>) {
    return this.service.customers(q);
  }
  @Permissions('users.update') @Patch('customers/:id/status') customerStatus(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: UserStatusDto,
  ) {
    return this.service.customerStatus(r.user, id, b.status);
  }
  @Permissions('reviews.moderate') @Get('reviews') reviews(@Query() q: Record<string, string>) {
    return this.service.reviews(q);
  }
  @Permissions('reviews.moderate') @Get('reviews/:id') reviewDetail(@Param('id') id: string) {
    return this.service.reviewDetail(id);
  }
  @Permissions('reviews.moderate') @Patch('reviews/:id/status') review(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: ReviewStatusDto,
  ) {
    return this.service.reviewStatus(r.user.id, id, b.status);
  }
  @Permissions('orders.read') @Get('returns') returns(@Query() q: Record<string, string>) {
    return this.service.returns(q);
  }
  @Permissions('orders.read') @Get('returns/:id') returnDetail(@Param('id') id: string) {
    return this.service.returnDetail(id);
  }
  @Permissions('orders.update') @Patch('returns/:id/status') returnStatus(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: ReturnStatusDto,
  ) {
    return this.service.returnStatus(r.user.id, id, b);
  }
  @Permissions('orders.read') @Get('payments') payments(@Query() q: Record<string, string>) {
    return this.service.payments(q);
  }
  @Permissions('orders.read') @Get('orders') orders(@Query() q: Record<string, string>) {
    return this.service.orders(q);
  }
  @Permissions('coupons.create') @Post('coupons') createCoupon(
    @Req() r: AuthRequest,
    @Body() b: CouponDto
  ) {
    return this.service.createCoupon(r.user.id, b);
  }
  @Permissions('coupons.create') @Get('coupons') coupons(@Query() q: Record<string, string>) {
    return this.service.coupons(q);
  }
  @Permissions('coupons.create') @Get('coupons/:id') coupon(@Param('id') id: string) { return this.service.coupon(id); }
  @Permissions('coupons.update') @Patch('coupons/:id') updateCoupon(@Req() r: AuthRequest, @Param('id') id: string, @Body() b: CouponDto) { return this.service.updateCoupon(r.user.id, id, b); }
  @Permissions('coupons.delete') @Delete('coupons/:id') @HttpCode(204) deleteCoupon(@Req() r: AuthRequest, @Param('id') id: string) { return this.service.deleteCoupon(r.user.id, id); }
  @Permissions('orders.read') @Get('refunds') refunds(@Query() q: Record<string, string>) {
    return this.service.refunds(q);
  }
  @Permissions('settings.read') @Get('shipping') shipping() {
    return this.service.shipping();
  }
  @Permissions('settings.read') @Get('taxes') taxes() {
    return this.service.taxes();
  }
  @Permissions('admins.manage') @Get('admins') admins() {
    return this.service.admins();
  }
  @Permissions('admins.manage') @Post('admins') createAdmin(@Req() r: AuthRequest, @Body() b: AdminCreateDto) { return this.service.createAdmin(r.user, b); }
  @Permissions('admins.manage') @Patch('admins/:id/roles') adminRoles(@Req() r: AuthRequest, @Param('id') id: string, @Body() b: AdminRolesDto) { return this.service.setAdminRoles(r.user, id, b.roleIds); }
  @Permissions('roles.manage') @Get('roles') roles() {
    return this.service.roles();
  }
  @Permissions('roles.manage') @Get('permissions') permissions() { return this.service.permissions(); }
  @Permissions('roles.manage') @Post('roles') createRole(@Req() r: AuthRequest, @Body() b: RoleDto) { return this.service.createRole(r.user.id, b); }
  @Permissions('roles.manage') @Patch('roles/:id') updateRole(@Req() r: AuthRequest, @Param('id') id: string, @Body() b: RoleDto) { return this.service.updateRole(r.user.id, id, b); }
  @Permissions('roles.manage') @Delete('roles/:id') @HttpCode(204) deleteRole(@Req() r: AuthRequest, @Param('id') id: string) { return this.service.deleteRole(r.user.id, id); }
  @Permissions('settings.read') @Get('media') media(@Query() q: Record<string, string>) {
    return this.service.media(q);
  }
  @Permissions('settings.read') @Get('notifications') notifications(
    @Query() q: Record<string, string>,
  ) {
    return this.service.notificationLog(q);
  }
  @Permissions('audit.read') @Get('audit-logs') audit(@Query() q: Record<string, string>) {
    return this.service.audit(q);
  }
  @Permissions('settings.read') @Get('settings') settings() {
    return this.service.settings();
  }
  @Permissions('settings.update') @Post('settings') setting(
    @Req() r: AuthRequest,
    @Body() b: SettingDto,
  ) {
    return this.service.setting(r.user.id, b);
  }
}
