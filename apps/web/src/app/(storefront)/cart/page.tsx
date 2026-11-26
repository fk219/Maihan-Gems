/**
 * apps/web/src/app/(storefront)/cart/page.tsx
 *
 * M4 — replaced by the reference applet cart page (verbatim markup); the
 * rendered CartPageClient is the M1 applet component wired to the repo's
 * REAL commerce seam through `lib/mgh/adapters/commerce` (merged tray =
 * the applet provider bag + the authoritative server cart).
 */
import type { Metadata } from 'next';

import { siteBaseUrl } from '../../../lib/jsonld.js';
import { CartPageClient } from '@/components/mgh/catalog/CartPageClient';
import '../../../styles/portal-premium.css';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vault Selection Cart',
  description: 'Review your selected loose gemstones, matched pairs, and custom settings.',
  alternates: {
    ...(canonicalBase() ? { canonical: `${canonicalBase()}/cart` } : {}),
  },
  robots: { index: false, follow: false },
};

/**
 * The applet page derived its canonical from its root layout's SITE_URL
 * constant; the repo keeps that data seam by reading the same server-side
 * base. A deployment without SITE_URL gets no canonical rather than an
 * invented domain.
 */
function canonicalBase(): string | null {
  try {
    return siteBaseUrl();
  } catch {
    return null;
  }
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
