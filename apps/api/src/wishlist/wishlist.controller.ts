import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import type { AuthRequest } from '../auth/auth.types';
import { WishlistService } from './wishlist.service';

class WishDto {
  @IsUUID() productId!: string;
  @IsOptional() @IsUUID() variantId?: string;
}
class MoveDto {
  @IsOptional() @IsInt() @Min(1) @Max(999) quantity?: number;
}

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}
  @Get() get(@Req() request: AuthRequest) { return this.wishlist.get(request.user.id); }
  @Post('items') add(@Req() request: AuthRequest, @Body() body: WishDto) { return this.wishlist.add(request.user.id, body); }
  @Post('items/:id/move-to-cart') move(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: MoveDto) { return this.wishlist.moveToCart(request.user.id, id, body.quantity ?? 1); }
  @Delete('items/:id') @HttpCode(204) remove(@Req() request: AuthRequest, @Param('id') id: string) { return this.wishlist.remove(request.user.id, id); }
}
