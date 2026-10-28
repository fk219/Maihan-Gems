import type { Metadata } from 'next';
import { AiConciergeWorkspace } from '@/components/mgh/catalog/AiConciergeWorkspace';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: the reference applet's AI Gemologist page, ported
// verbatim. The workspace's model turns route through the repo's REAL AI
// concierge seam via `lib/mgh/adapters/ai.ts` (POST /api/v1/ai/chat — which
// persists conversation + messages server-side); the applet’s deterministic
// client-side tool actions act only on the local bag (repo no-write AI law).
// Without a model provider key the repo handler answers with its honest
// degraded state; the applet's local turns still work offline.
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
      canonical: `${SITE_URL}/ai-gemologist`,
    },
  };
}

export default async function AiGemologistPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || '';

  return <AiConciergeWorkspace initialQuery={query} />;
}
