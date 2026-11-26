/**
 * apps/web/src/app/(storefront)/showrooms/page.tsx
 *
 * `/showrooms` — the salon index.
 *
 * One observed location, not four invented ones. The page is an address
 * plate: where it is, when to call, and what an appointment is for.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';
import { ORGANIZATION_EVIDENCE } from '../../../lib/jsonld.js';

export const metadata: Metadata = {
  title: 'The salon | Maihan Gems',
  description: 'The Maihan Gems salon at 608 5th Avenue, New York.',
};

const a = ORGANIZATION_EVIDENCE;

export default function ShowroomsPage() {
  return (
    <main className="page showrooms-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'The salon' }]} />

      <EditorialMasthead
        eyebrow="The salon"
        title="One room, one stone"
        lead="Viewings are held by appointment at the New York address recorded for Maihan Gems. The salon is not a walk-in gallery; a piece is brought out because you asked to see it."
      />

      <section className="sf-split" aria-labelledby="salon-address">
        <div>
          <h2 id="salon-address" className="sf-eyebrow">
            New York
          </h2>
          <address className="sf-address" style={{ marginTop: 14 }}>
            <span className="sf-address__name">Maihan Gems</span>
            <span className="sf-address__lines">
              {a.streetAddress}
              <br />
              {a.addressLocality}, {a.addressRegion} {a.postalCode}
              <br />
              United States
            </span>
            <a className="sf-address__phone" href={`tel:${a.telephone.replace(/[^+\d]/g, '')}`}>
              {a.telephone}
            </a>
          </address>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <Link className="mh-cta" href="/contact">
              Arrange an appointment
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/showrooms/new-york">
              Salon details
            </Link>
          </div>
        </div>

        <aside className="sf-aside-note" aria-labelledby="salon-note">
          <h2 id="salon-note">Before you visit</h2>
          <p>
            Tell us which record you want to see. A loose stone and a mounted piece are prepared
            differently, and a setting may need a stone fitted before it can be shown as a piece.
          </p>
          <p>
            Nothing is reserved by making an appointment. Availability is confirmed at the time
            of the call, against the same record the product page reads.
          </p>
        </aside>
      </section>
    </main>
  );
}
