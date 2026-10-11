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
  background-color: #0d1b2a;
  color: #ffffff;
  font-family: var(--font-body);
  line-height: 1.6;
  background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20L20 0Z' fill='none' stroke='%23ffffff' stroke-opacity='0.02' stroke-width='1'/%3E%3C/svg%3E");
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

.btn-outline {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
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
.btn-outline:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(201, 168, 76, 0.6);
  transform: translateY(-2px);
  color: #ffffff;
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
  border: 1px solid var(--color-champagne-border);
  color: #0d1b2a;
  box-shadow: 0 4px 20px -4px rgba(13, 27, 42, 0.06);
}
.luxury-card--light:hover {
  border-color: rgba(201, 168, 76, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 12px 30px -6px rgba(13, 27, 42, 0.12);
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

/* ── Header Chrome ── */
.site-header {
  background: rgba(8, 18, 30, 0.95);
  border-bottom: 1px solid rgba(201, 168, 76, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(16px);
}
.site-header__brand {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--color-gold);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s ease;
}
.site-header__brand:hover {
  color: var(--color-gold-light);
}

/* ── Mega Menu ── */
.mega-menu {
  position: relative;
}
.mega-menu__groups {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.mega-menu__trigger {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}
.mega-menu__trigger:hover,
.mega-menu__trigger[aria-expanded="true"] {
  color: var(--color-gold);
  background: rgba(201, 168, 76, 0.08);
}
.mega-menu__panel {
  position: absolute;
  top: calc(100% + 0.75rem);
  left: 50%;
  transform: translateX(-50%);
  background: #0d1b2a;
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
  min-width: 280px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7);
  z-index: 100;
}
.mega-menu__panel[hidden] {
  display: none;
}
.mega-menu__links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.mega-menu__link {
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  transition: all 0.2s ease;
  display: block;
  padding: 0.25rem 0;
}
.mega-menu__link:hover {
  color: var(--color-gold);
  padding-left: 0.25rem;
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
.bg-crisp-white {
  background-color: #ffffff;
  color: #0d1b2a;
}
.bg-ivory-off-white {
  background-color: #fafaf8;
  color: #0d1b2a;
}
.bg-gold-ticker {
  background: linear-gradient(90deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
  color: #08121e;
  box-shadow: 0 4px 20px rgba(201, 168, 76, 0.35);
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
  background: linear-gradient(165deg, rgba(28, 46, 63, 0.4) 0%, rgba(19, 34, 52, 0.6) 50%, rgba(8, 18, 30, 0.8) 100%);
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  position: sticky;
  top: 6rem;
}
.filter-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
  color: var(--color-gold);
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
  color: rgba(255, 255, 255, 0.75);
  text-decoration: none;
  padding: 0.3rem 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}
.filter-item-link:hover {
  color: #ffffff;
  background: rgba(201, 168, 76, 0.1);
}
.filter-item-link--selected {
  color: var(--color-gold-light);
  font-weight: 600;
  background: rgba(201, 168, 76, 0.15);
}
.filter-item__count {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}
.search-bar-form {
  display: flex;
  gap: 0.75rem;
  max-width: 640px;
  margin: 1.5rem 0;
}
.search-input {
  flex: 1;
  background: rgba(8, 18, 30, 0.85);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 0.75rem;
  padding: 0.75rem 1.25rem;
  color: #ffffff;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  outline: none;
  transition: all 0.2s ease;
}
.search-input:focus {
  border-color: var(--color-gold);
  box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.25);
}
.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
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
  background: rgba(201, 168, 76, 0.12);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 9999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  color: var(--color-gold-light);
  text-decoration: none;
  transition: all 0.2s ease;
}
.active-chip:hover {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold);
}
.search-meta-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(19, 34, 52, 0.4);
  border: 1px solid rgba(201, 168, 76, 0.15);
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}
.search-meta-stats {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
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

.product-card__meta {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin: 0 0 1rem 0;
}

.product-card__price {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  font-variant-numeric: tabular-nums;
}
`;
