/**
 * apps/web/src/app/(storefront)/[varietySlug]-rings/[productSlug]/page.tsx
 *
 * `/tsavorite-garnet-rings/<slug>` — ready-made product detail (Task 4,
 * reached via the source's /{variety}-rings/{slug}-J##### family). Delegates
 * to the SAME loader and renderer as /products/[productSlug]: one detail
 * implementation, one contract, no duplicates.
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

export default async function VarietyRingDetailPage({ params }: PageProps) {
  const { productSlug } = await params;
  const detail = await loadProductDetail(productSlug);
  if (!detail.ok) {
    if (isProductNotFound(detail.error)) notFound();
    throw detail.error;
  }
  return <ProductDetailContent detail={detail.value} />;
}
