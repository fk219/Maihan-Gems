import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductGrid } from '../../../components/storefront/LuxuryProductCard.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';
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
          <nav className="lx-facets" aria-label="Parsed filters">
            <span>{items.length} result{items.length === 1 ? '' : 's'}</span>
            {parsed.stoneType ? <span>{parsed.stoneType.replace(/_/g, ' ')}</span> : null}
            {parsed.shape ? <span>{parsed.shape.replace(/_/g, ' ')}</span> : null}
            {parsed.origin ? <span>{parsed.origin}</span> : null}
            {parsed.quantityType === 'pair' ? <span>pairs</span> : null}
            {parsed.treatment ? <span>{parsed.treatment.replace(/_/g, ' ')}</span> : null}
          </nav>
        ) : null}
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <EmptyState
            title="No pieces matched this search."
            action={
              <Link href="/browse" className="lx-btn lx-btn--solid">
                Browse all gemstones
              </Link>
            }
          >
            <p>
              Try a broader prompt such as &ldquo;untreated 3ct Ceylon sapphire&rdquo;, or clear the filters above.
            </p>
          </EmptyState>
        )}
      </div>
    </main>
  );
}
