/**
 * apps/web/src/app/(storefront)/favorites/page.tsx
 *
 * `/favorites` — saved pieces.
 *
 * Saving requires a customer session and the favourites API. This surface is
 * still an empty state; it says so, and it offers the collection rather than
 * a sign-in wall the visitor did not ask for.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../components/design-system/EditorialMasthead.js';

export const metadata: Metadata = {
  title: 'Saved pieces | Maihan Gems',
  description: 'Pieces you have set aside while considering them.',
};

export default function FavoritesPage() {
  return (
    <main className="page favorites-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Saved pieces' }]} />

      <EditorialMasthead
        eyebrow="Private selection"
        title="Saved pieces"
        lead="A place for the stones and mountings you want to return to. Saving is tied to your account, so the list follows you rather than the browser."
      />

      <div className="empty-state">
        <h2 className="empty-state__title">Nothing is saved yet.</h2>
        <p className="empty-state__body">
          When you save a piece it appears here with the price and availability its record
          carried at the time. A saved piece is not a reservation.
        </p>
        <div className="empty-state__action">
          <Link className="mh-cta" href="/varieties">
            Browse the varieties
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="mh-cta mh-cta--quiet" href="/account">
            Open your account
          </Link>
        </div>
      </div>
    </main>
  );
}
