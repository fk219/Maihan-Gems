'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, Scale } from 'lucide-react';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { DirhamLogo } from '@/components/mgh/ui/DirhamLogo';
import { normalizeCompareId } from '@/lib/mgh/storefront-data';

export interface ProductCardProps {
  category?: string;
  name?: string;
  material?: string;
  carat?: string | number;
  price?: string | number;
  image?: string;
  href?: string;
  stone?: GemstoneItem;
  compareId?: string;
  varietyScoped?: boolean;
  className?: string;
}

export function ProductCard({
  category,
  name,
  material,
  carat,
  price,
  image,
  href,
  stone,
  compareId,
  varietyScoped = false,
  className = '',
}: ProductCardProps) {
  const {
    addToCart,
    toggleFavorite,
    toggleCompare,
    favorites,
    compareList,
    formatPrice,
    currency,
    setCartOpen,
  } = useStorefront();

  const [imgError, setImgError] = useState(false);

  // Derive values supporting both direct props and stone object
  const displayName = name || stone?.name || 'Elysian Ring';
  const displayCategory = category || stone?.variety || 'Gemstones';
  const displayMaterial =
    material ||
    (stone
      ? stone.treatmentDisclosed?.toLowerCase().includes('none')
        ? `Natural ${stone.variety}`
        : stone.variety
      : 'Natural Diamond');

  const displayCarat =
    carat !== undefined
      ? typeof carat === 'number'
        ? `${carat.toFixed(2)} CT`
        : carat
      : stone
      ? `${stone.carat.toFixed(2)} CT`
      : '2.15 CT';

  const baseUsdPrice =
    typeof price === 'number'
      ? price
      : typeof price === 'string'
      ? parseFloat(price.replace(/[^0-9.]/g, '')) || 12800
      : stone
      ? stone.price
      : 12800;

  const displayPrice = formatPrice(baseUsdPrice);
  const formattedAedAmount = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(baseUsdPrice * 3.6725));

  const rawImage = image || (stone?.images && stone.images[0]) || '/mgh/images/elysian-ring.jpg';
  const displayImage = imgError ? '/mgh/images/gems/tanzanite-gem.jpg' : rawImage;

  const targetHref =
    href ||
    (stone
      ? varietyScoped
        ? `/${stone.varietySlug}/${stone.slug}`
        : `/products/${stone.slug}`
      : '/products/elysian-ring');

  const stoneId = stone?.id || compareId || `item-${displayName.toLowerCase().replace(/\s+/g, '-')}`;
  const resolvedCompareId = normalizeCompareId(
    compareId ||
      stone?.id ||
      (targetHref.startsWith('/settings/SET-') ? targetHref.replace('/settings/', '') : stoneId)
  );
  const isFav = favorites.includes(stoneId);
  const isCompared = compareList.includes(resolvedCompareId);

  const handleAcquire = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let numericPrice = 12800;
    if (stone?.price) {
      numericPrice = stone.price;
    } else if (typeof price === 'number') {
      numericPrice = price;
    } else if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) numericPrice = parsed;
    }

    addToCart({
      id: stoneId,
      sku: stone?.sku || `SKU-${stoneId.toUpperCase()}`,
      slug: stone?.slug || displayName.toLowerCase().replace(/\s+/g, '-'),
      name: displayName,
      subtitle: `${displayCarat} · ${displayMaterial}`,
      price: numericPrice,
      image: rawImage,
      kind: 'gemstone',
    });

    setCartOpen(true);
  };

  return (
    <article
      data-testid="product-card"
      data-stone-id={stoneId}
      className={`group relative overflow-hidden rounded-[24px] border border-[#E5D4B3] bg-[#FAF8F4] transition-all duration-500 hover:-translate-y-1 hover:border-[#C5A059] shadow-[0_14px_38px_rgba(185,150,75,0.12)] hover:shadow-[0_24px_56px_rgba(185,150,75,0.24)] flex flex-col justify-between p-6 sm:p-7 aspect-[10/14] sm:aspect-[3/4] min-h-[450px] ${className}`}
    >
      {/* 1. Full-Bleed Background Image Covering the Entire Card */}
      <img
        src={displayImage}
        alt={displayName}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
        className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* 2. Luminous Light-Colored Pearl & Golden Cloud Overlays */}
      {/* Top warm ivory veil for category readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FAF7F0]/90 via-[#FAF7F0]/45 to-transparent z-[1]"
      />
      {/* Bottom creamy pearl & soft gold gradient for crisp dark typography */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#FAF7F0]/98 via-[#FAF7F0]/84 to-transparent z-[1]"
      />
      {/* Subtle golden cloud shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(212,175,55,0.14),transparent_65%)] z-[1]"
      />

      {/* 3. Top Section: Category with Gold Line & Circular Frosted Wishlist + Compare Buttons */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#8B6B23] font-semibold">
            {displayCategory}
          </p>
          <div className="w-7 h-[1.5px] bg-[#C5A059] mt-1.5" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="product-card-compare-toggle"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(resolvedCompareId);
            }}
            aria-pressed={isCompared}
            aria-label={
              isCompared
                ? `Remove ${displayName} from comparison`
                : `Compare ${displayName} with same category`
            }
            title={isCompared ? 'In comparison tray' : 'Compare with same category'}
            className={`w-10 h-10 rounded-full border backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
              isCompared
                ? 'border-[#C5A059] text-[#9A7B2C] bg-[#FAF3E3] shadow-[0_4px_14px_rgba(197,160,89,0.3)]'
                : 'border-[#D8C49E] bg-white/80 text-[#3B3328] hover:text-[#8B6B23] hover:border-[#C5A059] hover:bg-white'
            }`}
          >
            <Scale className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-testid="product-card-favorite-toggle"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(stoneId);
            }}
            aria-pressed={isFav}
            aria-label={
              isFav ? `Remove ${displayName} from favorites` : `Save ${displayName} to favorites`
            }
            title={isFav ? 'Saved in favorites' : 'Save to favorites'}
            className={`w-10 h-10 rounded-full border backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
              isFav
                ? 'border-[#C5A059] text-[#9A7B2C] bg-white shadow-[0_4px_14px_rgba(197,160,89,0.3)]'
                : 'border-[#D8C49E] bg-white/80 text-[#3B3328] hover:text-[#8B6B23] hover:border-[#C5A059] hover:bg-white'
            }`}
          >
            <Heart
              className={`h-4 w-4 transition-transform duration-200 ${
                isFav ? 'scale-110 fill-[#D4AF37] text-[#D4AF37]' : 'fill-none'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Clickable Card Link covering the body */}
      <Link
        href={targetHref}
        className="absolute inset-0 z-[5] cursor-pointer"
        aria-label={`View details for ${displayName}`}
      />

      {/* 4. Bottom Section: Gold Line, Title, Material · Carat, Price, and Circular Arrow Button */}
      <div className="relative z-10 flex flex-col justify-end space-y-2.5 pointer-events-none">
        <div className="w-7 h-[1.5px] bg-[#C5A059] mb-0.5" />

        <div className="space-y-1">
          <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl sm:text-[28px] font-normal text-[#181613] tracking-normal leading-tight group-hover:text-[#7A5C1B] transition-colors line-clamp-1">
            {displayName}
          </h3>

          <p className="text-[11px] uppercase tracking-[0.22em] text-[#6E6250] font-[family-name:var(--font-eb-garamond)] font-semibold">
            {displayMaterial.toUpperCase()} · {displayCarat.toUpperCase()}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-2xl sm:text-[26px] font-[family-name:var(--font-eb-garamond)] text-[#181613] font-medium tracking-wide tabular-nums">
            {currency === 'AED' ? (
              <>
                <DirhamLogo className="h-5 w-5 text-[#8B6B23] shrink-0" />
                <span>{formattedAedAmount}</span>
              </>
            ) : (
              displayPrice
            )}
          </span>

          <button
            type="button"
            onClick={handleAcquire}
            aria-label={`Add ${displayName} to bag`}
            title="Add to Bag"
            className="pointer-events-auto w-12 h-12 rounded-full border border-[#C5A059] bg-white/90 hover:bg-[#D4AF37] hover:border-[#D4AF37] text-[#181613] hover:text-white backdrop-blur-md flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_6px_18px_rgba(185,150,75,0.2)] group/btn shrink-0 cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
