/**
 * apps/web/src/app/(storefront)/contact/page.tsx
 *
 * `/contact` — private appointments.
 *
 * The source evidence carries ONE observed salon identity (608 5th Avenue,
 * New York; +1-212-804-9994). The previous page invented a Dubai flagship, a
 * Geneva salon and "armored transit". Those are gone. What remains is the
 * address that is actually recorded, the telephone number, and a clear
 * statement of what an appointment can and cannot confirm.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';
import { ORGANIZATION_EVIDENCE } from '../../../lib/jsonld.js';

export const metadata: Metadata = {
  title: 'Private appointments | Maihan Gems',
  description: 'Arrange a private viewing at the Maihan Gems salon in New York.',
};

const a = ORGANIZATION_EVIDENCE;
const telHref = `tel:${a.telephone.replace(/[^+\d]/g, '')}`;

export default function ContactPage() {
  return (
    <main className="page contact-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />

      <EditorialMasthead
        eyebrow="Private appointments"
        title="By appointment"
        lead="A viewing is a conversation about one stone, not a tour of a showroom. Appointments are arranged by telephone so the piece and its documentation can be prepared before you arrive."
      />

      <section className="sf-contact-grid" aria-label="Salon contact">
        <div>
          <address className="sf-address">
            <span className="sf-address__name">Maihan Gems</span>
            <span className="sf-address__lines">
              {a.streetAddress}
              <br />
              {a.addressLocality}, {a.addressRegion} {a.postalCode}
              <br />
              United States
            </span>
            <a className="sf-address__phone" href={telHref}>
              {a.telephone}
            </a>
          </address>

          <p className="sf-fine-print" style={{ marginTop: 24 }}>
            The number and address above are the identity recorded in the source catalogue. No
            other salon is claimed on this site.
          </p>
        </div>

        <div>
          <ul className="sf-contact-list">
            <li>
              <span className="sf-contact-list__label">Appointments</span>
              <span>By telephone, Monday to Friday.</span>
            </li>
            <li>
              <span className="sf-contact-list__label">What to bring</span>
              <span>
                Any reference you already have — a product slug, a stone reference, or a setting
                design code — so the exact record can be opened.
              </span>
            </li>
            <li>
              <span className="sf-contact-list__label">What we can confirm</span>
              <span>
                The fields the record carries, its evidence status, its price and its availability.
              </span>
            </li>
            <li>
              <span className="sf-contact-list__label">What we will not confirm</span>
              <span>
                A treatment, origin, certificate or delivery date that the record does not contain.
              </span>
            </li>
          </ul>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <a className="mh-cta" href={telHref}>
              Call the salon
            </a>
            <Link className="mh-cta mh-cta--quiet" href="/showrooms">
              The salon
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
