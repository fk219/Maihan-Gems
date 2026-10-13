import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductGrid } from '../../../components/storefront/LuxuryProductCard.js';
import { searchStorefront } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q} | Maihan Gems` : 'Search | Maihan Gems' };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const { parsed, items } = q.trim() ? await searchStorefront(q, 24) : { parsed: null, items: [] };

  return (
    <main className="lx-search-page">
      <div className="lx-wrap">
        <span className="lx-kicker">Vault search</span>
        <h1 className="lx-h2">{q.trim() ? q : 'Search the vault'}</h1>
        <form action="/search" method="get" className="lx-search__box" style={{ maxWidth: 720, margin: '1.5rem 0 2rem' }}>
          <input type="search" name="q" defaultValue={q} placeholder="Describe the gem you’re looking for…" />
          <button type="submit">Search</button>
        </form>
        {parsed ? (
          <p className="lx-card__specs" style={{ marginBottom: '1.5rem' }}>
            {items.length} result{items.length === 1 ? '' : 's'}
            {parsed.stoneType ? ` · ${parsed.stoneType.replace(/_/g, ' ')}` : ''}
            {parsed.shape ? ` · ${parsed.shape}` : ''}
            {parsed.origin ? ` · ${parsed.origin}` : ''}
            {parsed.quantityType === 'pair' ? ' · pairs' : ''}
          </p>
        ) : null}
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <p>
            No pieces matched. Try <Link href="/browse">all gemstones</Link> or a prompt such as
            “untreated 3ct Ceylon sapphire”.
          </p>
        )}
      </div>
    </main>
  );
}
