# Design pass v6 — the homepage and the back cover

Status: measured on `main` at `2f9f4ca` plus this pass.

This pass rebuilds **the homepage and the storefront footer only**. The navbar,
every other page, the catalogue components, the API, `packages/`, the admin and
vendor consoles and the `develop` worktree are untouched. The v5 acceptance
test remains `docs/DESIGN_DIRECTION.md` §8; the motion vocabulary is still
Enter / Pass / Hold.

The demo catalogue is still **fixture-backed demo content** (`DEMO_CONTENT`).
Every price, reference and availability in these images is illustrative, not
inventory, and the global badge says so.

---

## 1. The direction, as built

One idea: **light through stone**. It is expressed, not explained.

| Rule | How this page keeps it |
|---|---|
| Gold is light, never a fill | Gold appears as a 1px rule, a falloff, a specular sweep and a focus hairline. There is no gold-filled panel and no gradient text. |
| No filled glass cards | Every surface is paper or obsidian. Depth is light falloff, a hairline and negative space. |
| Asymmetry with intent | The hero is a left text / right still split; the record is a 5/7 text composition; the rooms are a staggered band; pieces are a ledger; DYO is a split. No section repeats another's shape. |
| One light source | The hero has one raking light and one scrim; the CTA has one low falloff; hover raises light, never movement. |
| Five sizes | Page content renders **5 sizes at every width** (measured below): meta 12, body 14, title 22–24.5, display 36–48, hero 55.8–88. The 11 px and 16 px nodes on the page belong to pre-existing global chrome (header tagline, demo badge, concierge trigger). |
| Cormorant + neutral sans | Cormorant Garamond for display, Outfit for data and running text. Tabular numerals on every weight, price and certificate. |
| Enter / Pass / Hold | Sections enter once in 520 ms; the pieces list staggers at 48 ms; the hero light holds on a 12 s breath; the room plate takes a 700 ms light pass on hover. Reduced motion removes all of it. |
| Marquee carries facts | Every rail tile is a real record: variety, carat, origin, certificate reference — or the honest absence. No colour-note platitudes, no gem illustrations. |

---

## 2. How it was measured

Same harness as v5 (`apps/web/scripts/craft-audit.mjs`), same axe tags
(WCAG 2.0 / 2.1 / 2.2 A + AA), same settle-before-capture rule.

```
BASE_URL=http://localhost:3100 LABEL=before OUT_DIR=../../../docs/design-shots/v6 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home node scripts/craft-audit.mjs

BASE_URL=http://localhost:3101 LABEL=after  OUT_DIR=../../../docs/design-shots/v6 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home node scripts/craft-audit.mjs
```

- **Build basis:** `next build --webpack`, `DATABASE_URL` unset,
  `SITE_URL=http://localhost:3101`.
- **Before:** `main` at `2f9f4ca`, served on 3100.
- **After:** this pass, served on 3101 with no reachable catalogue, so every
  rendered row is the labelled fixture ledger.
- **Screenshots:** 4 widths × home, plus the search interaction states.
- **Home audit:** `home-audit-final.json` is the final build's four-width axe +
  overflow record. The full 188-capture sweep ran on the pass build; two
  subsequent cosmetic corrections — the search input's focus reset and a
  character-encoding fix in the new copy — were re-verified by the final
  four-width home audit, which is the gate below.

---

## 3. Section by section

| # | Section | Before | Now | Why |
|---|---|---|---|---|
| 1 | **Hero** | Autoplay stock jewellery video; centred eyebrow, 2-line gradient-fill headline, black glass pill search, three prompt chips. | One full-bleed still with a single raking light; one editorial line, one supporting line, the 60 px search, one quiet action. No eyebrow, no chips, no second gradient. | The hero is the concept, not a dashboard. The search is the centrepiece. |
| 2 | **Trust strip** | Three icon chips promising free insured shipping, certification of every stone and a lifetime care plan. | Removed. The provenance rail and the record section carry evidence instead. | Unsupported promises; an icon per feature is the prohibited pattern. |
| 3 | **Marquee** | Eight gem SVG illustrations, colour notes, counts and “Explore”. | One real record per variety: carat, origin and certificate reference (or “Certificate not recorded”). A 72 s typographic pass, paused on hover/focus; static scroll rail under reduced motion. | Provenance is the content. The rail is a ledger, not a slogan. |
| 4 | **Featured stones** | A 3 × 2 grid of pearl-glass product cards with wishlist, compare and add controls over gradient overlays. | Removed as a grid. In its place, one text-only **record** section: a real stone read as a hairline definition table — variety, weight, origin, treatment, certificate, price — with the INV-07 framing. | Two identical card grids made the page generic; a record is more distinctive and more honest. |
| 5 | **Four ways in** | 2 × 2 full-bleed photo cards, each with three tag links, a circular arrow and three gradient overlays. | Four plates with captions **below** the image, the second and fourth offset on desktop; a snap rail on a phone; one link per room. | Category rhythm without card chrome or type-on-photo. |
| 6 | **Ready-to-wear** | A third grid of the same product cards, with hand-written prices. | A three-row price list on obsidian: name, data-derived spec and price, one arrow. | A ledger, not a third grid. The price is read from the record, not written into the page. |
| 7 | **Design your own** | Gold gradient rounded panel, three white icon cards, three CTAs, a sample-order link and a two-week delivery promise. | A split: dark plate left, the real three steps right (choose the stone / choose the mounting / review the commission), **one** action. No sample code, no delivery promise. | Show the actual value of the three steps, then ask once. |
| 8 | **The gemologist** | Three white icon pillars and three prompt chips under a black pill button. | One statement and three real questions as large serif rows, each carrying its text into `/concierge?q=`. No icons. | The questions are the interface. |
| 9 | **Client voices** | Three named, located testimonials. | Removed. | Fake social proof is prohibited by §8.3. |
| 10 | **Closing invitation** | Gold-brown gradient rounded panel with two filled buttons. | Full-bleed obsidian, one display line, one hairline button, one honest note. | A couture invitation, not a banner. |
| 11 | **Footer** | See §5. | See §5. | Highest priority; rebuilt as the back cover of the house. |

The page still has **eight content sections + footer**, but no two sections
share a composition — which is the point.

---

## 4. The hero and the search, before / after

| | Before | After |
|---|---|---|
| Composition | Centred stack on a stock video: eyebrow, gradient headline, glass pill, chips. | Left editorial block: one line, one supporting line, the field, one link. Still image right, one light, one scrim. |
| Type | 36 → 88 px headline with a gold gradient fill. | 55.8 → 88 px Cormorant in solid ivory. Gold is light, not the text. |
| Field | 1-line pill, black glass, backdrop blur, 3 chips. | 60 px flat obsidian field, 1 px gold hairline, search icon, 44 px clear, 44 px submit, 640 px max. |
| Mobile | Full-width pill, chips under it. | 350 px field in a 390 px viewport, submit collapses to its arrow, panel floats without shift. |
| Suggestions | Fetched on mount, even with no query (which produced the known offline 500). | Fetched only from the existing typeahead endpoint after 2 characters; nothing pre-seeded. |
| Kind / scope | No real scope control. | None added: the endpoint exposes no kind facet, so no fake scope is rendered. |

### Search interaction states (measured in Chromium, final build)

| State | Measurement |
|---|---|
| Rest | field **60 px**; 1 px `rgba(230,201,122,.34)` hairline; no fill. |
| Focus | `/` anywhere outside an editable control focuses `#mh6-home-search`; the field group turns gold with a 1 px halo. The input draws **no second ring** (the reset is declared inside `@layer base`, where the app's global `!important` ring lives). |
| Typing | `aria-expanded="true"`, `aria-controls` points at the floating panel, `role="listbox"` / `role="option"` / `aria-activedescendant` present; a visually hidden `role="status"` announces “The catalogue could not be read” in the offline demo. |
| Empty / error | Honest copy + a real `/search` link. No fabricated rows. |
| Keyboard | `ArrowDown` set `aria-activedescendant="_…_-option-0"` and `aria-selected="true"` against a stubbed real record; `Enter` navigated to `/products/merelani-violetish-blue-tanzanite-1-31ct`. |
| Escape | First press clears the query and keeps focus; second press blurs to `BODY`. |
| Mobile | form **350 × 60**, panel **350** wide, page overflow **0**; submit text hidden, accessible name retained. |
| Layout shift | 0.00000 with the panel open (panel is absolutely positioned). |

The typeahead endpoint is `/api/fresh/catalogue/gemstones?q=…&limit=6` — the
existing catalogue search. In this environment the catalogue is unreachable,
so the captured typed state is the honest error state; the suggestion path was
exercised with a real fixture record through the same DOM and endpoint shape.

---

## 5. The footer

| Element | Before | Now |
|---|---|---|
| Ground | `#0A0A0B`, 1 px gold border, generic four-column grid. | **`#05080C`**, one gold hairline, four editorial columns at ≥1024, three at 768, one at 390. |
| Brand | Wordmark, “Geneva · New York · London”, a generic line, a **filled gold gradient newsletter card**. | Wordmark in Cormorant, the observed identity — **608 5th Avenue, 11th Floor Penthouse, New York, NY 10020 / +1-212-804-9994** — a salons link to `/showrooms`, and the Journal as a hairline underline field. |
| Columns | Shop / Portals & Care / Legal, including Admin and Vendor console links. | **The collection / The house / Client care** — real client routes only; no console links, no `#`, no dead ends. |
| Journal | Same endpoint, validation and test ids, wrapped in a gold card. | Same endpoint, validation and test ids; one underline, one verb, 44 px targets. |
| Truth note | None. | **INV-07 / INV-08 in plain language**, plus the prices/availability rule, in 12 px at 82 ch. |
| Signature | None. | **“The stone comes first. / The record follows.”** — the line the hero opens and the record closes. |
| Motion | None. | Links grow their rule from the left (the v5 footer rule, re-seated 6 px under the text); no entrance animation on the sticky back cover. |

The footer is a **server component**; only the Journal form is client. That is
why the initial JS fell by 7.6 KB on every storefront route (see §6).

---

## 6. Gates

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` (`tsc -b`) | **0 errors**, exit 0. |
| `next build --webpack`, `DATABASE_URL` unset, `SITE_URL=…` | **exit 0**. |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed (main baseline). |
| `node scripts/check-slop.mjs` | **clean**. |
| axe — homepage at 1440 / 1024 / 768 / 390 | **0 violation nodes**, 0 rule types, on the final build (`home-audit-final.json`). |
| axe — full storefront sweep | **188 / 188 captures pass**, **0 violation nodes** (pass build; the final build was re-audited on the homepage after the focus-reset and encoding corrections); contrast-incomplete **5474 → 4487**. |
| Console errors on home | **0** (the old mount-time typeahead 500 is gone). |
| Horizontal overflow | **0** at all four widths, home and all 188 captures. |
| CLS, home | **0.00000** at 1440; **0.00037** at 390; **0.00000** added by opening the search panel. |
| Type sizes, page content | **5 at every width**: 12 / 14 / 24.48 / 48 / 88 at 1440; 12 / 14 / 22 / 36 / 72 at 1024 and 768; 12 / 14 / 22 / 36 / 55.8 at 390. |
| Initial JS, home | **181.4 KB gzip** (15 chunks, from the build manifests). |
| Initial JS, category (`[varietySlug]`) | **203.3 → 195.7 KB gzip** (−7.6 KB vs v5). |
| Initial JS, product | **208.5 → 200.9 KB gzip** (−7.6 KB vs v5). |
| Screenshots | `docs/design-shots/v6/before/` and `after/` at 1440 / 1024 / 768 / 390, plus 3 search-state captures. |
| Distinct type-size buckets (harness metric) | 60 → 77. This counts size × leading × tracking × family; the **sizes** stay at five. The increase is the footer's serif/sans pairing on every route, not scale drift. |

### Budget note

The brief's gate is “budgets must not increase by more than 5 KB”. Both measured
routes **fell by 7.6 KB**; the homepage's own initial JS is 181.4 KB. The
repository's absolute `check:budgets` script still exits 1 against the SoT
ceilings (170 / 190). That overrun is **pre-existing** and was documented in
`docs/design-shots/v5/README.md`; this pass reduces it rather than adding to it.
No route gained JS.

---

## 7. What a reviewer should notice

1. **The hero is four things.** A stone in raking light, one line, one
   supporting line, one field. There is nothing else to remove.
2. **The field is the centrepiece.** Press `/`; type; the panel floats over the
   photograph without moving a pixel; `Escape` clears and then blurs.
3. **The rail is a ledger.** Read four tiles: carat, origin and a certificate
   reference on each. No adjective is doing the work.
4. **The record is a record.** Scroll once: a single stone is presented as the
   page's only text-only composition, with missing values printed as missing.
5. **The footer is a back cover.** The address is the observed one, the links
   are real, the truth note is legible, and the last line answers the first.
6. **Hover is light.** A room plate takes a sweep; a pieces row grows a gold
   hairline; nothing scales, tilts or lifts.

---

## 8. Deliberately left alone

- **The navbar / header.** Untouched, including its mega menu. It still links
  two sample review codes (`/design-your-own/review/DYO-MG-8841`,
  `DYO-MG-2049`) — flagged here, not changed: it is outside this pass.
- **Every other page and shared component.** `ProductCard`, the catalogue,
  listing pages, PDPs, cart, checkout, account, admin, vendor and the
  `develop` worktree are unchanged.
- **`HeroAiSearch`.** The homepage no longer imports it; the file remains for a
  future surface and contributes nothing to the bundle while unreferenced.
  `GemstoneMarquee` and `HeroBackgroundVideo` are still used by `/varieties`,
  `/jewellery`, `/settings` and `/design-your-own`; they were not modified.
- **Policy pages.** The footer links only to routes that exist, but
  `/policy/[policySlug]` is still a `ComingSoon` surface. That is a content gap,
  not a link gap, and fixing it is outside the homepage.
- **Fixture content.** Demo rows remain, labelled by the global badge. No price,
  certificate or availability is invented in this pass; the pieces list reads
  its prices from the same records the cards used.
- **The database.** No migration, no write, no managed-database access. The
  after build and screenshots ran against an unreachable local URL, so every
  rendered row is the labelled fixture ledger.
- **The absolute JS ceiling overrun.** Pre-existing (v5 note); this pass reduces
  it by 7.6 KB on both measured routes.
