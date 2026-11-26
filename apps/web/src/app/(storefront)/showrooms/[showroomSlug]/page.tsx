/**
 * apps/web/src/app/(storefront)/showrooms/[showroomSlug]/page.tsx
 *
 * `/showrooms/<slug>` — one salon record.
 *
 * Only one location is evidenced (New York). Every other slug is a real 404
 * rather than a blank page under a 200, which is what the previous version
 * returned.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { ORGANIZATION_EVIDENCE } from '../../../../lib/jsonld.js';

const a = ORGANIZATION_EVIDENCE;

const SALON_SLUGS = new Set(['new-york']);

interface PageProps {
  readonly params: Promise<{ showroomSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showroomSlug } = await params;
  if (!SALON_SLUGS.has(showroomSlug)) return { title: 'Salon' };
  return {
    title: 'New York salon | Maihan Gems',
    description: 'The Maihan Gems salon at 608 5th Avenue, New York.',
  };
}

export default async function ShowroomDetailPage({ params }: PageProps) {
  const { showroomSlug } = await params;
  if (!SALON_SLUGS.has(showroomSlug)) notFound();

  return (
    <main className="page showrooms-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'The salon', href: '/showrooms' },
          { label: 'New York' },
        ]}
      />

      <EditorialMasthead
        eyebrow="Salon · New York"
        title="By appointment"
        lead="The salon occupies the recorded Maihan Gems address. Appointments are arranged by telephone; a viewing is prepared around the specific record you want to see."
        meta={<span className="tabular">40.7590° N · 73.9800° W</span>}
      />

      <section className="sf-contact-grid">
        <div>
          <address className="sf-address">
            <span className="sf-address__name">{a.name}</span>
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
        </div>

        <div>
          <div className="sf-prose">
            <h2>What an appointment is for</h2>
            <p>
              A loose stone can be examined under a loupe against the fields its record carries.
              A mounting can be discussed as a design, with its recorded metal variants and their
              individual prices. A configured piece can be reviewed as a composition, provided the
              configuration is still valid.
            </p>
            <h2>What it is not</h2>
            <p>
              It is not a reservation. It is not a certificate. It is not a promise that a stone
              will be available on the day; availability is checked when you call, and again when
              a piece is set aside.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
            <Link className="mh-cta" href="/contact">
              Arrange an appointment
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/search">
              Search the catalogue
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
