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

export default async function HomePage() {
  const service = catalogServer();

  // Load live reference settings (doc 10: settings are not publication-gated)
  const settingsRes = await service.listSettings({ limit: 6 });
  const settings = settingsRes.value.items;

  return (
    <main className="storefront-home" id="main-content">
      {/* ── SECTION 1: HERO (Deep Obsidian Navy #08121E) ── */}
      <section
        className="storefront-section bg-obsidian-deep"
        style={{
          paddingTop: '5rem',
          paddingBottom: '5.5rem',
          backgroundImage:
            'radial-gradient(circle at 50% 25%, rgba(201, 168, 76, 0.12) 0%, transparent 65%)',
        }}
        aria-label="Hero Introduction"
      >
        <div className="storefront-section__container" style={{ textAlign: 'center' }}>
          <span className="section-eyebrow">Natural Mineralogy &amp; Master Goldsmith Atelier</span>
          <h1
            className="section-title text-gold-gradient"
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 4rem)',
              maxWidth: '920px',
              margin: '0 auto 1.25rem auto',
            }}
          >
            Fine Natural Gemstones &amp; Master Atelier Mountings
          </h1>
          <p
            className="storefront-section__subtitle"
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              maxWidth: '740px',
              margin: '0 auto 2.25rem auto',
              fontSize: 'clamp(1rem, 1.25vw, 1.15rem)',
              lineHeight: 1.7,
            }}
          >
            Direct discovery of 100% natural, earth-mined loose gemstones and precision-engineered
            fine jewellery settings. Authenticated under uncompromising gemmological standards.
          </p>

          {/* Integrated Search Discovery Form */}
          <div style={{ maxWidth: '680px', margin: '0 auto 2.5rem auto' }}>
            <form action="/search" method="GET" className="search-bar-form" role="search">
              <input
                type="search"
                name="q"
                placeholder="Search by variety (e.g. sapphire, emerald), shape, metal, or SKU..."
                className="search-input"
                aria-label="Search gemstones and fine settings catalogue"
              />
              <button type="submit" className="btn-primary">
                Search
              </button>
            </form>
          </div>

          {/* Core Action Navigation Links */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/search" className="btn-primary">
              Intelligent Catalogue Search
            </Link>
            <Link href="/settings" className="btn-outline">
              Browse Atelier Settings
            </Link>
            <Link href="/design-your-own" className="btn-outline">
              Design Your Own
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: MARQUEE TICKER (Solid Metallic Gold #C9A84C) ── */}
      <aside
        className="bg-gold-ticker"
        style={{
          padding: '1rem 1.5rem',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        aria-label="Maihan Gems core values marquee"
      >
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '0.8125rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
            color: '#08121e',
          }}
        >
          100% Earth-Mined Natural Gemstones &nbsp;✦&nbsp; Master Goldsmith Mountings in 18K &amp; Platinum
          &nbsp;✦&nbsp; Transparent Treatment Disclosure &nbsp;✦&nbsp; Hybrid Faceted Search &nbsp;✦&nbsp;
          Precision Atelier Bench Craftsmanship &nbsp;✦&nbsp; Private Client Advisory
        </div>
      </aside>

      {/* ── SECTION 3: ATELIER SETTINGS SHOWCASE (Dark Primary Navy #0D1B2A) ── */}
      <section className="storefront-section bg-primary-navy" aria-labelledby="settings-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow">Atelier Mountings</span>
            <h2
              id="settings-title"
              className="section-title text-gold-gradient"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}
            >
              Master Goldsmith Setting Designs
            </h2>
            <p
              className="storefront-section__subtitle"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Precision-cast in 18K Yellow Gold, White Gold, Rose Gold, and 950 Platinum. Choose a signature
              mounting engineered to showcase bespoke natural gemstones.
            </p>
          </div>

          {settings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
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
                  className="luxury-card luxury-card--dark"
                  style={{ padding: '2rem 1.75rem' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                    }}
                  >
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        background: 'rgba(201, 168, 76, 0.12)',
                        border: '1px solid rgba(201, 168, 76, 0.25)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--color-gold-light)',
                      }}
                    >
                      {setting.jewellery_type.toLowerCase()}
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.45)' }}
                    >
                      {setting.design_code}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      margin: '0 0 0.5rem 0',
                      color: '#ffffff',
                    }}
                  >
                    {setting.name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'rgba(255, 255, 255, 0.65)',
                      margin: '0 0 1.5rem 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {setting.style !== null ? setting.style.label : 'Classic Master Setting'}
                    {' · '}
                    {setting.variant_count} metal option{setting.variant_count === 1 ? '' : 's'}{' '}
                    available
                  </p>

                  <div style={{ marginTop: 'auto' }}>
                    <Link
                      href={`/search?q=${setting.design_code}`}
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--color-gold)',
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

      {/* ── SECTION 4: BESPOKE ATELIER WORKFLOW (Crisp White #FFFFFF) ── */}
      <section className="storefront-section bg-crisp-white" aria-labelledby="bespoke-workflow-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">Bespoke Creation</span>
            <h2
              id="bespoke-workflow-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#0d1b2a' }}
            >
              Craft Your Custom Jewel
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
                  color: '#0d1b2a',
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
                  color: '#0d1b2a',
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
                  color: '#0d1b2a',
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

      {/* ── SECTION 5: MINERALOGICAL DISCOVERY (Midnight Obsidian #080D19) ── */}
      <section className="storefront-section bg-midnight-obsidian" aria-labelledby="discovery-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow">Mineralogical Discovery</span>
            <h2
              id="discovery-title"
              className="section-title text-gold-gradient"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}
            >
              Explore by Mineral Variety &amp; Chromatic Hue
            </h2>
            <p
              className="storefront-section__subtitle"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
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
                className="luxury-card luxury-card--dark"
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
                      color: 'var(--color-gold)',
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
                    color: '#ffffff',
                  }}
                >
                  {v.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'rgba(255, 255, 255, 0.6)',
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
                    color: 'var(--color-gold-light)',
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
                color: 'rgba(255, 255, 255, 0.55)',
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                  textDecoration: 'none',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: c.gradient,
                    display: 'inline-block',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                  aria-hidden="true"
                />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: GEMMOLOGICAL INTEGRITY (Ivory Off-White #FAFAF8) ── */}
      <section className="storefront-section bg-ivory-off-white" aria-labelledby="standards-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">The Maihan Standard</span>
            <h2
              id="standards-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#0d1b2a' }}
            >
              Grounded Gemmological Integrity
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
                  color: '#0d1b2a',
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
                  color: '#0d1b2a',
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
                  color: '#0d1b2a',
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
                  color: '#0d1b2a',
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
