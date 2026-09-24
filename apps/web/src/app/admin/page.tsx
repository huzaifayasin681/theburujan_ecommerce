'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  AlertTriangle, 
  RefreshCcw, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

type Analytics = {
  grossSales: string;
  netSales: string;
  orderCount: number;
  averageOrderValue: string;
  newCustomers: number;
  productCount: number;
  lowStockCount: number;
  refundCount: number;
  outOfStockCount: number;
  pendingReturnCount: number;
  returningCustomers: number;
  currency: string;
  revenueByDay: { day: string; revenue: string; orders: number }[];
  salesByCategory: { category: string; revenue: string; quantity: number }[];
  statusDistribution: { status: string; _count: number }[];
};

function StatCard({ 
  title, 
  value, 
  icon: Icon,
  subtitle,
  alert = false,
  highlight = false,
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  subtitle?: string;
  alert?: boolean;
  highlight?: boolean;
}) {
  return (
    <motion.div 
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300',
        highlight 
          ? 'bg-gradient-to-br from-surface to-secondary/40 border-border'
          : 'bg-surface border-border/80',
        alert && 'border-destructive/40 bg-destructive/[0.04]'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div 
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
            highlight ? 'bg-accent/10 text-accent' : 'bg-secondary text-foreground/80',
            alert && 'bg-destructive/15 text-destructive'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-foreground font-sans">
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function Admin() {
  const [range, setRange] = useState<'today' | '7' | '30' | 'month'>('30');
  
  const queryDates = (() => { 
    const end = new Date(); 
    const start = new Date(end); 
    if (range === 'today') start.setHours(0, 0, 0, 0); 
    else if (range === '7') start.setDate(end.getDate() - 7); 
    else if (range === 'month') start.setDate(1); 
    else start.setDate(end.getDate() - 30); 
    return { from: start.toISOString(), to: end.toISOString() }; 
  })();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics', range],
    queryFn: () => api<Analytics>(`/admin/analytics?from=${encodeURIComponent(queryDates.from)}&to=${encodeURIComponent(queryDates.to)}`)
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-accent mb-4" />
        <p className="font-medium text-muted-foreground tracking-wide text-sm">
          Aggregating store intelligence…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-3" />
        <h3 className="font-semibold text-destructive">Failed to load analytics</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const maxOrderCount = Math.max(...(data?.statusDistribution.map(r => r._count) ?? [1]));
  const maxRevenue = Math.max(...(data?.revenueByDay.map(item => Number(item.revenue)) ?? [1]));
  const totalCategoryRevenue = data?.salesByCategory.reduce((sum, item) => sum + Number(item.revenue), 0) || 1;

  const ranges = [
    { value: 'today', label: 'Today' },
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: 'month', label: 'This Month' },
  ] as const;

  return (
    <div className="flex flex-col gap-9">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-accent" />
              Executive Dashboard
            </span>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-normal tracking-tight md:text-4xl text-foreground">
            Store Performance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time analytics, revenue distribution, and inventory overview.
          </p>
        </div>

        {/* Date Range Selector Pill */}
        <div 
          className="inline-flex items-center rounded-full bg-surface p-1 border border-border/80 shadow-sm"
          role="group" 
          aria-label="Analytics date range"
        >
          {ranges.map(({ value, label }) => {
            const active = range === value;
            return (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={cn(
                  'relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-200',
                  active ? 'text-background' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="admin-range-pill"
                    className="absolute inset-0 rounded-full bg-foreground shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Financial KPIs */}
      <div>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Financial & Sales Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Gross Revenue" 
            value={new Intl.NumberFormat(undefined, { style: 'currency', currency: data?.currency ?? 'USD' }).format(Number(data?.grossSales || 0))} 
            icon={DollarSign} 
            subtitle="Total sales before deductions"
            highlight
          />
          <StatCard 
            title="Net Revenue" 
            value={new Intl.NumberFormat(undefined, { style: 'currency', currency: data?.currency ?? 'USD' }).format(Number(data?.netSales || 0))} 
            icon={TrendingUp} 
            subtitle="After refunds & adjustments"
            highlight
          />
          <StatCard 
            title="Total Orders" 
            value={data?.orderCount ?? 0} 
            icon={ShoppingCart} 
            subtitle="Completed & processing"
          />
          <StatCard 
            title="Average Order Value" 
            value={new Intl.NumberFormat(undefined, { style: 'currency', currency: data?.currency ?? 'USD' }).format(Number(data?.averageOrderValue || 0))} 
            icon={ArrowUpRight} 
            subtitle="Per transaction average"
          />
        </div>
      </div>

      {/* Operations & Inventory Alerts */}
      <div>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Operations & Inventory Status
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatCard 
            title="Active Products" 
            value={data?.productCount ?? 0} 
            icon={Package} 
          />
          <StatCard 
            title="New Customers" 
            value={data?.newCustomers ?? 0} 
            icon={Users} 
          />
          <StatCard 
            title="Repeat Buyers" 
            value={data?.returningCustomers ?? 0} 
            icon={Users} 
          />
          <StatCard 
            title="Low Stock" 
            value={data?.lowStockCount ?? 0} 
            icon={AlertTriangle} 
            alert={Number(data?.lowStockCount) > 0}
          />
          <StatCard 
            title="Out of Stock" 
            value={data?.outOfStockCount ?? 0} 
            icon={AlertTriangle} 
            alert={Number(data?.outOfStockCount) > 0} 
          />
          <StatCard 
            title="Returns & Refunds" 
            value={(data?.pendingReturnCount ?? 0) + (data?.refundCount ?? 0)} 
            icon={RefreshCcw} 
          />
        </div>
      </div>

      {/* Deep Analytics Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Status Distribution */}
        <div className="rounded-2xl border border-border/80 bg-surface p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Order Status Distribution</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Fulfillment pipeline breakdown</p>
            </div>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="space-y-5">
            {(!data?.statusDistribution || data.statusDistribution.length === 0) ? (
              <p className="text-muted-foreground text-sm py-4">No order data recorded for this timeframe.</p>
            ) : (
              data.statusDistribution.map(row => {
                const percentage = Math.round((row._count / maxOrderCount) * 100);
                const statusName = row.status.replaceAll('_', ' ').toLowerCase();
                return (
                  <div key={row.status} className="group">
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="capitalize text-foreground/90">{statusName}</span>
                      <span className="text-muted-foreground font-mono">{row._count} orders</span>
                    </div>
                    <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={cn(
                          'h-full rounded-full',
                          row.status === 'DELIVERED' || row.status === 'COMPLETED' ? 'bg-emerald-600' :
                          row.status === 'CANCELLED' ? 'bg-destructive' :
                          'bg-primary'
                        )}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="rounded-2xl border border-border/80 bg-surface p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Revenue Trend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Timeline sales progression</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>

          {(!data?.revenueByDay || data.revenueByDay.length === 0) ? (
            <p className="text-muted-foreground text-sm py-4">No revenue generated in selected period.</p>
          ) : (
            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {data.revenueByDay.map((row) => {
                const heightPercent = Math.min(100, Math.round((Number(row.revenue) / maxRevenue) * 100));
                return (
                  <div key={row.day} className="group">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-muted-foreground font-mono">{row.day}</span>
                      <span className="text-foreground font-semibold">
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: data.currency }).format(Number(row.revenue))}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary/70 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${heightPercent}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales by Category (Full width below) */}
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-surface p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Category Performance</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Revenue and units per product classification</p>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>

          {(!data?.salesByCategory || data.salesByCategory.length === 0) ? (
            <p className="text-muted-foreground text-sm py-4">No category sales recorded yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.salesByCategory.map((row) => {
                const sharePercent = Math.round((Number(row.revenue) / totalCategoryRevenue) * 100);
                return (
                  <div 
                    key={row.category} 
                    className="rounded-xl border border-border/60 bg-secondary/30 p-4 transition-all hover:bg-secondary/50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm text-foreground">{row.category}</h3>
                      <span className="text-xs font-bold text-accent">{sharePercent}%</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: data.currency }).format(Number(row.revenue))}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Units sold</span>
                      <span className="font-mono font-medium text-foreground">{row.quantity}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full" 
                        style={{ width: `${sharePercent}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
