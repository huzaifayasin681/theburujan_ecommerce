import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import type { Paginated, ProductListItem } from '@burujan/types';
import { serverApi } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { HeroSection } from '@/components/hero-section';
import { CategoriesSection } from '@/components/categories-section';

type Category = { id: string; name: string; slug: string; description: string | null; imageUrl: string | null };
type Brand = { id: string; name: string; slug: string; logoUrl: string | null };
type Settings = Record<string, unknown>;
const textSetting = (settings: Settings, key: string, fallback: string) => typeof settings[key] === 'string' && settings[key] ? String(settings[key]) : fallback;

export default async function Home() {
  const [newResult, bestResult, dealResult, categoriesResult, brandsResult, settingsResult] = await Promise.allSettled([
    serverApi<Paginated<ProductListItem>>('/products?limit=8&sort=newest'), serverApi<Paginated<ProductListItem>>('/products?limit=4&sort=best-selling'), serverApi<Paginated<ProductListItem>>('/products?limit=4&discount=true&sort=price-asc'), serverApi<Category[]>('/categories'), serverApi<Brand[]>('/brands'), serverApi<Settings>('/storefront/settings'),
  ]);
  const products = newResult.status === 'fulfilled' ? newResult.value.data : [];
  const best = bestResult.status === 'fulfilled' ? bestResult.value.data : [];
  const deals = dealResult.status === 'fulfilled' ? dealResult.value.data : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const brands = brandsResult.status === 'fulfilled' ? brandsResult.value : [];
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : {};
  const heroImage = typeof settings.homeHeroImage === 'string' ? settings.homeHeroImage : null;
  return <>
    {settings.announcementEnabled !== false && <div className="bg-primary px-4 py-2.5 text-center text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary-foreground">{textSetting(settings, 'announcementText', 'Thoughtful objects · designed for everyday rituals')}</div>}
    <HeroSection
      heroImage={heroImage}
      heroImageAlt={textSetting(settings, 'homeHeroImageAlt', 'Featured collection')}
      eyebrow={textSetting(settings, 'homeHeroEyebrow', 'The autumn edit')}
      title={textSetting(settings, 'homeHeroTitle', 'Objects made to live with.')}
      description={textSetting(settings, 'homeHeroDescription', 'A considered collection of useful, lasting pieces for calm homes and busy days.')}
      buttonText={textSetting(settings, 'homeHeroButton', 'Explore the collection')}
      buttonLink={textSetting(settings, 'homeHeroLink', '/shop')}
    />
    <section className="container grid gap-5 border-b border-border/80 py-10 sm:grid-cols-3">
      <Trust icon={<Leaf className="h-5 w-5" />} title="Thoughtfully Sourced" text="Materials and sustainable makers we believe in." />
      <Trust icon={<ShieldCheck className="h-5 w-5" />} title="Made to Last" text="Timeless pieces designed for daily rituals." />
      <Trust icon={<Sparkles className="h-5 w-5" />} title="Packed with Care" text="Complimentary presentation box on every order." />
    </section>
    <CategoriesSection categories={categories} />
    <ProductSection eyebrow="Just In" title="New Arrivals" products={products} href="/shop?sort=newest" />
    {best.length > 0 && (
      <section className="bg-[#edeae2] py-20 lg:py-28">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_2fr] lg:items-end">
            <div>
              <p className="eyebrow">The Community Edit</p>
              <h2 className="section-title mt-3">Made popular by people with good taste.</h2>
              <p className="mt-5 max-w-sm leading-relaxed text-muted-foreground">The pieces our customers return to, gift often, and keep for years.</p>
              <Button asChild className="mt-7 rounded-full px-7">
                <Link href="/shop?sort=best-selling">Shop best sellers <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {best.map((product, idx) => <ProductCard key={product.id} product={product} index={idx} />)}
            </div>
          </div>
        </div>
      </section>
    )}
    {deals.length > 0 && <ProductSection eyebrow="Limited Edit" title="Little Luxuries, Less" products={deals} href="/shop?discount=true" muted />}
    {brands.length > 0 && (
      <section className="container py-20 lg:py-28">
        <div className="rounded-[2.5rem] bg-[#121b16] px-8 py-14 text-white sm:px-14 lg:px-18 shadow-2xl ring-1 ring-white/10">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-[#f7d8c8]">In Good Company</p>
              <h2 className="mt-3 font-serif text-4xl md:text-5xl text-white">The makers behind the pieces.</h2>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white transition-colors">
              Discover all brands <ArrowUpRight className="h-4 w-4 text-accent" />
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {brands.slice(0, 8).map((brand) => (
              <Link 
                key={brand.id} 
                href={`/brands/${brand.slug}`} 
                className="flex min-h-24 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] p-5 text-center font-serif text-lg text-white transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5"
              >
                {brand.logoUrl ? <Image src={brand.logoUrl} alt={brand.name} width={130} height={48} className="max-h-10 w-auto object-contain brightness-0 invert opacity-80 hover:opacity-100 transition-opacity" /> : brand.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    )}
    <section className="container pb-24">
      <div className="rounded-[2.5rem] bg-[#d7b19c] px-8 py-16 sm:px-16 lg:flex lg:items-center lg:justify-between shadow-lg">
        <div>
          <p className="eyebrow text-[#623222]">A Slower Way to Shop</p>
          <h2 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-[#2d1c17] md:text-5xl">Keep fewer things. Love them longer.</h2>
        </div>
        <Link href="/about" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2d1c17] px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-black hover:-translate-y-1 lg:mt-0 shadow-lg">
          Read our story <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  </>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { 
  return (
    <div className="flex items-start gap-4 rounded-2xl p-4 transition-all duration-300 hover:bg-secondary/40">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-accent">
        {icon}
      </span>
      <div>
        <h3 className="font-semibold text-foreground text-sm tracking-tight">{title}</h3>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  ); 
}

function ProductSection({ eyebrow, title, products, href, muted = false }: { eyebrow: string; title: string; products: ProductListItem[]; href: string; muted?: boolean }) { 
  if (!products.length) return null; 
  return (
    <section className={muted ? 'bg-[#edeae2] py-20 lg:py-28' : 'container py-20 lg:py-28'}>
      <div className={muted ? 'container' : ''}>
        <div className="mb-10 flex items-end justify-between gap-5">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="section-title mt-3 text-foreground font-serif">{title}</h2>
          </div>
          <Link href={href} className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors">
            <span>View all</span>
            <ArrowRight className="h-4 w-4 text-accent transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="grid-products">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  ); 
}
