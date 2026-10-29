import type { Metadata } from 'next';
import { AiConciergeWorkspace } from '@/components/mgh/catalog/AiConciergeWorkspace';
import { SITE_URL } from '@/lib/mgh/site-url';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  return {
    title: query
      ? `AI Gemologist — “${query}” | Maihan Gems`
      : 'AI Gemologist — Interactive Gemstone & Bespoke Jewelry Advisor | Maihan Gems',
    description:
      'Consult the Maihan AI Gemologist. Search certified natural gemstones, compare stones side by side, design custom rings in DYOJ, and inspect lab provenance.',
    alternates: {
      canonical: `${SITE_URL}/concierge`,
    },
  };
}

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || '';

  return <AiConciergeWorkspace initialQuery={query} />;
}
