import type { Metadata } from 'next';
import Link from 'next/link';
import { FavoritesPageClient } from '@/components/mgh/catalog/FavoritesPageClient';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Favourites | Maihan Gems',
  description: 'Saved stones, pairs and mountings from the private vault.',
  alternates: { canonical: `${SITE_URL}/favorites` },
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">Favourites</li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6">
        <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C]">
          CLIENT PORTFOLIO
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl font-normal text-[#121211]">
          Favourites
        </h1>
        <p className="mt-2 text-sm font-[family-name:var(--font-eb-garamond)] text-[#4E4C47]">
          A private shortlist of pieces you are watching.
        </p>
      </div>

      <FavoritesPageClient />
    </div>
  );
}
