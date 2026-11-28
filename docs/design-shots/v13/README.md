# v13 — "Maihan Group App & Portal Design System v2"

Status: measured on `main` plus this pass. The client decision of 2026-11-28
applies the document to the **admin portal, the vendor portal and the
storefront**, with one explicit correction: the storefront keeps its editorial
**composition and type scale** and adopts the system's **families, colour,
radius and component chrome**. ADR-030 records the adoption; ADR-031 records the
two libraries. Nothing in `api/`, `packages/`, the database or the migration
tooling changed.

Screenshots: `docs/design-shots/v13/{admin-login,vendor-login,home}-{1440,768,390}.png`.
Measured: `docs/design-shots/v13/audit.json` (`apps/web/scripts/v13-system-audit.mjs`).

---

## 1. What changed, in one screen

| Surface | Before | After |
|---|---|---|
| Families | Cormorant Garamond + Jost (storefront), Urbanist (console), Inter (frames) | **Montserrat** (display + figures) + **Manrope** (body + UI), two families everywhere |
| Storefront type | editorial sizes, 5 families in play | same editorial sizes, 2 families, Montserrat figures |
| Storefront chrome | 4 / 16 / 28 px radii, gold ink `#7c6323`, paper panels | 12 / 16 / 18 px radii, deep-gold ink, gold top hairline, 1 px hover lift, 8.5 px chips |
| Console | Urbanist, 22 px cards, 10 px controls, bright gold gradient | Manrope/Montserrat, 16 px cards, 12 px fields, 22 px navy sidebar, deep-gold pill CTA |
| Login frames | Cormorant on paper, 28 px card, 4 px ink button | Montserrat on canvas, 16 px card + gold hairline, 12 px inputs, deep-gold pill CTA |
| Skeletons | hand-rolled shimmer spans | **Skullet 0.0.3** `SkeletonBox` bones |
| Toasts | sonner mounted, never called; one inline 2.5 s notice | **Sileo 0.1.6**, one `<Toaster>` per root, policy enforced |

---

## 2. Token list — `apps/web/src/styles/maihan-system.css`

**Gold** `--mi-gold #C9A84C` · `--mi-gold-bright #E8C96A` · `--mi-gold-soft #F1DC9B` ·
`--mi-gold-wash #F5E8C0` · `--mi-gold-pale #FBF5E6` · `--mi-gold-deep #8B6914` ·
`--mi-gold-ink #99731E` · derivatives `--mi-gold-cta` (135° gradient),
`--mi-gold-line`, `--mi-gold-line-strong`, `--mi-gold-wash-08`, `--mi-gold-ring`.

**Navy** `--mi-navy #0D1B2A` · `--mi-navy-2 #132234` · `--mi-navy-3 #1C2E3F` ·
`--mi-navy-deep #08121E` · `--mi-navy-deep-2 #0B1626` · `--mi-navy-deep-3 #0A1320`.

**Light neutrals** `--mi-canvas #F8FAFC` · `--mi-surface #FFFFFF` · `--mi-ink #0D1B2A` ·
`--mi-muted #64748B` · `--mi-faint #94A3B8` · `--mi-line #E2E8F0`.

**Dark neutrals** (`.dark`, `[data-theme="dark"]`, `[data-portal-theme="dark"]`):
canvas `#08121E`, surface `#0B1626`, ink `#F1F5F9`, muted `#94A3B8`, faint `#64748B`,
line `rgba(226,232,240,.13)`, plus re-solved card/capsule shadows and skeleton fills.

**Status** positive `#059669 / #34D399` · negative `#E11D48 / #FB7185` ·
info `#0EA5E9 / #38BDF8` · warning `#D97706 / #F59E0B`, with `-soft` tints.

**Radius** `--mi-r-auth 4` · `xs 8` · `sm 10` · `input 12` · `card 16` ·
`card-lg 18` · `dialog 20` · `sidebar 22` · `sheet 24` · `dock 26` · `pill 9999` (px).

**Elevation** `--mi-shadow-gold`, `-gold-sm`, `-gold-nav`, `-card`, `-card-hover`,
`-dialog`, `-capsule-light`, `-capsule-dark`, `-sidebar-panel`.

**Motion** `--ease-silk cubic-bezier(.22,1,.36,1)` · `--ease-expo cubic-bezier(.16,1,.3,1)` ·
`--dur-160` · `--dur-240` · `--dur-550`.

**Type** `--mi-font-display` (Montserrat), `--mi-font-sans` (Manrope),
`--mi-fs-label 8.5px`, `-micro 10`, `-meta 11`, `-ui 12.5`, `-body 14`, `-title 18`,
`-display 26`, `-button 11`, `--mi-track-label .12em`.

**Scopes** `.font-portal` (also `.portal-shell`, `.portal-theme`, `.mh-auth`):
Manrope body, Montserrat headings, tabular lining numerals (`tnum`/`lnum`),
gold selection `rgba(201,168,76,.30)`, 2 px gold focus ring at 2 px offset.

---

## 3. Primitives — `apps/web/src/components/system/`

| Primitive | Recipe |
|---|---|
| `Button` | `primary` 135° gold gradient, white 11 px/800, +0.12 em, 9999 px, 1 px hover lift; `secondary` surface capsule + hairline; `danger` negative fill; `quiet` text; `sm`, `iconOnly` (44 px, 34 px small) |
| `Input` | 12 px radius, 1 px `--mi-line`, 44 px min height, gold border + 3 px gold ring on focus, tabular lining |
| `Label` | 10 px/700, +0.12 em, uppercase, muted |
| `Card` | 16 px, surface, 1 px gold top hairline (faded at both ends), `interactive` adds the 1 px lift |
| `Chip` | 9999 px, 8.5 px/700, +0.12 em, uppercase; tones neutral/gold/positive/negative/info/warning |
| `Kpi` | Montserrat figure, Manrope label, signed delta (arrow + sign, never colour alone) |
| `Toaster` | Sileo mount + `notify` / `notifySuccess` / `notifyError` |

The recipes are CSS (`.mi-*`) and the console class names are declared in the
same selector lists, so the mounted consoles take the identical rules without a
markup rewrite.

---

## 4. The storefront: families change, composition does not

Kept exactly: section order (hero → varieties → jewellery → house → DYO →
record → try-on → closing → footer), full-bleed plates, one-statement-per-screen
rhythm, card rails, scroll behaviour, every editorial size and leading.

Adopted: Montserrat + Manrope, the radius scale, gold tokens, the button /
input / card / chip recipes, tabular lining figures, the 2 px gold focus ring.

**Every type-scale call, element by element:**

| Element | Editorial value (kept/changed) | System value used | Call |
|---|---|---|---|
| Hero h1 `.mh12-display` | 40 → 88 px, 600, −0.02 em | display family | **size kept** (editorial), family → Montserrat |
| Section statements `.mh12-h1/h2/h3` | 32/24/20 → 64/40/24 px | display family | **size kept** |
| Body `.mh12-body` | 16/26 | Manrope | **size kept**, family → Manrope |
| Card name | 16 px | display family | **size kept**; family → Montserrat |
| Card fact / price | 14 px | `--mi-fs-body` = 14 px, tabular lining | coincides; figures → Montserrat |
| Footer wordmark | clamp 2.5–4 rem | display family | **size kept**, family → Montserrat |
| Labels / eyebrows | 11 px, +0.18 em | 11 px label, +0.12 em only on chips | **size + tracking kept** (editorial label voice) |
| Chips (`.demo-content-badge`, `.mi-chip`) | 12 px | **8.5 px/700, +0.12 em** | **system** |
| Primary button `.mh6-button`, `.mh12-closing__button` | 14 px/400 hairline, 11 px/500 paper pill | **11 px/800, +0.12 em, gold pill** | **system** |
| Inputs (search form, account fields, DYO) | 4 px radius, varied sizes | **12 px radius, 44 px min, 14 px text** | **system** |
| Card plates `.mh12-card__frame` | 12 px radius, hairline, no shadow | **16 px + gold top hairline + 1 px lift** | **system** |
| Card/collection surfaces `.mh-card` | 16 px, shadow, no lift | 16 px + hairline + **1 px lift** | system |
| Storefront mono (`--font-mono`) | JetBrains Mono | **Manrope tabular** | **system** (two-family rule); SKU/mono text loses the mono face |
| Editorial arrow links `.mh12-action`, `.mh6-link` | text + growing rule | — | **kept**: they are the page's action language, not buttons |

---

## 5. The consoles

**Admin and vendor (mounted) — `apps/web/src/styles/portal-premium.css`.**
No component logic changed. The `--p-*` token block now aliases `--mi-*`, and a
final `v13` section restates the fourteen component recipes after the originals:
sidebar (22 px navy capsule, gold top hairline, `--mi-shadow-sidebar-panel`),
nav active state (deep-gold capsule, white label), top-bar search (pill, 44 px),
chips (pill, 8.5 px/700), cards (16 px + hairline), tiles (1 px lift), KPI and
stat figures (Montserrat tabular), table headers (10 px/700 +0.12 em), inputs
(12 px, 44 px, gold focus), segmented control (12/8 px), badges (chip recipe +
status tones), command palette / notification panel / drawer (20 px dialog
radius), buttons (primary/secondary/danger/icon/small).

**The Fresh consoles — `AdminConsoleFresh.tsx`, `VendorConsoleFresh.tsx`.**
Every hard-coded hex was replaced with the token of the same role
(`#0A0A0B → var(--mi-canvas)`, `#D4AF37 → var(--mi-gold)`, `#8A857B →
var(--mi-muted)`, `#991B1B → var(--mi-negative)`, …) and their CTAs now use the
`mi-btn` primitive classes. Their layout and logic are untouched.

**Sign-in frames — `apps/web/src/app/console-auth.css`.** `.mh-auth` and
`.auth-shell` read the tokens: navy-deep aside, canvas panel, 16 px card with a
gold top hairline, 12 px inputs with the gold focus ring, and the primary
button recipe (deep-gold pill, white 11 px/800, 1 px hover lift). The old
`--auth-*` locals are aliases, so the class names did not move.

---

## 6. Skullet and Sileo — verification

| Package | Version | Licence | Repository | Published | Weekly downloads (2026-11-21→27) |
|---|---|---|---|---|---|
| `skullet` | 0.0.3 | MIT | `github.com/lochie/skullet` | 2026-10-31 | 337,666 |
| `sileo` | 0.1.6 | MIT | `github.com/hiaaryan/sileo` | 2026-10-13 | 90,290 |

Both are real npm packages, verified against the registry before install and
recorded in ADR-031. Skullet is pre-1.0; it is pinned exactly.

**Skullet** — `components/design-system/Skeleton.tsx` renders `SkeletonBox`, so
`ListSkeleton`, `ProductDetailSkeleton` and `CollectionExplorerSkeleton` keep
their measured geometry (the same boxes they reserved before) and every bone is
the package's. The theme comes from Skullet's CSS custom properties, not the
provider, so the 53 KB module stays in the routes that render a skeleton
(6.6 KB raw / **3.0 KB gzip** chunk). Skullet's own reduced-motion handling
stops the shimmer; no extra guard was added.

**Sileo** — one `<Toaster>` at the portal root (admin page, vendor page) and one
at the storefront root; `sonner` is no longer mounted. The recipe is enforced in
CSS (`[data-sileo-pill]` / `[data-sileo-body]` stroke gold 25 %, fill navy-deep
95 %, `roundness: 16`) with Manrope copy. Policy: success 4000 ms, error 6000 ms,
dedupe by title+description while visible, maximum three (oldest dismissed).
The toaster mounts on the **first** notification, so its chunk (157 KB raw /
**51.9 KB gzip**, including its `motion` runtime) never loads on a page that
shows no toast. `SettingDetailClient`'s ad-hoc inline notice now calls
`notifySuccess`.

`sileo` declares `motion ^12.34.0`; `pnpm-workspace.yaml` pins `sileo>motion` to
the app's `^14.5.0` (Sileo imports only the `motion` proxy). One motion in the
bundle.

---

## 7. Measured gates

| Gate | Result |
|---|---|
| `tsc -b` | **0 errors** |
| `next build` with `DATABASE_URL` unset | **exit 0** |
| Tests | **618 passed / 21 skipped** (62 files passed, 2 skipped) — baseline unchanged |
| `node scripts/check-slop.mjs` | **clean** |
| axe (WCAG 2.0/2.1/2.2 A+AA), 3 surfaces × 3 widths | **0 violations, 9/9 captures** |
| Document overflow | **0 px** at 390 / 768 / 1440 on all three surfaces |
| Page errors / non-200 | **0** |
| Rendered families | **Manrope + Montserrat only** on all nine captures |
| Initial JS (14 scripts, gzip) | `/admin/login` **211.0 KB** · `/vendor/login` **211.1 KB** · `/` **210.8 KB** |
| Deferred library chunks | Sileo **51.9 KB gzip** (first toast only) · Skullet **3.0 KB gzip** (skeleton route only) |
| JS budget (+15 KB) | **No new initial script entered the HTML.** The initial set is the same 14 framework/app scripts; the only module-level addition is the `<Toaster>` wrapper (well under 1 KB). Both libraries are lazy. Homepage script transfer fell from 258.1 KB to **206.3 KB** once the toaster became lazy |

Method for the JS numbers: `scripts/v13-initial-js.mjs` parses the `<script>` and
`rel=preload as="script"` tags in the server HTML and gzips exactly those files;
`scripts/v13-bundle-measure.mjs` reads `PerformanceResourceTiming.encodedBodySize`
from a real Chromium load. Both run against the production build on port 3113.

---

## 8. What the document asks for that is not implemented, and why

1. **Global `--font-display` / `--font-sans` on `:root`.** They are exposed
   inside `.font-portal` and the three portal roots, and on `body`. Declaring
   them on `:root` would silently replace the storefront stack as a side effect,
   which the client's storefront exception forbids. The variables are still
   available everywhere a portal or the storefront consumes them.
2. **White 11 px/800 on the bright gold gradient.** White on `#C9A84C` is 2.1:1.
   The recipe is implemented with the deep end of the same gold scale
   (`#94701C → #8B6914 → #7E5F11`, all ≥ 4.5:1 against white). The bright stops
   remain for light, hairlines and non-text fills.
3. **Skullet's measuring mode.** Route-level loading states have no data to
   measure, and fabricating sample products to measure against would violate the
   repository's no-fabricated-source-data rule. The package's explicit
   `SkeletonBox` surface is used instead; `Skeleton data/sample` remains
   available for a surface that later has real samples.
4. **Sileo's default singleton.** `sileo@0.1.6` keys its store on `id`, so two
   toasts without one collapse. The wrapper passes a stable `id` per
   title+description (the runtime accepts it; the 0.1.6 types omit it) so the
   three-toast ceiling works.
5. **"Two-person gold focus ring"** in the client clarification is read as
   **two-pixel** gold focus ring (2 px, 2 px offset) — the interpretation that
   matches the document's focus recipe. If a two-tone ring was meant, it is a
   one-token change (`--mi-gold-ring`).
6. **Sheets, docks and dialogs** have tokens (24 px / 26 px / 20 px) but no new
   component was built: the console has no sheet or dock surface yet.
7. **The document itself is not in the repository.** Every value used comes from
   the client brief of 2026-11-28 (the seven gold stops, six navy stops, radius,
   elevation, motion and component recipes) and is recorded in §2.

---

## 9. Files

| File | Change |
|---|---|
| `apps/web/src/styles/maihan-system.css` | **new** — tokens, scopes, primitives, skeleton/toast skin |
| `apps/web/src/components/system/*` | **new** — Button, Input, Label, Card, Chip, Kpi, Toaster, index |
| `apps/web/src/app/layout.tsx` | Montserrat + Manrope via `next/font`; imports the system sheet; body family |
| `apps/web/src/styles/portal-premium.css` | token aliasing + v13 component recipes |
| `apps/web/src/app/console-auth.css` | sign-in frames on the system |
| `apps/web/src/app/storefront-craft.css` | §17 storefront chrome + family alias |
| `apps/web/src/styles/home-v12.css` | §V13 families, figures, card plate, search radius, closing CTA |
| `apps/web/src/components/mgh/operator/{Admin,Vendor}ConsoleFresh.tsx` | hex → tokens, CTAs → primitives |
| `apps/web/src/components/mgh/catalog/CollectionExplorer.tsx` | skeleton → Skullet bones |
| `apps/web/src/components/design-system/Skeleton.tsx` | delegates to `SkeletonBox` |
| `apps/web/src/app/(storefront)/layout.tsx` | sonner → system `Toaster` |
| `apps/web/src/app/admin/[[...adminPath]]/page.tsx`, `…/vendor/[[...vendorPath]]/page.tsx` | portal-root `Toaster` |
| `apps/web/src/components/mgh/catalog/SettingDetailClient.tsx` | inline notice → `notifySuccess` |
| `apps/web/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | skullet 0.0.3, sileo 0.1.6, motion override |
| `technical_design/40_ARCHITECTURE_DECISION_RECORDS.md` | ADR-030, ADR-031 |
| `apps/web/scripts/v13-system-audit.mjs`, `v13-initial-js.mjs`, `v13-bundle-measure.mjs` | **new** — the gates |
