'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_HERO_IMAGE } from '@/lib/dummy-images';

interface HeroSectionProps {
  heroImage: string | null;
  heroImageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  secondaryText?: string;
  secondaryLink?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 65,
      damping: 20,
    },
  },
};

export function HeroSection({
  heroImage,
  heroImageAlt,
  eyebrow,
  title,
  description,
  buttonText,
  buttonLink,
  secondaryText = 'Our Philosophy',
  secondaryLink = '/about',
}: HeroSectionProps) {
  const effectiveHeroImage = heroImage && !heroImage.includes('picsum.photos') ? heroImage : DEFAULT_HERO_IMAGE;

  return (
    <section className="container relative overflow-hidden py-4 sm:py-8 lg:py-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={containerVariants}
        className="relative min-h-[38rem] sm:min-h-[44rem] lg:min-h-[48rem] overflow-hidden rounded-[2.5rem] bg-[#111915] shadow-[0_30px_90px_-20px_rgba(23,32,28,0.35)] ring-1 ring-white/10"
      >
        {/* Background Layer with Ambient Motion */}
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={effectiveHeroImage}
            alt={heroImageAlt}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            unoptimized={effectiveHeroImage.includes('unsplash.com')}
          />
        </motion.div>

        {/* Cinematic Scrim & Vignette Overlays for Perfect Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1410]/95 via-[#0c1410]/55 to-transparent sm:bg-gradient-to-r sm:from-[#0c1410]/95 sm:via-[#0c1410]/50 sm:to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#000000_0%,transparent_65%)] opacity-75" />

        {/* Hero Content Container */}
        <div className="relative flex min-h-[38rem] sm:min-h-[44rem] lg:min-h-[48rem] max-w-3xl flex-col justify-end p-8 sm:p-14 lg:p-20">
          {/* Eyebrow Pill */}
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f7d8c8] backdrop-blur-xl shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {eyebrow}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="mt-6 font-serif text-5xl sm:text-7xl lg:text-[5.25rem] font-normal tracking-[-0.035em] text-white leading-[0.98] drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-xl text-base sm:text-lg lg:text-xl leading-relaxed text-white/85 font-light"
          >
            {description}
          </motion.p>

          {/* Call to Actions */}
          <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                asChild
                size="lg"
                className="group relative h-13 rounded-full bg-white px-8 text-foreground font-semibold shadow-[0_12px_36px_rgba(0,0,0,0.3)] hover:bg-[#faf7f2] hover:shadow-[0_16px_45px_rgba(0,0,0,0.4)] transition-all"
              >
                <Link href={buttonLink}>
                  <span className="tracking-wide text-sm">{buttonText}</span>
                  <ArrowUpRight className="h-4 w-4 ml-1.5 text-accent transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-13 rounded-full border border-white/25 bg-white/[0.08] px-8 text-white font-medium backdrop-blur-xl hover:bg-white/[0.18] hover:border-white/45 hover:text-white transition-all text-sm tracking-wide"
              >
                <Link href={secondaryLink}>{secondaryText}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Luxury Curated Batch Badge (Desktop) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-10 right-10 hidden rounded-2xl border border-white/15 bg-black/35 p-6 text-white backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:bg-black/45 hover:scale-105 lg:block"
        >
          <div className="flex items-center gap-4">
            <span className="font-serif text-4xl font-light tracking-tight text-[#f7d8c8]">01</span>
            <div className="h-9 w-[1px] bg-white/20" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/95">
                Curated Edit
              </p>
              <p className="text-[12px] text-white/65 mt-0.5">Designed for daily rituals</p>
            </div>
          </div>
        </motion.div>

        {/* Subtle Scroll Down Prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 text-white/50 text-[10px] uppercase tracking-[0.2em]"
        >
          <span>Scroll</span>
          <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
        </motion.div>
      </motion.div>
    </section>
  );
}
