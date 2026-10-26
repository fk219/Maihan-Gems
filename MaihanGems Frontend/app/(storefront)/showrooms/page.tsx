import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllShowrooms } from '@/lib/storefront-data';
import { SITE_URL } from '@/app/layout';

const LEDE =
  'Private daylight salons in Geneva, New York, and London.';

export const metadata: Metadata = {
  title: 'Private Viewing Salons — Geneva · New York · London',
  description: LEDE,
  alternates: { canonical: `${SITE_URL}/showrooms` },
};

export default function ShowroomsIndexPage() {
  const showrooms = getAllShowrooms();

  return (
    <div className="golden-cloud-gallery text-[#181613] font-[family-name:var(--font-eb-garamond)] min-h-[80vh]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.22em] text-[#7A7060]">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-[#181613]">Home</Link></li>
            <li aria-hidden="true">·</li>
            <li aria-current="page" className="text-[#8B6B23] font-semibold">Salons</li>
          </ol>
        </nav>

        <div className="border-b border-[#E5D4B3] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              BY APPOINTMENT ONLY
            </p>
            <h1 className="mt-1 text-4xl sm:text-5xl font-normal text-[#181613] tracking-tight">
              Private Salons &amp; Vaults
            </h1>
          </div>
          <p className="text-sm text-[#5C5346] max-w-xs">{LEDE}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {showrooms.map((salon) => (
            <article
              key={salon.slug}
              className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-7 shadow-[0_14px_38px_rgba(185,150,75,0.1)] flex flex-col justify-between space-y-8"
            >
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.26em] text-[#8B6B23] font-semibold">
                  {salon.city.toUpperCase()} SALON
                </p>
                <h2 className="text-2xl sm:text-3xl font-normal text-[#181613]">
                  <Link href={`/showrooms/${salon.slug}`} className="hover:text-[#9A7B2C] transition-colors">
                    {salon.name}
                  </Link>
                </h2>
                <div className="text-sm text-[#5C5346] space-y-1.5 pt-3 border-t border-[#EFE6D4]">
                  <p className="text-[#181613] font-medium">{salon.address}</p>
                  <p>{salon.hours}</p>
                  <p className="text-[#8B6B23] font-semibold">{salon.phone}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#EFE6D4] text-xs uppercase tracking-[0.18em]">
                <Link href={`/showrooms/${salon.slug}`} className="text-[#6E6250] hover:text-[#181613] underline underline-offset-4">
                  Salon Dossier
                </Link>
                <Link
                  href={`/contact?salon=${encodeURIComponent(salon.city)}`}
                  className="px-5 py-2.5 rounded-full font-bold gold-gradient-cta transition-all"
                >
                  Reserve
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
