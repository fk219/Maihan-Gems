import { ProductGrid } from './LuxuryProductCard.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';

export function CollectionPage({
  kicker,
  title,
  lede,
  products,
}: {
  kicker: string;
  title: string;
  lede?: string;
  products: StorefrontCard[];
}) {
  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">{kicker}</span>
        <h1 className="lx-h2">{title}</h1>
        {lede ? <p style={{ maxWidth: 640, color: '#4a4740', margin: '1rem 0 0' }}>{lede}</p> : null}
        <p className="lx-card__specs" style={{ margin: '1.5rem 0 2rem' }}>
          {products.length} piece{products.length === 1 ? '' : 's'}
        </p>
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <p>Nothing in this drawer just now. Browse the vault from the menu.</p>
        )}
      </div>
    </main>
  );
}
