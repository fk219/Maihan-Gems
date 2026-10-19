/**
 * apps/web/src/app/(storefront)/policy/[policySlug]/page.tsx
 *
 * `/policy/<slug>` — institutional policy pages (shipping, returns, privacy,
 * terms, appraisal, conflict-free sourcing). SoT 12.2.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { CmsBlockList } from '../../../../components/cms/CmsBlockView.js';
import { getCmsPageBySlug } from '../../../../lib/cms-pages.js';

interface PageProps {
  params: Promise<{ policySlug: string }>;
}

const POLICIES: Record<
  string,
  { title: string; eyebrow: string; summary: string; sections: { heading: string; body: string }[] }
> = {
  shipping: {
    title: 'Armoured Transit & Global Delivery Policy',
    eyebrow: 'Logistics & Custody',
    summary:
      'Every Maihan Gems parcel travels under full replacement insurance via Brink’s Global Services, Malca-Amit, or Ferrari Group.',
    sections: [
      {
        heading: 'Custodial Dispatch & Verification',
        body: 'Loose gemstones held in the Dubai DIFC or Bangkok Silom vaults are inspected and sealed with their accompanying laboratory reports before dispatch. Custom mountings require atelier fabrication prior to shipment.',
      },
      {
        heading: 'Customs, Duties & Import Documentation',
        body: 'International shipments include full Harmonized System (HS) tariff declarations, commercial invoices, and country-of-origin certificates. Applicable destination duties and import taxes are disclosed prior to settlement.',
      },
      {
        heading: 'Signature & Identity Release',
        body: 'High-value deliveries require government-issued identification and direct recipient signature at the verified shipping address or designated salon.',
      },
    ],
  },
  returns: {
    title: 'Returns, Inspection Window & Refund Policy',
    eyebrow: 'Client Assurance',
    summary:
      'Eligible loose gemstones and standard mountings carry a 14-day private inspection window from the date of verified delivery.',
    sections: [
      {
        heading: 'Inspection Window Conditions',
        body: 'Pieces must be returned in unaltered condition with the tamper-evident vault security seal intact and all original laboratory certificates (GIA, Gübelin, SSEF, or GRS) included.',
      },
      {
        heading: 'Bespoke & Engraved Commissions',
        body: 'Custom-fabricated commissions, engraved mountings, and modified settings are produced to individual specifications and are eligible for adjustment or exchange only in the event of a verified manufacturing defect.',
      },
      {
        heading: 'Refund Settlement Workflow',
        body: 'Return and refund requests can be initiated from your client order detail page. Once the returned stone passes gemmological verification in our laboratory, refunds are approved and credited to the original settlement instrument.',
      },
    ],
  },
  privacy: {
    title: 'Privacy & Data Protection Policy',
    eyebrow: 'Data Governance',
    summary:
      'Maihan Gems applies strict data minimisation, PII redaction in operational logs, and encrypted storage for private client records.',
    sections: [
      {
        heading: 'Information Collected',
        body: 'We collect only the identity, contact, shipping, and transaction records required to fulfill high-value gemstone acquisitions, customs declarations, and statutory anti-money-laundering obligations.',
      },
      {
        heading: 'Certificate & Biometric Privacy',
        body: 'Private appraisal dossiers are served via authenticated access controls. Virtual try-on camera frames are processed locally in device memory and are never transmitted to or stored on Maihan Gems servers.',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions of Sale',
    eyebrow: 'Commercial Governance',
    summary:
      'All acquisitions from Maihan Gems are governed by authoritative server-side pricing, verified gemmological disclosures, and atomic stock reservation rules.',
    sections: [
      {
        heading: 'Authoritative Pricing & Availability',
        body: 'Because natural gemstones are unique 1-of-1 mineral specimens, availability is confirmed inside a transactional checkout reservation. Display currency conversions are indicative until locked in a checkout session.',
      },
      {
        heading: 'Treatment & Provenance Honesty',
        body: 'We disclose every known thermal or clarity enhancement verbatim from the laboratory record. Where a field is unverified or unknown in source evidence, it is explicitly marked as such and never stated as fact.',
      },
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { policySlug } = await params;
  const key = policySlug.toLowerCase();
  const entry = POLICIES[key];
  return {
    title: entry ? `${entry.title} | Maihan Gems` : `Policy: ${policySlug} | Maihan Gems`,
    description: entry?.summary ?? 'Maihan Gems institutional client policy and governance disclosures.',
  };
}

export default async function PolicyPage({ params }: PageProps) {
  const { policySlug } = await params;
  const key = policySlug.toLowerCase();
  // CMS-first (doc 22: storefront renders the PUBLISHED head revision only);
  // the static institutional copy remains as the fallback when the CMS row
  // is absent — never the other way round.
  const cmsPage = await getCmsPageBySlug(key);
  const entry = POLICIES[key] ?? {
    title: policySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    eyebrow: 'Institutional Policy',
    summary:
      'Authoritative governance, provenance, and client protection standards of the Maihan Gems house.',
    sections: [
      {
        heading: 'Standard of Care',
        body: 'All transactions, shipments, and gemmological disclosures are bound by our Dubai DIFC and Bangkok Silom operational compliance standards.',
      },
    ],
  };

  return (
    <main className="page" id="main-content">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Policies', href: '/policy/terms' },
          { label: cmsPage?.title ?? entry.title },
        ]}
      />
      <span className="page-eyebrow">{entry.eyebrow}</span>
      <h1>{cmsPage?.title ?? entry.title}</h1>
      {cmsPage && cmsPage.blocks.length > 0 ? (
        <div className="lx-account-grid" style={{ marginTop: '2rem' }}>
          <section className="lx-account-card">
            <CmsBlockList blocks={cmsPage.blocks} />
          </section>
        </div>
      ) : (
        <>
          <p className="page-subtitle">{entry.summary}</p>
          <div className="lx-account-grid" style={{ marginTop: '2rem' }}>
            {entry.sections.map((s) => (
              <section key={s.heading} className="lx-account-card">
                <h2 className="lx-account-card__title">{s.heading}</h2>
                <p className="lx-account-note" style={{ margin: 0, lineHeight: 1.7 }}>
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </>
      )}

      <nav className="lx-account-nav" aria-label="Policy navigation" style={{ marginTop: '2.5rem' }}>
        <Link href="/policy/shipping" className={key === 'shipping' ? 'is-on' : undefined}>
          Shipping &amp; Transit
        </Link>
        <Link href="/policy/returns" className={key === 'returns' ? 'is-on' : undefined}>
          Returns &amp; Refunds
        </Link>
        <Link href="/policy/privacy" className={key === 'privacy' ? 'is-on' : undefined}>
          Privacy
        </Link>
        <Link href="/policy/terms" className={key === 'terms' ? 'is-on' : undefined}>
          Terms of Sale
        </Link>
        <Link href="/contact">Contact Advisory →</Link>
      </nav>
    </main>
  );
}
