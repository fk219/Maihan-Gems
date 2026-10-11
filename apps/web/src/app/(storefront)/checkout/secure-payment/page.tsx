/**
 * apps/web/src/app/(storefront)/checkout/secure-payment/page.tsx
 *
 * `/checkout/secure-payment` — checkout step 3 (target of the observed
 * /cart/secure-payment 301). SoT 12.2.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Secure Payment | Maihan Gems Checkout',
  description: 'Complete end-to-end encrypted bank wire, credit card, or escrow payment settlement.',
};

export default function CheckoutSecurePaymentPage() {
  return (
    <main className="page checkout-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Shopping Bag', href: '/cart' },
          { label: 'Payment Order', href: '/checkout/payment-order' },
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
            <span>Payment Order</span>
          </div>
          <div className="checkout-step checkout-step--active">
            <span>3</span>
            <span>Secure Settlement</span>
          </div>
        </div>

        <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>
          Checkpoint Funnel · Step 3 of 3
        </span>
        <h1 style={{ color: 'var(--text-primary)', marginTop: 0 }}>Secure Settlement Gateway</h1>
        <p className="page-subtitle" style={{ color: 'var(--text-secondary)' }}>
          Payment processing runs via high-security encrypted protocols. Funds remain in custodial escrow until laboratory dossier release.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', margin: '2rem 0' }}>
          <div style={{ padding: '1.5rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              International Bank Wire (SWIFT / IBAN)
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Direct settlement to Maihan Gems custodial corporate escrow in Dubai (Emirates NBD) or Geneva (Pictet / UBS). Wire instructions provided upon order creation.
            </p>
          </div>
          <div style={{ padding: '1.5rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Encrypted Digital Card &amp; Amex
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              PCI-DSS Level 1 compliant gateway with 3D-Secure 2.0 biometric multi-factor authentication.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Link href="/cart" className="btn-primary">
            View Current Bag
          </Link>
          <Link href="/contact" className="btn-secondary">
            Consult Private Client Advisory
          </Link>
        </div>
      </div>
    </main>
  );
}
