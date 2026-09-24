export const DUMMY_PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80', // Ceramic vase / pottery
  'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80', // Minimal design sculpture
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', // Warm artisanal lamp
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80', // Minimal wooden stool / furniture
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', // Ceramic tableware / cups
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80', // Minimalist carafe & glass
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', // Warm wooden chair
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80', // Modern interior objects
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80', // Linen / textured throws
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80', // Minimal chair / decor
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80', // Armchair / design piece
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', // Sofa / living room design
  'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80', // Handcrafted wood board
  'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80', // Sculptural vase
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', // Architectural stoneware
  'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=800&q=80', // Desk aesthetic object
];

export const DUMMY_CATEGORY_IMAGES: Record<string, string> = {
  ceramics: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80',
  living: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  lighting: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80',
  textiles: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80',
  furniture: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  kitchen: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80',
  objects: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80',
};

export const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=85';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getProductImageUrl(
  image: { url: string; altText?: string | null } | string | null | undefined,
  seedKey?: string
): string {
  const url = typeof image === 'string' ? image : image?.url;
  if (url && !url.includes('picsum.photos')) {
    return url;
  }
  const key = seedKey || 'product';
  const index = hashString(key) % DUMMY_PRODUCT_IMAGES.length;
  return DUMMY_PRODUCT_IMAGES[index] ?? DUMMY_PRODUCT_IMAGES[0]!;
}

export function getProductGalleryImages(
  images: Array<{ id: string; url: string; altText: string | null }> | null | undefined,
  seedKey: string,
  productName: string
): Array<{ id: string; url: string; altText: string | null }> {
  const valid = (images || []).filter((img) => img.url && !img.url.includes('picsum.photos'));
  if (valid.length > 0) return valid;

  const startIndex = hashString(seedKey) % DUMMY_PRODUCT_IMAGES.length;
  return [0, 1, 2, 3].map((offset) => ({
    id: `dummy-${seedKey}-${offset}`,
    url: DUMMY_PRODUCT_IMAGES[(startIndex + offset) % DUMMY_PRODUCT_IMAGES.length] ?? DUMMY_PRODUCT_IMAGES[0]!,
    altText: `${productName} view ${offset + 1}`,
  }));
}

export function getCategoryImageUrl(
  categoryOrUrl: { slug?: string; imageUrl?: string | null; name?: string } | string | null | undefined,
  fallbackSlug = ''
): string {
  let url: string | null | undefined = null;
  let slug = fallbackSlug;

  if (typeof categoryOrUrl === 'object' && categoryOrUrl !== null) {
    url = categoryOrUrl.imageUrl;
    slug = categoryOrUrl.slug || fallbackSlug;
  } else if (typeof categoryOrUrl === 'string') {
    url = categoryOrUrl;
  }

  if (url && !url.includes('picsum.photos')) {
    return url;
  }
  const lowerSlug = slug.toLowerCase();
  for (const [key, catUrl] of Object.entries(DUMMY_CATEGORY_IMAGES)) {
    if (lowerSlug.includes(key)) return catUrl;
  }
  const index = hashString(slug || 'category') % DUMMY_PRODUCT_IMAGES.length;
  return DUMMY_PRODUCT_IMAGES[index] ?? DUMMY_PRODUCT_IMAGES[0]!;
}
