/**
 * apps/web/src/app/(storefront)/checkout/payment-order/page.tsx
 *
 * Checkout step 2 — the payment order.
 *
 * No payment provider or order-placement flow is enabled. Rather than render
 * a form whose submit does nothing (the previous version rendered two
 * invented service promises instead), the page states the step's real state
 * and lists exactly what the step will collect when it opens.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { CheckoutSteps } from '../../../../components/commerce/CheckoutSteps.js';

export const metadata: Metadata = {
  title: 'Payment order | Maihan Gems',
  description: 'The recipient and billing details step of checkout.',
};

export default function CheckoutPaymentOrderPage() {
  return (
    <main className="page checkout-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bag', href: '/cart' },
          { label: 'Order summary', href: '/checkout/order-summary' },
          { label: 'Payment order' },
        ]}
      />

      <EditorialMasthead
        eyebrow="Checkout · Step 2 of 3"
        title="Payment order"
        lead="The recipient, the billing address and the delivery method. These details belong to an order; they are not collected until an order can be placed."
      />

      <CheckoutSteps current={2} />

      <div className="sf-checkout__panel">
        <h2>This step is not open.</h2>
        <p>
          The platform has no approved payment provider in this environment, so it does not
          collect recipient or billing details. A form here would be a promise the next step
          cannot keep.
        </p>
        <p>When the step opens it will ask for:</p>
        <ul className="sf-prose" style={{ paddingLeft: 20 }}>
          <li>the recipient name and a delivery address;</li>
          <li>a billing address and, where required, a tax identifier;</li>
          <li>the delivery method offered for the piece;</li>
          <li>confirmation that the summary is correct.</li>
        </ul>
      </div>

      <div className="sf-checkout__notice" role="status">
        <strong>No order has been created.</strong> Nothing has been charged and no details have
        been stored. The bag remains available.
      </div>

      <div className="sf-checkout__actions">
        <Link className="mh-cta mh-cta--quiet" href="/checkout/order-summary">
          Back to the summary
        </Link>
        <Link className="mh-cta" href="/cart">
          Return to the bag
        </Link>
      </div>
    </main>
  );
}
