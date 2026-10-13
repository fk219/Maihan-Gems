import type { Metadata } from 'next';
import Link from 'next/link';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { displayStoneName, stoneTypeToSlug } from '../../../lib/search-parser.js';
import { listProducts, listStoneTypes } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gemstones | Maihan Gems' };

export default async function BrowsePage() {
  const [products, stones] = await Promise.all([
    listProducts({ kind: 'gemstone', limit: 48 }),
    listStoneTypes(),
  ]);
  return (
    <CollectionPage
      kicker="Loose stones"
      title="Gemstones"
      lede="Natural stones from the vault, listed as they were found and cut."
      products={products}
      chips={stones.map((s) => (
        <Link key={s.stoneType} href={`/${stoneTypeToSlug(s.stoneType)}`}>
          {displayStoneName(s.stoneType)}
        </Link>
      ))}
    />
  );
}
