/**
 * `/varieties` — variety hub over the FRESH registry (86 varieties, live
 * stone counts). F4: the dead catalog-server seam is replaced by fresh-api.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gemstone varieties | Maihan Gems',
};

interface VarietyRow {
  code: string;
  slug: string;
  name: string;
  family: string;
  stones: number;
}

export default async function VarietiesIndexPage() {
  let varieties: VarietyRow[] = [];
  try {
    const res = await fetch(
      `${process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010'}/api/v1/catalogue/varieties`,
      { cache: 'no-store' },
    );
    if (res.ok) varieties = (await res.json()).items ?? [];
  } catch {
    varieties = []; // honest empty state when fresh-api is offline
  }

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
        Explore our curated index of earth-mined mineral varieties across eleven
        gemstone families, from corundum to organic treasures.
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
                    {variety.family} family · {variety.stones} in vault
                  </span>
                  <h2 className="variety-card__name">
                    <Link href={`/${variety.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {variety.name}
                    </Link>
                  </h2>
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
