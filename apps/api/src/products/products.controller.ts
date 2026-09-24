import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';
import { ProductsService } from './products.service';
@Public() @Controller('products') export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() list(@Query() query: Record<string,string>) { return this.products.list(query); }
  @Get(':slug') find(@Param('slug') slug: string) { return this.products.findBySlug(slug); }
}
