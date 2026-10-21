import type { Metadata } from 'next';

import { BagView } from '../../../components/storefront/BagView.js';

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

  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">Private reservation</span>
        <h1 className="lx-h2">Your bag</h1>
        <p className="lx-lede">Pieces held for viewing, priced in the currency you selected.</p>
        <BagView forceEmpty={empty === '1'} />
      </div>
    </main>
  );
}
