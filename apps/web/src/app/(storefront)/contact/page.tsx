import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { ContactViewingFormClient } from '@/components/mgh/content/ContactViewingFormClient';
import { SITE_URL } from '@/lib/mgh/site-url';

const LEDE =
  'Reserve a private viewing in Geneva, New York, or London.';

export const metadata: Metadata = {
  title: 'Private Viewing Concierge — Maihan Gems',
  description: LEDE,
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ salon?: string; sku?: string }>;
}) {
  const sp = await searchParams;
  // Private viewings are arranged personally — showrooms list returns with
  // the Sanity content increment (ADR-036). Honest single card meanwhile. 

  return (
    <div className="golden-cloud-gallery text-[#181613] font-[family-name:var(--font-eb-garamond)] min-h-[82vh]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.22em] text-[#7A7060]">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-[#181613]">Home</Link></li>
            <li aria-hidden="true">·</li>
            <li aria-current="page" className="text-[#8B6B23] font-semibold">Private Viewing</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
                SALON CONCIERGE
              </p>
              <div className="w-10 h-[1.5px] bg-[#C5A059]" />
              <h1 className="text-4xl sm:text-5xl font-normal text-[#181613] tracking-tight">
                Private Viewing
              </h1>
              <p className="text-base text-[#5C5346] leading-relaxed">{LEDE}</p>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-[22px] border border-[#E5D4B3] bg-white/95 p-6 shadow-[0_10px_28px_rgba(185,150,75,0.08)] space-y-1.5"
              >
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] text-[#8B6B23] font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>By appointment</span>
                </p>
                <p className="text-xl text-[#181613] font-medium">Private Viewing</p>
                <p className="text-sm text-[#5C5346]">
                  Viewings are arranged personally with the house. Our gemmologist confirms a time after your request.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ContactViewingFormClient initialSalon={sp.salon} initialSku={sp.sku} />
          </div>
        </div>
      </div>
    </div>
  );
}
