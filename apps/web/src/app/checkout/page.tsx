'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Lock,
  ChevronRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Truck,
  CheckCircle2,
  CreditCard,
  Banknote,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getProductImageUrl } from '@/lib/dummy-images';

type ShippingMethod = {
  id: string;
  name: string;
  basePrice: string;
  freeAbove: string | null;
};

type Item = {
  id: string;
  quantity: number;
  product: {
    name: string;
    basePrice: string;
    salePrice: string | null;
    currency: string;
    images: { url: string; altText: string | null }[];
  };
  variant: {
    price: string | null;
    salePrice: string | null;
  };
};

type Cart = { items: Item[] };

type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'QA', name: 'Qatar' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'OM', name: 'Oman' },
  { code: 'BH', name: 'Bahrain' },
];

export default function Checkout() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<'STRIPE' | 'COD' | 'PAYPAL'>('COD');
  const [sameBilling, setSameBilling] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Shipping form fields
  const [shippingForm, setShippingForm] = useState({
    email: '',
    name: '',
    phone: '',
    country: 'US',
    state: '',
    city: '',
    postalCode: '',
    line1: '',
    line2: '',
  });

  // Billing form fields
  const [billingForm, setBillingForm] = useState({
    name: '',
    phone: '',
    country: 'US',
    state: '',
    city: '',
    postalCode: '',
    line1: '',
    line2: '',
  });

  const router = useRouter();

  const { data: user } = useQuery<UserProfile | null>({
    queryKey: ['me'],
    queryFn: () => api<UserProfile>('/auth/me').catch(() => null),
  });

  // Autofill user information if logged in
  useEffect(() => {
    if (user) {
      setShippingForm((prev) => ({
        ...prev,
        email: prev.email || user.email || '',
        name: prev.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const { data: shippingMethods = [], isLoading: shippingMethodsLoading } = useQuery<ShippingMethod[]>({
    queryKey: ['shipping-methods'],
    queryFn: () => api<ShippingMethod[]>('/shipping-methods'),
  });

  // Auto-select the first shipping method if none is selected
  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedShippingMethodId && shippingMethods[0]) {
      setSelectedShippingMethodId(shippingMethods[0].id);
    }
  }, [shippingMethods, selectedShippingMethodId]);

  const { data: cart } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: () => api<Cart>('/cart').catch(() => api<Cart>('/guest-cart')),
  });

  const cartTotal =
    cart?.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.variant.salePrice ?? item.variant.price ?? item.product.salePrice ?? item.product.basePrice
        ) *
          item.quantity,
      0
    ) || 0;

  const currency = cart?.items[0]?.product.currency ?? 'USD';

  // Find currently selected method & cost
  const activeMethod =
    shippingMethods.find((m) => m.id === selectedShippingMethodId) || shippingMethods[0];
  const shippingCost = activeMethod ? Number(activeMethod.basePrice) : 0;
  const grandTotal = cartTotal + shippingCost;

  function validateStep1(): boolean {
    setError('');
    if (!shippingForm.email || !shippingForm.email.includes('@')) {
      setError('Please provide a valid email address for order confirmation.');
      return false;
    }
    if (!shippingForm.name.trim()) {
      setError('Please enter the recipient full name.');
      return false;
    }
    if (!shippingForm.phone.trim()) {
      setError('Please enter a contact phone number.');
      return false;
    }
    if (!shippingForm.line1.trim()) {
      setError('Please enter the street delivery address.');
      return false;
    }
    if (!shippingForm.city.trim()) {
      setError('Please enter the delivery city.');
      return false;
    }
    if (!shippingForm.state.trim()) {
      setError('Please enter the state or region.');
      return false;
    }
    if (!shippingForm.postalCode.trim()) {
      setError('Please enter the postal or zip code.');
      return false;
    }
    return true;
  }

  function handleContinueToStep2() {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleContinueToStep3() {
    setError('');
    const methodId = selectedShippingMethodId || shippingMethods[0]?.id;
    if (!methodId) {
      setError('Please select a shipping delivery method.');
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');

    // Final validations
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const methodId = selectedShippingMethodId || shippingMethods[0]?.id;
    if (!methodId) {
      setStep(2);
      setError('Please choose a delivery method to proceed.');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the Terms & Conditions and Return Policy.');
      return;
    }

    setBusy(true);

    const address = {
      name: shippingForm.name.trim(),
      phone: shippingForm.phone.trim(),
      country: shippingForm.country.trim().toUpperCase(),
      state: shippingForm.state.trim(),
      city: shippingForm.city.trim(),
      postalCode: shippingForm.postalCode.trim(),
      line1: shippingForm.line1.trim(),
      line2: shippingForm.line2.trim() || undefined,
    };

    const billingAddress = sameBilling
      ? address
      : {
          name: (billingForm.name || shippingForm.name).trim(),
          phone: (billingForm.phone || shippingForm.phone).trim(),
          country: (billingForm.country || shippingForm.country).trim().toUpperCase(),
          state: (billingForm.state || shippingForm.state).trim(),
          city: (billingForm.city || shippingForm.city).trim(),
          postalCode: (billingForm.postalCode || shippingForm.postalCode).trim(),
          line1: (billingForm.line1 || shippingForm.line1).trim(),
          line2: billingForm.line2.trim() || undefined,
        };

    try {
      const result = await api<{
        order: { id: string };
        payment: { id: string; provider: 'COD' | 'STRIPE' | 'PAYPAL' };
      }>('/checkout/place-order', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          email: shippingForm.email.trim(),
          shippingAddress: address,
          billingAddress,
          shippingMethodId: methodId,
          paymentProvider,
          couponCode: couponCode.trim() || undefined,
          customerNote: customerNote.trim() || undefined,
          acceptTerms: true,
        }),
      });

      if (result.payment.provider !== 'COD') {
        const initialized = await api<{ redirectUrl: string | null }>(
          `/payments/${result.payment.id}/initialize`,
          { method: 'POST' }
        );
        if (!initialized.redirectUrl)
          throw new Error('Payment provider did not return a checkout URL');
        window.location.assign(initialized.redirectUrl);
        return;
      }

      router.push(`/checkout/success?order=${result.order.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to place order. Please review your details and try again.';
      setError(message);
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
    <div className="min-h-screen bg-stone-50/50 flex flex-col">
      {/* Luxury Minimal Checkout Header */}
      <header className="border-b border-border/70 bg-white/80 backdrop-blur-xl py-4 sticky top-0 z-30 shadow-xs">
        <div className="container flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center transition-opacity hover:opacity-90"
            aria-label="The Burujan Home"
          >
            <Image
              src="/logo.png"
              alt="The Burujan"
              width={160}
              height={48}
              priority
              className="h-8 md:h-9 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-stone-100/80 px-3.5 py-1.5 rounded-full border border-stone-200/60">
            <Lock className="h-3.5 w-3.5 text-stone-700" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </header>

      <div className="container py-8 md:py-12 flex-1 max-w-6xl">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  if (s.number === 1) setStep(1);
                  else if (s.number === 2 && validateStep1()) setStep(2);
                  else if (s.number === 3 && validateStep1() && selectedShippingMethodId)
                    setStep(3);
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all shadow-xs',
                  step === s.number
                    ? 'bg-stone-900 text-white shadow-md'
                    : step > s.number
                    ? 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                    : 'bg-white border border-stone-200 text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold',
                    step === s.number ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-700'
                  )}
                >
                  {step > s.number ? '✓' : s.number}
                </span>
                <span className="hidden sm:inline font-sans">{s.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-stone-300 shrink-0" />
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-10 lg:grid-cols-[1fr_400px] xl:gap-14 items-start"
        >
          {/* Main Checkout Steps */}
          <div className="flex flex-col gap-8">
            {/* Step 1: Contact & Delivery Address */}
            <div className={cn('space-y-8', step !== 1 && 'hidden')}>
              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="h-6 w-1 bg-stone-900 rounded-full" />
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-stone-900">
                    Contact Information
                  </h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="email"
                    type="email"
                    required
                    value={shippingForm.email}
                    onChange={(e) =>
                      setShippingForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="email@example.com (for order receipt & tracking)"
                    className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    We will send order confirmation and tracking details to this email.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="h-6 w-1 bg-stone-900 rounded-full" />
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-stone-900">
                    Shipping Destination
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Full Recipient Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="name"
                      required
                      value={shippingForm.name}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g. Eleanor Vance"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Mobile Phone Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="phone"
                      required
                      type="tel"
                      value={shippingForm.phone}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      placeholder="e.g. +1 555 019 2834"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="line1"
                      required
                      value={shippingForm.line1}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, line1: e.target.value }))
                      }
                      placeholder="House/Apartment #, Street address"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Apartment, Suite, Unit <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Input
                      name="line2"
                      value={shippingForm.line2}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, line2: e.target.value }))
                      }
                      placeholder="Apt 4B, Building 2"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="city"
                      required
                      value={shippingForm.city}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, city: e.target.value }))
                      }
                      placeholder="e.g. New York, Lahore"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      State / Province / Region <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="state"
                      required
                      value={shippingForm.state}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, state: e.target.value }))
                      }
                      placeholder="e.g. NY, Punjab"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Postal / ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="postalCode"
                      required
                      value={shippingForm.postalCode}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, postalCode: e.target.value }))
                      }
                      placeholder="e.g. 10001, 54000"
                      className="h-12 rounded-xl bg-stone-50/50 border-stone-200 text-sm focus-visible:ring-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="country"
                      value={shippingForm.country}
                      onChange={(e) =>
                        setShippingForm((f) => ({ ...f, country: e.target.value }))
                      }
                      className="flex h-12 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2 text-sm font-medium text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    type="button"
                    size="lg"
                    className="rounded-full px-8 h-12 text-xs font-semibold uppercase tracking-wider bg-stone-900 hover:bg-stone-800 text-white"
                    onClick={handleContinueToStep2}
                  >
                    <span>Continue to Shipping</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Method Selection */}
            <div className={cn('space-y-6', step !== 2 && 'hidden')}>
              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="h-6 w-1 bg-stone-900 rounded-full" />
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-stone-900">
                    Delivery Speed & Carrier
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Select your preferred courier service and transit time for delivery to{' '}
                  <span className="font-semibold text-stone-800">
                    {shippingForm.city || 'your destination'}, {shippingForm.country}
                  </span>
                  .
                </p>

                {shippingMethodsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-stone-900" />
                    <p className="text-xs font-medium">Fetching verified shipping options…</p>
                  </div>
                ) : shippingMethods.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-stone-300 text-center">
                    <Truck className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-stone-700">Standard Insured Delivery Included</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Our concierge team will coordinate dispatch right after order confirmation.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5">
                    {shippingMethods.map((method) => {
                      const isSelected =
                        selectedShippingMethodId === method.id ||
                        (!selectedShippingMethodId && method === shippingMethods[0]);
                      const priceNum = Number(method.basePrice);

                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedShippingMethodId(method.id)}
                          className={cn(
                            'relative flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200',
                            isSelected
                              ? 'border-stone-900 bg-stone-50/60 shadow-xs ring-1 ring-stone-900/10'
                              : 'border-stone-200/90 bg-white hover:border-stone-300 hover:bg-stone-50/30'
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                                isSelected
                                  ? 'border-stone-900 bg-stone-900 text-white'
                                  : 'border-stone-300 bg-white'
                              )}
                            >
                              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-stone-900 tracking-tight">
                                {method.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Fully tracked & signature insured on arrival
                              </p>
                            </div>
                          </div>

                          <div className="text-right pl-3 shrink-0">
                            {priceNum === 0 ? (
                              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                                Complimentary (Free)
                              </span>
                            ) : (
                              <span className="font-serif text-base font-semibold text-stone-900 font-sans">
                                +${priceNum.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hidden input to ensure shippingMethodId is always in FormData */}
                <input
                  type="hidden"
                  name="shippingMethodId"
                  value={selectedShippingMethodId || shippingMethods[0]?.id || ''}
                />

                <div className="mt-8 flex items-center justify-between pt-4 border-t border-stone-100">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6 h-12 text-xs font-semibold text-stone-700 border-stone-200"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Address
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full px-8 h-12 text-xs font-semibold uppercase tracking-wider bg-stone-900 hover:bg-stone-800 text-white"
                    onClick={handleContinueToStep3}
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3: Payment & Terms */}
            <div className={cn('space-y-6', step !== 3 && 'hidden')}>
              <div className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="h-6 w-1 bg-stone-900 rounded-full" />
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-stone-900">
                    Payment Method
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mb-6">
                  Select your preferred settlement channel. All payments are encrypted and secure.
                </p>

                <div className="grid gap-3 rounded-2xl border border-stone-200/90 bg-stone-50/30 p-2">
                  {/* COD Option */}
                  <label
                    onClick={() => setPaymentProvider('COD')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all',
                      paymentProvider === 'COD'
                        ? 'bg-white shadow-xs border border-stone-300/80 ring-1 ring-stone-900/10'
                        : 'hover:bg-stone-100/60'
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="COD"
                        checked={paymentProvider === 'COD'}
                        onChange={() => setPaymentProvider('COD')}
                        className="h-4 w-4 text-stone-900 accent-stone-900"
                      />
                      <div className="flex items-center gap-2.5">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            Cash on Delivery (COD)
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Pay with cash or digital handover upon delivery at your doorstep
                          </p>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Zero Surcharge
                    </span>
                  </label>

                  {/* Stripe Card Option */}
                  <label
                    onClick={() => setPaymentProvider('STRIPE')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-t border-stone-100',
                      paymentProvider === 'STRIPE'
                        ? 'bg-white shadow-xs border border-stone-300/80 ring-1 ring-stone-900/10'
                        : 'hover:bg-stone-100/60'
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="STRIPE"
                        checked={paymentProvider === 'STRIPE'}
                        onChange={() => setPaymentProvider('STRIPE')}
                        className="h-4 w-4 text-stone-900 accent-stone-900"
                      />
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="h-4 w-4 text-stone-700" />
                        <div>
                          <p className="text-sm font-semibold text-stone-900">
                            Credit or Debit Card (Stripe)
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Visa, Mastercard, American Express, Apple Pay
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* PayPal Option */}
                  <label
                    onClick={() => setPaymentProvider('PAYPAL')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-t border-stone-100',
                      paymentProvider === 'PAYPAL'
                        ? 'bg-white shadow-xs border border-stone-300/80 ring-1 ring-stone-900/10'
                        : 'hover:bg-stone-100/60'
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="radio"
                        name="paymentProvider"
                        value="PAYPAL"
                        checked={paymentProvider === 'PAYPAL'}
                        onChange={() => setPaymentProvider('PAYPAL')}
                        className="h-4 w-4 text-stone-900 accent-stone-900"
                      />
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="h-4 w-4 text-sky-600" />
                        <div>
                          <p className="text-sm font-semibold text-stone-900">PayPal</p>
                          <p className="text-[11px] text-muted-foreground">
                            Safe and instant international checkout via PayPal balance or bank
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Billing Address Toggle */}
                <div className="mt-6 pt-5 border-t border-stone-100">
                  <label className="flex items-center gap-2.5 text-xs text-stone-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      name="sameBilling"
                      checked={sameBilling}
                      onChange={(e) => setSameBilling(e.target.checked)}
                      className="rounded border-stone-300 text-stone-900 accent-stone-900 h-4 w-4"
                    />
                    <span>Billing address matches shipping destination</span>
                  </label>
                </div>

                {!sameBilling && (
                  <div className="mt-5 p-5 rounded-2xl border border-stone-200 bg-stone-50/40 grid gap-3.5 sm:grid-cols-2">
                    <h3 className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-stone-600">
                      Billing Address Details
                    </h3>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Billing recipient name"
                        value={billingForm.name}
                        onChange={(e) =>
                          setBillingForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="h-11 rounded-xl bg-white border-stone-200 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Billing phone number"
                        value={billingForm.phone}
                        onChange={(e) =>
                          setBillingForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        className="h-11 rounded-xl bg-white border-stone-200 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Billing street address"
                        value={billingForm.line1}
                        onChange={(e) =>
                          setBillingForm((f) => ({ ...f, line1: e.target.value }))
                        }
                        className="h-11 rounded-xl bg-white border-stone-200 text-sm"
                      />
                    </div>
                    <Input
                      placeholder="City"
                      value={billingForm.city}
                      onChange={(e) =>
                        setBillingForm((f) => ({ ...f, city: e.target.value }))
                      }
                      className="h-11 rounded-xl bg-white border-stone-200 text-sm"
                    />
                    <Input
                      placeholder="State / Region"
                      value={billingForm.state}
                      onChange={(e) =>
                        setBillingForm((f) => ({ ...f, state: e.target.value }))
                      }
                      className="h-11 rounded-xl bg-white border-stone-200 text-sm"
                    />
                    <Input
                      placeholder="Postal code"
                      value={billingForm.postalCode}
                      onChange={(e) =>
                        setBillingForm((f) => ({ ...f, postalCode: e.target.value }))
                      }
                      className="h-11 rounded-xl bg-white border-stone-200 text-sm"
                    />
                    <select
                      value={billingForm.country}
                      onChange={(e) =>
                        setBillingForm((f) => ({ ...f, country: e.target.value }))
                      }
                      className="flex h-11 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Optional Customer Note */}
                <div className="mt-6 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Order Delivery Instructions{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="flex w-full rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 min-h-[80px]"
                    placeholder="Gate code, landmark, or specific packaging request…"
                  />
                </div>

                {/* Terms Agreement */}
                <div className="mt-6 pt-5 border-t border-stone-100">
                  <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-0.5 rounded border-stone-300 text-stone-900 accent-stone-900 h-4 w-4"
                    />
                    <span>
                      I agree to the{' '}
                      <Link href="/terms" className="underline text-stone-800 hover:text-black">
                        Terms & Conditions
                      </Link>{' '}
                      and acknowledge the{' '}
                      <Link
                        href="/return-policy"
                        className="underline text-stone-800 hover:text-black"
                      >
                        Return & Refund Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>

                <div className="mt-8 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full px-6 h-12 text-xs font-semibold text-stone-700 border-stone-200"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Shipping
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Luxury Order Summary Sidebar */}
          <aside className="bg-white border border-stone-200/90 rounded-[2rem] p-6 md:p-7 lg:sticky lg:top-24 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h2 className="font-serif text-xl font-medium tracking-tight text-stone-900">
                Order Summary
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                {cart?.items.reduce((s, i) => s + i.quantity, 0) || 0} item(s)
              </span>
            </div>

            {/* Cart Items List */}
            {cart && cart.items.length > 0 ? (
              <div className="flex flex-col gap-3.5 max-h-64 overflow-y-auto pr-1">
                {cart.items.map((item) => {
                  const checkoutImg = getProductImageUrl(
                    item.product.images?.[0],
                    item.product.name
                  );
                  const itemUnitPrice = Number(
                    item.variant.salePrice ??
                      item.variant.price ??
                      item.product.salePrice ??
                      item.product.basePrice
                  );

                  return (
                    <div key={item.id} className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 relative min-w-0">
                        <div className="w-13 h-15 bg-[#edeae1] rounded-xl overflow-hidden relative shrink-0 border border-stone-200/60">
                          <Image
                            src={checkoutImg}
                            alt={item.product.images?.[0]?.altText ?? item.product.name}
                            fill
                            className="object-cover"
                            sizes="52px"
                            unoptimized={checkoutImg.includes('unsplash.com')}
                          />
                          <span className="absolute -top-1 -right-1 bg-stone-900 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs text-stone-900 truncate">
                            {item.product.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Qty: {item.quantity} ×{' '}
                            {new Intl.NumberFormat('en', { style: 'currency', currency }).format(
                              itemUnitPrice
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-xs shrink-0 font-sans text-stone-900">
                        {new Intl.NumberFormat('en', { style: 'currency', currency }).format(
                          itemUnitPrice * item.quantity
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-3 text-center border border-dashed border-stone-200 rounded-xl">
                Your cart is currently empty.
              </div>
            )}

            {/* Promo Code Input */}
            <div className="pt-3 border-t border-stone-100">
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Promo or gift code"
                  className="h-10 rounded-xl bg-stone-50/50 text-xs border-stone-200 uppercase"
                />
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2.5 pt-3 border-t border-stone-100 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900 font-sans">
                  {new Intl.NumberFormat('en', { style: 'currency', currency }).format(cartTotal)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground items-center">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-stone-500" />
                  <span>Shipping</span>
                </span>
                <span className="font-medium font-sans">
                  {shippingCost === 0 ? (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                      Complimentary (Free)
                    </span>
                  ) : (
                    <span className="text-stone-900 font-semibold">
                      +{new Intl.NumberFormat('en', { style: 'currency', currency }).format(shippingCost)}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="border-t border-stone-200 pt-4 flex justify-between items-center text-stone-900">
              <div>
                <span className="text-sm font-semibold tracking-tight">Grand Total</span>
                <p className="text-[10px] text-muted-foreground">Includes all applicable duties & taxes</p>
              </div>
              <span className="text-xl font-bold font-serif font-sans text-stone-900">
                {new Intl.NumberFormat('en', { style: 'currency', currency }).format(grandTotal)}
              </span>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="bg-red-50 border border-red-200/80 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <p className="leading-snug">{error}</p>
              </div>
            )}

            {/* Primary Action Button */}
            {step === 1 ? (
              <Button
                type="button"
                size="lg"
                className="w-full h-13 rounded-full text-xs font-semibold uppercase tracking-wider shadow-md bg-stone-900 hover:bg-stone-800 text-white"
                onClick={handleContinueToStep2}
              >
                <span>Continue to Shipping</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : step === 2 ? (
              <Button
                type="button"
                size="lg"
                className="w-full h-13 rounded-full text-xs font-semibold uppercase tracking-wider shadow-md bg-stone-900 hover:bg-stone-800 text-white"
                onClick={handleContinueToStep3}
              >
                <span>Continue to Payment</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={busy}
                className="w-full h-13 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-75"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Your Order…
                  </>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-stone-600" />
              <span>Full Buyer Protection & Authenticity Guaranteed</span>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
