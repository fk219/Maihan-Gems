/**
 * apps/web/src/app/(storefront)/cart/page.tsx
 *
 * M4 — replaced by the reference applet cart page (verbatim markup); the
 * rendered CartPageClient is the M1 applet component wired to the repo's
 * REAL commerce seam through `lib/mgh/adapters/commerce` (merged tray =
 * the applet provider bag + the authoritative server cart).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { siteBaseUrl } from '../../../lib/jsonld.js';
import { CartPageClient } from '@/components/mgh/catalog/CartPageClient';

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">Vault Cart</li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6">
        <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#9A7B2C]">
          GENEVA VAULT TRAY
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#121211]">
          Vault Selection
        </h1>
      </div>

      <CartPageClient />
    </div>
  );
}
