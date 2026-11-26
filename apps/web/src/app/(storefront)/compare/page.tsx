/**
 * apps/web/src/app/(storefront)/compare/page.tsx
 *
 * `/compare` — the comparison desk.
 *
 * The route exists and the comparison API is implemented, but this surface is
 * still an empty state: no product page exposes a "add to compare" control
 * yet. The page therefore states that plainly and offers the two useful next
 * steps instead of pretending a list is loading.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';

export const metadata: Metadata = {
  title: 'Compare pieces | Maihan Gems',
  description: 'Compare the fields each catalogue record actually carries.',
};

export default function ComparePage() {
  return (
    <main className="page compare-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Compare' }]} />

      <EditorialMasthead
        eyebrow="The comparison desk"
        title="Like for like"
        lead="A comparison is only useful when both records describe the same fields. This desk will show weight, colour, cut, metal and price side by side — and leave a cell open where a record does not carry the value."
      />

      <section className="sf-split" aria-labelledby="compare-empty">
        <div className="empty-state">
          <h2 className="empty-state__title" id="compare-empty">
            No pieces are on the desk.
          </h2>
          <p className="empty-state__body">
            Open a stone or a mounting and compare it from there. Until a product page has a
            compare control, this page stays empty rather than showing a list that does not exist.
          </p>
          <div className="empty-state__action">
            <Link className="mh-cta" href="/search">
              Search the catalogue
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/varieties">
              Browse varieties
            </Link>
          </div>
        </div>

        <aside className="sf-aside-note" aria-labelledby="compare-rule">
          <h2 id="compare-rule">The comparison rule</h2>
          <p>
            A cell is never filled from a sibling product. If a stone has no recorded origin, the
            origin row reads “not recorded” — it does not inherit the origin of the stone next to
            it.
          </p>
          <p>
            This is the same rule the product pages follow under INV-07: a value is shown with the
            evidence status it carries, and nothing is promoted by layout.
          </p>
        </aside>
      </section>
    </main>
  );
}
