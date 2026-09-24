'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import { getCategoryImageUrl } from '@/lib/dummy-images';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
};

export function CategoriesSection({ categories }: { categories: Category[] }) {
  if (!categories || categories.length === 0) return null;

  const displayCategories = categories.slice(0, 4);

  return (
    <section className="container py-20 lg:py-28">
      {/* Section Header */}
      <div className="flex items-end justify-between gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="eyebrow flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent" />
            Find Your Feeling
          </span>
          <h2 className="section-title mt-3 text-foreground font-serif">
            Shop by Category
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/shop"
            className="group hidden items-center gap-2 text-sm font-semibold text-foreground/80 hover:text-foreground transition-colors sm:flex"
          >
            <span>View all collections</span>
            <ArrowRight className="h-4 w-4 text-accent transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      {/* Bento Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {displayCategories.map((category, index) => {
          const isFeatured = index === 0;
          const catImage = getCategoryImageUrl(category);

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={isFeatured ? 'sm:col-span-2 lg:row-span-2' : ''}
            >
              <Link
                href={`/categories/${category.slug}`}
                className={`group relative flex overflow-hidden rounded-[2rem] bg-[#1a231f] shadow-[0_10px_35px_rgba(23,32,28,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_50px_-12px_rgba(23,32,28,0.2)] ${
                  isFeatured
                    ? 'min-h-[28rem] sm:min-h-[34rem] lg:min-h-full'
                    : 'min-h-[16rem] sm:min-h-[18rem]'
                }`}
              >
                {/* Image */}
                <Image
                  src={catImage}
                  alt={category.name}
                  fill
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
                  sizes={isFeatured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 25vw'}
                  unoptimized={catImage.includes('unsplash.com')}
                />

                {/* Scrim Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-300 group-hover:from-black/85" />

                {/* Category Card Content */}
                <div className="relative z-10 flex h-full w-full flex-col justify-between p-7 sm:p-9 text-white">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7d8c8] backdrop-blur-md">
                      0{index + 1}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 group-hover:scale-105">
                      <ArrowUpRight className="h-4 w-4 text-accent" />
                    </div>
                  </div>

                  <div>
                    <h3
                      className={`font-serif font-medium tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1 ${
                        isFeatured ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl'
                      }`}
                    >
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-2 line-clamp-2 text-xs sm:text-sm text-white/70 font-light max-w-sm">
                        {category.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-white/90 group-hover:text-accent transition-colors">
                      <span>Explore Collection</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
