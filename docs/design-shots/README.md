# Design shots — storefront surface pass

Screenshots of the pages brought onto the hero's "light through stone" system.
Every page is captured at **1440**, **768** and **390** CSS pixels, full page,
Chromium (Playwright), `prefers-reduced-motion: no-preference`.

| Page | 1440 | 768 | 390 |
|---|---|---|---|
| Product detail (`/products/[slug]`) | `product-detail-1440.png` | `product-detail-768.png` | `product-detail-390.png` |
| Search (`/search`) | `search-1440.png` | `search-768.png` | `search-390.png` |
| Settings index (`/settings`) | `settings-index-1440.png` | `settings-index-768.png` | `settings-index-390.png` |
| Setting detail (`/settings/[code]`) | `setting-detail-1440.png` | `setting-detail-768.png` | `setting-detail-390.png` |
| Varieties directory (`/varieties`) | `varieties-1440.png` | `varieties-768.png` | `varieties-390.png` |
| Variety listing (`/[variety]`) | `variety-listing-1440.png` | `variety-listing-768.png` | `variety-listing-390.png` |
| Colour listing (`/colour/[slug]`) | `colour-listing-1440.png` | `colour-listing-768.png` | `colour-listing-390.png` |
| Bag (`/cart`) | `cart-1440.png` | `cart-768.png` | `cart-390.png` |

## Data basis — read this before judging a number

These screenshots are rendered from the **contract test fixtures** in
`apps/web/src/modules/catalog/testing/doubles.ts`, through the same
`CatalogQueryService` the app uses. They are design artefacts, **not**
catalogue claims:

- the product titles, prices, weights, SKUs and origins are fixtures;
- a variety/colour screenshot is filtered to the fixture records that match
  the page, so a page never shows a stone from another variety;
- the setting variants and their prices are fixtures;
- "No photograph on file" is literal: no product media exists on the DTO, so
  the pages render the CSS light study rather than a stock image.

The production pages read the same components through the real Postgres-backed
port; none of the fixture values are hardcoded in application code.

## Accessibility

`axe-core` (WCAG 2.0/2.1/2.2 A+AA tags) was run in the same Chromium session at
all three widths for all eight pages: **0 violations**. Colour-contrast is
reported by axe as *incomplete* on text over the deliberate gradient fields
(axe cannot resolve a gradient background), so the palette pairs were checked
numerically against the composited backgrounds instead:

| Foreground / background | Ratio |
|---|---|
| Ink `#1A1A18` on ivory `#FAFAF8` | 16.68:1 |
| Muted `#5C574D` on ivory | 6.87:1 |
| Gold ink `#7D5D10` on ivory | 5.83:1 |
| Gold ink over the masthead glow composite | 5.31:1 |
| Positive badge `#2F6B4F` on ivory | 6.02:1 |
| Warning badge `#7D5D10` on ivory | 5.83:1 |
| Footer 62% ivory on `#060D16` | 7.41:1 |
| Footer 68% ivory on `#060D16` | 8.76:1 |
| Footer 90% ivory on `#060D16` | 15.04:1 |
| Header CTA ink on ivory | 16.68:1 |

## Known limits of the images

- Google Fonts are loaded from the network during capture; fallback fonts are
  visible if the capture environment is offline.
- The header's mega-menu panels are closed (the audit covers the closed state;
  the existing `browser-a11y.mjs` covers the open state).
- The policy footer links resolve to the canonical `/policy/*` route, whose
  content is still a stub outside this task.
