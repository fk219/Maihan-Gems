/**
 * apps/web/src/app/(storefront)/cart/page.tsx
 *
 * `/cart` — the shopping bag.
 *
 * The page owns the masthead frame; CartView owns the state and the bag
 * contents. Keeping the breadcrumb outside the client island means the
 * document structure is server-rendered even while the bag is loading.
 */
import type { Metadata } from 'next';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { CartView } from '../../../components/commerce/CartView.js';

export const metadata: Metadata = {
  title: 'Atelier Shopping Bag | Maihan Gems',
  description: 'Review the pieces in your bag before checkout.',
};

export default function CartPage() {
  return (
    <main className="page cart-page mh-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Shopping bag' },
        ]}
      />

      <CartView />
    </main>
  );
}
