/**
 * apps/web/src/app/(storefront)/checkout/secure-payment/page.tsx
 *
 * `/checkout/secure-payment` — checkout step 3 (target of the observed
 * /cart/secure-payment 301). SoT 12.2. The final review places the order
 * through the real confirm checkpoint and order endpoint; the resulting
 * confirmation is rendered from the authoritative order read model.
 */
import type { Metadata } from 'next';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { CheckoutConfirm } from '../../../../components/checkout/CheckoutConfirm.js';

export const metadata: Metadata = {
  title: 'Secure Payment | Maihan Gems Checkout',
  description: 'Final review and order placement. Settlement state is confirmed by the payment provider, never by this page.',
};

export default async function CheckoutSecurePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;

  return (
    <main className="page checkout-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bag', href: '/cart' },
          { label: 'Order Summary', href: '/checkout/order-summary' },
          { label: 'Secure Payment' },
        ]}
      />

      <div className="checkout-shell">
        <div className="checkout-steps">
          <div className="checkout-step checkout-step--completed">
            <span>✓</span>
            <span>Order Summary</span>
          </div>
          <div className="checkout-step checkout-step--completed">
            <span>✓</span>
            <span>Delivery &amp; Payment</span>
          </div>
          <div className="checkout-step checkout-step--active">
            <span>3</span>
            <span>Review &amp; Place</span>
          </div>
        </div>

        <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
          Checkpoint Funnel · Step 3 of 3
        </span>
        <h1 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Final Review &amp; Order</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Placing the order is idempotent and atomic: immutable price, gemstone and setting snapshots are taken
          at placement, and the state timeline is append-only.
        </p>

        {session ? (
          <CheckoutConfirm sessionId={session} />
        ) : (
          <div className="lx-account-card" role="status">
            <p className="lx-account-note">No checkout session in progress.</p>
            <a href="/checkout/order-summary" className="lx-btn lx-btn--solid">Start checkout</a>
          </div>
        )}
      </div>
    </main>
  );
}
