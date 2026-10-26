import React from 'react';
import type { Metadata } from 'next';
import { AiConciergeWorkspace } from '@/components/catalog/AiConciergeWorkspace';
import { SITE_URL } from '@/app/layout';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  return {
    title: query
      ? `AI Vault Search — “${query}”`
      : 'AI Vault Search & Concierge | Maihan Gems',
    description:
      'Interactive AI Concierge and Vault Search for Maihan Gems.',
    alternates: {
      canonical: `${SITE_URL}/search`,
    },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || '';

  return <AiConciergeWorkspace initialQuery={query} />;
}
