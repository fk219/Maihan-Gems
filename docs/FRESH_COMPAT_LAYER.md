# FRESH COMPAT LAYER — develop's UI on main's backend

Date: 2026-11-26. Branch: `main`. Scope: make `develop`'s console, vendor portal
and variety picker read `main`'s locked schema through the exact URLs they
already call, **without editing a single file under `apps/web/src/components`,
`apps/web/src/app/(storefront)`, `app/vendor` or `app/admin`**.

Authority: `AGENTS.md` §11 (phase discipline), `docs/AUDIT_MAIN_VS_DEVELOP.md` §6
Phase 2 step 10 ("re-point the UI at main without editing it"), `technical_design/03`
(packages/db is the only database client), ADR-026 (vendor boundary), ADR-027
(one session model).

---

## 1. The seam, read from develop's own code

`develop` never implemented `/api/fresh/*`. It *proxied* it:

```ts
// develop: apps/web/src/app/api/fresh/[...path]/route.ts:18-69
const url = `${FRESH_API_URL}/api/v1/${path.join('/')}${search}`;
```

Consequences that decide every shape below:

1. The response body a develop caller sees is **fresh-api's raw body**, with no
   wrapper: `ok(json)` returns `json` unchanged
   (`apps/fresh-api/src/server.ts:75`). So `/admin/orders` is a bare array, not
   `{ data: [...] }`.
2. The caller reads that body with a TypeScript cast
   (`AdminConsoleApp.tsx:338`), then calls array methods on it
   (`AdminConsoleApp.tsx:774`). An object where an array is expected is a
   runtime `TypeError`, not a type error.
3. Every entity field name comes from fresh-api's SQL aliases
   (`apps/fresh-api/src/admin.ts:127-162`), which are **not** main's column
   names. The mapping in §4 is therefore a rename layer, not a re-model.

---

## 2. Complete inventory of `/api/fresh/**` calls in develop's `apps/web/src`

Legend — **status**: `READY` = implemented on this branch; `EMPTY` = honest empty
collection (concept absent from main); `—` = out of scope for this pass
(write path, auth family, or a different subsystem).

### 2.1 Admin console — `components/mgh/operator/AdminConsoleApp.tsx` (the mounted console)

| Path | Method | Caller (line) | Fields the caller reads | Status |
|---|---|---|---|---|
| `/admin/stats` | GET | `loadAll` 321, probe 354 | `Stats`: `gemstones_total/active/sold`, `settings_total/active`, `products_total/active/sold`, `orders_total/pending/paid`, `revenue_total`, `revenue_currency`, `customers_total`, `vendors_total/active/pending`, `submissions_pending/total`, `leads_total/new`, `inventory_value`, `configurations_total`; used at 1164, 1196, 1213, 1302-1327, 1582-1613 | **READY** |
| `/admin/inventory?limit=&offset=&q=&status=` | GET | `loadAll` 322, `searchInventory` 475, `loadMoreInventory` 502 | accepts array **or** `{items}`; `InvItem`: `ref,name,kind,status,price_amount,currency,weight_ct,variety,origin,origin_type,vendor_code,vendor_name,table_name,primary_image,created_at,quantity`; keys on `ref`+`table_name` (505) | **READY** |
| `/admin/inventory/{ref}` | PATCH | `updateStock` 510, `updateStatus` 525, `bulkUpdateInventory` 539 | `{error}` on failure | — (write) |
| `/admin/orders?limit=&offset=` | GET | `loadAll` 323, `loadMoreOrders` 485 | bare array; `OrderRow`: `order_number,email,status,grand_total,currency,placed_at,payment_provider`; sorts on `placed_at` (776-805) | **READY** |
| `/admin/orders/{number}` | GET | `openOrder` 550 | `OrderDetail`: `subtotal,tax,shipping,discount,shipping_address,customer_note,customer_email,first_name,last_name,items[],payments[],events[],fulfilments[],refunds[]` | — |
| `/admin/orders/{number}` / `/fulfillment` / `/refund` / `/cancel` | PATCH, POST | 631, 644, 657, 755 | `{error}` | — (write) |
| `/admin/vendors` | GET | `loadAll` 324, `vendorOnboarding` 564 | bare array; `VendorRow`: `code,name,country,status,email,contact_name,onboarding_status,live_gems,inventory_value,revenue,total_submissions`; ranks on `inventory_value`/`revenue`/`live_gems` (808-817) | **READY** |
| `/admin/leads` | GET | `loadAll` 325 | bare array; `LeadRow`: `id,email,name,source,status,created_at`; `leads.filter(...)` at 963 | **EMPTY** |
| `/admin/leads/{id}` | PATCH | `markLead` 604 | `{error}` | — (write) |
| `/admin/submissions?limit=&offset=` | GET | `loadAll` 326, `loadMoreSubmissions` 492 | bare array; `SubmissionRow`: `id,vendor_code,vendor_name,kind,status,payload,reviewer_note,resulting_ref,created_at,reviewed_at`; `submissions.filter(...)` at 962 | **EMPTY** |
| `/admin/submissions/{id}/{approve\|reject\|hold\|release}` | POST | `moderateSubmission` 614 | `{error}` | — (write) |
| `/admin/discounts` | GET | `loadAll` 327 | bare array; `DiscountRow`: `id,code,kind,value,min_subtotal,starts_at,ends_at,usage_limit,used_count,active,created_at`; `kind === 'PERCENT'` at 2174 | **READY** |
| `/admin/discounts`, `/admin/discounts/{id}` | POST, PATCH | 669, 695, 766 | `{error}` | — (write) |
| `/admin/audit?limit=100` | GET | `loadAll` 328 | bare array; `AuditRow`: `id,actor_kind,action,entity_kind,entity_id,after,created_at` | **READY** |
| `/admin/certificates`, `/admin/certificates/{id}/verify` | GET, POST | 329, 722 | `CertRow`: `id,agency,cert_no,url,issued_at,verified,gemstone_ref,gemstone_name,vendor_code,vendor_name,created_at` | — |
| `/admin/outbox?limit=10`, `/admin/outbox/dispatch` | GET, POST | 330, 711, 715 | `OutboxData`: `summary.queued/sent/failed/provider_configured`, `items[].to_email/subject/state/attempts/last_error/created_at/sent_at` | — |
| `/admin/onboarding/{code}/{approve\|reject\|suspend}` | POST | `vendorOnboarding` 558 | `{error, apiKey}` | — (write) |
| `/vendors` | POST | `createVendor` 581 | `{error, vendorCode}` | — (write) |
| `/admin/auth/2fa/status\|setup\|enable\|disable`, `/admin/auth/change-password` | GET, POST | 346, 431, 441, 453, 738 | `{enabled}`, `{secret, otpauth_url}`, `{error}` | — (2FA is develop-only) |

`components/mgh/operator/AdminConsoleFresh.tsx` (an alternate console, not
mounted) reads the same two list routes as `{items}`:
`/admin/submissions` (58), `/admin/orders` (59). Both tolerate a bare array
(`.items ?? []`), so the array answers in §2.1 serve it without an error.

### 2.2 Vendor portal — `components/mgh/operator/VendorPortalApp.tsx` (the mounted portal)

`authFetch` (line 256) prefixes `/api/fresh` and treats 401 as "signed out".

| Path | Method | Caller (line) | Fields the caller reads | Status |
|---|---|---|---|---|
| `/vendor/auth/me` | GET | `loadAll` 264 | `{code, name}` (268-269); gates the whole portal (265) | **READY** (added: see §6.2) |
| `/vendors/{code}/inventory` | GET | `loadAll` 271 | `{items, stats}`; `InventoryItem`: `ref,slug,name,kind,weight_ct,price_amount,currency,status,origin_type,variety,colour,shape,origin,primary_image,owner_kind,created_at,quantity`; `InventoryStats`: `total_items,live_items,sold_items,hidden_items,total_value,currency` | **READY** |
| `/vendors/{code}/analytics` | GET | `loadAll` 273 | `VendorAnalytics`: `totals.revenue/units/orders`, `series[].day/revenue/units/orders`, `top_items[].name/ref/revenue/units`, `payments[].provider/count/amount`; rendered at 1369-1443 | **READY** (partial, §5) |
| `/vendors/{code}/submissions` | GET | `loadAll` 270 | `SubmissionRow[]` | **EMPTY** |
| `/vendors/{code}/submissions` | POST | `submit` 472 | `{error}` | — (write) |
| `/vendors/{code}/inventory/{ref}` | PATCH | 500, 514, 525 | `{error}` | — (write) |
| `/vendors/{code}/inventory/{ref}/images` | POST | 546 | `{error}` | — (write) |
| `/vendors/{code}/inventory/{ref}/certificates[/{id}]` | GET, POST, DELETE | 394, 409, 425 | `CertificateRow[]` | — |
| `/vendors/{code}/api-key` | POST | 433 | `{apiKey}` | — (write) |
| `/vendor/auth/change-password`, `/vendor/auth/request-reset`, `/vendor/auth/reset`, `/vendor/auth/logout` | POST | 381, 351, 367, 445 | `{error}` | — |

### 2.3 Public reads used by storefront helpers

| Path | Method | Caller (line) | Fields read | Status |
|---|---|---|---|---|
| `/catalogue/varieties` | GET | `VendorPortalApp` 272 | `{items: [{code,slug,name}]}` (1693: value=`slug`, label=`name (code)`) | **READY** |
| `/catalogue/gemstones?q&limit&offset&refs` | GET | `lib/mgh/gem-client.ts:66`, `favorites-client.ts:7`, `compare-client.ts:32`, `CommandPalette.tsx:63`, `HeroAiSearch.tsx:38` | gem list/detail DTOs | — (not the console surface) |
| `/catalogue/settings?q&limit&refs` | GET | `CommandPalette.tsx:64`, `compare-client.ts:32` | setting list DTOs | — |
| `/leads`, `/leads/unsubscribe`, `/concierge`, `/configurations`, `/carts/**`, `/orders/**`, `/auth/**` | POST/GET | footer, checkout, account, DYO | commerce DTOs | — |

### 2.4 Separate route families (not `/api/fresh/*`)

`/api/fresh-admin/*` (`login`, `2fa/verify`), `/api/fresh-auth/*` (`login`,
`register`, `request-reset`, `logout`), `/api/fresh-vendor*` (`login`, `setup`).
They are develop's own sign-in surfaces. **Deliberately not reimplemented**: one
session model (ADR-027) means signing in happens through main's
`/admin/login`, `/account/login` and `/vendor/login`, which set main's
`maihan_session` cookie. See §5.1.

---

## 3. What was built

```
apps/web/src/app/api/fresh/[...path]/route.ts   Next mount (nodejs, force-dynamic)
apps/web/src/api/fresh/route-table.ts           path -> handler table + matcher
apps/web/src/api/fresh/handlers.ts              gate -> one read -> shape
apps/web/src/api/fresh/index.ts                 createFreshCompatApi (ids, 404/405, envelope)
apps/web/src/api/fresh/fresh-compat.spec.ts     34 HTTP-contract tests
packages/db/src/compat/fresh-compat-repository.ts      9 read-only projections
packages/db/src/compat/fresh-compat-repository.spec.ts 16 SQL/shape tests
```

A static segment outranks the generic `app/api/[...path]` catch-all, so
`/api/fresh/**` lands on the new route and every other `/api/**` path keeps its
existing pipeline. The route is registered in `src/routing/route-manifest.ts`
(the manifest spec rejects stray files).

Pipeline: correlation ids → lookup (404 `NOT_FOUND` / 405 `METHOD_NOT_ALLOWED`
with `Allow`) → handler → `successResponse`/`errorResponse` from `api/envelope.ts`.
So every refusal is the documented envelope with `requestId`/`traceId` and
`X-Trace-Id` on every response.

**No new dependency. No schema change. No migration. No database contact in
tests.**

---

## 4. The mapping, field by field

### 4.1 `/admin/stats` → `readConsoleStats`

One statement of scalar subqueries.

| develop field | main source | note |
|---|---|---|
| `products_total` / `products_active` | `products` (`deleted_at IS NULL`) / `state='ACTIVE'` | |
| `gemstones_total` / `gemstones_active` | `gemstones` / `state='ACTIVE'` | `gemstones.state` is `record_state` |
| `settings_total` / `settings_active` | `setting_variants` / `state='ACTIVE'` | a sellable setting SKU |
| `orders_total` / `orders_pending` / `orders_paid` | `orders` / `state='PENDING_PAYMENT'` / `state='PAID'` | |
| `revenue_total` | `sum(grand_total)` where `state IN ('PAID','IN_FULFILLMENT','FULFILLED')` | main has no `DELIVERED` |
| `revenue_currency` | literal `'USD'` | |
| `customers_total` | `customers` | |
| `vendors_total/active/pending` | `vendors` / `state='APPROVED'` / `state='PENDING'` | |
| `inventory_value` | `sum(products.price_amount)` where `state='ACTIVE'` | |
| `configurations_total` | `dyo_configurations` | |
| `certificates_total` | `certificates` (`deleted_at IS NULL`) | extra field, additive |
| `products_sold`, `gemstones_sold`, `submissions_pending`, `submissions_total`, `leads_total`, `leads_new` | **null** + named in `unsupported[]` | §5.2 |

### 4.2 `/admin/inventory` → `listConsoleInventory`

| develop field | main source |
|---|---|
| `ref` | `products.slug` (main has no `ref` column; the slug is the unique public identifier) |
| `name` | `products.title` |
| `kind` | `products.kind` (`product_kind`) |
| `status` | `products.state` (`product_state`) |
| `price_amount` | `products.price_amount` (NUMERIC text → number) |
| `currency` | `products.currency` |
| `weight_ct` | `COALESCE(products.total_weight_ct, gemstones.total_weight_ct)` |
| `variety` | `gemstone_varieties.name` (via `products.variety_id`) |
| `origin` | `gemstone_origins.name` (via the linked `gemstones` row) |
| `vendor_code` / `vendor_name` | `vendors.slug` / `vendors.display_name` |
| `primary_image` | first `assets.cdn_url`/`source_url` through `asset_usages` (`entity_type='PRODUCT'`) |
| `table_name` | literal `'products'` |
| `origin_type`, `quantity` | **null** — no such columns (`availability` is a boolean, not a quantity) |

Filters: `q` → `title ILIKE`/`slug ILIKE`; `status` → `state`; `kind` → `kind`.
Envelope: `{ items, meta: { total, limit, offset } }` — the shape all three
inventory callers accept. Count and page are separate statements, so `total`
stays true past the last page.

### 4.3 `/admin/orders` → `listConsoleOrders`

| develop field | main source |
|---|---|
| `order_number`, `email`, `currency`, `grand_total` | same columns (`grand_total` stays a decimal string) |
| `status` | `orders.state` |
| `placed_at` | `COALESCE(orders.placed_at, orders.created_at)` (`placeOrder` writes `placed_at = now()`) |
| `payment_provider` | newest `payments.provider` for the order |

Body: **bare array**.

### 4.4 `/admin/vendors` → `listConsoleVendors`

| develop field | main source |
|---|---|
| `code` | `vendors.slug` |
| `name` | `vendors.display_name` |
| `country`, `email`, `status` | `country`, `email`, `state` |
| `onboarding_status` | `vendors.state` (main records the onboarding decision as the vendor state; there is no second record) |
| `live_gems` | count of the vendor's `products` with `state='ACTIVE'` |
| `inventory_value` | `sum(products.price_amount)` for those rows |
| `revenue` | `sum(order_vendor_allocations.vendor_payable)` where `state='RELEASED'` |
| `contact_name`, `total_submissions` | **null** |

### 4.5 `/admin/audit` → `listConsoleAudit`

`actor_type→actor_kind`, `entity_type→entity_kind`, `after_state→after`,
`entity_id::text→entity_id`, bounded newest-first (max 500).

### 4.6 `/admin/discounts` → `listConsoleDiscounts`

| develop field | main source |
|---|---|
| `id`, `code`, `value`, `min_subtotal`, `created_at` | same |
| `kind` | `type`: `PERCENTAGE→PERCENT`, `FIXED_AMOUNT→FIXED`, anything else verbatim (`FREE_SHIPPING`, `FINANCING`, `PROTECTION_PLAN` are passed through, never flattened) |
| `starts_at` / `ends_at` | `valid_from` / `valid_to` |
| `usage_limit` / `used_count` | `max_redemptions` / `redemption_count` |
| `active` | `state = 'ACTIVE'` |

### 4.7 `/vendors/{code}/inventory` → `readVendorInventory`

Same projection as §4.2, plus `AND p.vendor_id = $1::uuid` (bound, never
interpolated) and a separate aggregate for `stats` (`total_items`,
`live_items=ACTIVE`, `sold_items=SOLD_OUT`, `hidden_items=DRAFT`,
`total_value=sum(ACTIVE)`, `currency`). `total_items` is the whole inventory, not
the page.

### 4.8 `/vendors/{code}/analytics` → `readVendorAnalytics`

| develop field | main source |
|---|---|
| `totals.revenue` | `sum(order_vendor_allocations.vendor_payable)` where `state='RELEASED'` |
| `totals.orders` | `count(DISTINCT order_id)` where `state <> 'CANCELLED'` |
| `totals.units` | **null** (§5.3) |
| `series[]` | per-day allocation sums for the last 30 days (`day, revenue, orders`) |
| `top_items` | **`[]`** — no product-level attribution exists on allocations |
| `payments` | **`[]`** — payments are per order, not per vendor; attributing a whole payment would overstate |
| `ledger.balance` / `ledger.entry_count` / `ledger.by_type` | `vendor_ledger` (append-only sum and per-type totals) |
| `unsupported` | `['units','top_items','payments']` |

### 4.9 `/catalogue/varieties` → `listActiveVarieties`

| develop field | main source |
|---|---|
| `slug` | `gemstone_varieties.slug` |
| `name` | `display_name` (fallback `name`) |
| `code` | **`slug.toUpperCase()`** — a display token; main has no variety `code` column |
| `species` / `family` | `gemstone_species.code` (main has ONE level; develop had family *and* species) |
| `family_name` | `gemstone_species.name` |
| `stones` | count of non-archived `gemstones` of that variety |

Only `state='ACTIVE'`, non-deleted rows. Body `{ count, items }`, public (no auth),
as in develop.

### 4.10 Authorisation (reused, not invented)

| route | gate | capability |
|---|---|---|
| `/admin/stats` | `authorizeAdminRequest` | `dashboards/read` |
| `/admin/inventory` | same | `inventory/list` |
| `/admin/orders` | same | `orders/list` |
| `/admin/vendors` | same | `products/list` (see §5.5) |
| `/admin/audit` | same | `dashboards/read` |
| `/admin/discounts` | same | `orders/list` (no `discounts` module exists) |
| `/admin/leads` | same | `dashboards/read` |
| `/admin/submissions` | same | `products/list` |
| `/vendors/{code}/**`, `/vendor/auth/me` | `requireVendor` | membership + `canSell(state)`; `{code}` resolved to a vendor id and asserted, so another vendor's code is `403 VENDOR_SCOPE_MISMATCH` |
| `/catalogue/varieties` | none | public reference data |

`authorizeAdminRequest` and `requireVendor` had their first parameter narrowed to
`Pick<RouteContext, 'db' | 'request'>` so this surface can reuse them without a
catalogue service. That is a widening of what callers satisfy — no existing call
site changed.

---

## 5. Honest gaps and deliberate deviations

### 5.1 Sign-in is main's, not develop's

develop's consoles probe a session and then post to `/api/fresh-admin/login`,
`/api/fresh-auth/login`, `/api/fresh-vendor/login`. Those are **not**
implemented. One session model (ADR-027) already exists; adding a second login
surface would be a second auth model. A user signs in through main's
`/admin/login`, `/account/login` or `/vendor/login` (setting `maihan_session`)
and the develop console then loads. Until a session exists, every route answers
**401**, which is exactly the signal develop's console uses to render its own
sign-in form — that form's POST will 404 and the operator cannot proceed from
inside the develop UI.

### 5.2 `{ data, meta: { unsupported: true } }` is carried in a header, not the body

The brief asked for `{ data: [], meta: { total: 0, unsupported: true } }` on
unsupported concepts. That envelope would break the caller:

```ts
// AdminConsoleApp.tsx:340-341
if (leadsRes.ok) setLeads((await leadsRes.json()) as LeadRow[]);
if (subRes.ok) setSubmissions((await subRes.json()) as SubmissionRow[]);
// AdminConsoleApp.tsx:962-963
const pendingReview = submissions.filter((s) => s.status === 'SUBMITTED').length;
const newLeads = leads.filter((lead) => lead.status === 'NEW').length;
```

`leads`/`submissions` become plain objects and `.filter` throws a `TypeError`
during render, taking the whole console down. develop's proxy returned a bare
array for these paths, so a bare array is also the *faithful* answer.

Therefore: body `[]`, plus
`X-Maihan-Compat-Unsupported: true` and
`X-Maihan-Compat-Unsupported-Concept: <concept>`. The fact is observable, the
console keeps working, and no row is fabricated. Both are asserted in
`fresh-compat.spec.ts` ("unsupported concepts" block).

### 5.3 Fields main genuinely cannot answer

| Field | Why | Consequence |
|---|---|---|
| `analytics.totals.units` | `order_vendor_allocations` is per vendor per order; there is no quantity there and `order_items` has no vendor link | `null`; develop's UI renders `?? 0` |
| `analytics.top_items` | no product-level vendor attribution | `[]` |
| `analytics.payments` | `payments` is per order; a multi-vendor order's payment is not divisible without inventing a rule | `[]` |
| `inventory.quantity` | `products` has `availability BOOLEAN`, not a stock count | `null` |
| `inventory.origin_type` | no such column on `products` or `gemstones` | `null` |
| `vendors.contact_name` | no contact column on `vendors` | `null` |
| `vendors.total_submissions` | no vendor-submission table | `null` |
| `stats.{products,gemstones}_sold` | `SOLD` is not a state in either enum (`SOLD_OUT` means "not for sale") | `null` |
| `stats.submissions_*`, `stats.leads_*` | concepts absent | `null` |

### 5.4 Routes not implemented in this pass

`/admin/orders/{number}` (detail), `/admin/certificates`, `/admin/outbox`,
`/admin/inventory/{ref}` PATCH, all discount/submission/lead/onboarding writes,
vendor certificates/images/api-key/submissions writes, and every commerce /
customer-auth / catalogue-gemstone route. They answer **404 `NOT_FOUND`** — the
same answer develop's proxy gave for an unknown upstream route — never a 500 and
never an invented success. develop's console degrades: `if (res.ok)` leaves the
tab empty and the outbox panel stays unrendered.

### 5.5 No `vendors` module in the locked RBAC matrix

`ADMIN_MODULES` (doc 23 §3) has no `vendors` and no `discounts` entry. Rather
than invent a module (a domain change), `/admin/vendors` gates on
`products/list` and `/admin/discounts` on `orders/list`. Consequence: a role
without `products`/`orders` read is refused. Changing this is a one-line edit in
`handlers.ts` once the matrix is extended by review.

### 5.6 No rate limiter on this surface

`createCatalogApi` wires the `public_get` gate; `createFreshCompatApi` does not.
The surface is authenticated except `/catalogue/varieties` (static reference
data), and adding a limiter would require deciding a second policy. Recorded as
a gap, not claimed as protection.

### 5.7 No cache participation

Every response is `Cache-Control: private, no-store`. The compatibility layer
deliberately does not join the catalog cache policy, so it can never serve a
stale taxonomy or a stale operator list.

### 5.8 No live database run

No statement was executed against PostgreSQL. The SQL is proven by fake
executors (`createScriptedExecutor` for the repository, a shape-matching fake for
the HTTP contract) plus `tsc`. Specifically unverified live: `count(*) FILTER`,
`to_char(date_trunc(...))`, the `asset_usages` lateral subquery, and
`::product_state` / `::product_kind` casts.

---

## 6. Additions beyond the requested list

1. **`/vendor/auth/me`** — without it `VendorPortalApp.loadAll` returns at line
   265 (`if (!meRes.ok) { setAuthed(false); return; }`) and the portal never
   renders. It is 10 lines over the existing `requireVendor` gate and returns
   `{code, name, state, country, email, commission_bps, payout_currency}`.
2. **405 with `Allow`** for non-GET verbs, from the shared route table, instead
   of Next's bodyless default — keeps one error contract.

---

## 7. Verification (commands and results)

| Command | Result |
|---|---|
| `pnpm --filter @maihan/db exec vitest run src/compat/fresh-compat-repository.spec.ts` | **16 passed** |
| `pnpm --filter @maihan/web exec vitest run src/api/fresh/fresh-compat.spec.ts` | **34 passed** |
| `pnpm --filter @maihan/db run test` | **298 passed / 32 skipped** (was 281/33) |
| `pnpm --filter @maihan/web run test` | **540 passed / 21 skipped** (baseline 506/21 — +34, no regression) |
| `pnpm -r run typecheck` | **0 errors**, 9 workspace projects |
| `pnpm --filter @maihan/web run build` with `apps/web/.env` moved aside and `DATABASE_URL` unset | **exit 0**; `/api/fresh/[...path]` builds as `ƒ (Dynamic)` |

The build output confirms the static segment outranks the generic catch-all:
both `/api/[...path]` and `/api/fresh/[...path]` are registered, and only the
latter matches `/api/fresh/**`.

Test coverage of the three required properties:

* **documented shape** — one test per route asserts the exact body the caller
  reads, including "bare array" for `orders`/`vendors`/`audit`/`discounts` and
  `{items,meta}` for inventory.
* **401/403, not 500** — a parameterised test hits all 12 authenticated routes
  with no session and asserts `401 UNAUTHORIZED` **and that no query ran**; two
  further tests assert `403 FORBIDDEN` for a role without the module and that the
  trusted-header seam stays closed in a production environment.
* **unsupported concepts** — `leads`, `admin/submissions` and
  `vendors/{code}/submissions` return `[]` with the flag header and issue zero
  queries.

---

# ADDENDUM — SHOPPER COMMERCE, ACCOUNT, SITE ORIGIN, DYO DOSSIER, AR (2026-11-26)

This pass closes the six gaps recorded in `.opencode/memory/IMPLEMENTATION_STATE.md`
under "Honest gaps" of the storefront design port. The console/vendor surface
above is unchanged; everything below is additive.

## 8. `/api/fresh/**` shopper routes

The route table now carries a method per entry and dynamic segments. A path hit
with the wrong method is still `405` with `Allow` (now the full method list for
that path), and a miss is still `404 NOT_FOUND`.

| Path | Method | Handler | Actor | Body / response |
|---|---|---|---|---|
| `/carts` | GET | `cartCurrentHandler` | customer (401) | current ACTIVE cart as `CartView`; 404 if none |
| `/carts` | POST | `cartCreateHandler` | public | `{token?}` -> `{token, created}`; adopts an unbound token, never another customer's |
| `/carts/{token}` | GET | `cartViewHandler` | cart | `CartView`; a customer-bound cart is 404 to anyone else |
| `/carts/{token}/items` | POST | `cartAddItemHandler` | cart | `{ref, quantity?}` -> `CartView`. `{configuration_code}` is refused (see §10.2) |
| `/carts/{token}/items/{itemId}` | PATCH / DELETE | update / remove | cart | `{quantity?}` -> `CartView` |
| `/carts/{token}/quote` | GET | `cartQuoteHandler` | cart | `{subtotal, discount, tax, tax_label, shipping, grand_total, currency}`; read-only |
| `/carts/{token}/checkout` | POST | `cartCheckoutHandler` | cart | places the order (below) |
| `/checkout` | POST | `checkoutStartHandler` | cart | `{cart_token, email?}` -> session view (reserves stock) |
| `/checkout/{sessionId}` | GET | `checkoutSessionHandler` | session id | session view |
| `/checkout/{sessionId}/advance` | POST | `checkoutAdvanceHandler` | session id | `{step: SHIPPING|PAYMENT|CONFIRM, ...}` |
| `/orders` | GET | `orderListHandler` | customer (401) | bare array of `{order_number,status,currency,grand_total,placed_at,item_count}` |
| `/orders/{orderNumber}` | GET | `orderDetailHandler` | customer (401) | develop's order detail; 404 outside `customer_id` |
| `/orders/{orderNumber}/pay` | POST | `orderPayHandler` | customer (401) | dev-only test instrument (§10.3) |
| `/leads` | POST | `leadCreateHandler` | public | newsletter consent, or a customer request via the tool |
| `/viewing-requests` | POST | `viewingRequestCreateHandler` | public | same tool, source fixed to `viewing_request` |
| `/leads/unsubscribe` | POST | `leadUnsubscribeHandler` | public | idempotent, never enumerates |
| `/newsletter` | POST | `newsletterSubscribeHandler` | public | explicit consent record |
| `/catalogue/gemstones` | GET | `catalogueGemstonesHandler` | public | `{kind:'gemstones',count,items}`; `q` uses `executeSearch` |
| `/catalogue/settings` | GET | `catalogueSettingsHandler` | public | `{kind:'settings',count,items}`, one row per design |
| `/concierge` | POST | `conciergeHandler` | public | live rail + orchestrator reply, `model:false` |

Only the URLs develop actually calls are listed; no alias is invented.

### 8.1 Cart mapping (renames only)

`token` <- `cart_token`, `status` <- `state`, `items[].product_ref/slug` <-
`product_slug`, `product_name` <- `title`, `subtotal` <- the cart's advisory
`pricing_snapshot.subtotal` after the repository's authoritative re-pricing.
`product_kind` is `null` because the cart DTO does not carry it; `gemstone_ref`
is `null` for the same reason. Nothing is derived from weight or price.

### 8.2 Checkout and stock reservation

`POST /carts/{token}/checkout` is main's own chain, in main's own order:
`createCheckoutSession` (which calls `reserveStockForCart` inside Postgres) ->
`submitShippingCheckpoint` -> `submitPaymentCheckpoint` -> `placeOrder`. A
`discount_code` is validated through `validateDiscount` and applied to the
frozen snapshot before placement. The idempotency key is
`fresh-checkout:{cartToken}`, so a retry returns the original order; the
ownership read also carries `converted_order_id`, so a repeated checkout on a
CONVERTED cart returns that order **before** any new checkout session or stock
reservation is created.

Tax is `0.00` with label `UNCONFIGURED` and shipping is `0.00`: main has no tax
rule table and no shipping-rate catalogue. Those are main's honest limits, not
develop's assessed rates re-invented.

### 8.3 The customer boundary

A cart bound to a customer (`carts.customer_id`) is readable only by that
session; every other caller — anonymous or a different customer — gets
`404 CART_NOT_FOUND` after the ownership read and **before** the cart contents
are touched. Orders are read with `WHERE customer_id = $n`; an unknown order and
another customer's order are the same `404 ORDER_NOT_FOUND`. The business SQL
never contains the customer id or the order number as text (asserted in
`fresh-shopper-repository.spec.ts` and `fresh-shopper.spec.ts`).

## 9. `/api/fresh/auth/**` and `/api/fresh-auth/**` (develop's account app)

`apps/web/src/app/api/fresh-auth/[...path]/route.ts` is a second mount because
the first path segment is `fresh-auth`, not `fresh`. Its four handlers delegate
to main's `authLoginHandler` / `authRegisterHandler` /
`authRequestPasswordResetHandler` / `authLogoutHandler`, so the same `users`
row, the same scrypt hash, the same `sessions` table and the same
`maihan_session` cookie are used. Registration translates develop's
`first_name`/`last_name` into main's strict `displayName` (falling back to the
email, never a name guessed from its local part) and aliases
`devVerificationToken` to `dev_verification_token`.

`/api/fresh/auth/**` adds the reads/writes the component uses: `me` (GET/PATCH),
`orders`, `favourites` (GET/PUT), `addresses` (GET/POST/PATCH/DELETE and
`/default`), `verify-email`, `resend-verification`, `change-password` and
`reset`. Profile, address and favourite writes go through main's
`packages/db` account repositories. Change-password verifies the current hash,
applies the same domain password policy, updates the hash, revokes every session
and issues a fresh cookie.

`/account` now mounts develop's `CustomerAccountApp` byte-identically (the
component file was not edited). `/account/login` and `/account/register` remain
main's static pages, which outrank the optional catch-all.

## 10. Honest gaps in this pass

1. **Guest order access token.** main's `orders` table has no access-token
   column, so the checkout response returns `access_token: ''` and the order
   dossier route is session-only. develop's "View order dossier" link for a
   guest order therefore does not resolve; the confirmation panel still shows
   the order number and totals. Adding a token column is a schema change and
   was not taken.
2. **DYO configuration-to-cart.** `cart_items.product_id` is `NOT NULL`, so a
   bare `configuration_code` cannot join a cart. The route refuses with `422`
   and points at main's real `/api/v1/dyo/.../add-to-cart` conversion (which
   materialises the configured product and re-validates INV-01/02/03).
   `/api/fresh/configurations` remains unimplemented; the DYO review page uses
   main's own DYO endpoints.
3. **Payment.** `POST /orders/{number}/pay` is develop's test instrument. It
   writes a `payments` row with provider `test` and transitions the order to
   PAID **only** when `ENVIRONMENT` is `local|dev|development|test`; otherwise it
   refuses with `422`. No PSP is integrated.
4. **Tax and shipping** are `0.00` / `UNCONFIGURED` (main has no rule tables).
5. **No rate limiter and no cache participation** on this surface; the same
   gap as §5.6/5.7, unchanged.
6. **No live database run.** Every statement is proven by fake executors and
   `tsc`; the `LATERAL` aggregates, `ON CONFLICT (email)`, and the
   `certificate_public` join are not executed against PostgreSQL here.

## 11. Migration 0023 (unapplied)

`packages/db/migrations/0023_newsletter_and_requests.sql`, registered at
`idx 22` in `meta/_journal.json`, is expand-only:

* `newsletter_subscriptions` — `email CITEXT`, `consent_at`, `source`,
  `unsubscribed_at`, one unique index on `email`; unsubscribe is a timestamp,
  never a delete.
* `customer_requests` — the durable record behind the `create_customer_request`
  tool: `intent` (four-value CHECK), `source`, `email`, `name`, `notes`,
  `state`, optional `customer_id` FK, timestamps. No price, inventory, order,
  payment, certificate or permission column.

The migration was **not run against any database**. `expected-schema.ts` is a
measured mirror and was not advanced; a sanctioned run must reconcile its table
count (83 -> 85) and column/FK/index deltas before `verify-schema` can pass
against a database at 0023.

## 12. SITE_URL, DYO dossier, AR

* `lib/site-origin.ts` resolves the canonical origin from `SITE_URL` first and
  otherwise from `x-forwarded-proto` + `x-forwarded-host`/`host`. The product
  JSON-LD and the cart canonical now use it; with neither source the URL is
  omitted, never thrown and never guessed. `lib/sitemap.ts` keeps the strict
  `siteBaseUrl()` because a sitemap is generated outside a request.
* `lib/dyo-server.ts` now joins the real rows via
  `packages/db/src/dyo/dyo-review-repository.ts`: the gemstone (or pair) by id,
  the setting variant and design, and the newest non-expired
  `dyo_price_snapshots` row. A NULL id or missing row stays `null`, so the page
  keeps its `Not evidenced` markers (INV-07). The test override still returns a
  bare configuration row with null components, which is why the existing
  INV-07 test is unchanged.
* `/ar/{assetId}` keeps the honest missing-asset state and is now a complete
  page: the requested reference, what the catalogue can still answer, the
  reason no model is rendered (with the real count of registered calibrated
  assets), and three next actions. No placeholder model and no `.glb` were
  added.

## 13. Verification for this addendum

| Command | Result |
|---|---|
| `pnpm -r run typecheck` | **0 errors**, 9 projects |
| `pnpm --filter @maihan/web run test` | **604 passed / 21 skipped** (baseline 541/21, +63, no regression) |
| `pnpm --filter @maihan/db run test` | **325 passed / 32 skipped** (baseline 298/32, +27) |
| `pnpm --filter @maihan/web run build` with `apps/web/.env` moved aside and `DATABASE_URL`/`SITE_URL` unset | **exit 0**; `/api/fresh/[...path]` and `/api/fresh-auth/[...path]` both `ƒ (Dynamic)` |

New suites: `fresh-shopper.spec.ts` (shape, 401/404 boundaries, no interpolation),
`fresh-auth.spec.ts` (route/method, register translation, non-enumerating reset,
logout), `fresh-shopper-repository.spec.ts`, `dyo-review-repository.spec.ts`,
`dyo-review-model.spec.ts`, `site-origin.spec.ts`.
