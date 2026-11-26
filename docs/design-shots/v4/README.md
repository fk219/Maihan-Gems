# Design audit v4 — the craft pass

Status: measured on `main` at `27b1c97` plus the craft pass in this commit.

This pass changed **no layout, structure, copy, palette or component**. It is
the finishing pass on the design that was ported from `develop`: one type scale,
one leading and tracking rule per role, AA contrast on both surfaces, one focus
ring, five interaction states, one easing curve, and the details (selection,
scrollbar, hairlines, radii, numerals, media ratios).

`docs/DESIGN_DIRECTION.md` §8 is the acceptance test: five sizes, two weights,
one display and one text family, hierarchy from size and space.

## How it was measured

`apps/web/scripts/craft-audit.mjs` is the v4 harness. It extends the v3 audit
(`design-audit.mjs`, unchanged) with four things a craft pass needs:

1. **Per-node axe detail** — selector, snippet, failure summary, and the
   foreground, background and ratio axe measured, so a before/after pair is
   diffable rather than two counts.
2. **Settled reveal state** — the page is scrolled end to end before axe and
   before the screenshot. Without it, every `[data-reveal]` section is still at
   `opacity: 0.01` and the full-page image is blank below the fold.
3. **Rendered type metrics** — size, line-height ratio, tracking and family for
   every text node, so the scale can be counted.
4. **Target boxes** — every interactive element's measured box.

```
BASE_URL=http://localhost:3100 LABEL=before|after OUT_DIR=../../../docs/design-shots/v4 \
  WIDTHS=1440,768,390 SHOT_ROUTES=home,shop,… node scripts/craft-audit.mjs
```

Build basis: `next build --webpack` with `DATABASE_URL` unset and
`SITE_URL=http://localhost:3100`. 47 routes × 3 widths = **141 captures** per
side. The 16 routes named in `SHOT_ROUTES` are photographed at each width for
the before/after pair; the other 31 are measured but not photographed.

### Why the baseline is 99 contrast nodes, not 109

v3 reported `color-contrast` on **109** nodes. Ten of those are an artefact of
capturing the page before `[data-reveal]` has run: a section is at
`opacity: 0.01`, axe composites the near-invisible element with the paper
background, and a solid black CTA (`#181613` with `#F7F5F0` text) is reported as
white-on-white at 1.01:1. With the reveal settled, the same code has **99**
genuine contrast nodes. The 26 `target-size` nodes are unchanged by the
settle. The v3 figure is still the honest number for that harness; 99 is the
honest number for the page a reader actually gets.

## Result

| Measure | Before | After |
|---|---|---|
| Captures | 141 | 141 |
| Captures with zero axe violations and no overflow | **96** | **141** |
| axe violation nodes | **125** | **0** |
| — `color-contrast` | 99 | **0** |
| — `target-size` | 26 | **0** |
| Distinct font sizes, mean per storefront route @1440 | 12.7 (max 18) | **5.2** (max 5; 6 on home, which carries the hero instance) |
| Distinct font sizes, site-wide @1440 | 28 | 19 (the 14 extra are the console sign-in frames and their own scale) |
| Type size/leading/tracking/family buckets, site-wide @1440 | 127 | 60 |
| Mean buckets per storefront route @1440 | 28.0 | 16.6 (the remainder is four type families and uppercase/neutral tracking variants, not extra sizes) |
| Horizontal overflow, 1440 / 768 / 390 | 0 | 0 |
| Horizontal overflow, 1024 | 84 px (`/products/[slug]`), 7 px (home), 4 px (`/shop`) | **0** (all 47 routes) |
| Environmental HTTP 500 captures | 12 | 12 (unchanged; backend gap) |

`contrast-incomplete` (axe checks it cannot decide over a gradient or image
field) moves from 4,255 to 4,167 nodes across captures. It is not a pass: every
palette pair that occurs behind those fields is listed with its measured ratio
in §3 below.

## 1. Typography

The design shipped five ad-hoc decisions at once: 28 rendered sizes at 1440 with
9 / 9.5 / 10 / 10.5 / 11 / 11.5 and 12 / 12.5 / 13 / 13.5 in the same viewport;
leading that varied 1.0–1.8 for the same role; tracking that ran from 0.12 em to
0.38 em on uppercase labels; and a second 10-step scale (the portal sheet) on
bag, compare, checkout, journal, about, policy and showrooms.

| What was wrong | The fix | Measured @1440 |
|---|---|---|
| 9 / 9.5 / 10 / 10.5 / 11 / 11.5 px all used for uppercase labels | One `label` step, 11 px, `line-height 1.2` | 811 elements across six sizes → 815 across one |
| 12 / 12.5 / 13 / 13.5 px for metadata and nav | One `meta` step, 12 px, `line-height 1.45` | 1,610 → 1,566; 12.5 / 13 / 13.5 gone from storefront pages |
| 14 / 15 / 16 / 17 px body copy | One `body` step, 14 px, `line-height 1.6` | 1,096 → 1,156; 15 / 16 / 17 px: 158 → 2 |
| Headings at 18 / 20 / 22 / 24 / 26 / 28 / 30 / 36 / 42 / 44 / 48 / 52 / 60 / 88 | Two fluid steps: `title` `clamp(22px, 1.7vw, 26px)`, `display` `clamp(36px, 3.4vw, 48px)`, plus the hero instance `clamp(72px, 6.2vw, 88px)` — the design's own arc reproduced | 18–30 px: 470 → 456 at 24.48; 36–60 px: 112 → 106 at 48; the 88 px hero is unchanged |
| A second 10-step scale in `portal-premium.css` (11 / 12 / 12.5 / 13.5 / 14 / 15 / 17 / 20 / 22 / 26 / 34) on real storefront pages | The `--p-fs-*` tokens are re-pointed at the storefront steps | bag / compare / checkout / about / policy / showrooms / education / journal: 8 sizes → 5 |
| Leading: `--leading-body: 1.8` in the token file, 1.7 on the cards, 1.6–1.63 elsewhere | One value per role: display 1.02, title 1.12, body 1.6, meta 1.45, label 1.2 | every text node now reports one of the five ratios |
| Tracking: 0.12–0.38 em on uppercase, `tracking-wide` on prices | One label value, **0.18 em**, uppercase only; −0.015 em display and −0.01 em title; **0** on tabular figures | 12 tracking values → 3 |
| Orphan words and mid-name truncation | `text-wrap: balance` on h1–h4, `text-wrap: pretty` on prose, `line-clamp-2` on the card title (was 1, which cut "1.31 ct Violetish Blue…") | card names now read in full |
| No hanging punctuation on the three client quotes | `blockquote p { text-indent: -0.4em; hanging-punctuation: first last }` | quote mark hangs outside the text block |

**Result: every catalogue and editorial page renders exactly five sizes**
(11 / 12 / 14 / 24.5 / 48 at 1440; 11 / 12 / 14 / 22 / 36 at 390). The home page
renders six because its h1 is the display step at hero scale. The two sign-in
frames (`/account/login`, `/account/register`) keep `console-auth.css`'s own
scale and are listed under "left alone".

## 2. Spacing and alignment

| What was wrong | The fix | Measured |
|---|---|---|
| **7 px horizontal overflow at 1024** (reported in v3), and **84 px on `/products/[slug]`** | Root cause: `aspect-[3/4]` plus `min-h-[450px]` gives the card an implied *width* floor of 337.5 px, which is wider than a third column at a 1024 px viewport. The ratio owns the height; the floor was removed for that card only | 1024 px: home 7 → **0**, `/shop` 4 → **0**, `/products/[slug]` 84 → **0** |
| Section rhythm mixed `py-20` (80 px), `py-24` (96 px) and `py-28` (112 px) | One fluid step, `clamp(72px, 6vw, 96px)` | all three classes resolve to 86 px @1440 |
| Card padding varied `p-6` / `p-7` / `p-8` between cards in one grid | 24 px below 640, 32 px above | every media plate shares one inset |
| Spacing values were one-offs (2 / 6 / 10 / 14 / 22 …) | A 4 px-base / 8 px-rhythm set, declared as the only spacing tokens the craft rules consume | see `--mh-s-6`, `--mh-s-8`, `--mh-section` |
| Price slider's `$2,480` / `$28,500` labels sat 12 px under the track in a lighter grey | Same row, same size step, AA colour | see §3 |

Nothing was moved to a different grid: the alignment work is the removal of the
one accidental width floor, the unification of the three section rhythms, and
the single card inset.

## 3. Contrast and colour (this closes the axe `color-contrast` findings)

Hue and saturation are unchanged. Only lightness moved, and only as far as AA
needs: the base gold `#9A7B2C` (HSL 43° 56% 39%) becomes `#7C6323` (43° 56%
31%); the muted grey `#8A857B` (40° 6% 51%) becomes `#6B675F` (40° 6% 42%).

| Pair | Surface | Before | After | AA (4.5) |
|---|---|---|---|---|
| Gold eyebrow / "All Budgets" value | `#FFFFFF` | 4.00 | **5.73** | pass |
| Gold eyebrow | `#FBF5E7` (worst cloud composite) | 3.68 | **5.27** | pass |
| Gold eyebrow | `#F6F2E9` (warm alabaster) | 3.58 | **5.13** | pass |
| Gold eyebrow | `#FFFDF9` (card) | 3.94 | **5.64** | pass |
| Gold chip text | `#FAF3E3` | 4.37 | **5.18** | pass |
| Gold card price (`#9A7432`) | `#FFFDF9` | 4.20 | **5.64** | pass |
| Muted meta (price slider min/max) | `#FFFFFF` | 3.67 | **5.63** | pass |
| Muted meta | `#F6F2E9` | 3.29 | **5.04** | pass |
| Muted caption | `#F7F5F0` | 4.40 | **5.17** | pass |
| 360° badge text (`#4F4C49` composited) | `#D4B883` | 4.46 | **9.90** | pass |
| 360° badge text | `#C5A059` | 3.47 | **7.71** | pass |
| **Focus ring** | `#FFFFFF` | 2.10 | **5.73** | pass (≥3 for UI) |
| **Focus ring** | `#F6F2E9` | 1.88 | **5.13** | pass |
| Focus ring on obsidian | `#0A0A0B` | 9.41 | **12.25** | pass |
| Gold link in the footer | `#0A0A0B` | 4.94 | **12.25** | pass |
| Muted footer text | `#0A0A0B` | 5.39 | **7.82** | pass |

Two mechanisms, not 109 one-off patches:

- **A contextual pair.** `--mh-gold-ink` / `--mh-muted-ink` resolve to the paper
  values by default and are re-solved inside `header`, `footer`, `.mgh-hero` and
  every `bg-[#0A0A0C] / [#0A0A0B] / [#141416] / [#14110D] / [#121316] /
  [#1A150E]` container. One class on a dark band is enough for every gold label
  inside it, so the footer's gold link does not darken itself into 2.4:1.
- **The state fix behind the 360° badge.** The thumbnail's inactive state was
  `opacity-75` on the *button*, which also faded the opaque `#C5A059` chip and
  its text. The opacity moved to the photograph; the badge stays at full
  strength and the inactive state is carried by the image and border.

## 4. States

| Element | Before | After |
|---|---|---|
| Focus ring | 1 rule, `#D4AF37` 2 px: **2.10:1** on white, 1.88:1 on cream | 2 px ring at 2 px offset, `#7C6323` on paper (**5.73:1**) and `#E6C97A` on obsidian (**12.25:1**), plus a halo; still one rule |
| Hover | present, inconsistent (colour, scale, shadow, translate mixed) | one easing, state duration 150 ms for colour, move duration 300 ms for lift; **no hover scale on any button or link** |
| Active | `active:scale-90/95` on the bag, card and gallery controls | colour/brightness only; press never moves the target |
| Disabled | unstyled on most controls | `opacity .55`, `cursor: not-allowed`, `pointer-events: none` |
| Loading | route skeletons exist (`ListSkeleton`, `aria-busy`) | unchanged; `[aria-busy=true]` now also reads as a busy cursor on controls |
| Focus-within | inputs focused in isolation | the field group's label acknowledges focus (`:focus-within` on `.lx-account-field`, `.mgh-field`, `fieldset`) |
| Touch target | **26 axe `target-size` nodes** — the nine home category links were 16×11 px | **0**. Inline links are `inline-flex; min-height: 24px`; pills and form controls are 40 px tall; header icon buttons keep their 32 px visual box and gain a 44 px hit area through a pseudo-element (a 44 px row does not fit a 390 px header — measured) |

Empty, loading and error states already existed for every data surface
(`ListSkeleton`, `CatalogErrorView`, the portal empty state, route-level
`loading.tsx` / `error.tsx` for the catalogue). They were not redesigned; they
inherit the type scale by token.

## 5. Motion

| What was wrong | The fix |
|---|---|
| Three easing curves in the CSS (`cubic-bezier(.22,.68,.32,1)` ×14, `(.16,1,.3,1)` ×1, `(.22,1,.36,1)` ×1) plus Tailwind defaults | one curve, `cubic-bezier(.16,1,.3,1)`, as `--mh-ease` |
| Entrance was an untimed inline-style jump (`opacity .01 → 1`) | `--mh-dur-enter: 520 ms` on `[data-reveal]`, so the enter is the designed 420–620 ms |
| Durations were 200/300/500/700/1200 ms | three durations: 150 state / 300 move / 520 enter |
| Buttons scaled on hover and press | removed |
| `scroll-behavior: smooth` outside a reduced-motion guard | guarded |
| Reduced-motion cancelled CSS transitions but not the reveal or the hover lift | transitions to 0.01 ms, transforms off, reveal off, drift off, smooth scroll off |

Stagger exists only where order is information (`--reveal-delay` per item in the
reveal choreography); no section staggers its children decoratively.

## 6. Details

| Detail | Before | After |
|---|---|---|
| Selection | one gold at 0.3 alpha, ink inherited | `rgba(212,164,55,.32)` on paper, `rgba(230,201,122,.28)` inside dark bands, explicit ink both ways |
| Scrollbar | browser default | thin warm scrollbar (WebKit + `scrollbar-color`), gold thumb with a 2 px inset |
| Hairlines | 1 px everywhere **except** the 1.5 px gold rule under card eyebrows | one hairline weight |
| Radius scale | 2 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / full, mixed inside one component | 2 (control) / 8 (soft) / 24 (media plate) / circle, assigned by role |
| Numerals | tabular on some prices, `tracking-wide` on the price, proportional on the slider | tabular and zero-tracked wherever a count or price appears |
| Image ratios | cards and the PDP plate already declared an aspect; loose images had no guard | every absolutely-placed image is `100%` box + `object-fit: cover`; every `aspect-*` box clips |
| Print | reveal-dependent content printed invisible | a print block forces `opacity: 1`, no transforms |
| Orphan copy | ellipsised card names | `line-clamp-2` + balance |

## Gates

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` | **0 errors** (9 projects) |
| `next build --webpack`, `DATABASE_URL` unset, `apps/web/.env` moved aside | **exit 0** |
| `@maihan/web` tests | **604 passed / 21 skipped** (unchanged; baseline 604/21) |
| `node scripts/check-slop.mjs` | **clean** |
| axe (WCAG 2.0/2.1/2.2 A+AA, 141 captures) | **0 violations** (was 125 nodes) |
| Horizontal overflow | **0** at 1440 / 1024 / 768 / 390 |
| Budgets (`check:budgets`) | **213.1 KB category / 208.0 KB product** — byte-identical to the baseline; the pre-existing overrun is untouched and unchanged |

## Deliberately left alone

- **Hue, saturation, copy, layout, component composition.** Only lightness moved
  in the palette, and only where AA required it.
- **The card price stays on the title step.** It is 24.5 px against a 26 px
  title — close, and it is the design's own hierarchy (the price is displayed,
  not de-emphasised). Moving it down a step would have been a redesign.
- **Header icon buttons keep a 32 px visual box.** A 44 px row of five controls
  does not fit 390 px (measured); WCAG 2.2 2.5.8's floor is 24 px and they clear
  it, and the hit area is 44 px via a pseudo-element.
- **Font families.** Cormorant / EB Garamond / Jost / JetBrains Mono are the
  design's; the pass only sets sizes, leading and tracking.
- **The admin and vendor consoles.** They share `mgh-applet.css` (the focus ring
  now reads a variable with the old gold as fallback) but none of the storefront
  scale, contrast or radius rules apply to them.
- **`/account/login`, `/account/register`.** They mount `console-auth.css`, a
  separate sign-in frame shared with the consoles; normalising it would change
  the admin/vendor login look too.
- **The 12 environmental HTTP 500 captures.** `/api/fresh/catalogue/gemstones`
  and `/api/fresh/auth/addresses` are unimplemented without `DATABASE_URL`;
  they are a backend gap, not a design one.
- **`contrast-incomplete`.** axe cannot decide contrast over the gradient
  fields. Every pair that occurs there is checked numerically in §3.
- **The demo-content badge.** It is a fixture notice with its own stylesheet,
  not part of the design; it now shares the type scale but keeps its position.

## Screenshot basis

Same as v3: the catalogue is **fixture-backed demo content** (`DEMO_CONTENT`),
because main's locked database has no product rows and the adapter falls back to
develop's ledger. Prices, references and availability in these images are
illustrative, not inventory. Live catalogue rendering is proven by the adapter
unit tests, not by these captures.
