'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShoppingBag, 
  Heart, 
  X, 
  User, 
  Package, 
  LogOut, 
  Sparkles, 
  ArrowUpRight,
  ArrowRight,
  Settings,
  Menu,
  Loader2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type CartResponse = {
  items: Array<{ id: string; quantity: number }>;
};

type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

const navItems = [
  { label: "Shop All", href: "/shop" },
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Best Sellers", href: "/shop?sort=best-selling" },
  { label: "Our Story", href: "/about" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setSearchFocused(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
      if (
        profileContainerRef.current && 
        !profileContainerRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: cart } = useQuery<CartResponse>({
    queryKey: ["cart"],
    queryFn: async () => {
      try {
        return await api<CartResponse>("/cart");
      } catch {
        try {
          return await api<CartResponse>("/guest-cart");
        } catch {
          return { items: [] };
        }
      }
    },
    staleTime: 1000 * 20,
  });

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ["account", "profile"],
    queryFn: async () => {
      try {
        return await api<Profile>("/account/profile");
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60,
  });

  const cartCount = cart?.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  // Real user display name, initials & avatar
  const isLoggedIn = Boolean(profile?.firstName || profile?.email);
  const displayName = profile?.firstName 
    ? `${profile.firstName} ${profile.lastName || ""}`.trim() 
    : "Sign In";
  const initials = profile?.firstName 
    ? `${profile.firstName.charAt(0)}${profile.lastName ? profile.lastName.charAt(0) : ''}`.toUpperCase() 
    : 'U';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Idempotent
    }
    queryClient.setQueryData(['account', 'profile'], null);
    queryClient.invalidateQueries();
    setProfileOpen(false);
    setLoggingOut(false);
    toast.success('Signed out', 'You have been signed out successfully.');
    window.location.href = '/';
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchFocused(false);
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/shop");
    }
  };

  if (pathname?.startsWith("/checkout") || pathname?.startsWith("/admin")) return null;

  return (
    <>
      {/* Top Luxury Announcement Bar */}
      <div className="relative z-50 overflow-hidden bg-[#141b18] px-4 py-2 text-center text-[#f7f5f0] border-b border-white/[0.08]">
        <div className="flex items-center justify-center gap-2.5 text-[10.5px] font-medium tracking-[0.2em] uppercase">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="text-white/90">Complimentary delivery on orders over $150</span>
          <span className="text-white/30 hidden sm:inline">·</span>
          <span className="text-white/70 hidden sm:inline">30-day effortless returns</span>
        </div>
      </div>

      {/* Floating Pill Header matching mockup styling with real store content */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full transition-all duration-300 ease-out",
          isScrolled
            ? "bg-background/85 backdrop-blur-xl py-2.5 sm:py-3 shadow-[0_6px_25px_rgba(20,27,24,0.05)]"
            : "bg-transparent py-3 sm:py-4"
        )}
      >
        <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-4 md:gap-5">
          
          {/* Main Capsule: Store Logo + Navigation Links + Search */}
          <div 
            ref={searchContainerRef}
            className="relative flex-1 max-w-4xl"
          >
            <div className="group relative flex h-13 sm:h-14 lg:h-[3.75rem] items-center justify-between rounded-full bg-white px-3.5 sm:px-5 sm:pr-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-stone-200/70 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)]">
              
              {/* Actual Store Brand Logo: The Burujan */}
              <Link 
                href="/" 
                className="flex items-center shrink-0 pr-2 lg:pr-4 py-1"
                aria-label="The Burujan Home"
              >
                <Image
                  src="/logo.png"
                  alt="The Burujan"
                  width={150}
                  height={44}
                  priority
                  className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 hover:scale-[1.02]"
                />
              </Link>

              {/* Real Store Navigation Links on Desktop */}
              <nav 
                className="hidden lg:flex items-center gap-1 xl:gap-2 mr-2"
                aria-label="Primary navigation"
              >
                {navItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && !item.href.includes("?") && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative px-3 py-1.5 text-xs xl:text-[12.5px] font-medium uppercase tracking-[0.14em] transition-all rounded-full duration-200",
                        isActive
                          ? "text-stone-900 font-semibold bg-stone-100"
                          : "text-stone-600 hover:text-stone-950 hover:bg-stone-50"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Integrated Search Input */}
              <form 
                onSubmit={handleSearchSubmit} 
                className="flex-1 flex items-center min-w-0 mx-2 sm:mx-3"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search products..."
                  className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-0 px-1 sm:px-2 py-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>

              {/* Solid Black Circular Search Action Button */}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                aria-label="Search products"
                className="shrink-0 w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-neutral-800 active:scale-95 transition-all duration-200 shadow-sm cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </button>
            </div>

            {/* Quick Search Suggestions Popover */}
            <AnimatePresence>
              {searchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute left-0 right-0 top-full mt-2.5 z-50 overflow-hidden rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-accent" />
                      Popular In The Burujan
                    </span>
                    <button 
                      onClick={() => setSearchFocused(false)}
                      className="text-stone-400 hover:text-stone-600 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Ceramics", "Vases", "Lighting", "Linen", "New Arrivals", "Best Sellers"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setSearchQuery(item);
                          router.push(`/shop?search=${encodeURIComponent(item)}`);
                          setSearchFocused(false);
                        }}
                        className="rounded-full bg-stone-100/80 px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-black hover:text-white transition-all cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span>Explore all considered goods</span>
                    <Link 
                      href="/shop" 
                      onClick={() => setSearchFocused(false)}
                      className="font-medium text-stone-900 hover:text-accent flex items-center gap-1 transition-colors"
                    >
                      Shop All <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Floating Elements (Shopping Bag, Wishlist, Account) */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-3.5 shrink-0">
            
            {/* 1. Floating Shopping Bag Circle Button */}
            <Link
              href="/cart"
              aria-label="Shopping Cart"
              className="group relative flex h-11 w-11 sm:h-13 sm:w-13 lg:h-[3.75rem] lg:w-[3.75rem] items-center justify-center rounded-full bg-white text-stone-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-stone-200/70 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-105 active:scale-95"
            >
              <ShoppingBag className="h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2] transition-transform duration-200 group-hover:scale-110" />
              
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] sm:text-[11px] font-bold text-white shadow-sm ring-2 ring-white"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* 2. Floating Wishlist Heart Circle Button (Red Heart) */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="group flex h-11 w-11 sm:h-13 sm:w-13 lg:h-[3.75rem] lg:w-[3.75rem] items-center justify-center rounded-full bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-stone-200/70 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-105 active:scale-95"
            >
              <Heart className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[#f43f5e] fill-[#f43f5e] transition-transform duration-200 group-hover:scale-110" />
            </Link>

            {/* 3. Floating User Account Pill Button */}
            <div ref={profileContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-label="User account"
                className="group flex h-11 sm:h-13 lg:h-[3.75rem] items-center gap-2 sm:gap-2.5 rounded-full bg-white pl-3.5 sm:pl-5 pr-1.5 sm:pr-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-stone-200/70 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {/* Account / User Name */}
                <span className="hidden sm:inline text-xs sm:text-sm font-semibold tracking-tight text-stone-900 whitespace-nowrap">
                  {isLoggedIn ? displayName : "Sign In"}
                </span>

                {/* Avatar / User Icon */}
                <div className="relative h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 overflow-hidden rounded-full ring-2 ring-stone-100 shadow-xs shrink-0 bg-stone-100 flex items-center justify-center">
                  {profile?.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={displayName}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized={profile.avatarUrl.includes('unsplash.com')}
                    />
                  ) : isLoggedIn ? (
                    <span className="font-serif text-xs font-bold text-stone-800 select-none">
                      {initials}
                    </span>
                  ) : (
                    <User className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-stone-700" />
                  )}
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2.5 z-50 w-64 overflow-hidden rounded-3xl border border-stone-200/90 bg-white/98 p-3 shadow-2xl backdrop-blur-xl"
                  >
                    {isLoggedIn ? (
                      /* Logged In Customer State */
                      <>
                        <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-100 mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 bg-stone-200 flex items-center justify-center ring-2 ring-white">
                              {profile?.avatarUrl ? (
                                <Image
                                  src={profile.avatarUrl}
                                  alt={displayName}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                  unoptimized={profile.avatarUrl.includes('unsplash.com')}
                                />
                              ) : (
                                <span className="font-serif text-xs font-bold text-stone-800">
                                  {initials}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900 truncate">
                                {displayName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {profile?.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="py-1 grid gap-0.5">
                          <Link
                            href="/account"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <User className="h-4 w-4 text-stone-400" />
                            Client Dashboard
                          </Link>

                          <Link
                            href="/account/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <Settings className="h-4 w-4 text-stone-400" />
                            Profile & Photo
                          </Link>

                          <Link
                            href="/account/orders"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <Package className="h-4 w-4 text-stone-400" />
                            Orders & Tracking
                          </Link>

                          <Link
                            href="/wishlist"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <Heart className="h-4 w-4 text-stone-400" />
                            Saved Wishlist
                          </Link>

                          <Link
                            href="/shop"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <ShoppingBag className="h-4 w-4 text-stone-400" />
                            Shop Collection
                          </Link>
                        </div>

                        <div className="pt-2 mt-1 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left disabled:opacity-60"
                          >
                            {loggingOut ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <LogOut className="h-4 w-4 text-red-500" />
                            )}
                            <span>{loggingOut ? "Signing out…" : "Sign Out"}</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Guest Visitor State */
                      <>
                        <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-100 mb-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 bg-white px-2 py-0.5 rounded-full border border-stone-200/60 mb-1.5">
                            <Sparkles className="h-2.5 w-2.5 text-accent" />
                            Guest Visitor
                          </span>
                          <p className="text-xs font-semibold text-stone-900">
                            Welcome to The Burujan
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Sign in to track orders & manage your wishlist
                          </p>

                          <Link
                            href={`/login?returnTo=${encodeURIComponent(pathname || '/')}`}
                            onClick={() => setProfileOpen(false)}
                            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-stone-800 transition-all shadow-xs"
                          >
                            <span>Sign In</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>

                          <div className="mt-2 text-[11px] text-muted-foreground">
                            New client?{" "}
                            <Link
                              href="/register"
                              onClick={() => setProfileOpen(false)}
                              className="font-semibold text-stone-900 underline hover:text-stone-700"
                            >
                              Register here
                            </Link>
                          </div>
                        </div>

                        <div className="py-1 grid gap-0.5 border-t border-stone-100">
                          <Link
                            href={`/login?returnTo=${encodeURIComponent('/account/orders')}`}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <Package className="h-4 w-4 text-stone-400" />
                            Track an Order
                          </Link>

                          <Link
                            href="/wishlist"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <Heart className="h-4 w-4 text-stone-400" />
                            Saved Wishlist
                          </Link>

                          <Link
                            href="/shop"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition-colors"
                          >
                            <ShoppingBag className="h-4 w-4 text-stone-400" />
                            Shop Curated Pieces
                          </Link>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Hamburger Drawer Trigger */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                aria-label="Navigation menu"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-stone-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-stone-200/70 hover:shadow-md transition-all active:scale-95"
              >
                {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 top-24 z-30 bg-black/25 backdrop-blur-sm lg:hidden"
              />

              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative z-40 mx-4 mt-2 overflow-hidden rounded-3xl border border-stone-200/80 bg-white/95 px-6 py-5 shadow-2xl backdrop-blur-xl lg:hidden"
              >
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-accent" />
                    The Burujan Collections
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full p-1 text-stone-400 hover:text-stone-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="mt-3 grid gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors"
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight className="h-4 w-4 text-stone-400" />
                    </Link>
                  ))}

                  <div className="my-2 border-t border-stone-100" />

                  {isLoggedIn ? (
                    <>
                      <div className="px-3.5 py-2.5 mb-1 flex items-center gap-3 bg-stone-50 rounded-2xl border border-stone-100">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-stone-200 shrink-0 flex items-center justify-center font-serif text-xs font-bold text-stone-700">
                          {profile?.avatarUrl ? (
                            <Image
                              src={profile.avatarUrl}
                              alt={displayName}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-stone-900 truncate">{displayName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{profile?.email}</p>
                        </div>
                      </div>

                      <Link
                        href="/account"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <User className="h-4 w-4 text-stone-400" />
                          Client Dashboard
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-stone-400" />
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Package className="h-4 w-4 text-stone-400" />
                          Orders & Tracking
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-stone-400" />
                      </Link>

                      <Link
                        href="/account/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Settings className="h-4 w-4 text-stone-400" />
                          Profile & Photo
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-stone-400" />
                      </Link>

                      <Link
                        href="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Heart className="h-4 w-4 text-stone-400" />
                          Saved Wishlist
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-stone-400" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        disabled={loggingOut}
                        className="w-full mt-1 flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer disabled:opacity-60"
                      >
                        <span className="flex items-center gap-2.5">
                          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <LogOut className="h-4 w-4 text-red-500" />}
                          {loggingOut ? "Signing out…" : "Sign Out"}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/login?returnTo=${encodeURIComponent(pathname || '/')}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white hover:bg-stone-800 transition-all shadow-xs my-1"
                      >
                        <span className="flex items-center gap-2.5">
                          <User className="h-4 w-4 text-stone-300" />
                          Sign In / Register
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>

                      <Link
                        href="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Heart className="h-4 w-4 text-stone-400" />
                          Saved Wishlist
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-stone-400" />
                      </Link>
                    </>
                  )}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}