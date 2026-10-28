import type { Metadata } from 'next';
import Link from 'next/link';
import { CollectionExplorer } from '@/components/mgh/catalog/CollectionExplorer';
import { getBrowseCatalogGemstones } from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Browse Loose Gemstones | Maihan Gems',
  description:
    'Browse natural loose gemstones by gem type, color, shape, and price.',
  alternates: {
    canonical: `${SITE_URL}/browse`,
  },
};

export default async function BrowsePage() {
  const stones = await getBrowseCatalogGemstones();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">Gemstones</li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C]">
            NATURAL COLLECTION · {stones.length} STONES
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl font-normal text-[#121211]">
            Loose Gemstones
          </h1>
        </div>
        <p className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#4E4C47]">
          Clear pricing · Certified natural stones
        </p>
      </div>

      <CollectionExplorer initialItems={stones} />
    </div>
  );
}
