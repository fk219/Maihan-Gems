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
      <h1>Gemstone Varieties</h1>
      {varieties.length === 0 ? (
        <EmptyState title="No varieties are currently published." action={<Link href="/">Return home</Link>} />
      ) : (
        <ul className="link-list">
          {varieties.map((variety) => (
            <li key={variety.slug}>
              <Link href={`/${variety.slug}`}>{variety.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
