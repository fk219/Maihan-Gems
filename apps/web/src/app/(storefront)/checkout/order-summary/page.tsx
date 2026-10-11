/**
 * apps/web/src/app/(storefront)/checkout/order-summary/page.tsx
 *
 * `/checkout/order-summary` — checkout step 1 (target of the observed
 * /cart/order-summary 301). SoT 12.2. Route structure only; checkout is
 * Phase 6 (four-step funnel with server checkpoints).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Order Summary | Maihan Gems Checkout',
  description: 'Review your fine gemstone order summary and configure checkout preferences.',
};

export default function CheckoutOrderSummaryPage() {
  return (
    <main className="page checkout-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Shopping Bag', href: '/cart' },
          { label: 'Order Summary' },
        ]}
      />

      <div className="checkout-shell">
        <div className="checkout-steps">
          <div className="checkout-step checkout-step--active">
            <span>1</span>
            <span>Order Summary</span>
          </div>
          <div className="checkout-step">
            <span>2</span>
            <span>Payment Order</span>
          </div>
          <div className="checkout-step">
            <span>3</span>
            <span>Secure Settlement</span>
          </div>
        </div>

        <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
          Checkpoint Funnel · Step 1 of 3
        </span>
        <h1 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Review Your Order</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Confirm your gemstone pieces, verified certificates, and insured delivery preferences before issuing the payment order.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', margin: '2rem 0' }}>
          <div style={{ padding: '1.5rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Insured Armoured Transit
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              All high-value parcels ship fully insured via Malca-Amit or Brink&apos;s Global Services, requiring direct passport verification upon delivery.
            </p>
          </div>
          <div style={{ padding: '1.5rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Lab Dossier &amp; Provenance
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Original laboratory reports (GIA, Gübelin, SSEF, or GRS) are sealed in tamper-evident security vaults accompanying your piece.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Link href="/checkout/payment-order" className="btn-primary">
            Proceed to Payment Order →
          </Link>
          <Link href="/cart" className="btn-secondary">
            Return to Shopping Bag
          </Link>
        </div>
      </div>
    </main>
  );
}
