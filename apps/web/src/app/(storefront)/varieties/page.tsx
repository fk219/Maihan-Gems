/**
 * apps/web/src/app/(storefront)/varieties/page.tsx
 *
 * `/varieties` — variety hub (SoT 13.2). Purely taxonomy-driven: every ACTIVE
 * variety in the Phase 3 taxonomy read model links to its dynamic route. No
 * hardcoded list — the taxonomy IS the data.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../../lib/catalog-server.js';
import { browsableVarieties } from '../../../lib/catalog-view.js';
import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';

// Route segment config. Catalog views render per request from the cached
// CatalogQueryService (doc 12.3: Server-rendered, cacheable, no per-user
// state); there is deliberately no build-time catalogue, so Next must not
// prerender this route (it would otherwise invoke the page with empty params
// during `next build`). Runtime caching stays in the service, not in Next.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gemstone varieties | Maihan Gems',
};

export default async function VarietiesIndexPage() {
  const taxonomy = (await catalogServer().getTaxonomy()).value;
  const varieties = browsableVarieties(taxonomy);

  return (
    <main className="page varieties-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Varieties' },
        ]}
      />
      <span className="page-eyebrow">Natural Mineralogy Directory</span>
      <h1>Gemstone Varieties</h1>
      <p className="page-subtitle">
        Explore our curated index of earth-mined, untreated mineral varieties.
        Authenticated under strict gemmological standards with verified species classification.
      </p>
      {varieties.length === 0 ? (
        <EmptyState title="No varieties are currently published." action={<Link href="/">Return home</Link>} />
      ) : (
        <ul className="varieties-grid">
          {varieties.map((variety) => (
            <li key={variety.slug}>
              <div className="variety-card">
                <div>
                  <span className="eyebrow" style={{ marginBottom: '0.25rem' }}>
                    Untreated Mineralogy
                  </span>
                  <h2 className="variety-card__name">
                    <Link href={`/${variety.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {variety.name}
                    </Link>
                  </h2>
                  <p className="variety-card__species">Verified Species Classification</p>
                </div>
                <div className="variety-card__links">
                  <Link href={`/${variety.slug}`} className="variety-card__sublink">
                    Loose Stones →
                  </Link>
                  <Link href={`/${variety.slug}-pairs`} className="variety-card__sublink">
                    Matched Pairs →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
