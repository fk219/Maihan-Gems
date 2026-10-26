// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Compass,
  Box,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Heart,
  Scale,
  Calendar,
  Sliders,
  Clock,
  ShieldCheck,
  Ruler,
  FileText,
  ArrowRight,
  CheckCircle2,
  X,
} from 'lucide-react';
import { SettingItem, GEMSTONES } from '@/lib/mgh/fixtures';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { EvidenceValue } from '@/components/mgh/ui/EvidenceValue';
import { FormattedPrice } from '@/components/mgh/ui/FormattedPrice';

const QUICK_RING_SIZES = ['4', '5', '6', '7', '8', '9'] as const;

export function SettingDetailGallery({ setting }: { setting: SettingItem }) {
  const baseImage = setting.images[0] || '/images/gems/setting-ring.jpg';
  const galleryViews = [
    { src: baseImage, label: 'Crown & Prong Architecture' },
    { src: '/images/elysian-ring.jpg', label: 'Cathedral Profile View' },
    { src: '/images/verdant-drop.jpg', label: 'On-Hand Scale Perspective' },
    { src: baseImage, label: 'Geneva Goldsmith Bench' },
    { src: '/images/elysian-ring.jpg', label: 'Gallery Seat Geometry' },
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const currentView = galleryViews[activeIdx] || galleryViews[0];

  return (
    <>
      <div className="flex flex-col-reverse sm:flex-row gap-4 items-start">
        {/* Left Vertical Thumbnail Strip */}
        <div
          role="tablist"
          aria-label="Setting photography views"
          className="flex sm:flex-col gap-3 w-full sm:w-24 shrink-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0"
        >
          {galleryViews.map((view, idx) => {
            const isSelected = activeIdx === idx;
            return (
              <button
                key={`${view.label}-${idx}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={view.label}
                onClick={() => setActiveIdx(idx)}
                className={`relative h-20 w-20 sm:h-22 sm:w-24 shrink-0 overflow-hidden rounded-[16px] border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40 shadow-md scale-[1.02]'
                    : 'border-[#E5D4B3] opacity-75 hover:opacity-100 hover:border-[#C5A059]/60'
                } bg-[#14100C]`}
              >
                <img
                  src={view.src}
                  alt={`${setting.name} view ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>

        {/* Main Rounded Stage Image */}
        <div className="relative flex-1 w-full aspect-[4/3.5] overflow-hidden rounded-[24px] border border-[#E5D4B3] bg-[#12100D] shadow-[0_24px_60px_rgba(20,16,12,0.16)]">
          <img
            src={currentView.src}
            alt={`${setting.name} — ${currentView.label}`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-500"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

          {/* Prev / Next Arrows */}
          <button
            type="button"
            onClick={() =>
              setActiveIdx((prev) => (prev === 0 ? galleryViews.length - 1 : prev - 1))
            }
            aria-label="Previous setting image"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIdx((prev) => (prev === galleryViews.length - 1 ? 0 : prev + 1))
            }
            aria-label="Next setting image"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Bottom-Left 3D WebAR Link if available */}
          {setting.webarAssetId && (
            <Link
              href={`/ar/${setting.webarAssetId}`}
              className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/65 hover:bg-black/85 border border-[#C5A059]/50 px-3.5 py-1.5 text-xs font-[family-name:var(--font-mono)] text-[#FAF3E3] backdrop-blur-md transition-all"
            >
              <Box className="h-3.5 w-3.5 text-[#E6C97A]" />
              <span>3D / WebAR</span>
            </Link>
          )}

          {/* Bottom-Right Fullscreen Expand */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Expand setting image fullscreen"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-black/65 hover:bg-black/85 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${setting.name} Fullscreen View`}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-10"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full rounded-[24px] overflow-hidden border border-[#C5A059]/40 bg-[#0D0C0A]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close fullscreen view"
              className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/70 text-white border border-white/20 flex items-center justify-center hover:bg-black cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={currentView.src}
              alt={setting.name}
              referrerPolicy="no-referrer"
              className="w-full max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function SettingDetailClient({ setting }: { setting: SettingItem }) {
  const { addToCart, toggleFavorite, toggleCompare, favorites, compareList } = useStorefront();
  const [selectedMetal, setSelectedMetal] = useState(setting.metals[0]);
  const [selectedSize, setSelectedSize] = useState(setting.sizes[3] || setting.sizes[0]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const isFav = favorites.includes(setting.sku);
  const isCompared = compareList.includes(setting.sku);

  const computedPrice = setting.basePrice + selectedMetal.priceDelta;

  const getMetalDotColor = (code: string) => {
    if (code.includes('YG') || code.toLowerCase().includes('yellow')) return '#D4AF37';
    if (code.includes('RG') || code.toLowerCase().includes('rose')) return '#E6A89A';
    return '#CBD5E1';
  };

  return (
    <div className="space-y-6 font-[family-name:var(--font-eb-garamond)]">
      {/* Price, In-Stock Badge, SKU & Circular Heart/Compare Icons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D4B3] pb-5">
        <div className="flex flex-wrap items-baseline gap-4">
          <span
            data-testid="setting-price"
            className="text-3xl sm:text-4xl font-semibold text-[#9A7432] tracking-tight tabular-nums"
          >
            <FormattedPrice amount={computedPrice} />
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#15803D]">
            <span className="h-2 w-2 rounded-full bg-[#15803D]" />
            In Stock
          </span>
          <span className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
            SKU: {setting.sku}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFavorite(setting.sku)}
            aria-pressed={isFav}
            aria-label={isFav ? 'Saved setting' : 'Save setting'}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isFav
                ? 'border-[#C5A059] bg-[#1A1612] text-[#E6C97A]'
                : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059]'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(setting.sku)}
            aria-pressed={isCompared}
            aria-label="Compare setting"
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isCompared
                ? 'border-[#C5A059] bg-[#1A1612] text-[#E6C97A]'
                : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059]'
            }`}
          >
            <Scale className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metal Selector Pills (Matching Solitaire Setting Screenshot) */}
      <div className="space-y-2.5">
        <label className="block text-sm text-[#5C4E3C]">
          Metal: <strong className="text-[#1A1612] font-semibold">{selectedMetal.label}</strong>{' '}
          <span className="text-xs font-[family-name:var(--font-mono)] text-[#8C6D2F]">
            ({selectedMetal.hallmark})
          </span>
        </label>
        <div className="flex flex-wrap gap-2.5">
          {setting.metals.map((metal) => {
            const active = selectedMetal.code === metal.code;
            return (
              <button
                key={metal.code}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedMetal(metal)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'border-[#C5A059] bg-[#FAF3E3] text-[#1A1612] font-semibold ring-1 ring-[#C5A059] shadow-xs'
                    : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059]'
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/15"
                  style={{ backgroundColor: getMetalDotColor(metal.code) }}
                />
                <span>{metal.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ring Size Boxes + Accessible Select Dropdown */}
      <div className="space-y-2.5 border-b border-[#E5D4B3] pb-5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="setting-size-select"
            className="block text-sm text-[#5C4E3C]"
          >
            {setting.category === 'ring' ? 'Ring Size' : 'Mounting Spec'}:{' '}
            <strong className="text-[#1A1612] font-semibold">{selectedSize}</strong>
          </label>
          <button
            type="button"
            onClick={() => setSizeGuideOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-[#9A7432] hover:underline cursor-pointer"
          >
            <Ruler className="h-3.5 w-3.5" />
            Size Guide
          </button>
        </div>

        {/* Visual Size Boxes matching screenshot */}
        {setting.category === 'ring' && (
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_RING_SIZES.map((num) => {
              const matchingOption =
                setting.sizes.find((s) => s.includes(num)) || `US ${num}`;
              const isSelected = selectedSize === matchingOption || selectedSize === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedSize(matchingOption)}
                  className={`h-10 w-12 rounded-[12px] border text-sm font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#C5A059] bg-[#FAF3E3] text-[#1A1612] font-semibold shadow-xs'
                      : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059]'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        )}

        {/* Native select preserved for full keyboard/screen-reader & test compatibility */}
        <select
          id="setting-size-select"
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-full rounded-[14px] border border-[#E5D4B3] bg-[#FFFDF9] px-3.5 py-2.5 text-xs font-[family-name:var(--font-mono)] text-[#1A1612]"
        >
          {setting.sizes.map((sz) => (
            <option key={sz} value={sz}>
              {sz}
            </option>
          ))}
        </select>
      </div>

      {/* Primary Pill Action Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {setting.acceptsPairsOnly ? (
            <Link
              href="/pairs"
              className="inline-flex items-center justify-center gap-2 px-4 py-4 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] font-semibold gold-gradient-cta rounded-full shadow-[0_10px_28px_rgba(197,160,89,0.3)] transition-all whitespace-nowrap"
            >
              <Compass className="h-4 w-4 shrink-0" />
              Pair with Matched Pair
            </Link>
          ) : (
            <Link
              href={`/design-your-own?setting=${encodeURIComponent(setting.sku)}&metal=${encodeURIComponent(
                selectedMetal.code
              )}&size=${encodeURIComponent(selectedSize)}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-4 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] font-semibold gold-gradient-cta rounded-full shadow-[0_10px_28px_rgba(197,160,89,0.3)] transition-all whitespace-nowrap"
            >
              <Compass className="h-4 w-4 shrink-0" />
              Select This Setting
            </Link>
          )}

          <Link
            href={`/contact?setting=${encodeURIComponent(setting.sku)}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-4 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] font-semibold rounded-full border border-[#C5A059] bg-[#FFFDF9] text-[#1A1612] hover:bg-[#FAF3E3] transition-colors whitespace-nowrap"
          >
            <Calendar className="h-4 w-4 text-[#9A7432] shrink-0" />
            Book a Consultation
          </Link>
        </div>

        {/* Add Mounting to Bag + 3D Studio Row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              addToCart({
                id: `${setting.sku}-${selectedMetal.code}-${selectedSize}`,
                sku: setting.sku,
                slug: setting.slug,
                name: `${setting.name} (${selectedMetal.label})`,
                subtitle: `Size / Spec: ${selectedSize}`,
                price: computedPrice,
                image: setting.images[0],
                kind: 'setting',
              })
            }
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold rounded-full bg-[#14100C] text-[#FAF3E3] hover:bg-[#241D16] transition-colors cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 text-[#E6C97A]" />
            Add Mounting to Bag
          </button>

          {setting.webarAssetId && (
            <Link
              href={`/ar/${setting.webarAssetId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] px-4 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#1A1612] hover:border-[#C5A059]"
            >
              <Box className="h-3.5 w-3.5 text-[#9A7432]" />
              Inspect 3D Setting
            </Link>
          )}
        </div>
      </div>

      {/* 3 Trust Badges (Customisable · 3–4 Weeks Crafting · Lifetime Support) */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#E5D4B3] text-xs text-[#5C4E3C]">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>Customisable</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>3–4 Weeks Crafting</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>Lifetime Support</span>
        </div>
      </div>

      {/* Size Guide Modal */}
      {sizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Setting Size Guide"
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="max-w-md w-full rounded-[24px] border border-[#C5A059] bg-[#FFFDF9] p-6 text-[#1A1612] space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5D4B3] pb-3">
              <h3 className="text-xl font-semibold">Geneva Ring &amp; Mounting Guide</h3>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF3E3] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-[#5C4E3C]">
              Every setting seat is laser-calibrated in our Rue du Rhône workshop to match the exact millimeter girdle of your chosen stone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingDetailBelowFoldSections({ setting }: { setting: SettingItem }) {
  const [activeTab, setActiveTab] = useState<
    'details' | 'design' | 'customisation' | 'gemstones' | 'shipping'
  >('details');
  const [specToast, setSpecToast] = useState(false);

  // Compatible loose gemstones for "Perfect Gemstone Pairings"
  const compatibleGemstones = GEMSTONES.filter(
    (g) => g.varietySlug !== 'rings' && g.varietySlug !== 'necklaces'
  ).slice(0, 6);

  return (
    <div className="mt-16 space-y-20 font-[family-name:var(--font-eb-garamond)]">
      {/* =====================================================================
          1. INTERACTIVE TABS + 3-COLUMN SPECIFICATIONS / STORY / BENTO PHOTOS
         ===================================================================== */}
      <section aria-label="Setting specifications and design story" className="space-y-10">
        {/* Horizontal Tab Bar */}
        <div
          role="tablist"
          aria-label="Setting detail tabs"
          className="flex flex-wrap items-center gap-6 sm:gap-10 border-b border-[#E5D4B3]"
        >
          {[
            { id: 'details' as const, label: 'Details' },
            { id: 'design' as const, label: 'Design' },
            { id: 'customisation' as const, label: 'Customisation' },
            { id: 'gemstones' as const, label: 'Perfect Gemstones' },
            { id: 'shipping' as const, label: 'Shipping & Returns' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 text-base sm:text-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'text-[#1A1612] font-semibold border-b-2 border-[#C5A059]'
                    : 'text-[#76726A] hover:text-[#1A1612]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 3-Column Layout: Specifications Left, "A Timeless Foundation" Center, 3-Image Collage Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Column 1: Setting Specifications Table (with EvidenceValue) */}
          <div className="lg:col-span-4 rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-7 shadow-[0_12px_34px_rgba(36,26,14,0.05)] space-y-5">
            <h2 className="text-2xl font-normal text-[#1A1612]">Setting Specifications</h2>

            <dl className="divide-y divide-[#EFE5D1] text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Setting Style</dt>
                <dd className="text-[#1A1612] font-medium">{setting.style}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Setting SKU</dt>
                <dd className="font-[family-name:var(--font-mono)] text-xs text-[#1A1612] font-semibold">
                  {setting.sku}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Metal Options</dt>
                <dd className="text-[#1A1612] font-medium text-right">
                  {setting.metals.map((m) => m.label).join(', ')}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Band Width</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={setting.bandWidthMm} mono />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Gallery Height</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={setting.galleryHeightMm} mono />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Compatible Cuts</dt>
                <dd className="text-[#1A1612] font-medium text-right">
                  {setting.compatibleShapes.join(' · ')}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Crafted In</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={setting.originAtelier} />
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => {
                setSpecToast(true);
                window.setTimeout(() => setSpecToast(false), 2500);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#C5A059] bg-[#FAF3E3] hover:bg-[#C5A059] hover:text-[#14100C] px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold text-[#1A1612] transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              Download Specification
            </button>
            {specToast && (
              <p className="text-xs font-[family-name:var(--font-mono)] text-[#15803D]">
                CAD &amp; Millimeter Seat Dossier prepared for {setting.sku}.
              </p>
            )}
          </div>

          {/* Column 2: Editorial Narrative ("A Timeless Foundation") */}
          <div className="lg:col-span-4 space-y-4 py-2">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#9A7432] font-semibold">
              <span className="h-px w-6 bg-[#C5A059]" />
              <span>THE DESIGN</span>
            </div>
            <h3 className="text-3xl font-normal text-[#1A1612] leading-tight">
              A Timeless Foundation
            </h3>
            <p className="text-base text-[#3D3429] leading-relaxed font-medium">
              {setting.lede}
            </p>
            <p className="text-base text-[#5C4E3C] leading-relaxed">
              {setting.description}
            </p>
            <p className="text-sm text-[#76726A] leading-relaxed">
              Engineered to maximize light entry into the pavilion while securing the girdle with hand-finished claws.
            </p>
          </div>

          {/* Column 3: 3-Photo Craftsmanship Bento Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
            <div className="col-span-1 row-span-2 aspect-[3/4.2] rounded-[20px] overflow-hidden border border-[#E5D4B3] bg-[#14100C] shadow-md">
              <img
                src={setting.images[0]}
                alt={`${setting.name} macro prong view`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-[4/3] rounded-[18px] overflow-hidden border border-[#E5D4B3] bg-[#14100C] shadow-md">
              <img
                src="/images/elysian-ring.jpg"
                alt="Side gallery architecture"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="aspect-[4/3] rounded-[18px] overflow-hidden border border-[#E5D4B3] bg-[#14100C] shadow-md">
              <img
                src="/images/verdant-drop.jpg"
                alt="Hand-polished shank"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. FULL-WIDTH "DESIGNED FOR YOUR GEMSTONE" BANNER + 4 FEATURE CARDS
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#C5A059]/40 bg-[#14100C] text-[#FAF3E3] shadow-[0_24px_60px_rgba(20,16,12,0.22)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 space-y-5">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#E6C97A]">
              <span className="h-px w-6 bg-[#D4AF37]" />
              <span>CRAFTSMANSHIP</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-normal text-white leading-tight">
              Designed for Your Gemstone
            </h3>
            <p className="text-base text-[#D8CEBE] leading-relaxed">
              Every Maihan Gems setting is crafted to showcase the natural beauty of your chosen gemstone, combining precision engineering with timeless design.
            </p>
            <div className="pt-2">
              <Link
                href="/varieties"
                className="inline-flex items-center gap-2 rounded-full gold-gradient-cta px-7 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] font-semibold"
              >
                <span>Browse Gemstones</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 p-8 sm:p-12 bg-gradient-to-br from-[#1E1812] to-[#120E0A] border-t lg:border-t-0 lg:border-l border-white/10 space-y-3.5">
            {[
              {
                title: 'Expert Craftsmanship',
                desc: 'Handcrafted by skilled Geneva artisans for lasting beauty.',
              },
              {
                title: 'Premium Materials',
                desc: 'Made with hallmarked 18K gold and 950 platinum.',
              },
              {
                title: 'Fully Customisable',
                desc: 'Tailored to fit your exact gemstone dimensions and style.',
              },
              {
                title: 'Made to Last',
                desc: 'Engineered for everyday durability and heirloom comfort.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-[18px] border border-[#C5A059]/25 bg-white/[0.04] p-3.5 flex items-start gap-3"
              >
                <CheckCircle2 className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-base font-medium text-white">{item.title}</h4>
                  <p className="text-xs text-[#D8CEBE] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. PERFECT GEMSTONE PAIRINGS (6-Card Loose Gemstone Row)
         ===================================================================== */}
      <section aria-labelledby="perfect-pairings-heading" className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#9A7432] font-semibold">
              <span className="h-px w-6 bg-[#C5A059]" />
              <span>COMPLETE YOUR RING</span>
            </div>
            <h2
              id="perfect-pairings-heading"
              className="text-3xl sm:text-4xl font-normal text-[#1A1612] mt-1.5"
            >
              Perfect Gemstone Pairings
            </h2>
          </div>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7432] hover:text-[#1A1612]"
          >
            <span>View All Gemstones</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {compatibleGemstones.map((gem) => (
            <div
              key={gem.id}
              className="rounded-[20px] border border-[#E5D4B3] bg-[#FFFDF9] p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <Link href={`/product/${gem.slug}`} className="block space-y-2.5 group">
                <div className="aspect-square rounded-[14px] overflow-hidden border border-[#EFE5D1] bg-[#14100C]">
                  <img
                    src={gem.images[0]}
                    alt={gem.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1612] line-clamp-1">
                    {gem.carat.toFixed(2)} ct {gem.variety}
                  </p>
                  <p className="text-[11px] text-[#76726A]">
                    {gem.shape} · {gem.origin}
                  </p>
                  <p className="text-sm font-semibold text-[#9A7432] mt-1">
                    <FormattedPrice amount={gem.price} />
                  </p>
                </div>
              </Link>
              <Link
                href={`/design-your-own?stone=${encodeURIComponent(gem.id)}&setting=${encodeURIComponent(
                  setting.sku
                )}`}
                className="w-full inline-flex items-center justify-center rounded-full border border-[#C5A059] bg-[#FAF3E3] hover:bg-[#C5A059] hover:text-[#14100C] py-1.5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold text-[#1A1612] transition-colors"
              >
                Select →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          4. BOTTOM "CREATE YOUR OWN" BESPOKE BANNER
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#C5A059]/40 bg-gradient-to-r from-[#120E0A] via-[#1C1610] to-[#261D14] p-8 sm:p-12 lg:p-14 text-white shadow-[0_24px_60px_rgba(20,16,12,0.25)]">
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#E6C97A]">
            <span className="h-px w-6 bg-[#D4AF37]" />
            <span>CUSTOM JEWELLERY</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal text-white leading-tight">
            Create Your Own
          </h2>
          <p className="text-base text-[#D8CEBE] leading-relaxed">
            Pair this setting with a natural certified gemstone to craft a one-of-a-kind piece tailored to your exact specifications.
          </p>
          <div className="pt-2">
            <Link
              href={`/design-your-own?setting=${encodeURIComponent(setting.sku)}`}
              className="inline-flex items-center gap-2 rounded-full gold-gradient-cta px-7 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] font-semibold"
            >
              <span>Start Designing</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
