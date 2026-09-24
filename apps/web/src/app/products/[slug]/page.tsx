import { RecentlyViewed } from '@/components/recently-viewed';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api';
import { AddToCart } from '@/components/add-to-cart';
import { ProductGallery } from '@/components/product-gallery';
import { ChevronRight, Truck, RefreshCw, Star, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/product-card';

type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  seoTitle?: string;
  seoDescription?: string;
  shortDescription?: string;
  description: string;
  basePrice: string;
  salePrice: string | null;
  currency: string;
  averageRating: string;
  reviewCount: number;
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  categories: { category: { name: string; slug: string } }[];
  attributes: { id: string; name: string; values: { id: string; value: string }[] }[];
  reviews: { id: string; rating: number; title: string; body: string; verifiedPurchase: boolean; helpfulCount: number; createdAt: string; user: { firstName: string }; media: { media: { id: string; url: string; altText: string | null } }[] }[];
  brand: { name: string; slug: string } | null;
  images: { id: string; url: string; altText: string | null }[];
  variants: {
    id: string;
    sku: string;
    price: string | null;
    salePrice: string | null;
    image: { url: string; altText: string | null } | null;
    active: boolean;
    inventory: { available: number; reserved: number } | null;
    values: { value: { value: string; attribute: { name: string } } }[];
  }[];
  related: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    basePrice: string;
    salePrice: string | null;
    currency: string;
    featuredImage: { url: string; altText: string | null } | null;
    brand: { name: string; slug: string } | null;
    averageRating: string;
    reviewCount: number;
    inStock: boolean;
    images?: { url: string; altText: string | null }[];
  }[];
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const p = await serverApi<ProductDetail>(`/products/${slug}`);
    return { 
      title: p.seoTitle ?? p.name, 
      description: p.seoDescription ?? p.shortDescription, 
      alternates: { canonical: `/products/${p.slug}` }, 
      openGraph: { 
        title: p.seoTitle ?? p.name, 
        description: p.seoDescription ?? p.shortDescription, 
        type: 'website', 
        images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].altText ?? p.name }] : [] 
      } 
    };
  } catch {
    return { title: 'Product not found' };
  }
}

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let p: ProductDetail;
  
  try {
    p = await serverApi<ProductDetail>(`/products/${slug}`);
  } catch {
    notFound();
  }

  const storeSettings: Record<string, unknown> = await serverApi<Record<string, unknown>>('/storefront/settings').catch(() => ({}));
  const shippingSummary = typeof storeSettings.shippingPolicySummary === 'string' ? storeSettings.shippingPolicySummary : 'Complimentary shipping on orders over $150.';
  const returnSummary = typeof storeSettings.returnPolicySummary === 'string' ? storeSettings.returnPolicySummary : 'Enjoy 30-day effortless returns and exchanges.';
  
  const price = p.salePrice ?? p.basePrice;
  const hasDiscount = Boolean(p.salePrice && Number(p.salePrice) < Number(p.basePrice));
  const discountPercent = hasDiscount 
    ? Math.round((1 - Number(p.salePrice) / Number(p.basePrice)) * 100) 
    : 0;

  const productJsonLd = { 
    '@context': 'https://schema.org', 
    '@type': 'Product', 
    name: p.name, 
    description: p.shortDescription ?? p.description, 
    sku: p.sku, 
    image: p.images.map((image) => image.url), 
    brand: p.brand ? { '@type': 'Brand', name: p.brand.name } : undefined, 
    aggregateRating: p.reviewCount > 0 ? { '@type': 'AggregateRating', ratingValue: p.averageRating, reviewCount: p.reviewCount } : undefined, 
    offers: { 
      '@type': 'Offer', 
      priceCurrency: p.currency, 
      price, 
      availability: p.variants.some((variant) => variant.inventory && variant.inventory.available - variant.inventory.reserved > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', 
      url: `${process.env.APP_URL ?? ''}/products/${p.slug}` 
    } 
  };

  const breadcrumbJsonLd = { 
    '@context': 'https://schema.org', 
    '@type': 'BreadcrumbList', 
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: process.env.APP_URL }, 
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${process.env.APP_URL ?? ''}/shop` }, 
      { '@type': 'ListItem', position: 3, name: p.name, item: `${process.env.APP_URL ?? ''}/products/${p.slug}` }
    ] 
  };

  return (
    <div className="container py-8 md:py-14 max-w-7xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-8 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 mx-2 text-muted-foreground/60 shrink-0" />
        <Link href="/shop" className="hover:text-foreground transition-colors">Collection</Link>
        {p.categories[0] && (
          <>
            <ChevronRight className="h-3.5 w-3.5 mx-2 text-muted-foreground/60 shrink-0" />
            <Link href={`/categories/${p.categories[0].category.slug}`} className="hover:text-foreground transition-colors">
              {p.categories[0].category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 mx-2 text-muted-foreground/60 shrink-0" />
        <span className="text-foreground truncate max-w-xs">{p.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 items-start">
        {/* Interactive Zoom Gallery */}
        <ProductGallery images={p.images} name={p.name} />

        {/* Product Details Column */}
        <div className="lg:sticky lg:top-24 flex flex-col pt-1">
          {/* Brand & Reviews Bar */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {p.brand?.name ? (
              <span className="eyebrow tracking-[0.24em] text-xs font-bold text-accent">
                {p.brand.name}
              </span>
            ) : (
              <span className="eyebrow tracking-[0.24em] text-xs font-bold text-accent">
                Burujan Collection
              </span>
            )}

            {p.reviewCount > 0 && (
              <a 
                href="#reviews" 
                className="flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-foreground/80 hover:bg-secondary transition-colors"
              >
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span>{Number(p.averageRating).toFixed(1)}</span>
                <span className="text-muted-foreground">({p.reviewCount})</span>
              </a>
            )}
          </div>
          
          {/* Product Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.08] tracking-tight text-foreground">
            {p.name}
          </h1>
          
          {/* Pricing & Savings */}
          <div className="mb-6 mt-5 flex items-center gap-3.5">
            <span className={cn('text-3xl font-bold tracking-tight font-sans', hasDiscount ? 'text-accent' : 'text-foreground')}>
              {new Intl.NumberFormat('en', { style: 'currency', currency: p.currency }).format(Number(price))}
            </span>
            {hasDiscount && (
              <span className="text-lg text-muted-foreground/80 line-through font-medium">
                {new Intl.NumberFormat('en', { style: 'currency', currency: p.currency }).format(Number(p.basePrice))}
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                Save {discountPercent}%
              </span>
            )}
          </div>
          
          {/* Short Lead Description */}
          {p.shortDescription && (
            <p className="mb-8 border-b border-border/70 pb-7 text-base sm:text-lg leading-relaxed text-muted-foreground font-light">
              {p.shortDescription}
            </p>
          )}

          {/* Interactive Variant Selector & Add to Cart */}
          <div className="mb-8">
            <AddToCart 
              variants={p.variants} 
              basePrice={p.basePrice} 
              salePrice={p.salePrice} 
              currency={p.currency} 
            />
          </div>
          
          {/* Trust Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-border/80 mb-8 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-accent">
                <Truck className="h-4 w-4" />
              </span>
              <span className="text-muted-foreground leading-snug">{shippingSummary}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-accent">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-muted-foreground leading-snug">{returnSummary}</span>
            </div>
          </div>

          {/* Detailed Specifications */}
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">
              Consideration & Craft
            </h2>
            <div className="prose prose-neutral max-w-none text-muted-foreground text-sm sm:text-base leading-relaxed">
              <p className="whitespace-pre-line font-light">{p.description}</p>
            </div>
            
            {/* Attribute Key-Values */}
            <dl className="grid gap-3.5 rounded-2xl bg-secondary/40 p-6 sm:grid-cols-2 border border-border/60">
              {p.attributes.map((attribute) => (
                <div key={attribute.id} className="space-y-1">
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{attribute.name}</dt>
                  <dd className="text-sm font-semibold text-foreground">{attribute.values.map((v) => v.value).join(', ')}</dd>
                </div>
              ))}
              {p.weightGrams !== null && (
                <div className="space-y-1">
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Weight</dt>
                  <dd className="text-sm font-semibold text-foreground">{p.weightGrams} g</dd>
                </div>
              )}
              {p.lengthMm !== null && p.widthMm !== null && p.heightMm !== null && (
                <div className="space-y-1">
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dimensions</dt>
                  <dd className="text-sm font-semibold text-foreground">{p.lengthMm} × {p.widthMm} × {p.heightMm} mm</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section id="reviews" className="mt-28 border-t border-border/80 pt-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="eyebrow flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent" />
              Verified Feedback
            </span>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
              Customer Perspectives
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.reviewCount ? `Rated ${p.averageRating} / 5 based on ${p.reviewCount} verified reviews` : 'Be the first to share your thoughts on this piece.'}
            </p>
          </div>
        </div>

        {p.reviews.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {p.reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-border/70 bg-surface p-7 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-accent">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn('h-4 w-4', i < review.rating ? 'fill-accent text-accent' : 'text-border fill-transparent')} />
                    ))}
                  </div>
                  {review.verifiedPurchase && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Verified Buyer
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-base text-foreground mb-1">
                  {review.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-light mb-4">
                  {review.body}
                </p>

                {review.media.length > 0 && (
                  <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1">
                    {review.media.map(({ media }) => (
                      <div key={media.id} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        <Image src={media.url} alt={media.altText ?? 'Review visual'} fill className="object-cover" sizes="80px" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{review.user.firstName}</span>
                  <span>{review.helpfulCount} people found this helpful</span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {/* Related Products Grid */}
      {p.related && p.related.length > 0 && (
        <section className="mt-28 border-t border-border/80 pt-16">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="eyebrow">Harmonious Additions</p>
              <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-medium tracking-tight text-foreground">
                You Might Also Like
              </h2>
            </div>
            <Link href="/shop" className="group hidden sm:flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground">
              <span>View collection</span>
              <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {p.related.map((rp, idx) => {
              const adaptedProduct = {
                id: rp.id ?? rp.slug,
                name: rp.name,
                slug: rp.slug,
                shortDescription: rp.shortDescription ?? null,
                basePrice: rp.basePrice,
                salePrice: rp.salePrice,
                currency: rp.currency,
                featuredImage: rp.featuredImage ?? (rp.images && rp.images[0] ? { url: rp.images[0].url, altText: rp.images[0].altText } : null),
                brand: rp.brand ?? null,
                averageRating: rp.averageRating ?? '5.0',
                reviewCount: rp.reviewCount ?? 0,
                inStock: rp.inStock ?? true,
              };
              return <ProductCard key={rp.slug} product={adaptedProduct} index={idx} />;
            })}
          </div>
        </section>
      )}

      {/* Recently Viewed Drawer */}
      <div className="mt-28">
        <RecentlyViewed 
          current={{ 
            slug, 
            name: p.name, 
            price: p.salePrice ?? p.basePrice, 
            ...(p.images[0]?.url ? { image: p.images[0].url } : {}) 
          }} 
        />
      </div>
    </div>
  );
}
