/**
 * apps/web/src/app/(storefront)/product/[slug]/page.tsx
 *
 * M3 — the reference applet PDP, verbatim, on the legacy alias slug. It used
 * to render its own UI; it now renders the SAME applet `ProductDetailView`
 * through the SAME adapter path as `/products/[productSlug]` (the applet's
 * product page body, sourced by slug; metadata keeps the repo's canonical
 * `${displayTitle} | Maihan Gems` format). notFound()/error/loading
 * boundaries unchanged.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ProductDetailView } from '@/components/mgh/catalog/ProductDetailView';
import { getPdpCatalogGemstone } from '@/lib/mgh/adapters/catalog';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getPdpCatalogGemstone(slug).catch(() => null);

  if (!resolved) {
    return {
      title: 'Piece | Maihan Gems',
      description: 'The requested gemstone slug does not exist in the Maihan Gems vault ledger.',
    };
  }
  return {
    title: `${resolved.displayTitle} | Maihan Gems`,
    description: resolved.stone.lede,
    alternates: {
      canonical: `/product/${resolved.stone.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await getPdpCatalogGemstone(slug);
  if (!resolved) {
    notFound();
  }
  return <ProductDetailView stone={resolved.stone} />;
}
