'use client';

import Image from 'next/image';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getProductGalleryImages } from '@/lib/dummy-images';

type GalleryImage = { id: string; url: string; altText: string | null };

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const displayImages = getProductGalleryImages(images, name, name);
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const current = displayImages[selected] ?? displayImages[0]!;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePosition({ x, y });
  };

  const handleNext = () => {
    setSelected((prev) => (prev + 1) % displayImages.length);
  };

  const handlePrev = () => {
    setSelected((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[6rem_1fr] items-start">
        {/* Thumbnails Sidebar */}
        {displayImages.length > 1 && (
          <div className="order-2 flex gap-3 overflow-x-auto pb-2 lg:order-1 lg:flex-col lg:overflow-y-auto lg:max-h-[38rem] pr-1">
            {displayImages.map((image, index) => {
              const isCurrent = index === selected;
              return (
                <button
                  type="button"
                  key={image.id}
                  aria-label={`View image ${index + 1} of ${name}`}
                  onClick={() => setSelected(index)}
                  className={cn(
                    'relative h-20 w-16 sm:h-24 sm:w-20 shrink-0 overflow-hidden rounded-2xl bg-[#edeae1] transition-all duration-300',
                    isCurrent 
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-102 shadow-md' 
                      : 'opacity-60 hover:opacity-100 hover:scale-102'
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? `${name} thumbnail ${index + 1}`}
                    fill
                    className="object-cover object-center"
                    sizes="80px"
                    unoptimized={image.url.includes('unsplash.com')}
                  />
                  {isCurrent && (
                    <motion.div
                      layoutId="gallery-active-border"
                      className="absolute inset-0 border-2 border-accent rounded-2xl pointer-events-none"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Main Stage with Interactive Zoom */}
        <div 
          ref={imageContainerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'group relative order-1 aspect-[4/5] overflow-hidden rounded-[2.25rem] bg-[#edeae1] shadow-[0_10px_35px_rgba(23,32,28,0.06)] lg:order-2 cursor-crosshair select-none',
            displayImages.length === 1 && 'lg:col-span-2'
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative h-full w-full"
            >
              <Image
                src={current.url}
                alt={current.altText ?? name}
                fill
                priority
                className={cn(
                  'object-cover object-center transition-transform duration-300 ease-out',
                  isHovered ? 'scale-135' : 'scale-100'
                )}
                style={
                  isHovered
                    ? {
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      }
                    : undefined
                }
                sizes="(max-width: 768px) 100vw, 55vw"
                unoptimized={current.url.includes('unsplash.com')}
              />
            </motion.div>
          </AnimatePresence>

          {/* Fullscreen Trigger */}
          <button
            type="button"
            aria-label="Open image fullscreen"
            onClick={() => setFullscreen(true)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white active:scale-95 group-hover:opacity-100"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Image Counter Badge */}
          {displayImages.length > 1 && (
            <div className="absolute left-4 bottom-4 rounded-full bg-black/40 px-3.5 py-1 text-[11px] font-mono font-medium text-white backdrop-blur-md shadow-sm">
              {selected + 1} / {displayImages.length}
            </div>
          )}

          {/* Mobile Navigation Arrows */}
          {displayImages.length > 1 && (
            <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none sm:hidden">
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground shadow-md backdrop-blur-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground shadow-md backdrop-blur-md"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${name} full resolution view`}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
            onClick={() => setFullscreen(false)}
          >
            <button
              type="button"
              className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
              aria-label="Close image viewer"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative h-[85vh] w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={current.url}
                alt={current.altText ?? name}
                fill
                className="object-contain"
                sizes="95vw"
                unoptimized={current.url.includes('unsplash.com')}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
