'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Loader2, AlertCircle, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';

type Wishlist = {
  items: {
    id: string;
    product: {
      name: string;
      slug: string;
      status: string;
      basePrice: string;
      salePrice: string | null;
      currency: string;
    };
    variant: {
      inventory: { available: number; reserved: number } | null;
    } | null;
  }[];
};

export function AccountWishlist() {
  const client = useQueryClient();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api<Wishlist>('/wishlist'),
  });

  const move = useMutation({
    mutationFn: (id: string) => {
      setActiveItemId(id);
      return api(`/wishlist/items/${id}/move-to-cart`, {
        method: 'POST',
        body: JSON.stringify({ quantity: 1 }),
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['wishlist'] });
      client.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Moved to cart', 'Item added to your shopping cart.');
      setActiveItemId(null);
    },
    onError: (err: Error) => {
      toast.error('Unable to move item', err.message);
      setActiveItemId(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => {
      setActiveItemId(id);
      return api(`/wishlist/items/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Item removed', 'Item removed from your wishlist.');
      setActiveItemId(null);
    },
    onError: (err: Error) => {
      toast.error('Unable to remove item', err.message);
      setActiveItemId(null);
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading your saved items...
        </p>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="card mt-8 p-8 text-center max-w-md mx-auto rounded-2xl border border-border">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <h3 className="font-bold text-foreground">Unable to load wishlist</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          {query.error.message}
        </p>
        <button
          onClick={() => query.refetch()}
          className="button inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const items = query.data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="card mt-8 p-12 text-center rounded-2xl border border-border">
        <h2 className="text-xl font-bold tracking-tight">Your wishlist is empty</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Save your favorite luxury pieces and curated objects to revisit whenever you wish.
        </p>
        <Link className="button mt-6 inline-flex" href="/shop">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      {items.map((item) => {
        const inStock = Boolean(
          item.variant?.inventory &&
            item.variant.inventory.available - item.variant.inventory.reserved > 0
        );
        const isThisMoving = move.isPending && activeItemId === item.id;
        const isThisRemoving = remove.isPending && activeItemId === item.id;

        return (
          <article
            className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border"
            key={item.id}
          >
            <div>
              <Link
                className="font-bold text-base hover:underline text-foreground"
                href={`/products/${item.product.slug}`}
              >
                {item.product.name}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                {new Intl.NumberFormat('en', {
                  style: 'currency',
                  currency: item.product.currency,
                }).format(Number(item.product.salePrice ?? item.product.basePrice))}{' '}
                &bull;{' '}
                <span
                  className={
                    inStock ? 'text-emerald-700 font-medium' : 'text-amber-700'
                  }
                >
                  {inStock ? 'In stock' : 'Out of stock'}
                </span>
              </p>
            </div>

            <div className="flex gap-2.5 items-center">
              <button
                className="button inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider py-2.5 px-4"
                disabled={!inStock || isThisMoving || isThisRemoving}
                onClick={() => move.mutate(item.id)}
              >
                {isThisMoving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Move to Cart
                  </>
                )}
              </button>

              <button
                className="button bg-transparent text-destructive border border-destructive/20 hover:bg-destructive/10 inline-flex items-center gap-1.5 text-xs font-semibold py-2.5 px-3"
                disabled={isThisMoving || isThisRemoving}
                onClick={() => remove.mutate(item.id)}
                aria-label="Remove item"
              >
                {isThisRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
