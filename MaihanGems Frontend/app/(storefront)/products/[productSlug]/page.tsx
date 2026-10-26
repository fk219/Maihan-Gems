import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGemstoneBySlugOrId } from '@/lib/storefront-data';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import { SITE_URL } from '@/app/layout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}): Promise<Metadata> {
  const { productSlug } = await params;
  const stone = getGemstoneBySlugOrId(productSlug);
  if (!stone) {
    return {
      title: 'Specimen Not Found',
      description: 'The requested product record does not exist in the Maihan Gems vault.',
    };
  }
  return {
    title: `${stone.name} (${stone.sku})`,
    description: stone.lede,
    alternates: {
      canonical: `${SITE_URL}/product/${stone.slug}`,
    },
  };
}

export default async function ProductsApiShapedPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const stone = getGemstoneBySlugOrId(productSlug);
  if (!stone) {
    notFound();
  }
  return <ProductDetailView stone={stone} />;
}
