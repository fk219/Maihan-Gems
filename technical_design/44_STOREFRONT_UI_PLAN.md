# 44 STOREFRONT UI — EXACT COPY + POLISH PLAN

**Status:** Approved (owner, 2026-10-28). "Make sure the exact UI of all pages is copied exactly from MaihanGems Frontend, complete all pages, polish the UI."
**Companion to:** `technical_design/42` (codes), `technical_design/43` (platform schema), `apps/fresh-api` (data source).

---

## 1. Key finding (why the data rewiring is the core task)

The M1–M8 applet migration copied the UI verbatim (42 components, 42 pages — verified). But the data seam is dead:

- `apps/web/src/lib/mgh/storefront-data.ts` is **`@ts-nocheck` + 100% fixtures** (invented stones/settings/orders).
- The M2–M6 adapters (`lib/mgh/adapters/catalog.ts` etc.) call **packages/db repositories on the locked schema — which was dropped** at cut-over.

So every storefront page today shows fake data or crashes. All pages are re-pointed at **`fresh-api`** (`FRESH_API_URL`, default `http://127.0.0.1:3010`).

## 2. The 5 reference-folder pointers — implementation

| # | Pointer | Status | Task |
|---|---|---|---|
| 1 | 4 extra pages: `/gemstones`, `/card-preview`, `/concierge`, `/demo` | not copied | Copy verbatim into `(storefront)` group, import paths adjusted |
| 2 | Cmd+K palette (`shell/CommandPalette.tsx` + ⌘K/ctrl-K hotkey) | component copied; fixture-fed | UI unchanged; `searchCatalogue` → fresh-api search (gemstones + settings + products) |
| 3 | DYO configurator matrix (4 steps) + settings metal-dot grid / size selector / size guide | components copied; fixture-fed | metal grid → fresh `metals` (14 codes); DYO steps → real settings + stones reads; **quote/submit disabled honestly** until F3-commerce |
| 4 | AR handoff UX (`ArViewerPageClient`, `ThreeGemstoneStudio`, QR handoff) | ported in M3; reads dropped `webar_assets` | model lookup → fresh `assets` (`kind='MODEL_3D'`, `vto_ready`); honest empty states until real models exist (0 today) |
| 5 | i18n switcher (EN/FR/AR in StorefrontHeader) | ported, active | verify + screenshot-proof in polish pass |

## 3. Owner decisions (2026-10-28)

| Decision | Value |
|---|---|
| Ring sizes | **Standard US ring sizes (4–9.5) as a presentation constant** — industry standard, not inventory data (fresh DB carries no sizes by design) |
| CMS | **Sanity will be integrated** for editorial content (about/education/blog/policy/showrooms) — ADR-036 records the decision. Until wired: honest "coming soon" placeholders; the data seam stays behind one interface (`cms-source.ts`) so the Sanity adapter plugs in without page rewrites |
| Account/favorites/cart/checkout pages | Shown with **sign-in prompts / store-closed honest states** in this phase; real flows land with F3-commerce |

## 4. Steps and tracking

| Step | Scope | Status |
|---|---|---|
| 1 | Fidelity audit: 42/42 components present; 15 exact, 12 minor drift (documented infra seams: /mgh prefixes, null-safety, async data), 5 major rewrites (fake→real flows from M4–M6, intentionally NOT reverted) | ✅ DONE 2026-10-28 |
| 2 | 4 missing pages copied (`/gemstones` alias, `/card-preview`, `/concierge`, `/demo`); old dead root `/demo` removed (route collision) | ✅ DONE |
| 3a | Read layer: `lib/mgh/adapters/catalog.ts` fully rewritten onto fresh-api (same exports; pages untouched); `adapters/dyo.ts` rewritten; layout FX/offline seam replaced (fresh constants); fresh-api upgraded (primary_image/pieces joins, `q` text search, slug-or-ref detail, metals/shapes/colours/origins/settings-by-design/setting-detail endpoints) | ✅ DONE |
| 3b | Batch 1: home + browse/shop + gemstones hub + variety/colour landings live on fresh data (60 real stones verified on /browse) | ✅ DONE |
| 3c | Batch 2: PDPs live — gemstone detail (by slug/ref), product detail (composition trace), settings detail (design variants + carat range + shapes) | ✅ DONE |
| 3d | Batch 3: search (fresh `q`), settings matrices (metals = real variants; sizes = approved constant), DYO pool (honest-empty until vendor photos; quote step deferred to commerce); CommandPalette re-uses the same searchCatalogue seam | ✅ DONE |
| 3e | Batch 4: CMS pages → honest "ComingSoon" placeholders (Sanity per ADR-036); contact showrooms → appointment line; AR/3D → fresh assets seam (0 models → honest states); **legacy URL-parity proxy retired** (ADR-035): host security + sister-house stamping kept | ✅ DONE |
| 4 | Polish: no-photo cards → house gem tile (variety initial, never fixture photos); unpriced → "Price on request" (never $0); verified 0 fixture images on /browse | ✅ core DONE (remaining: per-route skeletons exist at root; LCP/a11y sweep scheduled) |
| 5 | Verify: build green; routes 200 with real data (status sweep + content greps); known follow-up: catch-all soft-404 (streams 200 before notFound) recorded below | ✅ DONE |

**Design-fidelity pass (2026-10-29, owner: "all links visually modified; match the exact reference design"):**
- **Root cause of the blue underlined links:** the reference applet runs WITH Tailwind preflight (strips browser link styling); our migration layer deliberately skips it. Fix: scoped base rules in `mgh-applet.css` — `.golden-cloud-gallery a:not([class])` inherits colour + no underline; every `a[class]` drops the default underline. Utilities still win. Verified in the shipped CSS bundle.
- **Pages re-copied verbatim from the reference** (import-path/asset-prefix/data-source swaps only): `/varieties` (full editorial hero + marquee + subcategory grid + colour swatches), `/varieties/[varietySlug]`, `/settings/[settingSku]` (the applet SettingDetailGallery/Client/BelowFold components — previously a hand-built text page), `/contact` (SALON CONCIERGE layout + form).
- **Gates + editorial + not-found restyled to the exact applet not-found pattern** (obsidian bg, mono gold eyebrow, EB Garamond display, `gold-gradient-cta` + gold-border secondary): `/admin`, `/vendor`, `/account`, all ComingSoon editorial pages, root `not-found.tsx` = reference file verbatim.
- Honesty kept: the reference's invented Diamond editorial card + Elysian-Ring fixture links are dropped from the varieties grid; unpriced cards show "Price on request"; showrooms show the single appointment card.

**Applet preflight fix (2026-10-29, owner: "inputs/buttons/links still ugly — fix with your design logic"):** the scoped link rules from the earlier pass were insufficient AND landed in the wrong cascade position (base declared after utilities). Proper fix in `mgh-applet.css`: explicit layer order (`@layer theme, base, components, utilities`) + the **official `tailwindcss/preflight.css`** imported into `base` — the same preflight the reference applet gets from `@import "tailwindcss"`. Now ships: link colour/underline inherit, button/input chrome stripped (transparent background, inherit font/colour, appearance reset), list/table/media resets, and the reference's **gold `*:focus-visible` ring** (`outline: 2px solid #D4AF37 !important` — replaces the browser's ugly active state on inputs) + muted placeholder tone. Verified: all markers present in the shipped bundle referenced by `/browse`; utilities layer still wins over base.

**Commerce + portals build (2026-10-29, owner: "start with commerce flows as well as admin + vendor portal UIs"):**
- **Commerce write engine on fresh-api** (`src/commerce.ts`): carts (guest tokens, lines with price snapshots, one-of-one qty cap), checkout (discounts validated against the table — window/limit/min/usage; **tax via the domain engine** `assessTax` — AE/TH/GB applied, elsewhere honest 0; shipping 0 with pending-fulfilment note), order placement (number, items snapshot, order_events timeline), **inventory reservations** (gemstone RESERVED at checkout, SOLD at payment; product reservations; concurrency guard via `FOR UPDATE` + status checks), and the **dev test payment instrument** (`provider='test'`, double-pay guarded). Live-verified: $7,500 order → AE tax $375 → PAID → double-pay 409.
- **Same-origin proxy**: `app/api/fresh/[...path]/route.ts` forwards to fresh-api, attaching admin/vendor httpOnly cookies; `/api/fresh-admin/login` + `/api/fresh-vendor/login` verify upstream and set cookies. Admin cookie calls return JSON; unauthenticated 401.
- **Admin console** (`/admin`): password login (dev password `FRESH_ADMIN_PASSWORD`), tabs Submissions (approve/reject → mints codes)/Catalogue/Orders. **Vendor portal** (`/vendor`): key login, My Submissions, New Submission form (gemstone/setting/product) carrying the vendor's own reference.
- Honest notes: payments are the dev test instrument (real PSPs are owner-gated); shipping is 0 pending fulfilment rates; DYO quote→cart conversion deferred (configurations POST is the seam).

**DYO conversion + soft-404 fix (2026-10-29):**
- **DYO configurations API**: `POST /api/v1/configurations` (setting + gemstone by semantic ref; composition law F-INV-02/03 + carat-range validated; component prices summed → server quote `DYO-####` minted; dupe hash returns existing), `GET /api/v1/configurations/:code` (full dossier), cart accepts `configuration_code` (line at quoted price).
- **Live-verified DYO→order flow**: vendor gemstone (priced) + vendor setting (priced) → config `DYO-0003` ($2,900+$1,200=$4,100) → cart → checkout (AE tax $205) → test-paid → **gem SOLD**, order item snapshot `DYO-0003`.
- **Applet configurator rewired**: POSTs to `/api/fresh/configurations`; review dossier fetches the fresh configuration (`dyo-server` → fresh-api); **Acquire Commission button** converts to cart (session tray token) → walks to checkout.
- **Soft-404 FIXED at the edge**: proxy middleware now checks single-segment paths against the cached variety registry (5-min TTL) + known app-route prefixes — unknown → true 404 before any shell streams. Verified: `/nonexistent-page-xyz` → **404**, `/sapphire` → 200.
- Two checkout bugs found and fixed by the E2E: order-item `code_snapshot` double-prefix (`DYO-DYO-…`) and the configuration gemstone_id not carried into order_items (gem never sold).

**Known follow-ups (recorded, not blockers):** (1) catch-all soft-404 — unknown `[varietySlug]` renders the branded not-found body with HTTP 200 because the root loading skeleton flushes before notFound(); needs a pre-stream guard. (2) DYO pool empty until vendor photos arrive (honest). (3) dead `lib/storefront-data.ts` + old commerce/admin routes remain non-functional legacy (retired at cut-over). (4) Sanity adapter + credentials (separate increment).

## 5. Verification standard (per batch)

`tsc` + `eslint` clean → `next build` success → live curl of every touched route returns 200 with fresh data → audit tracker updated.

## 6. Explicit non-goals for this phase

Cart/checkout/account **write flows** (F3-commerce), real CMS content (Sanity integration — separate increment), AI concierge provider wiring, 3D model content (assets exist as a schema, models come later).
