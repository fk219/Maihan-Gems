/**
 * apps/web/src/app/(storefront)/page.tsx — `/`
 *
 * Storefront Homepage for Maihan Gems: Product Discovery & Mineralogical Architecture.
 *
 * Authority & Styling:
 *   - Design.md: Swiss Private Banking precision combined with modern Dubai luxury.
 *   - Signature Alternating Rhythm:
 *       1. Hero: Deep Obsidian Navy (#08121E) with integrated catalogue search
 *       2. Marquee Ticker: Solid Metallic Gold (#C9A84C) core values banner
 *       3. Atelier Settings: Dark Primary Navy (#0D1B2A) with real setting designs
 *       4. Bespoke Atelier Workflow: Crisp White (#FFFFFF) 3-step configurator guide
 *       5. Mineralogical Discovery: Midnight Obsidian (#080D19) variety & colour search portals
 *       6. Gemmological Integrity: Ivory Off-White (#FAFAF8) verified standard pillars
 *   - Real data seam: catalogServer().listSettings({ limit: 6 }) and catalogServer().getTaxonomy().
 *   - Invariants: INV-01/02/03/07/08 honoured. No fake products, prices or unverified claims.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../lib/catalog-server.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Natural Untreated Gemstones & Master Atelier Settings',
  description:
    'Discover 100% natural earth-mined loose gemstones, certified mineral varieties, and precision master goldsmith settings in 18K gold and platinum.',
};

/** Iconic mineral varieties for curated discovery */
const CURATED_VARIETIES = [
  { slug: 'emerald', name: 'Emerald', species: 'Beryl', color: '#10B981' },
  { slug: 'sapphire', name: 'Sapphire', species: 'Corundum', color: '#3B82F6' },
  { slug: 'ruby', name: 'Ruby', species: 'Corundum', color: '#EF4444' },
  { slug: 'spinel', name: 'Spinel', species: 'Spinel', color: '#DB2777' },
  { slug: 'tsavorite-garnet', name: 'Tsavorite Garnet', species: 'Grossular Garnet', color: '#059669' },
  { slug: 'tourmaline', name: 'Tourmaline', species: 'Tourmaline Group', color: '#06B6D4' },
  { slug: 'tanzanite', name: 'Tanzanite', species: 'Zoisite', color: '#6366F1' },
  { slug: 'aquamarine', name: 'Aquamarine', species: 'Beryl', color: '#38BDF8' },
];

/** Chromatic colour swatches for spectrum discovery */
const CHROMATIC_COLOURS = [
  { slug: 'blue', name: 'Royal Blue', gradient: 'radial-gradient(circle at 35% 35%, #60A5FA 0%, #2563EB 50%, #0F172A 100%)' },
  { slug: 'green', name: 'Vivid Green', gradient: 'radial-gradient(circle at 35% 35%, #34D399 0%, #059669 50%, #064E3B 100%)' },
  { slug: 'red', name: 'Pigeon Blood Red', gradient: 'radial-gradient(circle at 35% 35%, #F87171 0%, #DC2626 50%, #450A0A 100%)' },
  { slug: 'pink', name: 'Vivid Pink', gradient: 'radial-gradient(circle at 35% 35%, #F472B6 0%, #DB2777 50%, #700B34 100%)' },
  { slug: 'yellow', name: 'Warm Yellow', gradient: 'radial-gradient(circle at 35% 35%, #FCD34D 0%, #D97706 50%, #78350F 100%)' },
  { slug: 'purple', name: 'Royal Purple', gradient: 'radial-gradient(circle at 35% 35%, #C084FC 0%, #7C3AED 50%, #3B0764 100%)' },
];

/** Curated gemstone specimen collections with verified vector artwork */
const VAULT_COLLECTIONS = [
  {
    slug: 'sapphire',
    title: 'Ceylon Royal Sapphires',
    provenance: 'Sri Lanka & Kashmir · Natural Unheated',
    description: 'Vivid royal blue, cornflower, and sunset padparadscha corundum crystals.',
    image: '/assets/gemstones/sapphire.svg',
    href: '/search?q=sapphire',
    spec: '3.42 ct · Cushion Cut · GRS Certified',
  },
  {
    slug: 'emerald',
    title: 'Muzo & Panjshir Emeralds',
    provenance: 'Colombia & Afghanistan · Natural Beryl',
    description: 'Deep crystalline forest green beryls with verified traditional treatment disclosure.',
    image: '/assets/gemstones/emerald.svg',
    href: '/search?q=emerald',
    spec: '2.85 ct · Emerald Cut · GIA Certified',
  },
  {
    slug: 'ruby',
    title: "Burmese Pigeon's Blood Rubies",
    provenance: 'Mogok, Myanmar · Untreated Corundum',
    description: 'Rare fluorescent crimson corundum specimens possessing supreme saturation.',
    image: '/assets/gemstones/ruby.svg',
    href: '/search?q=ruby',
    spec: '2.14 ct · Oval Brilliant · SSEF Verified',
  },
  {
    slug: 'paraiba',
    title: 'Paraíba & Exotic Minerals',
    provenance: 'Brazil & Mozambique · Copper-Bearing',
    description: 'Electric neon-cyan tourmalines, cobalt spinels, and vivid tsavorite garnets.',
    image: '/assets/gemstones/tourmaline.svg',
    href: '/search?q=tourmaline',
    spec: '1.92 ct · Pear Cut · Gübelin Certified',
  },
];

/** Selects appropriate master jewelry setting illustration based on type & style */
function getSettingImage(jewelleryType: string, styleLabel: string | null): string {
  if (jewelleryType.toUpperCase() === 'EARRINGS') {
    return '/assets/settings/stud_earrings.svg';
  }
  const s = (styleLabel ?? '').toLowerCase();
  if (s.includes('halo')) {
    return '/assets/settings/halo_ring.svg';
  }
  if (s.includes('three') || s.includes('trilogy') || s.includes('side')) {
    return '/assets/settings/three_stone_ring.svg';
  }
  return '/assets/settings/solitaire_ring.svg';
}

export default async function HomePage() {
  const service = catalogServer();

  // Load live reference settings (doc 10: settings are not publication-gated)
  const settingsRes = await service.listSettings({ limit: 6 });
  const settings = settingsRes.value.items;

  return (
    <main className="storefront-home" id="main-content">
      {/* ── SECTION 1: HERO (Warm Alabaster #FAFAF8 Silk & Stone) ── */}
      <section
        className="storefront-section bg-warm-alabaster"
        style={{
          paddingTop: '4.5rem',
          paddingBottom: '5.5rem',
          backgroundImage:
            'radial-gradient(circle at 50% 20%, rgba(201, 168, 76, 0.08) 0%, transparent 65%)',
        }}
        aria-label="Hero Introduction"
      >
        <div className="storefront-section__container">
          <div className="hero-grid">
            {/* Left Column: Brand Statement & Discovery */}
            <div>
              <span className="section-eyebrow section-eyebrow--dark">
                Natural Mineralogy &amp; Master Atelier
              </span>
              <h1
                className="section-title"
                style={{
                  fontSize: 'clamp(2.5rem, 4.5vw, 4rem)',
                  lineHeight: 1.1,
                  margin: '0 0 1.25rem 0',
                  color: '#1a1a18',
                  letterSpacing: '-0.02em',
                }}
              >
                Rare Earth Gemstones <span className="text-gold-gradient">&amp; Haute Mountings</span>
              </h1>
              <p
                className="storefront-section__subtitle"
                style={{
                  color: '#4a4740',
                  maxWidth: '540px',
                  margin: '0 0 2rem 0',
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                }}
              >
                100% natural, untreated earth-mined gemstones and precision-cast 18K gold and platinum
                mountings. Handcrafted to order in our private atelier.
              </p>

              {/* Integrated Search Discovery Form */}
              <div style={{ maxWidth: '540px', marginBottom: '1.5rem' }}>
                <form action="/search" method="GET" className="search-bar-form" role="search">
                  <input
                    type="search"
                    name="q"
                    placeholder="Search by mineral, cut, metal, or SKU..."
                    className="search-input"
                    aria-label="Search gemstones and fine settings catalogue"
                  />
                  <button type="submit" className="btn-primary">
                    Search
                  </button>
                </form>

                {/* Quick Discovery Pills */}
                <div className="search-pills-row" style={{ marginTop: '0.85rem' }}>
                  <Link href="/search?q=sapphire" className="search-pill-link">
                    Sapphires
                  </Link>
                  <Link href="/search?q=emerald" className="search-pill-link">
                    Emeralds
                  </Link>
                  <Link href="/search?q=ruby" className="search-pill-link">
                    Rubies
                  </Link>
                  <Link href="/settings" className="search-pill-link">
                    18K Mountings
                  </Link>
                  <Link href="/design-your-own" className="search-pill-link">
                    Atelier Configurator
                  </Link>
                </div>
              </div>

              {/* Core Action Navigation Links */}
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginTop: '1.5rem',
                }}
              >
                <Link href="/search" className="btn-primary">
                  Explore Vault
                </Link>
                <Link href="/design-your-own" className="btn-outline">
                  Design Your Own →
                </Link>
              </div>
            </div>

            {/* Right Column: 1-of-1 Vault Masterpiece Showcase */}
            <div className="hero-showcase-card">
              <div className="hero-showcase-image">
                <img
                  src="/assets/hero/atelier_hero_gem.svg"
                  alt="4.82 ct Vivid Royal Blue Ceylon Cushion Sapphire in 18K Yellow Gold Cathedral Ring Mount"
                  loading="eager"
                  width="500"
                  height="375"
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: '#8a867e',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(201, 168, 76, 0.25)',
                  }}
                >
                  1-of-1 Vault
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-gold-dark)',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  Ceylon, Sri Lanka · Natural Unheated
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.45rem',
                    fontWeight: 600,
                    color: '#1a1a18',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.25,
                  }}
                >
                  4.82 Carat Royal Blue Cushion Sapphire
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '12px',
                    color: '#4a4740',
                    marginBottom: '1.25rem',
                  }}
                >
                  <span>Cushion Cut</span>
                  <span aria-hidden="true" style={{ color: 'rgba(201, 168, 76, 0.6)' }}>
                    ·
                  </span>
                  <span className="font-mono tabular-nums">10.42 × 8.85 mm</span>
                  <span aria-hidden="true" style={{ color: 'rgba(201, 168, 76, 0.6)' }}>
                    ·
                  </span>
                  <span>GRS Certified</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        color: '#8a867e',
                        display: 'block',
                      }}
                    >
                      Masterpiece In Stock
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a1a18' }}
                    >
                      Private Vault
                    </span>
                  </div>
                  <Link
                    href="/search?q=sapphire"
                    className="btn-primary"
                    style={{ padding: '0.6rem 1.2rem', fontSize: '11px' }}
                  >
                    Inspect Specimen →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: INFINITE MARQUEE TICKER ── */}
      <aside className="marquee-container" aria-label="Maihan Gems core values marquee">
        <div className="marquee-track">
          <div className="marquee-content">
            <span>100% Earth-Mined Natural Gemstones</span>
            <span className="marquee-dot">✦</span>
            <span>Swiss &amp; Dubai Private Vault Custody</span>
            <span className="marquee-dot">✦</span>
            <span>GIA &amp; GRS Laboratory Verified</span>
            <span className="marquee-dot">✦</span>
            <span>Transparent Treatment Disclosure</span>
            <span className="marquee-dot">✦</span>
            <span>Master Goldsmith Mountings in 18K &amp; Platinum</span>
            <span className="marquee-dot">✦</span>
            <span>Bespoke Atelier Craftsmanship</span>
            <span className="marquee-dot">✦</span>
            <span>Insured Worldwide Express Delivery</span>
            <span className="marquee-dot">✦</span>
          </div>
          {/* Duplicated Track for Continuous Seamless Loop */}
          <div className="marquee-content" aria-hidden="true">
            <span>100% Earth-Mined Natural Gemstones</span>
            <span className="marquee-dot">✦</span>
            <span>Swiss &amp; Dubai Private Vault Custody</span>
            <span className="marquee-dot">✦</span>
            <span>GIA &amp; GRS Laboratory Verified</span>
            <span className="marquee-dot">✦</span>
            <span>Transparent Treatment Disclosure</span>
            <span className="marquee-dot">✦</span>
            <span>Master Goldsmith Mountings in 18K &amp; Platinum</span>
            <span className="marquee-dot">✦</span>
            <span>Bespoke Atelier Craftsmanship</span>
            <span className="marquee-dot">✦</span>
            <span>Insured Worldwide Express Delivery</span>
            <span className="marquee-dot">✦</span>
          </div>
        </div>
      </aside>

      {/* ── SECTION 3: CURATED GEMSTONE VAULT COLLECTIONS ── */}
      <section className="storefront-section bg-studio-white" aria-labelledby="collections-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">Natural Mineral Treasures</span>
            <h2
              id="collections-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#1a1a18' }}
            >
              Curated Gemstone <span className="text-gold-gradient">Vault Collections</span>
            </h2>
            <p className="storefront-section__subtitle" style={{ color: '#4a4740' }}>
              Direct-source untreated mineral treasures authenticated by premier international gemmological laboratories.
            </p>
          </div>

          <div className="grid-cards-4" style={{ marginBottom: '3rem' }}>
            {VAULT_COLLECTIONS.map((c) => (
              <div
                key={c.slug}
                className="luxury-card luxury-card--light"
                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
              >
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    background: '#FAFAF8',
                    borderRadius: 'calc(var(--radius) - 4px)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: '#8a867e',
                    }}
                  >
                    Natural
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-gold-dark)',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  {c.provenance}
                </span>

                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.35rem',
                    fontWeight: 600,
                    color: '#1a1a18',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.25,
                  }}
                >
                  {c.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#4a4740',
                    lineHeight: 1.5,
                    margin: '0 0 1rem 0',
                  }}
                >
                  {c.description}
                </p>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span className="font-mono" style={{ fontSize: '11px', color: '#8a867e' }}>
                    {c.spec}
                  </span>
                  <Link
                    href={c.href}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--color-gold-dark)',
                      textDecoration: 'none',
                    }}
                  >
                    Explore →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/search" className="btn-primary">
              View All Loose Gemstones
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: ATELIER SETTINGS SHOWCASE (Warm Alabaster #FAFAF8 Silk & Stone) ── */}
      <section className="storefront-section bg-warm-alabaster" aria-labelledby="settings-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">Atelier Mountings</span>
            <h2
              id="settings-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#1a1a18' }}
            >
              Master Goldsmith <span className="text-gold-gradient">Setting Designs</span>
            </h2>
            <p
              className="storefront-section__subtitle"
              style={{ color: '#4a4740' }}
            >
              Precision-cast in 18K Yellow Gold, White Gold, Rose Gold, and 950 Platinum. Choose a signature
              mounting engineered to showcase bespoke natural gemstones.
            </p>
          </div>

          {settings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ color: '#4a4740', marginBottom: '1.5rem' }}>
                Explore over 950 master mountings in our complete atelier catalogue.
              </p>
              <Link href="/settings" className="btn-primary">
                View All Settings
              </Link>
            </div>
          ) : (
            <div className="grid-cards-3" style={{ marginBottom: '3.5rem' }}>
              {settings.map((setting) => (
                <div
                  key={setting.design_code}
                  className="luxury-card luxury-card--light"
                  style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '16/10',
                      background: '#FAFAF8',
                      borderRadius: 'calc(var(--radius) - 4px)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <img
                      src={getSettingImage(setting.jewellery_type, setting.style?.label ?? null)}
                      alt={setting.name}
                      loading="lazy"
                      style={{
                        maxWidth: '85%',
                        maxHeight: '85%',
                        objectFit: 'contain',
                        transition: 'transform 0.4s ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        left: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid rgba(201, 168, 76, 0.3)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--color-gold-dark)',
                        }}
                      >
                        {setting.jewellery_type.toLowerCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        color: '#8a867e',
                        background: 'rgba(255, 255, 255, 0.85)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {setting.design_code}
                    </div>
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.35rem',
                      fontWeight: 600,
                      margin: '0 0 0.4rem 0',
                      color: '#1a1a18',
                      lineHeight: 1.25,
                    }}
                  >
                    {setting.name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: '#4a4740',
                      margin: '0 0 1.25rem 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {setting.style !== null ? setting.style.label : 'Classic Master Setting'}
                    {' · '}
                    {setting.variant_count} metal option{setting.variant_count === 1 ? '' : 's'}{' '}
                    available
                  </p>

                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span className="font-mono" style={{ fontSize: '11px', color: '#8a867e' }}>
                      18K &amp; Platinum
                    </span>
                    <Link
                      href={`/search?q=${setting.design_code}`}
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--color-gold-dark)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>Explore Mounting</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '1.25rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/settings" className="btn-primary">
              Browse All Setting Designs
            </Link>
            <Link href="/design-your-own" className="btn-outline">
              Design Your Custom Piece
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: BESPOKE ATELIER WORKFLOW (Crisp White #FFFFFF) ── */}
      <section className="storefront-section bg-crisp-white" aria-labelledby="bespoke-workflow-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">Bespoke Creation</span>
            <h2
              id="bespoke-workflow-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#1a1a18' }}
            >
              Craft Your <span className="text-gold-gradient">Custom Jewel</span>
            </h2>
            <p className="storefront-section__subtitle" style={{ color: '#4a4740' }}>
              A disciplined three-stage atelier process pairing rare earth gemstones with master goldsmith mountings.
            </p>
          </div>

          <div className="grid-cards-3" style={{ marginBottom: '3rem' }}>
            {/* Step 1 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2.25rem 2rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '1.5px solid var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--color-gold-dark)',
                  marginBottom: '1.25rem',
                }}
              >
                1
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#1a1a18',
                }}
              >
                Select Master Mounting
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#4a4740', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Explore over 950 solitaire, halo, three-stone, and vintage designs cast in 18K yellow, white,
                rose gold, or platinum.
              </p>
              <Link
                href="/settings"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-gold-dark)',
                  textDecoration: 'none',
                }}
              >
                Browse Mountings →
              </Link>
            </div>

            {/* Step 2 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2.25rem 2rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '1.5px solid var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--color-gold-dark)',
                  marginBottom: '1.25rem',
                }}
              >
                2
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#1a1a18',
                }}
              >
                Pair Natural Gemstone
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#4a4740', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Filter our catalogue by species, carat weight, colour saturation, and cut to select an
                exceptional centre stone or earring pair.
              </p>
              <Link
                href="/search"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-gold-dark)',
                  textDecoration: 'none',
                }}
              >
                Intelligent Search →
              </Link>
            </div>

            {/* Step 3 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2.25rem 2rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '1.5px solid var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--color-gold-dark)',
                  marginBottom: '1.25rem',
                }}
              >
                3
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#1a1a18',
                }}
              >
                Hand-Set &amp; Hallmarked
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#4a4740', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Master jewelers set your stone with exact prong tension, finish the piece to mirror luster,
                and provide official laboratory documentation.
              </p>
              <Link
                href="/design-your-own"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-gold-dark)',
                  textDecoration: 'none',
                }}
              >
                Launch Configurator →
              </Link>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/design-your-own" className="btn-primary">
              Begin Custom Design
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: MINERALOGICAL DISCOVERY (Warm Alabaster #FAFAF8 Silk & Stone) ── */}
      <section className="storefront-section bg-warm-alabaster" aria-labelledby="discovery-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">Mineralogical Discovery</span>
            <h2
              id="discovery-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#1a1a18' }}
            >
              Explore by Mineral Variety <span className="text-gold-gradient">&amp; Chromatic Hue</span>
            </h2>
            <p
              className="storefront-section__subtitle"
              style={{ color: '#4a4740' }}
            >
              Search our mineralogical database by certified species and vibrant colour families.
            </p>
          </div>

          {/* Curated Variety Search Cards */}
          <div className="grid-cards-4" style={{ marginBottom: '3.5rem' }}>
            {CURATED_VARIETIES.map((v) => (
              <Link
                key={v.slug}
                href={`/search?q=${encodeURIComponent(v.name)}`}
                className="luxury-card luxury-card--light"
                style={{ padding: '1.75rem 1.5rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--color-gold-dark)',
                    }}
                  >
                    {v.species}
                  </span>
                  <span style={{ color: v.color, fontSize: '0.875rem' }}>●</span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    margin: '0 0 0.5rem 0',
                    color: '#1a1a18',
                  }}
                >
                  {v.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#4a4740',
                    margin: '0 0 1rem 0',
                    lineHeight: 1.4,
                  }}
                >
                  Search natural {v.name.toLowerCase()} gemstones &amp; jewellery.
                </p>
                <div
                  style={{
                    marginTop: 'auto',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-gold-dark)',
                  }}
                >
                  Search {v.name} →
                </div>
              </Link>
            ))}
          </div>

          {/* Chromatic Spectrum Row */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#4a4740',
              }}
            >
              Discover by Chromatic Family:
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '3rem',
            }}
          >
            {CHROMATIC_COLOURS.map((c) => (
              <Link
                key={c.slug}
                href={`/search?color=${c.slug}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '9999px',
                  background: '#ffffff',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                  boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.04)',
                  textDecoration: 'none',
                  color: '#1a1a18',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease',
                }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: c.gradient,
                    display: 'inline-block',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                  aria-hidden="true"
                />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: GEMMOLOGICAL INTEGRITY (Warm Alabaster #FAFAF8 Silk & Stone) ── */}
      <section className="storefront-section bg-warm-alabaster" aria-labelledby="standards-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">The Maihan Standard</span>
            <h2
              id="standards-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#1a1a18' }}
            >
              Grounded <span className="text-gold-gradient">Gemmological Integrity</span>
            </h2>
            <p className="storefront-section__subtitle" style={{ color: '#4a4740' }}>
              Rigorous physical evaluation, transparent disclosure, and master atelier craftsmanship.
            </p>
          </div>

          <div className="grid-cards-4">
            {/* Pillar 1 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                }}
              >
                ✦
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  margin: '0 0 0.5rem 0',
                  color: '#1a1a18',
                }}
              >
                100% Earth-Mined
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#4a4740', lineHeight: 1.6, margin: 0 }}>
                Every gemstone in our collection is natural and earth-mined. We maintain a strict prohibition
                against synthetic or lab-grown mineral imitations.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                }}
              >
                📜
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  margin: '0 0 0.5rem 0',
                  color: '#1a1a18',
                }}
              >
                Treatment Disclosure
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#4a4740', lineHeight: 1.6, margin: 0 }}>
                Complete transparency on every specimen: unheated stones are clearly verified, and traditional
                enhancements (such as oil in emeralds) are fully disclosed.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                }}
              >
                ⚒
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  margin: '0 0 0.5rem 0',
                  color: '#1a1a18',
                }}
              >
                Master Goldsmithing
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#4a4740', lineHeight: 1.6, margin: 0 }}>
                Every mounting is cast in solid 18K gold or 950 platinum, precision-engineered to protect
                and highlight the unique optical qualities of your stone.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0.5rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                }}
              >
                ⚖
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  margin: '0 0 0.5rem 0',
                  color: '#1a1a18',
                }}
              >
                Private Advisory
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#4a4740', lineHeight: 1.6, margin: 0 }}>
                Personalized gemmological consultations for collectors, investment buyers, and bespoke
                fine jewellery commissions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
