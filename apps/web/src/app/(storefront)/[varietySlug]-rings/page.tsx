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
  return { title: `${displayStoneName(slugToStoneType(varietySlug))} rings | Maihan Gems` };
}

export default async function VarietyRingsPage({ params }: PageProps) {
  const { varietySlug } = await params;
  const stoneType = slugToStoneType(varietySlug);
  const stones = await listStoneTypes();
  if (!stones.some((s) => s.stoneType === stoneType)) notFound();
  const name = displayStoneName(stoneType);
  const products = await listProducts({
    kind: 'jewelry',
    jewelryType: 'ring',
    titleContains: name.replace('Paraíba ', 'Paraiba '),
    limit: 32,
  });
  return <CollectionPage kicker="Ready-made" title={`${name} rings`} products={products} />;
}
