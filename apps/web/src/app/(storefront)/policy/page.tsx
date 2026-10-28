import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, FileText, Truck, Scale, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { getAllPolicyPages } from '@/lib/mgh/storefront-data';
import { SITE_URL } from '@/lib/mgh/site-url';

// M6 editorial migration: the /policy hub from the reference applet, ported
// verbatim (the repo previously served only the detail route and had no hub).
export const metadata: Metadata = {
  title: 'Legal Hub, Privacy Policy & Terms of Sale | Maihan Gems',
  description:
    'Complete legal governance, Swiss FADP/GDPR privacy policy, terms of sale, insured vault shipping & returns, treatment disclosure, and ethical sourcing charter.',
  alternates: { canonical: `${SITE_URL}/policy` },
};

const POLICY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'privacy-policy': Lock,
  'terms-of-service': Scale,
  'shipping-and-returns': Truck,
  'treatment-disclosure': Sparkles,
  'ethical-sourcing': ShieldCheck,
};

export default function PolicyHubPage() {
  const policies = getAllPolicyPages();

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-sm text-[#6B5A45]">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-[#1A1612] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-[#1A1612]">
              Legal &amp; Compliance Hub
            </li>
          </ol>
        </nav>

        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#E5D4B3] bg-gradient-to-br from-[#231B12] via-[#1C1610] to-[#120E0A] p-8 sm:p-12 text-[#FAF3E3] shadow-[0_24px_60px_rgba(26,20,14,0.18)]">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/15 px-3.5 py-1 text-xs uppercase tracking-[0.22em] text-[#E6C97A]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Geneva Legal &amp; Gemological Registry
            </div>
            <h1 className="text-3xl sm:text-5xl font-normal tracking-tight text-white leading-[1.12]">
              Maison Governance, Client Privacy &amp; Terms of Sale
            </h1>
            <p className="text-base sm:text-lg text-[#D8CEBE] leading-relaxed">
              Every gemstone acquisition, bespoke commission, and mine-partner consignment at Maihan Gems is governed by Swiss commercial law, CIBJO Blue Book nomenclature, and strict client confidentiality.
            </p>
          </div>
        </section>

        {/* Policy Cards Grid */}
        <section aria-label="Legal and Policy Documents" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((doc) => {
            const Icon = POLICY_ICONS[doc.slug] || FileText;
            return (
              <Link
                key={doc.slug}
                href={`/policy/${doc.slug}`}
                className="group rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-7 sm:p-8 shadow-[0_12px_32px_rgba(36,26,14,0.06)] hover:border-[#C5A059] hover:shadow-[0_18px_42px_rgba(36,26,14,0.12)] transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-[#8C6D2F] font-semibold">
                      {doc.kicker}
                    </span>
                    <div className="h-10 w-10 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] flex items-center justify-center text-[#8C6D2F] group-hover:bg-[#C5A059] group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1612] group-hover:text-[#8C6D2F] transition-colors">
                    {doc.title}
                  </h2>
                  <p className="text-base text-[#5C4E3C] leading-relaxed">
                    {doc.lede}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#EFE5D1] flex items-center justify-between text-sm font-semibold text-[#8C6D2F]">
                  <span>{doc.sections.length} Statutory Clauses</span>
                  <span className="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                    Read Full Policy <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
