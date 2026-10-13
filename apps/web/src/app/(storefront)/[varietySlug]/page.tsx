import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { loadCollectionView } from '../../../lib/collection-route.js';
import { displayStoneName, parseCollectionSlug } from '../../../lib/search-parser.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  const parsed = parseCollectionSlug(varietySlug);
  if (!parsed) return { title: 'Collection | Maihan Gems' };
  const name = displayStoneName(parsed.stoneType);
  if (parsed.mode === 'pairs') return { title: `${name} pairs | Maihan Gems` };
  if (parsed.mode === 'jewelry') return { title: `${name} ${parsed.formLabel} | Maihan Gems` };
  if (parsed.mode === 'settings') return { title: `${name} settings | Maihan Gems` };
  return { title: `${name} | Maihan Gems` };
}

export default async function VarietyPage({ params }: PageProps) {
  const { varietySlug } = await params;
  const view = await loadCollectionView(varietySlug);
  if (!view) notFound();
  return (
    <CollectionPage
      kicker={view.kicker}
      title={view.title}
      lede={view.lede}
      products={view.products}
      stoneSlug={view.stoneSlug}
    />
  );
}
