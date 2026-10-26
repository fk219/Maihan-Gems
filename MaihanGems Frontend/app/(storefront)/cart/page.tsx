import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CartPageClient } from '@/components/catalog/CartPageClient';
import { SITE_URL } from '@/app/layout';

export const metadata: Metadata = {
  title: 'Vault Selection Cart',
  description: 'Review your selected loose gemstones, matched pairs, and custom settings.',
  alternates: {
    canonical: `${SITE_URL}/cart`,
  },
  robots: { index: false, follow: false },
};

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
