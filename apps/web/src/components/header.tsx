'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, ShoppingBag, UserRound, X, Heart, ArrowUpRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type CartResponse = {
  items: Array<{ id: string; quantity: number }>;
};

const navItems = [
  { label: 'Shop All', href: '/shop' },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Best Sellers', href: '/shop?sort=best-selling' },
  { label: 'Our Story', href: '/about' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Monitor scroll for glass / sticky transitions
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Query cart items count for dynamic badge
  const { data: cart } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        return await api<CartResponse>('/cart');
      } catch {
        try {
          return await api<CartResponse>('/guest-cart');
        } catch {
          return { items: [] };
        }
      }
    },
    staleTime: 1000 * 20,
  });

  const cartCount = cart?.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

  if (pathname?.startsWith('/checkout')) return null;

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <div className="relative z-50 overflow-hidden bg-[#141b18] px-4 py-2.5 text-center text-[#f7f5f0] border-b border-white/[0.08]">
        <div className="flex items-center justify-center gap-2.5 text-[10.5px] font-medium tracking-[0.24em] uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-white/90">Complimentary delivery on orders over $150</span>
          <span className="text-white/30 hidden sm:inline">·</span>
          <span className="text-white/70 hidden sm:inline">30-day effortless returns</span>
        </div>
      </div>

      {/* Sticky Glass Navbar */}
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-300 ease-out',
          isScrolled
            ? 'border-b border-border/80 bg-background/80 shadow-[0_10px_35px_-10px_rgba(23,32,28,0.06)] backdrop-blur-2xl'
            : 'border-b border-border/40 bg-background/60 backdrop-blur-md'
        )}
      >
        <div
          className={cn(
            'container flex items-center justify-between gap-6 transition-all duration-300',
            isScrolled ? 'h-16 lg:h-[4.25rem]' : 'h-[4.5rem] lg:h-20'
          )}
        >
          {/* Mobile menu trigger & brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-foreground/5 active:scale-95 transition-transform"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link
              href="/"
              className="font-serif text-2xl font-normal tracking-[-0.04em] transition-opacity hover:opacity-90"
            >
              burujan<span className="text-accent font-serif font-light text-2xl">.</span>
            </Link>
          </div>

          {/* Desktop Brand Logo */}
          <Link
            href="/"
            className="group hidden font-serif text-[1.85rem] font-normal tracking-[-0.04em] text-foreground transition-opacity hover:opacity-90 lg:flex lg:items-baseline"
          >
            <span>burujan</span>
            <span className="inline-block text-accent font-serif text-3xl font-light leading-none transition-transform duration-300 group-hover:scale-125">
              .
            </span>
          </Link>

          {/* Desktop Nav Links with smooth sliding indicator */}
          <nav
            className="hidden items-center gap-1.5 lg:flex"
            aria-label="Primary navigation"
            onMouseLeave={() => setHoveredPath(null)}
          >
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && !item.href.includes('?') && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredPath(item.href)}
                  className={cn(
                    'relative px-4 py-2 text-[12.5px] font-medium uppercase tracking-[0.14em] transition-colors duration-200',
                    isActive ? 'text-foreground font-semibold' : 'text-foreground/70 hover:text-foreground'
                  )}
                >
                  <span className="relative z-10">{item.label}</span>

                  {/* Soft Background Pill on Hover */}
                  {hoveredPath === item.href && (
                    <motion.span
                      layoutId="navbar-hover-pill"
                      className="absolute inset-0 z-0 rounded-full bg-foreground/[0.04]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Smooth Hover Underline */}
                  {hoveredPath === item.href && (
                    <motion.span
                      layoutId="navbar-hover-underline"
                      className="absolute bottom-1 left-4 right-4 z-10 h-[1.5px] rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Active dot indicator when not hovering */}
                  {isActive && hoveredPath !== item.href && (
                    <motion.span
                      layoutId="navbar-active-dot"
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search products"
              asChild
              className="h-10 w-10 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/[0.06] active:scale-95 transition-all"
            >
              <Link href="/search">
                <Search className="h-[1.15rem] w-[1.15rem]" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Wishlist"
              asChild
              className="hidden sm:inline-flex h-10 w-10 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/[0.06] active:scale-95 transition-all"
            >
              <Link href="/wishlist">
                <Heart className="h-[1.15rem] w-[1.15rem]" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Account"
              asChild
              className="hidden sm:inline-flex h-10 w-10 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/[0.06] active:scale-95 transition-all"
            >
              <Link href="/account">
                <UserRound className="h-[1.15rem] w-[1.15rem]" />
              </Link>
            </Button>

            {/* Cart with animated badge */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Shopping Cart"
              asChild
              className="relative h-10 w-10 rounded-full text-foreground/80 hover:text-foreground hover:bg-foreground/[0.06] active:scale-95 transition-all"
            >
              <Link href="/cart" className="relative">
                <ShoppingBag className="h-[1.15rem] w-[1.15rem]" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="absolute -top-1 -right-1 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background"
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer with Framer Motion */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 top-[calc(4.5rem+36px)] z-30 bg-black/30 backdrop-blur-sm lg:hidden"
              />

              {/* Menu content */}
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-40 overflow-hidden border-t border-border bg-surface/95 px-6 py-6 shadow-2xl backdrop-blur-2xl lg:hidden"
              >
                <div className="flex items-center justify-between pb-2">
                  <p className="eyebrow flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-accent" />
                    Explore Collections
                  </p>
                  <button
                    aria-label="Close menu"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="mt-4 grid gap-1.5">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.05, duration: 0.2 }}
                    >
                      <Link
                        onClick={() => setMobileMenuOpen(false)}
                        href={item.href}
                        className="group flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-foreground hover:bg-secondary/70 transition-colors"
                      >
                        <span>{item.label}</span>
                        <ArrowUpRight className="h-4 w-4 text-accent transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </motion.div>
                  ))}

                  <div className="my-2 border-t border-border/70" />

                  <Link
                    onClick={() => setMobileMenuOpen(false)}
                    href="/account"
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-foreground/80 hover:bg-secondary/70 hover:text-foreground transition-colors"
                  >
                    <span>Your Account</span>
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </Link>

                  <Link
                    onClick={() => setMobileMenuOpen(false)}
                    href="/wishlist"
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-foreground/80 hover:bg-secondary/70 hover:text-foreground transition-colors"
                  >
                    <span>Saved Wishlist</span>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
