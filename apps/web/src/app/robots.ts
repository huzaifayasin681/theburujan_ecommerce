import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { const origin = process.env.APP_URL; return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/account/', '/checkout/'] }], ...(origin ? { sitemap: `${origin}/sitemap.xml`, host: origin } : {}) }; }
