import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: static client-approved marketing copy, ported
// verbatim from the reference applet (no CMS seam for this page in the repo).
const LEDE =
  'Transparent 3-, 6-, and 12-month vault acquisition schedules for loose gemstones and custom Geneva commissions, with zero early-settlement penalties.';

export const metadata: Metadata = {
  title: 'Private Vault Financing & Staged Settlement',
  description: LEDE,
  alternates: { canonical: `${SITE_URL}/financing` },
};

export default function FinancingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#141413]">Vault Financing</li>
        </ol>
      </nav>

      <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
          CLIENT TREASURY SERVICES
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
          Private Vault Financing &amp; Staged Settlement
        </h1>
        <p className="text-base text-[#52504C] leading-relaxed">{LEDE}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="rounded border border-[#E2DFD7] bg-white p-6 space-y-2">
          <p className="font-[family-name:var(--font-mono)] text-[#78756F]">TERM 01 · BESPOKE BENCH</p>
          <h2 className="text-lg font-semibold text-[#141413]">50% / 50% Commission Split</h2>
          <p className="text-[#52504C] leading-relaxed">
            For Design Your Own commissions: 50% deposit upon loose stone reservation and CAD
            approval; 50% balance upon completed Geneva assay hallmarking prior to dispatch.
          </p>
        </div>
        <div className="rounded border border-[#E2DFD7] bg-white p-6 space-y-2">
          <p className="font-[family-name:var(--font-mono)] text-[#78756F]">TERM 02 · 3-MONTH VAULT HOLD</p>
          <h2 className="text-lg font-semibold text-[#141413]">0% APR 3-Tranche Schedule</h2>
          <p className="text-[#52504C] leading-relaxed">
            Three equal monthly wire tranches while the specimen remains insured in our Geneva
            vault. Dispatched immediately upon final tranche reconciliation.
          </p>
        </div>
        <div className="rounded border border-[#E2DFD7] bg-white p-6 space-y-2">
          <p className="font-[family-name:var(--font-mono)] text-[#78756F]">TERM 03 · INSTITUTIONAL MEMO</p>
          <h2 className="text-lg font-semibold text-[#141413]">Private Collector Credit Line</h2>
          <p className="text-[#52504C] leading-relaxed">
            Available by application through our Geneva, New York, or London salons for acquisitions
            exceeding $15,000 USD.
          </p>
        </div>
      </div>
    </div>
  );
}
