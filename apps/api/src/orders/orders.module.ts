import { Module } from '@nestjs/common'; import{InventoryModule}from'../inventory/inventory.module';import { JobsModule } from '../jobs/jobs.module'; import { OrdersController } from './orders.controller'; import { OrdersService } from './orders.service';
@Module({imports:[InventoryModule,JobsModule],controllers:[OrdersController],providers:[OrdersService]}) export class OrdersModule {}
