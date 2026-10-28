import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Compass, Gem, ShieldCheck, Sliders, Sparkles } from 'lucide-react';
import { DyoConfiguratorClient } from '@/components/mgh/dyo/DyoConfiguratorClient';
import { HeroBackgroundVideo } from '@/components/mgh/catalog/HeroBackgroundVideo';
import { ProductCard } from '@/components/mgh/ProductCard';
import { SITE_URL } from '@/lib/mgh/site-url';
import {
  getDyoConfiguratorPool,
  getDyoLedgerSample,
  getDyoRecentCodes,
} from '@/lib/mgh/adapters/dyo.js';

/**
 * M5 — the applet's DYOJ landing page rendered over the repo's REAL DYO seam.
 *
 * Markup/classes/copy preserved verbatim from `.opencode`-referenced source
 * (the reference applet · app/(storefront)/design-your-own/page.tsx). The data
 * seams are the ONLY changes: the configurator's stone/setting pools come
 * from `getDyoConfiguratorPool` (real ACTIVE singles + REAL design-grouped
 * setting variants with rule-backed compatibility), and the two places that
 * linked fixture-only sample dossiers (DYO-MG-8841 / DYO-MG-2049) now link
 * the REAL public commission ledger — the newest `dyo_configurations` row —
 * and render nothing when the ledger is empty.
 *
 * Subcategory showcase cards stay the applet's editorial DYOJ material
 * (same /mgh asset prefix rule as the migrated homepage brand cards).
 */

const DYOJ_HOW_IT_WORKS = [
  {
    step: 'STEP 01',
    title: 'Pick Your Loose Gemstone',
    description:
      'Browse our certified natural sapphires, rubies, emeralds, and tanzanites. Filter by shape, carat weight, color, and budget—every stone shows its real photos and lab certificate.',
    icon: Gem,
  },
  {
    step: 'STEP 02',
    title: 'Select a Compatible Setting',
    description:
      'Once you pick a stone, DYOJ automatically highlights ring, necklace, and earring settings that fit your gemstone’s cut and millimeter size.',
    icon: Sliders,
  },
  {
    step: 'STEP 03',
    title: 'Customize Metal, Size & Engraving',
    description:
      'Choose solid 950 Platinum, 18k Yellow Gold, 18k Rose Gold, or 18k White Gold. Select your exact ring size and add a complimentary personal engraving inside the band.',
    icon: Sparkles,
  },
  {
    step: 'STEP 04',
    title: 'Review & Handcrafted Delivery',
    description:
      'See the complete itemized price with zero hidden fees. Our Geneva jewelers set your stone by hand and ship your finished piece insured to your door in 14 days.',
    icon: ShieldCheck,
  },
];

const DYOJ_SUBCATEGORY_CREATIONS = [
  {
    kicker: 'DYOJ · CUSTOM RINGS',
    name: 'Custom Engagement & Solitaire Rings',
    material: 'Loose Stone + Ring Setting',
    carat: 'Platinum 950 & 18k Gold',
    price: 5850,
    image: '/mgh/images/elysian-ring.jpg',
    href: '#dyoj-studio',
  },
  {
    kicker: 'DYOJ · CUSTOM NECKLACES',
    name: 'Custom Gemstone Pendants',
    material: 'Loose Stone + Necklace Bail',
    carat: '18k Yellow, Rose & White Gold',
    price: 4900,
    image: '/mgh/images/verdant-drop.jpg',
    href: '#dyoj-studio',
  },
  {
    kicker: 'DYOJ · CUSTOM EARRINGS',
    name: 'Custom Stud & Drop Earrings',
    material: 'Matched Stones + Earring Mounts',
    carat: 'Martini & Leverback Styles',
    price: 4200,
    image: '/mgh/images/gems/earrings-pair.jpg',
    href: '#dyoj-studio',
  },
];

export const metadata: Metadata = {
  title: 'DYOJ — Design Your Own Jewelry | Maihan Gems',
  description:
    'Learn how DYOJ (Design Your Own Jewelry) works and build your custom ring, necklace, or earrings by pairing a certified loose gemstone with a Geneva setting.',
  alternates: {
    canonical: `${SITE_URL}/design-your-own`,
  },
};

interface PageProps {
  searchParams?: Promise<{
    stone?: string;
    setting?: string;
    metal?: string;
    size?: string;
    settingid?: string;
  }>;
}

export default async function DesignYourOwnPage(props: PageProps) {
  const sp = props.searchParams ? await props.searchParams : {};
  const [{ stones, settings }, ledgerSample, recentCodes] = await Promise.all([
    getDyoConfiguratorPool(96),
    getDyoLedgerSample(),
    getDyoRecentCodes(2),
  ]);

  return (
    <div className="golden-cloud-gallery text-[#181613]">
      {/* =========================================================================
          1. DEDICATED DYOJ EDITORIAL SPLIT HERO WITH STOCK VIDEO
         ========================================================================= */}
      <section
        data-testid="dyoj-landing-hero"
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
                    DYOJ
                  </li>
                </ol>
              </nav>

              <div className="space-y-3">
                <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                  MAIHAN GEMS · DYOJ BESPOKE STUDIO
                </p>
                <div className="w-10 h-[1.5px] bg-[#D4AF37]" />
                <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08]">
                  DYOJ — Design Your Own Jewelry.
                </h1>
              </div>

              <p className="max-w-2xl text-base sm:text-lg font-[family-name:var(--font-eb-garamond)] text-white/85 leading-relaxed">
                Our interactive DYOJ studio lets you create a one-of-a-kind ring, necklace, or pair of earrings by combining any certified loose gemstone from our vault with a handcrafted Geneva setting.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#E6C97A] font-semibold">
                <span>1. Pick a Stone</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>2. Choose a Setting</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>3. Handcrafted in 14 Days</span>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#dyoj-studio"
                  data-testid="hero-dyoj-cta"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] font-bold gold-gradient-cta shadow-[0_12px_28px_rgba(212,175,55,0.32)] transition-transform hover:scale-[1.02]"
                >
                  <span>Start Designing Now</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                {ledgerSample ? (
                  <Link
                    href={`/design-your-own/review/${encodeURIComponent(ledgerSample)}`}
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-[#D4AF37]/60 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-colors"
                  >
                    <Compass className="h-4 w-4 text-[#D4AF37]" />
                    <span>View Latest Commission</span>
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Right Visual DYOJ Pairing Formula & Stock Video Card */}
            <div className="lg:col-span-5">
              <div className="rounded-[24px] border border-white/20 bg-[#121216]/90 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-white/15 aspect-[16/9]">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="/mgh/images/gems/tanzanite-gem.jpg"
                    className="h-full w-full object-cover"
                  >
                    <source src="/mgh/videos/hero-gemstone.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#E6C97A] font-semibold">
                      THE DYOJ FORMULA
                    </span>
                    <span className="text-xs font-[family-name:var(--font-eb-garamond)] text-white/80">
                      14-Day Geneva Delivery
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-white/15 bg-white/[0.05] p-3 flex items-center gap-3">
                    <img
                      src="/mgh/images/gems/tanzanite-gem.jpg"
                      alt="Loose Natural Gemstone"
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                        01 · Loose Stone
                      </p>
                      <p className="font-[family-name:var(--font-eb-garamond)] text-sm text-white truncate">
                        Certified Gem
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/15 bg-white/[0.05] p-3 flex items-center gap-3">
                    <img
                      src="/mgh/images/gems/setting-ring.jpg"
                      alt="Solid Platinum or 18k Gold Setting"
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-lg object-cover border border-white/15 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                        02 · Geneva Mount
                      </p>
                      <p className="font-[family-name:var(--font-eb-garamond)] text-sm text-white truncate">
                        PT950 or 18k Gold
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#E6C97A] font-semibold">
                    Result: Your One-of-a-Kind Piece
                  </span>
                  <span className="text-xs font-[family-name:var(--font-eb-garamond)] text-white font-semibold">
                    Free Sizing &amp; Engraving
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. INTRODUCTION & HOW DYOJ CAN BE USED (STEP-BY-STEP GUIDE)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
            HOW DYOJ WORKS
          </p>
          <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
            How to Use Our DYOJ Custom Builder
          </h2>
          <p className="text-base text-[#5C5346] font-[family-name:var(--font-eb-garamond)] leading-relaxed">
            Designing custom jewelry should feel simple and transparent. Follow the four steps below to pair a certified natural gemstone with your favorite setting, see the total price upfront, and commission your piece.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DYOJ_HOW_IT_WORKS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-2xl border border-[#E5D4B3] bg-white/90 p-6 shadow-[0_10px_32px_rgba(185,150,75,0.08)] flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
                      {item.step}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF4E6] border border-[#E5D4B3] text-[#9A7B2C]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#5C5346] leading-relaxed font-[family-name:var(--font-eb-garamond)]">
                    {item.description}
                  </p>
                </div>

                <a
                  href="#dyoj-studio"
                  className="inline-flex items-center gap-1 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] font-semibold pt-2"
                >
                  Try in Studio ↓
                </a>
              </div>
            );
          })}
        </div>

        {/* Full-Bleed Subcategory Showcase of What You Can Build */}
        <div className="pt-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
                CUSTOM CATEGORIES
              </p>
              <h3 className="font-[family-name:var(--font-eb-garamond)] text-3xl sm:text-4xl font-normal text-[#181613] mt-1">
                What You Can Create with DYOJ
              </h3>
            </div>
            <a
              href="#dyoj-studio"
              className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] inline-flex items-center gap-1.5 font-semibold"
            >
              Launch Interactive Builder <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DYOJ_SUBCATEGORY_CREATIONS.map((card) => (
              <ProductCard
                key={card.name}
                category={card.kicker}
                name={card.name}
                material={card.material}
                carat={card.carat}
                price={card.price}
                image={card.image}
                href={card.href}
              />
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. INTERACTIVE DYOJ CONFIGURATOR STUDIO (ANCHOR TARGET OF HERO CTA)
         ========================================================================= */}
      <section
        id="dyoj-studio"
        data-testid="dyoj-studio-section"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-[#EADBC0]/80 space-y-8 scroll-mt-20"
      >
        <div className="border-b border-[#E5D4B3] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
              INTERACTIVE DYOJ STUDIO
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              Build Your Custom Piece
            </h2>
          </div>
          <p className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#5C5346]">
            Select your stone, setting, precious metal, and ring size below
          </p>
        </div>

        <DyoConfiguratorClient
          stones={stones}
          settings={settings}
          recentCodes={recentCodes}
          initialStoneId={sp.stone}
          initialSettingSlug={sp.setting}
          initialMetalCode={sp.metal}
          initialSize={sp.size}
        />
      </section>
    </div>
  );
}
