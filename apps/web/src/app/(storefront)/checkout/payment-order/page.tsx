/**
 * apps/web/src/app/(storefront)/checkout/payment-order/page.tsx
 *
 * `/checkout/payment-order` — checkout step 2 (target of the observed
 * /cart/payment-order 301). SoT 12.2. Delivery address and settlement
 * method are recorded through the real checkpoint endpoints; the server
 * rejects skipped steps.
 */
import type { Metadata } from 'next';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { CheckoutPayment } from '../../../../components/checkout/CheckoutPayment.js';
import { CheckoutTrust } from '../../../../components/checkout/CheckoutTrust.js';
import { VaultReveal } from '../../../../components/storefront/VaultReveal.js';

export const metadata: Metadata = {
  title: 'Payment Order | Maihan Gems Checkout',
  description: 'Provide delivery details and record the settlement method through the secure checkout checkpoints.',
};

export default async function CheckoutPaymentOrderPage({
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
          { label: 'Delivery & Payment' },
        ]}
      />

      <div className="checkout-shell checkout-salon">
        <div className="checkout-salon__main">
        <VaultReveal stagger={0} className="checkout-steps">
          <div className="checkout-step checkout-step--completed">
            <span>✓</span>
            <span>Order Summary</span>
          </div>
          <div className="checkout-step checkout-step--active">
            <span>2</span>
            <span>Delivery &amp; Payment</span>
          </div>
          <div className="checkout-step">
            <span>3</span>
            <span>Review &amp; Place</span>
          </div>
        </VaultReveal>

        <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
          Checkpoint Funnel · Step 2 of 3
        </span>
        <h1 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Delivery &amp; Settlement</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Each checkpoint is validated by the atelier system in order — details are stored server-side and the
          stock reservation clock keeps running.
        </p>

        {session ? (
          <CheckoutPayment sessionId={session} />
        ) : (
          <div className="lx-account-card" role="status">
            <p className="lx-account-note">No checkout session in progress.</p>
            <a href="/checkout/order-summary" className="lx-btn lx-btn--solid">Start checkout</a>
          </div>
        )}
        </div>
        <CheckoutTrust step={2} />
      </div>
    </main>
  );
}
