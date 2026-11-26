/**
 * apps/web/src/app/(storefront)/protection-plan/page.tsx
 *
 * `/protection-plan` — target of the observed /extend-protection-plan 301.
 *
 * No protection plan is implemented or approved. A plan is a contract, and
 * inventing cover would be a promise the business cannot keep. The page
 * states that plainly and lists what a real plan would have to disclose.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';

export const metadata: Metadata = {
  title: 'Protection plan | Maihan Gems',
  description: 'The protection plan position for Maihan Gems pieces.',
};

export default function ProtectionPlanPage() {
  return (
    <main className="page protection-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Protection plan' }]} />

      <EditorialMasthead
        eyebrow="Care"
        title="No plan is currently in force"
        lead="This site does not sell or include a protection plan. No product page, bag line or checkout step should be read as insurance, a guarantee or a promise of repair."
      />

      <section className="sf-split">
        <div className="sf-prose">
          <h2>What a plan would have to say</h2>
          <p>
            Cover, exclusions, term, excess, claim process, the insurer and the law that governs
            the contract. A plan without those six facts is not a plan; it is a sentence that
            sounds reassuring.
          </p>
          <p>
            Jewellery cover also depends on the piece: a loose stone, a mounted ring and a pair of
            earrings do not raise the same questions. A single blanket policy would be the wrong
            shape.
          </p>
          <h2>What is true today</h2>
          <p>
            A piece is sold with the documentation its record carries, and no more. If you need
            insurance, arrange it with an insurer who will underwrite the specific piece; the salon
            can provide the record details an underwriter asks for.
          </p>
        </div>

        <aside className="sf-aside-note" aria-labelledby="protection-contact">
          <h2 id="protection-contact">Ask about a piece</h2>
          <p>
            For the record details of a specific stone or mounting — weight, metal, price
            evidence — call the salon with its reference.
          </p>
          <Link className="sf-text-link" href="/contact">
            Contact the salon <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>
    </main>
  );
}
