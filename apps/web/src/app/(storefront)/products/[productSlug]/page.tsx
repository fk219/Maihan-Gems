/**
 * apps/web/src/app/(storefront)/products/[productSlug]/page.tsx
 *
 * `/products/<slug>` — canonical product detail (Task 4; target of the four
 * source families: loose stone, pair, ready-made, configured). Uses the ONE
 * shared ProductDetailContent renderer and the Phase 3 service.
 */
import { notFound } from 'next/navigation';

import { isProductNotFound } from '../../../../lib/catalog-errors.js';
import { loadProductDetail } from '../../../../lib/catalog-server.js';
import { ProductDetailContent } from '../../../../components/catalog/ProductDetailContent.js';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: Server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ productSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<{ title: string }> {
  const { productSlug } = await params;
  const detail = await loadProductDetail(productSlug);
  return detail.ok ? { title: `${detail.value.title} | Maihan Gems` } : { title: 'Product | Maihan Gems' };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { productSlug } = await params;
  const detail = await loadProductDetail(productSlug);
  if (!detail.ok) {
    if (isProductNotFound(detail.error)) notFound();
    throw detail.error; // route error boundary renders the recovery view (Task 5)
  }
  return <ProductDetailContent detail={detail.value} />;
}
