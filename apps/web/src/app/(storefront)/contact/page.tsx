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
    <main className="page contact-page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Atelier Concierge' },
        ]}
      />

      <span className="page-eyebrow">Private client advisory</span>
      <h1>Contact the atelier</h1>
      <p className="page-subtitle">
        Arrange a private viewing, or commission a mounting with the goldsmiths.
      </p>

      <div className="salon-grid">
        <section className="salon-note">
          <p className="page-eyebrow">{STOREFRONT_CONTACT.appointmentLabel}</p>
          <h2>Direct line</h2>
          <p>
            {STOREFRONT_CONTACT.addressLine}
            <br />
            {STOREFRONT_CONTACT.city}, {STOREFRONT_CONTACT.region}
            <br />
            {STOREFRONT_CONTACT.hours}
          </p>
          <p>
            <a href={STOREFRONT_CONTACT.phoneHref}>{STOREFRONT_CONTACT.phoneDisplay}</a>
            <br />
            <a href={`mailto:${STOREFRONT_CONTACT.email}`}>{STOREFRONT_CONTACT.email}</a>
          </p>
        </section>

        <section className="salon-note">
          <p className="page-eyebrow">Appointments</p>
          <h2>Private viewing</h2>
          <p>
            Showroom visits are by appointment. Write or call using the details above until the house
            publishes a live booking calendar.
          </p>
        </section>
      </div>

      <section className="salon-note">
        <h2>Request a viewing</h2>
        <p>The configurator keeps the composition honest. The salons are listed separately.</p>
        <div className="maison-missing__actions">
          <Link href="/design-your-own" className="lx-btn lx-btn--solid">
            Design your own
          </Link>
          <Link href="/showrooms" className="lx-btn lx-btn--ghost">
            View the salons
          </Link>
        </div>
      </section>
    </main>
  );
}
