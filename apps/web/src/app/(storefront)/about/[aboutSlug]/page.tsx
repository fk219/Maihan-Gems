/**
 * apps/web/src/app/(storefront)/about/[aboutSlug]/page.tsx
 *
 * `/about/<slug>` — the atelier's own pages (the observed /meet-our-team and
 * /michael-arnstein redirect here).
 *
 * There is no published CMS document in this environment. Rather than invent
 * a founder biography, the page presents the atelier's operating rule and
 * states that the requested document has not been published. The slug is
 * echoed only as a label, never expanded into a claim.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';
import { ORGANIZATION_EVIDENCE } from '../../../../lib/jsonld.js';

interface PageProps {
  readonly params: Promise<{ aboutSlug: string }>;
}

function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { aboutSlug } = await params;
  return { title: `${labelFromSlug(aboutSlug)} | Maihan Gems` };
}

export default async function AboutPage({ params }: PageProps) {
  const { aboutSlug } = await params;
  const label = labelFromSlug(aboutSlug);
  const a = ORGANIZATION_EVIDENCE;

  return (
    <main className="page about-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'The atelier' },
          { label },
        ]}
      />

      <EditorialMasthead
        eyebrow="The atelier"
        title="A record, not a romance"
        lead="Maihan Gems buys, documents and mounts natural stones. The work is closer to cataloguing than to storytelling: identify the stone, record what is known, disclose what is not."
      />

      <section className="sf-split" aria-labelledby="about-document">
        <div className="sf-prose">
          <h2 id="about-document">This document is not published</h2>
          <p>
            The requested page — <strong>{label}</strong> — is a CMS document. No version of it
            is published in this environment, so there is nothing here to read. The address is
            kept because the source route redirects to it; the page does not invent a biography
            to fill the space.
          </p>
          <p>
            What can be stated without a CMS is the operating rule: every specification is shown
            with the evidence status the record carries. A field that is not verified is never
            presented as verified truth.
          </p>
          <p>
            For the atelier&apos;s address and telephone, see the salon page. For the stones
            themselves, the catalogue is the honest place to start.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <Link className="mh-cta" href="/varieties">
              Browse the varieties
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/showrooms">
              The salon
            </Link>
          </div>
        </div>

        <aside className="sf-aside-note" aria-labelledby="about-contact">
          <h2 id="about-contact">The recorded identity</h2>
          <address className="sf-address">
            <span className="sf-address__name">{a.name}</span>
            <span className="sf-address__lines">
              {a.streetAddress}
              <br />
              {a.addressLocality}, {a.addressRegion} {a.postalCode}
            </span>
            <a className="sf-address__phone" href={`tel:${a.telephone.replace(/[^+\d]/g, '')}`}>
              {a.telephone}
            </a>
          </address>
        </aside>
      </section>
    </main>
  );
}
