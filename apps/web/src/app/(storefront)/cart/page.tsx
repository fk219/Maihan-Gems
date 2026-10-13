import type { Metadata } from 'next';

import { BagView } from '../../../components/storefront/BagView.js';
import { cardToAtelier } from '../../../lib/atelier-item.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Bag | Maihan Gems',
  description: 'Reserved pieces from the private vault.',
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const { empty } = await searchParams;
  const [gems, settings] = await Promise.all([
    listProducts({ kind: 'gemstone', limit: 2 }),
    listProducts({ kind: 'setting', limit: 1 }),
  ]);
  const demoItems = [...gems.slice(0, 2), ...settings.slice(0, 1)].map(cardToAtelier);

  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">Private reservation</span>
        <h1 className="lx-h2">Your bag</h1>
        <p className="lx-lede">Pieces held for viewing, priced in the currency you selected.</p>
        <BagView demoItems={demoItems} forceEmpty={empty === '1'} />
      </div>
    </main>
  );
}
