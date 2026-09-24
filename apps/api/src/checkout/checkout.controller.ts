import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import type { AuthRequest } from '../auth/auth.types';
import { CheckoutService } from './checkout.service';
class AddressDto { @IsString() @Length(1, 120) name!: string; @IsString() @Length(5, 32) phone!: string; @IsString() @Length(2, 2) country!: string; @IsString() @Length(1, 100) state!: string; @IsString() @Length(1, 100) city!: string; @IsString() @Length(1, 24) postalCode!: string; @IsString() @Length(1, 255) line1!: string; @IsOptional() @IsString() @Length(0, 255) line2?: string; }
class CheckoutDto { @IsEmail() email!: string; @ValidateNested() @Type(() => AddressDto) shippingAddress!: AddressDto; @ValidateNested() @Type(() => AddressDto) billingAddress!: AddressDto; @IsString() shippingMethodId!: string; @IsIn(['COD', 'STRIPE', 'PAYPAL']) paymentProvider!: 'COD' | 'STRIPE' | 'PAYPAL'; @IsOptional() @IsString() couponCode?: string; @IsOptional() @IsString() customerNote?: string; @IsBoolean() acceptTerms!: boolean; }
@Controller('checkout')
export class CheckoutController { constructor(private readonly checkout: CheckoutService) {} @Post('place-order') place(@Req() request: AuthRequest, @Body() body: CheckoutDto, @Headers('idempotency-key') key?: string) { return this.checkout.placeOrder(request.user.id, key ?? '', body); } }
