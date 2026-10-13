import type { ReactNode } from 'react';
import Link from 'next/link';

import { ProductGrid } from './LuxuryProductCard.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';

const FACET_LINKS = [
  { suffix: '', label: 'Stones' },
  { suffix: '-pairs', label: 'Pairs' },
  { suffix: '-rings', label: 'Rings' },
  { suffix: '-earrings', label: 'Earrings' },
  { suffix: '-pendants', label: 'Pendants' },
  { suffix: '-settings', label: 'Settings' },
] as const;

export function CollectionPage({
  kicker,
  title,
  lede,
  products,
  stoneSlug,
  chips,
}: {
  kicker: string;
  title: string;
  lede?: string;
  products: StorefrontCard[];
  stoneSlug?: string;
  chips?: ReactNode;
}) {
  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">{kicker}</span>
        <h1 className="lx-h2">{title}</h1>
        {lede ? <p className="lx-lede">{lede}</p> : null}
        {stoneSlug ? (
          <nav className="lx-facets" aria-label="Collection facets">
            {FACET_LINKS.map((link) => (
              <Link key={link.suffix || 'stone'} href={`/${stoneSlug}${link.suffix}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {chips ? <nav className="lx-facets" aria-label="Stone types">{chips}</nav> : null}
        <p className="lx-card__specs" style={{ margin: '1.5rem 0 2rem' }}>
          {products.length} piece{products.length === 1 ? '' : 's'}
        </p>
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p className="lx-empty-copy">Nothing in this drawer just now. Browse another facet or the vault menu.</p>
        )}
      </div>
    </main>
  );
}
