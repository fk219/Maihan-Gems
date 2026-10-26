import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Box,
  Compass,
  Gem,
  HeartHandshake,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  UserCheck,
} from 'lucide-react';
import {
  getAllGemstones,
  getAllVarieties,
  getAllMatchedPairs,
  getAllSettings,
} from '@/lib/storefront-data';
import { ProductCard } from '@/components/catalog/ProductCard';
import { HeroAiSearch } from '@/components/catalog/HeroAiSearch';
import { HeroBackgroundVideo } from '@/components/catalog/HeroBackgroundVideo';
import { GemstoneMarquee } from '@/components/catalog/GemstoneMarquee';

export const metadata: Metadata = {
  title: 'Maihan Gems — Natural Gemstones & Fine Jewelry',
  description:
    'Shop natural loose gemstones, matched earring pairs, and custom gold and platinum jewelry.',
  alternates: {
    canonical: '/',
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

const JEWELRY_FOUR_WAYS = [
  {
    kicker: 'FINE JEWELRY · 01',
    title: 'Rings',
    subtitle: 'PLATINUM 950 & 18K GOLD',
    description:
      'Engagement, solitaire, signet, and everyday rings. Every piece clearly lists the exact stone weight, metal purity, and ring size.',
    image: '/images/elysian-ring.jpg',
    href: '/jewellery',
    tags: [
      { label: 'ENGAGEMENT', href: '/design-your-own?step=setting' },
      { label: 'SOLITAIRE', href: '/products/elysian-ring' },
      { label: 'RING SETTINGS', href: '/settings' },
    ],
  },
  {
    kicker: 'FINE JEWELRY · 02',
    title: 'Necklaces',
    subtitle: 'PENDANTS & GEMSTONE DROPS',
    description:
      'Gemstone pendants, solitaire drops, and fine chains, with chain length and gold or platinum weight stated in full.',
    image: '/images/verdant-drop.jpg',
    href: '/jewellery',
    tags: [
      { label: 'PENDANTS', href: '/products/verdant-drop' },
      { label: 'EMERALD DROPS', href: '/varieties/emerald' },
      { label: 'NECKLACE SETTINGS', href: '/settings' },
    ],
  },
  {
    kicker: 'FINE JEWELRY · 03',
    title: 'Earrings',
    subtitle: 'STUDS & MATCHED PAIRS',
    description:
      'From everyday studs to matched drop earrings—we list the exact weight and size of each stone in the pair so they sit comfortably.',
    image: '/images/gems/earrings-pair.jpg',
    href: '/pairs',
    tags: [
      { label: 'STUDS', href: '/settings/SET-EAR-STUD-05' },
      { label: 'MATCHED PAIRS', href: '/pairs' },
      { label: 'DROPS', href: '/settings/SET-EAR-DROP-04' },
    ],
  },
  {
    kicker: 'CUSTOM STUDIO · 04',
    title: 'Settings & DYOJ',
    subtitle: 'DESIGN YOUR OWN JEWELRY',
    description:
      'Solid 950 Platinum and 18k Gold settings crafted in Geneva, ready to hold any loose gemstone you choose in our DYOJ studio.',
    image: '/images/gems/setting-ring.jpg',
    href: '/settings',
    tags: [
      { label: 'RING SETTINGS', href: '/settings' },
      { label: '18K GOLD & PLATINUM', href: '/settings' },
      { label: 'OPEN DYOJ STUDIO', href: '/design-your-own' },
    ],
  },
];

const CLIENT_VOICES = [
  {
    quote:
      'I had been looking for a natural blue sapphire for over a year. Three options came back with clear lab reports, and their team walked me through why one cost more than the others in plain English.',
    name: 'claire m. · zurich',
    purchase: 'Loose Sapphire Purchase',
  },
  {
    quote:
      'I knew nothing about emeralds before visiting. Being told plainly that tiny natural inclusions are normal—and seeing the exact treatment written clearly on the page—is what made me feel comfortable.',
    name: 'david & elena r. · london',
    purchase: 'Custom Emerald Necklace',
  },
  {
    quote:
      'The 3D preview showed me how a 2-carat stone would actually sit on my hand before it was set. I would have guessed the wrong ring setting elsewhere and regretted it.',
    name: 'tariq a. · dubai',
    purchase: 'Custom Engagement Ring',
  },
];

export default function HomePage() {
  const allStones = getAllGemstones();
  const featuredVarieties = ['tanzanite', 'sapphire', 'emerald', 'ruby', 'spinel', 'tourmaline'];
  const featuredStones = featuredVarieties
    .map((vSlug) => allStones.find((s) => s.varietySlug === vSlug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const varieties = getAllVarieties();
  const pairs = getAllMatchedPairs().slice(0, 1);
  const settings = getAllSettings().slice(0, 1);

  const marqueeVarieties = varieties.map((v) => ({
    slug: v.slug,
    name: v.name,
    count: v.count,
    colorNote: VARIETY_PLAIN_NOTES[v.slug]?.colorNote || 'Natural loose gemstones',
  }));

  return (
    <div className="golden-cloud-gallery text-[#181613]">
      {/* =========================================================================
          SECTION 1: MINIMALIST FULL-SCREEN VIDEO HERO (STACKED BEHIND NAVBAR)
         ========================================================================= */}
      <section className="relative min-h-screen flex items-center justify-center bg-[#0A0A0C] text-[#F7F5F0] overflow-hidden pt-40 sm:pt-44 pb-16">
        <HeroBackgroundVideo />

        {/* Minimalist Centerpiece: 1-Line Brand Name + 2-Line Simple Motto + Clean Search Bar */}
        <div className="relative z-20 mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 text-center space-y-6 sm:space-y-8">
          <p className="text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.38em] text-[#D4AF37]">
            MAIHAN GEMS · GENEVA
          </p>

          <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-7xl lg:text-[5.5rem] font-normal tracking-tight text-white leading-[1.05]">
            Rare Natural<br />
            <span className="gold-gradient-text italic">Gemstones.</span>
          </h1>

          <div className="pt-2 w-full max-w-xl mx-auto">
            <HeroAiSearch />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: MINIMALIST TRUST BAR (WHITE & GOLD CLOUD GLASS)
         ========================================================================= */}
      <section className="border-b border-[#EADBC0]/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#EADBC0]/60">
            <div className="flex items-center justify-center gap-3.5 pt-2 md:pt-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF5EA] border border-[#E5D4B3] text-[#9A7B2C]">
                <Truck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-[family-name:var(--font-eb-garamond)] text-base font-medium text-[#181613]">
                  Free Insured Shipping
                </p>
                <p className="text-xs text-[#6E6250] font-[family-name:var(--font-eb-garamond)]">
                  Safe door-to-door delivery &amp; 30-day returns
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3.5 pt-4 md:pt-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF5EA] border border-[#E5D4B3] text-[#9A7B2C]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="font-[family-name:var(--font-eb-garamond)] text-base font-medium text-[#181613]">
                  Certified Natural Stones
                </p>
                <p className="text-xs text-[#6E6250] font-[family-name:var(--font-eb-garamond)]">
                  Every stone comes with an independent lab report
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3.5 pt-4 md:pt-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF5EA] border border-[#E5D4B3] text-[#9A7B2C]">
                <HeartHandshake className="h-4 w-4" />
              </span>
              <div>
                <p className="font-[family-name:var(--font-eb-garamond)] text-base font-medium text-[#181613]">
                  Lifetime Care Plan
                </p>
                <p className="text-xs text-[#6E6250] font-[family-name:var(--font-eb-garamond)]">
                  Complimentary cleaning, polishing &amp; prong checks
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: GEMSTONE MARQUEE (PARALLAX-ON-SCROLL + FLOATING STONES)
         ========================================================================= */}
      <section data-reveal className="relative py-20 lg:py-24 overflow-hidden">
        {/* Soft golden cloud aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[85vw] rounded-full bg-[radial-gradient(circle,rgba(230,201,122,0.22)_0%,transparent_70%)] blur-3xl"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
                BROWSE BY GEMSTONE TYPE
              </p>
              <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
                Eight Natural Gemstone Families
              </h2>
            </div>

            <Link
              href="/varieties"
              className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] inline-flex items-center gap-1.5 font-semibold"
            >
              Explore All Gemstones <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Parallax-on-Scroll Marquee with Individual Gemstones Without Background */}
        <GemstoneMarquee varieties={marqueeVarieties} />

        {/* Featured Loose Gemstones (Light-Colored Unified Product Cards) */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
                HANDPICKED LOOSE STONES
              </p>
              <h3 className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-4xl font-normal text-[#181613] mt-1">
                Featured Natural Gemstones
              </h3>
            </div>
            <Link
              href="/varieties"
              className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#181613] hover:text-[#9A7B2C] inline-flex items-center gap-1.5 font-semibold"
            >
              View Gemstone Landing Page <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredStones.map((stone) => (
              <ProductCard key={stone.id} stone={stone} />
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: FINE JEWELRY — "FOUR WAYS IN" FULL-BLEED BRAND CARDS
         ========================================================================= */}
      <section data-reveal className="relative py-20 lg:py-28 border-t border-[#EADBC0]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Editorial Section Header */}
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              SHOP BY CATEGORY
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613] tracking-tight">
              Four ways in
            </h2>
            <p className="text-base text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
              If you already know what you are looking for, start here. If you are not sure yet, our AI Gemologist below is the easiest place to begin.
            </p>
          </div>

          {/* 2x2 Full-Bleed Brand Cards (Images Covering the Whole Card, Matching ProductCard) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {JEWELRY_FOUR_WAYS.map((cat) => (
              <article
                key={cat.title}
                data-testid="shop-by-category-card"
                className="group relative overflow-hidden rounded-[24px] border border-[#E5D4B3] bg-[#FAF8F4] transition-all duration-500 hover:-translate-y-1 hover:border-[#C5A059] shadow-[0_14px_38px_rgba(185,150,75,0.12)] hover:shadow-[0_24px_56px_rgba(185,150,75,0.24)] flex flex-col justify-between p-6 sm:p-8 min-h-[460px] sm:min-h-[500px]"
              >
                {/* 1. Full-Bleed Background Image Covering the Entire Card */}
                <img
                  src={cat.image}
                  alt={cat.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* 2. Luminous Light-Colored Pearl & Golden Cloud Overlays */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#FAF7F0]/90 via-[#FAF7F0]/45 to-transparent z-[1]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#FAF7F0]/98 via-[#FAF7F0]/88 to-transparent z-[1]"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(212,175,55,0.15),transparent_65%)] z-[1]"
                />

                {/* 3. Top Section: Category Kicker with Gold Line */}
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#8B6B23] font-semibold">
                      {cat.kicker}
                    </p>
                    <div className="w-7 h-[1.5px] bg-[#C5A059] mt-1.5" />
                  </div>
                </div>

                {/* Clickable Card Overlay Link */}
                <Link
                  href={cat.href}
                  className="absolute inset-0 z-[5]"
                  aria-label={`Explore ${cat.title}`}
                />

                {/* 4. Bottom Section: Gold Line, Title, Subtitle, Description, Sub-Links & Circular Arrow CTA */}
                <div className="relative z-10 flex flex-col justify-end space-y-3 pointer-events-none">
                  <div className="w-7 h-[1.5px] bg-[#C5A059] mb-0.5" />

                  <div className="space-y-1">
                    <h3 className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-4xl font-normal text-[#181613] tracking-normal leading-tight group-hover:text-[#7A5C1B] transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#6E6250] font-[family-name:var(--font-eb-garamond)] font-semibold">
                      {cat.subtitle}
                    </p>
                  </div>

                  <p className="text-sm text-[#4A4236] leading-relaxed font-[family-name:var(--font-eb-garamond)] max-w-lg">
                    {cat.description}
                  </p>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    {/* Sub-category Style Links */}
                    <div className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.18em] text-[#7A5E21] font-semibold">
                      {cat.tags.map((tag, idx) => (
                        <React.Fragment key={tag.label}>
                          {idx > 0 && <span aria-hidden="true" className="text-[#C5A059]">·</span>}
                          <Link
                            href={tag.href}
                            className="hover:text-[#181613] underline-offset-4 hover:underline transition-colors"
                          >
                            {tag.label}
                          </Link>
                        </React.Fragment>
                      ))}
                    </div>

                    <Link
                      href={cat.href}
                      aria-label={`Explore ${cat.title}`}
                      className="pointer-events-auto w-12 h-12 rounded-full border border-[#C5A059] bg-white/90 hover:bg-[#D4AF37] hover:border-[#D4AF37] text-[#181613] hover:text-white backdrop-blur-md flex items-center justify-center transition-all duration-300 active:scale-90 shadow-[0_6px_18px_rgba(185,150,75,0.2)] group/btn shrink-0"
                    >
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Ready-to-Wear Fine Jewelry Spotlight Cards (Same Light-Colored ProductCard) */}
          <div className="pt-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
                  READY TO WEAR
                </p>
                <h3 className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-4xl font-normal text-[#181613] mt-1">
                  Signature Rings, Necklaces &amp; Pairs
                </h3>
              </div>
              <Link
                href="/jewellery"
                className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#181613] hover:text-[#9A7B2C] inline-flex items-center gap-1.5 font-semibold"
              >
                View Fine Jewelry Landing Page <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <ProductCard
                category="Rings"
                name="Elysian Ring"
                material="Natural Diamond"
                carat="2.15 CT"
                price="$12,800"
                image="/images/elysian-ring.jpg"
                href="/products/elysian-ring"
              />
              <ProductCard
                category="Necklaces"
                name="Verdant Drop"
                material="Natural Emerald"
                carat="4.32 CT"
                price="$18,500"
                image="/images/verdant-drop.jpg"
                href="/products/verdant-drop"
              />
              {pairs[0] && (
                <ProductCard
                  category="Earring Pair"
                  name={pairs[0].name}
                  material={`Natural ${pairs[0].variety}`}
                  carat={`${pairs[0].totalCarat.toFixed(2)} CT`}
                  price={pairs[0].price}
                  image={pairs[0].images[0]}
                  href="/pairs"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: DYOJ (DESIGN YOUR OWN JEWELRY) — SIMPLE 3-STEP VISUAL BANNER
         ========================================================================= */}
      <section data-reveal className="relative py-20 lg:py-28 border-t border-[#EADBC0]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[#E2CEAA] bg-gradient-to-br from-[#FFFDF9] via-[#FAF4E6] to-[#F5E8C7]/60 p-8 sm:p-12 lg:p-16 shadow-[0_20px_60px_rgba(185,150,75,0.14)] space-y-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <span className="inline-flex items-center gap-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
                  <Compass className="h-4 w-4 text-[#D4AF37]" />
                  DYOJ · DESIGN YOUR OWN JEWELRY
                </span>
                <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613] leading-tight">
                  Create a custom piece in three simple steps.
                </h2>
                <p className="text-base text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                  Pick the exact natural gemstone you love, pair it with a solid 18k gold or platinum setting, and our Geneva jewelers will handcraft it to your size.
                </p>
              </div>

              <Link
                href="/design-your-own"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-bold gold-gradient-cta shadow-md whitespace-nowrap shrink-0"
              >
                Explore DYOJ Studio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* 3-Step Visual Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Link
                href="/design-your-own?step=stone"
                className="group rounded-2xl border border-[#E5D4B3] bg-white/90 p-6 hover:border-[#C5A059] shadow-sm transition-all duration-300 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
                    STEP 01
                  </span>
                  <Gem className="h-5 w-5 text-[#C5A059]" />
                </div>
                <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613] group-hover:text-[#8B6B23] transition-colors">
                  Pick Your Gemstone
                </h3>
                <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                  Choose from certified sapphires, emeralds, rubies, or tanzanites—each with real photos and clear lab details.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C] font-semibold">
                  Choose a Stone →
                </span>
              </Link>

              <Link
                href="/design-your-own?step=setting"
                className="group rounded-2xl border border-[#E5D4B3] bg-white/90 p-6 hover:border-[#C5A059] shadow-sm transition-all duration-300 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
                    STEP 02
                  </span>
                  <Sparkles className="h-5 w-5 text-[#C5A059]" />
                </div>
                <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613] group-hover:text-[#8B6B23] transition-colors">
                  Choose a Setting
                </h3>
                <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                  Select a ring, pendant, or earring style in Platinum 950, 18k Yellow Gold, Rose Gold, or White Gold.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C] font-semibold">
                  Pick a Setting →
                </span>
              </Link>

              <Link
                href="/design-your-own/review/DYO-MG-8841"
                className="group rounded-2xl border border-[#E5D4B3] bg-white/90 p-6 hover:border-[#C5A059] shadow-sm transition-all duration-300 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
                    STEP 03
                  </span>
                  <ShieldCheck className="h-5 w-5 text-[#C5A059]" />
                </div>
                <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613] group-hover:text-[#8B6B23] transition-colors">
                  Handcrafted &amp; Delivered
                </h3>
                <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                  Add free ring sizing and personal engraving. Your custom piece ships insured to your door in two weeks.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C] font-semibold">
                  See Sample Order →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: THE AI GEMOLOGIST — "A GEMOLOGIST'S EYE, ON DEMAND"
         ========================================================================= */}
      <section data-reveal className="relative py-20 lg:py-28 border-t border-[#EADBC0]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              THE AI GEMOLOGIST
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613] leading-tight">
              A gemologist&rsquo;s eye, on demand.
            </h2>
            <p className="text-base text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
              Three helpful tools do the work a personal jeweler would—matching your budget, comparing stones honestly, and showing how they look in a setting. And the moment you want a second opinion, a human gemologist is one click away.
            </p>
            <div className="pt-2">
              <Link
                href="/concierge"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#181613] hover:bg-[#2E2922] text-[#F7F5F0] text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-colors shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                Launch AI Gemologist
              </Link>
            </div>
          </div>

          {/* 3 Plain-English Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-2">
            <div className="rounded-2xl border border-[#E5D4B3] bg-white/85 p-7 shadow-[0_10px_32px_rgba(185,150,75,0.08)] space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF4E6] border border-[#E5D4B3] text-[#9A7B2C]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613]">
                Tell it what you&rsquo;re after
              </h3>
              <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                Share the occasion, budget, color, or metal you like. It returns a clear shortlist and explains why each stone made the list—no complicated gem vocabulary required.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5D4B3] bg-white/85 p-7 shadow-[0_10px_32px_rgba(185,150,75,0.08)] space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF4E6] border border-[#E5D4B3] text-[#9A7B2C]">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613]">
                Compare stones side by side
              </h3>
              <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                Not sure why one sapphire or emerald costs more than another? Ask the AI Gemologist to compare two stones in plain English so you can see the difference clearly.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5D4B3] bg-white/85 p-7 shadow-[0_10px_32px_rgba(185,150,75,0.08)] space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FAF4E6] border border-[#E5D4B3] text-[#9A7B2C]">
                <Box className="h-5 w-5" />
              </div>
              <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613]">
                See it on you in 3D
              </h3>
              <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                Preview how rings, earrings, and pendants look from every angle with our interactive 3D viewer, showing the stone scaled to its true size in millimeters.
              </p>
            </div>
          </div>

          {/* Try a Quick Question Strip */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] font-semibold mr-2">
              Try asking:
            </span>
            {[
              'Show me blue sapphires under $6,000',
              'Design a custom emerald engagement ring',
              'Compare unheated rubies and spinels',
            ].map((prompt) => (
              <Link
                key={prompt}
                href={`/concierge?q=${encodeURIComponent(prompt)}`}
                className="px-4 py-2 rounded-full border border-[#E5D4B3] bg-[#FFFDF9] hover:bg-[#FAF4E6] hover:border-[#C5A059] text-xs font-[family-name:var(--font-eb-garamond)] text-[#3B3328] transition-colors"
              >
                &ldquo;{prompt}&rdquo; →
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: CLIENT VOICES — "BOUGHT BY PEOPLE WHO ASKED A LOT OF QUESTIONS"
         ========================================================================= */}
      <section data-reveal className="relative py-20 lg:py-28 border-t border-[#EADBC0]/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              CLIENT VOICES
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613] leading-tight">
              Bought by people who asked a lot of questions.
            </h2>
            <p className="text-base text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
              Three recent buyers on what they were unsure about at first, and what actually happened.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CLIENT_VOICES.map((voice) => (
              <blockquote
                key={voice.name}
                className="rounded-2xl border border-[#E5D4B3] bg-white/90 p-7 shadow-[0_12px_36px_rgba(185,150,75,0.09)] flex flex-col justify-between space-y-6"
              >
                <p className="font-[family-name:var(--font-eb-garamond)] text-base sm:text-lg text-[#2C261E] leading-relaxed">
                  &ldquo;{voice.quote}&rdquo;
                </p>

                <footer className="flex items-center gap-3.5 pt-4 border-t border-[#F0E6D2]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FAF4E6] border border-[#E5D4B3] text-[#9A7B2C] shrink-0">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <cite className="not-italic font-[family-name:var(--font-eb-garamond)] text-sm font-semibold uppercase tracking-wider text-[#181613] block">
                      {voice.name}
                    </cite>
                    <span className="text-xs text-[#7A7267] font-[family-name:var(--font-eb-garamond)]">
                      {voice.purchase}
                    </span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: NEXT STEP — "STILL WEIGHING IT UP? TALK TO A GEMOLOGIST."
         ========================================================================= */}
      <section data-reveal className="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[28px] overflow-hidden border border-[#C5A059]/50 bg-gradient-to-br from-[#4A3B1C] via-[#3D3015] to-[#2B210D] text-[#FAF8F4] px-6 py-16 sm:px-12 sm:py-20 text-center shadow-[0_24px_70px_rgba(74,59,28,0.28)] relative">
          {/* Subtle golden cloud glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(230,201,122,0.22),transparent_68%)]"
          />

          <div className="relative z-10 mx-auto max-w-xl space-y-5">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.32em] text-[#E6C97A] font-semibold">
              NEXT STEP
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-white leading-tight">
              Still weighing it up?<br />
              Talk to a gemologist.
            </h2>
            <p className="text-base text-[#E6DEC8] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
              Fifteen minutes on a video call or in our Geneva, New York, or London showrooms, with the stones you are considering right in front of us. No sales pitch and no obligation—and if what you want isn&rsquo;t in stock, we will tell you honestly.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white hover:bg-[#FAF4E6] text-[#181613] text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-all shadow-md"
              >
                Book a Private Appointment
              </Link>
              <Link
                href="/showrooms"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-[#E6C97A]/50 hover:border-white text-[#FAF8F4] text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] transition-all"
              >
                View Our Showrooms
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
