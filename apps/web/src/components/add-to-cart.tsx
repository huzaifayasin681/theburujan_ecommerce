'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Check, ShieldCheck, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Variant = {
  id: string;
  sku: string;
  price: string | null;
  salePrice: string | null;
  image: { url: string; altText: string | null } | null;
  active: boolean;
  inventory: { available: number; reserved: number } | null;
  values: { value: { value: string; attribute: { name: string } } }[];
};

export function AddToCart({ 
  variants, 
  basePrice, 
  salePrice, 
  currency 
}: { 
  variants: Variant[]; 
  basePrice: string; 
  salePrice: string | null; 
  currency: string 
}) {
  const [variant, setVariant] = useState(
    variants.find((v) => v.inventory && v.inventory.available - v.inventory.reserved > 0)?.id ?? ''
  );
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function add() {
    if (!variant) return;
    setBusy(true);
    setError('');
    
    const request = {
      method: 'POST',
      body: JSON.stringify({ variantId: variant, quantity: 1 }),
    };
    
    try {
      try {
        await api('/cart/items', request);
      } catch (cause) {
        if (cause instanceof ApiClientError && cause.status === 401) {
          await api('/guest-cart/items', request);
        } else {
          throw cause;
        }
      }
      setAdded(true);
      setTimeout(() => {
        router.push('/cart');
      }, 400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add item to cart');
    } finally {
      setBusy(false);
    }
  }

  // If no active variants at all
  if (!variants.some(v => v.active)) {
    return (
      <div className="w-full">
        <Button size="lg" className="w-full h-14 rounded-full text-base font-semibold" disabled>
          Currently Out of Stock
        </Button>
      </div>
    );
  }

  const hasMultipleOptions = variants.length > 1;
  const selected = variants.find((item) => item.id === variant);
  const selectedPrice = selected?.salePrice ?? selected?.price ?? salePrice ?? basePrice;
  const selectedAvailable = selected?.inventory ? selected.inventory.available - selected.inventory.reserved : 0;
  const isOutOfStock = selectedAvailable <= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Selected Variant Price & Inventory Pill */}
      {selected && (
        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-secondary/40 p-4 transition-all">
          <div>
            <span className="text-xl font-bold tracking-tight text-foreground font-sans">
              {new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(selectedPrice))}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              SKU: {selected.sku}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span 
              className={cn(
                'h-2 w-2 rounded-full',
                selectedAvailable > 0 ? 'bg-emerald-500' : 'bg-destructive'
              )} 
            />
            <span className={selectedAvailable > 0 ? 'text-foreground' : 'text-destructive font-semibold'}>
              {selectedAvailable > 0 ? `${selectedAvailable} available` : 'Out of stock'}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Variant Selector Pills */}
      {hasMultipleOptions && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Select Variant
            </label>
            <span className="text-xs text-muted-foreground">
              {variants.length} options available
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => {
              const isAvailable = Boolean(v.inventory && v.inventory.available - v.inventory.reserved > 0);
              const isSelected = v.id === variant;
              const label = v.values.map((x) => x.value.value).join(' / ') || v.sku;

              return (
                <button
                  type="button"
                  key={v.id}
                  disabled={!isAvailable}
                  onClick={() => setVariant(v.id)}
                  className={cn(
                    'relative flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200',
                    isSelected
                      ? 'bg-foreground text-background shadow-md'
                      : 'border border-border/80 bg-surface text-foreground/80 hover:border-foreground/40 hover:text-foreground',
                    !isAvailable && 'opacity-40 cursor-not-allowed line-through hover:border-border'
                  )}
                >
                  <span>{label}</span>
                  {isSelected && (
                    <motion.div
                      layoutId="selected-variant-pill"
                      className="absolute inset-0 rounded-xl ring-2 ring-foreground pointer-events-none"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Micro-Interactive Add to Cart Action */}
      <div className="flex flex-col gap-3">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          <Button 
            size="lg" 
            className={cn(
              'group relative h-14 w-full rounded-full text-base font-semibold shadow-xl transition-all duration-300',
              added 
                ? 'bg-emerald-600 text-white hover:bg-emerald-600' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            disabled={!variant || busy || isOutOfStock} 
            onClick={add}
          >
            <AnimatePresence mode="wait">
              {busy ? (
                <motion.div
                  key="busy"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Adding to Your Rituals…</span>
                </motion.div>
              ) : added ? (
                <motion.div
                  key="added"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  <span>Added to Cart</span>
                </motion.div>
              ) : isOutOfStock ? (
                <span key="outofstock">Currently Unavailable</span>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <ShoppingBag className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  <span>Add to Cart</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        {error && (
          <p className="text-xs font-semibold text-destructive mt-1 flex items-center" role="alert">
            <svg className="h-4 w-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>

      {/* Trust & Guarantee Badges */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-accent shrink-0" />
          <span>Free insured shipping over $150</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
          <span>Lifetime quality guarantee</span>
        </div>
      </div>
    </div>
  );
}
