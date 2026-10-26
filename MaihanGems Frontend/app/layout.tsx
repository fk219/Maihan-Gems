import type { Metadata } from 'next';
import { EB_Garamond, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { StorefrontProvider } from '@/components/providers/StorefrontProvider';

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const SITE_URL = process.env.APP_URL || 'https://maihangems.example.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Maihan Gems — Fine Gemstone Maison',
    template: '%s | Maihan Gems',
  },
  description:
    'Provenance-evidenced loose gemstones, matched earring pairs, architectural settings, and bespoke jewellery configuration.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Maihan Gems — Fine Gemstone Maison',
    description:
      'Provenance-evidenced loose gemstones, matched earring pairs, architectural settings, and bespoke jewellery configuration.',
    type: 'website',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maihan Gems — Fine Gemstone Maison',
    description:
      'Provenance-evidenced loose gemstones, matched earring pairs, architectural settings, and bespoke jewellery configuration.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${jakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F8F7F4] text-[#141413] antialiased font-[family-name:var(--font-eb-garamond)] selection:bg-[#D4AF37] selection:text-black"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-[#141413] focus:text-[#F8F7F4] focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:rounded"
        >
          Skip to main content
        </a>
        <StorefrontProvider>{children}</StorefrontProvider>
      </body>
    </html>
  );
}
