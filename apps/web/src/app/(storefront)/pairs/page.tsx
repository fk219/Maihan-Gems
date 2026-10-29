import type { Metadata } from 'next';
import Link from 'next/link';
import { MatchedPairsClient } from '@/components/mgh/catalog/MatchedPairsClient';
import {
  getFixtureEarringSettings,
  getMatchedPairCatalog,
} from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Matched Gemstone Pairs for Earrings | Maihan Gems',
  description:
    'Natural spinel, tanzanite, sapphire, and emerald pairs matched for size and color. Made for custom earrings.',
  alternates: {
    canonical: `${SITE_URL}/pairs`,
  },
};

export default async function MatchedPairsPage() {
  // Real matched pairs (quantityType='pair' rows) from the live catalogue.
  const pairs = await getMatchedPairCatalog();
  // Settings seam: the applet SettingItem (metals / sizes / shapes) is not
  // derivable from storefront-data rows without inventing fields, so the
  // earring setting chips keep rendering the applet's ported fixture ledger
  // until a SettingItem-shaped accessor exists.
  const earringSettings = await getFixtureEarringSettings();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">
            Matched Pairs
          </li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C]">
            PERFECTLY MATCHED · FOR EARRINGS
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl font-normal text-[#121211]">
            Matched Gemstone Pairs
          </h1>
        </div>
        <p className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#4E4C47]">
          Matched in size and color · Ready for stud or drop earrings
        </p>
      </div>

      <MatchedPairsClient pairs={pairs} earringSettings={earringSettings} />
    </div>
  );
}
