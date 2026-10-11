/**
 * apps/web/src/app/(storefront)/favorites/page.tsx
 *
 * `/favorites` — wishlist. SoT 12.2 `favorites/page.tsx`.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';

export const metadata: Metadata = {
  title: 'Curated Vault Favorites | Maihan Gems',
  description: 'Your saved 1-of-1 untreated gemstones and bespoke setting favorites.',
};

export default function FavoritesPage() {
  return (
    <main className="page favorites-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vault Favorites' },
        ]}
      />

      <span className="page-eyebrow">Client Private Portfolio</span>
      <h1>Your Curated Vault</h1>
      <p className="page-subtitle">
        Save and monitor 1-of-1 earth-mined loose gemstones, matched suites, and bespoke goldsmith settings.
      </p>

      <div className="vault-shell">
        <EmptyState
          title="Your Vault Wishlist is currently empty."
          action={
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/varieties" className="btn-primary">
                Explore Loose Gemstones
              </Link>
              <Link href="/design-your-own" className="btn-secondary">
                Configure Bespoke Atelier
              </Link>
            </div>
          }
        >
          Add rare certified gems or master mountings to your vault to monitor availability and request private salon viewings.
        </EmptyState>
      </div>
    </main>
  );
}
