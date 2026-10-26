// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { GemstoneItem, SettingItem } from '@/lib/mgh/fixtures';
import { buildDeterministicDyoCode, formatUsd } from '@/lib/mgh/storefront-data';

export function DyoConfiguratorClient({
  stones,
  settings,
  initialStoneId,
  initialSettingSku,
  initialMetalCode,
  initialSize,
}: {
  stones: GemstoneItem[];
  settings: SettingItem[];
  initialStoneId?: string;
  initialSettingSku?: string;
  initialMetalCode?: string;
  initialSize?: string;
}) {
  const router = useRouter();
  const singleStoneSettings = settings.filter((s) => !s.acceptsPairsOnly);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedStone, setSelectedStone] = useState<GemstoneItem>(
    stones.find((s) => s.id === initialStoneId) || stones[0]
  );
  const [selectedSetting, setSelectedSetting] = useState<SettingItem>(
    singleStoneSettings.find((s) => s.sku === initialSettingSku) || singleStoneSettings[0]
  );
  const [selectedMetalCode, setSelectedMetalCode] = useState<string>(
    initialMetalCode || selectedSetting.metals[0].code
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    initialSize || selectedSetting.sizes[3] || selectedSetting.sizes[0]
  );

  const activeMetal =
    selectedSetting.metals.find((m) => m.code === selectedMetalCode) || selectedSetting.metals[0];
  const totalCommissionPrice =
    selectedStone.price + selectedSetting.basePrice + activeMetal.priceDelta;

  const configurationCode = buildDeterministicDyoCode(
    selectedStone.id,
    selectedSetting.sku,
    activeMetal.code,
    selectedSize
  );

  const handleProceedToReview = () => {
    router.push(`/design-your-own/review/${encodeURIComponent(configurationCode)}`);
  };

  return (
    <div className="space-y-10">
      {/* Numbered Steps Progress Sequence */}
      <nav aria-label="Design Your Own numbered sequence" className="rounded-sm border border-[#E4DFD5] bg-white p-4">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { num: 1, title: '01. Stone', sub: selectedStone.sku },
            { num: 2, title: '02. Setting', sub: selectedSetting.sku },
            { num: 3, title: '03. Metal', sub: activeMetal.label },
            { num: 4, title: '04. Size', sub: `Size ${selectedSize}` },
            { num: 5, title: '05. Review', sub: configurationCode },
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
                    onClick={handleProceedToReview}
                    className="w-full text-left p-3 rounded-sm gold-gradient-cta transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold">
                      <span>{s.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[11px] font-[family-name:var(--font-mono)] opacity-85 truncate mt-1">
                      Inspect Dossier →
                    </p>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stones.slice(0, 8).map((stone) => {
                  const active = selectedStone.id === stone.id;
                  return (
                    <button
                      key={stone.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedStone(stone)}
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
                          {stone.shape} · {stone.carat.toFixed(2)} ct · {stone.clarity}
                        </p>
                        <p className={`text-xs font-[family-name:var(--font-mono)] tabular-nums font-semibold mt-1 ${active ? 'text-[#E6C97A]' : 'text-[#121211]'}`}>
                          {formatUsd(stone.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
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

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-[#E4DFD5] pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                  02 · Select Setting
                </h2>
                <span className="text-xs font-[family-name:var(--font-mono)] text-[#76726A]">
                  For {selectedStone.shape} ({selectedStone.carat.toFixed(2)} ct)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {singleStoneSettings.map((setting) => {
                  const active = selectedSetting.sku === setting.sku;
                  return (
                    <button
                      key={setting.sku}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setSelectedSetting(setting);
                        setSelectedMetalCode(setting.metals[0].code);
                        setSelectedSize(setting.sizes[3] || setting.sizes[0]);
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
                      <p className={`text-xs mt-1 ${active ? 'text-[#C8C3B8]' : 'text-[#4E4C47]'}`}>{setting.style}</p>
                      <p className={`text-xs font-[family-name:var(--font-mono)] tabular-nums font-semibold mt-2 ${active ? 'text-[#E6C97A]' : 'text-[#121211]'}`}>
                        {formatUsd(setting.basePrice)}
                      </p>
                    </button>
                  );
                })}
              </div>
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

          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-[#E4DFD5] pb-3">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
                  03 · Select Alloy
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedSetting.metals.map((metal) => {
                  const active = activeMetal.code === metal.code;
                  return (
                    <button
                      key={metal.code}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedMetalCode(metal.code)}
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
                        {metal.hallmark}
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

          {step === 4 && (
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
                  onClick={handleProceedToReview}
                  data-testid="dyo-proceed-review"
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
                >
                  Step 05: Inspect Dossier ({configurationCode})
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
              <dt className="text-[#C8C3B8]">01. Stone ({selectedStone.sku})</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums font-medium text-white">
                {formatUsd(selectedStone.price)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-[#C8C3B8]">02. Setting ({selectedSetting.sku})</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums font-medium text-white">
                {formatUsd(selectedSetting.basePrice)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <dt className="text-[#C8C3B8]">03. Metal ({activeMetal.label})</dt>
              <dd className="font-[family-name:var(--font-mono)] tabular-nums font-medium text-white">
                {activeMetal.priceDelta > 0 ? `+${formatUsd(activeMetal.priceDelta)}` : 'Included'}
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
            onClick={handleProceedToReview}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm transition-all"
          >
            Review Code ({configurationCode})
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-2 border-t border-white/10 text-xs text-[#C8C3B8] space-y-1">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#D4AF37]">
              Saved Dossiers:
            </p>
            <div className="flex flex-wrap gap-3 font-[family-name:var(--font-mono)]">
              <Link href="/design-your-own/review/DYO-MG-8841" className="text-[#E6C97A] underline">
                DYO-MG-8841
              </Link>
              <Link href="/design-your-own/review/DYO-MG-2049" className="text-[#E6C97A] underline">
                DYO-MG-2049
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
