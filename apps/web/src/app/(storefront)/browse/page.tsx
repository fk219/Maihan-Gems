import type { Metadata } from 'next';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gemstones | Maihan Gems' };

export default async function BrowsePage() {
  const products = await listProducts({ kind: 'gemstone', limit: 32 });
  return (
    <CollectionPage
      kicker="Loose stones"
      title="Gemstones"
      lede="Natural stones from the vault, listed as they were found and cut."
      products={products}
    />
  );
}
