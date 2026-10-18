/**
 * apps/web/src/app/(storefront)/design-your-own/review/[configurationCode]/page.tsx
 *
 * `/design-your-own/review/<code>` — DYO review and cart conversion.
 * Target of the 9,812 DYO source URLs and interactive configurator commissions.
 *
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 7 (Tasks 8, 9)
 *   - technical_design/14_DYO_ARCHITECTURE.md
 *   - Design.md (Silk & Stone Haute Couture luxury design system)
 *
 * Honesty contract (INV-07): every specification below is rendered from the
 * canonical configuration row, its real catalogue components, and its real
 * price snapshot. Unresolved references render an explicit "not evidenced"
 * marker — the page never invents a stone, origin, treatment, SKU or price,
 * and never presents a review as verified when the engine did not verify it.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../../components/design-system/Breadcrumbs.js';
import { loadDyoReviewModel } from '../../../../../lib/dyo-server.js';
import { DyoReviewActions } from '../../../../../components/dyo/DyoReviewActions.js';

interface PageProps {
  params: Promise<{ configurationCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { configurationCode } = await params;
  return {
    title: `Configuration Review: ${configurationCode} | Maihan Gems`,
    description: `Formal review of bespoke configuration ${configurationCode}: real structural compatibility and the authoritative price snapshot.`,
  };
}

function formatUsd(amount: string): string {
  const n = Number(amount);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : amount;
}

function Row({ term, value }: { term: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#8A867E]">{term}</dt>
      <dd className="font-mono text-[#1A1A18] font-medium text-right">{value}</dd>
    </div>
  );
}

function NotEvidenced() {
  return <span className="text-[#8A867E] italic">Not yet evidenced in the vault</span>;
}

export default async function DyoReviewPage({ params }: PageProps) {
  const { configurationCode } = await params;
  const model = await loadDyoReviewModel(configurationCode);
  if (model === null) notFound();

  const { configuration, gemstone, settingVariant, quote } = model;
  const jewelleryType = configuration.jewellery_type;
  const state = configuration.state;
  const compatibilityStatus = configuration.compatibility_status;
  const engravingText = configuration.engraving_text;
  const ringSize = configuration.selected_options?.['ringSize'] as string | undefined;
  const metalOption = configuration.selected_options?.['metal'] as string | undefined;

  const compatibilityVerified = compatibilityStatus === 'COMPATIBLE';

  return (
    <main className="page dyo-review-page" id="main-content">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-6">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Design Your Own', href: '/design-your-own' },
            { label: `Review: ${configurationCode}` },
          ]}
        />
      </div>

      <div className="dyo-container">
        {/* Header */}
        <header className="dyo-header">
          <span className="eyebrow block mb-2">Bespoke Commission · Configuration Review</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#1A1A18] mb-3">
            Atelier Commission Review
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-[#8A867E]">
            <span>CODE: {configurationCode}</span>
            <span aria-hidden="true">·</span>
            <span>STATE: {state}</span>
            <span aria-hidden="true">·</span>
            <span>
              COMPATIBILITY:{' '}
              <span className={compatibilityVerified ? 'text-[#3D6B3D] font-semibold' : 'text-[#8A867E]'}>
                {compatibilityStatus}
              </span>
            </span>
          </div>
        </header>

        {/* Specification Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Mounting & Metal Specifications */}
          <article className="p-6 bg-white border border-[rgba(201,168,76,0.15)] rounded-[12px] shadow-sm">
            <span className="eyebrow block mb-3 text-[10px]">Architectural Mounting</span>
            <h2 className="font-serif text-2xl font-medium text-[#1A1A18] mb-1">
              {settingVariant?.name ?? <NotEvidenced />}
            </h2>
            <div className="text-xs text-[#8A867E] mb-4">
              {settingVariant?.designCode ? <>DESIGN {settingVariant.designCode}</> : null}
              {settingVariant?.designCode && settingVariant?.variantSku ? ' · ' : null}
              {settingVariant?.variantSku ? <>SKU {settingVariant.variantSku}</> : null}
              {!settingVariant ? <>Category: {jewelleryType}</> : null}
            </div>

            <dl className="space-y-2 text-xs border-t border-[rgba(0,0,0,0.06)] pt-4">
              <Row term="Jewellery type" value={settingVariant?.jewelleryType ?? jewelleryType} />
              <Row
                term="Precious metal"
                value={
                  settingVariant?.metalCode ?? (
                    metalOption ? `${metalOption} (selected in configurator)` : <NotEvidenced />
                  )
                }
              />
              {jewelleryType === 'RING' && ringSize ? (
                <Row term="Finger size" value={`US ${ringSize}`} />
              ) : null}
              {engravingText ? (
                <Row term="Engraving" value={<span className="font-serif italic">&ldquo;{engravingText}&rdquo;</span>} />
              ) : null}
              <Row term="Availability" value={
                settingVariant === null
                  ? <NotEvidenced />
                  : settingVariant.availability === true
                    ? 'Available'
                    : settingVariant.availability === false
                      ? 'Unavailable'
                      : <NotEvidenced />
              } />
            </dl>
          </article>

          {/* Mineralogy & Gemstone Specifications */}
          <article className="p-6 bg-white border border-[rgba(201,168,76,0.15)] rounded-[12px] shadow-sm">
            <span className="eyebrow block mb-3 text-[10px]">Mineralogical Entity</span>
            <h2 className="font-serif text-2xl font-medium text-[#1A1A18] mb-1">
              {gemstone?.variety ? (
                <>
                  {gemstone.variety}
                  {gemstone.colour ? <span className="text-[#8A867E] text-base"> · {gemstone.colour}</span> : null}
                </>
              ) : (
                <NotEvidenced />
              )}
            </h2>
            <div className="text-xs text-[#8A867E] mb-4">
              {gemstone?.gemRef ? <>REF {gemstone.gemRef}</> : null}
              {gemstone?.gemRef && gemstone.kind ? ' · ' : null}
              {gemstone?.kind ? (gemstone.kind === 'PAIR' ? 'Matched pair' : 'Single stone') : null}
            </div>

            <dl className="space-y-2 text-xs border-t border-[rgba(0,0,0,0.06)] pt-4">
              <Row term="Carat weight" value={
                gemstone?.totalWeightCt
                  ? `${Number(gemstone.totalWeightCt).toFixed(2)} ct${gemstone.kind === 'PAIR' ? ' (total)' : ''}`
                  : <NotEvidenced />
              } />
              <Row term="Shape & cut" value={
                [gemstone?.shape, gemstone?.cutLabel].filter(Boolean).join(' · ') || <NotEvidenced />
              } />
              <Row term="Origin" value={gemstone?.origin ?? <NotEvidenced />} />
              <Row term="Treatment" value={gemstone?.treatment ?? <NotEvidenced />} />
              <Row term="Availability" value={
                gemstone === null
                  ? <NotEvidenced />
                  : gemstone.availability === true
                    ? 'Available'
                    : gemstone.availability === false
                      ? 'Unavailable'
                      : <NotEvidenced />
              } />
            </dl>
          </article>
        </div>

        {/* Structural Compatibility Ledger */}
        <section aria-labelledby="invariants-ledger-title" className="p-6 bg-[#FAFAF8] border border-[rgba(201,168,76,0.15)] rounded-[12px] mb-8">
          <h2 id="invariants-ledger-title" className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8A867E] mb-4">
            Structural Compatibility Ledger
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white rounded-[8px] border border-[rgba(201,168,76,0.12)]">
              <div className="flex items-center gap-2 font-semibold text-[#1A1A18] mb-1">
                <span className={compatibilityVerified ? 'text-[#3D6B3D]' : 'text-[#8A867E]'}>
                  {compatibilityVerified ? '✓' : '·'}
                </span>{' '}
                INV-01 Composition
              </div>
              <p className="text-[11px] text-[#8A867E] leading-relaxed">
                Exactly 1 mounting + 1 stone XOR 1 pair.
              </p>
            </div>

            <div className="p-3 bg-white rounded-[8px] border border-[rgba(201,168,76,0.12)]">
              <div className="flex items-center gap-2 font-semibold text-[#1A1A18] mb-1">
                <span className={compatibilityVerified ? 'text-[#3D6B3D]' : 'text-[#8A867E]'}>
                  {compatibilityVerified ? '✓' : '·'}
                </span>{' '}
                INV-02 Pair Rule
              </div>
              <p className="text-[11px] text-[#8A867E] leading-relaxed">
                Pairs attach exclusively to earrings.
              </p>
            </div>

            <div className="p-3 bg-white rounded-[8px] border border-[rgba(201,168,76,0.12)]">
              <div className="flex items-center gap-2 font-semibold text-[#1A1A18] mb-1">
                <span className={compatibilityVerified ? 'text-[#3D6B3D]' : 'text-[#8A867E]'}>
                  {compatibilityVerified ? '✓' : '·'}
                </span>{' '}
                INV-03 Single Stone
              </div>
              <p className="text-[11px] text-[#8A867E] leading-relaxed">
                Single stones attach to non-earring mountings.
              </p>
            </div>
          </div>

          {Array.isArray(configuration.compatibility_detail) && configuration.compatibility_detail.length > 0 ? (
            <ul className="mt-4 space-y-2 text-xs text-[#4A4740] border-t border-[rgba(0,0,0,0.05)] pt-4">
              {configuration.compatibility_detail.map((entry, index) => {
                const detail = entry as { ruleKind?: string; explanation?: string };
                return (
                  <li key={index} className="flex gap-2">
                    <span className="font-mono text-[#8A867E]">{detail?.ruleKind ?? 'RULE'}</span>
                    <span>{detail?.explanation ?? JSON.stringify(entry)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-[#8A867E] border-t border-[rgba(0,0,0,0.05)] pt-4">
              The compatibility engine has not recorded a rule-level verdict for this configuration yet.
              Request validation from the configurator or the advisory desk.
            </p>
          )}
        </section>

        {/* Authoritative Pricing Snapshot */}
        {quote ? (
          <section aria-labelledby="pricing-snapshot-title" className="p-6 bg-white border border-[rgba(201,168,76,0.15)] rounded-[12px] shadow-sm mb-6">
            <h2 id="pricing-snapshot-title" className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8A867E] mb-4">
              Price Snapshot ({quote.currency})
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm text-[#4A4740] pb-2 border-b border-[rgba(0,0,0,0.05)]">
                <span>Gemstone component</span>
                <span className="font-mono text-[#1A1A18]">{formatUsd(quote.gemstoneComponent)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-[#4A4740] pb-2 border-b border-[rgba(0,0,0,0.05)]">
                <span>Mounting component</span>
                <span className="font-mono text-[#1A1A18]">{formatUsd(quote.settingComponent)}</span>
              </div>
              {Number(quote.sideStoneComponent) > 0 ? (
                <div className="flex justify-between items-center text-sm text-[#4A4740] pb-2 border-b border-[rgba(0,0,0,0.05)]">
                  <span>Side stones</span>
                  <span className="font-mono text-[#1A1A18]">{formatUsd(quote.sideStoneComponent)}</span>
                </div>
              ) : null}
              {Number(quote.makingComponent) > 0 ? (
                <div className="flex justify-between items-center text-sm text-[#4A4740] pb-2 border-b border-[rgba(0,0,0,0.05)]">
                  <span>Making &amp; assembly</span>
                  <span className="font-mono text-[#1A1A18]">{formatUsd(quote.makingComponent)}</span>
                </div>
              ) : null}
              {Number(quote.taxComponent) > 0 ? (
                <div className="flex justify-between items-center text-sm text-[#4A4740] pb-2 border-b border-[rgba(0,0,0,0.05)]">
                  <span>Tax</span>
                  <span className="font-mono text-[#1A1A18]">{formatUsd(quote.taxComponent)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center pt-3 text-lg font-serif font-semibold text-[#1A1A18]">
                <span>Total</span>
                <span className="font-mono text-2xl text-[#8B6914]">{formatUsd(quote.total)}</span>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-[#8A867E]">
              Pricing rule {quote.pricingRuleVersion} · computed{' '}
              {new Date(quote.computedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              {quote.expiresAt ? ` · expires ${new Date(quote.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
              . A fresh quote is issued server-side at bag conversion.
            </p>
          </section>
        ) : (
          <section aria-labelledby="pricing-snapshot-title" className="p-6 bg-[#FAFAF8] border border-[rgba(201,168,76,0.15)] rounded-[12px] mb-6">
            <h2 id="pricing-snapshot-title" className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8A867E] mb-3">
              Price Snapshot
            </h2>
            <p className="text-sm text-[#4A4740]">
              No authoritative price snapshot exists for this configuration yet. The server issues a fresh
              quote when you add the configuration to your bag — no price is estimated here.
            </p>
          </section>
        )}

        {/* Interactive Client Conversion Actions */}
        <DyoReviewActions shortCode={configurationCode} />

        <p className="mt-6 text-xs text-[#8A867E]">
          Prefer concierge guidance? <Link href="/contact" className="underline hover:text-[#C9A84C]">Contact the advisory desk</Link>.
        </p>
      </div>
    </main>
  );
}
