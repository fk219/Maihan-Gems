/**
 * apps/web/src/app/(storefront)/[varietySlug]/[productSlug]/page.tsx
 *
 * M3 — the reference applet PDP, verbatim, for the variety-scoped route:
 * canonical routes win for the ready-made namespace, so this page renders
 * the SAME `ProductDetailView`+adapter path as `/products/[productSlug]`,
 * sourcing the record by `productSlug` exactly the way the reference page
 * did; the URL's variety segment is honoured as the breadcrumb when it
 * matches the applet's variety ledger. notFound()/error/loading boundaries
 * are unchanged.
 */
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { ProductDetailView } from '@/components/mgh/catalog/ProductDetailView';
import {
  getCatalogVarietyCollection,
  getPdpCatalogGemstone,
} from '@/lib/mgh/adapters/catalog';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const resolved = await getPdpCatalogGemstone(productSlug).catch(() => null);
  return {
    title: resolved ? `${resolved.displayTitle} | Maihan Gems` : 'Piece | Maihan Gems',
  };
}

export default async function CanonicalProductPage({ params }: PageProps) {
  const { varietySlug, productSlug } = await params;
  const variety = await getCatalogVarietyCollection(varietySlug);
  const resolved = await getPdpCatalogGemstone(productSlug).catch(() => null);
  if (!resolved) {
    notFound();
  }
  return (
    <ProductDetailView
      stone={resolved.stone}
      breadcrumbVariety={
        variety ? { name: variety.meta.name, slug: variety.meta.slug } : undefined
      }
    />
  );
}
