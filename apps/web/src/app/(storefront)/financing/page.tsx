/**
 * apps/web/src/app/(storefront)/financing/page.tsx
 *
 * `/financing` — payment options.
 *
 * No financing programme is implemented or approved. The previous build left
 * this route blank; a blank page is not a policy. This page states the
 * position and explains what would have to be published before a financing
 * offer could appear.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';

export const metadata: Metadata = {
  title: 'Payment and financing | Maihan Gems',
  description: 'The payment options currently offered by Maihan Gems.',
};

export default function FinancingPage() {
  return (
    <main className="page financing-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Financing' }]} />

      <EditorialMasthead
        eyebrow="Payment"
        title="No instalment plan is offered here"
        lead="This site does not currently offer financing, layaway or a payment plan. Nothing in the configurator or the bag should be read as an offer of credit."
      />

      <section className="sf-split">
        <div className="sf-prose">
          <h2>What would have to be published first</h2>
          <p>
            A financing offer needs a named provider, a representative APR, a deposit, a term, an
            eligibility rule and a statement of the total amount payable. None of those is
            approved for this site, so none of them is shown.
          </p>
          <p>
            If a programme is introduced, its terms will be published before the first button that
            offers it. A payment option is a regulated product; a decorative “from $X per month”
            line is not an adequate disclosure.
          </p>
          <h2>What is available now</h2>
          <p>
            The bag shows a subtotal from the records it contains. Shipping, duties and
            documentation are not added silently; they are quoted when an order is agreed. The
            checkout route explains its own state.
          </p>
        </div>

        <aside className="sf-aside-note" aria-labelledby="financing-contact">
          <h2 id="financing-contact">Discuss a purchase</h2>
          <p>
            For a high-value piece, a private conversation is more useful than a credit form.
            Call the salon with the reference of the piece you are considering.
          </p>
          <Link className="sf-text-link" href="/contact">
            Contact the salon <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>
    </main>
  );
}
