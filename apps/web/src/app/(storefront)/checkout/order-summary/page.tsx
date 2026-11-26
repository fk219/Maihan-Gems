/**
 * apps/web/src/app/(storefront)/checkout/order-summary/page.tsx
 *
 * Checkout step 1 — the order summary.
 *
 * The bag is real: the client island reads the same cart token and endpoint
 * as /cart. The step after it is not enabled in this environment, and the
 * page says so before the visitor looks for a button that cannot work.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { CheckoutSteps } from '../../../../components/commerce/CheckoutSteps.js';
import { CheckoutBag } from '../../../../components/commerce/CheckoutBag.js';

export const metadata: Metadata = {
  title: 'Order summary | Maihan Gems',
  description: 'The contents and subtotal of your bag.',
};

export default function CheckoutOrderSummaryPage() {
  return (
    <main className="page checkout-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Bag', href: '/cart' },
          { label: 'Order summary' },
        ]}
      />

      <EditorialMasthead
        eyebrow="Checkout · Step 1 of 3"
        title="Order summary"
        lead="What the bag contains, and the subtotal those records produce. No shipping, duty or documentation is added here; those are quoted when an order is agreed."
      />

      <CheckoutSteps current={1} />
      <CheckoutBag />

      <div className="sf-checkout__notice" role="status">
        <strong>Checkout is not enabled in this environment.</strong> The summary above is read
        from the live bag; no payment can be taken and no order will be created. This is a state,
        not a failure.
      </div>

      <div className="sf-checkout__actions">
        <Link className="mh-cta mh-cta--quiet" href="/cart">
          Return to the bag
        </Link>
        <Link className="sf-text-link" href="/contact">
          Ask the salon <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}
