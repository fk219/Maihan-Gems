import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Scale, ShieldCheck } from 'lucide-react';
import { CompareViewClient } from '@/components/catalog/CompareViewClient';
import { SITE_URL } from '@/app/layout';

export const metadata: Metadata = {
  title: 'Compare by Category — Gemstones, Settings & Fine Jewellery | Maihan Gems',
  description:
    'Compare items of the same category side by side: natural loose gemstones, Geneva 18k & Platinum settings, or handcrafted fine jewellery.',
  alternates: {
    canonical: `${SITE_URL}/compare`,
  },
};

export default function ComparePage() {
  return (
    <div className="golden-cloud-gallery min-h-[84vh] text-[#181613] font-[family-name:var(--font-eb-garamond)]">
      {/* Editorial Header */}
      <section className="relative border-b border-[#E5D4B3] bg-gradient-to-br from-[#FFFDF9] via-[#FAF3E3] to-[#F3E4C2]/65 py-12 sm:py-16 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.2)_0%,transparent_70%)] blur-3xl"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5">
          <nav
            aria-label="Breadcrumb"
            className="text-xs uppercase tracking-[0.22em] text-[#7A7060]"
          >
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-[#181613] transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li aria-current="page" className="text-[#8B6B23] font-semibold">
                Compare
              </li>
            </ol>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/85 border border-[#E5D4B3] text-[11px] uppercase tracking-[0.24em] text-[#8B6B23] font-semibold">
                <Scale className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>SAME-CATEGORY COMPARISON MATRIX</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#181613] leading-[1.08]">
                Side-by-Side Comparison.
              </h1>
              <p className="text-base sm:text-lg text-[#4E463A] leading-relaxed">
                To ensure accurate technical evaluation, comparisons are strictly grouped by category type—compare{' '}
                <strong className="font-semibold text-[#181613]">Loose Gemstones</strong> with Gemstones,{' '}
                <strong className="font-semibold text-[#181613]">Atelier Settings</strong> with Settings, or{' '}
                <strong className="font-semibold text-[#181613]">Fine Jewellery</strong> with Fine Jewellery.
              </p>
            </div>

            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-[#E5D4B3] bg-white/90 text-xs uppercase tracking-[0.18em] text-[#5C5346] shrink-0 self-start lg:self-auto">
              <ShieldCheck className="h-4 w-4 text-[#9A7B2C]" />
              <span>Category-Locked Spec Matrix</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Comparison Client */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <CompareViewClient />
      </div>
    </div>
  );
}
