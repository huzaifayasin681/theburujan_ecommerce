import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
export type ProviderIntent = {
  transactionId: string;
  clientSecret: string | null;
  redirectUrl: string | null;
  status: 'PENDING' | 'AUTHORIZED' | 'PAID';
};
export interface PaymentGateway {
  createIntent(input: {
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
    orderId: string;
  }): Promise<ProviderIntent>;
  refund(input: {
    transactionId: string;
    amountMinor: number;
    idempotencyKey: string;
  }): Promise<{ refundId: string; status: string }>;
}
@Injectable()
export class StripeGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}
  private secret() {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key)
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Card payments are not configured',
      });
    return key;
  }
  async createIntent(input: {
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
    orderId: string;
  }) {
    const appUrl=this.config.getOrThrow<string>('APP_URL');
    const body = new URLSearchParams({mode:'payment',client_reference_id:input.orderId,success_url:`${appUrl}/checkout/success?order=${input.orderId}&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${appUrl}/checkout?payment=cancelled`,'metadata[orderId]':input.orderId,'line_items[0][quantity]':'1','line_items[0][price_data][currency]':input.currency.toLowerCase(),'line_items[0][price_data][unit_amount]':String(input.amountMinor),'line_items[0][price_data][product_data][name]':`Burujan order ${input.orderId}`});
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.secret()}`,
        'content-type': 'application/x-www-form-urlencoded',
        'idempotency-key': input.idempotencyKey,
      },
      body,
    });
    const data = (await response.json()) as {
      error?: { message: string };
      id?: string;
      url?:string;
    };
    if (!response.ok || !data.id)
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_ERROR',
        message: data.error?.message ?? 'Payment provider rejected the request',
      });
    return {
      transactionId: data.id,
      clientSecret: null,
      redirectUrl:data.url??null,
      status:'PENDING' as const,
    };
  }
  async refund(input: { transactionId: string; amountMinor: number; idempotencyKey: string }) {
    const body = new URLSearchParams({
      payment_intent: input.transactionId,
      amount: String(input.amountMinor),
    });
    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.secret()}`,
        'content-type': 'application/x-www-form-urlencoded',
        'idempotency-key': input.idempotencyKey,
      },
      body,
    });
    const data = (await response.json()) as {
      error?: { message: string };
      id?: string;
      status?: string;
    };
    if (!response.ok || !data.id)
      throw new ServiceUnavailableException({
        code: 'REFUND_PROVIDER_ERROR',
        message: data.error?.message ?? 'Refund provider rejected the request',
      });
    return { refundId: data.id, status: data.status ?? 'pending' };
  }
  verify(payload: Buffer, header: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) return false;
    const parts = Object.fromEntries(
      header.split(',').map((part) => part.split('=', 2) as [string, string]),
    );
    if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
    const expected = createHmac('sha256', secret)
      .update(`${parts.t}.${payload.toString('utf8')}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.v1);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

@Injectable()
export class PayPalGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}
  private baseUrl() { return this.config.get('PAYPAL_API_URL', 'https://api-m.paypal.com'); }
  private async accessToken() {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
    const secret = this.config.get<string>('PAYPAL_CLIENT_SECRET');
    if (!clientId || !secret) throw new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'PayPal is not configured' });
    const response = await fetch(`${this.baseUrl()}/v1/oauth2/token`, { method: 'POST', headers: { authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    const data = await response.json() as { access_token?: string; error_description?: string };
    if (!response.ok || !data.access_token) throw new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_ERROR', message: data.error_description ?? 'PayPal authentication failed' });
    return data.access_token;
  }
  async createIntent(input: { amountMinor: number; currency: string; idempotencyKey: string; orderId: string }): Promise<ProviderIntent> {
    const token = await this.accessToken();
    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const response = await fetch(`${this.baseUrl()}/v2/checkout/orders`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'paypal-request-id': input.idempotencyKey }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ custom_id: input.orderId, amount: { currency_code: input.currency.toUpperCase(), value: (input.amountMinor / 100).toFixed(2) } }], payment_source: { paypal: { experience_context: { return_url: `${appUrl}/checkout/success?order=${input.orderId}&provider=paypal`, cancel_url: `${appUrl}/checkout?payment=cancelled`, user_action: 'PAY_NOW' } } } }) });
    const data = await response.json() as { id?: string; status?: string; links?: { rel: string; href: string }[]; message?: string };
    if (!response.ok || !data.id) throw new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_ERROR', message: data.message ?? 'PayPal rejected the order' });
    return { transactionId: data.id, clientSecret: null, redirectUrl: data.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href ?? null, status: 'PENDING' };
  }
  async captureOrder(providerOrderId: string, idempotencyKey: string) {
    const token = await this.accessToken();
    const response = await fetch(`${this.baseUrl()}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'paypal-request-id': idempotencyKey }, body: '{}' });
    const data = await response.json() as { status?: string; purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[]; message?: string };
    if (!response.ok) throw new ServiceUnavailableException({ code: 'PAYMENT_PROVIDER_ERROR', message: data.message ?? 'PayPal capture failed' });
    const capture = data.purchase_units?.flatMap((unit) => unit.payments?.captures ?? [])[0];
    return { status: data.status, captureId: capture?.id, captureStatus: capture?.status };
  }
  async refund(input: { transactionId: string; amountMinor: number; idempotencyKey: string }) {
    const token = await this.accessToken();
    const response = await fetch(`${this.baseUrl()}/v2/payments/captures/${encodeURIComponent(input.transactionId)}/refund`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'paypal-request-id': input.idempotencyKey }, body: JSON.stringify({ amount: { value: (input.amountMinor / 100).toFixed(2), currency_code: this.config.get('STORE_CURRENCY', 'USD') } }) });
    const data = await response.json() as { id?: string; status?: string; message?: string };
    if (!response.ok || !data.id) throw new ServiceUnavailableException({ code: 'REFUND_PROVIDER_ERROR', message: data.message ?? 'PayPal refund failed' });
    return { refundId: data.id, status: data.status === 'COMPLETED' ? 'succeeded' : 'pending' };
  }
  async verifyWebhook(event: unknown, headers: Record<string, string | undefined>) {
    const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID');
    if (!webhookId) return false;
    const token = await this.accessToken();
    const response = await fetch(`${this.baseUrl()}/v1/notifications/verify-webhook-signature`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'], transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'], webhook_id: webhookId, webhook_event: event }) });
    const data = await response.json() as { verification_status?: string };
    return response.ok && data.verification_status === 'SUCCESS';
  }
}
