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
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  title: { default: 'Burujan — Considered goods', template: '%s | Burujan' },
  description: 'Shop considered goods for everyday life.',
  alternates: { canonical: '/' },
  openGraph: { 
    type: 'website', 
    siteName: 'Burujan',
    images: [{ url: '/theburujan.png', width: 1536, height: 1024, alt: 'The Burujan' }],
  },
  twitter: { 
    card: 'summary_large_image',
    images: ['/theburujan.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
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

