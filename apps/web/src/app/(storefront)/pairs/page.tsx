import type { Metadata } from 'next';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Matched pairs | Maihan Gems' };

export default async function PairsPage() {
  const products = await listProducts({ kind: 'gemstone', quantityType: 'pair', limit: 32 });
  return (
    <CollectionPage
      kicker="Earrings and suites"
      title="Matched pairs"
      lede="Pairs kept together for colour, cut and size."
      products={products}
    />
  );
}
