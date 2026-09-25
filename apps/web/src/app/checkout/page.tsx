'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ChevronRight, AlertCircle, Loader2, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getProductImageUrl } from '@/lib/dummy-images';

type ShippingMethod = { id: string; name: string; basePrice: string; freeAbove: string | null };
type Item = { id: string; quantity: number; product: { name: string; basePrice: string; salePrice: string | null; currency: string; images: { url: string; altText: string | null }[] }; variant: { price: string | null; salePrice: string | null } };
type Cart = { items: Item[] };

export default function Checkout() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  
  const { data: shippingMethods = [] } = useQuery({
    queryKey: ['shipping-methods'],
    queryFn: () => api<ShippingMethod[]>('/shipping-methods'),
  });

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<Cart>('/cart').catch(() => api<Cart>('/guest-cart'))
  });

  const cartTotal = cart?.items.reduce(
    (sum, item) =>
      sum +
      Number(
        item.variant.salePrice ?? item.variant.price ?? item.product.salePrice ?? item.product.basePrice
      ) * item.quantity,
    0
  ) || 0;
  
  const currency = cart?.items[0]?.product.currency ?? 'USD';

  async function submit(data: FormData) {
    setBusy(true);
    setError('');
    const raw = Object.fromEntries(data);
    
    const address = {
      name: raw.name,
      phone: raw.phone,
      country: raw.country,
      state: raw.state,
      city: raw.city,
      postalCode: raw.postalCode,
      line1: raw.line1,
      line2: raw.line2 || undefined,
    };
    
    const billingAddress = raw.sameBilling === 'on' ? address : { name: raw.billingName, phone: raw.billingPhone, country: raw.billingCountry, state: raw.billingState, city: raw.billingCity, postalCode: raw.billingPostalCode, line1: raw.billingLine1, line2: raw.billingLine2 || undefined };
    try {
      const result = await api<{ order: { id: string }; payment: { id: string; provider: 'COD' | 'STRIPE' | 'PAYPAL' } }>('/checkout/place-order', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          email: raw.email,
          shippingAddress: address,
          billingAddress,
          shippingMethodId: raw.shippingMethodId,
          paymentProvider: raw.paymentProvider,
          couponCode: raw.couponCode || undefined,
          customerNote: raw.customerNote || undefined,
          acceptTerms: raw.acceptTerms === 'on',
        }),
      });
      
      if (result.payment.provider !== 'COD') {
        const initialized = await api<{ redirectUrl: string | null }>(`/payments/${result.payment.id}/initialize`, { method: 'POST' });
        if (!initialized.redirectUrl) throw new Error('Payment provider did not return a checkout URL');
        window.location.assign(initialized.redirectUrl);
        return;
      }
      
      router.push(`/checkout/success?order=${result.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    { number: 1, label: 'Contact & Delivery' },
    { number: 2, label: 'Shipping Method' },
    { number: 3, label: 'Payment & Terms' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Luxury Minimal Checkout Header */}
      <header className="border-b border-border/80 bg-surface/80 backdrop-blur-xl py-5 sticky top-0 z-30">
        <div className="container flex items-center justify-between">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-90" aria-label="The Burujan Home">
            <Image src="/logo.png" alt="The Burujan" width={150} height={45} priority className="h-8 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Lock className="h-3.5 w-3.5 text-accent" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>
      </header>

      <div className="container py-10 md:py-14 flex-1 max-w-6xl">
        {/* Step Progress Pill */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-12">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(s.number)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all',
                  step === s.number
                    ? 'bg-foreground text-background shadow-sm'
                    : step > s.number
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground/70 hover:text-foreground'
                )}
              >
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-background/20 font-mono text-[10px]">
                  {s.number}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          ))}
        </div>

        <form action={submit} className="grid gap-12 lg:grid-cols-[1fr_400px] xl:gap-16 items-start">
          {/* Main Checkout Form */}
          <div className="flex flex-col gap-10">
            {/* Step 1: Contact & Delivery */}
            <div className={step === 1 ? 'space-y-8' : 'hidden'}>
              <div>
                <h2 className="font-serif text-2xl font-medium tracking-tight mb-4">Contact Information</h2>
                <div>
                  <Input 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="Email address for order receipt" 
                    className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" 
                  />
                </div>
              </div>

              <div>
                <h2 className="font-serif text-2xl font-medium tracking-tight mb-4">Shipping Destination</h2>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input name="name" required placeholder="Full recipient name" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input name="phone" required placeholder="Mobile phone number" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input name="line1" required placeholder="Street address" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input name="line2" placeholder="Suite, apartment, unit (optional)" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  </div>
                  <Input name="city" required placeholder="City" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  <Input name="state" required placeholder="State / Region" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  <Input name="postalCode" required placeholder="Postal code" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent" />
                  <Input name="country" minLength={2} maxLength={2} required placeholder="Country code (e.g. US)" className="h-12 rounded-xl bg-surface border-border focus-visible:ring-accent uppercase" />
                </div>
                <div className="mt-8">
                  <Button type="button" size="lg" className="rounded-full px-8 h-12 text-xs font-semibold uppercase tracking-wider" onClick={() => setStep(2)}>
                    <span>Continue to Shipping</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Method */}
            <div className={step === 2 ? 'space-y-6' : 'hidden'}>
              <div>
                <h2 className="font-serif text-2xl font-medium tracking-tight mb-2">Shipping Method</h2>
                <p className="text-sm text-muted-foreground mb-6">Choose your preferred fulfillment speed.</p>
                <div className="grid gap-3">
                  <select 
                    className="flex h-13 w-full rounded-2xl border border-border bg-surface px-4 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent appearance-none text-sm font-medium"
                    name="shippingMethodId" 
                    required 
                    defaultValue=""
                  >
                    <option value="" disabled>Select delivery method</option>
                    {shippingMethods.map((method) => (
                      <option value={method.id} key={method.id}>
                        {method.name} — ${method.basePrice}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-8 flex gap-3">
                  <Button type="button" variant="outline" className="rounded-full px-6 h-12 text-xs font-semibold" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="button" className="rounded-full px-8 h-12 text-xs font-semibold uppercase tracking-wider" onClick={() => setStep(3)}>
                    <span>Continue to Payment</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3: Payment & Review */}
            <div className={step === 3 ? 'space-y-6' : 'hidden'}>
              <div>
                <h2 className="font-serif text-2xl font-medium tracking-tight mb-1">Payment Method</h2>
                <p className="text-xs text-muted-foreground mb-6">All transactions are encrypted and processed securely.</p>
                
                <div className="grid gap-3 rounded-2xl border border-border/80 bg-surface p-4 shadow-sm">
                  <label className="flex items-center gap-3.5 p-3 rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors">
                    <input type="radio" name="paymentProvider" value="STRIPE" defaultChecked className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">Credit or Debit Card (Stripe)</span>
                  </label>
                  <label className="flex items-center gap-3.5 p-3 rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors border-t border-border/50">
                    <input type="radio" name="paymentProvider" value="COD" className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">Cash on Delivery (Pay upon arrival)</span>
                  </label>
                  <label className="flex items-center gap-3.5 p-3 rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors border-t border-border/50">
                    <input type="radio" name="paymentProvider" value="PAYPAL" className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">PayPal</span>
                  </label>
                </div>

                <div className="mt-6">
                  <label className="flex items-center gap-2.5 text-xs text-foreground font-medium cursor-pointer">
                    <input type="checkbox" name="sameBilling" defaultChecked className="rounded border-border text-accent" />
                    <span>Billing address matches shipping destination</span>
                  </label>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Note</h3>
                  <textarea 
                    className="flex w-full rounded-2xl border border-border bg-surface px-4 py-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[90px]" 
                    name="customerNote" 
                    placeholder="Special delivery instructions or gift message (optional)…" 
                  />
                </div>

                <label className="flex items-start gap-2.5 mt-6 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" name="acceptTerms" required className="mt-0.5 rounded border-border text-accent" />
                  <span>
                    I accept the <Link href="/terms" className="underline hover:text-foreground">terms & conditions</Link> and <Link href="/return-policy" className="underline hover:text-foreground">return policy</Link>.
                  </span>
                </label>

                <div className="mt-8 flex gap-3">
                  <Button type="button" variant="outline" className="rounded-full px-6 h-12 text-xs font-semibold" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Luxury Order Summary */}
          <aside className="bg-surface border border-border/80 rounded-[2rem] p-7 md:p-8 lg:sticky lg:top-24 flex flex-col gap-6 shadow-sm">
            <h2 className="font-serif text-xl font-medium tracking-tight">Order Summary</h2>
            
            {cart && cart.items.length > 0 ? (
              <div className="flex flex-col gap-3.5 max-h-64 overflow-y-auto pr-1">
                {cart.items.map(item => {
                  const checkoutImg = getProductImageUrl(item.product.images?.[0], item.product.name);
                  return (
                    <div key={item.id} className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 relative">
                        <div className="w-14 h-16 bg-[#edeae1] rounded-xl overflow-hidden relative shrink-0">
                          <Image 
                            src={checkoutImg} 
                            alt={item.product.images?.[0]?.altText ?? item.product.name} 
                            fill 
                            className="object-cover" 
                            sizes="56px" 
                            unoptimized={checkoutImg.includes('unsplash.com')}
                          />
                          <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-sm">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex flex-col">
                        <span className="font-medium text-xs line-clamp-1">{item.product.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-xs shrink-0 font-sans">
                      {new Intl.NumberFormat('en', { style: 'currency', currency }).format(
                        Number(item.variant.salePrice ?? item.variant.price ?? item.product.salePrice ?? item.product.basePrice) * item.quantity
                      )}
                    </span>
                  </div>
                );
              })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-2">Your cart is currently empty.</div>
            )}
            
            <div className="pt-4 border-t border-border/70">
              <div className="flex gap-2">
                <Input name="couponCode" placeholder="Gift card or code" className="h-11 rounded-xl bg-secondary/30 text-xs" />
              </div>
            </div>
            
            <div className="space-y-2.5 pt-4 border-t border-border/70 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground font-sans">{new Intl.NumberFormat('en', { style: 'currency', currency }).format(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>Calculated on step 2</span>
              </div>
            </div>
            
            <div className="border-t border-border/70 pt-4 flex justify-between items-center text-lg font-bold text-foreground">
              <span>Total</span>
              <span className="text-xl font-sans">
                {new Intl.NumberFormat('en', { style: 'currency', currency }).format(cartTotal)}
              </span>
            </div>
            
            {error && (
              <div className="bg-destructive/10 text-destructive p-3.5 rounded-xl flex items-start gap-2.5 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            
            {step < 3 ? (
              <Button 
                type="button" 
                size="lg" 
                className="w-full h-13 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg" 
                onClick={() => setStep((value) => Math.min(3, value + 1))}
              >
                Continue
              </Button>
            ) : (
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-13 rounded-full text-xs font-semibold uppercase tracking-wider shadow-xl bg-primary text-primary-foreground hover:bg-primary/95" 
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order…
                  </>
                ) : (
                  'Confirm & Place Order'
                )}
              </Button>
            )}
            
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>Full buyer protection guarantee</span>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
