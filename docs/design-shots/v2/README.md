# Storefront v2 — "The Vault Light"

Status: implemented on `main`, verified 2026-11-26.
Scope: storefront chrome, every storefront route, the console/vendor sign-in
frames, and the demo catalogue seed. The locked architecture, API surface,
worker, media and payments are untouched (except two latent SQL defects in
`packages/db` that the demo catalogue exposed; see §7).

This folder is the evidence pack for the redesign: the page inventory, the
navbar restoration trail, the measured gates, the data basis, and one
screenshot per audited route at 1440 / 1024 / 768 / 390.

---

## 1. The argument

The previous storefront was a pale template: white cards on ivory, gold used
as a fill, a marquee of unverifiable claims, a brand-left 3-zone bar, and no
mobile navigation. The redesign replaces the template with a position:

| Question | Answer |
|---|---|
| What is the surface? | Ink and paper. Depth is light falloff and a hairline, never a lifted card. |
| Where is the gold? | Gold is **light**: a seam, a specular edge, a gradient clipped to one word. It is never a slab behind running text. |
| What is the type? | Cormorant Garamond is the voice; Inter is the instrument panel; JetBrains Mono carries references and money so columns align. |
| How does it move? | Enter, Pass, Hold. No bounce, no spin, no fade-up-everything. |
| What does it promise? | Only what a record carries. No "100% natural", no laboratory claim, no invented shipping, certificate, treatment, origin, financing or protection term. |

The visual reference points were named by the client — Bulgari, Louis Vuitton,
Rolex — and the "iPhone-like" precision requirement is read as: one idea per
viewport, exact alignment, generous negative space, no decorative noise.

---

## 2. Navbar restoration — where the structure came from

The client asked for the earlier bar: **"Maihan Gems" centred, two-part,
with the original link set.** The structure and the links are not invented.

**Structure evidence.** The storefront shipped between `09b98fe` and
`c867dce` used the same shell: a brand anchor followed by the taxonomy-driven
mega menu. The client's preferred *rendering* — wordmark at the optical
centre with the two wings split around it — is the arrangement of that shell,
not a new route family. The restored bar is:

```
[ utility rule: appointments · search · account · bag ]      row 1 (32px)
[ left wing ]            MAIHAN GEMS            [ right wing ] row 2 (78px)
```

**Link-set evidence.** `git show 09b98fe:apps/web/src/lib/mega-menu.ts`
defines the historical groups and nothing else:

| Group | Historical label | Destination family |
|---|---|---|
| `gemstones` | Loose gemstones | `/{variety}` |
| `pairs` | Matched pairs | `/{variety}-pairs` |
| `ready-made` | Ready-made rings | `/{variety}-rings` |
| `colours` | Shop by colour | `/colour/{colour}` |
| `settings` | Settings | `/settings` + `/design-your-own` |

The wings are therefore:

- **left** — Loose gemstones · Matched pairs · Ready-made rings
- **right** — Shop by colour · Settings · Design your own

No destination was added. When the taxonomy is empty, the menu falls back to
the static Settings entry only; it never renders a fabricated family.

**Two-part means two rows.** The utility rule is the only place account and
bag live; the editorial rail stays pure navigation. **Below 1120px** the rail
is replaced by a real modal drawer. The brief said "below 1024px"; the
measured collision point of six links plus a centred wordmark is 1120px, so
the collapse happens earlier to keep the centre exact at 1024 as well. The
1024 capture therefore shows the mobile rail, not a compressed desktop one.

**Accessibility.** Desktop wings are two named `<nav>` landmarks
("Collections" / "Atelier"); every disclosure is a real button with
`aria-expanded` / `aria-controls`; Escape closes and returns focus to the
trigger; outside click closes without trapping focus. The mobile drawer is a
labelled `role="dialog"` with a Tab trap, body-scroll lock, Escape close and
focus return. Axe is clean on the open menu and the open drawer.

Evidence images: `home-nav-open-1440.png`, `home-mobile-menu-390.png`.

---

## 3. Page inventory

35 routes are captured at four widths (140 images). `/account` and
`/varieties/[slug]` are redirects, so their landing states are audited under
the destination.

| Route | What the page is | States designed | Capture prefix |
|---|---|---|---|
| `/` | Frontispiece: hero, three doors, published varieties, colours, three real mountings, process, evidence rule | data + empty taxonomy + empty settings | `home` |
| `/search` | Catalogue search, URL as state, facet column, unboxed results | results, empty, degraded notice, rejected filters | `search` |
| `/varieties` | Editorial variety directory | rows, empty | `varieties` |
| `/varieties/[slug]` | Legacy nested URL → canonical `/{variety}` | redirect | `variety-nested` |
| `/[varietySlug]` | Loose-stone listing | rows, empty | `variety` |
| `/[varietySlug]-pairs` | Matched-pair listing | rows, empty | `pairs` |
| `/[varietySlug]-rings` | Ready-made ring listing | rows, empty | `rings` |
| `/products/[productSlug]` | Product record: light study, identity, price evidence, specs, provenance | record, not found, error, loading | `product` |
| `/settings` | Mounting-design index | rows, empty | `settings` |
| `/settings/[settingSku]` | Design record with metal variants | variants, no variants, no price | `setting` |
| `/colour/[colourSlug]` | Colour-family listing | rows, empty | `colour` |
| `/cart` | Bag: line items, subtotal, quote-at-checkout note | empty, loading, populated | `cart` |
| `/design-your-own` | Three-step composition, demo catalogue disclosure | step 1/2/3, incompatible pair, API failure | `design-your-own` |
| `/design-your-own/review/[code]` | Recorded configuration: composition + invariant result | record, unknown code | `dyo-review` |
| `/compare` | Comparison desk | empty, rule note | `compare` |
| `/favorites` | Saved pieces | empty, account CTA | `favorites` |
| `/checkout/order-summary` | Step 1: real bag summary | empty, ready, read failure, checkout disabled | `checkout-summary` |
| `/checkout/payment-order` | Step 2: recipient/billing, not open | explicit state + what will be collected | `checkout-payment` |
| `/checkout/secure-payment` | Step 3: settlement, no provider configured | explicit state + required disclosures | `checkout-secure` |
| `/account/login` | Client access, split ink/paper frame | default, error, busy | `account-login` |
| `/account/register` | Registration | default, validation, dev verification | `account-register` |
| `/account` | Signed-in profile + honest order-history shell | redirect when signed out | — |
| `/contact` | Appointment plate: observed address + telephone | static | `contact` |
| `/showrooms` | One evidenced salon, not four invented ones | static | `showrooms` |
| `/showrooms/[slug]` | `new-york` salon record; unknown slug is a 404 | record / 404 | `showroom` |
| `/education` | Reading room index, four authored chapters | index / chapter / 404 | `education`, `education-chapter` |
| `/blog` | Journal | empty-published state | `blog` |
| `/about/[slug]` | Atelier document | unpublished-document state | `about` |
| `/policy/[slug]` | Provenance policy (real); terms/privacy unpublished | policy / unpublished | `policy-provenance`, `policy-terms` |
| `/financing` | Payment position: no instalment plan offered | static | `financing` |
| `/protection-plan` | No plan in force; what a plan must disclose | static | `protection-plan` |
| `/admin/login` | Console door | default, error, busy | `admin-login` |
| `/vendor/login` | Partner door, vendor palette | default, error, busy | `vendor-login` |
| shared | Header, footer, error, not-found, loading skeletons | — | `not-found` |

The information architecture is deliberately the same as the locked route
map. No new route is invented.

---

## 4. The design system, in one page

- **Grid.** 1440px max, `clamp(20px, 4.6vw, 72px)` gutters, 8px rhythm,
  hairline rules at section boundaries.
- **Type.** Display: Cormorant Garamond 400, 0.92–1.0 line-height, −0.02em.
  UI: Inter 10–15px, 0.18–0.3em uppercase micro-labels. Data: JetBrains Mono
  and `font-variant-numeric: tabular-nums`.
- **Colour.** Ink `#0B1117`, paper `#F6F3EC`, muted `#5F5A50`, gold
  `#C9A84C` / deep `#7A5A10`. Gold gradient on light is dark enough to pass
  (6.8:1 for gold ink on paper); on ink it is light (8.3:1).
- **Components.** Unboxed product cards, LightPlate light studies, a
  masthead with a measured gold seam, 48px controls, hairline tables,
  square fields, no rounded containers, no drop shadows on content.
- **Motion.** Enter 520–560ms `cubic-bezier(.16,1,.3,1)` with 12px travel and
  blur decay; Pass as one sweep on a plate or a button; Hold as a 2.5%
  ambient drift on the hero stone. `prefers-reduced-motion` resolves all
  three to an instant state.
- **Honesty.** The only standing promise is INV-07: a field is shown with the
  evidence status it carries. Empty, unpublished and unavailable states are
  designed, not hidden.

---

## 5. Measured gates

| Gate | Command | Result |
|---|---|---|
| Typecheck (workspace) | `pnpm -r run typecheck` | **0 errors** |
| Production build, no DB | `DATABASE_URL= SITE_URL= pnpm --filter @maihan/web run build` | **exit 0** (compiled, 46 routes, static `_not-found`; the Next security nudge requires one immediate retry — see §8) |
| Initial JS budget, category | `pnpm --filter @maihan/web run check:budgets` | **139.8 KB / 170 KB** |
| Initial JS budget, product | same | **143.3 KB / 190 KB** |
| Web tests | `pnpm --filter @maihan/web run test` | **506 passed, 21 skipped (527)** — the 506 baseline is unchanged |
| Axe, all routes, 4 widths | `node scripts/design-audit.mjs` | **140/140 captures, 0 violations, 0 horizontal overflow, 0 page errors** |
| Axe, navigation open states | manual Playwright pass | **0 violations**, desktop dropdown and mobile drawer |
| Demo seed idempotency | second run of `seed-demo-catalogue.mjs` | **0 rows inserted**, totals unchanged |

**Axe contrast note.** Axe reports `color-contrast` as *incomplete* on text
over the deliberate gradient fields (it cannot resolve a gradient background).
Those pairs were checked numerically against the composited colours:

| Pair | Ratio |
|---|---:|
| Ink `#0B1117` / paper `#F6F3EC` | 17.12:1 |
| Muted `#5F5A50` / paper | 6.18:1 |
| Gold ink `#6E4F0E` / paper | 6.80:1 |
| Paper / ink | 17.12:1 |
| Gold `#C9A84C` / ink | 8.30:1 |
| 62% paper / ink (hero caption, footer note) | 6.98:1 |
| 55% paper / ink (footer legal) | 5.70:1 |

Every text pair clears 4.5:1; the 45% caption originally measured 4.21:1 and
was raised to 62% as part of this pass.

---

## 6. Data basis — demo, not source

`packages/db/seed-demo-catalogue.mjs` is idempotent and parameterised
(`--dry-run`, `DEMO_PRICE_MULTIPLIER`, `DEMO_CURRENCY`). It refuses any
database whose name does not start with `maihan_dev`.

Rows written and verified on `maihan_dev` (2026-11-26):

| Table | Rows | Marking |
|---|---:|---|
| `gemstone_species` | 2 | INFERRED, demo |
| `gemstone_varieties` | 2 ACTIVE | INFERRED, demo |
| `gemstone_colours` | 2 ACTIVE | INFERRED, demo |
| `metals` | 3 | INFERRED reference |
| `jewellery_types` | 5 | INFERRED reference |
| `setting_styles` | 2 | INFERRED reference |
| `settings` | 2 | INFERRED, demo description |
| `setting_variants` | 4 | INFERRED, price evidence INFERRED |
| `gemstones` | 8 | `ref_evidence_status='INFERRED'`, no origin/treatment/clarity |
| `gemstone_stones` | 11 | INFERRED |
| `products` | 10 ACTIVE | 2 each LOOSE_STONE, STONE_PAIR, READY_MADE, SETTING_ONLY, CONFIGURED; `options.demo=true`, `source_url=null`, `source_sku=null`, `sku_evidence_status='INFERRED'` |
| `dyo_configurations` | 1 (`DEMO-REVIEW`) | demo options; no price snapshot |

All 10 products carry `options.demo=true`; all 10 have null source URL and
source SKU and `sku_evidence_status='INFERRED'`. The first run inserted 10
products; the second inserted 0 and reported the same totals.

The CONFIGURED pair satisfies INV-01: one setting variant and one gemstone
XOR one pair; the earring example uses a pair. The DB constraints accepted
every row.

**No invented certificates, treatments or origins.** Those columns are NULL
on the demo records, and the product page says so.

---

## 7. Deliberate engineering fixes outside the visual layer

The demo catalogue made two previously unexercised commerce paths run for the
first time. They failed, and the failures were real, not test noise:

1. `packages/db/src/commerce/favorites-repository.ts` queried columns that do
   not exist (`products.sku`, `gemstones.weight_carats`,
   `gemstones.dimensions_mm`, `clarities.name`, `certificates.lab`) and
   inserted `job_state='COMPLETED'`, which the enum does not contain. The
   SQL now uses the real schema and `SUCCEEDED`; the compare matrix and
   favourites API pass their tests.
2. `packages/db/src/commerce/order-repository.ts` built the gemstone snapshot
   from non-existent columns (`g.variety`, `g.carat_weight`, `g.origin`,
   `g.treatment`, `g.clarity`, `g.colour_description`, `certificates.lab`,
   `certificates.carat_weight`). It now joins the taxonomy tables and uses
   `total_weight_ct`, `lab_name` and the real enums.

Test infrastructure: the commerce suites share one dev database and reserve
the same 1-of-1 stone, so `vitest.config.ts` now runs files sequentially with
a 15s ceiling. Assertions are unchanged; the 506-pass baseline is exact.

---

## 8. Known limits of this pass

- **The Next security nudge.** The installed Next.js version is flagged by
  its own advisory check. `next build` completes, then exits 1 on the first
  invocation; an immediate retry continues and exits 0. This is an
  environment/upgrade decision, not a build defect. It is called out in the
  hand-off.
- **Checkout is not open.** The order summary reads the real bag; payment
  and settlement state their absence. No payment provider, merchant account
  or order-placement UI is invented.
- **No CMS.** Blog, `/about/[slug]`, terms and privacy are honest
  unpublished states. The reading room is authored general content, not
  migrated CMS copy.
- **No add-to-favourites/compare control** exists on product pages yet. The
  pages are designed empty states; the API is now correct and tested.
- **No mobile filter drawer.** The search facets follow the results on
  narrow screens rather than hiding behind a disclosure.
- **No product photography.** The LightPlate is a CSS light study, captioned
  as such; no stock image is presented as a stone.
- **LCP** is not measurable from a bundle check. No LCP claim is made.

---

## 9. Screenshot index

Every route in §3 exists as:

```
docs/design-shots/v2/<prefix>-<width>.png
widths: 1440, 1024, 768, 390
```

Additional evidence:

| File | What it proves |
|---|---|
| `home-nav-open-1440.png` | desktop left wing open, panel aligned to its trigger |
| `home-mobile-menu-390.png` | real mobile drawer, no floating concierge over the modal |
| `audit.json` | machine record of every capture: status, axe results, overflow, screenshot path |

Regenerate with:

```powershell
$env:BASE_URL='http://localhost:3004'
node apps/web/scripts/design-audit.mjs
```

The script fails closed on any axe violation, horizontal overflow, page error
or unexpected HTTP status. It is the same check used for the 140/140 result.
