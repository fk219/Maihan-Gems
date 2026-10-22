/**
 * apps/web/src/app/(storefront)/financing/page.tsx
 *
 * `/financing` — private client settlement & financing information (SoT 13.1).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';

export const metadata: Metadata = {
  title: 'Settlement & Financing Options | Maihan Gems',
  description: 'Structured settlement, international bank wire, and private client payment options at Maihan Gems.',
};

export default function FinancingPage() {
  return (
    <main className="page" id="main-content">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Settlement & Financing' }]} />
      <span className="page-eyebrow">Private Client Settlement</span>
      <h1>Settlement &amp; Financing Options</h1>
      <p className="page-subtitle">
        Transparent multi-currency pricing in USD, AED, and THB with structured payment and custodial reservation options.
      </p>

      <div className="salon-essay">
        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Direct Settlement &amp; Wire</h2>
          <p className="lx-account-note" style={{ margin: 0 }}>
            Orders placed through the checkout funnel lock your authoritative USD price snapshot and reserve
            1-of-1 gemstone inventory during settlement verification.
          </p>
        </section>
        <section className="lx-account-card">
          <h2 className="lx-account-card__title">Structured Financing Add-On</h2>
          <p className="lx-account-note" style={{ margin: 0 }}>
            Eligible acquisitions may attach a structured financing or split-settlement plan modeled as an
            auditable order add-on line. Contact Private Client Advisory for bespoke institutional terms.
          </p>
        </section>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
        <Link href="/browse" className="lx-btn lx-btn--solid">
          Browse the Vault
        </Link>
        <Link href="/contact" className="lx-btn lx-btn--ghost">
          Speak with an Advisor
        </Link>
      </div>
    </main>
  );
}
