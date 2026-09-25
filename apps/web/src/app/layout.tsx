import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Providers } from '@/components/providers';
import { ScrollToTop } from '@/components/scroll-to-top';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'https://theburujan.shop'),
  title: { default: 'The Burujan — Considered Goods & Timeless Design', template: '%s | The Burujan' },
  description: 'Shop considered goods for everyday life. Timeless pieces designed for daily rituals.',
  alternates: { 
    canonical: 'https://theburujan.shop',
  },
  openGraph: { 
    type: 'website', 
    siteName: 'The Burujan',
    url: 'https://theburujan.shop',
    images: [{ url: '/theburujan.png', width: 1536, height: 1024, alt: 'The Burujan' }],
  },
  twitter: { 
    card: 'summary_large_image',
    images: ['/theburujan.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://theburujan.shop/#website',
      url: 'https://theburujan.shop',
      name: 'The Burujan',
      alternateName: ['Burujan', 'theburujan.shop'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://theburujan.shop/shop?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://theburujan.shop/#organization',
      name: 'The Burujan',
      url: 'https://theburujan.shop',
      logo: {
        '@type': 'ImageObject',
        '@id': 'https://theburujan.shop/#logo',
        url: 'https://theburujan.shop/icon-512x512.png',
        contentUrl: 'https://theburujan.shop/icon-512x512.png',
        caption: 'The Burujan Logo',
        width: 512,
        height: 512,
      },
      image: 'https://theburujan.shop/logo.png',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans min-h-screen flex flex-col antialiased selection:bg-accent selection:text-white">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
