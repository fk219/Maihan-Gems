/**
 * apps/web/src/app/(storefront)/checkout/payment-order/page.tsx
 *
 * `/checkout/payment-order` — checkout step 2 (target of the observed
 * /cart/payment-order 301). SoT 12.2.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Payment Order | Maihan Gems Checkout',
  description: 'Issue customer payment order and verify delivery address details.',
};

export default function CheckoutPaymentOrderPage() {
  return (
    <main className="page checkout-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Shopping Bag', href: '/cart' },
          { label: 'Order Summary', href: '/checkout/order-summary' },
          { label: 'Payment Order' },
        ]}
      />

      <div className="checkout-shell">
        <div className="checkout-steps">
          <div className="checkout-step checkout-step--completed">
            <span>✓</span>
            <span>Order Summary</span>
          </div>
          <div className="checkout-step checkout-step--active">
            <span>2</span>
            <span>Payment Order</span>
          </div>
          <div className="checkout-step">
            <span>3</span>
            <span>Secure Settlement</span>
          </div>
        </div>

        <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
          Checkpoint Funnel · Step 2 of 3
        </span>
        <h1 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Payment Order Details</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Provide the recipient identity and billing details to authorize payment order reservation.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', margin: '2rem 0' }}>
          <div style={{ padding: '1.5rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Vault Reservation Lock
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Upon issuing the payment order, the selected 1-of-1 gemstones are temporarily locked in the inventory vault for 30 minutes to guarantee exclusivity during checkout.
            </p>
          </div>
          <div style={{ padding: '1.5rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Tax &amp; Customs Cleared
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Compliant with UAE, GCC, and International cross-border luxury customs regulations. Complete harmonized tariff documentation accompanies shipment.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Link href="/checkout/secure-payment" className="btn-primary">
            Proceed to Secure Payment →
          </Link>
          <Link href="/checkout/order-summary" className="btn-secondary">
            Back to Order Summary
          </Link>
        </div>
      </div>
    </main>
  );
}
