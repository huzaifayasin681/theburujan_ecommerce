'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { getProductImageUrl } from '@/lib/dummy-images';

type MinimalProduct = { slug: string; name: string; price: string; image?: string };

export function RecentlyViewed({ current }: { current: MinimalProduct }) {
  const [history, setHistory] = useState<MinimalProduct[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      const items: MinimalProduct[] = stored ? JSON.parse(stored) : [];
      
      const filtered = items.filter(i => i.slug !== current.slug);
      setHistory(filtered.slice(0, 4));

      filtered.unshift(current);
      localStorage.setItem('recentlyViewed', JSON.stringify(filtered.slice(0, 10)));
    } catch (e) {
      console.warn('Could not read/write recently viewed history', e);
    }
  }, [current.slug, current.name, current.price, current.image]);

  if (history.length === 0) return null;

  return (
    <div className="mt-20 pt-16 border-t border-border/80">
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="eyebrow flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            Previous Attention
          </span>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-foreground mt-2">
            Recently Viewed
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {history.map((p) => {
          const imgUrl = getProductImageUrl(p.image, p.slug || p.name);
          return (
            <Link href={`/products/${p.slug}`} key={p.slug} className="group flex flex-col gap-3">
              <div className="relative aspect-[4/5] rounded-[1.6rem] bg-[#edeae1] overflow-hidden shadow-sm transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-md">
                <Image 
                  src={imgUrl} 
                  alt={p.name} 
                  fill 
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108" 
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized={imgUrl.includes('unsplash.com')}
                />
                <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
                  <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
                </div>
              </div>
              <div className="flex flex-col gap-1 px-1">
                <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-1 transition-colors group-hover:text-accent">
                  {p.name}
                </h3>
                <p className="text-xs font-bold text-foreground font-sans">{p.price}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
