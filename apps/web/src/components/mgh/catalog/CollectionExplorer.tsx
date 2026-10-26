// @ts-nocheck
'use client';

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Eye, X, SlidersHorizontal, Heart, Scale } from 'lucide-react';
import { GemstoneItem } from '@/lib/mgh/fixtures';
import { VARIETIES_META, COLOURS_META } from '@/lib/mgh/fixtures/catalog';
import { ProductCard } from './ProductCard';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';

export function CollectionExplorerSkeleton({
  count = 9,
  viewMode = 'grid',
}: {
  count?: number;
  viewMode?: 'grid' | 'list';
}) {
  if (viewMode === 'list') {
    return (
      <div
        data-testid="collection-explorer-skeleton"
        className="divide-y divide-[#E4DFD5] rounded-sm border border-[#EAE5DC] bg-white animate-pulse"
      >
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-4">
              <div className="h-20 w-24 rounded-sm bg-[#EFECE6] shrink-0" />
              <div className="space-y-2">
                <div className="h-2.5 w-32 bg-[#E2DED6] rounded-xs" />
                <div className="h-4 w-48 bg-[#DCD8D0] rounded-xs" />
                <div className="h-2.5 w-40 bg-[#E2DED6] rounded-xs" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-20 bg-[#DCD8D0] rounded-xs" />
              <div className="h-8 w-20 bg-[#EFECE6] rounded-sm" />
              <div className="h-8 w-24 bg-[#0A0A0B]/20 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid="collection-explorer-skeleton"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 animate-pulse"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col bg-white border border-[#EAE5DC] overflow-hidden"
        >
          {/* Portrait stage shimmer */}
          <div className="relative aspect-[4/5] w-full bg-[#EFECE6]">
            <div className="absolute top-3.5 right-3.5 flex gap-1.5">
              <div className="h-7 w-7 rounded-sm bg-white/70" />
              <div className="h-7 w-7 rounded-sm bg-white/70" />
            </div>
          </div>
          {/* Card body shimmer */}
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="h-2.5 w-24 bg-[#E2DED6] rounded-xs" />
              <div className="h-5 w-3/4 bg-[#DCD8D0] rounded-xs" />
            </div>
            <div className="pt-3.5 border-t border-[#F0ECE3] flex items-center justify-between">
              <div className="h-4 w-20 bg-[#E2DED6] rounded-xs" />
              <div className="h-8 w-24 bg-[#0A0A0B]/20 rounded-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CollectionExplorer({
  initialItems,
  lockedVarietySlug,
  lockedColourSlug,
  isLoading = false,
}: {
  initialItems: GemstoneItem[];
  lockedVarietySlug?: string;
  lockedColourSlug?: string;
  isLoading?: boolean;
}) {
  const { addToCart, toggleFavorite, toggleCompare, favorites, compareList, formatPrice } = useStorefront();

  // Compute absolute min and max prices from data
  const { minAvailablePrice, maxAvailablePrice } = useMemo(() => {
    if (initialItems.length === 0) return { minAvailablePrice: 1000, maxAvailablePrice: 20000 };
    const prices = initialItems.map((g) => g.price);
    return {
      minAvailablePrice: Math.min(...prices),
      maxAvailablePrice: Math.max(...prices),
    };
  }, [initialItems]);

  const [variety, setVariety] = useState(lockedVarietySlug || 'all');
  const [colour, setColour] = useState(lockedColourSlug || 'all');
  const [shape, setShape] = useState('all');
  const [treatment, setTreatment] = useState('all');
  const [maxBudget, setMaxBudget] = useState<number>(maxAvailablePrice);
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc' | 'carat-desc'>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [quickViewStone, setQuickViewStone] = useState<GemstoneItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFilteringShimmer, setIsFilteringShimmer] = useState(false);

  // Sync max budget if initial items change
  useEffect(() => {
    setMaxBudget(maxAvailablePrice);
  }, [maxAvailablePrice]);

  const pageSize = 9;

  const filtered = useMemo(() => {
    let list = [...initialItems];

    // Variety filter
    if (variety !== 'all') {
      list = list.filter((g) => g.varietySlug === variety);
    }
    // Colour/Hue filter
    if (colour !== 'all') {
      list = list.filter((g) => g.colourSlug === colour);
    }
    // Shape filter
    if (shape !== 'all') {
      list = list.filter((g) => g.shape.toLowerCase() === shape.toLowerCase());
    }
    // Treatment filter
    if (treatment !== 'all') {
      if (treatment === 'unheated') {
        list = list.filter(
          (g) =>
            g.treatmentDisclosed.toLowerCase().includes('no heat') ||
            g.treatmentDisclosed.toLowerCase().includes('unheated') ||
            g.treatmentDisclosed.toLowerCase().includes('untreated') ||
            g.treatmentDisclosed.toLowerCase().includes('no oil')
        );
      } else if (treatment === 'heated') {
        list = list.filter(
          (g) =>
            g.treatmentDisclosed.toLowerCase().includes('heat-treated') ||
            g.treatmentDisclosed.toLowerCase().includes('low-temperature')
        );
      } else if (treatment === 'oiled') {
        list = list.filter((g) => g.treatmentDisclosed.toLowerCase().includes('oil'));
      }
    }

    // Price range budget filter
    if (maxBudget < maxAvailablePrice) {
      list = list.filter((g) => g.price <= maxBudget);
    }

    // Sorting
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'carat-desc') list.sort((a, b) => b.carat - a.carat);

    return list;
  }, [initialItems, variety, colour, shape, treatment, maxBudget, maxAvailablePrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const triggerFilterChange = (callback: () => void) => {
    setIsFilteringShimmer(true);
    startTransition(() => {
      callback();
      setPage(1);
    });
    window.setTimeout(() => {
      setIsFilteringShimmer(false);
    }, 180);
  };

  const resetFilters = () => {
    triggerFilterChange(() => {
      setVariety(lockedVarietySlug || 'all');
      setColour(lockedColourSlug || 'all');
      setShape('all');
      setTreatment('all');
      setMaxBudget(maxAvailablePrice);
      setSort('featured');
    });
  };

  const isFiltered =
    variety !== (lockedVarietySlug || 'all') ||
    colour !== (lockedColourSlug || 'all') ||
    shape !== 'all' ||
    treatment !== 'all' ||
    maxBudget < maxAvailablePrice ||
    sort !== 'featured';

  const isBusy = isLoading || isPending || isFilteringShimmer;

  return (
    <div className="space-y-8">
      {/* Luxury Filter & Price Range Slider Bar */}
      <div className="rounded-sm border border-[#EAE5DC] bg-white p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {!lockedVarietySlug && (
            <div>
              <label
                htmlFor="filter-variety"
                className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A] mb-1.5"
              >
                Gem Type
              </label>
              <select
                id="filter-variety"
                value={variety}
                onChange={(e) => triggerFilterChange(() => setVariety(e.target.value))}
                className="w-full rounded-sm border border-[#EAE5DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#121211] focus:border-[#D4AF37]"
              >
                <option value="all">All Gem Types</option>
                {VARIETIES_META.map((v) => (
                  <option key={v.slug} value={v.slug}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!lockedColourSlug && (
            <div>
              <label
                htmlFor="filter-colour"
                className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A] mb-1.5"
              >
                Color
              </label>
              <select
                id="filter-colour"
                value={colour}
                onChange={(e) => triggerFilterChange(() => setColour(e.target.value))}
                className="w-full rounded-sm border border-[#EAE5DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#121211] focus:border-[#D4AF37]"
              >
                <option value="all">All Colors</option>
                {COLOURS_META.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="filter-shape"
              className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A] mb-1.5"
            >
              Shape
            </label>
            <select
              id="filter-shape"
              value={shape}
              onChange={(e) => triggerFilterChange(() => setShape(e.target.value))}
              className="w-full rounded-sm border border-[#EAE5DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#121211] focus:border-[#D4AF37]"
            >
              <option value="all">All Shapes</option>
              <option value="Round">Round</option>
              <option value="Cushion">Cushion</option>
              <option value="Octagon">Octagon</option>
              <option value="Oval">Oval</option>
              <option value="Pear">Pear</option>
              <option value="Asscher">Asscher</option>
              <option value="Radiant">Radiant</option>
              <option value="Marquise">Marquise</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-treatment"
              className="block text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A] mb-1.5"
            >
              Treatment
            </label>
            <select
              id="filter-treatment"
              value={treatment}
              onChange={(e) => triggerFilterChange(() => setTreatment(e.target.value))}
              className="w-full rounded-sm border border-[#EAE5DC] bg-[#FAF8F5] px-3 py-2 text-xs text-[#121211] focus:border-[#D4AF37]"
            >
              <option value="all">All Stones</option>
              <option value="unheated">100% Untreated</option>
              <option value="heated">Gently Heated</option>
              <option value="oiled">Minor Oil</option>
            </select>
          </div>
        </div>

        {/* Price Range Slider Filter Section */}
        <div
          data-testid="price-range-slider-section"
          className="pt-4 border-t border-[#F0ECE3] grid grid-cols-1 md:grid-cols-12 gap-5 items-center"
        >
          <div className="md:col-span-8 space-y-2">
            <div className="flex items-center justify-between text-xs font-[family-name:var(--font-mono)]">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#76726A]">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#9A7B2C]" />
                <span>Price Range Filter</span>
              </span>
              <span
                data-testid="price-range-display"
                className="font-semibold tabular-nums text-[#121211]"
              >
                {maxBudget >= maxAvailablePrice ? (
                  <span className="text-[#9A7B2C]">All Budgets (Up to {formatPrice(maxAvailablePrice)})</span>
                ) : (
                  <span>Up to {formatPrice(maxBudget)}</span>
                )}
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                id="price-range-slider"
                data-testid="price-range-slider"
                type="range"
                min={minAvailablePrice}
                max={maxAvailablePrice}
                step={250}
                value={maxBudget}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  triggerFilterChange(() => setMaxBudget(val));
                }}
                aria-label="Filter gemstones by maximum budget"
                className="w-full h-1.5 bg-[#EAE5DC] rounded-lg appearance-none cursor-pointer accent-[#9A7B2C] focus:outline-none"
              />
            </div>

            <div className="flex justify-between text-[10px] font-[family-name:var(--font-mono)] text-[#8A857B] tabular-nums">
              <span>{formatPrice(minAvailablePrice)}</span>
              <span>{formatPrice(maxAvailablePrice)}</span>
            </div>
          </div>

          {/* Quick Budget Presets & Controls */}
          <div className="md:col-span-4 flex flex-wrap items-center justify-start md:justify-end gap-1.5">
            {[5000, 10000, 15000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => triggerFilterChange(() => setMaxBudget(preset))}
                className={`px-2.5 py-1 text-[10px] font-[family-name:var(--font-mono)] rounded-sm border transition-colors whitespace-nowrap ${
                  maxBudget === preset
                    ? 'border-[#9A7B2C] bg-[#0A0A0B] text-[#E6C97A]'
                    : 'border-[#EAE5DC] bg-[#FAF8F5] text-[#4E4C47] hover:border-[#9A7B2C]'
                }`}
              >
                ≤ {formatPrice(preset)}
              </button>
            ))}
            {maxBudget < maxAvailablePrice && (
              <button
                type="button"
                onClick={() => triggerFilterChange(() => setMaxBudget(maxAvailablePrice))}
                className="px-2 py-1 text-[10px] font-[family-name:var(--font-mono)] text-[#9A7B2C] hover:underline whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bottom Sorting & View Toggle Controls Row */}
        <div className="pt-4 border-t border-[#F0ECE3] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="sort-select"
              className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]"
            >
              Sort Order
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => triggerFilterChange(() => setSort(e.target.value as typeof sort))}
              className="rounded-sm border border-[#EAE5DC] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#121211] focus:border-[#D4AF37]"
            >
              <option value="featured">Vault Order</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="carat-desc">Carat: High to Low</option>
            </select>
          </div>

          <div className="flex items-center rounded-sm border border-[#EAE5DC] bg-[#FAF8F5] p-0.5">
            <button
              type="button"
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'grid' ? 'bg-[#0A0A0B] text-[#E6C97A]' : 'text-[#76726A]'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'list' ? 'bg-[#0A0A0B] text-[#E6C97A]' : 'text-[#76726A]'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count & Reset Filter Indicator */}
      <div className="flex items-center justify-between text-xs text-[#4E4C47]">
        <p className="font-[family-name:var(--font-mono)] tabular-nums">
          Showing {paginated.length} of {filtered.length} specimens
        </p>
        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            className="font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7B2C] hover:text-[#121211] underline underline-offset-4"
          >
            Reset All Filters
          </button>
        )}
      </div>

      {/* Main Content: Loading Skeleton or Results */}
      {isBusy ? (
        <CollectionExplorerSkeleton count={6} viewMode={viewMode} />
      ) : filtered.length === 0 ? (
        <div className="rounded-sm border border-[#EAE5DC] bg-white p-12 text-center space-y-4">
          <h3 className="font-[family-name:var(--font-display)] text-2xl text-[#121211]">
            No vault specimens match this budget and filter combination.
          </h3>
          <p className="text-xs font-[family-name:var(--font-mono)] text-[#76726A]">
            Try broadening your maximum budget slider or selecting &lsquo;All Varieties&rsquo;.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold bg-[#0A0A0B] text-[#E6C97A] rounded-sm hover:bg-[#1C1C1F]"
            >
              Clear Budget &amp; Filters
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {paginated.map((stone) => (
            <div key={stone.id} className="relative group">
              <ProductCard stone={stone} varietyScoped={Boolean(lockedVarietySlug)} />
              <button
                type="button"
                onClick={() => setQuickViewStone(stone)}
                aria-label={`Quick view ${stone.name}`}
                className="absolute top-6 right-18 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 px-3 py-1.5 text-[10px] font-[family-name:var(--font-sans)] uppercase tracking-wider text-[#E6C97A] hover:bg-black/90 hover:border-[#C5A880] z-20 transition-all opacity-0 group-hover:opacity-100"
              >
                <Eye className="h-3 w-3" />
                Quick View
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[#EAE5DC] rounded-sm border border-[#EAE5DC] bg-white">
          {paginated.map((stone) => {
            const isFav = favorites.includes(stone.id);
            const isCompared = compareList.includes(stone.id);
            return (
              <div
                key={stone.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={stone.images[0]}
                    alt={stone.name}
                    referrerPolicy="no-referrer"
                    className="h-20 w-24 rounded-sm border border-[#EAE5DC] bg-[#EFECE6] object-cover shrink-0"
                  />
                  <div>
                    <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#8A857B]">
                      {stone.variety} · {stone.origin} · {stone.clarity}
                    </p>
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-medium text-[#121211]">
                      <Link href={`/product/${stone.slug}`} className="hover:text-[#9A7B2C]">
                        {stone.name}
                      </Link>
                    </h3>
                    <p className="text-xs font-[family-name:var(--font-mono)] text-[#4E4C47] mt-0.5">
                      {stone.carat.toFixed(2)} ct · {stone.shape} · {stone.treatmentDisclosed}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-base font-semibold font-[family-name:var(--font-mono)] tabular-nums text-[#121211]">
                    {formatPrice(stone.price)}
                  </span>

                  {/* Heart Toggle for List View */}
                  <button
                    type="button"
                    data-testid="list-favorite-toggle"
                    onClick={() => toggleFavorite(stone.id)}
                    aria-pressed={isFav}
                    aria-label={isFav ? `Remove ${stone.name} from favorites` : `Save ${stone.name} to favorites`}
                    title={isFav ? 'Saved in favorites' : 'Save to favorites'}
                    className={`p-2 rounded-sm border transition-colors ${
                      isFav
                        ? 'bg-[#0A0A0B] text-[#E6C97A] border-[#D4AF37]'
                        : 'border-[#EAE5DC] text-[#76726A] hover:border-[#D4AF37]'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-[#E6C97A]' : ''}`} />
                  </button>

                  {/* Compare Toggle for List View */}
                  <button
                    type="button"
                    onClick={() => toggleCompare(stone.id)}
                    aria-pressed={isCompared}
                    aria-label={isCompared ? `Remove ${stone.name} from compare tray` : `Add ${stone.name} to compare tray`}
                    className={`p-2 rounded-sm border transition-colors ${
                      isCompared
                        ? 'bg-[#0A0A0B] text-[#E6C97A] border-[#D4AF37]'
                        : 'border-[#EAE5DC] text-[#76726A] hover:border-[#D4AF37]'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickViewStone(stone)}
                    className="px-3 py-1.5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#EAE5DC] rounded-sm hover:border-[#121211]"
                  >
                    Preview
                  </button>

                  <Link
                    href={`/product/${stone.slug}`}
                    className="px-3.5 py-1.5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold bg-[#0A0A0B] text-[#E6C97A] rounded-sm hover:bg-[#1C1C1F]"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isBusy && (
        <nav aria-label="Catalogue pagination" className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
            <button
              key={p}
              type="button"
              aria-current={currentPage === p ? 'page' : undefined}
              onClick={() => setPage(p)}
              className={`px-3.5 py-1.5 text-xs font-[family-name:var(--font-mono)] rounded-sm border transition-colors ${
                currentPage === p
                  ? 'bg-[#0A0A0B] text-[#E6C97A] border-[#D4AF37]'
                  : 'bg-white text-[#121211] border-[#EAE5DC] hover:bg-[#FAF8F5]'
              }`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}

      {/* Quick View Modal */}
      {quickViewStone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view ${quickViewStone.name}`}
        >
          <div className="fixed inset-0" onClick={() => setQuickViewStone(null)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-2xl rounded-sm bg-[#FAF8F5] border border-[#D4AF37]/40 p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#EAE5DC] pb-4">
              <div>
                <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7B2C]">
                  {quickViewStone.sku} · {quickViewStone.origin}
                </p>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211] mt-0.5">
                  {quickViewStone.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickViewStone(null)}
                aria-label="Close quick view"
                className="p-1.5 text-[#4E4C47] hover:text-[#121211]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5">
              <img
                src={quickViewStone.images[0]}
                alt={quickViewStone.name}
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full rounded-sm border border-[#EAE5DC] bg-[#EFECE6] object-cover"
              />
              <div className="space-y-3 text-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-[#EAE5DC] py-1.5">
                    <span className="text-[#76726A]">Carat Weight</span>
                    <span className="font-[family-name:var(--font-mono)] text-[#121211]">
                      {quickViewStone.carat.toFixed(2)} ct
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#EAE5DC] py-1.5">
                    <span className="text-[#76726A]">Shape &amp; Clarity</span>
                    <span className="text-[#121211]">
                      {quickViewStone.shape} · {quickViewStone.clarity}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#EAE5DC] py-1.5">
                    <span className="text-[#76726A]">Treatment</span>
                    <span className="text-[#121211] text-right">{quickViewStone.treatmentDisclosed}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[#76726A]">Vault Price</span>
                    <span className="text-base font-semibold font-[family-name:var(--font-mono)] text-[#121211]">
                      {formatPrice(quickViewStone.price)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart({
                        id: quickViewStone.id,
                        sku: quickViewStone.sku,
                        slug: quickViewStone.slug,
                        name: quickViewStone.name,
                        subtitle: `${quickViewStone.shape} · ${quickViewStone.carat.toFixed(2)} ct`,
                        price: quickViewStone.price,
                        image: quickViewStone.images[0],
                        kind: 'gemstone',
                      });
                      setQuickViewStone(null);
                    }}
                    className="flex-1 px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
                  >
                    Acquire
                  </button>
                  <Link
                    href={`/product/${quickViewStone.slug}`}
                    onClick={() => setQuickViewStone(null)}
                    className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold border border-[#121211] text-[#121211] bg-white rounded-sm hover:bg-[#EFECE6]"
                  >
                    Dossier →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
