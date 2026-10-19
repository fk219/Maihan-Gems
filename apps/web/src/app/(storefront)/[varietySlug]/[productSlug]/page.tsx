import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductStudio } from '../../../../components/storefront/ProductStudio.js';
import { findNgcProduct, ngcCards, toStorefrontCard } from '../../../../lib/ngc/catalog.js';
import { displayTitle } from '../../../../lib/ngc/title.js';
import { getProductBySlug } from '../../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params;
  const product = findNgcProduct(productSlug);
  return { title: product ? `${displayTitle(product)} | Maihan Gems` : 'Piece | Maihan Gems' };
}

export default async function CanonicalProductPage({ params }: PageProps) {
  const { productSlug } = await params;
  const dbProduct = await getProductBySlug(productSlug);
  if (!dbProduct) notFound();
  const product = findNgcProduct(productSlug);
  if (!product) notFound();
  const merged = {
    ...product,
    title: dbProduct.title || product.title,
    priceUsd: dbProduct.priceUsd || product.priceUsd,
  };
  const related = ngcCards({
    kind: product.kind,
    stoneSlug: product.stoneType?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    limit: 5,
  }).filter((row) => row.sku !== product.id);
  return <ProductStudio product={merged} related={related.length ? related : [toStorefrontCard(merged)]} />;
}
