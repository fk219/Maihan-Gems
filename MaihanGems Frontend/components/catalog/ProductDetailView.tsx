import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GemstoneItem } from '@/lib/fixtures';
import { getRelatedGemstones } from '@/lib/storefront-data';
import {
  ProductDetailGallery,
  ProductDetailActionsAndAccordion,
  ProductDetailBelowFoldSections,
} from './ProductDetailClient';
import { ProductCard } from './ProductCard';
import { SITE_URL } from '@/app/layout';

export function ProductDetailSkeleton() {
  return (
    <div
      data-testid="product-detail-skeleton"
      className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14 animate-pulse space-y-12">
        <div className="h-3 w-56 bg-[#EAE5DC] rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 flex gap-4">
            <div className="w-24 space-y-3 hidden sm:block">
              <div className="h-20 w-24 rounded-2xl bg-[#EFECE6]" />
              <div className="h-20 w-24 rounded-2xl bg-[#EFECE6]" />
              <div className="h-20 w-24 rounded-2xl bg-[#EFECE6]" />
            </div>
            <div className="flex-1 aspect-[4/3.5] rounded-[24px] bg-[#EFECE6]" />
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-3 w-36 bg-[#E2DED6] rounded-full" />
            <div className="h-10 w-4/5 bg-[#DDD8CF] rounded-lg" />
            <div className="h-8 w-36 bg-[#DDD8CF] rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 bg-[#D4AF37]/35 rounded-full" />
              <div className="h-12 bg-[#0A0A0B]/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailView({
  stone,
  breadcrumbVariety,
  isLoading = false,
}: {
  stone?: GemstoneItem | null;
  breadcrumbVariety?: { name: string; slug: string };
  isLoading?: boolean;
}) {
  if (isLoading || !stone) {
    return <ProductDetailSkeleton />;
  }

  const isJewellery = stone.varietySlug === 'rings' || stone.varietySlug === 'necklaces';
  const related = getRelatedGemstones(stone.id, stone.varietySlug, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: stone.name,
    sku: stone.sku,
    description: stone.lede,
    image: stone.images.map((img) => `${SITE_URL}${img}`),
    brand: {
      '@type': 'Brand',
      name: 'Maihan Gems',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Carat', value: stone.carat },
      { '@type': 'PropertyValue', name: 'Shape', value: stone.shape },
      { '@type': 'PropertyValue', name: 'Clarity', value: stone.clarity },
      { '@type': 'PropertyValue', name: 'Disclosed Treatment', value: stone.treatmentDisclosed },
      { '@type': 'PropertyValue', name: 'Origin', value: stone.origin },
    ],
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${stone.slug}`,
      priceCurrency: 'USD',
      price: stone.price,
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]"
        >
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-[#1A1612]">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            {isJewellery ? (
              <li>
                <Link href="/jewellery" className="hover:text-[#1A1612]">
                  Fine Jewellery
                </Link>
              </li>
            ) : breadcrumbVariety ? (
              <>
                <li>
                  <Link href="/varieties" className="hover:text-[#1A1612]">
                    Gemstones
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/varieties/${breadcrumbVariety.slug}`} className="hover:text-[#1A1612]">
                    {breadcrumbVariety.name}
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link href="/varieties" className="hover:text-[#1A1612]">
                  Gemstones
                </Link>
              </li>
            )}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-[#1A1612]">
              {stone.name}
            </li>
          </ol>
        </nav>

        {/* Above-the-Fold 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: Vertical Thumbnails + Main Stage Image */}
          <div className="lg:col-span-7">
            <ProductDetailGallery stone={stone} />
          </div>

          {/* Right: Kicker, Title, Subtitle, Price, Selectors, Actions & Trust */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2.5">
              {/* Gold Line + Category Kicker */}
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.28em] text-[#9A7432] font-semibold">
                <span className="h-px w-6 bg-[#C5A059]" />
                <span>{isJewellery ? stone.varietySlug.toUpperCase() : stone.variety.toUpperCase()}</span>
              </div>

              {/* Server-rendered h1 */}
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-normal text-[#1A1612] leading-[1.12] text-balance">
                {stone.name}
              </h1>

              {/* Subtitle / Quality Tagline */}
              {isJewellery ? (
                <p className="text-base text-[#5C4E3C] leading-relaxed">
                  {stone.lede}
                </p>
              ) : (
                <p className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#76726A]">
                  NATURAL · {stone.treatmentDisclosed.toUpperCase()} · {stone.origin.toUpperCase()}
                </p>
              )}
            </div>

            <ProductDetailActionsAndAccordion stone={stone} />
          </div>
        </div>

        {/* Below-the-Fold Interactive Tabs, Specifications, 360° Studio, Certificate & Origin Banner */}
        <ProductDetailBelowFoldSections stone={stone} />

        {/* Related Gemstones / You May Also Like (4-Card Row) */}
        <section
          aria-labelledby="related-stones-heading"
          className="mt-20 border-t border-[#E5D4B3] pt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#9A7432] font-semibold">
                <span className="h-px w-6 bg-[#C5A059]" />
                <span>{isJewellery ? 'COMPLETE THE LOOK' : 'RELATED GEMSTONES'}</span>
              </div>
              <h2
                id="related-stones-heading"
                className="text-3xl sm:text-4xl font-normal text-[#1A1612] mt-1.5"
              >
                {isJewellery ? 'You May Also Like' : 'Explore More'}
              </h2>
            </div>
            <Link
              href={isJewellery ? '/jewellery' : '/browse'}
              className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#9A7432] hover:text-[#1A1612]"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} stone={item} />
            ))}
          </div>
        </section>

        {/* Bottom Editorial CTA Banner ("Discover Rare Beauty" / "A Collection of Rare Jewellery") */}
        <section className="mt-20 relative overflow-hidden rounded-[28px] border border-[#C5A059]/40 bg-gradient-to-r from-[#120E0A] via-[#1C1610] to-[#261D14] p-8 sm:p-12 lg:p-14 text-white shadow-[0_24px_60px_rgba(20,16,12,0.25)]">
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.26em] text-[#E6C97A]">
              <span className="h-px w-6 bg-[#D4AF37]" />
              <span>{isJewellery ? 'EXPLORE MORE' : 'EXPLORE MORE'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-normal text-white leading-tight">
              {isJewellery ? 'A Collection of Rare Jewellery' : 'Discover Rare Beauty'}
            </h2>
            <p className="text-base text-[#D8CEBE] leading-relaxed">
              {isJewellery
                ? 'Explore our handcrafted collection of fine jewellery, featuring natural certified gemstones and timeless Geneva craftsmanship.'
                : 'Explore our curated collection of natural, certified gemstones — each chosen for its exceptional colour, brilliance, and documented provenance.'}
            </p>
            <div className="pt-2">
              <Link
                href={isJewellery ? '/jewellery' : '/varieties'}
                className="inline-flex items-center gap-2 rounded-full gold-gradient-cta px-7 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] font-semibold"
              >
                <span>{isJewellery ? 'Browse Jewellery' : 'Browse Gemstones'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
