/**
 * apps/web/src/app/(storefront)/showrooms/[showroomSlug]/page.tsx
 *
 * `/showrooms/<slug>` — individual salon detail & appointment information
 * (target of observed /showroom/preview 301, SoT 12.2 + 13.1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';

interface PageProps {
  params: Promise<{ showroomSlug: string }>;
}

const SHOWROOM_DETAILS: Record<
  string,
  { city: string; quarter: string; address: string; hours: string; note: string }
> = {
  dubai: {
    city: 'Dubai DIFC Salon',
    quarter: 'Gate Village, Building 3, Level 4',
    address: 'Dubai International Financial Centre, Dubai, United Arab Emirates',
    hours: 'Sunday – Thursday · 10:00 – 19:00 GST (By Appointment)',
    note: 'Primary Arabian Gulf vault holding certified loose sapphires, rubies, emeralds, and bespoke platinum mountings.',
  },
  bangkok: {
    city: 'Bangkok Silom Bourse Office',
    quarter: 'Jewelry Trade Center, Silom Road',
    address: 'Bang Rak, Bangkok 10500, Thailand',
    hours: 'Monday – Saturday · 09:30 – 18:00 ICT (By Appointment)',
    note: 'Primary Asian cutting, laboratory submission, and trade partner curation hub.',
  },
  geneva: {
    city: 'Geneva Rue du Rhône Salon',
    quarter: 'Rue du Rhône 42',
    address: '1204 Genève, Switzerland',
    hours: 'Monday – Friday · 10:00 – 18:30 CET (By Appointment)',
    note: 'Private European viewing salon with direct access to SSEF and Gübelin laboratory dossier services.',
  },
  london: {
    city: 'London Mayfair Salon',
    quarter: 'Old Bond Street 14',
    address: 'Mayfair, London W1S 4PP, United Kingdom',
    hours: 'Monday – Friday · 10:00 – 18:00 GMT (By Appointment)',
    note: 'Bespoke mounting consultations and private loose-stone viewings in the heart of Mayfair.',
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showroomSlug } = await params;
  const entry = SHOWROOM_DETAILS[showroomSlug.toLowerCase()];
  return {
    title: entry ? `${entry.city} | Maihan Gems Showrooms` : `Salon Preview: ${showroomSlug} | Maihan Gems`,
  };
}

export default async function ShowroomDetailPage({ params }: PageProps) {
  const { showroomSlug } = await params;
  const entry = SHOWROOM_DETAILS[showroomSlug.toLowerCase()] ?? {
    city: `Maihan Gems Salon · ${showroomSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    quarter: 'Private Viewing Suite',
    address: 'Dubai DIFC · Bangkok Silom · Geneva · London',
    hours: 'By Private Appointment Only',
    note: 'Reserve up to four loose gemstones or settings from the online vault for an in-person daylight viewing with a senior gemmologist.',
  };

  return (
    <main className="page showrooms-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Showrooms', href: '/showrooms' },
          { label: entry.city },
        ]}
      />
      <span className="page-eyebrow">{entry.quarter}</span>
      <h1>{entry.city}</h1>
      <p className="page-subtitle">{entry.note}</p>

      <div className="lx-account-card" style={{ maxWidth: '44rem', marginTop: '2rem' }}>
        <h2 className="lx-account-card__title">Salon Details</h2>
        <dl className="lx-account-rows">
          <div>
            <dt>Location</dt>
            <dd>{entry.address}</dd>
          </div>
          <div>
            <dt>Viewing Hours</dt>
            <dd>{entry.hours}</dd>
          </div>
          <div>
            <dt>Security Protocol</dt>
            <dd>Advance appointment &amp; photo ID required</dd>
          </div>
        </dl>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
          <Link href="/contact" className="lx-btn lx-btn--solid">
            Request Private Viewing
          </Link>
          <Link href="/showrooms" className="lx-btn lx-btn--ghost">
            All International Salons
          </Link>
        </div>
      </div>
    </main>
  );
}
