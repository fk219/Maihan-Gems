import type { Metadata } from 'next';
import { ComparePageClient } from '@/components/mgh/catalog/ComparePageClient';
import { SITE_URL } from '@/lib/mgh/site-url';
import '../../../styles/portal-premium.css';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare | Maihan Gems',
  description: 'Side-by-side specification table for vault pieces.',
  alternates: { canonical: `${SITE_URL}/compare` },
  robots: { index: false, follow: false },
};

export default function ComparePage() {
  return (
    <ClientSurface>
      <div className="client-frame">
        <div className="portal-top__where">
          <span>Client atelier</span>
          <span aria-hidden="true">/</span>
          <b>Compare</b>
        </div>
        <div className="checkout-head" style={{ marginTop: 8 }}>
          <p className="portal-kicker">Gemological analysis</p>
          <h1 className="portal-page-title">Compare</h1>
          <p className="portal-page-sub">Carat, origin, cut and price, read as a dossier.</p>
        </div>
        <ComparePageClient />
      </div>
    </ClientSurface>
  );
}
