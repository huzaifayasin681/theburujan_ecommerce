'use client';

import Link from 'next/link';
import { NewsletterForm } from './newsletter-form';
import { usePathname } from 'next/navigation';
import { Instagram, Twitter, Facebook, ArrowUpRight, Sparkles } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/checkout') || pathname?.startsWith('/admin')) return null;

  return (
    <footer className="mt-auto bg-[#0f1612] text-[#f7f5f0] border-t border-white/[0.08]">
      <div className="container py-16 md:py-24">
        {/* Top Grid */}
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <Link 
              href="/" 
              className="group font-serif text-3xl font-medium tracking-[-0.04em] text-white flex items-baseline"
            >
              <span>burujan</span>
              <span className="text-accent font-serif text-4xl leading-none transition-transform duration-300 group-hover:scale-125">
                .
              </span>
            </Link>

            <p className="mt-5 text-white/70 text-sm leading-relaxed max-w-sm font-light">
              Considered objects created for calm spaces and daily rituals. Designed with intention, sourced with integrity, and made to last for generations.
            </p>

            {/* Social Icons */}
            <div className="mt-8 flex items-center gap-3">
              {[
                { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
                { icon: Twitter, label: 'Twitter', href: 'https://twitter.com' },
                { icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/75 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-white/40 hover:bg-white/[0.15] hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Nav Links Column */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8 text-sm">
            <div className="flex flex-col gap-3.5">
              <h4 className="font-semibold uppercase tracking-[0.2em] text-[11px] text-[#f7d8c8]">
                Company
              </h4>
              <Link 
                href="/about" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>About Our Craft</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
              <Link 
                href="/shop" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>The Collection</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
              <Link 
                href="/contact" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>Concierge & Contact</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
              <Link 
                href="/faq" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>Frequently Asked</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              <h4 className="font-semibold uppercase tracking-[0.2em] text-[11px] text-[#f7d8c8]">
                Client Service
              </h4>
              <Link 
                href="/shipping-policy" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>Complimentary Shipping</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
              <Link 
                href="/return-policy" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>30-Day Returns</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
              <Link 
                href="/privacy" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>Privacy & Discretion</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
              <Link 
                href="/terms" 
                className="group flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              >
                <span>Terms of Service</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-accent" />
              </Link>
            </div>
          </div>
          
          {/* Newsletter Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <span className="eyebrow text-[#f7d8c8] flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent" />
              The Burujan Journal
            </span>
            <h4 className="font-serif text-2xl font-normal text-white">
              Quiet notes on intentional living.
            </h4>
            <p className="text-white/70 text-xs sm:text-sm leading-relaxed font-light">
              Receive private previews of limited seasonal releases and stories of craft.
            </p>
            <div className="mt-2">
              <NewsletterForm />
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Burujan Commerce Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 font-mono text-[11px] text-white/40">
            <span>Crafted with consideration</span>
            <span>·</span>
            <span>Worldwide Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
