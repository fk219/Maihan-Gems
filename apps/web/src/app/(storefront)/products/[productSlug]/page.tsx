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
