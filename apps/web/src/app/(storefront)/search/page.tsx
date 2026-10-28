import type { Metadata } from 'next';
import { AiConciergeWorkspace } from '@/components/mgh/catalog/AiConciergeWorkspace';
import { searchCatalogGemstones } from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

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

  // M2b data seam — kept on the seam the previous repo search page used:
  // the server-side search library (`searchStorefront`), resolved here for
  // the hydrating turn and handed to the workspace as LIVE vault cards. The
  // workspace's own chat/DYO machinery remains the applet's local engine.
  const seededResults = query ? await searchCatalogGemstones(query, 12) : [];

  return <AiConciergeWorkspace initialQuery={query} seededResults={seededResults} />;
}
