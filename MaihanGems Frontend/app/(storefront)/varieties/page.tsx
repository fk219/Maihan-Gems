import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { getAllVarieties, getAllColours, getAllGemstones } from '@/lib/storefront-data';
import { ProductCard } from '@/components/ProductCard';
import { HeroBackgroundVideo } from '@/components/catalog/HeroBackgroundVideo';
import { GemstoneMarquee } from '@/components/catalog/GemstoneMarquee';
import { CollectionExplorer } from '@/components/catalog/CollectionExplorer';
import { SITE_URL } from '@/app/layout';

export const metadata: Metadata = {
  title: 'Natural Gemstones — Ruby, Sapphire, Diamond, Emerald & More | Maihan Gems',
  description:
    'Explore all natural gemstone families offered at Maihan Gems—including Ruby, Sapphire, Diamond, Emerald, Tanzanite, Spinel, Tourmaline, Alexandrite, and Tsavorite.',
  alternates: {
    canonical: `${SITE_URL}/varieties`,
  },
};

const VARIETY_PLAIN_NOTES: Record<string, { colorNote: string; image: string }> = {
  tanzanite: { colorNote: 'Deep blue & violet from Tanzania', image: '/images/gems/tanzanite-gem.jpg' },
  sapphire: { colorNote: 'Classic royal & cornflower blues', image: '/images/gems/sapphire-gem.jpg' },
  emerald: { colorNote: 'Rich garden green crystals', image: '/images/gems/emerald-gem.jpg' },
  ruby: { colorNote: 'Vibrant natural red stones', image: '/images/gems/ruby-gem.jpg' },
  spinel: { colorNote: 'Bright pink, red & cobalt tones', image: '/images/gems/spinel-gem.jpg' },
  tourmaline: { colorNote: 'Lagoon blue-green & warm pink', image: '/images/gems/tourmaline-gem.jpg' },
  alexandrite: { colorNote: 'Daylight green to evening red', image: '/images/gems/emerald-gem.jpg' },
  tsavorite: { colorNote: 'Lively untreated bright green', image: '/images/gems/tourmaline-gem.jpg' },
};

export default function VarietiesIndexPage() {
  const varieties = getAllVarieties();
  const colours = getAllColours();
  const allStones = getAllGemstones();

  const marqueeVarieties = varieties.map((v) => ({
    slug: v.slug,
    name: v.name,
    count: v.count,
    colorNote: VARIETY_PLAIN_NOTES[v.slug]?.colorNote || 'Natural loose gemstones',
  }));

  // Build full subcategory list including Diamond alongside our 8 natural colored stone families
  const subcategoryCards = [
    ...varieties.map((v) => {
      const repStone = allStones.find((s) => s.varietySlug === v.slug);
      return {
        key: v.slug,
        category: v.mineralSpecies,
        name: v.name,
        material: `${v.count} Stones Available`,
        carat: VARIETY_PLAIN_NOTES[v.slug]?.colorNote || 'Certified Natural',
        price: repStone ? repStone.price : 4500,
        image: repStone?.images[0] || VARIETY_PLAIN_NOTES[v.slug]?.image || '/images/gems/sapphire-gem.jpg',
        href: `/varieties/${v.slug}`,
      };
    }),
    {
      key: 'diamond',
      category: 'Carbon Crystal',
      name: 'Diamond',
      material: 'Natural Brilliant & Step Cuts',
      carat: 'GIA Certified White & Fancy',
      price: 12800,
      image: '/images/elysian-ring.jpg',
      href: '/products/elysian-ring',
    },
  ];

  return (
    <div className="golden-cloud-gallery text-[#181613]">
      {/* =========================================================================
          1. DEDICATED GEMSTONES EDITORIAL SPLIT HERO WITH STOCK VIDEO
         ========================================================================= */}
      <section
        data-testid="gemstones-landing-hero"
        className="relative border-b border-[#D4AF37]/30 bg-[#0A0A0C] text-[#F7F5F0] pt-44 sm:pt-48 pb-16 sm:pb-24 overflow-hidden"
      >
        <HeroBackgroundVideo />

        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Editorial Column */}
            <div className="lg:col-span-7 space-y-6">
              <nav
                aria-label="Breadcrumb"
                className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-white/70"
              >
                <ol className="flex items-center gap-2">
                  <li>
                    <Link href="/" className="hover:text-white transition-colors">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">·</li>
                  <li aria-current="page" className="text-[#E6C97A] font-semibold">
                    Gemstones
                  </li>
                </ol>
              </nav>

              <div className="space-y-3">
                <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                  MAIHAN GEMS · NATURAL GEMSTONE VAULT
                </p>
                <div className="w-10 h-[1.5px] bg-[#D4AF37]" />
                <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08]">
                  Explore Every Natural Gemstone Family.
                </h1>
              </div>

              <p className="max-w-2xl text-base sm:text-lg font-[family-name:var(--font-eb-garamond)] text-white/85 leading-relaxed">
                From royal blue Sapphires, pigeon-blood Rubies, and Colombian Emeralds to natural Diamonds and rare Tanzanites—every stone is hand-selected at the source and accompanied by an independent lab report.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#E6C97A] font-semibold">
                <span>9 Gemstone Families</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>Independent Lab Reports</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>Direct Origin Provenance</span>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#shop-all-gemstones"
                  data-testid="hero-shop-all-gemstones-cta"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] font-bold gold-gradient-cta shadow-[0_12px_28px_rgba(212,175,55,0.32)] transition-transform hover:scale-[1.02]"
                >
                  <span>Shop All Gemstones</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <Link
                  href="/browse"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-[#D4AF37]/60 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  <span>Open Full Filter View</span>
                </Link>
              </div>
            </div>

            {/* Right Visual Specimen & Stock Video Collage */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="col-span-2 relative overflow-hidden rounded-[22px] border border-white/20 bg-[#141418] aspect-[16/10] shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/images/gems/sapphire-gem.jpg"
                  className="h-full w-full object-cover"
                >
                  <source src="/videos/hero-gemstone.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#E6C97A] font-semibold">
                      CEYLON &amp; KASHMIR LINEAGE
                    </p>
                    <p className="font-[family-name:var(--font-eb-garamond)] text-2xl text-white">
                      Natural Blue Sapphires
                    </p>
                  </div>
                  <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                    Certified →
                  </span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[18px] border border-white/20 bg-[#141418] aspect-[4/3] shadow-md">
                <img
                  src="/images/gems/emerald-gem.jpg"
                  alt="Natural Colombian Emerald"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3.5 font-[family-name:var(--font-eb-garamond)] text-base font-medium text-white">
                  Emeralds
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[18px] border border-white/20 bg-[#141418] aspect-[4/3] shadow-md">
                <img
                  src="/images/gems/ruby-gem.jpg"
                  alt="Natural Burmese Ruby"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3.5 font-[family-name:var(--font-eb-garamond)] text-base font-medium text-white">
                  Rubies
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. PARALLAX FLOATING GEMSTONE MARQUEE (NO CARD BACKGROUNDS)
         ========================================================================= */}
      <section className="py-12 border-b border-[#EADBC0]/60">
        <GemstoneMarquee varieties={marqueeVarieties} />
      </section>

      {/* =========================================================================
          3. ALL GEMSTONE TYPES WE OFFER (SUBCATEGORIES IN FULL-BLEED BRAND CARDS)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EADBC0]/80 pb-6">
          <div className="space-y-2">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              GEMSTONE SUBCATEGORIES
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              All Gemstone Types We Offer
            </h2>
            <p className="text-base text-[#5C5346] font-[family-name:var(--font-eb-garamond)] max-w-2xl">
              Select a gemstone family below to explore its origin, natural color notes, and available loose stones, or scroll down to shop all gemstones at once.
            </p>
          </div>

          <a
            href="#shop-all-gemstones"
            className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] inline-flex items-center gap-1.5 font-semibold shrink-0"
          >
            Jump to All {allStones.length} Stones <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div
          data-testid="gemstone-subcategories-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {subcategoryCards.map((card) => (
            <ProductCard
              key={card.key}
              category={card.category}
              name={card.name}
              material={card.material}
              carat={card.carat}
              price={card.price}
              image={card.image}
              href={card.href}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          4. BROWSE BY NATURAL COLOR
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-[#EADBC0]/60 space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
            BROWSE BY HUE
          </p>
          <h2 className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-4xl font-normal text-[#181613]">
            Shop Gemstones by Color
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {colours.map((c) => (
            <Link
              key={c.slug}
              href={`/colour/${c.slug}`}
              className="rounded-2xl border border-[#E5D4B3] bg-white/90 p-5 hover:border-[#C5A059] shadow-[0_8px_24px_rgba(185,150,75,0.08)] transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="h-6 w-6 rounded-full shrink-0 border border-black/15 shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <h3 className="font-[family-name:var(--font-eb-garamond)] text-xl font-medium text-[#181613]">
                  {c.name}
                </h3>
              </div>
              <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#9A7B2C] font-semibold">
                {c.count} stones →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. SHOP ALL GEMSTONES CATALOG (ANCHOR TARGET OF HERO CTA BUTTON)
         ========================================================================= */}
      <section
        id="shop-all-gemstones"
        data-testid="shop-all-gemstones-section"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-[#EADBC0]/80 space-y-8 scroll-mt-20"
      >
        <div className="border-b border-[#E5D4B3] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              COMPLETE LOOSE STONE VAULT · {allStones.length} CERTIFIED STONES
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              Shop All Loose Gemstones
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-eb-garamond)] text-[#5C5346]">
            <ShieldCheck className="h-4 w-4 text-[#9A7B2C]" />
            <span>Independent lab report included with every stone</span>
          </div>
        </div>

        <CollectionExplorer initialItems={allStones} />
      </section>
    </div>
  );
}
