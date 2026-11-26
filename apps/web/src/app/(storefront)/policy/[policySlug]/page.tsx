/**
 * apps/web/src/app/(storefront)/policy/[policySlug]/page.tsx
 *
 * `/policy/<slug>` — policy documents.
 *
 * Only the provenance policy can be written from the platform's own rules.
 * Terms of service and privacy are legal documents; inventing them here would
 * be worse than publishing nothing. They render an honest "not published"
 * state instead of fabricated clauses.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';

interface PageProps {
  readonly params: Promise<{ policySlug: string }>;
}

function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { policySlug } = await params;
  return { title: `${labelFromSlug(policySlug)} policy | Maihan Gems` };
}

export default async function PolicyPage({ params }: PageProps) {
  const { policySlug } = await params;
  const label = labelFromSlug(policySlug);

  if (policySlug === 'provenance') {
    return (
      <main className="page policy-page mh-page">
        <Breadcrumbs
          crumbs={[{ label: 'Home', href: '/' }, { label: 'Policies' }, { label: 'Provenance' }]}
        />
        <EditorialMasthead
          eyebrow="Policy · Provenance"
          title="What the record carries"
          lead="This is the evidence policy the storefront actually enforces. It is short because it is a rule, not a marketing position."
        />

        <article className="sf-split">
          <div className="sf-prose">
            <h2>Evidence statuses</h2>
            <p>
              Every specification is stored with an evidence status: OBSERVED, EXTRACTED, PATTERN,
              INFERRED or UNKNOWN. The product page shows that status beside the value it
              qualifies. A value is never promoted because the page would look better with it.
            </p>
            <h2>INV-07 — no unverified truth</h2>
            <p>
              A document field whose verification status is not VERIFIED may never render as
              verified truth. A price with INFERRED evidence is labelled as inferred; a certificate
              that has not been verified is not displayed as if it had been.
            </p>
            <h2>INV-08 — derived identity is labelled</h2>
            <p>
              A derived identifier is not a confirmed external reference until its review state is
              APPROVED. Until then the storefront labels it as derived and does not present it as a
              source SKU.
            </p>
            <h2>What is deliberately absent</h2>
            <p>
              There is no blanket “100% natural”, no “certified” badge on a stone whose certificate
              has not been verified, and no claim about treatment, origin or shipping that the
              record does not contain. A blank field means the record is silent — not that the
              answer is favourable.
            </p>
            <h2>Corrections</h2>
            <p>
              If a record is wrong, the correction belongs in the record, with its evidence, not in
              a footnote on the page. Contact the salon with the reference and the correction will
              be reviewed.
            </p>
          </div>

          <aside className="sf-aside-note" aria-labelledby="policy-links">
            <h2 id="policy-links">Related</h2>
            <ul className="sf-footer__list">
              <li>
                <Link href="/policy/terms" style={{ color: '#474339' }}>
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/policy/privacy" style={{ color: '#474339' }}>
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/contact" style={{ color: '#474339' }}>
                  Contact the salon
                </Link>
              </li>
            </ul>
          </aside>
        </article>
      </main>
    );
  }

  return (
    <main className="page policy-page mh-page">
      <Breadcrumbs
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Policies' }, { label }]}
      />
      <EditorialMasthead
        eyebrow={`Policy · ${label}`}
        title="Not published"
        lead="This document is a legal policy. It has not been published in this environment, and the site does not invent clauses to fill the page."
      />
      <div className="empty-state">
        <h2 className="empty-state__title">{label} policy is not available.</h2>
        <p className="empty-state__body">
          When the policy is approved it will be published here with a version and an effective
          date. Until then, the provenance policy describes the one rule that governs every
          product record.
        </p>
        <div className="empty-state__action">
          <Link className="mh-cta" href="/policy/provenance">
            Read the provenance policy
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="mh-cta mh-cta--quiet" href="/contact">
            Contact the salon
          </Link>
        </div>
      </div>
    </main>
  );
}
