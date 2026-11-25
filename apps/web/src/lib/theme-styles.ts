/**
 * apps/web/src/lib/theme-styles.ts
 *
 * Authoritative CSS theme specification for Maihan Gems, derived verbatim from
 * Design.md (Swiss Private Banking precision combined with modern Dubai luxury).
 *
 * Rules honoured:
 *   - Obsidian Navy palette: #08121E (deep), #0D1B2A (primary), #132234 (mid)
 *   - Master Gold palette: #C9A84C (gold), #E8C96A (light), #8B6914 (dark), #F5E8C0 (pale)
 *   - Alternating background cadence: Obsidian -> Gold -> Navy -> White -> Midnight -> Ivory -> Deep
 *   - Hairline gold precision borders: 1px rgba(201, 168, 76, 0.20) with top accent
 *   - Monospace tabular numerals: tabular-nums lining-nums font-mono
 *   - Shimmer animation on primary action buttons
 *   - Zero external framework dependency: pure CSS variables and classes
 */
import { LIGHT_TOKENS_CSS } from './light-tokens.js';

export const MAIHAN_THEME_CSS = `
:root {
  --color-gold: #c9a84c;
  --color-gold-light: #e8c96a;
  --color-gold-dark: #8b6914;
  --color-gold-pale: #f5e8c0;
  --color-gold-ultra: #fbf5e6;

  --color-navy: #0d1b2a;
  --color-navy-mid: #132234;
  --color-navy-light: #1c2e3f;
  --color-navy-deep: #08121e;
  --color-navy-midnight: #080d19;

  --color-off-white: #fafaf8;
  --color-mid-grey: #e8e4dc;
  --color-champagne-border: #e8e1ce;

  /* Silk & Stone Design System Aliases */
  --gold: #c9a84c;
  --gold-light: #e8c96a;
  --gold-dark: #8b6914;
  --navy: #0d1b2a;
  --navy-deep: #08121e;
  --warm-white: #fafaf8;

  --text-primary: #1a1a18;
  --text-secondary: #4a4740;
  --text-muted: #8a867e;

  --radius: 12px;

  --font-serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --font-sans: 'Outfit', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --shadow-gold: 0 10px 25px -5px rgba(201, 168, 76, 0.3), 0 8px 10px -6px rgba(201, 168, 76, 0.3);
  --shadow-gold-sm: 0 4px 14px rgba(201, 168, 76, 0.4);
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
  line-height: 1.7;
  background-image: radial-gradient(circle at 50% 0%, rgba(201, 168, 76, 0.03) 0%, transparent 60%);
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
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 168, 76, 0.6);
}

/* ── Typography & Helpers ── */
.section-eyebrow {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-gold);
  display: block;
  margin-bottom: 0.5rem;
}
.section-eyebrow--dark {
  color: var(--color-gold-dark);
}

.section-title {
  font-family: var(--font-serif);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  font-feature-settings: "lnum" 1, "tnum" 1;
}

.text-gold-gradient {
  background: linear-gradient(135deg, #e8c96a 0%, #c9a84c 50%, #8b6914 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.font-mono {
  font-family: var(--font-mono);
  font-feature-settings: "lnum" 1, "tnum" 1;
  font-variant-numeric: tabular-nums lining-nums;
}

/* ── Buttons ── */
@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(45deg); }
  25%, 100% { transform: translateX(100%) rotate(45deg); }
}

.btn-primary {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
  color: #08121e;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: none;
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(201, 168, 76, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  white-space: nowrap;
}
.btn-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
  box-shadow: 0 14px 28px -5px rgba(201, 168, 76, 0.45);
  color: #08121e;
}
.btn-primary::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: rotate(45deg);
  animation: shimmer 4s infinite;
  pointer-events: none;
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
  border-radius: 0.75rem;
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
  color: #0d1b2a;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 0.75rem;
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
  border-radius: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  text-decoration: none;
}
.luxury-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.8), transparent);
  pointer-events: none;
}

.luxury-card--dark {
  background: linear-gradient(165deg, rgba(28, 46, 63, 0.5) 0%, rgba(19, 34, 52, 0.72) 42%, rgba(8, 18, 30, 0.92) 100%);
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
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(165deg, rgba(28, 46, 63, 0.4) 0%, rgba(19, 34, 52, 0.65) 50%, rgba(8, 18, 30, 0.85) 100%);
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
  background: #08121e;
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
  border-radius: 9999px;
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
  background-color: #08121e;
  color: #ffffff;
}
.bg-primary-navy {
  background-color: #0d1b2a;
  color: #ffffff;
}
.bg-midnight-obsidian {
  background-color: #080d19;
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
  background: linear-gradient(90deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
  color: #08121e;
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
  background: linear-gradient(90deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
  color: #08121e;
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
  color: #08121e;
}

.marquee-dot {
  color: #08121e;
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
  border-radius: 1rem;
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
  border-radius: 9999px;
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
  border-radius: 0.75rem;
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
  border-radius: 9999px;
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
  border-radius: 0.75rem;
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
  background: linear-gradient(135deg, #08121e 0%, #0d1b2a 100%);
  color: #c9a84c;
  border: 1px solid rgba(201, 168, 76, 0.4);
  border-radius: 9999px;
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
  color: #f5e8c0;
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
  background: #0d1b2a;
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
  background: #08121e;
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
  background: #1c2e3f;
  color: #fafaf8;
  border: 1px solid rgba(201, 168, 76, 0.2);
}

.ai-message--assistant .ai-message__bubble {
  background: rgba(19, 34, 52, 0.9);
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
  color: #08121e;
}

.ai-concierge-drawer__form {
  padding: 1.25rem 1.5rem;
  background: #08121e;
  border-top: 1px solid rgba(201, 168, 76, 0.2);
}

.ai-concierge-drawer__input-wrap {
  display: flex;
  gap: 0.75rem;
}

.ai-concierge-drawer__input {
  flex: 1;
  background: #132234;
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
  color: #08121e;
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

/* ═══════════════════════════════════════════════════════════════════════════
   LIGHT THROUGH STONE — storefront surface system
   ═══════════════════════════════════════════════════════════════════════════

   The hero on "/" establishes the model: obsidian, a raking key light, one
   Pass sweep, Cormorant display type, tabular data. Everything below applies
   that same model to the catalogue, product record, search, bag and footer.

   The light tokens are imported from lib/light-tokens.ts rather than copied:
   the hero injects the canonical layer on "/", and this theme carries the same
   layer to every other route. One source, no drift. On "/" the declarations
   meet again; identical custom properties are harmless and the React-hoisted
   hero style is de-duplicated by precedence.

   Gold is never a fill here. It appears as a hairline, a sweep gradient, a
   focus ring or a small evidence token. Depth is a falloff, not a box.
   ─────────────────────────────────────────────────────────────────────────── */

${LIGHT_TOKENS_CSS}

:root {
  --mh-ink: #1a1a18;
  --mh-ink-soft: #4a4740;
  --mh-ink-muted: #5c574d;
  --mh-ivory: #fafaf8;
  --mh-paper: #f5f1e8;
  --mh-hairline: rgba(26, 26, 24, 0.14);
  --mh-gold-line: rgba(201, 168, 76, 0.45);
  --mh-gold-ink: #7d5d10;
  --mh-obsidian: #08121e;
  --mh-obsidian-deep: #060d16;
  --mh-gutter: clamp(1.25rem, 4.5vw, 3.5rem);
}

/* ── Utilities that the primitives already reference ── */

.visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.tabular,
.money {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'lnum' 1, 'tnum' 1;
}

.money {
  white-space: nowrap;
}

/* ── Focus: visible on ivory and on obsidian, never removed ── */

.mh-page :is(a, button, input, select, textarea, summary):focus-visible,
.site-header :is(a, button):focus-visible,
.site-footer :is(a, button):focus-visible {
  outline: 2px solid var(--mh-gold-ink);
  outline-offset: 3px;
  border-radius: 2px;
}

.site-footer :is(a, button):focus-visible {
  outline-color: var(--color-gold-light, #e8c96a);
  outline-offset: 4px;
}

/* ── Page opening: one Enter, one measured rule ── */

.page.mh-page,
.search-page.mh-page {
  position: relative;
  isolation: isolate;
  max-width: 1360px;
  padding-left: var(--mh-gutter);
  padding-right: var(--mh-gutter);
}

.mh-page::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  z-index: -1;
  height: min(30rem, 55vh);
  pointer-events: none;
  background: radial-gradient(
    90% 70% at 8% 0%,
    rgba(201, 168, 76, 0.1) 0%,
    rgba(201, 168, 76, 0.035) 42%,
    transparent 72%
  );
}

.mh-masthead {
  position: relative;
  margin: 0 0 clamp(2rem, 4vw, 3.25rem);
  padding: clamp(1.25rem, 3vw, 2rem) 0 clamp(1.75rem, 3.5vw, 2.75rem);
  border-bottom: 1px solid var(--mh-hairline);
  animation: mh-enter var(--motion-enter) var(--motion-ease) both;
}

.mh-masthead::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: min(24rem, 60%);
  height: 1px;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--mh-gold-line) 0%, rgba(201, 168, 76, 0) 100%);
  animation: mh-rule-pass var(--motion-pass) var(--motion-ease) both;
}

.mh-masthead__eyebrow {
  margin: 0 0 clamp(0.75rem, 1.8vw, 1.1rem);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--mh-gold-ink);
}

.mh-masthead h1 {
  max-width: 22ch;
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2.6rem, min(5.6vw, 10vh), 4.5rem);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: var(--mh-ink);
  text-wrap: balance;
}

.mh-masthead__lead {
  max-width: 48rem;
  margin: clamp(1rem, 2.4vw, 1.5rem) 0 0;
  font-family: var(--font-body);
  font-size: clamp(0.9375rem, 1.05vw, 1.0625rem);
  line-height: 1.75;
  color: var(--mh-ink-soft);
}

.mh-masthead__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
  margin-top: clamp(1rem, 2.2vw, 1.5rem);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

/* ── Actions: a lit edge, never a gold slab ── */

.mh-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.95rem 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--mh-ink);
  border: 1px solid var(--mh-gold-ink);
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    rgba(201, 168, 76, 0.1) 0%,
    rgba(201, 168, 76, 0.02) 100%
  );
  cursor: pointer;
  transition:
    border-color 220ms var(--motion-ease),
    background 220ms var(--motion-ease),
    color 220ms var(--motion-ease);
}

.mh-cta:hover {
  border-color: var(--mh-gold-ink);
  background: linear-gradient(
    180deg,
    rgba(201, 168, 76, 0.17) 0%,
    rgba(201, 168, 76, 0.04) 100%
  );
  color: #000000;
}

.mh-cta span[aria-hidden='true'] {
  transition: transform 220ms var(--motion-ease);
}

.mh-cta:hover span[aria-hidden='true'] {
  transform: translateX(4px);
}

.mh-cta--quiet {
  border-color: rgba(26, 26, 24, 0.25);
  background: transparent;
}

.mh-cta--quiet:hover {
  border-color: var(--mh-gold-ink);
  background: rgba(201, 168, 76, 0.06);
}

/* ── LightPlate: the honest image slot ── */

.mh-plate {
  --mh-plate-stone: 54%;
  display: flex;
  flex-direction: column;
}

.mh-plate__field {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  overflow: clip;
  isolation: isolate;
  background: radial-gradient(
    120% 95% at 28% 10%,
    #16324a 0%,
    #0b1a29 46%,
    #060e17 100%
  );
  box-shadow: inset 0 0 0 1px rgba(245, 232, 192, 0.08);
}

.mh-plate--tall .mh-plate__field {
  aspect-ratio: 4 / 5;
}

.mh-plate--tall {
  --mh-plate-stone: 64%;
}

.mh-plate__shadow {
  position: absolute;
  left: 20%;
  right: 20%;
  bottom: 12%;
  height: 13%;
  z-index: 0;
  background: radial-gradient(
    closest-side,
    rgba(3, 8, 14, 0.85) 0%,
    transparent 74%
  );
  filter: blur(10px);
  pointer-events: none;
}

.mh-plate__stone {
  position: relative;
  z-index: 1;
  width: var(--mh-plate-stone);
  aspect-ratio: 1;
  overflow: hidden;
  isolation: isolate;
  clip-path: polygon(
    17% 0%,
    83% 0%,
    100% 19%,
    100% 81%,
    83% 100%,
    17% 100%,
    0% 81%,
    0% 19%
  );
  background: radial-gradient(
    115% 120% at 30% 20%,
    #1d3d54 0%,
    #102a3f 34%,
    #071320 72%,
    #04090f 100%
  );
  box-shadow: inset 0 0 0 1px rgba(245, 232, 192, 0.16);
}

.mh-plate__key {
  position: absolute;
  inset: -60%;
  background: linear-gradient(
    var(--light-angle, 135deg),
    transparent 34%,
    rgba(201, 168, 76, 0.06) 41%,
    rgba(232, 201, 106, 0.32) 46%,
    rgba(245, 232, 192, 0.68) 48.8%,
    rgba(255, 255, 255, 0.58) 49.6%,
    rgba(232, 201, 106, 0.24) 51.5%,
    rgba(201, 168, 76, 0.05) 57%,
    transparent 64%
  );
  mix-blend-mode: screen;
  transform: rotate(-14deg);
  opacity: 0.82;
  pointer-events: none;
}

.mh-plate__rim {
  position: absolute;
  inset: -18%;
  background: conic-gradient(
    from 140deg,
    #ff6f61 0deg,
    #ffb968 51deg,
    #f0e29a 102deg,
    #6fdaa0 154deg,
    #5cc4ff 205deg,
    #8f7bff 257deg,
    #ff6ec7 308deg,
    #ff6f61 360deg
  );
  mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(
    closest-side,
    transparent 62%,
    #000 78%,
    transparent 96%
  );
  mask-image: radial-gradient(
    closest-side,
    transparent 62%,
    #000 78%,
    transparent 96%
  );
  transform: rotate(-9deg);
  opacity: 0.09;
  pointer-events: none;
}

.mh-plate__specular {
  position: absolute;
  left: 30%;
  top: 26%;
  width: 11%;
  min-width: 10px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(245, 232, 192, 0.4) 36%,
    transparent 68%
  );
  mix-blend-mode: screen;
  transform: translate(-50%, -50%) rotate(-20deg) scaleY(0.78);
  opacity: 0.9;
  filter: blur(0.5px);
  pointer-events: none;
}

.mh-plate__pass {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  width: 38%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(245, 232, 192, 0.2) 48%,
    transparent 100%
  );
  transform: translateX(-160%) skewX(-12deg);
  opacity: 0;
  transition:
    transform var(--motion-pass) var(--motion-ease),
    opacity 160ms linear;
}

.mh-plate__note {
  margin: 0.65rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  line-height: 1.5;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-card:hover .mh-plate__pass,
.mh-card:focus-within .mh-plate__pass {
  transform: translateX(320%) skewX(-12deg);
  opacity: 1;
}

/* A grid of identical plates would read as a repeated template. The cut does
   not change; only the key angle and glint move — the same lighting model at
   three adjacent angles. No colour, no product claim. */
.product-grid > li:nth-child(3n + 2) .mh-plate__key,
.mh-card-grid > li:nth-child(3n + 2) .mh-plate__key {
  transform: rotate(-4deg) scale(1.04);
}

.product-grid > li:nth-child(3n + 3) .mh-plate__key,
.mh-card-grid > li:nth-child(3n + 3) .mh-plate__key {
  transform: rotate(-23deg) scale(1.02);
}

.product-grid > li:nth-child(3n + 2) .mh-plate__specular,
.mh-card-grid > li:nth-child(3n + 2) .mh-plate__specular {
  left: 36%;
  top: 30%;
}

.product-grid > li:nth-child(3n + 3) .mh-plate__specular,
.mh-card-grid > li:nth-child(3n + 3) .mh-plate__specular {
  left: 27%;
  top: 31%;
}

/* ── Product / design card: unboxed, one link, one light pass ── */

.mh-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mh-card__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-card__kind,
.mh-card__ref {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-card__link {
  display: flex;
  flex-direction: column;
  flex: 1;
  color: inherit;
  text-decoration: none;
}

.mh-card__link:focus-visible {
  outline: 2px solid var(--mh-gold-ink);
  outline-offset: 6px;
}

.mh-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding-top: 1.1rem;
}

.mh-card__variety {
  margin: 0 0 0.35rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mh-gold-ink);
}

.mh-card__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.35rem, 1.5vw, 1.6rem);
  font-weight: 400;
  line-height: 1.14;
  letter-spacing: -0.01em;
  color: var(--mh-ink);
  text-wrap: pretty;
}

.mh-card__subtitle {
  margin: 0.5rem 0 0;
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--mh-ink-soft);
}

.mh-card__meta {
  margin: 0.65rem 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-card__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid var(--mh-hairline);
}

.mh-card__price {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 1.0625rem;
  font-weight: 500;
  color: var(--mh-ink);
}

.mh-card__cue {
  margin-left: auto;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-soft);
  transition: color 180ms var(--motion-ease);
}

.mh-card__cue span[aria-hidden='true'] {
  display: inline-block;
  transition: transform 180ms var(--motion-ease);
}

.mh-card:hover .mh-card__cue,
.mh-card:focus-within .mh-card__cue {
  color: var(--mh-gold-ink);
}

.mh-card:hover .mh-card__cue span[aria-hidden='true'],
.mh-card:focus-within .mh-card__cue span[aria-hidden='true'] {
  transform: translateX(4px);
}

/* ── Grids ── */

.product-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(2rem, 3vw, 3rem) clamp(1.25rem, 2.4vw, 2.25rem);
  margin: 0 0 3rem;
}

@media (max-width: 1100px) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .product-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.mh-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(2rem, 3vw, 3rem) clamp(1.25rem, 2.4vw, 2.25rem);
  list-style: none;
  margin: 0 0 3rem;
  padding: 0;
}

.product-grid > li,
.mh-card-grid > li {
  display: flex;
}

.product-grid > li > .mh-card,
.mh-card-grid > li > .mh-card {
  flex: 1;
}

/* ── Breadcrumbs ── */

.breadcrumbs {
  margin: 0 0 clamp(1rem, 2vw, 1.5rem);
}

.breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumbs__item:not(:last-child)::after {
  content: '/';
  color: rgba(26, 26, 24, 0.32);
}

.breadcrumbs a {
  color: var(--mh-ink-soft);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 180ms var(--motion-ease), color 180ms var(--motion-ease);
}

.breadcrumbs a:hover {
  color: var(--mh-ink);
  border-bottom-color: var(--mh-gold-line);
}

.breadcrumbs__item:last-child span {
  color: var(--mh-ink);
}

/* ── Pagination ── */

.pagination {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mh-hairline);
}

.pagination a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mh-ink);
  text-decoration: none;
  transition: color 180ms var(--motion-ease);
}

.pagination a:hover {
  color: var(--mh-gold-ink);
}

.pagination__prev::before {
  content: '←';
}

.pagination__next {
  margin-left: auto;
}

.pagination__next::after {
  content: '→';
}

/* ── Empty state ── */

.empty-state {
  max-width: 44rem;
  padding: clamp(2.5rem, 6vw, 4.5rem) 0;
  border-top: 1px solid var(--mh-hairline);
  border-bottom: 1px solid var(--mh-hairline);
}

.empty-state__title {
  margin: 0 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--mh-ink);
  text-wrap: balance;
}

.empty-state__body {
  margin-bottom: 1.5rem;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.75;
  color: var(--mh-ink-soft);
}

.empty-state__action a:not(.mh-cta) {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--mh-ink);
  text-decoration: none;
  border-bottom: 1px solid var(--mh-gold-ink);
  padding-bottom: 0.3rem;
}

/* ── Badge: a status word with a hairline, not a pill of colour ── */

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--mh-hairline);
  border-radius: 999px;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
  color: var(--mh-ink-soft);
  white-space: nowrap;
}

.badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.badge--positive {
  color: #2f6b4f;
  border-color: rgba(47, 107, 79, 0.38);
}

.badge--warning {
  color: var(--mh-gold-ink);
  border-color: rgba(139, 105, 20, 0.42);
}

.badge--critical {
  color: #8c2f2f;
  border-color: rgba(140, 47, 47, 0.4);
}

/* ── Specification table: hairline rules, tabular values ── */

.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
}

.spec-table__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.spec-table th,
.spec-table td {
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--mh-hairline);
  text-align: left;
  vertical-align: baseline;
}

.spec-table th {
  width: 42%;
  padding-right: 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.spec-table td {
  color: var(--mh-ink);
  font-variant-numeric: tabular-nums lining-nums;
  overflow-wrap: anywhere;
}

.spec-table tr:last-child th,
.spec-table tr:last-child td {
  border-bottom: 0;
}

/* ── Data table (setting variants) ── */

.mh-table-scroll {
  width: 100%;
  overflow-x: auto;
}

.mh-table-scroll:focus-visible {
  outline: 2px solid var(--mh-gold-ink);
  outline-offset: 4px;
}

.mh-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-sans);
  font-size: 0.875rem;
}

.mh-table th,
.mh-table td {
  padding: 0.85rem 1rem 0.85rem 0;
  border-bottom: 1px solid var(--mh-hairline);
  text-align: left;
  vertical-align: baseline;
  white-space: nowrap;
}

.mh-table thead th {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-table tbody th {
  font-weight: 500;
  color: var(--mh-ink);
}

.mh-table tr:last-child th,
.mh-table tr:last-child td {
  border-bottom: 0;
}

.mh-table__sub {
  display: block;
  margin-top: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  color: var(--mh-ink-muted);
}

/* ── Evidence token: the word is the signal ── */

.mh-evidence {
  display: inline-flex;
  align-items: baseline;
  padding: 0.12rem 0.4rem;
  border: 1px solid currentColor;
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  line-height: 1.3;
  color: var(--mh-ink-soft);
  white-space: nowrap;
}

.mh-evidence--observed {
  color: #2f6b4f;
}

.mh-evidence--extracted {
  color: #4a4740;
}

.mh-evidence--pattern {
  color: var(--mh-gold-ink);
}

.mh-evidence--inferred {
  color: #8b5a14;
}

.mh-evidence--unknown {
  color: var(--mh-ink-muted);
}

/* ── Product detail: two-column editorial opening, hairline record ── */

.mh-pdp {
  display: grid;
  gap: clamp(2.5rem, 5vw, 4.5rem);
}

.mh-pdp__top {
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1.12fr);
  gap: clamp(2rem, 5vw, 5rem);
  align-items: start;
}

.mh-pdp__study {
  position: sticky;
  top: 6.5rem;
}

.mh-pdp__study-note {
  max-width: 26rem;
  margin: 0.8rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  line-height: 1.6;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-pdp__summary h1 {
  max-width: 18ch;
  margin: 0.5rem 0 0;
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, min(5vw, 9vh), 4.25rem);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.03em;
  color: var(--mh-ink);
  text-wrap: balance;
}

.mh-pdp__subtitle {
  max-width: 40rem;
  margin: 1rem 0 0;
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--mh-ink-soft);
}

.mh-pdp__ref {
  margin: 0.85rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-pdp__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.5rem 0 0;
}

.mh-pdp__price-block {
  margin: clamp(1.5rem, 3vw, 2rem) 0 0;
  padding: 1.1rem 0;
  border-top: 1px solid var(--mh-hairline);
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-pdp__price {
  margin: 0;
  font-family: var(--font-mono);
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--mh-ink);
}

.mh-pdp__price-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0.55rem 0 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-pdp__short {
  max-width: 40rem;
  margin: 1.25rem 0 0;
  font-family: var(--font-body);
  font-size: 0.9875rem;
  line-height: 1.75;
  color: var(--mh-ink-soft);
}

.mh-pdp__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.85rem 1.25rem;
  margin-top: clamp(1.75rem, 3.5vw, 2.5rem);
}

.mh-pdp__webar {
  margin-top: 2rem;
}

.mh-pdp__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(2rem, 4vw, 4rem) clamp(2rem, 5vw, 5rem);
  padding-top: clamp(2rem, 4vw, 3rem);
  border-top: 1px solid var(--mh-hairline);
}

.mh-pdp__panel h2 {
  margin: 0 0 1.25rem;
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 2.2vw, 1.85rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--mh-ink);
}

.mh-pdp__panel--wide {
  grid-column: 1 / -1;
}

.mh-pdp__description {
  max-width: 52rem;
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.8;
  color: var(--mh-ink-soft);
}

.mh-pdp__muted {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--mh-ink-muted);
}

.mh-pdp__evidence-note {
  max-width: 40rem;
  margin: 1.5rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--mh-hairline);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--mh-ink-muted);
}

.mh-provenance {
  display: grid;
  grid-template-columns: minmax(7.5rem, 10rem) minmax(0, 1fr);
  gap: 0.8rem 1.5rem;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.875rem;
}

.mh-provenance dt {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
  padding-top: 0.12rem;
}

.mh-provenance dd {
  margin: 0;
  min-width: 0;
  color: var(--mh-ink);
  overflow-wrap: anywhere;
}

.mh-provenance dd small {
  color: var(--mh-ink-muted);
}

.mh-provenance__url {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--mh-ink-soft) !important;
  overflow-wrap: break-word;
  word-break: normal;
}

/* ── Search: an index page, not a control panel ── */

.mh-search-form {
  display: flex;
  align-items: stretch;
  gap: 0.4rem;
  max-width: 46rem;
  margin: 0 0 1.5rem;
  padding: 0.3rem 0.3rem 0.3rem 1rem;
  border: 1px solid var(--mh-hairline);
  background: rgba(255, 255, 255, 0.4);
}

.mh-search-form__input {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 0;
  border: 0;
  background: transparent;
  font-family: var(--font-serif);
  font-size: clamp(1.1rem, 1.6vw, 1.3rem);
  color: var(--mh-ink);
  outline: none;
}

.mh-search-form__input::placeholder {
  color: var(--mh-ink-muted);
  opacity: 1;
}

.mh-search-form__input:focus-visible {
  outline: 2px solid var(--mh-gold-ink);
  outline-offset: 4px;
}

.mh-search-form__submit {
  flex: none;
}

.mh-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem;
}

.mh-chips__label {
  margin-right: 0.35rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--mh-gold-line);
  border-radius: 2px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--mh-ink);
  text-decoration: none;
  transition: border-color 180ms var(--motion-ease), background 180ms var(--motion-ease);
}

.mh-chip:hover {
  border-color: var(--mh-gold-ink);
  background: rgba(201, 168, 76, 0.08);
}

.mh-chips__clear {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-soft);
  text-decoration: none;
  border-bottom: 1px solid var(--mh-gold-line);
  padding-bottom: 0.2rem;
}

.mh-search__layout {
  display: grid;
  grid-template-columns: 15.5rem minmax(0, 1fr);
  gap: clamp(2rem, 4vw, 4rem);
  align-items: start;
  margin-top: clamp(2rem, 4vw, 3rem);
}

.mh-facets {
  position: sticky;
  top: 6.5rem;
  max-height: calc(100vh - 8rem);
  overflow-y: auto;
  border-top: 1px solid var(--mh-hairline);
  scrollbar-width: thin;
  scrollbar-color: rgba(201, 168, 76, 0.3) transparent;
}

.mh-facets__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-facets__head h2 {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--mh-ink);
}

.mh-facets__reset {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.mh-facets__reset:hover {
  color: var(--mh-ink);
  border-bottom-color: var(--mh-gold-line);
}

.mh-facet {
  padding: 1rem 0;
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-facet__title {
  margin: 0 0 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-facet__list {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  max-height: 12rem;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  scrollbar-width: thin;
}

.mh-facet__link {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.32rem 0.4rem;
  border-left: 2px solid transparent;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--mh-ink-soft);
  text-decoration: none;
  transition: color 160ms var(--motion-ease), border-color 160ms var(--motion-ease);
}

.mh-facet__link:hover {
  color: var(--mh-ink);
  border-left-color: var(--mh-gold-line);
}

.mh-facet__link[aria-current='true'] {
  color: var(--mh-ink);
  border-left-color: var(--mh-gold-ink);
  font-weight: 600;
}

.mh-facet__mark {
  width: 9px;
  height: 9px;
  border: 1px solid rgba(26, 26, 24, 0.32);
  border-radius: 1px;
}

.mh-facet__link[aria-current='true'] .mh-facet__mark {
  border-color: var(--mh-gold-ink);
  background: var(--mh-gold-ink);
  box-shadow: inset 0 0 0 2px var(--mh-ivory);
}

.mh-facet__count {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--mh-ink-muted);
}

.mh-search__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--mh-hairline);
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-search__count {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--mh-ink-soft);
}

.mh-search__count .tabular {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--mh-ink);
}

.mh-search__count em {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-style: italic;
  color: var(--mh-ink);
}

.mh-sort {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.9rem;
}

.mh-sort__label {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-sort__link {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  color: var(--mh-ink-soft);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 0.15rem;
}

.mh-sort__link:hover {
  color: var(--mh-ink);
}

.mh-sort__link[aria-current='true'] {
  color: var(--mh-ink);
  border-bottom-color: var(--mh-gold-ink);
}

.mh-notice {
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  border-left: 2px solid var(--mh-gold-ink);
  background: #f7f0dd;
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--mh-ink);
}

.mh-notice--muted {
  border-left-color: var(--mh-hairline);
  background: rgba(26, 26, 24, 0.035);
  color: var(--mh-ink-soft);
}

.mh-search__results .product-grid {
  margin-top: 2rem;
}

/* ── Bag ── */

.mh-cart {
  max-width: 1100px;
  margin: 0 auto;
}

.mh-cart--state {
  max-width: 46rem;
  margin: clamp(2.5rem, 7vw, 5rem) auto;
}

.mh-cart--state h1 {
  margin: 0.5rem 0 1rem;
  font-family: var(--font-serif);
  font-size: clamp(2.25rem, 4.5vw, 3.5rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--mh-ink);
}

.mh-cart__lead {
  max-width: 36rem;
  margin: 0;
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.75;
  color: var(--mh-ink-soft);
}

.mh-cart__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

.mh-cart__loading {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-cart__head {
  margin-bottom: clamp(2rem, 4vw, 3rem);
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-cart__head h1 {
  margin: 0.4rem 0 0;
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--mh-ink);
}

.mh-cart__count {
  margin: 0.9rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-cart__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 0.85fr);
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: start;
}

.mh-cart__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--mh-hairline);
}

.mh-cart__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: baseline;
  gap: 1.5rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-cart__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1.2;
  color: var(--mh-ink);
}

.mh-cart__sku {
  margin: 0.4rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-cart__qty,
.mh-cart__amount {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--mh-ink);
}

.mh-cart__amount {
  min-width: 7rem;
  text-align: right;
}

.mh-cart__label {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--mh-ink-muted);
}

.mh-cart__continue {
  display: inline-block;
  margin-top: 1.5rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-soft);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 0.25rem;
}

.mh-cart__continue:hover {
  color: var(--mh-ink);
  border-bottom-color: var(--mh-gold-line);
}

.mh-cart__summary {
  position: sticky;
  top: 6.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mh-gold-line);
}

.mh-cart__summary h2 {
  margin: 0 0 1rem;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--mh-ink);
}

.mh-cart__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--mh-hairline);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: var(--mh-ink-soft);
}

.mh-cart__row .money {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--mh-ink);
}

.mh-cart__note {
  margin: 1rem 0 1.5rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  line-height: 1.7;
  color: var(--mh-ink-muted);
}

.mh-cart__checkout {
  width: 100%;
}

/* ── Variety directory ── */

.mh-directory {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--mh-hairline);
}

.mh-directory__item {
  position: relative;
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 1rem;
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--mh-hairline);
}

.mh-directory__item::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--mh-gold-line) 0%, rgba(201, 168, 76, 0) 100%);
  transition: width 420ms var(--motion-ease);
}

.mh-directory__item:hover::after {
  width: min(22rem, 55%);
}

.mh-directory__index {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  color: var(--mh-ink-muted);
}

.mh-directory__name {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.6rem, 2.4vw, 2.2rem);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.mh-directory__name a {
  color: var(--mh-ink);
  text-decoration: none;
}

.mh-directory__name a:hover {
  color: #000000;
}

.mh-directory__links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-top: 0.45rem;
}

.mh-directory__links a {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mh-ink-soft);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 0.15rem;
}

.mh-directory__links a:hover {
  color: var(--mh-ink);
  border-bottom-color: var(--mh-gold-line);
}

.mh-directory__arrow {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  line-height: 1;
  color: var(--mh-gold-ink);
  transition: transform 180ms var(--motion-ease);
}

.mh-directory__item:hover .mh-directory__arrow {
  transform: translateX(4px);
}

/* ── Header CTA: the same lit edge as every other primary action ──
   The previous filled gold gradient carried white text (1.6–2.3:1). This is
   a scoped contrast fix, not a header redesign. */

.site-header__cta-btn {
  background: transparent !important;
  color: var(--mh-ink) !important;
  border: 1px solid var(--mh-gold-ink);
  border-radius: 2px;
  box-shadow: none;
  font-size: 0.625rem;
  letter-spacing: 0.2em;
}

.site-header__cta-btn:hover {
  background: rgba(201, 168, 76, 0.1);
  border-color: var(--mh-gold-ink);
  color: var(--mh-ink) !important;
  transform: none;
  box-shadow: none;
  filter: none;
}

/* Pre-existing 10px submark at #8a867e measured 3.5:1 on the header ivory.
   One token change, no layout change. */
.site-header__submark {
  color: var(--mh-ink-muted);
}

/* ── Footer: deepest obsidian, one gold rule, evidence in the open ── */

.site-footer {
  background: var(--mh-obsidian-deep);
  border-top: 1px solid rgba(201, 168, 76, 0.3);
  padding: clamp(3rem, 6vw, 5rem) var(--mh-gutter) 2rem;
}

.site-footer::before {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(232, 201, 106, 0.7) 22%,
    rgba(232, 201, 106, 0.3) 55%,
    transparent 100%
  );
}

.site-footer__grid {
  grid-template-columns: 1.6fr repeat(4, 1fr);
  gap: clamp(1.75rem, 3vw, 3rem);
  margin-bottom: clamp(2.5rem, 4vw, 3.5rem);
}

.site-footer__brand-title {
  margin: 0 0 0.65rem;
  font-family: var(--font-serif);
  font-size: 1.85rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--color-gold-pale, #f5e8c0);
}

.site-footer__tagline {
  max-width: 28rem;
  margin: 0 0 1.25rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.7;
  color: rgba(250, 250, 248, 0.68);
}

.site-footer__cities {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(250, 250, 248, 0.62);
}

.site-footer__column-title {
  margin: 0 0 1.1rem;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(250, 250, 248, 0.9);
}

.site-footer__links {
  gap: 0.55rem;
}

.site-footer__link {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: rgba(250, 250, 248, 0.68);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 180ms var(--motion-ease), border-color 180ms var(--motion-ease);
}

.site-footer__link:hover {
  color: #ffffff;
  border-bottom-color: rgba(232, 201, 106, 0.55);
  padding-left: 0;
}

.site-footer__truth {
  display: grid;
  gap: 0.85rem;
  padding: clamp(1.25rem, 2.5vw, 1.75rem) 0;
  border-top: 1px solid rgba(250, 250, 248, 0.12);
}

.site-footer__truth p {
  display: grid;
  grid-template-columns: 5.25rem minmax(0, 1fr);
  gap: 1rem;
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.75rem;
  line-height: 1.7;
  color: rgba(250, 250, 248, 0.7);
}

.site-footer__inv {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  color: var(--color-gold-light, #e8c96a);
}

.site-footer__bottom {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(250, 250, 248, 0.1);
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: rgba(250, 250, 248, 0.62);
}

.site-footer__legal-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.site-footer__legal-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.site-footer__legal-link {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(250, 250, 248, 0.62);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.site-footer__legal-link:hover {
  color: #ffffff;
  border-bottom-color: rgba(232, 201, 106, 0.55);
}

/* ── Motion keyframes (the shared vocabulary, namespaced to the storefront) ── */

@keyframes mh-enter {
  from {
    opacity: 0;
    transform: translateY(var(--motion-travel, 12px));
    filter: blur(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes mh-rule-pass {
  from {
    transform: scaleX(0.12);
    opacity: 0.2;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* ── Responsive ── */

@media (max-width: 1080px) {
  .mh-pdp__top {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: clamp(1.5rem, 4vw, 3rem);
  }

  .mh-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .site-footer__grid {
    grid-template-columns: 1fr 1fr;
  }

  .site-footer__brand-col {
    grid-column: 1 / -1;
  }
}

@media (max-width: 980px) {
  .mh-pdp__top,
  .mh-pdp__details,
  .mh-cart__layout,
  .mh-search__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .mh-pdp__study,
  .mh-cart__summary {
    position: relative;
    top: auto;
  }

  .mh-facets {
    position: relative;
    top: auto;
    max-height: 45vh;
    overflow-y: auto;
    border-bottom: 1px solid var(--mh-hairline);
    padding-bottom: 1rem;
  }

  .mh-pdp__study {
    max-width: 34rem;
  }

  .mh-pdp__summary h1 {
    max-width: 24ch;
  }

  .mh-search__layout {
    gap: 2.5rem;
  }
}

@media (max-width: 640px) {
  .mh-masthead h1 {
    font-size: clamp(2.4rem, 12vw, 3.2rem);
  }

  .mh-card-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .product-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .mh-cart__item {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem 1rem;
  }

  .mh-cart__amount {
    grid-column: 1 / -1;
    text-align: left;
  }

  .mh-provenance {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.3rem;
  }

  .mh-provenance dd {
    margin-bottom: 0.6rem;
  }

  .site-footer__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .site-footer__truth p {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.3rem;
  }

  .mh-directory__item {
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    gap: 0.75rem;
  }
}

/* ── Header containment ──
   The header is outside this task's component scope, but its desktop row
   overflowed the document at 1440 (the actions ended at 1622px), which makes
   every page horizontally scrollable. These are containment rules only: the
   same elements, smaller tracking, and a clean fallback below the width where
   six mega-menu groups cannot fit. No new navigation pattern is introduced. */

@media (max-width: 1500px) {
  .site-header__container {
    gap: 1rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .mega-menu__groups {
    gap: 0.9rem;
  }

  .mega-menu__trigger {
    padding: 0.6rem 0.3rem;
    font-size: 0.625rem;
    letter-spacing: 0.12em;
  }

  .site-header__actions {
    gap: 0.5rem;
  }

  .site-header__utility-btn {
    padding: 0.45rem 0.55rem;
    letter-spacing: 0.1em;
  }

  .site-header__cta-btn {
    padding: 0.6rem 0.9rem;
    font-size: 0.5625rem;
    letter-spacing: 0.14em;
  }
}

@media (max-width: 1180px) {
  .site-header__nav-zone {
    display: none;
  }
}

@media (max-width: 560px) {
  .site-header__submark,
  .site-header__divider {
    display: none;
  }

  .site-header__wordmark {
    font-size: 1.3rem;
  }

  .site-header__utility-label {
    display: none;
  }

  .site-header__utility-btn {
    padding: 0.45rem;
  }

  .site-header__actions {
    gap: 0.25rem;
  }

  .site-header__cta-btn {
    padding: 0.55rem 0.65rem;
    font-size: 0.5rem;
    letter-spacing: 0.1em;
  }
}

/* ── Reduced motion: remove the decorative sweep, keep all information ── */

@media (prefers-reduced-motion: reduce) {
  .mh-masthead,
  .mh-masthead::after {
    animation: none;
  }

  .mh-plate__pass {
    display: none;
  }

  .mh-directory__item::after {
    display: none;
  }

  .mh-card__cue span[aria-hidden='true'],
  .mh-directory__arrow {
    transition: none;
  }
}
`;

