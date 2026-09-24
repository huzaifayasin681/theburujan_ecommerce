import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { Permissions } from '../auth/auth.decorators';
import type { AuthRequest } from '../auth/auth.types';
import { OrdersService } from './orders.service';
class StatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
class ShipmentDto {
  @IsString() @Length(1, 100) carrier!: string;
  @IsString() @Length(1, 255) trackingNumber!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) trackingUrl?: string;
}
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list(@Req() req: AuthRequest, @Query('page') page?: string) {
    return this.orders.listMine(req.user.id, Number(page) || 1);
  }
  @Get(':id') get(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.orders.getAuthorized(req.user, id);
  }
  @Post(':id/cancel') cancel(@Req() req:AuthRequest,@Param('id')id:string){return this.orders.cancelMine(req.user.id,id)}
  @Permissions('orders.update') @Patch(':id/status') status(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: StatusDto,
  ) {
    return this.orders.transition(id, body.status, req.user.id, body.notes);
  }
  @Permissions('orders.update') @Post(':id/ship') ship(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: ShipmentDto) { return this.orders.ship(id, req.user.id, body); }
}
