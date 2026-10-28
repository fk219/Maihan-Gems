import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: static client-approved marketing copy, ported
// verbatim from the reference applet (no CMS seam for this page in the repo;
// the order add-on seam is commerce-side and unchanged).
const LEDE =
  'Comprehensive atelier care covering annual claw tension inspection, ultrasonic bath or gentle solvent cleaning, and repolishing of minor facet abrasions.';

export const metadata: Metadata = {
  title: 'Maison Lifetime Protection & Lapidary Care Plan',
  description: LEDE,
  alternates: { canonical: `${SITE_URL}/protection-plan` },
};

export default function ProtectionPlanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#141413]">Protection Plan</li>
        </ol>
      </nav>

      <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
          STEWARDSHIP &amp; ATELIER MAINTENANCE
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
          Maison Protection &amp; Lapidary Care Plan
        </h1>
        <p className="text-base text-[#52504C] leading-relaxed">{LEDE}</p>
      </div>

      <div className="rounded border border-[#E2DFD7] bg-white p-6 space-y-4 text-sm text-[#52504C]">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#141413]">
          What Is Included With Every Mounted Piece
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-xs leading-relaxed">
          <li>
            <strong>Annual Prong &amp; Bezel Seat Check:</strong> Microscopic inspection of claw tips
            and under-gallery seats at our Geneva, New York, or London salons.
          </li>
          <li>
            <strong>Mineral-Safe Cleaning Protocol:</strong> Untreated corundum and spinel undergo
            calibrated steam and ultrasonic cleaning; oiled emeralds and cleavage-sensitive
            tanzanites are cleaned strictly by hand with non-solvent botanical solutions.
          </li>
          <li>
            <strong>Complimentary First Ring Sizing:</strong> Within 90 days of delivery on all
            solitaire, bezel, and trilogy ring settings.
          </li>
        </ul>
      </div>
    </div>
  );
}
