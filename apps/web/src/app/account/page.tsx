import Link from 'next/link';
import { 
  Package, 
  User, 
  MapPin, 
  Heart, 
  Star, 
  RotateCcw, 
  ShieldCheck, 
  ChevronRight, 
  Bell, 
  TicketPercent, 
  Sparkles 
} from 'lucide-react';
import { SignOutButton } from '@/components/sign-out-button';

const links = [
  { label: 'Orders', href: '/account/orders', icon: Package, description: 'Track shipments, view receipts, or reorder favorites' },
  { label: 'Profile', href: '/account/profile', icon: User, description: 'Manage your personal details, email, and preferences' },
  { label: 'Addresses', href: '/account/addresses', icon: MapPin, description: 'Manage delivery addresses and billing destinations' },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart, description: 'View and manage items saved for future rituals' },
  { label: 'Reviews', href: '/account/reviews', icon: Star, description: 'Share your feedback and manage published reviews' },
  { label: 'Returns', href: '/account/returns', icon: RotateCcw, description: 'Initiate or track status of merchandise returns' },
  { label: 'Refunds', href: '/account/refunds', icon: RotateCcw, description: 'Review transaction refunds and store credits' },
  { label: 'Coupons', href: '/account/coupons', icon: TicketPercent, description: 'View active discount codes and order savings' },
  { label: 'Notifications', href: '/account/notifications', icon: Bell, description: 'Review shipping notifications and updates' },
  { label: 'Security', href: '/account/security', icon: ShieldCheck, description: 'Configure two-factor auth and update passwords' }
] as const;

export default function Account() {
  return (
    <div className="container py-12 md:py-20 max-w-6xl">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/80 pb-8 mb-10 gap-6">
        <div>
          <span className="eyebrow flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            Client Portal
          </span>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground">
            Your Account
          </h1>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-lg">
            Manage your orders, saved pieces, delivery addresses, and personal security settings.
          </p>
        </div>
        <SignOutButton className="self-start sm:self-auto rounded-full border border-border/80 hover:bg-secondary/70 transition-all text-xs font-semibold px-5 py-2.5" />
      </div>
      
      {/* Navigation Card Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ label, href, icon: Icon, description }) => (
          <Link 
            key={href} 
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-surface p-7 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_12px_32px_rgba(23,32,28,0.06)]" 
            href={href}
          >
            {/* Top Row: Icon + Arrow */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/80 text-foreground transition-all duration-300 group-hover:scale-105 group-hover:bg-foreground group-hover:text-background">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition-all duration-300 group-hover:bg-secondary group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
            </div>

            {/* Bottom Row: Text */}
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight mb-1 group-hover:text-accent transition-colors">
                {label}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Mobile Sign Out */}
      <div className="mt-12 sm:hidden border-t border-border pt-8 flex justify-center">
        <SignOutButton className="w-full justify-center rounded-full border border-border py-3 text-sm font-semibold text-muted-foreground" />
      </div>
    </div>
  );
}
