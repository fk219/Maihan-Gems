import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { listProducts, listStoneTypes } from '../../../lib/storefront-data.js';
import { displayStoneName, slugToStoneType } from '../../../lib/search-parser.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  return { title: `${displayStoneName(slugToStoneType(varietySlug))} | Maihan Gems` };
}

export default async function VarietyPage({ params }: PageProps) {
  const { varietySlug } = await params;
  const stoneType = slugToStoneType(varietySlug);
  const stones = await listStoneTypes();
  if (!stones.some((s) => s.stoneType === stoneType)) notFound();
  const products = await listProducts({ kind: 'gemstone', stoneType, limit: 32 });
  const name = displayStoneName(stoneType);
  return (
    <CollectionPage
      kicker="Loose stones"
      title={name}
      lede={`Natural ${name.toLowerCase()} from the vault.`}
      products={products}
    />
  );
}
