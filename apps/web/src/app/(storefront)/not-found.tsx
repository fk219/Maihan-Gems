/**
 * apps/web/src/app/(storefront)/not-found.tsx
 *
 * The storefront's 404. Next uses the nearest not-found boundary; this one
 * keeps the header, footer and the catalogue's voice.
 */
import type { Metadata } from 'next';

import { CatalogNotFoundView } from '../../components/catalog/CatalogNotFoundView.js';

export const metadata: Metadata = {
  title: 'Not found | Maihan Gems',
};

export default function StorefrontNotFound() {
  return (
    <main className="page mh-page">
      <CatalogNotFoundView
        subject="page"
        browseHref="/varieties"
        browseLabel="Browse the varieties"
      />
    </main>
  );
}
