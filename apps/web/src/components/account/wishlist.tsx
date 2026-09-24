'use client';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Wishlist = { items: { id: string; product: { name: string; slug: string; status: string; basePrice: string; salePrice: string | null; currency: string }; variant: { inventory: { available: number; reserved: number } | null } | null }[] };

export function AccountWishlist() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['wishlist'], queryFn: () => api<Wishlist>('/wishlist') });
  const move = useMutation({ mutationFn: (id: string) => api(`/wishlist/items/${id}/move-to-cart`, { method: 'POST', body: JSON.stringify({ quantity: 1 }) }), onSuccess: () => { client.invalidateQueries({ queryKey: ['wishlist'] }); client.invalidateQueries({ queryKey: ['cart'] }); } });
  const remove = useMutation({ mutationFn: (id: string) => api(`/wishlist/items/${id}`, { method: 'DELETE' }), onSuccess: () => client.invalidateQueries({ queryKey: ['wishlist'] }) });
  if (query.isLoading) return <p className="mt-8">Loading wishlist…</p>;
  if (query.error) return <p className="mt-8 text-red-700" role="alert">{query.error.message}</p>;
  if (!query.data?.items.length) return <div className="card mt-8 p-10 text-center"><h2 className="text-xl font-bold">Your wishlist is empty</h2><Link className="button mt-5 inline-flex" href="/shop">Browse products</Link></div>;
  return <div className="mt-8 grid gap-4">{query.data.items.map((item) => { const inStock = Boolean(item.variant?.inventory && item.variant.inventory.available - item.variant.inventory.reserved > 0); return <article className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" key={item.id}><div><Link className="font-bold hover:underline" href={`/products/${item.product.slug}`}>{item.product.name}</Link><p className="text-sm text-muted-foreground">{new Intl.NumberFormat('en', { style: 'currency', currency: item.product.currency }).format(Number(item.product.salePrice ?? item.product.basePrice))} · {inStock ? 'In stock' : 'Unavailable'}</p></div><div className="flex gap-3"><button className="button" disabled={!inStock || move.isPending} onClick={() => move.mutate(item.id)}>Move to cart</button><button className="button bg-transparent text-red-700 ring-1 ring-red-200" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>Remove</button></div></article>; })}</div>;
}
