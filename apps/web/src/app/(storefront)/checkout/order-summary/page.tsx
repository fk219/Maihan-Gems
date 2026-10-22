/**
 * apps/web/src/app/(storefront)/checkout/order-summary/page.tsx
 *
 * `/checkout/order-summary` — checkout step 1 (target of the observed
 * /cart/order-summary 301). SoT 12.2. The review island bridges the guest
 * bag into a real server cart and opens a real checkout session with the
 * server-authoritative pricing snapshot.
 */
import type { Metadata } from 'next';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { CheckoutReview } from '../../../../components/checkout/CheckoutReview.js';
import { CheckoutTrust } from '../../../../components/checkout/CheckoutTrust.js';
import { VaultReveal } from '../../../../components/storefront/VaultReveal.js';

export const metadata: Metadata = {
  title: 'Order Summary | Maihan Gems Checkout',
  description: 'Review your order, then open a server-side checkout session with verified pricing and reserved stock.',
};

export default function CheckoutOrderSummaryPage() {
  return (
    <main className="page checkout-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bag', href: '/cart' },
          { label: 'Order Summary' },
        ]}
      />

      <div className="checkout-shell checkout-salon">
        <div className="checkout-salon__main">
        <VaultReveal stagger={0} className="checkout-steps">
          <div className="checkout-step checkout-step--active">
            <span>1</span>
            <span>Order Summary</span>
          </div>
          <div className="checkout-step">
            <span>2</span>
            <span>Delivery &amp; Payment</span>
          </div>
          <div className="checkout-step">
            <span>3</span>
            <span>Review &amp; Place</span>
          </div>
        </VaultReveal>

        <h1 style={{ color: 'var(--text-primary)', marginTop: '1.25rem' }}>Review Your Order</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Starting checkout opens a server-side session: the atelier re-confirms every price and reserves the
          1-of-1 stock for 30 minutes.
        </p>

        <CheckoutReview />
        </div>
        <CheckoutTrust step={1} />
      </div>
    </main>
  );
}
