import type { GemstoneItem } from '@/lib/mgh/fixtures/types';
import { mapFreshGemRow, type FreshGemRow } from './gem-client.js';

export async function fetchFavoriteStones(refs: string[]): Promise<GemstoneItem[]> {
  const unique = [...new Set(refs)].filter(Boolean).slice(0, 100);
  if (!unique.length) return [];
  const res = await fetch(`/api/fresh/catalogue/gemstones?refs=${encodeURIComponent(unique.join(','))}&limit=100`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { items?: FreshGemRow[] };
  const order = new Map(unique.map((ref, i) => [ref, i]));
  return (data.items ?? [])
    .map(mapFreshGemRow)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
