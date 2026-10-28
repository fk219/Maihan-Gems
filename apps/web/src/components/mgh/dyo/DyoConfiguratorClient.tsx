'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { GemstoneItem, SettingItem } from '@/lib/mgh/fixtures';
import { buildDeterministicDyoCode, formatUsd } from '@/lib/mgh/storefront-data';

/**
 * M5 — the applet's 4-step DYOJ configurator (exact classes/copy) wired to
 * the repo's REAL DYO seam.
 *
 * The stone/setting/metal/size pools are the repo's live catalogue via the
 * M5 dyo adapter (`lib/mgh/adapters/dyo.ts`): stones are real ACTIVE single
 * products, settings are REAL setting variants grouped per design, metals
 * carry each real variant's own `variantSku`, and sizes are the evidenced
 * ring-size ladder.
 *
 * "Step 05 · Review" is the ONE behaviour change that keeps this guest flow
 * honest: instead of navigating to a locally composed dossier code, the
 * proceed action registers the composition through the REAL server chain
 * — POST /api/v1/dyo/configurations (INV-01/02/03 enforced server-side) →
 * POST …/validate (compatibility engine) → the server-issued `short_code`
 * becomes the review-URL key. The label keeps the applet's preview-code
 * chip so the markup stays identical; that chip is a client-side preview
 * code only, never presented as a stored dossier identifier. The real
 * ledger codes are surfaced under "Recent Commissions".
 *
 * No quote is computed here into a bag line. The commission total stays an
 * indicative component sum (as the applet flags) and the server quote on
 * the review page — and again at bag conversion — is the only authority.
 */

interface ServerError {
  code?: string;
  message?: string;
}

/**
 * The real compatibility rule evaluation (same seam the replaced studio used
 * in lib/dyo-compat): rule rows carry shape (+ optional carat bands); a rule
 * without an evidenced shape accepts any shape. Nothing is invented here.
 */
function normShape(value: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_cut$/, '');
}

function settingAcceptsStone(
  setting: SettingItem,
  stone: GemstoneItem | null,
): boolean {
  const rules = setting.accepts ?? [];
  if (rules.length === 0) return true;
  if (!stone) return true;
  const shape = normShape(stone.shape ?? null);
  const carat = stone.carat ?? 0;
  return rules.some((rule) => {
    if (rule.shape !== null && normShape(rule.shape) !== shape) return false;
    if (rule.minCarat !== null && carat < rule.minCarat) return false;
    if (rule.maxCarat !== null && carat > rule.maxCarat) return false;
    return true;
  });
}

export function DyoConfiguratorClient({
  stones,
  settings,
  recentCodes = [],
  initialStoneId,
  initialSettingSlug,
  initialMetalCode,
  initialSize,
}: {
  /** Real single-stone pool via the M5 dyo adapter (never fixture stock). */
  stones: GemstoneItem[];
  /** Real designs via the M5 dyo adapter (mm/size lists are evidenced seams). */
  settings: SettingItem[];
  /** Real newest commission codes from `dyo_configurations` (may be empty). */
  recentCodes?: string[];
  initialStoneId?: string;
  initialSettingSlug?: string;
  initialMetalCode?: string;
  initialSize?: string;
}) {
  const router = useRouter();
  const singleStoneSettings = settings.filter((s) => !s.acceptsPairsOnly);

  const firstStone = stones.find(
    (stone) => initialStoneId && (stone.sku === initialStoneId || stone.id === initialStoneId),
  ) ?? stones[0];

  const firstSetting =
    (initialSettingSlug
      ? singleStoneSettings.find(
          (setting) =>
            setting.slug === initialSettingSlug ||
            setting.sku === initialSettingSlug,
        )
      : undefined) ?? singleStoneSettings[0];

  // Earliest metal option is the base price row; the applet's entry state is
  // preserved (metal price deltas are real arithmetic from the DB variants).
  const defaultMetal = firstSetting?.metals[0];
  const defaultSize =
    firstSetting?.sizes.find((sz) => sz === initialSize) ?? firstSetting?.sizes[3] ?? firstSetting?.sizes[0] ?? '';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedStone, setSelectedStone] = useState<GemstoneItem | null>(firstStone ?? null);
  const [selectedSetting, setSelectedSetting] = useState<SettingItem | null>(firstSetting ?? null);
  const [selectedMetalCode, setSelectedMetalCode] = useState<string>(initialMetalCode || defaultMetal?.code || '');
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);
  const [beginning, setBeginning] = useState(false);
  const [beginError, setBeginError] = useState<string | null>(null);

  const activeMetal =
    selectedSetting
      ? selectedSetting.metals.find(
          (metal) => String(metal.code) === selectedMetalCode,
        ) ?? selectedSetting.metals[0]
      : undefined;

  // Step 02 candidates: the real setting_compatibility_rules evaluated
  // against the selected stone (INV-03 keeps earring mounts out via the
  // adapter; the server re-validates on register, quote and conversion).
  const compatibleSettings = singleStoneSettings.filter(
    (setting) => settingAcceptsStone(setting, selectedStone ?? null),
  );
  const visibleSettings = selectedSetting
    ? singleStoneSettings.filter(
        (setting) =>
          settingAcceptsStone(setting, selectedStone ?? null) ||
          setting.sku === selectedSetting.sku,
      )
    : compatibleSettings;

  // Indicative ONLY — the components' real prices; the server quote on the
  // review dossier (and again at bag conversion) is authoritative.
  const totalCommissionPrice =
    (selectedStone?.price ?? 0) + (selectedSetting?.basePrice ?? 0) + (activeMetal?.priceDelta ?? 0);

  const previewCode = buildDeterministicDyoCode(
    selectedStone?.sku ?? '',
    activeMetal?.variantSku ?? selectedSetting?.sku ?? '',
    String(activeMetal?.code ?? ''),
    selectedSize ?? '',
  );

  const handleProceedToReview = async () => {
    if (!selectedStone || !selectedSetting || !activeMetal || beginning) return;
    setBeginning(true);
    setBeginError(null);
    try {
      const createRes = await fetch('/api/v1/dyo/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingVariantSku: activeMetal.variantSku ?? selectedSetting.sku,
          gemRef: selectedStone.sku,
          jewelleryType: 'RING',
          options: {
            metal: String(activeMetal.code),
            // The mounting-size option only exists for ring jewellery; the
            // selected_options record carries exactly what the client chose.
            ...(selectedSetting.category === 'ring' ? { ringSize: selectedSize } : {}),
          },
        }),
      });
      const createBody = (await createRes.json().catch(() => null)) as {
        data?: { configuration?: { short_code?: string } };
        error?: ServerError;
      } | null;
      const shortCode = createBody?.data?.configuration?.short_code;
      if (!createRes.ok || !shortCode) {
        throw new Error(createBody?.error?.message ?? 'The atelier could not register this composition.');
      }
      const validateRes = await fetch(
        `/api/v1/dyo/configurations/${encodeURIComponent(shortCode)}/validate`,
        { method: 'POST' },
      );
      if (!validateRes.ok) {
        const validateBody = (await validateRes.json().catch(() => null)) as { error?: ServerError } | null;
        throw new Error(validateBody?.error?.message ?? 'This composition failed compatibility validation.');
      }
      router.push(`/design-your-own/review/${encodeURIComponent(shortCode)}`);
    } catch (cause) {
      setBeginError(cause instanceof Error ? cause.message : 'The atelier could not begin this composition.');
      setBeginning(false);
    }
  };

  const recentLedger = recentCodes.slice(0, 2);

  return (
    <div className="space-y-10">
      {/* Numbered Steps Progress Sequence */}
      <nav aria-label="Design Your Own numbered sequence" className="rounded-sm border border-[#E4DFD5] bg-white p-4">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { num: 1, title: '01. Stone', sub: selectedStone?.sku ?? '' },
            { num: 2, title: '02. Setting', sub: selectedSetting?.sku ?? '' },
            { num: 3, title: '03. Metal', sub: activeMetal?.label ?? '' },
            { num: 4, title: '04. Size', sub: `Size ${selectedSize}` },
            { num: 5, title: '05. Review', sub: previewCode },
          ].map((s) => {
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;
            return (
              <li key={s.num}>
                {s.num < 5 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`w-full text-left p-3 rounded-sm border transition-colors ${
                      isCurrent
                        ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                        : isCompleted
                        ? 'border-[#E4DFD5] bg-white text-[#121211]'
                        : 'border-[#E4DFD5]/60 bg-[#F7F5F0] text-[#4E4C47]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold">
                      <span>{s.title}</span>
                      {isCompleted && <Check className="h-3.5 w-3.5 text-[#D4AF37]" />}
                    </div>
                    <p
                      className={`text-[11px] font-[family-name:var(--font-mono)] truncate mt-1 ${
                        isCurrent ? 'text-[#E6C97A]' : 'text-[#76726A]'
                      }`}
                    >
                      {s.sub}
                    </p>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleProceedToReview()}
                    disabled={beginning}
                    className="w-full text-left p-3 rounded-sm gold-gradient-cta transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold">
                      <span>{s.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[11px] font-[family-name:var(--font-mono)] opacity-85 truncate mt-1">
                      {beginning ? 'Registering on the server…' : 'Inspect Dossier →'}
                    </p>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {beginError ? (
        <div
          role="alert"
          className="rounded-sm border border-[#991B1B] bg-[#FEF2F2] p-4 text-xs font-[family-name:var(--font-mono)] text-[#991B1B]"
        >
          {beginError}
        </div>
      ) : null}

      {/* Main Step Workspace + Sticky Live Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-[#E4DFD5] pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                  01 · Select Loose Specimen
                </h2>
                <span className="text-xs font-[family-name:var(--font-mono)] text-[#9A7B2C]">
                  {stones.length} vault lots
                </span>
              </div>
              {stones.length === 0 ? (
                <p className="text-xs font-[family-name:var(--font-mono)] text-[#4E4C47]">
                  The vault catalogue is currently unreachable — no stones are evidenced to
                  configure. This studio never invents a substitute specimen.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stones.slice(0, 8).map((stone) => {
                    const active = selectedStone?.sku === stone.sku;
                    return (
                      <button
                        key={stone.sku}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setSelectedStone(stone);
                          setBeginError(null);
                        }}
                        className={`flex items-start gap-3 p-3.5 rounded-sm border text-left transition-colors ${
                          active
                            ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                            : 'border-[#E4DFD5] bg-white hover:border-[#121211]'
                        }`}
                      >
                        <img
                          src={stone.images[0]}
                          alt={stone.name}
                          referrerPolicy="no-referrer"
                          className="h-16 w-20 rounded-sm border border-[#E4DFD5] bg-[#EFECE6] object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] font-[family-name:var(--font-mono)] ${active ? 'text-[#D4AF37]' : 'text-[#9A7B2C]'}`}>
                            {stone.sku} · {stone.origin}
                          </p>
                          <p className={`text-xs font-semibold truncate ${active ? 'text-white' : 'text-[#121211]'}`}>
                            {stone.name}
                          </p>
                          <p className={`text-[11px] ${active ? 'text-[#C8C3B8]' : 'text-[#4E4C47]'}`}>
                            {stone.shape ?? 'Not evidenced'} · {stone.carat.toFixed(2)} ct ·{' '}
                            {stone.clarity ?? 'Not evidenced'}
                          </p>
                          <p className={`text-xs font-[family-name:var(--font-mono)] tabular-nums font-semibold mt-1 ${active ? 'text-[#E6C97A]' : 'text-[#121211]'}`}>
                            {formatUsd(stone.price)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="pt-4 border-t border-[#E4DFD5] flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold bg-[#0A0A0B] text-[#E6C97A] rounded-sm hover:bg-[#1B1B1E]"
                >
                  Step 02: Setting
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && selectedSetting && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-[#E4DFD5] pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                  02 · Select Setting
                </h2>
                <span className="text-xs font-[family-name:var(--font-mono)] text-[#76726A]">
                  For {selectedStone?.shape ?? 'your'} ({selectedStone?.carat.toFixed(2)} ct){' '}
                  · {visibleSettings.length} compatible
                </span>
              </div>
              {visibleSettings.length === 0 ? (
                <p className="text-xs font-[family-name:var(--font-mono)] text-[#4E4C47]">
                  No settings currently accept this cut — go back and choose another stone.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleSettings.map((setting) => {
                    const active = selectedSetting?.sku === setting.sku;
                    return (
                      <button
                        key={setting.sku}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setSelectedSetting(setting);
                          setBeginError(null);
                          setSelectedMetalCode(String(setting.metals[0]?.code ?? ''));
                          setSelectedSize(setting.sizes[3] || setting.sizes[0] || '');
                        }}
                        className={`p-4 rounded-sm border text-left transition-colors ${
                          active
                            ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                            : 'border-[#E4DFD5] bg-white hover:border-[#121211]'
                        }`}
                      >
                        <img
                          src={setting.images[0]}
                          alt={setting.name}
                          referrerPolicy="no-referrer"
                          className="aspect-[4/3] w-full rounded-sm border border-[#E4DFD5] bg-[#EFECE6] object-cover mb-3"
                        />
                        <p className={`text-[11px] font-[family-name:var(--font-mono)] ${active ? 'text-[#D4AF37]' : 'text-[#9A7B2C]'}`}>
                          {setting.sku}
                        </p>
                        <p className={`text-sm font-semibold mt-0.5 ${active ? 'text-white' : 'text-[#121211]'}`}>
                          {setting.name}
                        </p>
                        <p className={`text-xs mt-1 truncate ${active ? 'text-[#C8C3B8]' : 'text-[#4E4C47]'}`}>{setting.style}</p>
                        <p className={`text-xs font-[family-name:var(--font-mono)] tabular-nums font-semibold mt-2 ${active ? 'text-[#E6C97A]' : 'text-[#121211]'}`}>
                          {formatUsd(setting.basePrice)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="pt-4 border-t border-[#E4DFD5] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
                >
                  ← Stone
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold bg-[#0A0A0B] text-[#E6C97A] rounded-sm hover:bg-[#1B1B1E]"
                >
                  Step 03: Metal
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && selectedSetting && (
            <div className="space-y-4">
              <div className="border-b border-[#E4DFD5] pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                  03 · Select Alloy
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedSetting.metals.map((metal) => {
                  const active = String(activeMetal?.code) === String(metal.code);
                  return (
                    <button
                      key={String(metal.code)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedMetalCode(String(metal.code))}
                      className={`p-4 rounded-sm border text-left transition-colors ${
                        active
                          ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                          : 'border-[#E4DFD5] bg-white hover:border-[#121211]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{metal.label}</span>
                        <span className="font-[family-name:var(--font-mono)] text-[#E6C97A]">
                          {metal.priceDelta > 0 ? `+${formatUsd(metal.priceDelta)}` : 'Included'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 font-[family-name:var(--font-mono)] ${active ? 'text-[#C8C3B8]' : 'text-[#76726A]'}`}>
                        {metal.hallmark ?? 'Not evidenced'}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-[#E4DFD5] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
                >
                  ← Setting
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold bg-[#0A0A0B] text-[#E6C97A] rounded-sm hover:bg-[#1B1B1E]"
                >
                  Step 04: Size
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && selectedSetting && (
            <div className="space-y-4">
              <div className="border-b border-[#E4DFD5] pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                  04 · Select Size
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {selectedSetting.sizes.map((sz) => {
                  const active = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedSize(sz)}
                      className={`p-3 rounded-sm border text-center text-xs font-[family-name:var(--font-mono)] transition-colors ${
                        active
                          ? 'border-[#D4AF37] bg-[#0A0A0B] text-[#E6C97A] font-semibold'
                          : 'border-[#E4DFD5] bg-white text-[#121211] hover:border-[#121211]'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-[#E4DFD5] flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
                >
                  ← Metal
                </button>
                <button
                  type="button"
                  onClick={() => void handleProceedToReview()}
                  disabled={beginning}
                  data-testid="dyo-proceed-review"
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
                >
                  {beginning ? 'Registering…' : `Step 05: Inspect Dossier (${previewCode})`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Configuration Ledger Summary */}
        <aside className="lg:col-span-4 rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-6 space-y-5">
          <div className="border-b border-white/10 pb-3">
            <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#D4AF37]">
              CONFIGURATION LEDGER
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Commission Summary
            </h3>
          </div>

          <dl className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-[#C8C3B8]">01. Stone ({selectedStone?.sku ?? ''})</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums font-medium text-white">
                {formatUsd(selectedStone?.price ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-[#C8C3B8]">02. Setting ({selectedSetting?.sku ?? ''})</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums font-medium text-white">
                {formatUsd(selectedSetting?.basePrice ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-[#C8C3B8]">03. Metal ({activeMetal?.label ?? ''})</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums font-medium text-white">
                {activeMetal && activeMetal.priceDelta > 0
                  ? `+${formatUsd(activeMetal.priceDelta)}`
                  : 'Included'}
              </dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-[#C8C3B8]">04. Size</dt>
              <dd className="font-[family-name:var(--font-mono)] text-white">{selectedSize}</dd>
            </div>
            <div className="flex justify-between pt-2 text-sm font-semibold text-[#E6C97A]">
              <dt>Commission Total</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums">
                {formatUsd(totalCommissionPrice)}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => void handleProceedToReview()}
            disabled={beginning}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm transition-all"
          >
            {beginning ? 'Registering…' : `Review Code (${previewCode})`}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#C8C3B8] border-t border-white/10 pt-2">
            Indicative component total · The server writes the authoritative quote before you convert.
          </p>

          <div className="pt-1 border-t border-white/10 text-xs text-[#C8C3B8] space-y-1">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#D4AF37]">
              Recent Commissions:
            </p>
            {recentLedger.length === 0 ? (
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-[#C8C3B8]">
                No commissions in the ledger yet — the first composition you register will appear here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3 font-[family-name:var(--font-mono)]">
                {recentLedger.map((code) => (
                  <Link
                    key={code}
                    href={`/design-your-own/review/${encodeURIComponent(code)}`}
                    className="text-[#E6C97A] underline"
                  >
                    {code}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
