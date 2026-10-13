import type { Metadata } from 'next';

import { CompareView } from '../../../components/storefront/CompareView.js';
import { cardToAtelier } from '../../../lib/atelier-item.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Compare | Maihan Gems',
  description: 'Side-by-side specification table for vault pieces.',
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const products = await listProducts({ kind: 'gemstone', limit: 3 });
  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">Gemmological analysis</span>
        <h1 className="lx-h2">Compare</h1>
        <p className="lx-lede">Carat, origin, treatment and price, read as a dossier.</p>
        <CompareView demoItems={products.map(cardToAtelier)} forceEmpty={empty === '1'} />
      </div>
    </main>
  );
}
