import type { Metadata } from 'next';
import { FavoritesPageClient } from '@/components/mgh/catalog/FavoritesPageClient';
import { SITE_URL } from '@/lib/mgh/site-url';
import '../../../styles/portal-premium.css';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Favourites | Maihan Gems',
  description: 'Saved stones, pairs and mountings from the private vault.',
  alternates: { canonical: `${SITE_URL}/favorites` },
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <ClientSurface>
      <div className="client-frame">
        <div className="portal-top__where">
          <span>Client atelier</span>
          <span aria-hidden="true">/</span>
          <b>Favourites</b>
        </div>
        <div className="checkout-head" style={{ marginTop: 8 }}>
          <p className="portal-kicker">Client portfolio</p>
          <h1 className="portal-page-title">Favourites</h1>
          <p className="portal-page-sub">A private shortlist of pieces you are watching.</p>
        </div>
        <FavoritesPageClient />
      </div>
    </ClientSurface>
  );
}
