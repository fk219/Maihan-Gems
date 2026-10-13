/**
 * apps/web/src/app/(storefront)/contact/page.tsx
 *
 * `/contact` — target of the observed /contact-us 301. SoT 12.2
 * `contact/page.tsx`.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { STOREFRONT_CONTACT } from '@maihan/config';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Contact Atelier Concierge | Maihan Gems',
  description: 'Schedule a private appointment with our gemmologists in Dubai, Geneva, London, or Bangkok.',
};

export default function ContactPage() {
  return (
    <main className="page contact-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Atelier Concierge' },
        ]}
      />

      <span className="page-eyebrow">Private Client Advisory</span>
      <h1>Contact Atelier Concierge</h1>
      <p className="page-subtitle">
        Schedule a private gemstone viewing or commission a bespoke high-jewellery mounting with our master goldsmiths.
      </p>

      <div className="concierge-shell">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ padding: '1.75rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>Direct Line</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.5rem 0' }}>{STOREFRONT_CONTACT.appointmentLabel}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {STOREFRONT_CONTACT.addressLine}<br />
              {STOREFRONT_CONTACT.city}, {STOREFRONT_CONTACT.region}<br />
              {STOREFRONT_CONTACT.hours}<br />
              <strong className="font-mono" style={{ color: 'var(--gold-dark)', display: 'block', marginTop: '0.5rem' }}>
                {STOREFRONT_CONTACT.phoneDisplay}
              </strong>
              <a href={`mailto:${STOREFRONT_CONTACT.email}`} style={{ display: 'block', marginTop: '0.35rem', color: 'var(--gold-dark)' }}>
                {STOREFRONT_CONTACT.email}
              </a>
            </p>
          </div>

          <div style={{ padding: '1.75rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <span className="eyebrow" style={{ marginBottom: '0.35rem' }}>Appointments</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.5rem 0' }}>Private viewing</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Showroom visits are by appointment. Write or call using the placeholders above until the house publishes live contact details.
            </p>
          </div>
        </div>

        <div style={{ padding: '2rem', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Request Private Gemstone Viewing
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Our gemmologists arrange armored transit and secure salon viewings for qualified collectors and private clients.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/design-your-own" className="btn-primary">
              Launch Bespoke Configurator
            </Link>
            <Link href="/showrooms" className="btn-secondary">
              View International Salons
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
