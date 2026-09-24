'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ChevronRight, Package, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: string;
  currency: string;
  createdAt: string;
};

export default function Orders() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<{ data: Order[] }>('/orders')
  });

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('PENDING') || s.includes('PROCESSING')) return 'bg-warning/10 text-warning';
    if (s.includes('CONFIRMED') || s.includes('SHIPPED') || s.includes('DELIVERED')) return 'bg-success/10 text-success';
    if (s.includes('CANCELLED') || s.includes('FAILED')) return 'bg-destructive/10 text-destructive';
    return 'bg-secondary text-foreground';
  };

  return (
    <div className="container py-8 md:py-16 max-w-5xl">
      <div className="mb-8">
        <Link href="/account" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Account
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Order History</h1>
        <p className="mt-2 text-muted-foreground">View and track your recent orders.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl flex flex-col items-center text-center">
          <p className="font-medium mb-4">{error.message}</p>
          <Button variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/20">
            Try again
          </Button>
        </div>
      ) : !data?.data.length ? (
        <div className="bg-surface border border-border rounded-xl py-20 flex flex-col items-center text-center px-4">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            When you make a purchase, your order history and details will appear here.
          </p>
          <Button asChild>
            <Link href="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 p-6 bg-secondary/50 border-b border-border text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Order Details</div>
            <div>Date</div>
            <div>Status</div>
            <div className="text-right">Total</div>
            <div className="w-8"></div>
          </div>
          
          <div className="divide-y divide-border">
            {data.data.map(o => (
              <Link 
                href={`/account/orders/${o.id}`} 
                key={o.id}
                className="group flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center gap-4 p-6 hover:bg-secondary/20 transition-colors"
              >
                {/* Mobile: Order # and Date row */}
                <div className="flex justify-between items-center md:hidden mb-2">
                  <span className="font-bold">{o.orderNumber}</span>
                  <span className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
                
                {/* Desktop: Order # */}
                <div className="hidden md:flex flex-col">
                  <span className="font-bold group-hover:underline">{o.orderNumber}</span>
                </div>
                
                {/* Desktop: Date */}
                <div className="hidden md:block text-sm text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString()}
                </div>
                
                {/* Status */}
                <div className="flex items-center">
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider",
                    getStatusColor(o.status)
                  )}>
                    {o.status.replaceAll('_', ' ')}
                  </span>
                </div>
                
                {/* Total */}
                <div className="md:text-right font-medium">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: o.currency }).format(Number(o.grandTotal))}
                </div>
                
                {/* Arrow */}
                <div className="hidden md:flex justify-end">
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
