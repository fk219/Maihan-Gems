import { permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AiGemologistPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  permanentRedirect(`/concierge${query ? `?q=${encodeURIComponent(query)}` : ''}`);
}
