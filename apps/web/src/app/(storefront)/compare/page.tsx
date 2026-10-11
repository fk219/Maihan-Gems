/**
 * apps/web/src/app/(storefront)/compare/page.tsx
 *
 * `/compare` — compare list (target of /compare-list 301). SoT 12.2
 * `compare/page.tsx`.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';

export const metadata: Metadata = {
  title: 'Gemstone Comparison | Maihan Gems',
  description: 'Compare carat weights, millimeter dimensions, and gemmological laboratory certifications side by side.',
};

export default function ComparePage() {
  return (
    <main className="page compare-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Gemstone Comparison' },
        ]}
      />

      <span className="page-eyebrow">Gemmological Analysis</span>
      <h1>Side-by-Side Comparison</h1>
      <p className="page-subtitle">
        Evaluate carat weight, dimensional proportions, crystal clarity, and lab certifications side-by-side with scientific precision.
      </p>

      <div className="vault-shell">
        <EmptyState
          title="No gemstones selected for comparison."
          action={
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/varieties" className="btn-primary">
                Browse Mineral Varieties
              </Link>
              <Link href="/search" className="btn-secondary">
                Search Gemstone Vault
              </Link>
            </div>
          }
        >
          Select up to 4 loose stones or fine settings from the catalogue to compare optical metrics and laboratory dossier details.
        </EmptyState>
      </div>
    </main>
  );
}
