import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../auth/auth.decorators';
import { CartService } from './cart.service';
class GuestItemDto {
  @IsUUID() variantId!: string;
  @IsInt() @Min(1) @Max(99) quantity!: number;
}
@Public()
@Controller('guest-cart')
export class GuestCartController {
  constructor(private readonly cart: CartService) {}
  private token(req: Request, res: Response) {
    const old = (req.cookies as Record<string, string> | undefined)?.guest_cart;
    if (old) return old;
    const token = randomBytes(32).toString('base64url');
    res.cookie('guest_cart', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 86400_000,
    });
    return token;
  }
  @Get() get(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.cart.getGuest(this.token(req, res));
  }
  @Post('items') add(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: GuestItemDto,
  ) {
    return this.cart.addGuest(this.token(req, res), body.variantId, body.quantity);
  }
  @Delete('items/:id') @HttpCode(204) remove(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
  ) {
    return this.cart.removeGuest(this.token(req, res), id);
  }
}
