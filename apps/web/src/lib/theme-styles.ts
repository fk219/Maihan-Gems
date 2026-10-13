/**
 * apps/web/src/lib/theme-styles.ts
 *
 * Authoritative CSS theme specification for Maihan Gems, derived verbatim from
 * Design.md (Swiss Private Banking precision combined with modern Dubai luxury).
 *
 * Tokens match Design.md §2–§7 exactly. Do not invent palettes, radii or fonts.
 */

export const MAIHAN_THEME_CSS = `
:root {
  --warm-white: #FAFAF8;
  --warm-alabaster: #FAFAF8;
  --studio-white: #FFFFFF;
  --navy-deep: #08121E;
  --deep-midnight: #08121E;
  --navy: #0D1B2A;
  --atelier-navy: #0D1B2A;
  --gold: #C9A84C;
  --imperial-gold: #C9A84C;
  --gold-light: #E8C96A;
  --gold-dark: #8B6914;
  --text-primary: #1A1A18;
  --text-secondary: #4A4740;
  --text-muted: #8A867E;
  --hairline-border: rgba(201, 168, 76, 0.15);
  --subtle-divider: rgba(0, 0, 0, 0.06);
  --gem-sapphire: #1E3A8A;
  --gem-sapphire-deep: #0F172A;
  --gem-sapphire-light: #3B82F6;
  --gem-ruby: #991B1B;
  --gem-ruby-deep: #450A0A;
  --gem-ruby-light: #EF4444;
  --gem-emerald: #065F46;
  --gem-emerald-deep: #022C22;
  --gem-emerald-light: #10B981;
  --gem-padparadscha: #EA580C;
  --gem-padparadscha-deep: #7C2D12;
  --gem-padparadscha-light: #FB923C;
  --gem-canary: #D97706;
  --gem-canary-deep: #78350F;
  --gem-canary-light: #FBBF24;
  --gem-paraiba: #0891B2;
  --gem-paraiba-deep: #164E63;
  --gem-paraiba-light: #06B6D4;
  --gold-gradient: linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #8B6914 100%);
  --media-canvas: #F7F7F5;
  --card-border: rgba(201, 168, 76, 0.12);
  --card-border-hover: rgba(201, 168, 76, 0.35);
  --btn-secondary-border: rgba(201, 168, 76, 0.3);
  --gold-separator: rgba(201, 168, 76, 0.5);
  --search-border: rgba(201, 168, 76, 0.25);
  --focus-ring: rgba(201, 168, 76, 0.2);
  --wordmark-divider: rgba(201, 168, 76, 0.4);
  --gold-hover-wash: rgba(201, 168, 76, 0.04);
  --card-split: rgba(0, 0, 0, 0.05);
  --header-canvas: rgba(250, 250, 248, 0.95);
  --color-gold-pale: #E8C96A;
  --color-gold: #C9A84C;
  --color-gold-light: #E8C96A;
  --color-gold-dark: #8B6914;
  --color-navy: #0D1B2A;
  --color-navy-deep: #08121E;
  --color-navy-mid: #0D1B2A;
  --color-off-white: #FAFAF8;
  --radius: 12px;
  --radius-card: 12px;
  --radius-image: 0px;
  --radius-control: 12px;
  --radius-menu: 12px;
  --radius-inner: 8px;
  --font-serif: 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --shadow-rest: 0 4px 20px -4px rgba(0, 0, 0, 0.03);
  --shadow-hover: 0 30px 60px -15px rgba(139, 105, 20, 0.08);
  --shadow-card-hover: 0 24px 48px -12px rgba(139, 105, 20, 0.08);
  --shadow-gold: 0 4px 15px -2px rgba(201, 168, 76, 0.25);
  --shadow-gold-hover: 0 12px 24px -4px rgba(201, 168, 76, 0.35);
  --gold-glow: 0 12px 24px -4px rgba(201, 168, 76, 0.35);
  --ease-luxury: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-luxury: 500ms;
  --duration-hover: 300ms;
  --duration-enter: 1200ms;
  --text-hero: clamp(2.75rem, 5vw, 4.5rem);
  --text-h1: clamp(2.25rem, 4vw, 3rem);
  --text-h2: clamp(1.5rem, 2.5vw, 1.875rem);
  --text-h3: clamp(1.25rem, 1.5vw, 1.375rem);
  --text-eyebrow: 0.6875rem;
  --text-body-lg: 1rem;
  --text-body: 0.9375rem;
  --text-micro: 0.75rem;
  --text-button: 0.6875rem;
  --text-tabular: 0.875rem;
  --tracking-hero: -0.02em;
  --tracking-h1: -0.015em;
  --tracking-h2: -0.01em;
  --tracking-eyebrow: 0.25em;
  --tracking-body: 0.01em;
  --tracking-micro: 0.08em;
  --tracking-button: 0.2em;
  --leading-hero: 1.05;
  --leading-h1: 1.15;
  --leading-h2: 1.2;
  --leading-h3: 1.3;
  --leading-body: 1.8;
  --leading-micro: 1.4;
  --content-max: 80rem;
  --container-pad: 1.5rem;
  --container-pad-lg: 3rem;
  --space-section: clamp(4rem, 8vw, 6rem);
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--warm-white);
  color: var(--text-primary);
  font-family: var(--font-body);
  line-height: 1.8;
  font-size: 15px;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Sleek Gold Scrollbar ── */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(201, 168, 76, 0.3) transparent;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(201, 168, 76, 0.3);
  border-radius: var(--radius);
  transition: background-color 0.2s ease;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 168, 76, 0.6);
}

/* ── Typography & Helpers ── */
.section-eyebrow {
  font-family: var(--font-sans);
  font-size: var(--text-eyebrow);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  color: var(--text-secondary);
  display: block;
  margin-bottom: 0.5rem;
  line-height: 1;
}
.section-eyebrow--dark {
  color: var(--text-secondary);
}

.section-title {
  font-family: var(--font-serif);
  font-weight: 500;
  line-height: var(--leading-h1);
  letter-spacing: var(--tracking-h1);
  font-size: var(--text-h1);
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  text-wrap: balance;
}

.text-gold-gradient {
  background: var(--gold-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.font-mono {
  font-family: var(--font-mono);
  font-feature-settings: "lnum" 1, "tnum" 1;
  font-variant-numeric: tabular-nums lining-nums;
}

/* ── Buttons ── */

.btn-primary {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #8B6914 100%);
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  border: none;
  border-radius: 12px;
  padding: 1rem 2.2rem;
  box-shadow: 0 4px 15px -2px rgba(201, 168, 76, 0.25);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  white-space: nowrap;
}
.btn-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.04);
  box-shadow: 0 12px 24px -4px rgba(201, 168, 76, 0.35);
  color: #FFFFFF;
}

.btn-outline,
.btn-secondary {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.35);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: var(--radius);
  padding: 0.75rem 1.5rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.04);
}
.btn-outline:hover,
.btn-secondary:hover {
  background: rgba(201, 168, 76, 0.06);
  border-color: var(--color-gold);
  transform: translateY(-2px);
  color: var(--text-primary);
  box-shadow: 0 6px 16px -4px rgba(201, 168, 76, 0.2);
}

.btn-outline-dark {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(13, 27, 42, 0.25);
  color: var(--navy);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: var(--radius);
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
  text-decoration: none;
  white-space: nowrap;
}
.btn-outline-dark:hover {
  background: rgba(13, 27, 42, 0.05);
  border-color: var(--color-gold-dark);
  color: var(--color-gold-dark);
  transform: translateY(-2px);
}

/* ── Luxury Cards ── */
.luxury-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  text-decoration: none;
}

.luxury-card--dark {
  background: linear-gradient(165deg, rgba(13, 27, 42, 0.5) 0%, rgba(13, 27, 42, 0.72) 42%, rgba(8, 18, 30, 0.92) 100%);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(201, 168, 76, 0.18);
  color: #ffffff;
  box-shadow: 0 10px 36px -10px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.luxury-card--dark:hover {
  border-color: rgba(201, 168, 76, 0.45);
  transform: translateY(-4px);
  box-shadow: 0 18px 48px -12px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.luxury-card--light {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.16);
  color: var(--text-primary);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.03);
}
.luxury-card--light:hover {
  border-color: rgba(201, 168, 76, 0.45);
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -12px rgba(139, 105, 20, 0.08);
}

/* ── Metric Cards ── */
.metric-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  background: linear-gradient(165deg, rgba(13, 27, 42, 0.4) 0%, rgba(13, 27, 42, 0.65) 50%, rgba(8, 18, 30, 0.85) 100%);
  border: 1px solid rgba(201, 168, 76, 0.2);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.5);
}
.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.8), transparent);
}
.metric-card__value {
  font-family: var(--font-mono);
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.25rem;
  font-feature-settings: "lnum" 1, "tnum" 1;
}
.metric-card__label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

/* ── Header Chrome & Silk & Stone 3-Zone Top Bar Navigation ── */
.site-header {
  background: rgba(250, 250, 248, 0.96);
  border-bottom: 1px solid rgba(201, 168, 76, 0.18);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  width: 100%;
  transition: all 0.3s ease;
}

.site-header__container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

/* Zone 1: Brand Wordmark */
.site-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.site-header__brand:hover {
  opacity: 0.92;
}

.site-header__wordmark {
  font-family: var(--font-serif);
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #1a1a18;
  white-space: nowrap;
  transition: color 0.25s ease;
}

.site-header__brand:hover .site-header__wordmark {
  color: var(--color-gold);
}

.site-header__divider {
  display: inline-block;
  width: 1px;
  height: 0.875rem;
  background-color: rgba(201, 168, 76, 0.45);
}

.site-header__submark {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Zone 2: Navigation Links & MegaMenu */
.site-header__nav-zone {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.mega-menu {
  position: relative;
}

.mega-menu__groups {
  display: flex;
  align-items: center;
  gap: 1.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.mega-menu__group {
  position: relative;
}

.mega-menu__trigger {
  background: transparent;
  border: none;
  color: #4a4740;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 0.625rem 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: color 0.25s ease, transform 0.25s ease;
  white-space: nowrap;
}

.mega-menu__trigger:hover,
.mega-menu__trigger[aria-expanded="true"] {
  color: #1a1a18;
}

.mega-menu__chevron {
  transition: transform 0.25s ease;
  opacity: 0.7;
}

.mega-menu__trigger[aria-expanded="true"] .mega-menu__chevron {
  transform: rotate(180deg);
  opacity: 1;
}

.mega-menu__panel {
  position: absolute;
  top: calc(100% + 0.75rem);
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.22);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  min-width: 320px;
  max-width: 440px;
  max-height: 480px;
  overflow-y: auto;
  box-shadow: 0 30px 60px -15px rgba(139, 105, 20, 0.12), 0 0 0 1px rgba(201, 168, 76, 0.08);
  z-index: 100;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.5rem 1rem;
}

.mega-menu__panel[hidden] {
  display: none !important;
}

.mega-menu__item {
  list-style: none;
}

.mega-menu__link {
  color: #4a4740;
  text-decoration: none;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.375rem 0.5rem;
  border-radius: 6px;
  display: block;
  transition: all 0.2s ease;
}

.mega-menu__link:hover {
  color: #1a1a18;
  background: rgba(201, 168, 76, 0.08);
  padding-left: 0.75rem;
}

/* Zone 3: Direct Utilities & Primary Action */
.site-header__actions {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-shrink: 0;
}

.site-header__utility-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  color: #4a4740;
  text-decoration: none;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.site-header__utility-btn:hover {
  color: #1a1a18;
  background: rgba(201, 168, 76, 0.08);
}

.site-header__icon {
  flex-shrink: 0;
}

.site-header__cta-btn {
  background: linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #8B6914 100%);
  color: #FFFFFF !important;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 4px 15px -2px rgba(201, 168, 76, 0.3);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.site-header__cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px rgba(201, 168, 76, 0.45);
  filter: brightness(1.06);
}

/* ── Footer Chrome ── */
.site-footer {
  background: var(--navy-deep);
  border-top: 1px solid rgba(201, 168, 76, 0.25);
  position: relative;
  color: rgba(255, 255, 255, 0.7);
  padding: 4.5rem 2rem 2.5rem;
}
.site-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.8), transparent);
}
.site-footer__container {
  max-width: 1280px;
  margin: 0 auto;
}
.site-footer__grid {
  display: grid;
  grid-template-columns: 2fr repeat(4, 1fr);
  gap: 3rem;
  margin-bottom: 3.5rem;
}
.site-footer__brand-title {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-gold);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.06em;
}
.site-footer__tagline {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.65);
  margin: 0 0 1.25rem 0;
  line-height: 1.6;
}
.site-footer__cities {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-gold-pale);
  margin-bottom: 1rem;
}
.site-footer__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius);
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.25);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-gold-light);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.site-footer__column-title {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #ffffff;
  margin: 0 0 1.25rem 0;
}
.site-footer__links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}
.site-footer__link {
  color: rgba(255, 255, 255, 0.65);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}
.site-footer__link:hover {
  color: var(--color-gold);
  padding-left: 0.25rem;
}
.site-footer__bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}
.site-footer__disclosure {
  font-size: 0.75rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.45);
}
.site-footer__legal-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.site-footer__legal-links {
  display: flex;
  gap: 1.5rem;
}
.site-footer__legal-link {
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;
}
.site-footer__legal-link:hover {
  color: var(--color-gold);
}

/* ── Storefront Sections & Layouts ── */
.storefront-section {
  padding: 5rem 2rem;
  position: relative;
}
.storefront-section__container {
  max-width: 1280px;
  margin: 0 auto;
}
.storefront-section__header {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 3.5rem auto;
}
.storefront-section__subtitle {
  font-size: 1.0625rem;
  line-height: 1.7;
  margin: 0;
}

/* ── Section Rhythm Backgrounds ── */
.bg-obsidian-deep {
  background-color: var(--navy-deep);
  color: #ffffff;
}
.bg-primary-navy {
  background-color: var(--navy);
  color: #ffffff;
}
.bg-midnight-obsidian {
  background-color: var(--navy-deep);
  color: #ffffff;
}
.bg-crisp-white,
.bg-studio-white {
  background-color: #ffffff;
  color: var(--text-primary);
}
.bg-ivory-off-white,
.bg-warm-alabaster {
  background-color: #fafaf8;
  color: var(--text-primary);
}
.bg-gold-ticker {
  background: var(--gold-gradient);
  color: var(--navy-deep);
  box-shadow: 0 4px 20px rgba(201, 168, 76, 0.35);
}

/* ── Infinite Luxury Marquee Ticker ── */
@keyframes marqueeGlide {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-50%, 0, 0);
  }
}

.marquee-container {
  overflow: hidden;
  position: relative;
  width: 100%;
  background: var(--gold-gradient);
  color: var(--navy-deep);
  box-shadow: 0 4px 20px rgba(201, 168, 76, 0.25);
  padding: 0.9rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
  border-bottom: 1px solid rgba(139, 105, 20, 0.2);
}

.marquee-track {
  display: flex;
  width: max-content;
  will-change: transform;
  animation: marqueeGlide 35s linear infinite;
}

.marquee-track:hover {
  animation-play-state: paused;
}

.marquee-content {
  display: flex;
  align-items: center;
  gap: 2.5rem;
  padding-right: 2.5rem;
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--navy-deep);
}

.marquee-dot {
  color: var(--navy-deep);
  opacity: 0.6;
}

/* ── Responsive Grids ── */
.grid-cards-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.grid-cards-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}
.grid-cards-6 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
}

@media (max-width: 1024px) {
  .site-footer__grid {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .grid-cards-4,
  .grid-cards-3 {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-cards-6 {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .site-header {
    padding: 0.75rem 1rem;
  }
  .site-footer {
    padding: 3rem 1rem 1.5rem;
  }
  .site-footer__grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .storefront-section {
    padding: 3.5rem 1rem;
  }
  .grid-cards-4,
  .grid-cards-3,
  .grid-cards-6 {
    grid-template-columns: 1fr;
  }
  .site-footer__legal-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* ── Search Route & Filter Layout ── */
.search-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 80vh;
}
.search-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2.5rem;
  align-items: start;
  margin-top: 1.5rem;
}
.filter-panel {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.18);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 6rem;
}
.filter-group {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 1rem 0;
}
.filter-group:last-child {
  border-bottom: none;
}
.filter-group__title {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}
.filter-group__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 220px;
  overflow-y: auto;
}
.filter-item-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 0.35rem 0.6rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}
.filter-item-link:hover {
  color: var(--text-primary);
  background: rgba(201, 168, 76, 0.08);
}
.filter-item-link--selected {
  color: var(--gold-dark);
  font-weight: 600;
  background: rgba(201, 168, 76, 0.12);
}
.filter-item__count {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}
.hero-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 3.5rem;
  align-items: center;
}

@media (max-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}

.hero-showcase-card {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: var(--radius);
  padding: 1.75rem;
  box-shadow: 0 10px 40px -10px rgba(139, 105, 20, 0.1), 0 0 0 1px rgba(201, 168, 76, 0.06);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
}

.hero-showcase-card:hover {
  border-color: rgba(201, 168, 76, 0.45);
  box-shadow: 0 24px 60px -15px rgba(139, 105, 20, 0.16);
  transform: translateY(-4px);
}

.hero-showcase-image {
  position: relative;
  aspect-ratio: 4/3;
  background: radial-gradient(circle at 50% 40%, rgba(201, 168, 76, 0.08) 0%, #FAFAF8 70%);
  border-radius: calc(var(--radius) - 4px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}

.hero-showcase-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-showcase-card:hover .hero-showcase-image img {
  transform: scale(1.05);
}

.search-pills-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.search-pill-link {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 12px;
  padding: 0.3rem 0.75rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.search-pill-link:hover {
  color: var(--gold-dark);
  border-color: var(--gold);
  background: rgba(201, 168, 76, 0.08);
}

.search-bar-form {
  display: flex;
  gap: 0.75rem;
  max-width: 640px;
  margin: 1.5rem 0;
}
.search-input {
  flex: 1;
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: var(--radius);
  padding: 0.75rem 1.25rem;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  outline: none;
  box-shadow: 0 4px 15px -2px rgba(201, 168, 76, 0.06);
  transition: all 0.2s ease;
}
.search-input:focus {
  border-color: var(--color-gold);
  box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.25);
}
.search-input::placeholder {
  color: var(--text-muted);
}
.active-chips-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
}
.active-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 12px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--gold-dark);
  text-decoration: none;
  transition: all 0.2s ease;
}
.active-chip:hover {
  background: rgba(201, 168, 76, 0.18);
  border-color: var(--color-gold);
}
.search-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.03);
  margin-bottom: 1.5rem;
}
.search-meta-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
.search-meta-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.5rem;
  list-style: none;
  margin: 1.5rem 0 3rem 0;
  padding: 0;
}

@media (max-width: 1024px) {
  .search-layout {
    grid-template-columns: 1fr;
  }
  .filter-panel {
    position: static;
  }
}
@media (max-width: 640px) {
  .search-page {
    padding: 1rem;
  }
  .search-bar-form {
    flex-direction: column;
  }
}

/* ── Silk & Stone Design System Classes ── */
.eyebrow {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: var(--text-secondary);
  line-height: 1;
  display: block;
}

.gold-gradient-text {
  background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 50%, var(--gold-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.premium-card {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.12);
  border-radius: var(--radius);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.premium-card:hover {
  border-color: rgba(201, 168, 76, 0.35);
  box-shadow: 0 24px 48px -12px rgba(139, 105, 20, 0.08);
  transform: translateY(-3px);
}

.unboxed-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 12px;
  color: var(--text-secondary);
}

.unboxed-meta__separator {
  color: rgba(201, 168, 76, 0.5);
  user-select: none;
}

/* ── Card & Product Card (Silk & Stone) ── */
.card {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.12);
  border-radius: var(--radius);
  padding: 1.5rem;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.card:hover {
  border-color: rgba(201, 168, 76, 0.35);
  box-shadow: 0 24px 48px -12px rgba(139, 105, 20, 0.08);
  transform: translateY(-3px);
}

.card__link {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold);
  text-decoration: none;
  margin-top: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: color 0.2s ease;
}

.card__link:hover {
  color: var(--gold-dark);
}

.product-card__title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  margin: 0 0 0.5rem 0;
}

.product-card__title a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.product-card__title a:hover {
  color: var(--gold);
}

.product-card__subtitle {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.product-card__status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.product-card__vault-tag {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
}

.product-card__meta {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin: 0 0 1rem 0;
}

.product-card__price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  margin-top: auto;
}

.product-card__price {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.product-card__inquire {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s ease;
}

.card:hover .product-card__inquire {
  color: var(--gold-dark);
}

/* ── Silk & Stone Design Your Own (DYO) Configurator ── */
.dyo-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
}

.dyo-header {
  margin-bottom: 2.5rem;
  text-align: center;
}

.dyo-step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.dyo-step-btn {
  background: transparent;
  border: none;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-bottom: 2px solid transparent;
  transition: all 0.25s ease;
}

.dyo-step-btn--active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

.dyo-step-btn--completed {
  color: var(--text-primary);
}

.dyo-panel {
  background: #FFFFFF;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.03);
  margin-bottom: 2.5rem;
}

.dyo-grid-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.dyo-option-card {
  background: #FAFAF8;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 1.25rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.dyo-option-card:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -6px rgba(139, 105, 20, 0.08);
}

.dyo-option-card--selected {
  background: #FFFFFF;
  border: 1.5px solid var(--gold);
  box-shadow: 0 0 0 1px var(--gold), 0 8px 20px -4px rgba(201, 168, 76, 0.15);
}

.dyo-option-title {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
}

.dyo-option-subtitle {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin: 0 0 0.75rem 0;
}

.dyo-option-price {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.dyo-banner-compatible {
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-primary);
}

.dyo-banner-incompatible {
  background: rgba(153, 27, 27, 0.05);
  border: 1px solid rgba(153, 27, 27, 0.25);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #991b1b;
}

.dyo-summary-card {
  background: #FAFAF8;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 2rem;
  margin-top: 2rem;
}

.dyo-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.dyo-summary-row--total {
  border-bottom: none;
  padding-top: 1.25rem;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.dyo-summary-row--total span:last-child {
  font-family: var(--font-mono);
  font-size: 1.6rem;
  color: var(--gold-dark);
}

/* ── Cart Styles ── */
.cart-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
}

.cart-items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
}

.cart-items-table th {
  text-align: left;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(201, 168, 76, 0.2);
}

.cart-items-table td {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  vertical-align: middle;
}

/* ── Silk & Stone Core Page Architecture ── */
.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 6rem;
  min-height: 70vh;
}

.page h1 {
  font-family: var(--font-serif);
  font-size: clamp(2.25rem, 4vw, 3.25rem);
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.15;
  color: var(--text-primary);
  margin: 0.75rem 0 1rem 0;
  text-wrap: balance;
}

.page-eyebrow {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: var(--gold-dark);
  display: block;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-secondary);
  max-width: 720px;
  line-height: 1.7;
  margin-bottom: 2rem;
}

.result-count {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  margin-bottom: 2rem;
  display: block;
}

/* ── Responsive Catalog Grids (Zero-Pill Discipline) ── */
.product-grid,
.settings-grid,
.varieties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  list-style: none;
  padding: 0;
  margin: 0 0 3rem 0;
}

.settings-card {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.04);
}

.settings-card:hover {
  border-color: rgba(201, 168, 76, 0.45);
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -12px rgba(139, 105, 20, 0.1);
}

.settings-card__title {
  font-family: var(--font-serif);
  font-size: 1.375rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.25;
}

.settings-card__meta {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0 0 1.25rem 0;
  line-height: 1.5;
}

.settings-card__action {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: color 0.2s ease;
}

.settings-card__action:hover {
  color: var(--gold-dark);
}

/* ── Variety Hub & Mineral Cards ── */
.variety-card {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.04);
}

.variety-card:hover {
  border-color: rgba(201, 168, 76, 0.45);
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -12px rgba(139, 105, 20, 0.1);
}

.variety-card__name {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 0.35rem 0;
}

.variety-card__species {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold-dark);
  margin-bottom: 1.25rem;
}

.variety-card__links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.variety-card__sublink {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.variety-card__sublink:hover {
  color: var(--gold);
}

/* ── Product Detail Layout (Two-Column Silk & Stone Atelier) ── */
.product-detail__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin-top: 2rem;
}

@media (min-width: 1024px) {
  .product-detail__layout {
    grid-template-columns: 1.1fr 1fr;
    gap: 4rem;
  }
}

.product-detail__summary {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.04);
}

.product-detail__summary h1 {
  color: var(--text-primary);
  margin-top: 0;
}

.product-detail__subtitle {
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.product-detail__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.product-detail__specs {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 2.5rem;
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.04);
}

.product-detail__specs h2,
.product-detail__provenance h2,
.product-detail__description h2 {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
}

.product-detail__provenance {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 2.5rem;
  margin-top: 2rem;
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.04);
}

.provenance-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.875rem 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  margin: 0;
}

.provenance-list dt {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 11px;
  color: var(--text-muted);
}

.provenance-list dd {
  color: var(--text-primary);
  font-family: var(--font-mono);
  margin: 0;
  word-break: break-all;
}

/* ── Luxury Funnel & Aux Pages ── */
.checkout-shell,
.vault-shell,
.concierge-shell,
.education-shell {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 3rem 2.5rem;
  box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
  margin-top: 1.5rem;
}

.checkout-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(201, 168, 76, 0.2);
  gap: 1rem;
}

.checkout-step {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkout-step--active {
  color: var(--gold-dark);
}

.checkout-step--completed {
  color: var(--text-primary);
}

.showroom-grid,
.education-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.showroom-card,
.education-card {
  background: #ffffff;
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: var(--radius);
  padding: 2rem;
  color: var(--text-primary);
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.showroom-card:hover,
.education-card:hover {
  border-color: rgba(201, 168, 76, 0.4);
  transform: translateY(-3px);
  box-shadow: 0 16px 36px -8px rgba(139, 105, 20, 0.08);
}

/* ── AI Concierge Floating Button & Drawer ── */
.ai-concierge-trigger {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 999;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, var(--navy-deep) 0%, var(--navy) 100%);
  color: #c9a84c;
  border: 1px solid rgba(201, 168, 76, 0.4);
  border-radius: var(--radius);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(201, 168, 76, 0.2);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-concierge-trigger:hover {
  border-color: #e8c96a;
  transform: translateY(-2px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4), 0 0 25px rgba(201, 168, 76, 0.4);
  color: var(--gold-light);
}

.ai-concierge-trigger__icon {
  color: #c9a84c;
  font-size: 1rem;
}

.ai-concierge-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(8, 18, 30, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  animation: fadeIn 0.25s ease-out;
}

.ai-concierge-drawer {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: var(--navy);
  border-left: 1px solid rgba(201, 168, 76, 0.25);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ai-concierge-drawer__header {
  padding: 1.5rem 1.75rem;
  border-bottom: 1px solid rgba(201, 168, 76, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--navy-deep);
}

.ai-concierge-drawer__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ai-concierge-drawer__sparkle {
  color: #c9a84c;
  font-size: 1.25rem;
}

.ai-concierge-drawer__title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: #fafaf8;
  margin: 0;
}

.ai-concierge-drawer__sub {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: #8a867e;
  margin: 0.15rem 0 0 0;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ai-concierge-drawer__close {
  background: none;
  border: none;
  color: #8a867e;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.ai-concierge-drawer__close:hover {
  color: #c9a84c;
}

.ai-concierge-drawer__messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.ai-message {
  display: flex;
  flex-direction: column;
  max-width: 90%;
}

.ai-message--user {
  align-self: flex-end;
}

.ai-message--assistant {
  align-self: flex-start;
}

.ai-message__bubble {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  font-size: 0.875rem;
  line-height: 1.6;
}

.ai-message--user .ai-message__bubble {
  background: var(--atelier-navy);
  color: #fafaf8;
  border: 1px solid rgba(201, 168, 76, 0.2);
}

.ai-message--assistant .ai-message__bubble {
  background: rgba(13, 27, 42, 0.9);
  color: #fafaf8;
  border: 1px solid rgba(201, 168, 76, 0.15);
}

.ai-message__text {
  margin: 0;
}

.ai-message__cursor {
  display: inline-block;
  color: #c9a84c;
  animation: pulse 1s infinite;
  margin-left: 0.25rem;
}

.ai-message__citations {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(201, 168, 76, 0.15);
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ai-message__citation-title {
  color: #8a867e;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ai-message__citation-badge {
  color: #c9a84c;
}

.ai-message__suggestions {
  margin-top: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ai-message__suggestion-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background: rgba(8, 18, 30, 0.8);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 6px;
  color: #c9a84c;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  text-decoration: none;
  transition: all 0.2s;
}

.ai-message__suggestion-chip:hover {
  background: #c9a84c;
  color: var(--navy-deep);
}

.ai-concierge-drawer__form {
  padding: 1.25rem 1.5rem;
  background: var(--navy-deep);
  border-top: 1px solid rgba(201, 168, 76, 0.2);
}

.ai-concierge-drawer__input-wrap {
  display: flex;
  gap: 0.75rem;
}

.ai-concierge-drawer__input {
  flex: 1;
  background: var(--atelier-navy);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 8px;
  color: #fafaf8;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-family: var(--font-sans);
  outline: none;
}

.ai-concierge-drawer__input:focus {
  border-color: #c9a84c;
}

.ai-concierge-drawer__submit {
  background: #c9a84c;
  color: var(--navy-deep);
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s;
}

.ai-concierge-drawer__submit:hover:not(:disabled) {
  background: #e8c96a;
}

.ai-concierge-drawer__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-concierge-drawer__disclaimer {
  margin: 0.625rem 0 0 0;
  font-size: 0.6875rem;
  color: #8a867e;
  text-align: center;
  line-height: 1.4;
}
`;


