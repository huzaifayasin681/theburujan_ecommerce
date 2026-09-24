import { Body, Controller, Headers, HttpCode, Param, Post, RawBodyRequest, Req } from '@nestjs/common';
import { IsInt, IsString, Length, Min } from 'class-validator';
import type { Request } from 'express';
import { Permissions, Public } from '../auth/auth.decorators';
import type { AuthRequest } from '../auth/auth.types';
import { PaymentsService } from './payments.service';
class RefundDto { @IsInt() @Min(1) amountMinor!: number; @IsString() @Length(2, 500) reason!: string; }
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post(':id/initialize') initialize(@Req() request: AuthRequest, @Param('id') id: string) { return this.payments.initialize(request.user, id); }
  @Post('paypal/:providerOrderId/capture') capturePayPal(@Req() request: AuthRequest, @Param('providerOrderId') providerOrderId: string) { return this.payments.capturePayPal(request.user, providerOrderId); }
  @Public() @Post('webhooks/stripe') @HttpCode(200) stripeWebhook(@Req() request: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) { return this.payments.webhook(request.rawBody ?? Buffer.alloc(0), signature ?? ''); }
  @Public() @Post('webhooks/paypal') @HttpCode(200) paypalWebhook(@Req() request: RawBodyRequest<Request>) { const headers = request.headers; return this.payments.paypalWebhook(request.rawBody ?? Buffer.alloc(0), { 'paypal-auth-algo': String(headers['paypal-auth-algo'] ?? ''), 'paypal-cert-url': String(headers['paypal-cert-url'] ?? ''), 'paypal-transmission-id': String(headers['paypal-transmission-id'] ?? ''), 'paypal-transmission-sig': String(headers['paypal-transmission-sig'] ?? ''), 'paypal-transmission-time': String(headers['paypal-transmission-time'] ?? '') }); }
  @Permissions('orders.refund') @Post(':id/refunds') refund(@Req() request: AuthRequest, @Param('id') id: string, @Headers('idempotency-key') key: string | undefined, @Body() body: RefundDto) { return this.payments.refund(request.user.id, id, key ?? '', body); }
}
