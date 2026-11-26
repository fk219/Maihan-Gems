/**
 * apps/web/src/app/(storefront)/cart/page.tsx
 *
 * M4 — replaced by the reference applet cart page (verbatim markup); the
 * rendered CartPageClient is the M1 applet component wired to the repo's
 * REAL commerce seam through `lib/mgh/adapters/commerce` (merged tray =
 * the applet provider bag + the authoritative server cart).
 */
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { resolveSiteOrigin } from '../../../lib/site-origin.js';
import { CartPageClient } from '@/components/mgh/catalog/CartPageClient';
import '../../../styles/portal-premium.css';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  // The canonical base is SITE_URL when configured, otherwise the origin of
  // the request. A deployment with neither gets no canonical rather than an
  // invented domain (and no runtime crash).
  const base = resolveSiteOrigin(await headers());
  return {
    title: 'Vault Selection Cart',
    description: 'Review your selected loose gemstones, matched pairs, and custom settings.',
    ...(base === null ? {} : { alternates: { canonical: `${base}/cart` } }),
    robots: { index: false, follow: false },
  };
}

export default function CartPage() {
  return (
    <ClientSurface>
      <div className="client-frame">
        <div className="portal-top__where">
          <span>Client atelier</span>
          <span aria-hidden="true">/</span>
          <b>Vault tray</b>
        </div>
        <div className="checkout-head" style={{ marginTop: 8 }}>
          <p className="portal-kicker">The private tray</p>
          <h1 className="portal-page-title">Vault Selection</h1>
          <p className="portal-page-sub">Review the specimens and settings held for your commission.</p>
        </div>
        <CartPageClient />
      </div>
    </ClientSurface>
  );
}
