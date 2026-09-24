'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ProductListItem } from '@burujan/types';
import { ArrowUpRight, Heart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { getProductImageUrl } from '@/lib/dummy-images';

export function ProductCard({ 
  product, 
  className,
  index = 0,
}: { 
  product: ProductListItem; 
  className?: string;
  index?: number;
}) {
  const price = product.salePrice ?? product.basePrice;
  const hasDiscount = Boolean(product.salePrice && Number(product.salePrice) < Number(product.basePrice));
  const discount = hasDiscount 
    ? Math.round((1 - Number(product.salePrice) / Number(product.basePrice)) * 100) 
    : 0;
  
  const imageUrl = getProductImageUrl(product.featuredImage, product.slug || product.name);

  const money = (value: string) => 
    new Intl.NumberFormat('en', { style: 'currency', currency: product.currency }).format(Number(value));

  return (
    <motion.article 
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ 
        duration: 0.5, 
        delay: Math.min((index % 4) * 0.09, 0.35), 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={cn('group relative flex flex-col min-w-0', className)}
    >
      {/* Product Image Frame */}
      <div className="relative overflow-hidden rounded-[1.6rem] bg-[#edeae1] shadow-[0_4px_24px_rgba(23,32,28,0.04)] transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_20px_45px_-12px_rgba(23,32,28,0.14)]">
        <Link 
          href={`/products/${product.slug}`} 
          className="relative block aspect-[4/5] overflow-hidden" 
          aria-label={`View ${product.name}`}
        >
          <Image 
            src={imageUrl} 
            alt={product.featuredImage?.altText ?? product.name} 
            fill 
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108" 
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={imageUrl.includes('unsplash.com')}
          />

          {/* Vignette Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Top Badges */}
          <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1.5">
            {hasDiscount ? (
              <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                -{discount}%
              </span>
            ) : (
              <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground shadow-sm backdrop-blur-md">
                Curated
              </span>
            )}
          </div>

          {/* Floating Wishlist Button */}
          <button 
            type="button"
            aria-label="Add to wishlist"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:text-accent active:scale-95 group-hover:opacity-100" 
          >
            <Heart className="h-4 w-4" />
          </button>

          {/* Quick Action Button (Slides Up on Hover) */}
          <div className="absolute bottom-4 inset-x-4 flex translate-y-3 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <span className="flex w-full items-center justify-center gap-2 rounded-full bg-white/95 py-3 px-4 text-xs font-bold uppercase tracking-wider text-foreground shadow-xl backdrop-blur-md transition-transform duration-200 hover:bg-white hover:scale-[1.02] active:scale-[0.98]">
              <span>View Piece</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
            </span>
          </div>
        </Link>
      </div>

      {/* Product Details */}
      <div className="pt-4 px-1 flex flex-col flex-1">
        {/* Brand & Rating */}
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow truncate text-[9.5px]">
            {product.brand?.name ?? 'Burujan Collection'}
          </p>
          {Number(product.averageRating) > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span>{Number(product.averageRating).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Product Title */}
        <Link href={`/products/${product.slug}`} className="mt-1.5 block">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-accent">
            {product.name}
          </h3>
        </Link>

        {/* Price & Stock Status */}
        <div className="mt-auto pt-2.5 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-sm font-bold tracking-tight', hasDiscount ? 'text-accent' : 'text-foreground')}>
              {money(price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground/80 line-through">
                {money(product.basePrice)}
              </span>
            )}
          </div>

          {/* Stock Indicator */}
          <div className="flex items-center gap-1 text-[11px]">
            <span 
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                product.inStock ? 'bg-emerald-500' : 'bg-muted-foreground/50'
              )} 
            />
            <span className="text-muted-foreground text-[10.5px]">
              {product.inStock ? 'In stock' : 'Waitlist'}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
