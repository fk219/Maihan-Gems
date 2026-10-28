import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { ProductCard } from '@/components/mgh/ProductCard';
import { HeroBackgroundVideo } from '@/components/mgh/catalog/HeroBackgroundVideo';
import {
  getFixtureSettingsCatalog,
  getMatchedPairCatalog,
} from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fine Jewelry — Rings, Necklaces, Earrings & Pairs | Maihan Gems',
  description:
    'Explore handcrafted fine jewelry subcategories—Rings, Necklaces, Earrings, and Matched Gemstone Pairs—crafted in solid 950 Platinum and 18k Gold.',
  alternates: {
    canonical: `${SITE_URL}/jewellery`,
  },
};

const JEWELRY_SUBCATEGORIES = [
  {
    id: 'rings',
    kicker: 'SUBCATEGORY · 01',
    name: 'Rings',
    material: 'Platinum 950 & 18k Gold',
    carat: 'Engagement · Solitaire · Signet',
    price: 12800,
    image: '/mgh/images/elysian-ring.jpg',
    href: '/products/elysian-ring',
  },
  {
    id: 'necklaces',
    kicker: 'SUBCATEGORY · 02',
    name: 'Necklaces & Pendants',
    material: '18k Yellow, Rose & White Gold',
    carat: 'Gemstone Drops · Solitaire Bails',
    price: 18500,
    image: '/mgh/images/verdant-drop.jpg',
    href: '/products/verdant-drop',
  },
  {
    id: 'earrings',
    kicker: 'SUBCATEGORY · 03',
    name: 'Earrings',
    material: 'Platinum & 18k Gold Mounts',
    carat: 'Martini Studs · Drop Earrings',
    price: 3800,
    image: '/mgh/images/gems/earrings-pair.jpg',
    href: '/pairs',
  },
  {
    id: 'matched-pairs',
    kicker: 'SUBCATEGORY · 04',
    name: 'Matched Gemstone Pairs',
    material: 'Calibrated Natural Pairs',
    carat: 'Sapphire · Spinel · Emerald Pairs',
    price: 5400,
    image: '/mgh/images/gems/spinel-gem.jpg',
    href: '/pairs',
  },
];

export default async function JewelleryIndexPage() {
  // Real pairs from the catalogue; the settings family keeps rendering the
  // applet's ported fixture ledger verbatim (see the settings seam note in
  // adapters/catalog.ts and /settings).
  const pairs = await getMatchedPairCatalog(24);
  const settings = getFixtureSettingsCatalog();

  return (
    <div className="golden-cloud-gallery text-[#181613]">
      {/* =========================================================================
          1. DEDICATED FINE JEWELRY EDITORIAL SPLIT HERO WITH STOCK VIDEO
         ========================================================================= */}
      <section
        data-testid="jewelry-landing-hero"
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
                    Fine Jewelry
                  </li>
                </ol>
              </nav>

              <div className="space-y-3">
                <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                  MAIHAN GEMS · GENEVA FINE JEWELRY ATELIER
                </p>
                <div className="w-10 h-[1.5px] bg-[#D4AF37]" />
                <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.08]">
                  Handcrafted Fine Jewelry.
                </h1>
              </div>

              <p className="max-w-2xl text-base sm:text-lg font-[family-name:var(--font-eb-garamond)] text-white/85 leading-relaxed">
                Explore finished Rings, Necklaces, Earrings, and Matched Gemstone Pairs crafted in Geneva using solid 950 Platinum and 18k Gold, with every stone weight and metal purity stated clearly.
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#E6C97A] font-semibold">
                <span>Solid 950 Platinum &amp; 18k Gold</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>Geneva Atelier</span>
                <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                <span>Lifetime Care Included</span>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="#shop-all-jewelry"
                  data-testid="hero-shop-all-jewelry-cta"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] font-bold gold-gradient-cta shadow-[0_12px_28px_rgba(212,175,55,0.32)] transition-transform hover:scale-[1.02]"
                >
                  <span>Shop All Fine Jewelry</span>
                  <ArrowRight className="h-4 w-4" />
                </a>

                <Link
                  href="/design-your-own"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-[#D4AF37]/60 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] font-semibold transition-colors"
                >
                  <Compass className="h-4 w-4 text-[#D4AF37]" />
                  <span>Open DYOJ Studio</span>
                </Link>
              </div>
            </div>

            {/* Right Asymmetric Jewelry Gallery & Stock Video Mosaic */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#141418] aspect-[3/4] shadow-[0_20px_50px_rgba(0,0,0,0.65)]">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/mgh/images/elysian-ring.jpg"
                  className="h-full w-full object-cover"
                >
                  <source src="/mgh/videos/hero-gemstone.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#E6C97A] font-semibold">
                    SIGNATURE RING
                  </p>
                  <p className="font-[family-name:var(--font-eb-garamond)] text-xl text-white">
                    Elysian Solitaire
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#141418] aspect-[3/4] shadow-[0_20px_50px_rgba(0,0,0,0.65)] mt-6">
                <img
                  src="/mgh/images/verdant-drop.jpg"
                  alt="Verdant Emerald Drop Necklace"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#E6C97A] font-semibold">
                    HIGH JEWELRY PENDANT
                  </p>
                  <p className="font-[family-name:var(--font-eb-garamond)] text-xl text-white">
                    Verdant Drop
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. ALL FINE JEWELRY SUBCATEGORIES (RINGS, NECKLACES, EARRINGS, PAIRS)
         ========================================================================= */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EADBC0]/80 pb-6">
          <div className="space-y-2">
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.28em] text-[#9A7B2C] font-semibold">
              JEWELRY SUBCATEGORIES
            </p>
            <h2 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              All Types of Fine Jewelry We Offer
            </h2>
            <p className="text-base text-[#5C5346] font-[family-name:var(--font-eb-garamond)] max-w-2xl">
              Browse our core jewelry families—Rings, Necklaces, Earrings, and Matched Gemstone Pairs—each presented in our signature full-bleed cards.
            </p>
          </div>

          <a
            href="#shop-all-jewelry"
            className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#8B6B23] hover:text-[#181613] inline-flex items-center gap-1.5 font-semibold shrink-0"
          >
            Jump to All Pieces <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div
          data-testid="jewelry-subcategories-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {JEWELRY_SUBCATEGORIES.map((sub) => (
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
          3. SHOP ALL FINE JEWELRY (ANCHOR TARGET OF HERO CTA BUTTON)
         ========================================================================= */}
      <section
        id="shop-all-jewelry"
        data-testid="shop-all-jewelry-section"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 border-t border-[#EADBC0]/80 space-y-10 scroll-mt-20"
      >
        <div className="border-b border-[#E5D4B3] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.26em] text-[#9A7B2C] font-semibold">
              COMPLETE JEWELRY COLLECTION
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#181613]">
              Shop All Fine Jewelry
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-eb-garamond)] text-[#5C5346]">
            <ShieldCheck className="h-4 w-4 text-[#9A7B2C]" />
            <span>Solid 950 Platinum &amp; 18k Gold · Free Insured Shipping</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ProductCard
            compareId="JWL-ELYSIAN-RING"
            category="Rings"
            name="Elysian Ring"
            material="Natural Diamond"
            carat="2.15 CT"
            price={12800}
            image="/mgh/images/elysian-ring.jpg"
            href="/products/elysian-ring"
          />
          <ProductCard
            compareId="JWL-VERDANT-DROP"
            category="Necklaces"
            name="Verdant Drop"
            material="Natural Emerald"
            carat="4.32 CT"
            price={18500}
            image="/mgh/images/verdant-drop.jpg"
            href="/products/verdant-drop"
          />
          {pairs.map((pair) => (
            <ProductCard
              key={pair.id}
              compareId={pair.id}
              category="Matched Pair Earrings"
              name={pair.name}
              material={`Natural ${pair.variety}`}
              carat={`${pair.totalCarat.toFixed(2)} CT`}
              price={pair.price}
              image={pair.images[0]}
              href="/pairs"
            />
          ))}
          {settings.map((setting) => (
            <ProductCard
              key={setting.sku}
              compareId={setting.sku}
              category={setting.category}
              name={setting.name}
              material="Platinum & 18k Gold"
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
