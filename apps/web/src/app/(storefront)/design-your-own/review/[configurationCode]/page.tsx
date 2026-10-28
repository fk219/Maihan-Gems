/**
 * apps/web/src/app/(storefront)/design-your-own/review/[configurationCode]/page.tsx
 *
 * `/design-your-own/review/{code}` — DYO review & commission conversion
 * (Phase 7 Tasks 8–9 per INITIAL_IMPLEMENTATION_PLAN; doc 14 DYO architecture).
 *
 * M5: this page renders the REFERENCE APPLET's review dossier (exact
 * markup/fonts/classes — the applet called it "Complete Attribute Matrix with
 * Explicit NotEvidenced Placeholders") while the repo's REAL review seam
 * stays authoritative:
 *
 *   - `loadDyoReviewModel` provides the canonical configuration row, its REAL
 *     component rows (gemstone / matched pair, setting variant) joined from
 *     the locked catalogue tables, and the configuration's own price
 *     snapshot (`dyo_price_snapshots`).
 *   - Every matrix cell renders from real columns only; a row that is absent
 *     renders the applet's `Not evidenced` marker (INV-07: unresolved
 *     references never render as verified truth, and no stone, origin,
 *     treatment, SKU or price is invented).
 *   - The "Acquire Commission" control runs the REAL add-to-cart conversion:
 *     fresh server quote → quote token → server cart line (INV-01/02/03
 *     enforced server-side). No client-side bag line exists.
 *   - Unknown codes render the applet's honest 404 block (plus a link back
 *     to the studio). The applet's fixture "sample" code is never fabricated
 *     here — the CTA links the REAL newest commission only when one exists.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { getDyoLedgerSample } from '@/lib/mgh/adapters/dyo.js';
import { EvidenceValue } from '@/components/mgh/ui/EvidenceValue';
import { DyoReviewAddToCartButton } from '@/components/mgh/dyo/DyoReviewClient';
import { loadDyoReviewModel } from '../../../../../lib/dyo-server.js';

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

/** Server-authoritative money formatting (cents kept; input is a DB text). */
function formatUsd(amount: string | null): string | null {
  if (amount === null) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export default async function DyoReviewPage({ params }: PageProps) {
  const { configurationCode } = await params;
  const decoded = decodeURIComponent(configurationCode);
  const model = await loadDyoReviewModel(decoded);

  // Honesty rule (INV-07 + the applet's own contract): a bogus configuration
  // code renders the applet's honest "Not found" block — never a plausible
  // guess, never a fabricated sample dossier.
  if (model === null) {
    const ledgerSample = await getDyoLedgerSample();
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
          {ledgerSample ? (
            <Link
              href={`/design-your-own/review/${encodeURIComponent(ledgerSample)}`}
              className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
            >
              Latest Commission ({ledgerSample})
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const { configuration, gemstone, settingVariant, quote } = model;
  const state = configuration.state;
  const compatibilityStatus = configuration.compatibility_status;
  const ringSize = configuration.selected_options?.['ringSize'] as string | undefined;
  const metalOption = configuration.selected_options?.['metal'] as string | undefined;

  // The server quote is the only price authority; component cells fall back
  // to the REAL joined component price columns, never an invented number.
  const stonePriceLabel =
    quote !== null
      ? formatUsd(quote.gemstoneComponent)
      : formatUsd(gemstone?.priceAmount ?? null);
  const benchPriceLabel =
    quote !== null
      ? formatUsd(quote.settingComponent)
      : formatUsd(settingVariant?.basePrice ?? null);
  const commissionTotalLabel = quote !== null ? formatUsd(quote.total) : null;

  const stoneName =
    [gemstone?.variety, gemstone?.colour].filter(Boolean).join(' · ') ||
    gemstone?.gemRef ||
    null;
  const settingName = settingVariant?.name ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <nav
        aria-label="Breadcrumb"
        className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]"
      >
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/design-your-own" className="hover:text-[#121211]">Atelier DYO</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">
            {configuration.short_code}
          </li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#9A7B2C]">
            STEP 05 OF 05 · IMMUTABLE DOSSIER · {configuration.short_code}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-semibold text-[#121211]">
            <EvidenceValue value={stoneName} /> in <EvidenceValue value={settingName} />
          </h1>
          <p className="text-xs text-[#4E4C47]">
            Unverified parameters state <span className="italic">Not evidenced</span> plainly.
          </p>
          <p className="text-xs font-[family-name:var(--font-mono)] text-[#76726A]">
            STATE: {state} · COMPATIBILITY:{' '}
            <span className={compatibilityStatus === 'COMPATIBLE' ? 'text-[#15803D]' : ''}>
              {compatibilityStatus}
            </span>
            {' · '}
            METAL: {metalOption ? <span>{metalOption}</span> : <EvidenceValue value={null} />}
          </p>
        </div>

        <DyoReviewAddToCartButton
          configurationCode={configuration.short_code}
          totalPriceLabel={commissionTotalLabel}
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
                <EvidenceValue value={stoneName} />
              </h2>
            </div>
            <span className="text-sm font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
              <EvidenceValue value={stonePriceLabel} mono />
            </span>
          </div>

          <dl className="divide-y divide-[#E4DFD5]/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Specimen ID / SKU</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[#121211]">
                <EvidenceValue value={gemstone?.gemRef ?? null} mono />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Mineral Variety</dt>
              <dd className="text-[#121211]"><EvidenceValue value={gemstone?.variety ?? null} /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Carat Weight</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                <EvidenceValue
                  value={gemstone?.totalWeightCt ? `${gemstone.totalWeightCt} ct` : null}
                  mono
                />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Shape &amp; Clarity</dt>
              <dd className="text-[#121211]">
                <EvidenceValue
                  value={
                    [gemstone?.shape, gemstone?.clarity]
                      .filter(Boolean)
                      .join(' · ') || null
                  }
                />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Disclosed Treatment</dt>
              <dd className="text-right text-[#121211] font-medium">
                <EvidenceValue value={gemstone?.treatment ?? null} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Origin</dt>
              <dd className="text-[#121211]"><EvidenceValue value={gemstone?.origin ?? null} /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Mining Sub-District</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Laboratory Report</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} mono /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Fluorescence</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} /></dd>
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
                <EvidenceValue value={settingName} />
              </h2>
            </div>
            <span className="text-sm font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
              <EvidenceValue value={benchPriceLabel} mono />
            </span>
          </div>

          <dl className="divide-y divide-[#E4DFD5]/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Setting SKU</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[#121211]">
                <EvidenceValue value={settingVariant?.variantSku ?? settingVariant?.designCode ?? null} mono />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Precious Metal Alloy</dt>
              <dd className="text-[#121211] font-medium">
                <EvidenceValue value={settingVariant?.metalCode ?? metalOption ?? null} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Assay Hallmark</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Selected Ring / Mounting Size</dt>
              <dd className="font-[family-name:var(--font-mono)] text-[#121211]">
                <EvidenceValue value={ringSize ?? null} mono />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Shank / Band Width</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} mono /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Gallery Height</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} mono /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Engraving Inscription</dt>
              <dd className="text-[#121211]">
                <EvidenceValue value={configuration.engraving_text ?? null} />
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Bespoke Bench Calibration Note</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} /></dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Assigned Master Setter</dt>
              <dd className="text-[#121211]"><EvidenceValue value={null} /></dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Authoritative server pricing ledger (real quote row / real joins). */}
      <section aria-labelledby="pricing-snapshot-title" className="rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-4">
        <h2 id="pricing-snapshot-title" className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#8A867E]">
          {quote ? `Server Price Snapshot (${quote.currency})` : 'Server Price Snapshot'}
        </h2>
        {quote ? (
          <dl className="divide-y divide-[#E4DFD5]/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Gemstone component</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {formatUsd(quote.gemstoneComponent)}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Mounting component</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {formatUsd(quote.settingComponent)}
              </dd>
            </div>
            {Number(quote.sideStoneComponent) > 0 ? (
              <div className="flex justify-between py-2">
                <dt className="text-[#4E4C47]">Side stones</dt>
                <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                  {formatUsd(quote.sideStoneComponent)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between py-2">
              <dt className="text-[#4E4C47]">Making &amp; assembly</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                {formatUsd(quote.makingComponent)}
              </dd>
            </div>
            {Number(quote.taxComponent) > 0 ? (
              <div className="flex justify-between py-2">
                <dt className="text-[#4E4C47]">Tax</dt>
                <dd className="font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                  {formatUsd(quote.taxComponent)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between py-3 text-sm font-semibold text-[#121211]">
              <dt>Total</dt>
              <dd className="font-[family-name:var(--font-mono)] text-lg text-[#9A7B2C]">
                {formatUsd(quote.total)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-xs text-[#4E4C47]">
            No authoritative price snapshot exists for this configuration yet. The server issues
            a fresh quote when you press Acquire Commission — the applet's ledger above shows the
            real component rows only, and no price is estimated in this dossier.
          </p>
        )}
        {quote ? (
          <p className="text-[11px] font-[family-name:var(--font-mono)] text-[#76726A]">
            Pricing rule {quote.pricingRuleVersion} · A fresh quote is issued server-side at bag
            conversion.
          </p>
        ) : null}
      </section>
    </div>
  );
}
