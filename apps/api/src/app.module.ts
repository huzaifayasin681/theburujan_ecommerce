import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { CsrfGuard } from './auth/csrf.guard';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReturnsModule } from './returns/returns.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicModule } from './public/public.module';
import { PaymentsModule } from './payments/payments.module';
import { MediaModule } from './media/media.module';
import { JobsModule } from './jobs/jobs.module';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';
import { StructuredLogger } from './common/structured-logger.service';
import { RequestIdInterceptor } from './common/request-id.interceptor';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().min(1),
  APP_URL: z.string().url(),
  STORE_CURRENCY: z.string().length(3).default('USD'),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.string().url().optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_FROM: z.string().min(3),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_API_URL: z.string().url().default('https://api-m.paypal.com'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: (input) => envSchema.parse(input) }),
    ThrottlerModule.forRootAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ throttlers: [{ ttl: 60_000, limit: 120 }], storage: new RedisThrottlerStorage(config.getOrThrow('REDIS_URL')) }) }),
    PrismaModule,
    AuthModule,
    AccountModule,
    AdminModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    HealthModule,
    WishlistModule,
    ReviewsModule,
    ReturnsModule,
    NotificationsModule,
    PublicModule,
    PaymentsModule,
    MediaModule,
    JobsModule,
  ],
  providers: [
    StructuredLogger,
    RequestIdInterceptor,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [StructuredLogger, RequestIdInterceptor],
})
export class AppModule {}
