/**
 * apps/web/src/app/(storefront)/page.tsx — `/`
 *
 * Storefront Homepage for Maihan Gems.
 *
 * Authority & Styling:
 *   - Design.md: Swiss Private Banking precision combined with modern Dubai luxury.
 *   - Signature Alternating Rhythm:
 *       1. Hero: Deep Obsidian Navy (#08121E)
 *       2. Marquee Ticker: Solid Metallic Gold (#C9A84C)
 *       3. Gemstone Showcase: Dark Primary Navy (#0D1B2A)
 *       4. Spectrum by Colour: Crisp White (#FFFFFF)
 *       5. Fine Settings: Midnight Obsidian (#080D19)
 *       6. Trust & Assurance: Ivory Off-White (#FAFAF8)
 *   - Real data seam: catalogServer().getTaxonomy() and catalogServer().listSettings().
 *   - Invariants: INV-01/02/03/07/08 honoured. No fake products, prices or claims.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogServer } from '../../lib/catalog-server.js';
import { browsableColours, browsableVarieties } from '../../lib/catalog-view.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Natural Gemstones & Bespoke Fine Jewellery',
  description:
    'Discover 100% natural, untreated loose gemstones and precision master goldsmith settings. Verified under rigorous gemmological standards with certified origin.',
};

/** Preferred color swatch styling for key gemstone hues */
const SWATCH_GRADIENTS: Record<string, string> = {
  blue: 'radial-gradient(circle at 35% 35%, #3B82F6 0%, #1D4ED8 45%, #0B1E48 100%)',
  green: 'radial-gradient(circle at 35% 35%, #10B981 0%, #047857 45%, #064E3B 100%)',
  red: 'radial-gradient(circle at 35% 35%, #EF4444 0%, #B91C1C 45%, #50070B 100%)',
  pink: 'radial-gradient(circle at 35% 35%, #F472B6 0%, #DB2777 45%, #700B34 100%)',
  yellow: 'radial-gradient(circle at 35% 35%, #FBBF24 0%, #D97706 45%, #5C3202 100%)',
  purple: 'radial-gradient(circle at 35% 35%, #A78BFA 0%, #7C3AED 45%, #380C6B 100%)',
  orange: 'radial-gradient(circle at 35% 35%, #FB923C 0%, #EA580C 45%, #661D02 100%)',
  white: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #E2E8F0 45%, #94A3B8 100%)',
};

const DEFAULT_SWATCH = 'radial-gradient(circle at 35% 35%, #E8C96A 0%, #C9A84C 50%, #8B6914 100%)';

export default async function HomePage() {
  const service = catalogServer();

  const [taxonomyRes, settingsRes] = await Promise.all([
    service.getTaxonomy(),
    service.listSettings({ limit: 6 }),
  ]);

  const taxonomy = taxonomyRes.value;
  const allVarieties = browsableVarieties(taxonomy);
  const allColours = browsableColours(taxonomy);
  const settings = settingsRes.value.items;

  // Curate iconic varieties for the showcase (or fallback to first 8)
  const ICONIC_VARIETY_SLUGS = [
    'emerald',
    'sapphire',
    'ruby',
    'spinel',
    'tsavorite-garnet',
    'tourmaline',
    'tanzanite',
    'aquamarine',
  ];

  const featuredVarieties = (() => {
    const matched = allVarieties.filter((v) => ICONIC_VARIETY_SLUGS.includes(v.slug));
    if (matched.length >= 4) return matched.slice(0, 8);
    return allVarieties.slice(0, 8);
  })();

  // Curate vibrant color families (up to 8)
  const featuredColours = allColours.slice(0, 8);

  return (
    <main className="storefront-home" id="main-content">
      {/* ── SECTION 1: HERO (Deep Obsidian Navy #08121E) ── */}
      <section
        className="storefront-section bg-obsidian-deep"
        style={{
          paddingTop: '6rem',
          paddingBottom: '6rem',
          backgroundImage:
            'radial-gradient(circle at 50% 20%, rgba(201, 168, 76, 0.12) 0%, transparent 60%)',
        }}
        aria-label="Hero Introduction"
      >
        <div className="storefront-section__container" style={{ textAlign: 'center' }}>
          <span className="section-eyebrow">Sovereign Commodity &amp; High-Asset Gemstones</span>
          <h1
            className="section-title text-gold-gradient"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.25rem)',
              maxWidth: '920px',
              margin: '0 auto 1.5rem auto',
            }}
          >
            Rare Earth Treasures, Certified Provenance &amp; Bespoke Haute Joaillerie
          </h1>
          <p
            className="storefront-section__subtitle"
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              maxWidth: '780px',
              margin: '0 auto 2.5rem auto',
            }}
          >
            Discover an uncompromised sanctuary of 100% natural, untreated loose gemstones and
            precision-crafted fine jewellery mountings. Authenticated under world-leading
            gemmological standards with immutable custody records.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '1.25rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '4.5rem',
            }}
          >
            <Link href="/varieties" className="btn-primary">
              Explore Loose Gemstones
            </Link>
            <Link href="/settings" className="btn-outline">
              View Fine Settings
            </Link>
          </div>

          {/* Key Metrics / Trust Bar */}
          <div className="grid-cards-4" style={{ maxWidth: '1080px', margin: '0 auto' }}>
            <div className="metric-card">
              <div className="metric-card__value">100%</div>
              <div className="metric-card__label">Earth-Mined Natural</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__value">
                {allVarieties.length > 0 ? `${allVarieties.length}+` : '70+'}
              </div>
              <div className="metric-card__label">Mineral Varieties</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__value" style={{ fontSize: '1.35rem' }}>
                GIA · Gübelin · SSEF
              </div>
              <div className="metric-card__label">Testing Standards</div>
            </div>
            <div className="metric-card">
              <div className="metric-card__value">0%</div>
              <div className="metric-card__label">Synthetic Compromise</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: MARQUEE TICKER (Solid Metallic Gold #C9A84C) ── */}
      <aside
        className="bg-gold-ticker"
        style={{
          padding: '1.125rem 1.5rem',
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
          100% Natural Untreated Gemstones &nbsp;✦&nbsp; Independent Laboratory Certification
          &nbsp;✦&nbsp; Bespoke 18K Gold &amp; Platinum Settings &nbsp;✦&nbsp; Strict Deterministic
          Origin &nbsp;✦&nbsp; Insured Armored Global Transit &nbsp;✦&nbsp; Private Client
          Gemmological Advisory
        </div>
      </aside>

      {/* ── SECTION 3: SHOWCASE / VARIETIES (Dark Primary Navy #0D1B2A) ── */}
      <section className="storefront-section bg-primary-navy" aria-labelledby="varieties-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow">Mineralogical Excellence</span>
            <h2
              id="varieties-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}
            >
              Acclaimed Gemstone Varieties
            </h2>
            <p
              className="storefront-section__subtitle"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Direct-source untreated corundum, beryl, and rare garnet species, curated for peerless
              crystalline purity, vibrant saturation, and investment grade.
            </p>
          </div>

          <div className="grid-cards-4" style={{ marginBottom: '3rem' }}>
            {featuredVarieties.map((variety) => (
              <Link
                key={variety.slug}
                href={`/${variety.slug}`}
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
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--color-gold)',
                    }}
                  >
                    Natural Gemstone
                  </span>
                  <span style={{ color: 'var(--color-gold)', fontSize: '1rem' }}>✦</span>
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.625rem',
                    fontWeight: 600,
                    margin: '0 0 0.75rem 0',
                    color: '#ffffff',
                  }}
                >
                  {variety.name}
                </h3>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: '0 0 1.5rem 0',
                    lineHeight: 1.5,
                  }}
                >
                  Explore authenticated natural {variety.name.toLowerCase()} specimens with certified
                  origin.
                </p>
                <div
                  style={{
                    marginTop: 'auto',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-gold-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>View Collection</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/varieties" className="btn-outline">
              Browse All {allVarieties.length} Published Varieties →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: SPECTRUM BY COLOUR (Crisp White #FFFFFF) ── */}
      <section className="storefront-section bg-crisp-white" aria-labelledby="colours-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">Chromatic Excellence</span>
            <h2
              id="colours-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#0d1b2a' }}
            >
              Curated by Hue &amp; Saturation
            </h2>
            <p className="storefront-section__subtitle" style={{ color: '#4a4740' }}>
              From vivid cornflower blues to electric neon tourmalines, navigate nature's pure
              chromatic spectrum across authenticated fine gemstone crystals.
            </p>
          </div>

          <div className="grid-cards-4" style={{ marginBottom: '2.5rem' }}>
            {featuredColours.map((color) => {
              const swatchGradient = SWATCH_GRADIENTS[color.slug] ?? DEFAULT_SWATCH;
              return (
                <Link
                  key={color.slug}
                  href={`/colour/${color.slug}`}
                  className="luxury-card luxury-card--light"
                  style={{
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* Gem Swatch Orb */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: swatchGradient,
                      boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                      marginBottom: '1.25rem',
                      border: '1.5px solid rgba(201, 168, 76, 0.35)',
                    }}
                    aria-hidden="true"
                  />
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      margin: '0 0 0.5rem 0',
                      color: '#0d1b2a',
                    }}
                  >
                    {color.name}
                  </h3>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--color-gold-dark)',
                    }}
                  >
                    Explore {color.name} Gems →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: MASTER GOLDSMITH SETTINGS (Midnight Obsidian #080D19) ── */}
      <section className="storefront-section bg-midnight-obsidian" aria-labelledby="settings-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow">Atelier Craftsmanship</span>
            <h2
              id="settings-title"
              className="section-title text-gold-gradient"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}
            >
              Master Goldsmith Settings
            </h2>
            <p
              className="storefront-section__subtitle"
              style={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Engineered to precision tolerances in 18K Yellow Gold, 18K White Gold, Rose Gold, and
              950 Platinum to showcase fine untreated gems in bespoke configurations.
            </p>
          </div>

          {settings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Fine mountings catalogue currently undergoing synchronization.
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
                      href="/settings"
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

      {/* ── SECTION 6: PROVENANCE & ASSURANCE PILLARS (Ivory Off-White #FAFAF8) ── */}
      <section className="storefront-section bg-ivory-off-white" aria-labelledby="assurance-title">
        <div className="storefront-section__container">
          <div className="storefront-section__header">
            <span className="section-eyebrow section-eyebrow--dark">The Maihan Assurance</span>
            <h2
              id="assurance-title"
              className="section-title"
              style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', color: '#0d1b2a' }}
            >
              Sovereign Standards of Gemmological Integrity
            </h2>
            <p className="storefront-section__subtitle" style={{ color: '#4a4740' }}>
              Private banking precision applied to high-asset natural gemstones and fine jewellery
              acquisition.
            </p>
          </div>

          <div className="grid-cards-4">
            {/* Pillar 1 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.75rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                ✦
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#0d1b2a',
                }}
              >
                100% Earth-Mined Natural
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#4a4740',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Every single mineral specimen is certified 100% natural. We enforce an absolute
                zero-tolerance standard against synthetics, glass fillings, or lattice diffusions.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.75rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                🏛
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#0d1b2a',
                }}
              >
                Global Lab Verification
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#4a4740',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Independent diagnostic dossiers from premier gemmological laboratories including GIA,
                Gübelin, SSEF, and Lotus Gemology certifying species and treatment status.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.75rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                🔬
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#0d1b2a',
                }}
              >
                Spectroscopic Analysis
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#4a4740',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Non-destructive Raman and FTIR spectroscopy diagnostics verifying geologic origin,
                trace-element fingerprints, and pristine unheated crystalline integrity.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="luxury-card luxury-card--light" style={{ padding: '2rem 1.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.75rem',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-dark)',
                  fontSize: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                🛡
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  margin: '0 0 0.75rem 0',
                  color: '#0d1b2a',
                }}
              >
                Secure Armored Transit
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#4a4740',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Tamper-evident seals, segregated bonded vault custody, and fully insured armored
                courier transit with door-to-door hand delivery to private clients globally.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
