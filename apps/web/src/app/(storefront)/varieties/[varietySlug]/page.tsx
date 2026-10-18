/**
 * apps/web/src/app/(storefront)/varieties/[varietySlug]/page.tsx
 *
 * `/varieties/<slug>` — mineralogical variety detail & filtered catalogue
 * listing (SoT 13.2).
 */
import type { Metadata } from 'next';

import { CollectionPage } from '../../../../components/storefront/CollectionPage.js';
import { listProducts } from '../../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  const label = varietySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${label} Gemstones | Maihan Gems`,
    description: `Certified natural ${label.toLowerCase()} loose stones and matched pairs from the Maihan Gems vault.`,
  };
}

export default async function VarietyDetailPage({ params }: PageProps) {
  const { varietySlug } = await params;
  const stoneType = varietySlug.toLowerCase().replace(/-/g, '_');
  const label = varietySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const products = await listProducts({
    kind: 'gemstone',
    stoneType,
    limit: 48,
  });

  return (
    <CollectionPage
      kicker="Mineralogical Variety"
      title={label}
      lede={`Natural ${label.toLowerCase()} specimens and matched pairs from the Maihan Gems vault.`}
      products={products}
      stoneSlug={varietySlug}
      cta={{ href: '/varieties', label: 'All mineral varieties' }}
    />
  );
}
