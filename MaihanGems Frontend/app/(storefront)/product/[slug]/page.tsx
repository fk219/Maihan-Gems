import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGemstoneBySlugOrId } from '@/lib/storefront-data';
import { ProductDetailView } from '@/components/catalog/ProductDetailView';
import { SITE_URL } from '@/app/layout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stone = getGemstoneBySlugOrId(slug);
  if (!stone) {
    return {
      title: 'Specimen Not Found',
      description: 'The requested gemstone slug does not exist in the Maihan Gems vault ledger.',
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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stone = getGemstoneBySlugOrId(slug);
  if (!stone) {
    notFound();
  }
  return <ProductDetailView stone={stone} />;
}
