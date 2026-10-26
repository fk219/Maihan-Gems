import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDyoConfigurationByCode, formatUsd } from '@/lib/storefront-data';
import { EvidenceValue } from '@/components/ui/EvidenceValue';
import { DyoReviewAddToCartButton } from '@/components/dyo/DyoReviewClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ configurationCode: string }>;
}): Promise<Metadata> {
  const { configurationCode } = await params;
  const decoded = decodeURIComponent(configurationCode);
  const record = getDyoConfigurationByCode(decoded);
  if (!record) {
    return {
      title: 'Configuration Not Found — Design Your Own',
      description: 'The requested Design Your Own configuration code does not exist in our ledger.',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `Review Configuration ${record.config.configurationCode} | Design Your Own`,
    description: `Bespoke configuration pairing ${record.stone.name} (${record.stone.sku}) with ${record.setting.name} in ${record.metal.label}.`,
    robots: { index: false, follow: false },
  };
}

export default async function DyoReviewPage({
  params,
}: {
  params: Promise<{ configurationCode: string }>;
}) {
  const { configurationCode } = await params;
  const decoded = decodeURIComponent(configurationCode);
  const record = getDyoConfigurationByCode(decoded);

  // Honesty rule: Bogus configuration code -> honest "Not found", never a plausible guess
  if (!record) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center space-y-5">
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#991B1B]">
          HTTP 404 · CONFIGURATION CODE NOT FOUND
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[#121211]">
          Configuration Not Found ({decoded})
        </h1>
        <p className="text-xs text-[#4E4C47] max-w-md mx-auto">
          No saved Design Your Own dossier exists for{' '}
          <code className="font-[family-name:var(--font-mono)] bg-[#EFECE6] px-1.5 py-0.5 rounded-sm">
            {decoded}
          </code>
          .
        </p>
        <div className="pt-3 flex flex-wrap justify-center gap-3">
          <Link
            href="/design-your-own"
            className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Start New Configuration
          </Link>
          <Link
            href="/design-your-own/review/DYO-MG-8841"
            className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
          >
            Sample (DYO-MG-8841)
          </Link>
        </div>
      </div>
    );
  }

  const { config, stone, setting, metal, totalPrice } = record;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/design-your-own" className="hover:text-[#121211]">Atelier DYO</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">
            {config.configurationCode}
          </li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#9A7B2C]">
            STEP 05 OF 05 · IMMUTABLE DOSSIER · {config.configurationCode}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#121211]">
            {stone.name} in {setting.name}
          </h1>
          <p className="text-xs text-[#4E4C47]">
            Unverified parameters state <span className="italic">Not evidenced</span> plainly.
          </p>
        </div>

        <DyoReviewAddToCartButton
          configurationCode={config.configurationCode}
          stoneName={stone.name}
          settingName={setting.name}
          metalLabel={metal.label}
          ringSize={config.ringSize}
          totalPrice={totalPrice}
          image={stone.images[0]}
        />
      </div>

      {/* Complete Attribute Matrix with Explicit NotEvidenced Placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gemstone Attributes */}
        <section className="rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4DFD5] pb-3">
            <div>
              <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7B2C]">
                SPECIMEN LEDGER
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                {stone.name}
              </h2>
            </div>
            <span className="text-sm font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
              {formatUsd(stone.price)}
            </span>
          </div>

          <dl className="divide-y divide-[#E4DFD5]/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Specimen ID / SKU</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[#121211]">{stone.sku}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Mineral Variety</dt>
              <dd className="text-[#121211]">{stone.variety}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Carat Weight</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {stone.carat.toFixed(2)} ct
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Shape &amp; Clarity</dt>
              <dd className="text-[#121211]">
                {stone.shape} · {stone.clarity}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Disclosed Treatment</dt>
              <dd className="text-right text-[#121211] font-medium">{stone.treatmentDisclosed}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Origin</dt>
              <dd className="text-[#121211]">{stone.origin}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Mining Sub-District</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={stone.evidence.miningDistrict} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Laboratory Report</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={stone.evidence.reportNumber} mono />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Fluorescence</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={stone.evidence.fluorescence} />
              </dd>
            </div>
          </dl>
        </section>

        {/* Setting & Bench Commission Attributes */}
        <section className="rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4DFD5] pb-3">
            <div>
              <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7B2C]">
                BENCH LEDGER
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                {setting.name}
              </h2>
            </div>
            <span className="text-sm font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
              {formatUsd(setting.basePrice + metal.priceDelta)}
            </span>
          </div>

          <dl className="divide-y divide-[#E4DFD5]/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Setting SKU</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[#121211]">{setting.sku}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Precious Metal Alloy</dt>
              <dd className="text-[#121211] font-medium">{metal.label}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Assay Hallmark</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={metal.hallmark} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Selected Ring / Mounting Size</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[#121211]">{config.ringSize}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Shank / Band Width</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={setting.bandWidthMm} mono />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Gallery Height</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={setting.galleryHeightMm} mono />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Engraving Inscription</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={config.engravingNote} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Bespoke Bench Calibration Note</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={config.bespokeBenchNote} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Assigned Master Setter</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={config.benchMasterAssigned} />
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
