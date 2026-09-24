'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Trash2, ShoppingBag, ArrowRight, Loader2, Plus, Minus, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductImageUrl } from '@/lib/dummy-images';

type Item = {
  id: string;
  quantity: number;
  product: {
    name: string;
    slug: string;
    basePrice: string;
    salePrice: string | null;
    currency: string;
    featuredImage?: { url: string; altText: string | null } | null;
  };
  variant: { 
    id: string; 
    sku: string; 
    price: string | null; 
    salePrice: string | null;
    image?: { url: string; altText: string | null } | null;
  };
};
type Cart = { items: Item[] };

const load = async () => {
  try {
    return await api<Cart>('/cart');
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return api<Cart>('/guest-cart');
    throw error;
  }
};

export default function CartPage() {
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['cart'], queryFn: load });
  
  const remove = useMutation({
    mutationFn: async (id: string) => {
      try { 
        await api(`/cart/items/${id}`, { method: 'DELETE' }); 
      } catch (error) { 
        if (error instanceof ApiClientError && error.status === 401) {
          await api(`/guest-cart/items/${id}`, { method: 'DELETE' }); 
        } else {
          throw error; 
        }
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['cart'] }),
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity < 1) return;
      try {
        await api(`/cart/items/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          await api(`/guest-cart/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
          });
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (isLoading) {
    return (
      <div className="container py-28 flex flex-col items-center justify-center min-h-[55vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-sm font-medium text-muted-foreground tracking-wide">
          Accessing your curated bag…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-24 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Trash2 className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">Unable to load bag</h1>
        <p className="text-muted-foreground mb-6 max-w-md text-sm">{error.message}</p>
        <Button onClick={() => client.invalidateQueries({ queryKey: ['cart'] })} className="rounded-full px-6">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="container py-32 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <ShoppingBag className="h-9 w-9 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight mb-3">Your Bag is Empty</h1>
        <p className="text-base text-muted-foreground max-w-md mb-8 leading-relaxed">
          Looks like you haven't selected anything for your everyday rituals yet.
        </p>
        <Button asChild size="lg" className="h-13 px-8 text-sm rounded-full font-semibold shadow-lg">
          <Link href="/shop">Explore the Collection</Link>
        </Button>
      </div>
    );
  }

  const total = data.items.reduce(
    (sum, item) =>
      sum +
      Number(
        item.variant.salePrice ??
          item.variant.price ??
          item.product.salePrice ??
          item.product.basePrice,
      ) *
        item.quantity,
    0,
  );
  
  const currency = data.items[0]?.product.currency ?? 'USD';
  const freeShippingThreshold = 150;
  const progressToFreeShipping = Math.min(100, Math.round((total / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - total);

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      {/* Page Title */}
      <div className="mb-10 pb-6 border-b border-border/80">
        <span className="eyebrow flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-accent" />
          Shopping Bag
        </span>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground">
          Review Your Selections
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.items.reduce((acc, i) => acc + i.quantity, 0)} items in your cart
        </p>
      </div>
      
      <div className="grid gap-12 lg:grid-cols-[1fr_390px] items-start">
        {/* Cart Items List */}
        <div className="flex flex-col">
          {/* Header row for desktop */}
          <div className="hidden md:grid grid-cols-[1fr_140px_110px_40px] gap-4 pb-4 border-b border-border/70 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <div>Product Detail</div>
            <div className="text-center">Quantity</div>
            <div className="text-right">Price</div>
            <div className="w-10"></div>
          </div>
          
          <ul className="flex flex-col divide-y divide-border/60">
            <AnimatePresence initial={false}>
              {data.items.map((item) => {
                const itemPrice = Number(
                  item.variant.salePrice ?? item.variant.price ?? item.product.salePrice ?? item.product.basePrice
                );
                const rawImageUrl = item.variant.image?.url ?? item.product.featuredImage?.url;
                const imageUrl = getProductImageUrl({ url: rawImageUrl ?? '' }, item.product.slug);
                
                return (
                  <motion.li 
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="py-6 sm:py-8 flex flex-col md:grid md:grid-cols-[1fr_140px_110px_40px] md:items-center gap-4 group" 
                    key={item.id}
                  >
                    {/* Item Details */}
                    <div className="flex gap-4 sm:gap-5 items-start">
                      <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-[#edeae1] shrink-0 overflow-hidden relative shadow-sm">
                        <Image
                          src={imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover object-center"
                          sizes="96px"
                          unoptimized={imageUrl.includes('unsplash.com')}
                        />
                      </div>

                      <div className="flex flex-col gap-1 py-1">
                        <Link 
                          className="font-serif font-medium text-lg leading-snug hover:text-accent transition-colors line-clamp-2" 
                          href={`/products/${item.product.slug}`}
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono">
                          Variant: {item.variant.sku}
                        </p>
                        
                        {/* Mobile price and qty stepper */}
                        <div className="md:hidden flex items-center justify-between mt-4">
                          <span className="font-semibold text-base font-sans">
                            {new Intl.NumberFormat('en', { style: 'currency', currency }).format(itemPrice * item.quantity)}
                          </span>

                          <div className="flex items-center rounded-full border border-border/80 bg-secondary/40 p-1">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              disabled={item.quantity <= 1 || updateQuantity.isPending}
                              onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 })}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary transition-colors disabled:opacity-30"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-7 text-center font-mono text-xs font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={updateQuantity.isPending}
                              onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Quantity Stepper */}
                    <div className="hidden md:flex justify-center">
                      <div className="flex items-center rounded-full border border-border/80 bg-secondary/40 p-1 shadow-sm">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={item.quantity <= 1 || updateQuantity.isPending}
                          onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 })}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors disabled:opacity-30"
                        >
                          <Minus className="h-3 w-3" />
                        </motion.button>
                        <span className="min-w-8 text-center font-mono text-xs font-semibold text-foreground">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          aria-label="Increase quantity"
                          disabled={updateQuantity.isPending}
                          onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Desktop Total Price */}
                    <div className="hidden md:block text-right font-bold text-base text-foreground font-sans">
                      {new Intl.NumberFormat('en', { style: 'currency', currency }).format(itemPrice * item.quantity)}
                    </div>
                    
                    {/* Remove Action */}
                    <div className="flex justify-end md:justify-center w-full md:w-auto mt-2 md:mt-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(item.id)}
                        aria-label={`Remove ${item.product.name} from bag`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
        
        {/* Order Summary Card */}
        <div className="lg:pl-4">
          <div className="bg-surface border border-border/80 rounded-[2rem] p-7 md:p-8 shadow-[0_10px_35px_rgba(23,32,28,0.04)] lg:sticky lg:top-28">
            <h2 className="font-serif text-2xl font-medium tracking-tight mb-5">Summary</h2>

            {/* Free Shipping Indicator */}
            <div className="mb-6 rounded-2xl bg-secondary/50 p-4 border border-border/60">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span>{remainingForFreeShipping > 0 ? `Add $${remainingForFreeShipping.toFixed(0)} for Free Shipping` : '🎉 Free Delivery Unlocked!'}</span>
                <span className="font-mono text-accent">{progressToFreeShipping}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToFreeShipping}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-accent rounded-full"
                />
              </div>
            </div>
            
            <div className="space-y-3.5 mb-6 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground font-sans">
                  {new Intl.NumberFormat('en', { style: 'currency', currency }).format(total)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Shipping</span>
                <span className="text-foreground">
                  {total >= freeShippingThreshold ? 'Free' : 'Calculated at checkout'}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Tax</span>
                <span className="text-foreground">Calculated at checkout</span>
              </div>
            </div>
            
            <div className="border-t border-border/70 pt-4 mb-8 flex justify-between items-center text-lg font-bold text-foreground">
              <span>Estimated Total</span>
              <span className="text-xl font-sans">
                {new Intl.NumberFormat('en', { style: 'currency', currency }).format(total)}
              </span>
            </div>
            
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button asChild size="lg" className="w-full h-14 text-sm font-semibold rounded-full shadow-xl flex items-center justify-center gap-2 group bg-primary text-primary-foreground hover:bg-primary/95">
                <Link href="/checkout">
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
            
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span>Encrypted 256-bit secure checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
