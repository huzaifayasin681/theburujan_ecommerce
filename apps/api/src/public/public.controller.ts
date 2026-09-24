import { Body, Controller, Delete, Get, HttpCode, Ip, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Public } from '../auth/auth.decorators';
import { PublicService } from './public.service';
class NewsletterDto {
  @IsEmail() email!: string;
}
class ContactDto {
  @IsString() @Length(2, 120) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsString() @Length(2, 200) subject!: string;
  @IsString() @Length(10, 5000) message!: string;
}
@Public()
@Controller()
export class PublicController {
  constructor(private readonly service: PublicService) {}
  @Get('storefront/settings') settings() {
    return this.service.settings();
  }
  @Get('shipping-methods') shippingMethods() {
    return this.service.shippingMethods();
  }
  @Get('categories') categories() { return this.service.categories(); }
  @Get('brands') brands() { return this.service.brands(); }
  @Post('newsletter') @Throttle({ default: { limit: 3, ttl: 60_000 } }) newsletter(
    @Body() b: NewsletterDto,
    @Ip() ip: string,
  ) {
    return this.service.subscribe(b.email, ip);
  }
  @Delete('newsletter') @HttpCode(204) unsubscribe(@Body() b: NewsletterDto) {
    return this.service.unsubscribe(b.email);
  }
  @Get('newsletter/verify') verifyNewsletter(@Query('token') token: string) { return this.service.verifyNewsletter(token); }
  @Post('contact') @Throttle({ default: { limit: 3, ttl: 300_000 } }) contact(
    @Body() b: ContactDto,
  ) {
    return this.service.contact(b);
  }
}
