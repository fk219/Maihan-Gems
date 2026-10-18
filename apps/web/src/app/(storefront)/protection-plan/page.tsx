/**
 * apps/web/src/app/(storefront)/protection-plan/page.tsx
 *
 * `/protection-plan` — target of observed /extend-protection-plan 301 (SoT 13.1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Atelier Care & Protection Plan | Maihan Gems',
  description: 'Annual prong inspection, ultrasonic cleaning, repolishing, and mounting care for Maihan Gems pieces.',
};

export default function ProtectionPlanPage() {
  return (
    <main className="page" id="main-content">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Protection Plan' }]} />
      <span className="page-eyebrow">Lifetime Craftsmanship Care</span>
      <h1>Atelier Care &amp; Protection Plan</h1>
      <p className="page-subtitle">
        Comprehensive structural maintenance for bespoke mountings and finished fine jewellery.
      </p>

      <div className="lx-account-grid" style={{ marginTop: '2rem' }}>
        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Prong &amp; Seat Security Inspection</h2>
          <p className="lx-account-note" style={{ margin: 0 }}>
            Annual microscopic inspection of claw tension, bezel seating, and pavé gallery integrity at any
            Maihan Gems salon in Dubai, Bangkok, Geneva, or London.
          </p>
        </section>
        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Refinishing &amp; Rhodium Service</h2>
          <p className="lx-account-note" style={{ margin: 0 }}>
            Complimentary gentle cleaning,貴metal surface repolishing, and 18K white gold rhodium renewal
            performed by our master bench goldsmiths.
          </p>
        </section>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
        <Link href="/settings" className="lx-btn lx-btn--solid">
          Explore Atelier Settings
        </Link>
        <Link href="/contact" className="lx-btn lx-btn--ghost">
          Book a Care Appointment
        </Link>
      </div>
    </main>
  );
}
