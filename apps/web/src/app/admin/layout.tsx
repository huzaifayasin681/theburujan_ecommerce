'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  ShoppingBag, 
  Users, 
  Archive, 
  TicketPercent, 
  Star, 
  RotateCcw,
  CreditCard,
  Truck,
  FileText,
  Image as ImageIcon,
  Bell,
  LineChart,
  UserCog,
  ShieldAlert,
  Settings,
  Store,
  ExternalLink,
  Loader2,
  Lock
} from 'lucide-react';

const nav = [
  { href: '', label: 'Dashboard', icon: LayoutDashboard, permission: 'analytics.read' },
  { href: 'products', label: 'Products', icon: Package, permission: 'products.read' },
  { href: 'categories', label: 'Categories', icon: Tags, permission: 'products.read' },
  { href: 'brands', label: 'Brands', icon: Store, permission: 'products.read' },
  { href: 'orders', label: 'Orders', icon: ShoppingBag, permission: 'orders.read' },
  { href: 'customers', label: 'Customers', icon: Users, permission: 'users.read' },
  { href: 'inventory', label: 'Inventory', icon: Archive, permission: 'inventory.read' },
  { href: 'coupons', label: 'Coupons', icon: TicketPercent, permission: 'coupons.create' },
  { href: 'reviews', label: 'Reviews', icon: Star, permission: 'reviews.moderate' },
  { href: 'returns', label: 'Returns', icon: RotateCcw, permission: 'orders.read' },
  { href: 'refunds', label: 'Refunds', icon: RotateCcw, permission: 'orders.read' },
  { href: 'payments', label: 'Payments', icon: CreditCard, permission: 'orders.read' },
  { href: 'shipping', label: 'Shipping', icon: Truck, permission: 'settings.read' },
  { href: 'taxes', label: 'Taxes', icon: FileText, permission: 'settings.read' },
  { href: 'media', label: 'Media', icon: ImageIcon, permission: 'settings.read' },
  { href: 'notifications', label: 'Notifications', icon: Bell, permission: 'settings.read' },
  { href: 'analytics', label: 'Analytics', icon: LineChart, permission: 'analytics.read' },
  { href: 'admins', label: 'Admins', icon: UserCog, permission: 'admins.manage' },
  { href: 'roles', label: 'Roles', icon: ShieldAlert, permission: 'roles.manage' },
  { href: 'audit-logs', label: 'Audit Logs', icon: FileText, permission: 'audit.read' },
  { href: 'settings', label: 'Settings', icon: Settings, permission: 'settings.read' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const identity = useQuery({ 
    queryKey: ['auth', 'me'], 
    queryFn: () => api<{ user: { roles: string[]; permissions: string[] } }>('/auth/me') 
  });

  if (identity.isLoading) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
        <p className="text-sm font-medium text-muted-foreground tracking-wide">
          Verifying administrative credentials…
        </p>
      </main>
    );
  }

  const user = identity.data?.user;
  if (identity.error || !user || (!user.roles.includes('ADMIN') && !user.roles.includes('SUPER_ADMIN'))) {
    return (
      <main className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Access Restricted</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
          Your account is authenticated but does not possess the requisite administrative privileges.
        </p>
        <Link 
          href="/" 
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold tracking-wide text-primary-foreground hover:bg-primary/90 transition-all"
        >
          Return to Storefront
        </Link>
      </main>
    );
  }

  const visibleNav = nav.filter((item) => 
    user.roles.includes('SUPER_ADMIN') || user.permissions.includes(item.permission)
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full flex-col bg-[#f5f3ee] md:flex-row">
      {/* Desktop Luxury Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-surface md:flex md:flex-col justify-between overflow-y-auto">
        <div className="p-5">
          {/* Admin Header & Store Status */}
          <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-semibold tracking-tight text-foreground">
                  burujan<span className="text-accent">.</span>
                </span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                  Admin
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>Live Environment</span>
              </div>
            </div>

            <Link
              href="/"
              target="_blank"
              title="View storefront"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-0.5">
            {visibleNav.map((item) => {
              const href = `/admin${item.href ? `/${item.href}` : ''}`;
              const isActive = pathname === href || (item.href !== '' && pathname?.startsWith(href + '/'));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'text-background' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer in Sidebar */}
        <div className="border-t border-border/70 p-4">
          <div className="rounded-xl bg-secondary/50 p-3 flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Signed in as
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {user.roles.includes('SUPER_ADMIN') ? 'Super Admin' : 'Store Admin'}
              </p>
            </div>
            <Link
              href="/account"
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              Account
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation Scroller */}
      <nav
        className="flex w-full gap-1.5 overflow-x-auto border-b border-border/80 bg-surface/90 p-3 backdrop-blur-md md:hidden"
        aria-label="Administration"
      >
        {visibleNav.map((item) => {
          const href = `/admin${item.href ? `/${item.href}` : ''}`;
          const isActive = pathname === href || (item.href !== '' && pathname?.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-foreground text-background font-semibold shadow-sm'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mx-auto w-full max-w-6xl"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
