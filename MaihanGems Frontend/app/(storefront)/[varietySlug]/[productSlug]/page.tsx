import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVarietyBySlug, getGemstoneBySlugOrId } from '@/lib/storefront-data';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import { SITE_URL } from '@/app/layout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ varietySlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { varietySlug, productSlug } = await params;
  const variety = getVarietyBySlug(varietySlug);
  const stone = getGemstoneBySlugOrId(productSlug);
  if (!variety || !stone || stone.varietySlug !== variety.meta.slug) {
    return {
      title: 'Specimen Not Found',
      description: 'The requested variety-scoped gemstone record does not exist.',
    };
  }
  return {
    title: `${stone.name} — ${variety.meta.name} (${stone.sku})`,
    description: stone.lede,
    alternates: {
      canonical: `${SITE_URL}/${variety.meta.slug}/${stone.slug}`,
    },
  };
}

export default async function VarietyScopedProductDetailPage({
  params,
}: {
  params: Promise<{ varietySlug: string; productSlug: string }>;
}) {
  const { varietySlug, productSlug } = await params;
  const variety = getVarietyBySlug(varietySlug);
  const stone = getGemstoneBySlugOrId(productSlug);
  if (!variety || !stone || stone.varietySlug !== variety.meta.slug) {
    notFound();
  }
  return (
    <ProductDetailView
      stone={stone}
      breadcrumbVariety={{ name: variety.meta.name, slug: variety.meta.slug }}
    />
  );
}
