/**
 * apps/web/src/app/(storefront)/showrooms/page.tsx
 *
 * `/showrooms` — showroom index (target of observed /showroom 301). SoT 12.2
 * `showrooms/page.tsx`.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'International Salons & Showrooms | Maihan Gems',
  description: 'Private gemstone viewing salons in Dubai, Geneva, London, and Bangkok.',
};

const SALONS = [
  {
    city: 'Dubai',
    quarter: 'DIFC Gate Village',
    address: 'Building 3, Level 4, Dubai International Financial Centre',
    phone: '+971 4 800 GEMS',
    hours: 'Sun – Thu: 10:00 – 19:00 (Private Appointment Only)',
  },
  {
    city: 'Geneva',
    quarter: 'Rue du Rhône',
    address: 'Rue du Rhône 42, 1204 Genève, Switzerland',
    phone: '+41 22 700 8820',
    hours: 'Mon – Fri: 10:00 – 18:30 (Private Appointment Only)',
  },
  {
    city: 'London',
    quarter: 'Mayfair High Jewellery',
    address: 'Old Bond Street 14, London W1S 4PP, United Kingdom',
    phone: '+44 20 7946 0912',
    hours: 'Mon – Fri: 10:00 – 18:00 (Private Appointment Only)',
  },
  {
    city: 'Bangkok',
    quarter: 'Silom Gem Quarter',
    address: 'Jewelry Trade Center, Silom Road, Bangkok 10500, Thailand',
    phone: '+66 2 630 1190',
    hours: 'Mon – Sat: 09:30 – 18:00 (Private Appointment Only)',
  },
];

export default function ShowroomsPage() {
  return (
    <main className="page showrooms-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Showrooms' },
        ]}
      />

      <span className="page-eyebrow">Global Atelier Presence</span>
      <h1>Private Salons &amp; Showrooms</h1>
      <p className="page-subtitle">
        Private salon viewings of certified untreated natural gemstones and master goldsmith mountings.
      </p>

      <div className="showroom-grid">
        {SALONS.map((salon) => (
          <article key={salon.city} className="showroom-card">
            <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>{salon.quarter}</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
              {salon.city} Atelier
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              {salon.address}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {salon.hours}
            </p>
            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-mono" style={{ fontSize: '13px', color: 'var(--gold-dark)', fontWeight: 600 }}>
                {salon.phone}
              </span>
              <Link href="/contact" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--gold)', textDecoration: 'none' }}>
                Book Salon →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
