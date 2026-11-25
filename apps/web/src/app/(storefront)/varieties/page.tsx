/**
 * apps/web/src/app/(storefront)/varieties/page.tsx
 *
 * `/varieties` — the variety directory (SoT 13.2).
 *
 * Purely taxonomy-driven: every ACTIVE variety in the Phase 3 read model is
 * one row. No hardcoded list, no invented category, no counts.
 *
 * Design: an editorial directory rather than a wall of empty cards. The row
 * number is positional, not a catalogue count; the light rule under each row
 * is the only hover motion.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../../lib/catalog-server.js';
import { browsableVarieties } from '../../../lib/catalog-view.js';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';

// Route segment config: the taxonomy is request-time data, so `next build`
// never queries a database it does not have.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gemstone varieties | Maihan Gems',
};

export default async function VarietiesIndexPage() {
  const taxonomy = (await catalogServer().getTaxonomy()).value;
  const varieties = browsableVarieties(taxonomy);

  return (
    <main className="page varieties-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Varieties' },
        ]}
      />

      <EditorialMasthead
        eyebrow="Natural mineralogy"
        title="Gemstone Varieties"
        lead="The directory exactly as published: one entry per active variety in the taxonomy. Each entry opens the stone listing or the matched-pair listing."
        meta={
          <>
            <span className="tabular">{varieties.length}</span>{' '}
            {varieties.length === 1 ? 'variety' : 'varieties'} published
          </>
        }
      />

      {varieties.length === 0 ? (
        <EmptyState title="No varieties are currently published." action={<Link href="/">Return home</Link>}>
          Varieties appear here when the taxonomy marks them active.
        </EmptyState>
      ) : (
        <ul className="mh-directory">
          {varieties.map((variety, index) => (
            <li className="mh-directory__item" key={variety.slug}>
              <span className="mh-directory__index tabular" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="mh-directory__body">
                <h2 className="mh-directory__name">
                  <Link href={`/${variety.slug}`}>{variety.name}</Link>
                </h2>
                <div className="mh-directory__links">
                  <Link href={`/${variety.slug}-pairs`}>Matched pairs</Link>
                </div>
              </div>

              <span className="mh-directory__arrow" aria-hidden="true">
                →
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
