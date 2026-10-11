/**
 * apps/web/src/app/(storefront)/cart/page.tsx
 *
 * `/cart` — shopping bag and order conversion entry.
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 6
 *   - Design.md (Silk & Stone luxury brand specification)
 */
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { CartView } from '../../../components/commerce/CartView.js';

export const metadata: Metadata = {
  title: 'Atelier Shopping Bag | Maihan Gems',
  description: 'Review your selected certified gemstones, fine settings, and bespoke commissions.',
};

export default function CartPage() {
  return (
    <main className="page cart-page" id="main-content">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Shopping Bag' },
          ]}
        />
      </div>

      <CartView />
    </main>
  );
}
