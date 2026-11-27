# Design audit v5 — the perceived-quality pass

Status: measured on `main` at `088ce8c` plus this pass.

v4 fixed what can be measured: one type scale, AA contrast, focus rings, target
sizes, motion durations, overflow and axe. v5 is the pass that follows it —
additive polish a reader feels before they can name it. It changes **no layout,
no grid, no section order, no copy, no palette and no component composition**.

Authority for the acceptance test remains `docs/DESIGN_DIRECTION.md` §8. The
motion vocabulary is still Enter / Pass / Hold; nothing here introduces a fourth
primitive.

## How it was measured

The v4 harness (`apps/web/scripts/craft-audit.mjs`, unchanged) was run on the
same 47 routes × 3 widths (1440 / 768 / 390), settling every reveal before axe
and before the screenshot. 16 routes are photographed at each width for the
before/after pair.

```
BASE_URL=http://localhost:3100 LABEL=before|after OUT_DIR=../../../docs/design-shots/v5 \
  WIDTHS=1440,768,390 SHOT_ROUTES=home,shop,browse,search,variety,product,settings,setting,cart,design-your-own,concierge,account-login,contact,showrooms,about,policy \
  node scripts/craft-audit.mjs
```

Build basis: `next build --webpack` with `DATABASE_URL` unset and
`SITE_URL=http://localhost:3100`.

- `docs/design-shots/v5/before/` — `main` at `088ce8c`, rebuilt from a clean
  stash of this pass (48 photographs + `audit.json`).
- `docs/design-shots/v5/after/` — this pass (48 photographs + 6 loading-state
  captures + `audit.json`).

The catalogue remains **fixture-backed demo content** (`DEMO_CONTENT`); prices,
references and availability in these images are illustrative, not inventory.

## What changed, per area

| Area | Before | After | Measured / verified |
|---|---|---|---|
| **1. Page transitions** | none: a navigation swapped the tree instantly | React 19.3's built-in `<ViewTransition>` (`from 'react'`, no dependency) in `(storefront)/template.tsx`; a template remounts per navigation, so **only** navigations animate. Old page exits / new page enters with the `mh-page` class, **180 ms**, `--mh-ease`. Root snapshot suppressed (header/footer never fade or move), `::view-transition { pointer-events: none }`, reduced motion → 0 ms swap | Instrumented `document.startViewTransition`: 1 call per navigation, `mh-page-out` + `mh-page-in` at **180 ms**, root group `0 ms`. A filter change (in-page transition) produced **0** view transitions. Reduced-motion run: both animations `0 ms` |
| **2. Skeletons and loading** | `ListSkeleton` and `CollectionExplorerSkeleton` used a different card (4:5 white card, 1-col title bar) and had **no styling at all** — `.skeleton` only existed scoped to the unused `.sf-v2`. The PDP skeleton had no `aria-busy` | `ListSkeleton` rebuilt to the real page: `max-w-7xl`/gutters, breadcrumb, bordered header (11 px eyebrow / 38 px title / 14 px meta), 40 px facet bar, same 1/2/3-col `gap-7` grid, same **10:14 → 3:4** plates, same **24/32 px** card inset, same text-block widths. `CollectionExplorerSkeleton` and the PDP skeleton use the same shapes (PDP: 4:3.5 stage, thumbnail rail, summary column). One `mh-shimmer` token (1.7 s) that stops under reduced motion. The group-level loading shell is a composed, full-height card instead of a 320 px card at the top of a blank field | Skeletons render at the reserved size before paint (no width/height change on resolve). `aria-busy`/`aria-live` on the PDP skeleton too. Reduced motion: `animation-name: none`. Navigation CLS **0.1204 → 0.0000** (the footer no longer enters the viewport during load) |
| **3. Image treatment** | Every media surface was `object-cover` centred; card images scaled 105 % on hover; vignettes at 45/65/70/75/80/85 %; no placeholder | `data-media-category` on cards / PDP / setting detail; crop rules: **rings 50/50, pendants 50/36, earrings 50/44, gemstones 50/50**. One `--mh-vignette` for photographic plates and one `--mh-scrim` for type over a photograph (the six gradients resolve to one token each). Blur-up ghost: the **same known image**, blurred behind the sharp copy, on product cards, the PDP stage and setting stage. No filter changes hue or saturation (only `blur`, which is achromatic) | Computed `object-position` per category verified in the browser; the PDP vignette resolves to `rgba(10,10,11,0.38/0.12/0/0.06)`; ghost present with `filter: blur(16px)` and the image URL as its background |
| **4. Micro-interactions** | Mixed hover transforms and scales (`hover:-translate-y-1`, `group-hover:scale-105`, `active:scale-90/95`), underlines with no growth, no caret rule | Link rule **grows from the left in 150 ms** (breadcrumbs, footer nav, `underline` links; the resting rule remains visible). Press = **1 px sink**, never a scale. Cards raise the **light** (shadow 1 → 2 + a top sheen), **no transform**; the card image no longer zooms; the marquee tile no longer lifts. `caret-color`/`accent-color` = gold; `cursor: pointer` only on `a[href]`, enabled buttons, summaries and role=button. No custom cursor | Breadcrumb `::after` `scaleX(0) → scaleX(1)` on hover; pressed button computed `translateY(0.53px)` mid-transition → 1 px; card `transform: none` at rest and on hover; shadow level 1 → 2; caret `rgb(125,93,16)` |
| **5. Depth and material** | 6 Tailwind shadow levels + 25 arbitrary shadows, no shared scale; gold/black mixes; dark surfaces used black-on-black without a rim | Three tokens, `--mh-shadow-1/2/3`, each carrying a **hairline top highlight** (inset 0 1px 0). Dark containers (`header`, `footer`, hero, the six obsidian bands) re-solve the three tokens with a deeper black **and** a light top rim, so depth reads on both paper and obsidian. Depth-family arbitrary shadows and `shadow-sm/md/lg/xl/2xl` are mapped to the scale; light glows (gold, gem colours) are deliberately untouched. No shadow was added to a flat text block | Card rest/hover computed to the two tokens; the footer card in a dark band computes the dark level-3 token with the white inset rim; `shadow-sm` computes level 1 on paper |
| **6. Empty and error states** | Every data surface already had a composed empty state and a real recovery action; collection and search used ad-hoc inline padding/spacing; two actions were equally weighted | One `.mh-empty` composition (gold hairline, 12 px rhythm, 56 ch measure, centred) on the collection filter empty state and both search empty states. The portal empty states (bag, compare, favourites, checkout) already used one; they gain one shared rhythm. Error boundaries keep retry + contextual path (both real). No inventory illustrations | Audited 9 surfaces: collection filter, search (no query / no results), bag, compare, favourites, checkout confirmation, route errors, 404. None is a dead end |
| **7. Scroll choreography** | `MotionLayer` hid below-fold sections and revealed them with an untimed inline jump; no list stagger; lists that streamed in after the effect were missed | Sections enter **once**, `--mh-dur-enter` = **520 ms**. Only `[data-reveal-list]` staggers: direct children at **48 ms** each (`--mh-reveal-delay`). Anything **above the fold is never hidden** (no first-paint flash, no layout work). A coalesced `MutationObserver` re-scans for streamed/client lists. Sticky header/footer are not participants. Reduced motion: everything is plain presence | At 390: listing `is-pending` with delays `0 / 48 / 96 ms`, then `is-revealed` on entry. At 1440 the above-fold grid is untouched. Reduced motion: no element at `opacity: 0.01`. Sticky bar is `fixed` with a compensating spacer (no jump) |

### Files touched

- `app/(storefront)/template.tsx` — **new** framework file (the ViewTransition
  boundary). Registered in `routing/route-manifest.ts` and the manifest spec's
  allowed-file list, alongside `layout`/`loading`/`error`.
- `app/(storefront)/layout.tsx` — the (unchanged) `main` now comes from the
  template; MotionLayer is still the lazy wrapper.
- `app/(storefront)/loading.tsx` — composed, full-height shell.
- `app/storefront-craft.css` — the v5 section (depth, interactions, media,
  skeletons, reveal, crossfade, empty, guards).
- `components/catalog/ListSkeleton.tsx`, `CollectionExplorerSkeleton`,
  `ProductDetailSkeleton` (mgh), `ProductCard`, `ProductDetailClient`,
  `SettingDetailClient`, `GemstoneMarquee`, `MotionLayer`, and the three list
  pages that carry `data-reveal-list`.
- `routing/route-manifest.ts` / `.spec.ts` — the one new framework file.

No dependency was added. No file under `api/`, `packages/`, `app/admin/` or
`app/vendor/` was touched. No copy string changed.

## Gates

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` (`tsc -b`) | **0 errors**, exit 0 |
| `next build --webpack`, `DATABASE_URL` unset | **exit 0** |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed (main baseline 618/21; this pass adds no tests) |
| `node scripts/check-slop.mjs` | **clean** |
| axe (WCAG 2.0/2.1/2.2 A+AA, 141 captures) | **0 violation nodes** before **and** after; 0 rule types |
| Horizontal overflow | **0** at 1440 / 768 / 390, all 47 routes, both sides |
| Distinct type-size buckets @1440 | **60** before and after (no scale drift) |
| Initial JS (gzip, from the build manifests) | category **203.2 → 203.3 KB**, product **208.3 → 208.5 KB** (+0.1 / +0.2 KB, the cost of the framework transition). Against the brief's v4 figures (213.1 / 208.0): category is 9.8 KB lower; product is 0.5 KB above the stale 208.0 figure but only 0.2 KB above the actual `main` baseline — see note below |
| CLS, home | **0.3006 → 0.3006** (unchanged; pre-existing client-content growth at ~3.8 s) |
| CLS, home → PDP navigation | **0.1204 → 0.0000** |
| CLS, filter change | **0.00001** |
| Captures with zero axe violations and no overflow | **138 / 141** both sides — the 3 remaining are the known `/api/fresh/catalogue/gemstones` HTTP 500 on home without `DATABASE_URL` |

### Budget note

The brief's "current 213.1 / 208.0 KB" is the v4 README's measurement. The
actual `main` at `088ce8c`, rebuilt before this pass, measures **203.2 /
208.3 KB**. This pass ends at **203.3 / 208.5 KB**. It therefore adds **0.2 KB**
to the product route and does not create the pre-existing overrun against the
SoT ceilings (170 / 190). The v4 number of 208.0 was measured before the
canonical-product commit changed the route graph.

`contrast-incomplete` is 3,864 before and 3,857 after — a 7-node difference
across 141 captures, with the canonical PDP at 108 / 107 / 107 on both sides.
No surface gained an undecidable contrast node.

## What a reviewer should notice

1. **A navigation dissolves rather than swaps.** Click any card, header link or
   breadcrumb: the page area crossfades in 180 ms while the header and footer
   stay perfectly still. Click a filter or a tab: nothing crossfades.
2. **Loading looks like the page.** Throttle the network and open a product or
   a listing: the shimmering blocks are already in the final grid, at the final
   ratios, with the final text widths. The footer does not jump into view.
3. **Hover is light, not movement.** Hover a card: the shadow lifts and a soft
   top sheen arrives; nothing moves. Press a button: it sinks 1 px.
4. **Small type details.** Breadcrumb and footer links grow a rule from the
   left in 150 ms. The caret is gold. There is no custom cursor.
5. **Shadows agree.** Every raised surface reads at one of three depths, with a
   hairline of light on its top edge, on paper and on obsidian.
6. **Scrolling is one gesture.** Sections arrive once in 520 ms; only lists
   stagger, 48 ms apart; nothing above the fold animates.
7. **Pendants sit higher, rings are centred.** The crop follows the object, and
   the photograph's colour is never filtered.

## What must stay identical

- Grid, spacing, section order, component composition, all copy.
- Palette and hue; the stone remains the only saturated colour.
- The five-step type scale, its leading and tracking; AA contrast; the focus
  ring; target sizes.
- Header/footer geometry and the sticky behaviour (the spacer still prevents a
  jump).
- Product photography's colour and framing intent.
- Axe 0, overflow 0, and the initial-JS figures to within the 0.2 KB above.

## Deliberately left alone

- **The 3 environmental HTTP 500 captures on home.** `/api/fresh/catalogue` is
  a backend gap without `DATABASE_URL`, not a design one.
- **The home CLS of 0.30.** It is identical before and after; the shift source
  is the footer moving when a late client update grows the page. Fixing it is a
  data-loading change, not a craft one.
- **The secondary action in the bag / compare / favourites empty states.** The
  primary action is singular and gold; the quiet alternate is a real recovery
  path, and removing it would remove a route, not decoration.
- **The product route's 208.5 KB.** The +0.2 KB is the framework transition;
  see the budget note.
- **`/account/login`, `/account/register`, the admin and vendor consoles.** They
  keep their own sign-in frame and scale, as in v4.
