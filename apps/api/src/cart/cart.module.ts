import { Module } from '@nestjs/common'; import { CartController } from './cart.controller';import{GuestCartController}from'./guest-cart.controller'; import { CartService } from './cart.service';
@Module({controllers:[CartController,GuestCartController],providers:[CartService],exports:[CartService]}) export class CartModule {}
