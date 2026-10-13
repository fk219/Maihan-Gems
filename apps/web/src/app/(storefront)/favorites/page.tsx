import type { Metadata } from 'next';

import { FavoritesView } from '../../../components/storefront/FavoritesView.js';
import { cardToAtelier } from '../../../lib/atelier-item.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Favourites | Maihan Gems',
  description: 'Saved stones, pairs and mountings from the private vault.',
};

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const products = await listProducts({ kind: 'gemstone', limit: 3 });
  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">Client portfolio</span>
        <h1 className="lx-h2">Favourites</h1>
        <p className="lx-lede">A private shortlist of pieces you are watching.</p>
        <FavoritesView demoItems={products.map(cardToAtelier)} forceEmpty={empty === '1'} />
      </div>
    </main>
  );
}
