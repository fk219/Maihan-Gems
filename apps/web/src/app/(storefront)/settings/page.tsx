import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { ProductCard } from '@/components/mgh/ProductCard';
import { HeroBackgroundVideo } from '@/components/mgh/catalog/HeroBackgroundVideo';
import { getFixtureSettingsCatalog } from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ring, Necklace & Earring Settings | Maihan Gems',
  description:
    'Explore all setting subcategories—Ring Settings, Necklace Settings, Earring Settings, and Three-Stone Mounts—crafted in Platinum 950 and 18k Gold.',
  alternates: {
    canonical: `${SITE_URL}/settings`,
  },
};

const SETTING_SUBCATEGORIES = [
  {
    id: 'ring-settings',
    kicker: 'SETTING TYPE · 01',
    name: 'Ring Settings',
    material: 'Platinum 950 & 18k Gold',
    carat: 'Solitaire · Cathedral · Bezel',
    price: 1650,
    image: '/mgh/images/gems/setting-ring.jpg',
    href: '/settings/SET-ARCH-SOL-01',
  },
  {
    id: 'necklace-settings',
    kicker: 'SETTING TYPE · 02',
    name: 'Necklace Settings',
    material: '18k Yellow, Rose & White Gold',
    carat: 'Pendant Baskets · Solitaire Bails',
    price: 1420,
    image: '/mgh/images/verdant-drop.jpg',
    href: '/settings/SET-PEND-SOL-06',
  },
  {
    id: 'earring-settings',
    kicker: 'SETTING TYPE · 03',
    name: 'Earring Settings',
    material: 'Solid Gold & Platinum Pairs',
    carat: 'Martini Studs · Leverback Drops',
    price: 1380,
    image: '/mgh/images/gems/earrings-pair.jpg',
    href: '/settings/SET-EAR-STUD-05',
  },
  {
    id: 'three-stone-settings',
    kicker: 'SETTING TYPE · 04',
    name: 'Three-Stone & Baguette Settings',
    material: 'Natural Diamond Side Stones',
    carat: 'Tapered Baguettes · Atelier Frames',
    price: 2890,
    image: '/mgh/images/elysian-ring.jpg',
    href: '/settings/SET-TRILOGY-TAPER-03',
  },
];

export default async function SettingsIndexPage() {
  // Settings seam (F4): the applet SettingItem now assembles from REAL fresh
  // rows (one item per design; metals = the design's actual variants; sizes =
  // the approved standard ring-size constant; accepts = fresh min/max carat
  // + compatible shapes). Nothing is invented.
  const settings = await getFixtureSettingsCatalog();

  return (
    <div className="golden-cloud-gallery text-[#181613]">
      {/* =========================================================================
          1. DEDICATED SETTINGS EDITORIAL SPLIT HERO WITH STOCK VIDEO
         ========================================================================= */}
      <section
        data-testid="settings-landing-hero"
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
                    Settings
                  </li>
                </ol>
              </nav>

              <div className="space-y-3">
                <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                  MAIHAN GEMS · GENEVA MOUNTINGS ATELIER
                </p>
                <div className="w-10 h-[1.5px] bg-[#D4AF37]" />
                <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08]">
                  Ring, Necklace &amp; Earring Settings.
                </h1>
              </div>

              <p className="max-w-2xl text-base sm:text-lg font-[family-name:var(--font-eb-garamond)] text-white/85 leading-relaxed">
                Every setting is hand-forged in Geneva in solid 950 Platinum, 18k Yellow Gold, 18k Rose Gold, or 18k White Gold, and custom-fitted to the exact millimeter dimensions of your chosen stone.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#E6C97A] font-semibold">
                <span>Platinum 950</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>18k Yellow, Rose &amp; White Gold</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>Custom Prong Calibration</span>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#shop-all-settings"
                  data-testid="hero-shop-all-settings-cta"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] font-bold gold-gradient-cta shadow-[0_12px_28px_rgba(212,175,55,0.32)] transition-transform hover:scale-[1.02]"
                >
                  <span>Shop All Settings</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <Link
                  href="/design-your-own"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-[#D4AF37]/60 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  <Compass className="h-4 w-4 text-[#D4AF37]" />
                  <span>Pair with a Stone in DYOJ</span>
                </Link>
              </div>
            </div>

            {/* Right Architectural Mounting & Stock Video Showcase */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-[#141418] aspect-[4/3] shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/mgh/images/gems/setting-ring.jpg"
                  className="h-full w-full object-cover"
                >
                  <source src="/mgh/videos/hero-gemstone.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 space-y-2">
                  <p className="text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.24em] text-[#E6C97A] font-semibold">
                    BESPOKE BENCH CRAFTSMANSHIP
                  </p>
                  <p className="font-[family-name:var(--font-eb-garamond)] text-2xl text-white">
                    Engineered to Your Stone’s Exact Cut
                  </p>
                  <p className="text-xs font-[family-name:var(--font-eb-garamond)] text-white/80">
                    Available for Cushion, Oval, Emerald, Pear, and Round Cuts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. ALL SETTING SUBCATEGORIES (RING, NECKLACE, EARRING, THREE-STONE)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EADBC0]/80 pb-6">
          <div className="space-y-2">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              SETTING SUBCATEGORIES
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              All Types of Settings We Offer
            </h2>
            <p className="text-base text-[#5C5346] font-[family-name:var(--font-eb-garamond)] max-w-2xl">
              Explore our Ring Settings, Necklace Settings, Earring Settings, and Three-Stone Mounts below, or scroll down to shop every individual mounting style.
            </p>
          </div>

          <a
            href="#shop-all-settings"
            className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] inline-flex items-center gap-1.5 font-semibold shrink-0"
          >
            Jump to All {settings.length} Mounts <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div
          data-testid="settings-subcategories-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {SETTING_SUBCATEGORIES.map((sub) => (
            <div key={sub.id} id={sub.id}>
              <ProductCard
                category={sub.kicker}
                name={sub.name}
                material={sub.material}
                carat={sub.carat}
                price={sub.price}
                image={sub.image}
                href={sub.href}
              />
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          3. SHOP ALL SETTINGS (ANCHOR TARGET OF HERO CTA BUTTON)
         ========================================================================= */}
      <section
        id="shop-all-settings"
        data-testid="shop-all-settings-section"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-[#EADBC0]/80 space-y-10 scroll-mt-20"
      >
        <div className="border-b border-[#E5D4B3] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              COMPLETE MOUNTINGS CATALOG · {settings.length} STYLES
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              Shop All Ring, Necklace &amp; Earring Settings
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-eb-garamond)] text-[#5C5346]">
            <ShieldCheck className="h-4 w-4 text-[#9A7B2C]" />
            <span>Custom-fitted to your gemstone in 14 days</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {settings.map((setting) => (
            <ProductCard
              key={setting.sku}
              compareId={setting.sku}
              category={setting.category}
              name={setting.name}
              material="Platinum 950 & 18k Gold"
              carat={setting.style}
              price={setting.basePrice}
              image={setting.images[0]}
              href={`/settings/${setting.sku}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
