import type { Metadata } from 'next';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Jewellery | Maihan Gems' };

export default async function JewelleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const products = await listProducts({ kind: 'jewelry', jewelryType: type, limit: 32 });
  return (
    <CollectionPage
      kicker="Finished pieces"
      title="Jewellery"
      products={products}
    />
  );
}
