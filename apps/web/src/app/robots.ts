import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin = (process.env.APP_URL || 'https://theburujan.shop').replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/account/', '/checkout/'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/favicon.ico', '/icon*.png', '/apple-touch-icon.png', '/logo*.png', '/storage/'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
