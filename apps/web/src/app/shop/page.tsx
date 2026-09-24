import Link from 'next/link';
import type { Paginated, ProductListItem } from '@burujan/types';
import { ProductCard } from '@/components/product-card';
import { serverApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronRight, Sparkles, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Shop the Collection' };
export const dynamic = 'force-dynamic';

export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) if (value) params.set(key, value);
  
  let result: Paginated<ProductListItem> = {
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
  
  try {
    result = await serverApi(`/products?${params}`);
  } catch { 
    result = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }; 
  }
  const categories = await serverApi<{ id: string; name: string; slug: string }[]>('/categories').catch(() => []);
  const pageHref = (page: number) => { 
    const next = new URLSearchParams(params); 
    next.set('page', String(page)); 
    return `/shop?${next.toString()}`; 
  };

  const activeCategory = q.category;

  return (
    <div className="container py-8 md:py-14 max-w-7xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 mx-2 text-muted-foreground/60 shrink-0" />
        <span className="text-foreground">Collection</span>
        {activeCategory && (
          <>
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-muted-foreground/60 shrink-0" />
            <span className="text-foreground font-semibold">
              {categories.find(c => c.slug === activeCategory)?.name || activeCategory}
            </span>
          </>
        )}
      </nav>

      {/* Editorial Shop Header Banner */}
      <div className="relative mb-12 overflow-hidden rounded-[2.5rem] bg-[#111915] px-8 py-14 text-white sm:px-14 md:py-18 shadow-2xl ring-1 ring-white/10">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f7d8c8] backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-accent animate-pulse" />
            Curated Catalogue
          </span>
          <h1 className="mt-5 font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-white leading-[1.02]">
            Shop the Collection<span className="text-accent font-serif">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-white/80 font-light">
            Considered objects designed for everyday rituals, lasting quality, and mindful spaces.
          </p>
        </div>

        {/* Ambient Glow Orbs */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#bd6445]/20 blur-3xl" />
        <div className="absolute -bottom-20 right-40 h-80 w-80 rounded-full bg-[#273d31]/30 blur-3xl" />
      </div>

      {/* Category Horizontal Filter Pills */}
      {categories.length > 0 && (
        <div className="mb-10 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Link
            href="/shop"
            className={cn(
              'whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200',
              !activeCategory 
                ? 'bg-foreground text-background shadow-sm' 
                : 'border border-border/80 bg-surface text-foreground/80 hover:bg-secondary hover:text-foreground'
            )}
          >
            All Pieces ({result.meta.total})
          </Link>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className={cn(
                  'whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200',
                  isSelected 
                    ? 'bg-foreground text-background shadow-sm' 
                    : 'border border-border/80 bg-surface text-foreground/80 hover:bg-secondary hover:text-foreground'
                )}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      )}
      
      <div className="flex flex-col gap-10 lg:flex-row items-start">
        {/* Sidebar / Filters (Desktop) */}
        <aside className="w-full shrink-0 lg:w-64 rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
          <form className="flex flex-col gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Search</h3>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9.5 h-11 rounded-xl border-border bg-secondary/30 focus-visible:ring-accent"
                  name="search"
                  defaultValue={q.search}
                  placeholder="Keywords…"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Order By</h3>
              <div className="relative">
                <select 
                  className="flex h-11 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent appearance-none text-foreground" 
                  name="sort" 
                  defaultValue={q.sort || "newest"}
                >
                  <option value="featured">Featured Selection</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center">
                  <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-full text-xs font-semibold tracking-wider uppercase">
              Update Results
            </Button>
            
            {(q.search || q.sort || q.category) && (
              <Button type="button" variant="outline" asChild className="w-full h-10 rounded-full text-xs font-medium">
                <Link href="/shop" className="flex items-center justify-center gap-1.5">
                  <X className="h-3.5 w-3.5" />
                  Reset Filters
                </Link>
              </Button>
            )}
          </form>
          
          <div className="mt-8 border-t border-border/70 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Collections
            </h3>
            <ul className="space-y-2 text-xs">
              {categories.slice(0, 10).map((category) => (
                <li key={category.id}>
                  <Link 
                    href={`/shop?category=${category.slug}`} 
                    className={cn(
                      'block py-1.5 transition-colors',
                      activeCategory === category.slug 
                        ? 'font-bold text-accent' 
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        
        {/* Product Grid Area */}
        <div className="flex-1 w-full">
          <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Displaying <span className="font-bold text-foreground font-mono">{result.data.length}</span> of <span className="font-bold text-foreground font-mono">{result.meta.total}</span> pieces
            </p>
          </div>

          {result.data.length ? (
            <div className="grid-products">
              {result.data.map((p, idx) => (
                <ProductCard key={p.id} product={p} index={idx} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[25rem] flex-col items-center justify-center rounded-[2.5rem] border border-border/80 bg-surface p-12 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-5 text-muted-foreground">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-3xl font-medium tracking-tight mb-2 text-foreground">
                No matching pieces found
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
                We couldn't locate any products matching your current criteria. Consider clearing your filters.
              </p>
              <Button variant="default" asChild className="rounded-full px-8 h-12 text-xs font-semibold tracking-wider uppercase">
                <Link href="/shop">View Full Collection</Link>
              </Button>
            </div>
          )}
          
          {/* Pagination */}
          {result.meta.totalPages > 1 && (
            <div className="mt-16 flex items-center justify-center gap-3">
              <Button 
                variant="outline" 
                asChild 
                disabled={result.meta.page <= 1}
                className="rounded-full h-11 px-5 text-xs font-semibold"
              >
                <Link href={pageHref(Math.max(1, result.meta.page - 1))} className="flex items-center gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Link>
              </Button>

              <span className="text-xs font-mono font-semibold px-4 text-muted-foreground">
                Page {result.meta.page} of {result.meta.totalPages}
              </span>

              <Button 
                variant="outline" 
                asChild 
                disabled={result.meta.page >= result.meta.totalPages}
                className="rounded-full h-11 px-5 text-xs font-semibold"
              >
                <Link href={pageHref(Math.min(result.meta.totalPages, result.meta.page + 1))} className="flex items-center gap-1.5">
                  <span>Next</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
