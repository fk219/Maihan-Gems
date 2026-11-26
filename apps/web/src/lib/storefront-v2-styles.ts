/**
 * apps/web/src/lib/storefront-v2-styles.ts
 *
 * Storefront v2 — "The Vault Light".
 *
 * Why a second stylesheet instead of editing theme-styles.ts: the console and
 * the vendor portal share the same global theme, and their density is
 * deliberately utilitarian. A redesign of the storefront must not reflow a
 * data table in the admin. Everything here is scoped to `.sf-v2` (the
 * storefront group layout) except the two sign-in frames, which are their own
 * named surfaces.
 *
 * The visual argument:
 *   - Ink and paper, not cards on a page. Depth is a light falloff and a
 *     hairline; nothing is lifted with a shadow.
 *   - Gold is light. It appears as a thin seam, a specular edge, or a gradient
 *     clipped to display type — never as a slab behind running text.
 *   - Cormorant Garamond is the voice; Inter is the instrument panel;
 *     JetBrains Mono carries references and money so columns align.
 *   - One motion vocabulary: Enter (arrive), Pass (a sweep of light), Hold
 *     (ambient drift). All three resolve to an instant state under
 *     prefers-reduced-motion.
 *   - Precision comes from the grid: 1440 max, a 12-column rail, 8px baseline.
 */

export const STOREFRONT_V2_CSS = `
/* ─────────────────────────────────────────────────────────────────────────────
   0. Tokens
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 {
  --sf-ink: #0b1117;
  --sf-ink-soft: #1b232b;
  --sf-paper: #f6f3ec;
  --sf-paper-raised: #fbf9f4;
  --sf-paper-deep: #ece6da;
  --sf-muted: #5f5a50;
  --sf-muted-strong: #474339;
  --sf-line: rgba(11, 17, 23, 0.14);
  --sf-line-soft: rgba(11, 17, 23, 0.08);
  --sf-gold: #c9a84c;
  --sf-gold-deep: #7a5a10;
  --sf-gold-ink: #6e4f0e;
  --sf-gold-light: #e8c96a;
  --sf-gold-line: rgba(201, 168, 76, 0.55);
  --sf-gold-line-soft: rgba(201, 168, 76, 0.26);

  --sf-font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --sf-font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --sf-font-data: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --sf-max: 1440px;
  --sf-gutter: clamp(20px, 4.6vw, 72px);
  --sf-section: clamp(64px, 9vw, 136px);
  --sf-ease: cubic-bezier(0.16, 1, 0.3, 1);

  background: var(--sf-paper);
  color: var(--sf-ink);
  font-family: var(--sf-font-ui);
  font-size: 15px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.sf-v2 *,
.sf-v2 *::before,
.sf-v2 *::after { box-sizing: border-box; }

.sf-v2 ::selection { background: var(--sf-gold-light); color: var(--sf-ink); }

.sf-v2 a { color: inherit; }

.sf-v2 :focus-visible {
  outline: 2px solid var(--sf-ink);
  outline-offset: 3px;
  border-radius: 1px;
}

.sf-v2 .sf-skip {
  position: absolute;
  left: 16px;
  top: -80px;
  z-index: 200;
  background: var(--sf-ink);
  color: var(--sf-paper);
  padding: 12px 18px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-decoration: none;
  transition: top 180ms var(--sf-ease);
}
.sf-v2 .sf-skip:focus { top: 12px; }

.sf-v2 .visually-hidden {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}

.sf-v2 .tabular,
.sf-v2 .money,
.sf-v2 time { font-variant-numeric: tabular-nums lining-nums; }

/* ─────────────────────────────────────────────────────────────────────────────
   1. Page shell
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-page,
.sf-v2 .page {
  display: block;
  width: 100%;
  max-width: var(--sf-max);
  margin: 0 auto;
  padding: clamp(28px, 4vw, 52px) var(--sf-gutter) clamp(80px, 11vw, 152px);
}

.sf-v2 .mh-page > * + * { margin-top: clamp(32px, 4vw, 56px); }

.sf-v2 .page::before,
.sf-v2 .page::after { content: none; }

/* Every page opens with a breadcrumb, a masthead, then the work. The rule
   below the masthead is the page's first gold seam. */
.sf-v2 .mh-masthead {
  display: grid;
  gap: 18px;
  max-width: 1040px;
  padding-bottom: clamp(26px, 3.4vw, 44px);
  border-bottom: 1px solid var(--sf-line);
  position: relative;
}
.sf-v2 .mh-masthead::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: clamp(72px, 12vw, 160px);
  height: 1px;
  background: linear-gradient(90deg, var(--sf-gold), rgba(201, 168, 76, 0));
}
.sf-v2 .mh-masthead__eyebrow,
.sf-v2 .sf-eyebrow {
  margin: 0;
  font-family: var(--sf-font-ui);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--sf-gold-ink);
}
.sf-v2 .mh-masthead h1,
.sf-v2 .sf-display {
  margin: 0;
  font-family: var(--sf-font-display);
  font-weight: 400;
  font-size: clamp(48px, 7.2vw, 104px);
  line-height: 0.92;
  letter-spacing: -0.022em;
  color: var(--sf-ink);
  text-wrap: balance;
}
.sf-v2 .mh-masthead__lead {
  margin: 0;
  max-width: 62ch;
  font-size: clamp(15px, 1.4vw, 18px);
  line-height: 1.65;
  color: var(--sf-muted-strong);
  text-wrap: pretty;
}
.sf-v2 .mh-masthead__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 18px;
  font-family: var(--sf-font-data);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .mh-masthead__meta::before {
  content: '';
  width: 22px;
  height: 1px;
  background: var(--sf-gold);
  align-self: center;
}

.sf-v2 .sf-section {
  padding-block: var(--sf-section);
  border-top: 1px solid var(--sf-line-soft);
}
.sf-v2 .sf-section:first-of-type { border-top: 0; }
.sf-v2 .sf-section__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
  align-items: end;
  gap: 24px 64px;
  margin-bottom: clamp(28px, 4vw, 56px);
}
.sf-v2 .sf-section__title {
  margin: 8px 0 0;
  font-family: var(--sf-font-display);
  font-weight: 400;
  font-size: clamp(34px, 4.6vw, 64px);
  line-height: 0.98;
  letter-spacing: -0.018em;
  text-wrap: balance;
}
.sf-v2 .sf-section__note {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--sf-muted);
}
.sf-v2 .sf-gold-word {
  background: linear-gradient(96deg, #6e4f0e 0%, #8b6914 34%, #b28a2c 68%, #7a5a10 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.sf-v2 .sf-rule {
  height: 1px;
  border: 0;
  background: linear-gradient(90deg, var(--sf-gold-line), var(--sf-line-soft) 55%, transparent);
  margin: 0;
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. Header — two-part, wordmark centred
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .sf-header {
  position: sticky;
  top: 0;
  z-index: 90;
  background: color-mix(in srgb, var(--sf-paper) 94%, transparent);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .sf-header__utility {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 32px;
  padding: 0 var(--sf-gutter);
  border-bottom: 1px solid var(--sf-line-soft);
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .sf-header__utility-note { margin: 0; }
.sf-v2 .sf-header__utility-links {
  display: flex;
  align-items: center;
  gap: clamp(14px, 2.4vw, 30px);
}
.sf-v2 .sf-header__utility-links a {
  text-decoration: none;
  color: var(--sf-muted-strong);
  padding: 9px 0;
  transition: color 220ms var(--sf-ease);
}
.sf-v2 .sf-header__utility-links a:hover { color: var(--sf-gold-ink); }

.sf-v2 .sf-header__rail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(16px, 3vw, 48px);
  min-height: 78px;
  padding: 0 var(--sf-gutter);
}

.sf-v2 .sf-wordmark {
  grid-column: 2;
  justify-self: center;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--sf-ink);
  padding: 10px 6px;
  white-space: nowrap;
}
.sf-v2 .sf-wordmark__name {
  font-family: var(--sf-font-display);
  font-size: clamp(17px, 1.55vw, 23px);
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  padding-left: 0.3em;
}
.sf-v2 .sf-wordmark__sub {
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--sf-muted);
  padding-left: 0.34em;
}
.sf-v2 .sf-wordmark:hover .sf-wordmark__name { color: var(--sf-gold-ink); }
.sf-v2 .sf-wordmark__name { transition: color 240ms var(--sf-ease); }

.sf-v2 .sf-nav { display: flex; align-items: center; }
.sf-v2 .sf-nav--left { grid-column: 1; justify-self: start; }
.sf-v2 .sf-nav--right { grid-column: 3; justify-self: end; }

.sf-v2 .sf-nav .mega-menu__groups {
  display: flex;
  align-items: center;
  gap: clamp(14px, 2.1vw, 34px);
  list-style: none;
  margin: 0;
  padding: 0;
}
.sf-v2 .sf-nav .mega-menu__group { position: relative; }
.sf-v2 .sf-nav .mega-menu__trigger,
.sf-v2 .sf-nav__link {
  appearance: none;
  background: none;
  border: 0;
  padding: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--sf-font-ui);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-ink);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
}
.sf-v2 .sf-nav .mega-menu__trigger::after,
.sf-v2 .sf-nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  height: 1px;
  background: var(--sf-gold);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 300ms var(--sf-ease);
}
.sf-v2 .sf-nav .mega-menu__trigger:hover::after,
.sf-v2 .sf-nav .mega-menu__trigger[aria-expanded='true']::after,
.sf-v2 .sf-nav__link:hover::after { transform: scaleX(1); }
.sf-v2 .sf-nav .mega-menu__trigger { color: var(--sf-ink); }
.sf-v2 .sf-nav .mega-menu__chevron {
  width: 7px;
  height: 5px;
  opacity: 0.55;
  transition: transform 220ms var(--sf-ease);
}
.sf-v2 .sf-nav .mega-menu__trigger[aria-expanded='true'] .mega-menu__chevron { transform: rotate(180deg); }

.sf-v2 .sf-nav .mega-menu__panel {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%) translateY(-6px);
  min-width: 248px;
  max-width: min(560px, 76vw);
  margin: 0;
  padding: 22px 24px;
  list-style: none;
  display: grid;
  gap: 2px;
  background: var(--sf-paper-raised);
  border: 1px solid var(--sf-gold-line-soft);
  box-shadow: 0 24px 60px -44px rgba(11, 17, 23, 0.55);
  opacity: 0;
  visibility: hidden;
  transition: opacity 200ms var(--sf-ease), transform 240ms var(--sf-ease), visibility 200ms;
}
.sf-v2 .sf-nav--left .mega-menu__panel {
  left: 0;
  transform: translateY(-6px);
}
.sf-v2 .sf-nav--right .mega-menu__panel {
  left: auto;
  right: 0;
  transform: translateY(-6px);
}
.sf-v2 .sf-nav .mega-menu__panel:not([hidden]) {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}
.sf-v2 .sf-nav--left .mega-menu__panel:not([hidden]),
.sf-v2 .sf-nav--right .mega-menu__panel:not([hidden]) {
  transform: translateY(0);
}
.sf-v2 .sf-nav .mega-menu__item { margin: 0; }
.sf-v2 .sf-nav .mega-menu__link {
  display: block;
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--sf-muted-strong);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 180ms var(--sf-ease), border-color 180ms var(--sf-ease);
}
.sf-v2 .sf-nav .mega-menu__link:hover {
  color: var(--sf-ink);
  border-bottom-color: var(--sf-gold-line);
}

.sf-v2 .sf-header__mobile {
  display: none;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 0 var(--sf-gutter);
}
.sf-v2 .sf-header__mobile .sf-wordmark { grid-column: 2; justify-self: center; }
.sf-v2 .sf-header__mobile .sf-header__burger { justify-self: start; }
.sf-v2 .sf-header__mobile .sf-header__bag { justify-self: end; }
.sf-v2 .sf-header__burger,
.sf-v2 .sf-header__bag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  min-width: 44px;
  padding: 0 6px;
  background: none;
  border: 0;
  font-family: var(--sf-font-ui);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sf-ink);
  text-decoration: none;
  cursor: pointer;
}
.sf-v2 .sf-header__burger-lines {
  display: inline-grid;
  gap: 4px;
  width: 18px;
}
.sf-v2 .sf-header__burger-lines span {
  display: block;
  height: 1px;
  background: var(--sf-ink);
  transition: transform 260ms var(--sf-ease);
}
.sf-v2 .sf-header__mobile .sf-wordmark { grid-column: auto; }

/* Mobile drawer */
.sf-v2 .sf-drawer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--sf-paper);
  color: var(--sf-ink);
  padding: 0 var(--sf-gutter);
  overflow-y: auto;
  animation: sf-enter 320ms var(--sf-ease) both;
}
.sf-v2 .sf-drawer__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .sf-drawer__close {
  min-height: 44px;
  min-width: 44px;
  background: none;
  border: 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-ink);
  cursor: pointer;
}
.sf-v2 .sf-drawer__body { padding: 22px 0 32px; }
.sf-v2 .sf-drawer__group { border-bottom: 1px solid var(--sf-line-soft); }
.sf-v2 .sf-drawer__group summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  list-style: none;
  cursor: pointer;
  padding: 17px 0;
  font-family: var(--sf-font-display);
  font-size: 28px;
  line-height: 1.05;
  letter-spacing: -0.01em;
}
.sf-v2 .sf-drawer__group summary::-webkit-details-marker { display: none; }
.sf-v2 .sf-drawer__group summary::after {
  content: '+';
  font-family: var(--sf-font-ui);
  font-size: 16px;
  color: var(--sf-gold-ink);
  font-weight: 400;
}
.sf-v2 .sf-drawer__group[open] summary::after { content: '−'; }
.sf-v2 .sf-drawer__links {
  display: grid;
  gap: 2px;
  padding: 0 0 16px 2px;
}
.sf-v2 .sf-drawer__links a {
  padding: 9px 0;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--sf-muted-strong);
  text-decoration: none;
}
.sf-v2 .sf-drawer__links a:hover { color: var(--sf-gold-ink); }
.sf-v2 .sf-drawer__direct {
  display: block;
  padding: 18px 0;
  font-family: var(--sf-font-display);
  font-size: 28px;
  line-height: 1.05;
  text-decoration: none;
}
.sf-v2 .sf-drawer__foot {
  display: grid;
  gap: 14px;
  padding: 22px 0 calc(22px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--sf-line);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .sf-drawer__foot-links { display: flex; flex-wrap: wrap; gap: 10px 22px; }
.sf-v2 .sf-drawer__foot a { text-decoration: none; color: var(--sf-muted-strong); }

.sf-v2.sf-v2--locked { overflow: hidden; }

/* ─────────────────────────────────────────────────────────────────────────────
   3. Footer
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .sf-footer {
  background: var(--sf-ink);
  color: var(--sf-paper);
  padding: clamp(56px, 7vw, 96px) var(--sf-gutter) 28px;
  border-top: 1px solid var(--sf-gold-line);
}
.sf-v2 .sf-footer__top {
  max-width: var(--sf-max);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) repeat(3, minmax(0, 0.7fr));
  gap: clamp(28px, 5vw, 80px);
  padding-bottom: clamp(40px, 6vw, 72px);
  border-bottom: 1px solid rgba(246, 243, 236, 0.14);
}
.sf-v2 .sf-footer__brand {
  font-family: var(--sf-font-display);
  font-size: 34px;
  font-weight: 400;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 16px;
  line-height: 1;
}
.sf-v2 .sf-footer__tagline {
  margin: 0 0 22px;
  max-width: 34ch;
  font-size: 13px;
  line-height: 1.75;
  color: rgba(246, 243, 236, 0.72);
}
.sf-v2 .sf-footer__address {
  margin: 0;
  font-style: normal;
  font-family: var(--sf-font-data);
  font-size: 11px;
  line-height: 1.8;
  letter-spacing: 0.03em;
  color: rgba(246, 243, 236, 0.62);
}
.sf-v2 .sf-footer__address a { color: inherit; text-decoration: underline; text-underline-offset: 4px; }
.sf-v2 .sf-footer__title {
  margin: 0 0 16px;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--sf-gold-light);
}
.sf-v2 .sf-footer__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
.sf-v2 .sf-footer__list a {
  font-size: 13px;
  color: rgba(246, 243, 236, 0.8);
  text-decoration: none;
  transition: color 200ms var(--sf-ease);
}
.sf-v2 .sf-footer__list a:hover { color: var(--sf-gold-light); }
.sf-v2 .sf-footer__note {
  max-width: var(--sf-max);
  margin: 0 auto;
  padding: 22px 0;
  display: grid;
  gap: 8px;
  border-bottom: 1px solid rgba(246, 243, 236, 0.14);
}
.sf-v2 .sf-footer__note p {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(246, 243, 236, 0.62);
}
.sf-v2 .sf-footer__note strong {
  font-weight: 600;
  color: rgba(246, 243, 236, 0.9);
}
.sf-v2 .sf-footer__bottom {
  max-width: var(--sf-max);
  margin: 0 auto;
  padding-top: 22px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(246, 243, 236, 0.55);
}
.sf-v2 .sf-footer__legal { display: flex; flex-wrap: wrap; gap: 10px 22px; }
.sf-v2 .sf-footer__legal a { color: inherit; text-decoration: none; }
.sf-v2 .sf-footer__legal a:hover { color: var(--sf-gold-light); }

/* ─────────────────────────────────────────────────────────────────────────────
   4. Controls
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-cta,
.sf-v2 .btn-primary,
.sf-v2 .btn-secondary,
.sf-v2 .btn-outline,
.sf-v2 .button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 24px;
  border-radius: 0;
  border: 1px solid var(--sf-ink);
  background: var(--sf-ink);
  color: var(--sf-paper);
  font-family: var(--sf-font-ui);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  line-height: 1;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  box-shadow: none;
  transition: color 240ms var(--sf-ease), background 240ms var(--sf-ease), border-color 240ms var(--sf-ease);
}
.sf-v2 .mh-cta::after,
.sf-v2 .btn-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, rgba(232, 201, 106, 0.22) 50%, transparent 80%);
  transform: translateX(-120%) skewX(-12deg);
  transition: transform 640ms var(--sf-ease);
  pointer-events: none;
}
.sf-v2 .mh-cta:hover::after,
.sf-v2 .btn-primary:hover::after { transform: translateX(120%) skewX(-12deg); }
.sf-v2 .mh-cta:hover,
.sf-v2 .btn-primary:hover { background: #000; border-color: #000; }
.sf-v2 .mh-cta--quiet,
.sf-v2 .btn-secondary,
.sf-v2 .btn-outline,
.sf-v2 .button--secondary {
  background: transparent;
  color: var(--sf-ink);
  border-color: var(--sf-gold-line);
}
.sf-v2 .mh-cta--quiet::after,
.sf-v2 .btn-secondary::after,
.sf-v2 .btn-outline::after,
.sf-v2 .button--secondary::after { content: none; }
.sf-v2 .mh-cta--quiet:hover,
.sf-v2 .btn-secondary:hover,
.sf-v2 .btn-outline:hover,
.sf-v2 .button--secondary:hover {
  background: var(--sf-paper-raised);
  border-color: var(--sf-gold-deep);
  color: var(--sf-gold-ink);
}
.sf-v2 .mh-cta + .mh-cta { margin-left: 0; }

.sf-v2 .sf-text-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-ink);
  text-decoration: none;
  border-bottom: 1px solid var(--sf-gold-line);
  transition: color 200ms var(--sf-ease), border-color 200ms var(--sf-ease);
}
.sf-v2 .sf-text-link:hover { color: var(--sf-gold-ink); border-color: var(--sf-gold-deep); }

/* Breadcrumbs */
.sf-v2 .breadcrumbs { margin: 0 0 8px; }
.sf-v2 .breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .breadcrumbs__item { display: inline-flex; align-items: center; gap: 8px; }
.sf-v2 .breadcrumbs__item + .breadcrumbs__item::before {
  content: '';
  width: 14px;
  height: 1px;
  background: var(--sf-line);
}
.sf-v2 .breadcrumbs a { color: var(--sf-muted); text-decoration: none; }
.sf-v2 .breadcrumbs a:hover { color: var(--sf-ink); }
.sf-v2 .breadcrumbs [aria-current='page'] { color: var(--sf-ink); }

/* ─────────────────────────────────────────────────────────────────────────────
   5. Imagery — the light plate
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-plate { display: grid; gap: 9px; margin: 0; }
.sf-v2 .mh-plate__field {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 72% 18%, rgba(232, 201, 106, 0.18) 0%, transparent 58%),
    radial-gradient(90% 90% at 30% 90%, rgba(201, 168, 76, 0.1) 0%, transparent 60%),
    #0c1218;
}
.sf-v2 .mh-plate__field::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 58%, rgba(3, 6, 9, 0.55));
  pointer-events: none;
}
.sf-v2 .mh-plate__shadow {
  position: absolute;
  left: 24%;
  right: 20%;
  bottom: 9%;
  height: 13%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.7), transparent 72%);
  filter: blur(10px);
}
.sf-v2 .mh-plate__stone {
  position: absolute;
  left: 24%;
  top: 22%;
  width: 52%;
  aspect-ratio: 1;
  clip-path: polygon(16% 2%, 84% 2%, 98% 34%, 84% 88%, 50% 100%, 16% 88%, 2% 34%);
  background:
    linear-gradient(132deg, rgba(255, 255, 255, 0.06) 0%, transparent 46%),
    linear-gradient(312deg, rgba(201, 168, 76, 0.16) 0%, transparent 62%),
    #121a22;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.55);
  transform-origin: 50% 50%;
}
.sf-v2 .mh-plate__key {
  position: absolute;
  inset: 0;
  background: linear-gradient(118deg, transparent 26%, rgba(232, 201, 106, 0.5) 48%, rgba(255, 255, 255, 0.12) 52%, transparent 70%);
  mix-blend-mode: screen;
}
.sf-v2 .mh-plate__rim {
  position: absolute;
  inset: 2px;
  clip-path: inherit;
  border: 1px solid rgba(232, 201, 106, 0.38);
}
.sf-v2 .mh-plate__specular {
  position: absolute;
  width: 12%;
  aspect-ratio: 1;
  border-radius: 50%;
  left: 34%;
  top: 30%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0));
}
.sf-v2 .mh-plate__pass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, rgba(245, 232, 192, 0.2) 50%, transparent 100%);
  width: 42%;
  transform: translateX(-140%) skewX(-12deg);
  transition: transform 700ms var(--sf-ease);
}
.sf-v2 .mh-card__link:hover .mh-plate__pass,
.sf-v2 .mh-card__link:focus-visible .mh-plate__pass { transform: translateX(260%) skewX(-12deg); }
.sf-v2 .mh-plate__note {
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .mh-plate--tall .mh-plate__field { aspect-ratio: 3 / 4; }
.sf-v2 .mh-plate--tall .mh-plate__stone { width: 64%; left: 18%; top: 22%; }

/* The AI launcher is a quiet question mark, not a second CTA competing with
   the page's primary action. The label stays in the accessibility tree via
   the button's own aria-label. */
.sf-v2 .ai-concierge-trigger {
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  justify-content: center;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
}
.sf-v2 .ai-concierge-trigger__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. Cards and grids
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .product-grid,
.sf-v2 .mh-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: clamp(28px, 3.6vw, 52px) clamp(16px, 2vw, 28px);
  list-style: none;
  margin: 0;
  padding: 0;
}
.sf-v2 .mh-card-grid--settings { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }

.sf-v2 .mh-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  min-width: 0;
}
.sf-v2 .mh-card__status {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-height: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--sf-line-soft);
}
.sf-v2 .mh-card__kind,
.sf-v2 .mh-card__variety {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .mh-card__ref {
  font-family: var(--sf-font-data);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--sf-muted);
}
.sf-v2 .mh-card__link {
  display: flex;
  flex-direction: column;
  gap: 13px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}
.sf-v2 .mh-card__body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.sf-v2 .mh-card__title {
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(20px, 1.6vw, 25px);
  font-weight: 500;
  line-height: 1.12;
  letter-spacing: -0.008em;
  color: var(--sf-ink);
  text-wrap: pretty;
}
.sf-v2 .mh-card__subtitle,
.sf-v2 .mh-card__meta {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: var(--sf-muted);
}
.sf-v2 .mh-card__meta { font-family: var(--sf-font-data); letter-spacing: 0.02em; }
.sf-v2 .mh-card__foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--sf-line-soft);
}
.sf-v2 .mh-card__price { margin: 0; font-family: var(--sf-font-data); font-size: 13px; color: var(--sf-ink); }
.sf-v2 .mh-card__cue {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sf-gold-ink);
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sf-v2 .mh-card__cue span[aria-hidden='true'] { transition: transform 280ms var(--sf-ease); }
.sf-v2 .mh-card__link:hover .mh-card__cue span[aria-hidden='true'] { transform: translateX(4px); }

/* Badge: a word with a hairline, never a coloured pill. */
.sf-v2 .badge,
.sf-v2 .mh-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 3px 0;
  border: 0;
  border-radius: 0;
  background: none;
  font-family: var(--sf-font-ui);
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-muted-strong);
}
.sf-v2 .badge::before,
.sf-v2 .mh-badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
.sf-v2 .badge--positive { color: #2f6b4f; }
.sf-v2 .badge--warning { color: #7a5a10; }
.sf-v2 .badge--neutral { color: var(--sf-muted); }

/* ─────────────────────────────────────────────────────────────────────────────
   7. Directory, pagination, states, tables, forms
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-directory { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--sf-line); }
.sf-v2 .mh-directory__item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 18px;
  padding: 20px 0;
  border-bottom: 1px solid var(--sf-line);
  position: relative;
}
.sf-v2 .mh-directory__item::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, var(--sf-gold), transparent 70%);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 420ms var(--sf-ease);
}
.sf-v2 .mh-directory__item:hover::after { transform: scaleX(1); }
.sf-v2 .mh-directory__index {
  font-family: var(--sf-font-data);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--sf-muted);
}
.sf-v2 .mh-directory__name {
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(26px, 3vw, 40px);
  font-weight: 400;
  line-height: 1;
}
.sf-v2 .mh-directory__name a { text-decoration: none; color: var(--sf-ink); }
.sf-v2 .mh-directory__links { margin-top: 5px; display: flex; gap: 18px; }
.sf-v2 .mh-directory__links a {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 3px 0;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sf-muted);
  text-decoration: none;
}
.sf-v2 .mh-directory__links a:hover { color: var(--sf-gold-ink); }
.sf-v2 .mh-directory__arrow { color: var(--sf-gold-ink); font-size: 18px; transition: transform 300ms var(--sf-ease); }
.sf-v2 .mh-directory__item:hover .mh-directory__arrow { transform: translateX(4px); }

.sf-v2 .pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 28px;
  border-top: 1px solid var(--sf-line);
  margin-top: 44px;
}
.sf-v2 .pagination a,
.sf-v2 .pagination__next,
.sf-v2 .pagination__prev {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--sf-ink);
  border-bottom: 1px solid var(--sf-gold-line);
}
.sf-v2 .pagination span { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sf-muted); }

.sf-v2 .empty-state,
.sf-v2 .error-state,
.sf-v2 .not-found-view {
  display: grid;
  gap: 14px;
  justify-items: start;
  max-width: 720px;
  padding: clamp(36px, 5vw, 64px) 0;
  border: 0;
  border-top: 1px solid var(--sf-gold-line);
  background: none;
}
.sf-v2 .empty-state__title,
.sf-v2 .error-state__title,
.sf-v2 .not-found-view h1 {
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(30px, 3.6vw, 48px);
  font-weight: 400;
  line-height: 1.02;
  letter-spacing: -0.012em;
}
.sf-v2 .empty-state__body,
.sf-v2 .error-state__body,
.sf-v2 .not-found-view p {
  margin: 0;
  max-width: 58ch;
  color: var(--sf-muted-strong);
}
.sf-v2 .empty-state__action,
.sf-v2 .error-state__recovery,
.sf-v2 .not-found-view__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.sf-v2 .skeleton {
  display: block;
  background: linear-gradient(100deg, var(--sf-paper-deep) 0%, #f3efe6 45%, var(--sf-paper-deep) 100%);
  border: 0;
  border-radius: 0;
  animation: sf-shimmer 1.8s linear infinite;
}
.sf-v2 .list-skeleton { display: grid; gap: 24px; padding: clamp(32px, 5vw, 64px) var(--sf-gutter); max-width: var(--sf-max); margin: 0 auto; }

.sf-v2 .mh-table-scroll { overflow-x: auto; border-top: 1px solid var(--sf-line); }
.sf-v2 .mh-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.sf-v2 .mh-table th,
.sf-v2 .mh-table td {
  text-align: left;
  padding: 13px 14px 13px 0;
  border-bottom: 1px solid var(--sf-line-soft);
  vertical-align: top;
}
.sf-v2 .mh-table thead th {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sf-muted);
  border-bottom-color: var(--sf-line);
}
.sf-v2 .mh-table tbody th { font-weight: 500; }
.sf-v2 .mh-table__sub { display: block; margin-top: 3px; font-size: 10px; color: var(--sf-muted); }
.sf-v2 .spec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sf-v2 .spec-table caption { text-align: left; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted); padding-bottom: 10px; }
.sf-v2 .spec-table th,
.sf-v2 .spec-table td { text-align: left; padding: 11px 12px 11px 0; border-bottom: 1px solid var(--sf-line-soft); }
.sf-v2 .spec-table th { width: 42%; font-weight: 500; color: var(--sf-muted); }
.sf-v2 .spec-table td { font-family: var(--sf-font-data); font-size: 12px; }

.sf-v2 .mh-notice {
  padding: 14px 16px;
  border-left: 2px solid var(--sf-gold);
  background: var(--sf-paper-raised);
  font-size: 12px;
  line-height: 1.6;
  color: var(--sf-muted-strong);
}
.sf-v2 .mh-notice strong { color: var(--sf-ink); }

/* Forms. One hairline field, no rounded corners, 44px floor. */
.sf-v2 input[type='text'],
.sf-v2 input[type='email'],
.sf-v2 input[type='password'],
.sf-v2 input[type='search'],
.sf-v2 input[type='tel'],
.sf-v2 select,
.sf-v2 textarea {
  width: 100%;
  min-height: 46px;
  padding: 12px 13px;
  background: var(--sf-paper-raised);
  border: 1px solid var(--sf-line);
  border-radius: 0;
  color: var(--sf-ink);
  font-family: var(--sf-font-ui);
  font-size: 14px;
  line-height: 1.4;
}
.sf-v2 input:focus,
.sf-v2 select:focus,
.sf-v2 textarea:focus {
  outline: 2px solid var(--sf-ink);
  outline-offset: 1px;
  border-color: var(--sf-ink);
}
.sf-v2 label { font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted-strong); }

/* ─────────────────────────────────────────────────────────────────────────────
   8. Home
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .sf-home { display: block; }

/* The hero is full-bleed; every section after it rides the same max-width and
   gutter as the catalogue pages, so the left edge never drifts. */
.sf-v2 .sf-home > .sf-home__lede,
.sf-v2 .sf-home > .sf-section,
.sf-v2 .sf-home > .sf-evidence {
  max-width: var(--sf-max);
  margin-inline: auto;
  padding-inline: var(--sf-gutter);
}
.sf-v2 .sf-settings-preview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  max-width: 960px;
}

.sf-v2 .sf-hero {
  position: relative;
  overflow: hidden;
  background: var(--sf-ink);
  color: var(--sf-paper);
  min-height: min(760px, calc(100vh - 110px));
  display: grid;
  align-items: center;
  padding: clamp(48px, 7vw, 92px) var(--sf-gutter);
  border-bottom: 1px solid var(--sf-gold-line);
}
.sf-v2 .sf-hero__inner {
  width: 100%;
  max-width: var(--sf-max);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  align-items: center;
  gap: clamp(32px, 6vw, 96px);
}
.sf-v2 .sf-hero__copy { position: relative; z-index: 2; }
.sf-v2 .sf-hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 26px;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(246, 243, 236, 0.64);
}
.sf-v2 .sf-hero__eyebrow::before { content: ''; width: 30px; height: 1px; background: var(--sf-gold); }
.sf-v2 .sf-hero__title {
  margin: 0;
  font-family: var(--sf-font-display);
  font-weight: 400;
  font-size: clamp(58px, 8.5vw, 126px);
  line-height: 0.88;
  letter-spacing: -0.03em;
  text-wrap: balance;
}
.sf-v2 .sf-hero__title em {
  font-style: italic;
  background: linear-gradient(100deg, #e8c96a 0%, #c9a84c 45%, #f5e8c0 72%, #c9a84c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.sf-v2 .sf-hero__lead {
  margin: 30px 0 0;
  max-width: 42ch;
  font-size: clamp(15px, 1.4vw, 17px);
  line-height: 1.7;
  color: rgba(246, 243, 236, 0.76);
}
.sf-v2 .sf-hero__actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 38px; }
.sf-v2 .sf-hero .mh-cta {
  background: var(--sf-paper);
  color: var(--sf-ink);
  border-color: var(--sf-paper);
}
.sf-v2 .sf-hero .mh-cta:hover { background: #fff; border-color: #fff; }
.sf-v2 .sf-hero .mh-cta--quiet {
  background: transparent;
  color: var(--sf-paper);
  border-color: rgba(201, 168, 76, 0.55);
}
.sf-v2 .sf-hero .mh-cta--quiet:hover { background: rgba(246, 243, 236, 0.06); color: var(--sf-gold-light); }
.sf-v2 .sf-hero__study {
  position: relative;
  justify-self: end;
  width: min(100%, 560px);
  aspect-ratio: 1 / 1.06;
}
.sf-v2 .sf-hero__study::before {
  content: '';
  position: absolute;
  inset: -8%;
  background: radial-gradient(closest-side, rgba(232, 201, 106, 0.16), transparent 72%);
  filter: blur(6px);
}
.sf-v2 .sf-stone {
  position: absolute;
  inset: 6%;
  clip-path: polygon(18% 2%, 82% 2%, 98% 30%, 86% 82%, 50% 100%, 14% 82%, 2% 30%);
  background:
    linear-gradient(128deg, rgba(255, 255, 255, 0.07) 0%, transparent 42%),
    linear-gradient(318deg, rgba(201, 168, 76, 0.2) 0%, transparent 58%),
    #121a22;
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.6);
  animation: sf-hold 14s ease-in-out infinite alternate;
}
.sf-v2 .sf-stone__key {
  position: absolute;
  inset: 0;
  background: linear-gradient(116deg, transparent 24%, rgba(232, 201, 106, 0.52) 46%, rgba(255, 255, 255, 0.14) 51%, transparent 68%);
  mix-blend-mode: screen;
}
.sf-v2 .sf-stone__facet {
  position: absolute;
  inset: 8%;
  clip-path: inherit;
  border: 1px solid rgba(232, 201, 106, 0.28);
  opacity: 0.7;
}
.sf-v2 .sf-stone__glint {
  position: absolute;
  width: 11%;
  aspect-ratio: 1;
  border-radius: 50%;
  left: 33%;
  top: 28%;
  background: radial-gradient(closest-side, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0));
}
.sf-v2 .sf-hero__caption {
  position: absolute;
  left: 8%;
  bottom: 0;
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(246, 243, 236, 0.62);
}
.sf-v2 .sf-hero__index {
  position: absolute;
  right: var(--sf-gutter);
  bottom: clamp(28px, 4vw, 44px);
  margin: 0;
  font-family: var(--sf-font-data);
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(246, 243, 236, 0.72);
  writing-mode: vertical-rl;
}

.sf-v2 .sf-home__lede {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(28px, 6vw, 96px);
  align-items: start;
  padding-block: clamp(56px, 8vw, 108px);
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .sf-home__lede p {
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(26px, 3vw, 42px);
  line-height: 1.16;
  letter-spacing: -0.012em;
  text-wrap: balance;
}
.sf-v2 .sf-home__lede-note {
  font-family: var(--sf-font-ui) !important;
  font-size: 14px !important;
  line-height: 1.75 !important;
  color: var(--sf-muted-strong);
  max-width: 46ch;
}
.sf-v2 .sf-home__doors {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .sf-door {
  display: grid;
  align-content: space-between;
  gap: 40px;
  min-height: 290px;
  padding: clamp(24px, 3.4vw, 44px);
  border-right: 1px solid var(--sf-line);
  text-decoration: none;
  color: inherit;
  position: relative;
  overflow: hidden;
  transition: background 300ms var(--sf-ease);
}
.sf-v2 .sf-door:last-child { border-right: 0; }
.sf-v2 .sf-door:hover { background: var(--sf-paper-raised); }
.sf-v2 .sf-door__index { font-family: var(--sf-font-data); font-size: 9px; color: var(--sf-gold-ink); letter-spacing: 0.1em; }
.sf-v2 .sf-door__title {
  display: block;
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(30px, 3.4vw, 48px);
  font-weight: 400;
  line-height: 0.98;
}
.sf-v2 .sf-door__note { display: block; margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: var(--sf-muted); }
.sf-v2 .sf-door__cue {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sf-gold-ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sf-v2 .sf-door__cue span[aria-hidden='true'] { transition: transform 300ms var(--sf-ease); }
.sf-v2 .sf-door:hover .sf-door__cue span[aria-hidden='true'] { transform: translateX(5px); }

.sf-v2 .sf-variety-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0 clamp(20px, 4vw, 60px);
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--sf-line);
}
.sf-v2 .sf-variety-list li { border-bottom: 1px solid var(--sf-line); }
.sf-v2 .sf-variety-list a {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0;
  text-decoration: none;
  color: var(--sf-ink);
}
.sf-v2 .sf-variety-list .sf-variety-name {
  font-family: var(--sf-font-display);
  font-size: clamp(24px, 2.4vw, 34px);
  line-height: 1;
}
.sf-v2 .sf-variety-list .sf-variety-meta {
  font-family: var(--sf-font-data);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .sf-variety-list a:hover .sf-variety-name { color: var(--sf-gold-ink); }

.sf-v2 .sf-colour-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.sf-v2 .sf-colour-row a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--sf-line);
  text-decoration: none;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sf-ink);
  transition: border-color 220ms var(--sf-ease), color 220ms var(--sf-ease);
}
.sf-v2 .sf-colour-row a:hover { border-color: var(--sf-gold-deep); color: var(--sf-gold-ink); }
.sf-v2 .sf-colour-row i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(11, 17, 23, 0.18);
}

.sf-v2 .sf-process {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 4vw, 56px);
  counter-reset: sf-step;
}
.sf-v2 .sf-process__step { padding-top: 18px; border-top: 1px solid var(--sf-line); }
.sf-v2 .sf-process__step::before {
  counter-increment: sf-step;
  content: '0' counter(sf-step);
  display: block;
  margin-bottom: 18px;
  font-family: var(--sf-font-data);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--sf-gold-ink);
}
.sf-v2 .sf-process__step h3 {
  margin: 0 0 8px;
  font-family: var(--sf-font-display);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.05;
}
.sf-v2 .sf-process__step p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--sf-muted); }

.sf-v2 .sf-evidence {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: clamp(24px, 5vw, 72px);
  align-items: start;
  padding-block: clamp(56px, 7vw, 92px);
  border-top: 1px solid var(--sf-gold-line);
}
.sf-v2 .sf-evidence h2 {
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(34px, 4vw, 56px);
  font-weight: 400;
  line-height: 0.98;
}
.sf-v2 .sf-evidence p { margin: 0 0 14px; font-size: 14px; line-height: 1.75; color: var(--sf-muted-strong); }
.sf-v2 .sf-evidence p:last-child { margin-bottom: 0; }
.sf-v2 .sf-evidence code {
  font-family: var(--sf-font-data);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--sf-gold-ink);
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. Detail pages
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-pdp { display: grid; gap: clamp(44px, 6vw, 88px); }
.sf-v2 .mh-pdp__top {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: clamp(32px, 6vw, 96px);
  align-items: start;
}
.sf-v2 .mh-pdp__study { position: sticky; top: 130px; display: grid; gap: 10px; }
.sf-v2 .mh-pdp__study-note { margin: 0; font-size: 10px; line-height: 1.6; color: var(--sf-muted); max-width: 42ch; }
.sf-v2 .mh-pdp__summary { display: grid; gap: 18px; align-content: start; padding-top: 8px; }
.sf-v2 .mh-pdp__summary h1 {
  margin: 0;
  font-family: var(--sf-font-display);
  font-size: clamp(42px, 5.6vw, 76px);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.sf-v2 .mh-pdp__subtitle { margin: 0; font-size: 15px; color: var(--sf-muted-strong); }
.sf-v2 .mh-pdp__ref {
  margin: 0;
  font-family: var(--sf-font-data);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .mh-pdp__badges { display: flex; flex-wrap: wrap; gap: 8px 18px; padding-block: 4px; }
.sf-v2 .mh-pdp__price-block {
  display: grid;
  gap: 6px;
  padding: 22px 0;
  border-top: 1px solid var(--sf-line);
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .mh-pdp__price { margin: 0; font-family: var(--sf-font-data); font-size: clamp(24px, 2.4vw, 32px); letter-spacing: -0.02em; }
.sf-v2 .mh-pdp__price-note { margin: 0; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sf-muted); display: flex; align-items: center; gap: 8px; }
.sf-v2 .mh-pdp__short { margin: 0; font-size: 14px; line-height: 1.75; color: var(--sf-muted-strong); max-width: 54ch; }
.sf-v2 .mh-pdp__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; }
.sf-v2 .mh-pdp__webar { margin-top: 10px; }
.sf-v2 .mh-pdp__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(28px, 4vw, 56px);
  padding-top: clamp(28px, 4vw, 48px);
  border-top: 1px solid var(--sf-gold-line);
}
.sf-v2 .mh-pdp__panel { display: grid; gap: 14px; align-content: start; }
.sf-v2 .mh-pdp__panel--wide { grid-column: 1 / -1; }
.sf-v2 .mh-pdp__panel h2 {
  margin: 0;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--sf-muted);
}
.sf-v2 .mh-pdp__muted { margin: 0; color: var(--sf-muted); font-size: 13px; }
.sf-v2 .mh-pdp__evidence-note { margin: 0; font-size: 11px; line-height: 1.65; color: var(--sf-muted); max-width: 64ch; }
.sf-v2 .mh-pdp__description { margin: 0; max-width: 78ch; font-size: 14px; line-height: 1.8; color: var(--sf-muted-strong); }
.sf-v2 .mh-provenance {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(120px, 0.4fr) minmax(0, 1fr);
  gap: 9px 20px;
  font-size: 12px;
}
.sf-v2 .mh-provenance dt { color: var(--sf-muted); }
.sf-v2 .mh-provenance dd { margin: 0; color: var(--sf-ink); }
.sf-v2 .mh-provenance__url { font-family: var(--sf-font-data); font-size: 10px; overflow-wrap: anywhere; color: var(--sf-muted-strong); }
.sf-v2 .mh-evidence {
  font-family: var(--sf-font-data);
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--sf-muted-strong);
  border-bottom: 1px solid var(--sf-gold-line);
  padding-bottom: 1px;
}
.sf-v2 .mh-evidence--verified { color: #2f6b4f; }
.sf-v2 .mh-evidence--inferred,
.sf-v2 .mh-evidence--unknown { color: #7a5a10; }

/* ─────────────────────────────────────────────────────────────────────────────
   10. Search
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-search-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0;
  max-width: 880px;
  border-bottom: 1px solid var(--sf-ink);
}
.sf-v2 .mh-search-form__input {
  border: 0;
  border-radius: 0;
  background: transparent;
  min-height: 58px;
  padding: 8px 2px;
  font-family: var(--sf-font-display);
  font-size: clamp(22px, 2.6vw, 32px);
  color: var(--sf-ink);
}
.sf-v2 .mh-search-form__input:focus { outline: 2px solid var(--sf-ink); outline-offset: 2px; }
.sf-v2 .mh-search-form__submit { min-height: 48px; align-self: center; padding: 0 22px; }

.sf-v2 .mh-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.sf-v2 .mh-chips__label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid var(--sf-gold-line-soft);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-decoration: none;
  color: var(--sf-ink);
}
.sf-v2 .mh-chip:hover { border-color: var(--sf-gold-deep); }
.sf-v2 .mh-chips__clear { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sf-gold-ink); text-decoration: none; min-height: 34px; display: inline-flex; align-items: center; }

.sf-v2 .mh-search__layout {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: clamp(28px, 5vw, 72px);
  align-items: start;
}
.sf-v2 .mh-facets { position: sticky; top: 132px; display: grid; gap: 22px; }
.sf-v2 .mh-facets__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--sf-line); }
.sf-v2 .mh-facets__head h2 { margin: 0; font-size: 9.5px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--sf-ink); }
.sf-v2 .mh-facets__reset { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sf-muted); text-decoration: none; }
.sf-v2 .mh-facet { display: grid; gap: 8px; }
.sf-v2 .mh-facet__title { margin: 0; font-size: 9px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-facet__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }
.sf-v2 .mh-facet__link {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 6px;
  min-height: 32px;
  padding: 5px 0;
  font-size: 12px;
  color: var(--sf-muted-strong);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.sf-v2 .mh-facet__link:hover { color: var(--sf-ink); border-bottom-color: var(--sf-line); }
.sf-v2 .mh-facet__link[aria-current='true'] { color: var(--sf-ink); }
.sf-v2 .mh-facet__mark { width: 9px; height: 1px; background: var(--sf-line); align-self: center; transition: background 180ms var(--sf-ease), width 180ms var(--sf-ease); }
.sf-v2 .mh-facet__link[aria-current='true'] .mh-facet__mark { background: var(--sf-gold-deep); width: 12px; }
.sf-v2 .mh-facet__count { font-family: var(--sf-font-data); font-size: 9px; color: var(--sf-muted); }
.sf-v2 .mh-search__results { display: grid; gap: 24px; min-width: 0; }
.sf-v2 .mh-search__meta { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 12px 24px; padding-bottom: 14px; border-bottom: 1px solid var(--sf-line); }
.sf-v2 .mh-search__count { margin: 0; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-search__count em { font-family: var(--sf-font-display); font-size: 19px; font-style: italic; text-transform: none; letter-spacing: 0; color: var(--sf-ink); }
.sf-v2 .mh-sort { display: flex; align-items: baseline; gap: 16px; }
.sf-v2 .mh-sort__label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-sort__link { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sf-muted-strong); text-decoration: none; min-height: 32px; display: inline-flex; align-items: center; }
.sf-v2 .mh-sort__link[aria-current='true'] { color: var(--sf-ink); border-bottom: 1px solid var(--sf-gold); }

/* ─────────────────────────────────────────────────────────────────────────────
   11. Cart & checkout
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .mh-cart { display: grid; gap: clamp(28px, 4vw, 52px); }
.sf-v2 .mh-cart--state {
  max-width: 760px;
  margin: 0;
  padding-block: 12px 0;
  text-align: left;
}
.sf-v2 .mh-cart--state h1 {
  margin: 8px 0 0;
  font-family: var(--sf-font-display);
  font-size: clamp(44px, 6vw, 76px);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.02em;
}
.sf-v2 .mh-cart__lead { margin: 16px 0 0; max-width: 52ch; color: var(--sf-muted-strong); }
.sf-v2 .mh-cart__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 26px; }
.sf-v2 .mh-cart__head { display: grid; gap: 8px; padding-bottom: 20px; border-bottom: 1px solid var(--sf-gold-line); }
.sf-v2 .mh-cart__head h1 { margin: 0; font-family: var(--sf-font-display); font-size: clamp(42px, 5vw, 68px); font-weight: 400; line-height: 0.96; letter-spacing: -0.02em; }
.sf-v2 .mh-cart__count { margin: 0; font-family: var(--sf-font-data); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-cart__layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: clamp(28px, 5vw, 72px); align-items: start; }
.sf-v2 .mh-cart__list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--sf-line); }
.sf-v2 .mh-cart__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 110px;
  align-items: baseline;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .mh-cart__title { margin: 0; font-family: var(--sf-font-display); font-size: 24px; font-weight: 500; line-height: 1.1; }
.sf-v2 .mh-cart__sku { margin: 4px 0 0; font-family: var(--sf-font-data); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-cart__qty,
.sf-v2 .mh-cart__amount { margin: 0; font-family: var(--sf-font-data); font-size: 12px; text-align: right; }
.sf-v2 .mh-cart__label { font-size: 9px; letter-spacing: 0.14em; color: var(--sf-muted); }
.sf-v2 .mh-cart__continue { display: inline-flex; align-items: center; gap: 10px; margin-top: 20px; min-height: 44px; font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted-strong); text-decoration: none; }
.sf-v2 .mh-cart__summary { position: sticky; top: 132px; display: grid; gap: 14px; padding: 24px; border: 1px solid var(--sf-gold-line-soft); background: var(--sf-paper-raised); }
.sf-v2 .mh-cart__summary h2 { margin: 0 0 4px; font-size: 9.5px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .mh-cart__row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--sf-line); border-bottom: 1px solid var(--sf-line); font-size: 13px; }
.sf-v2 .mh-cart__row span:last-child { font-family: var(--sf-font-data); font-size: 15px; }
.sf-v2 .mh-cart__note { margin: 0; font-size: 11px; line-height: 1.65; color: var(--sf-muted); }
.sf-v2 .mh-cart__checkout { width: 100%; margin-top: 4px; }
.sf-v2 .mh-cart__loading { margin: 0; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted); }

.sf-v2 .sf-checkout { display: grid; gap: clamp(28px, 4vw, 48px); max-width: 980px; }
.sf-v2 .sf-steps { display: flex; flex-wrap: wrap; gap: 8px 0; list-style: none; margin: 0; padding: 0; border-bottom: 1px solid var(--sf-line); }
.sf-v2 .sf-steps li { display: flex; align-items: center; gap: 10px; padding: 0 18px 14px 0; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .sf-steps li::after { content: ''; width: 24px; height: 1px; background: var(--sf-line); margin-left: 8px; }
.sf-v2 .sf-steps li:last-child::after { display: none; }
.sf-v2 .sf-steps [aria-current='step'] { color: var(--sf-ink); }
.sf-v2 .sf-steps .sf-steps__num { font-family: var(--sf-font-data); font-size: 9px; color: var(--sf-gold-ink); }
.sf-v2 .sf-checkout__panel { display: grid; gap: 16px; padding: 24px 0; border-top: 1px solid var(--sf-line); }
.sf-v2 .sf-checkout__panel h2 { margin: 0; font-family: var(--sf-font-display); font-size: 28px; font-weight: 400; }
.sf-v2 .sf-checkout__panel p { margin: 0; max-width: 62ch; font-size: 13px; line-height: 1.75; color: var(--sf-muted-strong); }
.sf-v2 .sf-checkout__actions { display: flex; flex-wrap: wrap; gap: 12px; }
.sf-v2 .sf-checkout__notice { padding: 16px 18px; border-left: 2px solid var(--sf-gold); background: var(--sf-paper-raised); font-size: 12px; line-height: 1.65; color: var(--sf-muted-strong); }

/* ─────────────────────────────────────────────────────────────────────────────
   12. Editorial, contact, showroom, policy
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .sf-editorial-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(24px, 4vw, 56px);
}
.sf-v2 .sf-editorial {
  display: grid;
  align-content: start;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid var(--sf-line);
}
.sf-v2 .sf-editorial__index { font-family: var(--sf-font-data); font-size: 9px; color: var(--sf-gold-ink); letter-spacing: 0.1em; }
.sf-v2 .sf-editorial h2,
.sf-v2 .sf-editorial h3 { margin: 0; font-family: var(--sf-font-display); font-size: clamp(24px, 2.4vw, 32px); font-weight: 400; line-height: 1.05; }
.sf-v2 .sf-editorial p { margin: 0; font-size: 13px; line-height: 1.75; color: var(--sf-muted); }
.sf-v2 .sf-editorial a { text-decoration: none; }
.sf-v2 .sf-editorial a:hover h2,
.sf-v2 .sf-editorial a:hover h3 { color: var(--sf-gold-ink); }

.sf-v2 .sf-contact-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(32px, 6vw, 96px);
  align-items: start;
}
.sf-v2 .sf-address { margin: 0; font-style: normal; }
.sf-v2 .sf-address__name { display: block; margin-bottom: 12px; font-family: var(--sf-font-display); font-size: 32px; line-height: 1; }
.sf-v2 .sf-address__lines { display: block; font-size: 14px; line-height: 1.75; color: var(--sf-muted-strong); }
.sf-v2 .sf-address__phone { display: inline-block; margin-top: 14px; font-family: var(--sf-font-data); font-size: 14px; letter-spacing: 0.02em; color: var(--sf-ink); text-decoration: none; border-bottom: 1px solid var(--sf-gold-line); }
.sf-v2 .sf-contact-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--sf-line); }
.sf-v2 .sf-contact-list li { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--sf-line); font-family: var(--sf-font-ui); font-size: 13px; }
.sf-v2 .sf-contact-list dt,
.sf-v2 .sf-contact-list .sf-contact-list__label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .sf-contact-list dd { margin: 0; color: var(--sf-muted-strong); }

.sf-v2 .sf-prose { max-width: 68ch; display: grid; gap: 18px; }
.sf-v2 .sf-prose h2 { margin: 28px 0 0; font-family: var(--sf-font-display); font-size: 32px; font-weight: 400; line-height: 1.1; }
.sf-v2 .sf-prose p { margin: 0; font-size: 14px; line-height: 1.8; color: var(--sf-muted-strong); }
.sf-v2 .sf-prose ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: 14px; line-height: 1.75; color: var(--sf-muted-strong); }

.sf-v2 .sf-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(32px, 6vw, 96px);
  align-items: start;
}
.sf-v2 .sf-aside-note {
  padding: 18px 0 0;
  border: 0;
  border-top: 1px solid var(--sf-gold-line);
  background: none;
  display: grid;
  gap: 10px;
}
.sf-v2 .sf-aside-note h2 { margin: 0; font-size: 9.5px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .sf-aside-note p { margin: 0; font-size: 12px; line-height: 1.7; color: var(--sf-muted-strong); }
.sf-v2 .sf-aside-note .sf-footer__list a { color: var(--sf-muted-strong); }
.sf-v2 .sf-aside-note .sf-footer__list a:hover { color: var(--sf-gold-ink); }
.sf-v2 .sf-steps a { color: inherit; text-decoration: none; }
.sf-v2 .sf-steps a:hover { color: var(--sf-gold-ink); }

/* ─────────────────────────────────────────────────────────────────────────────
   13. Auth (storefront + console sign-in)
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .auth-shell,
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(32px, 6vw, 72px) 20px;
  background: #0b1117;
  color: #f6f3ec;
}
.auth-shell { color-scheme: dark; }
.auth-shell__frame {
  width: 100%;
  max-width: 960px;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  border: 1px solid rgba(201, 168, 76, 0.35);
  background: #f6f3ec;
  color: #0b1117;
}
.auth-shell__aside {
  padding: clamp(28px, 4vw, 48px);
  background:
    radial-gradient(120% 80% at 70% 10%, rgba(232, 201, 106, 0.14), transparent 60%),
    #0b1117;
  color: #f6f3ec;
  display: grid;
  align-content: space-between;
  gap: 40px;
  border-right: 1px solid rgba(201, 168, 76, 0.35);
}
.auth-shell__brand {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 22px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  line-height: 1;
  margin: 0;
}
.auth-shell__aside-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.8;
  color: rgba(246, 243, 236, 0.62);
  max-width: 30ch;
}
.auth-shell__panel { padding: clamp(28px, 4vw, 48px); display: grid; gap: 8px; align-content: start; }
.auth-shell__eyebrow {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #7a5a10;
}
.auth-shell__title {
  margin: 6px 0 6px;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: clamp(34px, 4vw, 44px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.015em;
}
.auth-shell__subtitle { margin: 0 0 22px; font-size: 13px; line-height: 1.7; color: #5f5a50; }
.auth-shell__footer { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(11, 17, 23, 0.12); font-size: 12px; color: #5f5a50; }
.auth-shell__footer a { color: #6e4f0e; text-underline-offset: 3px; }
.auth-shell input {
  width: 100%;
  min-height: 46px;
  padding: 12px 13px;
  background: #fff;
  border: 1px solid rgba(11, 17, 23, 0.18);
  border-radius: 0;
  color: #0b1117;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
}
.auth-shell input:focus { outline: 2px solid #0b1117; outline-offset: 1px; }
.auth-shell label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #474339; }
.auth-shell button[type='submit'] {
  min-height: 48px;
  width: 100%;
  border: 1px solid #0b1117;
  background: #0b1117;
  color: #f6f3ec;
  border-radius: 0;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
}
.auth-shell button[type='submit']:hover { background: #000; }
.auth-shell button[type='submit']:disabled { opacity: 0.55; cursor: progress; }

/* The console sign-in is not inside .sf-v2; it borrows the same frame. */
.console-auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(28px, 5vw, 64px) 20px;
  background:
    radial-gradient(100% 70% at 70% 0%, rgba(201, 168, 76, 0.12), transparent 60%),
    #0b1117;
  color: #f6f3ec;
  font-family: 'Inter', system-ui, sans-serif;
}
.console-auth__card {
  width: 100%;
  max-width: 440px;
  background: #f6f3ec;
  color: #0b1117;
  border: 1px solid rgba(201, 168, 76, 0.35);
  padding: clamp(28px, 5vw, 44px);
}
.console-auth__brand { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 19px; letter-spacing: 0.26em; text-transform: uppercase; }
.console-auth__title { margin: 10px 0 6px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 36px; font-weight: 400; line-height: 1; }
.console-auth__note { margin: 0 0 24px; font-size: 12.5px; line-height: 1.7; color: #5f5a50; }
.console-auth__link { display: inline-flex; align-items: center; min-height: 44px; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #6e4f0e; text-decoration: none; }
.console-auth input {
  width: 100%;
  min-height: 46px;
  padding: 12px 13px;
  background: #fff;
  border: 1px solid rgba(11, 17, 23, 0.18);
  border-radius: 0;
  color: #0b1117;
  font-family: inherit;
  font-size: 14px;
}
.console-auth label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #474339; }
.console-auth__form { display: grid; gap: 14px; max-width: 380px; }
.console-auth__form label { display: grid; gap: 6px; }
.console-auth button[type='submit'] {
  min-height: 48px;
  width: 100%;
  border: 1px solid #0b1117;
  background: #0b1117;
  color: #f6f3ec;
  border-radius: 0;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
}

/* Standalone error / not-found page (no storefront header is available when
   the root boundary replaces the tree). */
.error-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 40px 24px;
  background:
    radial-gradient(90% 60% at 70% 0%, rgba(201, 168, 76, 0.12), transparent 60%),
    #0b1117;
  color: #f6f3ec;
  font-family: 'Inter', system-ui, sans-serif;
}
.error-page__frame { width: 100%; max-width: 720px; border-top: 1px solid rgba(201, 168, 76, 0.55); padding-top: 28px; }
.error-page__brand { margin: 0 0 40px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 19px; letter-spacing: 0.28em; text-transform: uppercase; }
.error-page__eyebrow { margin: 0 0 12px; font-size: 9px; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: #e8c96a; }
.error-page__title { margin: 0 0 16px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(40px, 6vw, 72px); font-weight: 400; line-height: 0.95; letter-spacing: -0.02em; }
.error-page__body { margin: 0 0 28px; max-width: 52ch; font-size: 14px; line-height: 1.75; color: rgba(246, 243, 236, 0.7); }
.error-page__actions { display: flex; flex-wrap: wrap; gap: 12px; }
.error-page__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  border: 1px solid #f6f3ec;
  background: #f6f3ec;
  color: #0b1117;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}
.error-page__button--quiet { background: transparent; color: #f6f3ec; border-color: rgba(201, 168, 76, 0.55); }
.error-page__link { display: inline-flex; align-items: center; min-height: 44px; font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; color: #e8c96a; text-decoration: none; }

/* ─────────────────────────────────────────────────────────────────────────────
   14. DYO
   ───────────────────────────────────────────────────────────────────────────── */
.sf-v2 .dyo-container { max-width: 1180px; margin: 0 auto; display: grid; gap: clamp(28px, 4vw, 48px); }
.sf-v2 .dyo-step-indicator {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 0;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--sf-line);
}
.sf-v2 .dyo-step-btn {
  appearance: none;
  background: none;
  border: 0;
  padding: 0 18px 0 0;
  min-height: 40px;
  font-family: var(--sf-font-ui);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sf-muted);
  cursor: pointer;
}
.sf-v2 .dyo-step-btn--active { color: var(--sf-ink); box-shadow: inset 0 -1px 0 var(--sf-gold); }
.sf-v2 .dyo-step-btn--completed { color: var(--sf-gold-ink); }
.sf-v2 .dyo-panel {
  display: grid;
  gap: clamp(24px, 3vw, 36px);
  padding: 0;
  background: none;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
.sf-v2 .dyo-header {
  display: grid;
  gap: 10px;
  max-width: 760px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--sf-gold-line);
  text-align: left;
}
.sf-v2 .dyo-step-indicator { justify-content: flex-start; }
.sf-v2 .dyo-header h1,
.sf-v2 .dyo-header h2 { margin: 0; font-family: var(--sf-font-display); font-weight: 400; font-size: clamp(32px, 4vw, 52px); line-height: 0.98; letter-spacing: -0.015em; }
.sf-v2 .dyo-header p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--sf-muted); }
.sf-v2 .dyo-grid-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
.sf-v2 .dyo-option-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  background: none;
  border: 0;
  border-top: 1px solid var(--sf-line);
  border-radius: 0;
  cursor: pointer;
  padding-top: 12px;
  transition: border-color 220ms var(--sf-ease);
}
.sf-v2 .dyo-option-card:hover { border-top-color: var(--sf-gold); }
.sf-v2 .dyo-option-card--selected { border-top-color: var(--sf-ink); box-shadow: inset 0 1px 0 var(--sf-gold); }
.sf-v2 .dyo-option-media {
  position: relative;
  aspect-ratio: 4 / 3;
  background:
    radial-gradient(120% 90% at 70% 16%, rgba(232, 201, 106, 0.16), transparent 58%),
    #0c1218;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.sf-v2 .dyo-option-media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(118deg, transparent 30%, rgba(232, 201, 106, 0.14) 50%, transparent 70%);
}
.sf-v2 .dyo-option-media img { max-width: 66%; max-height: 66%; object-fit: contain; filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.45)); }
.sf-v2 .dyo-option-title { margin: 0; font-family: var(--sf-font-display); font-size: 22px; font-weight: 500; line-height: 1.05; }
.sf-v2 .dyo-option-price { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--sf-line-soft); font-family: var(--sf-font-data); font-size: 12px; }
.sf-v2 .dyo-summary-card { align-self: start; display: grid; gap: 0; padding: 22px; border: 1px solid var(--sf-gold-line-soft); background: var(--sf-paper-raised); }
.sf-v2 .dyo-summary-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--sf-line); font-size: 12px; color: var(--sf-muted-strong); }
.sf-v2 .dyo-summary-row--total { border-bottom: 0; padding-top: 16px; font-family: var(--sf-font-data); font-size: 17px; color: var(--sf-ink); }
.sf-v2 .sf-field { display: grid; gap: 7px; }
.sf-v2 .sf-field-note { font-size: 10px; line-height: 1.6; color: var(--sf-muted); }
.sf-v2 .sf-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; }
.sf-v2 .sf-invariant-list { display: grid; gap: 8px; padding: 16px 18px; border: 1px solid var(--sf-line); background: var(--sf-paper-raised); font-size: 11px; line-height: 1.6; color: var(--sf-muted-strong); }
.sf-v2 .sf-invariant-list strong { color: var(--sf-ink); }
.sf-v2 .sf-banner { padding: 12px 14px; border-left: 2px solid var(--sf-line); font-size: 11px; line-height: 1.6; color: var(--sf-muted-strong); }
.sf-v2 .sf-banner--ok { border-left-color: #2f6b4f; }
.sf-v2 .sf-banner--bad { border-left-color: #9a3412; }

/* Admin / vendor / miscellaneous additive classes used by rewritten pages */
.sf-v2 .sf-meta-line { display: flex; flex-wrap: wrap; gap: 8px 18px; font-family: var(--sf-font-data); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sf-muted); }
.sf-v2 .sf-form-stack { display: grid; gap: 18px; max-width: 460px; }
.sf-v2 .sf-fine-print { margin: 0; font-size: 11px; line-height: 1.7; color: var(--sf-muted); }

/* ─────────────────────────────────────────────────────────────────────────────
   15. Motion — Enter / Pass / Hold only
   ───────────────────────────────────────────────────────────────────────────── */
@keyframes sf-enter {
  from { opacity: 0; transform: translateY(12px); filter: blur(3px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
@keyframes sf-hold {
  from { transform: scale(1) translateY(0); }
  to { transform: scale(1.025) translateY(-1.2%); }
}
@keyframes sf-shimmer {
  from { background-position: 180% 0; }
  to { background-position: -80% 0; }
}
.sf-v2 .mh-masthead,
.sf-v2 .sf-section__head,
.sf-v2 .sf-home__lede,
.sf-v2 .sf-door {
  animation: sf-enter 560ms var(--sf-ease) both;
}
.sf-v2 .sf-door:nth-child(2) { animation-delay: 60ms; }
.sf-v2 .sf-door:nth-child(3) { animation-delay: 120ms; }

/* ─────────────────────────────────────────────────────────────────────────────
   16. Responsive
   ───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 1280px) {
  .sf-v2 .sf-header__rail { gap: 18px; }
  .sf-v2 .sf-nav .mega-menu__groups { gap: 13px; }
  .sf-v2 .sf-nav .mega-menu__trigger,
  .sf-v2 .sf-nav__link {
    font-size: 9px;
    letter-spacing: 0.14em;
  }
  .sf-v2 .sf-wordmark__name { font-size: 18px; letter-spacing: 0.24em; }
  .sf-v2 .sf-wordmark__sub { display: none; }
}

@media (max-width: 1200px) {
  .sf-v2 .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sf-v2 .sf-variety-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sf-v2 .sf-footer__top { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sf-v2 .sf-footer__top > :first-child { grid-column: 1 / -1; }
}

@media (max-width: 1119px) {
  .sf-v2 .sf-header__utility { display: none; }
  .sf-v2 .sf-header__rail { display: none; }
  .sf-v2 .sf-header__mobile { display: grid; }
}

@media (max-width: 1023px) {
  .sf-v2 .sf-hero { min-height: 0; padding-top: clamp(40px, 8vw, 64px); }
  .sf-v2 .sf-hero__inner { grid-template-columns: 1fr; gap: 40px; }
  .sf-v2 .sf-hero__study { justify-self: stretch; width: 100%; max-width: 440px; margin: 0 auto; order: 2; }
  .sf-v2 .sf-hero__index { display: none; }
  .sf-v2 .sf-home__lede,
  .sf-v2 .sf-split,
  .sf-v2 .sf-contact-grid,
  .sf-v2 .sf-evidence { grid-template-columns: 1fr; }
  .sf-v2 .sf-home__doors { grid-template-columns: 1fr; }
  .sf-v2 .sf-door { border-right: 0; border-bottom: 1px solid var(--sf-line); min-height: 0; }
  .sf-v2 .sf-door:last-child { border-bottom: 0; }
  .sf-v2 .sf-process { grid-template-columns: 1fr; gap: 28px; }
  .sf-v2 .sf-editorial-grid { grid-template-columns: 1fr; gap: 28px; }
  .sf-v2 .mh-search__layout { grid-template-columns: 1fr; }
  .sf-v2 .mh-facets { position: static; order: 2; }
  .sf-v2 .mh-cart__layout { grid-template-columns: 1fr; }
  .sf-v2 .mh-cart__summary { position: static; }
  .sf-v2 .mh-pdp__top { grid-template-columns: 1fr; }
  .sf-v2 .mh-pdp__study { position: static; max-width: 560px; }
  .sf-v2 .mh-card-grid--settings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sf-v2 .dyo-grid-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sf-v2 .sf-footer__top { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sf-v2 .sf-footer__top > :first-child { grid-column: 1 / -1; }
  .sf-v2 .sf-footer__top > :last-child { display: block; }
  .auth-shell__frame { grid-template-columns: 1fr; }
  .auth-shell__aside { display: none; }
}

@media (max-width: 760px) {
  .sf-v2 .product-grid,
  .sf-v2 .mh-card-grid,
  .sf-v2 .mh-card-grid--settings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sf-v2 .sf-section__head { grid-template-columns: 1fr; }
  .sf-v2 .sf-variety-list { grid-template-columns: 1fr; }
  .sf-v2 .mh-cart__item { grid-template-columns: minmax(0, 1fr) 84px; }
  .sf-v2 .mh-cart__qty { display: none; }
  .sf-v2 .mh-pdp__details { grid-template-columns: 1fr; }
  .sf-v2 .mh-masthead h1 { font-size: clamp(40px, 11vw, 64px); }
  .sf-v2 .sf-footer__top { grid-template-columns: 1fr; gap: 28px; }
  .sf-v2 .sf-footer__top > :first-child { grid-column: auto; }
  .sf-v2 .sf-footer__bottom { flex-direction: column; align-items: flex-start; }
  .sf-v2 .sf-form-grid { grid-template-columns: 1fr; }
  .sf-v2 .dyo-grid-options { grid-template-columns: 1fr; }
  .sf-v2 .sf-contact-list li { grid-template-columns: 1fr; gap: 4px; }
}

@media (max-width: 480px) {
  .sf-v2 .product-grid,
  .sf-v2 .mh-card-grid,
  .sf-v2 .mh-card-grid--settings { grid-template-columns: 1fr; }
  .sf-v2 .mh-hero__title,
  .sf-v2 .sf-hero__title { font-size: clamp(48px, 15vw, 72px); }
  .sf-v2 .mh-cart__item { grid-template-columns: 1fr; }
  .sf-v2 .mh-cart__amount { text-align: left; }
  .sf-v2 .sf-header__mobile .sf-wordmark__name { font-size: 15px; letter-spacing: 0.24em; }
}

/* ─────────────────────────────────────────────────────────────────────────────
   17. Reduced motion — information is never carried by motion
   ───────────────────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sf-v2 *,
  .sf-v2 *::before,
  .sf-v2 *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
  .sf-v2 .sf-stone { animation: none; }
  .sf-v2 .mh-plate__pass { display: none; }
}
`;
