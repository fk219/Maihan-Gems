/**
 * apps/web/src/app/(storefront)/checkout/secure-payment/page.tsx
 *
 * Checkout step 3 — secure payment.
 *
 * There is no configured payment provider, no merchant account and no
 * settlement contract in this environment. The previous page invented
 * Emirates NBD, Pictet, UBS and "PCI-DSS Level 1". All of it is gone. What
 * remains is the honest state and the facts a payment step must disclose
 * before it can exist.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { CheckoutSteps } from '../../../../components/commerce/CheckoutSteps.js';

export const metadata: Metadata = {
  title: 'Secure payment | Maihan Gems',
  description: 'The settlement step of checkout.',
};

export default function CheckoutSecurePaymentPage() {
  return (
    <main className="page checkout-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bag', href: '/cart' },
          { label: 'Payment order', href: '/checkout/payment-order' },
          { label: 'Secure payment' },
        ]}
      />

      <EditorialMasthead
        eyebrow="Checkout · Step 3 of 3"
        title="Settlement"
        lead="A payment page is a contract with a provider. No provider is configured here, so this page does not dress one up."
      />

      <CheckoutSteps current={3} />

      <div className="sf-checkout__panel">
        <h2>No payment provider is configured.</h2>
        <p>
          The platform cannot accept a card, a bank transfer or an escrow instruction in this
          environment. No funds can be taken from this page, and no payment details should be
          entered anywhere on this site.
        </p>
        <p>Before a settlement page is published it must state:</p>
        <ul className="sf-prose" style={{ paddingLeft: 20 }}>
          <li>the legal entity receiving the funds;</li>
          <li>the provider and the currencies it accepts;</li>
          <li>the total payable, including any taxes or duties;</li>
          <li>the authentication method required by the provider;</li>
          <li>the refund and chargeback route.</li>
        </ul>
      </div>

      <div className="sf-checkout__notice" role="status">
        <strong>Nothing has been charged.</strong> This is the final state of the checkout in this
        environment. The bag is still yours and can be reviewed at any time.
      </div>

      <div className="sf-checkout__actions">
        <Link className="mh-cta" href="/cart">
          Return to the bag
        </Link>
        <Link className="mh-cta mh-cta--quiet" href="/contact">
          Speak to the salon
        </Link>
      </div>
    </main>
  );
}
