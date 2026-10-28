// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Scale,
  ShoppingBag,
  Box,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RotateCw,
  ShieldCheck,
  Truck,
  Lock,
  RefreshCw,
  Award,
  CheckCircle2,
  X,
  ArrowRight,
  Share2,
  FileText,
  Ruler,
} from 'lucide-react';
import { GemstoneItem } from '@/lib/mgh/fixtures';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { EvidenceValue } from '@/components/mgh/ui/EvidenceValue';
import { FormattedPrice } from '@/components/mgh/ui/FormattedPrice';

const JEWELLERY_GEM_OPTIONS = [
  { id: 'emerald', label: 'Emerald', image: '/mgh/images/gems/emerald-gem.jpg', priceDelta: 0 },
  { id: 'ruby', label: 'Ruby', image: '/mgh/images/gems/ruby-gem.jpg', priceDelta: 450 },
  { id: 'sapphire', label: 'Sapphire', image: '/mgh/images/gems/sapphire-gem.jpg', priceDelta: 250 },
  { id: 'diamond', label: 'Diamond', image: '/mgh/images/elysian-ring.jpg', priceDelta: 650 },
] as const;

const JEWELLERY_METAL_OPTIONS = [
  { id: 'yellow-gold', label: 'Yellow Gold', dotColor: '#D4AF37', priceDelta: 0 },
  { id: 'white-gold', label: 'White Gold', dotColor: '#E5E7EB', priceDelta: 0 },
  { id: 'rose-gold', label: 'Rose Gold', dotColor: '#E6A89A', priceDelta: 0 },
  { id: 'platinum', label: 'Platinum', dotColor: '#CBD5E1', priceDelta: 400 },
] as const;

const RING_SIZE_OPTIONS = ['4', '5', '6', '7', '8', '9'] as const;

export function ProductDetailGallery({ stone }: { stone: GemstoneItem }) {
  const isJewellery = stone.varietySlug === 'rings' || stone.varietySlug === 'necklaces';

  // Build rich gallery thumbnails (vertical rail) matching the reference screenshots
  const baseImages = stone.images.length > 0 ? stone.images : ['/mgh/images/gems/emerald-gem.jpg'];
  const galleryItems = [
    { type: 'image' as const, src: baseImages[0], label: 'Primary Crown View' },
    {
      type: 'image' as const,
      src: baseImages[1] || (isJewellery ? '/mgh/images/gems/setting-ring.jpg' : '/mgh/images/gems/sapphire-gem.jpg'),
      label: isJewellery ? 'Side Gallery Profile' : 'Pavilion & Culet Angle',
    },
    {
      type: 'image' as const,
      src: isJewellery ? '/mgh/images/verdant-drop.jpg' : '/mgh/images/gems/emerald-gem.jpg',
      label: isJewellery ? 'On-Body Perspective' : 'Daylight Macro Facets',
    },
    {
      type: '360' as const,
      src: baseImages[0],
      label: '360° Interactive Studio',
    },
    {
      type: 'cert' as const,
      src: baseImages[0],
      label: 'Laboratory Certificate',
    },
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);

  const currentItem = galleryItems[activeIdx] || galleryItems[0];

  const handlePrev = () => {
    setActiveIdx((prev) => (prev === 0 ? galleryItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIdx((prev) => (prev === galleryItems.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <div className="flex flex-col-reverse sm:flex-row gap-4 items-start">
        {/* Left Vertical Thumbnail Rail */}
        <div
          role="tablist"
          aria-label="Product photography views"
          className="flex sm:flex-col gap-3 w-full sm:w-24 shrink-0 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0"
        >
          {galleryItems.map((item, idx) => {
            const isSelected = activeIdx === idx;
            return (
              <button
                key={`${item.label}-${idx}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={item.label}
                onClick={() => setActiveIdx(idx)}
                className={`relative h-20 w-20 sm:h-22 sm:w-24 shrink-0 overflow-hidden rounded-[16px] border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40 shadow-md scale-[1.02]'
                    : 'border-[#E5D4B3] opacity-75 hover:opacity-100 hover:border-[#C5A059]/60'
                } bg-[#14110D]`}
              >
                <img
                  src={item.src}
                  alt={`${stone.name} thumbnail ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className={`h-full w-full object-cover ${
                    item.type === 'cert' ? 'opacity-35 blur-[1px]' : ''
                  }`}
                />
                {item.type === '360' && (
                  <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-[#FAF3E3]">
                    <span className="rounded-full bg-[#C5A059] px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] font-bold text-[#14100C]">
                      360°
                    </span>
                  </div>
                )}
                {item.type === 'cert' && (
                  <div className="absolute inset-0 bg-[#1A150E]/80 flex flex-col items-center justify-center p-1.5 text-center">
                    <Award className="h-4 w-4 text-[#E6C97A] mb-0.5" />
                    <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#FAF3E3] leading-tight">
                      {stone.evidence.laboratory || 'Not evidenced'} Cert
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Rounded Stage Image */}
        <div className="relative flex-1 w-full aspect-[4/3.5] overflow-hidden rounded-[24px] border border-[#E5D4B3] bg-[#12100D] shadow-[0_24px_60px_rgba(20,16,12,0.16)] group">
          {currentItem.type === 'cert' ? (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#FAF3E3] via-[#F5E8CE] to-[#EAD7B3] text-[#1A1612]">
              <div className="w-full max-w-md rounded-[20px] border-2 border-[#C5A059] bg-[#FFFDF9] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5D4B3] pb-3">
                  <div>
                    <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.22em] text-[#8C6D2F]">
                      Official Gemological Dossier
                    </p>
                    <h4 className="text-xl font-semibold text-[#1A1612]">
                      {stone.evidence.laboratory || 'Not evidenced'} Laboratory Report
                    </h4>
                  </div>
                  <Award className="h-8 w-8 text-[#C5A059]" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#76726A] block">Report Number</span>
                    <span className="font-[family-name:var(--font-mono)] font-semibold text-[#1A1612]">
                      {stone.evidence.reportNumber || 'Not evidenced'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#76726A] block">Species / Variety</span>
                    <span className="font-semibold text-[#1A1612]">Natural {stone.variety}</span>
                  </div>
                  <div>
                    <span className="text-[#76726A] block">Carat &amp; Cut</span>
                    <span className="font-semibold text-[#1A1612]">
                      {stone.carat.toFixed(2)} ct · {stone.shape ?? 'Not evidenced'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#76726A] block">Origin &amp; Treatment</span>
                    <span className="font-semibold text-[#1A1612]">
                      {stone.origin} · {stone.treatmentDisclosed}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <img
              src={currentItem.src}
              alt={`${stone.name} — ${currentItem.label}`}
              referrerPolicy="no-referrer"
              style={
                currentItem.type === '360'
                  ? { transform: `rotate(${rotationDeg}deg)` }
                  : undefined
              }
              className="h-full w-full object-cover transition-transform duration-500"
            />
          )}

          {/* Subtle vignette */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

          {/* Prev / Next Chevrons */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Bottom-Left 360° Interactive Badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveIdx(3);
                setRotationDeg((prev) => (prev + 45) % 360);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/65 hover:bg-black/85 border border-[#C5A059]/50 px-3.5 py-1.5 text-xs font-[family-name:var(--font-mono)] text-[#FAF3E3] backdrop-blur-md transition-all cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5 text-[#E6C97A]" />
              <span>360°</span>
            </button>
            {stone.webarAssetId && (
              <Link
                href={`/ar/${stone.webarAssetId}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/65 hover:bg-black/85 border border-white/20 px-3.5 py-1.5 text-xs font-[family-name:var(--font-mono)] text-white/90 backdrop-blur-md transition-all"
              >
                <Box className="h-3.5 w-3.5 text-[#E6C97A]" />
                <span>3D / AR</span>
              </Link>
            )}
          </div>

          {/* Bottom-Right Fullscreen Expand Button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Expand image fullscreen"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-black/65 hover:bg-black/85 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${stone.name} Fullscreen Inspection`}
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
              src={currentItem.src}
              alt={stone.name}
              referrerPolicy="no-referrer"
              className="w-full max-h-[80vh] object-contain"
            />
            <div className="p-4 bg-[#0D0C0A] border-t border-white/10 flex items-center justify-between text-xs text-white/80 font-[family-name:var(--font-mono)]">
              <span>
                {stone.name} · {stone.sku} · {stone.carat.toFixed(2)} ct
              </span>
              <span className="text-[#E6C97A]">{currentItem.label}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ProductDetailActionsAndAccordion({ stone }: { stone: GemstoneItem }) {
  const { addToCart, toggleFavorite, toggleCompare, favorites, compareList } = useStorefront();
  const isJewellery = stone.varietySlug === 'rings' || stone.varietySlug === 'necklaces';

  // Jewellery customization state (Gemstone, Metal, Size)
  const [selectedGem, setSelectedGem] = useState<(typeof JEWELLERY_GEM_OPTIONS)[number]>(
    stone.name.toLowerCase().includes('emerald')
      ? JEWELLERY_GEM_OPTIONS[0]
      : stone.name.toLowerCase().includes('diamond')
        ? JEWELLERY_GEM_OPTIONS[3]
        : JEWELLERY_GEM_OPTIONS[0]
  );
  const [selectedMetal, setSelectedMetal] = useState<(typeof JEWELLERY_METAL_OPTIONS)[number]>(
    JEWELLERY_METAL_OPTIONS[0]
  );
  const [selectedSize, setSelectedSize] = useState<string>('6');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // AI Gemologist state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isFav = favorites.includes(stone.id);
  const isCompared = compareList.includes(stone.id);

  const computedPrice = isJewellery
    ? stone.price + selectedGem.priceDelta + selectedMetal.priceDelta
    : stone.price;

  const handleRequestGemologistBrief = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'fast',
          prompt: `Provide a concise 2-sentence gemological curator note for ${stone.name} (${stone.sku}), Origin: ${stone.origin}, Clarity: ${stone.clarity}, Cut: ${stone.shape}, Treatment: ${stone.treatmentDisclosed}, RI: ${stone.evidence.refractiveIndex || 'Not evidenced'}. Do not invent facts not provided.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'Gemological AI brief unavailable.');
      } else {
        setAiAnalysis(data.text);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Network error calling Gemini API.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="space-y-6 font-[family-name:var(--font-eb-garamond)]">
      {/* Price, In-Stock Status, SKU & Circular Action Icons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5D4B3] pb-5">
        <div className="flex flex-wrap items-baseline gap-4">
          <p
            data-testid="pdp-fixed-price"
            className="text-3xl sm:text-4xl font-semibold text-[#9A7432] tracking-tight tabular-nums"
          >
            <FormattedPrice amount={computedPrice} />
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#15803D]">
            <span className="h-2 w-2 rounded-full bg-[#15803D]" />
            In Stock
          </span>
          <span className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
            SKU: {stone.sku}
          </span>
        </div>

        {/* Circular Heart, Compare & Share Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFavorite(stone.id)}
            aria-pressed={isFav}
            aria-label={isFav ? 'Saved to favorites' : 'Save to favorites'}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isFav
                ? 'border-[#C5A059] bg-[#1A1612] text-[#E6C97A]'
                : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059] hover:text-[#1A1612]'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(stone.id)}
            aria-pressed={isCompared}
            aria-label={isCompared ? 'Comparing item' : 'Add to compare'}
            className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isCompared
                ? 'border-[#C5A059] bg-[#1A1612] text-[#E6C97A]'
                : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059] hover:text-[#1A1612]'
            }`}
          >
            <Scale className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share product link"
            className="h-10 w-10 rounded-full border border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059] hover:text-[#1A1612] flex items-center justify-center transition-all cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {shareCopied && (
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#15803D]">
          Direct link copied to clipboard.
        </p>
      )}

      {/* =====================================================================
          BRANCH A: FINE JEWELLERY SELECTORS (Gemstone Cards, Metal Pills, Ring Sizes)
         ===================================================================== */}
      {isJewellery ? (
        <div className="space-y-5 border-b border-[#E5D4B3] pb-6">
          {/* 1. Gemstone Selector Cards */}
          <div className="space-y-2.5">
            <label className="block text-sm text-[#5C4E3C]">
              Gemstone: <strong className="text-[#1A1612] font-semibold">{selectedGem.label}</strong>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {JEWELLERY_GEM_OPTIONS.map((gem) => {
                const active = selectedGem.id === gem.id;
                return (
                  <button
                    key={gem.id}
                    type="button"
                    onClick={() => setSelectedGem(gem)}
                    className={`flex flex-col items-center rounded-[16px] border p-2.5 text-center transition-all cursor-pointer ${
                      active
                        ? 'border-[#C5A059] bg-[#FAF3E3] ring-1 ring-[#C5A059] shadow-sm'
                        : 'border-[#E5D4B3] bg-[#FFFDF9] hover:border-[#C5A059]/60'
                    }`}
                  >
                    <div className="h-11 w-11 rounded-full overflow-hidden border border-[#E5D4B3] mb-1.5 bg-[#14100C]">
                      <img
                        src={gem.image}
                        alt={gem.label}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-medium text-[#1A1612]">{gem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Metal Selector Pills */}
          <div className="space-y-2.5">
            <label className="block text-sm text-[#5C4E3C]">
              Metal: <strong className="text-[#1A1612] font-semibold">{selectedMetal.label}</strong>
            </label>
            <div className="flex flex-wrap gap-2">
              {JEWELLERY_METAL_OPTIONS.map((metal) => {
                const active = selectedMetal.id === metal.id;
                return (
                  <button
                    key={metal.id}
                    type="button"
                    onClick={() => setSelectedMetal(metal)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'border-[#C5A059] bg-[#FAF3E3] text-[#1A1612] font-semibold shadow-xs'
                        : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059]'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/15"
                      style={{ backgroundColor: metal.dotColor }}
                    />
                    <span>{metal.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ring Size Boxes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm text-[#5C4E3C]">
                {stone.varietySlug === 'necklaces' ? 'Chain Scale' : 'Ring Size'}:{' '}
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
            <div className="flex flex-wrap items-center gap-2">
              {RING_SIZE_OPTIONS.map((sz) => {
                const active = selectedSize === sz;
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`h-10 w-12 rounded-[12px] border text-sm font-medium transition-all cursor-pointer ${
                      active
                        ? 'border-[#C5A059] bg-[#FAF3E3] text-[#1A1612] font-semibold shadow-xs'
                        : 'border-[#E5D4B3] bg-[#FFFDF9] text-[#5C4E3C] hover:border-[#C5A059]'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           BRANCH B: LOOSE GEMSTONE QUICK SPECIFICATION GRID (Matching Emerald Screenshot)
           ===================================================================== */
        <div className="border-b border-[#E5D4B3] pb-5 space-y-2.5 text-sm">
          <div className="flex items-center justify-between py-1 border-b border-[#EFE5D1]">
            <span className="text-[#76726A]">Shape:</span>
            <span className="font-semibold text-[#1A1612]">{stone.shape ?? 'Not evidenced'}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#EFE5D1]">
            <span className="text-[#76726A]">Carat:</span>
            <span className="font-semibold text-[#1A1612] tabular-nums">
              {stone.carat.toFixed(2)} ct
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#EFE5D1]">
            <span className="text-[#76726A]">Clarity &amp; Treatment:</span>
            <span className="font-semibold text-[#1A1612]">
              {stone.clarity ?? 'Not evidenced'} · {stone.treatmentDisclosed}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#EFE5D1]">
            <span className="text-[#76726A]">Origin:</span>
            <span className="font-semibold text-[#1A1612]">{stone.origin}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[#76726A]">Certification:</span>
            <span className="inline-flex items-center gap-2 font-semibold text-[#1A1612]">
              <span>{stone.evidence.laboratory || 'Not evidenced'} Certified</span>
              <span className="rounded-md border border-[#C5A059] bg-[#FAF3E3] px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8C6D2F]">
                {stone.evidence.laboratory || 'Not evidenced'}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Primary Luxury Pill CTA Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              addToCart({
                id: isJewellery
                  ? `${stone.id}-${selectedGem.id}-${selectedMetal.id}-${selectedSize}`
                  : stone.id,
                sku: stone.sku,
                slug: stone.slug,
                name: isJewellery
                  ? `${stone.name} (${selectedGem.label}, ${selectedMetal.label})`
                  : stone.name,
                subtitle: isJewellery
                  ? `Size ${selectedSize} · ${stone.origin}`
                  : `${stone.shape ?? 'Not evidenced'} · ${stone.carat.toFixed(2)} ct · ${stone.origin}`,
                price: computedPrice,
                image: stone.images[0],
                kind: 'gemstone',
              })
            }
            className="inline-flex items-center justify-center gap-2 px-6 py-4 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] font-semibold gold-gradient-cta rounded-full shadow-[0_10px_28px_rgba(197,160,89,0.3)] transition-all whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to Cart
          </button>

          <Link
            href={`/contact?sku=${encodeURIComponent(stone.sku)}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] font-semibold rounded-full border border-[#C5A059] bg-[#FFFDF9] text-[#1A1612] hover:bg-[#FAF3E3] transition-colors whitespace-nowrap"
          >
            <Calendar className="h-4 w-4 text-[#9A7432]" />
            Book a Consultation
          </Link>
        </div>

        {/* Secondary Bespoke / AR Strip */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/design-your-own?stone=${encodeURIComponent(stone.id)}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E5D4B3] bg-[#FAF3E3]/70 hover:bg-[#FAF3E3] px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#1A1612] transition-colors"
          >
            <span>Pair with a Setting (DYO)</span>
          </Link>
          <Link
            href={`/ar/${stone.webarAssetId || 'missing-asset-' + stone.sku}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E5D4B3] bg-[#FAF3E3]/70 hover:bg-[#FAF3E3] px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#1A1612] transition-colors"
          >
            <Box className="h-3.5 w-3.5 text-[#9A7432]" />
            <span>View in 3D / AR</span>
          </Link>
        </div>
      </div>

      {/* Trust & Assurance Row (Matching Reference Screenshots) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E5D4B3] text-xs text-[#5C4E3C]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>Certified Authenticity</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>Insured Worldwide Shipping</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>14-Day Inspection Returns</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#9A7432] shrink-0" />
          <span>Secure Transactions</span>
        </div>
      </div>

      {/* Concise AI Optical Brief */}
      <div className="rounded-[18px] border border-[#C5A059]/40 bg-[#14100C] text-[#FAF3E3] p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.18em] text-[#E6C97A]">
            AI Gemologist Dossier Brief
          </span>
          <button
            type="button"
            onClick={handleRequestGemologistBrief}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider bg-[#221C14] border border-[#C5A059]/50 rounded-full text-[#E6C97A] hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            {aiLoading ? 'Synthesizing…' : 'Analyze Dossier'}
          </button>
        </div>
        {aiAnalysis && <p className="text-sm text-[#E5D4B3] leading-relaxed">{aiAnalysis}</p>}
        {aiError && <p className="text-xs text-[#F87171]">{aiError}</p>}
      </div>

      {/* Ring Size Guide Modal */}
      {sizeGuideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="International Ring Size Guide"
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="max-w-lg w-full rounded-[24px] border border-[#C5A059] bg-[#FFFDF9] p-6 sm:p-8 text-[#1A1612] space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5D4B3] pb-3">
              <h3 className="text-2xl font-normal">Geneva Atelier Size Guide</h3>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF3E3] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-[#5C4E3C]">
              Complimentary first resizing is included with every Maihan Gems creation within 60 days of delivery.
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] font-[family-name:var(--font-mono)] uppercase">
                  <th className="py-2 text-left">US Size</th>
                  <th className="py-2 text-left">Inner Diameter (mm)</th>
                  <th className="py-2 text-left">EU / Geneva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE5D1]">
                <tr><td className="py-2 font-semibold">4</td><td className="py-2">14.9 mm</td><td className="py-2">47</td></tr>
                <tr><td className="py-2 font-semibold">5</td><td className="py-2">15.7 mm</td><td className="py-2">49</td></tr>
                <tr><td className="py-2 font-semibold">6</td><td className="py-2">16.5 mm</td><td className="py-2">52</td></tr>
                <tr><td className="py-2 font-semibold">7</td><td className="py-2">17.3 mm</td><td className="py-2">54</td></tr>
                <tr><td className="py-2 font-semibold">8</td><td className="py-2">18.1 mm</td><td className="py-2">57</td></tr>
                <tr><td className="py-2 font-semibold">9</td><td className="py-2">18.9 mm</td><td className="py-2">59</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductDetailBelowFoldSections({ stone }: { stone: GemstoneItem }) {
  const isJewellery = stone.varietySlug === 'rings' || stone.varietySlug === 'necklaces';
  const [activeTab, setActiveTab] = useState<'details' | 'cert' | 'origin' | 'shipping'>('details');
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [turntableAngle, setTurntableAngle] = useState(0);

  return (
    <div className="mt-16 space-y-20 font-[family-name:var(--font-eb-garamond)]">
      {/* =====================================================================
          1. INTERACTIVE LUXURY TAB BAR + SPECIFICATIONS & EDITORIAL STORY
         ===================================================================== */}
      <section aria-label="Product specifications and story" className="space-y-10">
        {/* Horizontal Tab Navigation */}
        <div
          role="tablist"
          aria-label="Product detail sections"
          className="flex flex-wrap items-center gap-6 sm:gap-10 border-b border-[#E5D4B3]"
        >
          {[
            { id: 'details' as const, label: 'Details' },
            { id: 'cert' as const, label: isJewellery ? 'Gemstone & Certificate' : 'Certification' },
            { id: 'origin' as const, label: isJewellery ? 'Craftsmanship' : 'Origin' },
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
                className={`pb-3.5 text-base sm:text-lg transition-all relative cursor-pointer ${
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

        {/* Split Specifications Table + Editorial Narrative ("Nature's Masterpiece" or "A Design Beyond Time") */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Specifications & Evidence Ledger (Always rendered in DOM for accessibility & evidence verification) */}
          <div className="lg:col-span-5 rounded-[24px] border border-[#E5D4B3] bg-[#FFFDF9]/95 p-6 sm:p-8 shadow-[0_12px_34px_rgba(36,26,14,0.05)] space-y-5">
            <h2 className="text-2xl font-normal text-[#1A1612]">
              {isJewellery ? 'Jewellery Specifications' : 'Gemstone Specifications'}
            </h2>

            <dl className="divide-y divide-[#EFE5D1] text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Specimen SKU</dt>
                <dd className="font-[family-name:var(--font-mono)] text-xs text-[#1A1612] font-semibold">
                  {stone.sku}
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Gemstone Type</dt>
                <dd className="text-[#1A1612] font-medium">Natural {stone.variety}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Carat Weight</dt>
                <dd className="font-[family-name:var(--font-mono)] text-xs tabular-nums text-[#1A1612] font-semibold">
                  {stone.carat.toFixed(2)} ct
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Cut / Shape</dt>
                <dd className="text-[#1A1612] font-medium">{stone.shape ?? 'Not evidenced'}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Clarity</dt>
                <dd className="text-[#1A1612] font-medium">{stone.clarity ?? 'Not evidenced'}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Treatment</dt>
                <dd className="text-[#1A1612] font-medium text-right">{stone.treatmentDisclosed}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Origin</dt>
                <dd className="text-[#1A1612] font-medium">{stone.origin}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Mining Sub-District</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.miningDistrict} />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Dimensions</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.dimensionsMm} mono />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Certification</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.laboratory} />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Report Number</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.reportNumber} mono />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Refractive Index</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.refractiveIndex} mono />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Fluorescence</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.fluorescence} />
                </dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-[#76726A]">Specific Gravity</dt>
                <dd className="text-[#1A1612] text-right">
                  <EvidenceValue value={stone.evidence.specificGravity} mono />
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => setCertModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#C5A059] bg-[#FAF3E3] hover:bg-[#C5A059] hover:text-[#14100C] px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] font-semibold text-[#1A1612] transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              View Certificate
            </button>
          </div>

          {/* Right: Editorial Narrative + Macro Visual Showcase */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#9A7432] font-semibold">
                <span className="h-px w-6 bg-[#C5A059]" />
                <span>{isJewellery ? 'CRAFTED TO PERFECTION' : 'ABOUT THE GEMSTONE'}</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-normal text-[#1A1612] leading-tight">
                {isJewellery ? 'A Design Beyond Time' : "Nature's Masterpiece"}
              </h3>
              <p className="text-base text-[#3D3429] leading-relaxed font-medium">
                {stone.lede}
              </p>
              <p className="text-base text-[#5C4E3C] leading-relaxed">
                {stone.description}
              </p>
              {activeTab === 'shipping' && (
                <div className="rounded-[18px] border border-[#C5A059]/50 bg-[#FAF3E3] p-4 text-sm text-[#1A1612] space-y-1.5">
                  <p className="font-semibold">Complimentary Armoured Dispatch &amp; 14-Day Inspection</p>
                  <p className="text-[#5C4E3C]">
                    Every acquisition is dispatched via insured Malca-Amit or FedEx Priority courier from our Geneva vault with a 14-day return guarantee.
                  </p>
                </div>
              )}
            </div>

            <div className="md:col-span-5 space-y-4">
              <div className="relative aspect-[4/4.2] rounded-[22px] overflow-hidden border border-[#E5D4B3] bg-[#14100C] shadow-lg group">
                <img
                  src={stone.images[0]}
                  alt={`${stone.name} macro detail`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
                  <span className="text-xs text-[#FAF3E3] font-[family-name:var(--font-mono)]">
                    Macro Optical Facets
                  </span>
                  <Link
                    href={`/ar/${stone.webarAssetId || 'webar-tz-0131'}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#C5A059] px-3 py-1 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider font-bold text-[#14100C]"
                  >
                    Explore in 360° →
                  </Link>
                </div>
              </div>
              {isJewellery && (
                <div className="relative aspect-[16/10] rounded-[18px] overflow-hidden border border-[#E5D4B3] bg-[#14100C] shadow-md">
                  <img
                    src="/mgh/images/gems/setting-ring.jpg"
                    alt="Geneva Bench Goldsmithing"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs text-[#FAF3E3]">
                      Hand-forged gallery &amp; precision claw seating in Geneva
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. 360° TURNTABLE STUDIO + ASSURED AUTHENTICITY CERTIFICATE SHOWCASE
         ===================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left: 360° Interactive Viewer Card */}
        <div className="lg:col-span-6 rounded-[28px] border border-[#E5D4B3] bg-[#FFFDF9] p-6 sm:p-8 shadow-[0_14px_38px_rgba(36,26,14,0.06)] flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-2xl sm:text-3xl font-normal text-[#1A1612]">360° View</h3>
            <p className="text-sm text-[#5C4E3C] mt-1">
              Rotate and inspect the optical symmetry, crown facets, and light return of {stone.name}.
            </p>
          </div>

          <div className="relative aspect-[16/10] w-full rounded-[20px] overflow-hidden border border-[#E5D4B3] bg-[#12100D] flex items-center justify-center">
            <img
              src={stone.images[0]}
              alt={`${stone.name} 360 turntable`}
              referrerPolicy="no-referrer"
              style={{ transform: `rotate(${turntableAngle}deg)` }}
              className="h-full w-full object-cover transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

            {/* Turntable Control Bar */}
            <div className="absolute bottom-3 inset-x-4 flex items-center justify-between rounded-full bg-black/70 border border-white/15 px-4 py-2 backdrop-blur-md text-white">
              <button
                type="button"
                onClick={() => setTurntableAngle((prev) => (prev + 45) % 360)}
                className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)] text-[#E6C97A] hover:text-white cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate +45°
              </button>
              <span className="text-[11px] font-[family-name:var(--font-mono)] text-white/75">
                Angle: {turntableAngle}°
              </span>
              <Link
                href={`/ar/${stone.webarAssetId || 'webar-tz-0131'}`}
                className="text-xs font-[family-name:var(--font-mono)] text-white hover:text-[#E6C97A]"
              >
                3D Studio →
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Assured Authenticity Certificate Card */}
        <div className="lg:col-span-6 rounded-[28px] border border-[#E5D4B3] bg-gradient-to-br from-[#FFFDF9] via-[#FAF3E3] to-[#F2E4C6] p-6 sm:p-8 shadow-[0_14px_38px_rgba(36,26,14,0.06)] flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.24em] text-[#9A7432] font-semibold">
              <span className="h-px w-6 bg-[#C5A059]" />
              <span>CERTIFICATION</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-normal text-[#1A1612]">
              Assured Authenticity
            </h3>
            <p className="text-base text-[#5C4E3C] leading-relaxed">
              This specimen is accompanied by an independent gemological dossier verifying its natural origin, carat weight, and disclosed treatment status.
            </p>
          </div>

          {/* Certificate Visual Mockup Card */}
          <div className="rounded-[20px] border border-[#C5A059]/60 bg-[#FFFDF9] p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8C6D2F] font-semibold">
                <Award className="h-4 w-4 text-[#C5A059]" />
                <span>{stone.evidence.laboratory || 'Not evidenced'} GEMOLOGICAL REPORT</span>
              </div>
              <p className="text-lg font-semibold text-[#1A1612]">{stone.name}</p>
              <p className="text-xs font-[family-name:var(--font-mono)] text-[#5C4E3C]">
                Report #{stone.evidence.reportNumber || 'Not evidenced'} · {stone.origin}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCertModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full gold-gradient-cta px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold shrink-0 cursor-pointer"
            >
              <span>View Certificate</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. FULL-WIDTH ORIGIN / CRAFTSMANSHIP EDITORIAL BANNER
         ===================================================================== */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#C5A059]/40 bg-[#14100C] text-[#FAF3E3] shadow-[0_24px_60px_rgba(20,16,12,0.22)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 space-y-5">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#E6C97A]">
              <span className="h-px w-6 bg-[#D4AF37]" />
              <span>{isJewellery ? 'CRAFTSMANSHIP' : 'THE ORIGIN'}</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-normal text-white leading-tight">
              {isJewellery ? 'Elegance in Every Detail' : 'From Earth to Eternity'}
            </h3>
            <p className="text-base text-[#D8CEBE] leading-relaxed">
              {isJewellery
                ? 'Every Maihan Gems jewel is individually forged, balanced, and hand-set in our Rue du Rhône workshop in Geneva to honour the optical geometry of its center stone.'
                : `Sourced from ${stone.origin} (${stone.evidence.miningDistrict || 'not evidenced'}), this natural ${stone.variety.toLowerCase()} was selected for its exceptional saturation, transparency, and lapidary proportion.`}
            </p>
          </div>

          <div className="lg:col-span-6 p-8 sm:p-12 bg-gradient-to-br from-[#1E1812] to-[#120E0A] border-t lg:border-t-0 lg:border-l border-white/10 space-y-4">
            {[
              {
                title: 'Natural & Certified Gemstones',
                desc: 'Every stone is laboratory verified with zero undisclosed treatments.',
              },
              {
                title: 'Geneva Master Lapidary & Goldsmiths',
                desc: 'Precision optical cutting and bespoke 18k gold or Platinum 950 mounting.',
              },
              {
                title: 'Documented Mine-to-Vault Provenance',
                desc: `Traceable custody from ${stone.origin} to our insured Swiss vault.`,
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="rounded-[18px] border border-[#C5A059]/25 bg-white/[0.04] p-4 flex items-start gap-3.5"
              >
                <CheckCircle2 className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-base font-medium text-white">{feat.title}</h4>
                  <p className="text-xs text-[#D8CEBE] mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certificate Inspection Modal */}
      {certModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Laboratory Certificate Dossier"
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCertModalOpen(false)}
        >
          <div
            className="max-w-xl w-full rounded-[26px] border-2 border-[#C5A059] bg-[#FFFDF9] p-6 sm:p-8 text-[#1A1612] space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5D4B3] pb-4">
              <div>
                <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#8C6D2F]">
                  Verified Laboratory Report
                </p>
                <h3 className="text-2xl font-normal mt-0.5">
                  {stone.evidence.laboratory || 'Not evidenced'} Certificate #{stone.evidence.reportNumber || stone.sku}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                className="p-2 rounded-full hover:bg-[#FAF3E3] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-[#FAF3E3]/60 rounded-[18px] p-4 border border-[#E5D4B3]">
              <div>
                <span className="text-xs text-[#76726A] block">Specimen</span>
                <strong className="text-[#1A1612]">{stone.name}</strong>
              </div>
              <div>
                <span className="text-xs text-[#76726A] block">Carat &amp; Shape</span>
                <strong className="text-[#1A1612]">
                  {stone.carat.toFixed(2)} ct · {stone.shape ?? 'Not evidenced'}
                </strong>
              </div>
              <div>
                <span className="text-xs text-[#76726A] block">Geographic Origin</span>
                <strong className="text-[#1A1612]">{stone.origin}</strong>
              </div>
              <div>
                <span className="text-xs text-[#76726A] block">Disclosed Treatment</span>
                <strong className="text-[#1A1612]">{stone.treatmentDisclosed}</strong>
              </div>
              <div>
                <span className="text-xs text-[#76726A] block">Refractive Index</span>
                <strong className="font-[family-name:var(--font-mono)] text-xs text-[#1A1612]">
                  {stone.evidence.refractiveIndex || 'Not evidenced'}
                </strong>
              </div>
              <div>
                <span className="text-xs text-[#76726A] block">Dimensions</span>
                <strong className="font-[family-name:var(--font-mono)] text-xs text-[#1A1612]">
                  {stone.evidence.dimensionsMm || 'Not evidenced'}
                </strong>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                className="rounded-full gold-gradient-cta px-6 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
