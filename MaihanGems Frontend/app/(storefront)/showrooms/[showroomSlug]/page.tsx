import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getShowroomBySlug } from '@/lib/storefront-data';
import { SITE_URL } from '@/app/layout';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ showroomSlug: string }>;
}): Promise<Metadata> {
  const { showroomSlug } = await params;
  const salon = getShowroomBySlug(showroomSlug);
  if (!salon) {
    return {
      title: 'Salon Not Found',
      description: 'The requested showroom location does not exist.',
    };
  }
  return {
    title: `${salon.name} (${salon.city})`,
    description: salon.lede,
    alternates: { canonical: `${SITE_URL}/showrooms/${salon.slug}` },
  };
}

export default async function ShowroomDetailPage({
  params,
}: {
  params: Promise<{ showroomSlug: string }>;
}) {
  const { showroomSlug } = await params;
  const salon = getShowroomBySlug(showroomSlug);
  if (!salon) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[#52504C]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#141413]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/showrooms" className="hover:text-[#141413]">Showrooms</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#141413]">{salon.city}</li>
        </ol>
      </nav>

      <div className="rounded border border-[#E2DFD7] bg-white p-8 space-y-6">
        <div className="border-b border-[#E2DFD7] pb-6 space-y-2">
          <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
            PRIVATE VIEWING SALON · {salon.city.toUpperCase()}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
            {salon.name}
          </h1>
          <p className="text-base text-[#52504C] leading-relaxed">{salon.lede}</p>
        </div>

        <p className="text-sm text-[#52504C] leading-relaxed">{salon.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-t border-[#E2DFD7] pt-6">
          <div className="space-y-1.5">
            <h2 className="font-semibold text-[#141413]">Location &amp; Hours</h2>
            <p className="text-[#52504C]">{salon.address}</p>
            <p className="text-[#52504C]">{salon.hours}</p>
            <p className="font-[family-name:var(--font-mono)] text-[#141413]">{salon.phone}</p>
            <p className="text-[#78756F] pt-1">{salon.securityProtocol}</p>
          </div>
          <div className="space-y-1.5">
            <h2 className="font-semibold text-[#141413]">On-Site Gemological Capabilities</h2>
            <ul className="list-disc pl-4 space-y-1 text-[#52504C]">
              {salon.vaultCapabilities.map((cap) => (
                <li key={cap}>{cap}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2DFD7]">
          <Link
            href={`/contact?salon=${encodeURIComponent(salon.city)}`}
            className="inline-flex items-center px-5 py-2.5 text-xs font-semibold bg-[#1E3A5F] text-white rounded hover:bg-[#152944]"
          >
            Request Viewing at {salon.city} Salon →
          </Link>
        </div>
      </div>
    </div>
  );
}
