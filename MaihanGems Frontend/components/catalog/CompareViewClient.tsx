'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trash2,
  ShoppingBag,
  Plus,
  Check,
  Scale,
  Compass,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import {
  getAllGemstones,
  getAllSettings,
  getAllJewelleryItems,
  getCompareCategoryForId,
  type CompareCategory,
} from '@/lib/storefront-data';
import { EvidenceValue } from '@/components/ui/EvidenceValue';
import { DirhamLogo } from '@/components/ui/DirhamLogo';

const CATEGORY_TABS: Array<{
  id: CompareCategory;
  label: string;
  subtitle: string;
  browseHref: string;
  browseLabel: string;
}> = [
  {
    id: 'gemstones',
    label: 'Gemstones',
    subtitle: 'Compare Carat, Cut, Clarity, Origin & Lab Reports',
    browseHref: '/gemstones',
    browseLabel: 'Explore All Gemstones',
  },
  {
    id: 'settings',
    label: 'Settings',
    subtitle: 'Compare Mount Styles, Compatible Cuts & Precious Metals',
    browseHref: '/settings',
    browseLabel: 'Explore All Settings',
  },
  {
    id: 'jewellery',
    label: 'Fine Jewellery',
    subtitle: 'Compare Rings, Necklaces & Calibrated Gemstone Pairs',
    browseHref: '/jewellery',
    browseLabel: 'Explore Fine Jewellery',
  },
];

export function CompareViewClient() {
  const { compareList, toggleCompare, clearCompare, addToCart, formatPrice, currency } =
    useStorefront();

  const allGemstones = getAllGemstones();
  const allSettings = getAllSettings();
  const allJewellery = getAllJewelleryItems();

  const detectedCategory: CompareCategory =
    compareList.length > 0 ? getCompareCategoryForId(compareList[0]) : 'gemstones';

  const [activeCategory, setActiveCategory] = useState<CompareCategory>(detectedCategory);

  useEffect(() => {
    if (compareList.length > 0) {
      const cat = getCompareCategoryForId(compareList[0]);
      setActiveCategory(cat);
    }
  }, [compareList]);

  const comparedGemstones = allGemstones.filter((s) => compareList.includes(s.id));
  const comparedSettings = allSettings.filter((s) => compareList.includes(s.sku));
  const comparedJewellery = allJewellery.filter((j) => compareList.includes(j.id));

  const activeItemsCount =
    activeCategory === 'gemstones'
      ? comparedGemstones.length
      : activeCategory === 'settings'
      ? comparedSettings.length
      : comparedJewellery.length;

  const renderPrice = (amountUsd: number) => {
    if (currency === 'AED') {
      const aedVal = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(Math.round(amountUsd * 3.6725));
      return (
        <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold">
          <DirhamLogo className="h-4 w-4 text-[#8B6B23] shrink-0" />
          <span>{aedVal}</span>
        </span>
      );
    }
    return <span className="tabular-nums font-semibold">{formatPrice(amountUsd)}</span>;
  };

  const handleLoadSampleCategoryComparison = (cat: CompareCategory) => {
    clearCompare();
    setActiveCategory(cat);
    window.setTimeout(() => {
      if (cat === 'gemstones') {
        allGemstones.slice(0, 3).forEach((g) => toggleCompare(g.id));
      } else if (cat === 'settings') {
        allSettings.slice(0, 3).forEach((s) => toggleCompare(s.sku));
      } else {
        allJewellery.slice(0, 3).forEach((j) => toggleCompare(j.id));
      }
    }, 10);
  };

  const activeTabMeta =
    CATEGORY_TABS.find((t) => t.id === activeCategory) || CATEGORY_TABS[0];

  return (
    <div className="space-y-10 font-[family-name:var(--font-eb-garamond)]">
      {/* =========================================================================
          1. SAME-CATEGORY TABS & LOCKED CATEGORY BAR
         ========================================================================= */}
      <div className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-6 sm:p-7 shadow-[0_14px_38px_rgba(185,150,75,0.1)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE6D4] pb-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              SELECT COMPARISON CATEGORY
            </p>
            <h2 className="text-2xl sm:text-3xl font-normal text-[#181613]">
              Compare Items Within the Same Category
            </h2>
          </div>

          <div
            data-testid="compare-category-tabs"
            className="flex flex-wrap items-center gap-2.5"
          >
            {CATEGORY_TABS.map((tab) => {
              const isSelected = activeCategory === tab.id;
              const tabCount =
                tab.id === 'gemstones'
                  ? comparedGemstones.length
                  : tab.id === 'settings'
                  ? comparedSettings.length
                  : comparedJewellery.length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`compare-tab-${tab.id}`}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm uppercase tracking-[0.18em] border transition-all cursor-pointer ${
                    isSelected
                      ? 'gold-gradient-cta border-[#D4AF37] text-[#0A0A0B] font-bold shadow-sm'
                      : 'border-[#E5D4B3] bg-[#FAF7F0] text-[#4E463A] hover:border-[#C5A059] hover:text-[#181613]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tabCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[11px] ${
                        isSelected
                          ? 'bg-[#0A0A0B] text-[#E6C97A]'
                          : 'bg-[#E5D4B3]/60 text-[#181613]'
                      }`}
                    >
                      {tabCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Same-Category Quick Picker Pill Strip */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6E6250] font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#9A7B2C]" />
              <span>
                Same-Category Rule Active: Comparing{' '}
                <strong className="text-[#181613]">{activeTabMeta.label}</strong> Only (Select up to 4)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid={`compare-load-sample-${activeCategory}`}
                onClick={() => handleLoadSampleCategoryComparison(activeCategory)}
                className="text-xs uppercase tracking-[0.18em] text-[#8B6B23] hover:text-[#181613] underline underline-offset-4 cursor-pointer font-semibold"
              >
                Compare Top 3 {activeTabMeta.label}
              </button>

              {compareList.length > 0 && (
                <button
                  type="button"
                  onClick={clearCompare}
                  data-testid="compare-clear-all"
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-[#991B1B] hover:text-[#7F1D1D] underline underline-offset-4 cursor-pointer font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Tray ({compareList.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick-Toggle Pills for the Active Category */}
          <div
            data-testid={`compare-picker-${activeCategory}`}
            className="flex flex-wrap items-center gap-2 pt-1"
          >
            {activeCategory === 'gemstones' &&
              allGemstones.map((stone) => {
                const isSelected = compareList.includes(stone.id);
                return (
                  <button
                    key={stone.id}
                    type="button"
                    onClick={() => toggleCompare(stone.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0A0A0B] bg-[#0A0A0B] text-[#E6C97A] font-semibold shadow-xs'
                        : 'border-[#E5D4B3] bg-[#FAF8F4] text-[#4E463A] hover:border-[#C5A059] hover:text-[#181613]'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-[#9A7B2C]" />
                    )}
                    <span>{stone.name}</span>
                  </button>
                );
              })}

            {activeCategory === 'settings' &&
              allSettings.map((setting) => {
                const isSelected = compareList.includes(setting.sku);
                return (
                  <button
                    key={setting.sku}
                    type="button"
                    onClick={() => toggleCompare(setting.sku)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0A0A0B] bg-[#0A0A0B] text-[#E6C97A] font-semibold shadow-xs'
                        : 'border-[#E5D4B3] bg-[#FAF8F4] text-[#4E463A] hover:border-[#C5A059] hover:text-[#181613]'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-[#9A7B2C]" />
                    )}
                    <span>
                      {setting.name} ({setting.category})
                    </span>
                  </button>
                );
              })}

            {activeCategory === 'jewellery' &&
              allJewellery.map((item) => {
                const isSelected = compareList.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCompare(item.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0A0A0B] bg-[#0A0A0B] text-[#E6C97A] font-semibold shadow-xs'
                        : 'border-[#E5D4B3] bg-[#FAF8F4] text-[#4E463A] hover:border-[#C5A059] hover:text-[#181613]'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-[#D4AF37]" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-[#9A7B2C]" />
                    )}
                    <span>
                      {item.name} ({item.subcategory})
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. EMPTY STATE WHEN NO ITEMS OF ACTIVE CATEGORY ARE SELECTED
         ========================================================================= */}
      {activeItemsCount === 0 && (
        <div
          data-testid="compare-empty-state"
          className="rounded-[24px] border border-[#E5D4B3] bg-white/95 p-10 sm:p-14 text-center space-y-6 shadow-[0_14px_38px_rgba(185,150,75,0.1)]"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FAF3E3] border border-[#D4AF37]/40 text-[#9A7B2C]">
            <Scale className="h-6 w-6" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <p className="text-xs uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              {activeTabMeta.label.toUpperCase()} COMPARISON TRAY
            </p>
            <h2 className="text-3xl sm:text-4xl font-normal text-[#181613]">
              No {activeTabMeta.label} Selected Yet.
            </h2>
            <p className="text-base text-[#5C5346] leading-relaxed">
              {activeTabMeta.subtitle}. Select two or more {activeTabMeta.label.toLowerCase()} from the quick selector above, or load a curated comparison below.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => handleLoadSampleCategoryComparison(activeCategory)}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-xs sm:text-sm uppercase tracking-[0.2em] font-bold gold-gradient-cta rounded-full shadow-[0_10px_24px_rgba(185,150,75,0.24)] cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Compare Top 3 {activeTabMeta.label}</span>
            </button>

            <Link
              href={activeTabMeta.browseHref}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold rounded-full border border-[#C5A059] bg-[#FAF7F0] hover:bg-[#FAF3E3] text-[#181613] transition-colors"
            >
              <span>{activeTabMeta.browseLabel}</span>
              <ArrowRight className="h-4 w-4 text-[#9A7B2C]" />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          3A. GEMSTONES COMPARISON MATRIX (SAME-CATEGORY: GEMSTONES ONLY)
         ========================================================================= */}
      {activeCategory === 'gemstones' && comparedGemstones.length > 0 && (
        <div
          data-testid="compare-matrix-gemstones"
          className="overflow-x-auto rounded-[24px] border border-[#E5D4B3] bg-white shadow-[0_18px_48px_rgba(185,150,75,0.12)]"
        >
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#D4AF37]/30 bg-[#0A0A0B] text-white">
                <th className="p-5 uppercase tracking-[0.22em] text-xs text-[#D4AF37] w-52 align-middle">
                  Gemstone Specification
                </th>
                {comparedGemstones.map((stone) => (
                  <th
                    key={stone.id}
                    className="p-5 border-l border-white/10 min-w-[250px] align-top"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] block">
                            {stone.sku} · GEMSTONE
                          </span>
                          <Link
                            href={`/products/${stone.slug}`}
                            className="block text-xl font-normal text-white hover:text-[#E6C97A] mt-0.5 leading-snug"
                          >
                            {stone.name}
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCompare(stone.id)}
                          aria-label={`Remove ${stone.name} from comparison`}
                          className="p-2 rounded-full border border-white/15 text-[#C8C3B8] hover:text-white hover:border-white/40 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Link
                        href={`/products/${stone.slug}`}
                        className="block relative h-36 w-full rounded-[16px] overflow-hidden border border-white/15 bg-[#FAF8F4]"
                      >
                        <img
                          src={stone.images[0]}
                          alt={stone.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6D4] text-base">
              <tr className="bg-[#FAF7F0]/60">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Vault Price
                </td>
                {comparedGemstones.map((s) => (
                  <td
                    key={s.id}
                    className="p-4 sm:p-5 border-l border-[#EFE6D4] text-xl text-[#181613]"
                  >
                    {renderPrice(s.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Gemstone Variety &amp; Hue
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    <span className="font-semibold">{s.variety}</span> · {s.colourHue}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Carat Weight
                </td>
                {comparedGemstones.map((s) => (
                  <td
                    key={s.id}
                    className="p-4 sm:p-5 border-l border-[#EFE6D4] tabular-nums font-semibold text-[#181613]"
                  >
                    {s.carat.toFixed(2)} ct
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Cut &amp; Shape
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.shape}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Clarity Grade
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.clarity}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Disclosed Treatment
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.treatmentDisclosed}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Origin &amp; Mining District
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    <div className="font-semibold">{s.origin}</div>
                    <div className="text-sm text-[#6E6250] mt-0.5">
                      <EvidenceValue value={s.evidence.miningDistrict} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Refractive Index
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    <EvidenceValue value={s.evidence.refractiveIndex} />
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Laboratory Report
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    <EvidenceValue value={s.evidence.reportNumber} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Acquisition
                </td>
                {comparedGemstones.map((s) => (
                  <td key={s.id} className="p-4 sm:p-5 border-l border-[#EFE6D4]">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: s.id,
                            sku: s.sku,
                            slug: s.slug,
                            name: s.name,
                            subtitle: `${s.shape} · ${s.carat.toFixed(2)} ct`,
                            price: s.price,
                            image: s.images[0],
                            kind: 'gemstone',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] font-bold gold-gradient-cta rounded-full cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Add to Bag</span>
                      </button>

                      <Link
                        href={`/design-your-own?stone=${encodeURIComponent(s.id)}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] rounded-full border border-[#E5D4B3] bg-[#FAF7F0] hover:border-[#C5A059] text-[#181613]"
                      >
                        <Compass className="h-3.5 w-3.5 text-[#9A7B2C]" />
                        <span>Mount in DYOJ</span>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          3B. SETTINGS COMPARISON MATRIX (SAME-CATEGORY: SETTINGS ONLY)
         ========================================================================= */}
      {activeCategory === 'settings' && comparedSettings.length > 0 && (
        <div
          data-testid="compare-matrix-settings"
          className="overflow-x-auto rounded-[24px] border border-[#E5D4B3] bg-white shadow-[0_18px_48px_rgba(185,150,75,0.12)]"
        >
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#D4AF37]/30 bg-[#0A0A0B] text-white">
                <th className="p-5 uppercase tracking-[0.22em] text-xs text-[#D4AF37] w-52 align-middle">
                  Setting Specification
                </th>
                {comparedSettings.map((setting) => (
                  <th
                    key={setting.sku}
                    className="p-5 border-l border-white/10 min-w-[250px] align-top"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] block">
                            {setting.sku} · SETTING
                          </span>
                          <Link
                            href={`/settings/${setting.sku}`}
                            className="block text-xl font-normal text-white hover:text-[#E6C97A] mt-0.5 leading-snug"
                          >
                            {setting.name}
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCompare(setting.sku)}
                          aria-label={`Remove ${setting.name} from comparison`}
                          className="p-2 rounded-full border border-white/15 text-[#C8C3B8] hover:text-white hover:border-white/40 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Link
                        href={`/settings/${setting.sku}`}
                        className="block relative h-36 w-full rounded-[16px] overflow-hidden border border-white/15 bg-[#FAF8F4]"
                      >
                        <img
                          src={setting.images[0]}
                          alt={setting.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6D4] text-base">
              <tr className="bg-[#FAF7F0]/60">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Base Mounting Price
                </td>
                {comparedSettings.map((s) => (
                  <td
                    key={s.sku}
                    className="p-4 sm:p-5 border-l border-[#EFE6D4] text-xl text-[#181613]"
                  >
                    {renderPrice(s.basePrice)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Setting Subcategory
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613] font-semibold">
                    {s.category}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Architectural Style
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.style}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Compatible Stone Cuts
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.compatibleShapes.join(' · ')}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Band &amp; Gallery Profile
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4] tabular-nums text-[#181613]">
                    {s.bandWidthMm || '1.8 mm'} band · {s.galleryHeightMm || '6.2 mm'} gallery
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Available Precious Alloys
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.metals.map((m) => m.label).join(', ')}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Stone Pairing Type
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {s.acceptsPairsOnly ? 'Calibrated Matched Pairs Only' : 'Single Center Gemstone'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Acquisition
                </td>
                {comparedSettings.map((s) => (
                  <td key={s.sku} className="p-4 sm:p-5 border-l border-[#EFE6D4]">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: s.sku,
                            sku: s.sku,
                            slug: s.slug,
                            name: s.name,
                            subtitle: `${s.category} · ${s.style}`,
                            price: s.basePrice,
                            image: s.images[0],
                            kind: 'setting',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] font-bold gold-gradient-cta rounded-full cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Add Setting</span>
                      </button>

                      <Link
                        href="/design-your-own?step=setting"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs uppercase tracking-[0.16em] rounded-full border border-[#E5D4B3] bg-[#FAF7F0] hover:border-[#C5A059] text-[#181613]"
                      >
                        <Compass className="h-3.5 w-3.5 text-[#9A7B2C]" />
                        <span>Pair in DYOJ</span>
                      </Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          3C. FINE JEWELLERY COMPARISON MATRIX (SAME-CATEGORY: JEWELLERY ONLY)
         ========================================================================= */}
      {activeCategory === 'jewellery' && comparedJewellery.length > 0 && (
        <div
          data-testid="compare-matrix-jewellery"
          className="overflow-x-auto rounded-[24px] border border-[#E5D4B3] bg-white shadow-[0_18px_48px_rgba(185,150,75,0.12)]"
        >
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#D4AF37]/30 bg-[#0A0A0B] text-white">
                <th className="p-5 uppercase tracking-[0.22em] text-xs text-[#D4AF37] w-52 align-middle">
                  Jewellery Specification
                </th>
                {comparedJewellery.map((item) => (
                  <th
                    key={item.id}
                    className="p-5 border-l border-white/10 min-w-[250px] align-top"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] block">
                            {item.sku} · FINE JEWELLERY
                          </span>
                          <Link
                            href={item.href}
                            className="block text-xl font-normal text-white hover:text-[#E6C97A] mt-0.5 leading-snug"
                          >
                            {item.name}
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCompare(item.id)}
                          aria-label={`Remove ${item.name} from comparison`}
                          className="p-2 rounded-full border border-white/15 text-[#C8C3B8] hover:text-white hover:border-white/40 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Link
                        href={item.href}
                        className="block relative h-36 w-full rounded-[16px] overflow-hidden border border-white/15 bg-[#FAF8F4]"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6D4] text-base">
              <tr className="bg-[#FAF7F0]/60">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Creation Price
                </td>
                {comparedJewellery.map((item) => (
                  <td
                    key={item.id}
                    className="p-4 sm:p-5 border-l border-[#EFE6D4] text-xl text-[#181613]"
                  >
                    {renderPrice(item.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Jewellery Type
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613] font-semibold">
                    {item.subcategory}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Precious Metal &amp; Mount
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {item.metal}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Gemstone Variety
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {item.gemstoneVariety}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Total Carat Weight
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] tabular-nums font-semibold text-[#181613]">
                    {item.totalCarat.toFixed(2)} ct
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Setting Architecture
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {item.settingStyle}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Provenance &amp; Origin
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {item.origin}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Laboratory / Atelier Dossier
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4] text-[#181613]">
                    {item.certification}
                  </td>
                ))}
              </tr>
              <tr className="bg-[#FAF7F0]/40">
                <td className="p-4 sm:p-5 text-xs uppercase tracking-[0.18em] text-[#6E6250] font-semibold">
                  Acquisition
                </td>
                {comparedJewellery.map((item) => (
                  <td key={item.id} className="p-4 sm:p-5 border-l border-[#EFE6D4]">
                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          id: item.id,
                          sku: item.sku,
                          slug: item.slug,
                          name: item.name,
                          subtitle: `${item.totalCarat.toFixed(2)} ct · ${item.metal}`,
                          price: item.price,
                          image: item.image,
                          kind: item.id.startsWith('PAIR-') ? 'pair' : 'gemstone',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] font-bold gold-gradient-cta rounded-full cursor-pointer"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Add to Bag</span>
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
