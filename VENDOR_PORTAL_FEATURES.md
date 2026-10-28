# VENDOR PORTAL — COMPLETE FEATURE SPECIFICATION

**Purpose:** Single reference document for every vendor-portal feature — built, in-flight and proposed — so future sessions can integrate them without re-deriving context.
**Status legend:** `[OBSERVED]` = exists in code today (file references given) · `[PROPOSED]` = designed here, not yet built · `[CLIENT-GATED]` = blocked on a client decision, key or ADR ratification.
**Companion document:** `ADMIN_PORTAL_FEATURES.md` (admin-side features, vendor invite, moderation, revenue).

---

## 1. Current state summary `[OBSERVED]`

The vendor portal is real and DB-backed. Existing surface (`apps/web/src/api/routes.ts:247-264`, `apps/web/src/api/vendor-handlers.ts`, `packages/db/src/vendor/vendor-repository.ts`):

| Capability | Endpoint(s) | Repository function |
|---|---|---|
| Dashboard (summary counts + JS-computed revenue) | `GET /vendor/dashboard` | — (handler aggregates) |
| Vendor profile read/update | `GET`/`PATCH /vendor/profile` | `getVendorById` (187), `updateVendorProfile` (217) |
| Product create (DRAFT, ≤12 image URLs) | `POST /vendor/products` | `createVendorProduct` (375) |
| Product update | `PATCH /vendor/products/{id}` | `updateVendorProduct` (596) |
| Submit for review | `POST /vendor/products/{id}/submit` | `submitVendorProductForReview` (687) |
| Product list | `GET /vendor/products` | `listVendorProducts` (748) |
| Order lines list | `GET /vendor/orders` | `listVendorOrders` (884) |
| Fulfilment update (carrier + tracking) | `POST /vendor/orders/{orderId}/items/{itemId}/fulfill` | `updateVendorOrderFulfillment` (954) |

Established invariants that every new feature must preserve:

- **Vendor scoping:** every read/write filters by the actor's `vendor_id` from the session — never from headers, query or body (P1-4 identity contract).
- **Moderation gate:** vendor-created products are `DRAFT` → `SUBMITTED` → admin `APPROVED` → vendor/admin `PUBLISHED`. Vendors never self-publish.
- **PAID gate:** fulfilment may not move an order line whose order is not `PAID` (P1-8 fix).
- **Audit rows:** every privileged mutation writes an `audit_logs` row with before/after state (SG-8).
- **Idempotency:** every mutating endpoint honours `Idempotency-Key` where replay is possible.
- **Money:** `NUMERIC(12,2)` end-to-end, server-authoritative repricing; vendors never post amounts.

Role context: vendor accounts are `role='VENDOR'` with a `vendor_onboarding` row (`status`: PENDING/APPROVED/REJECTED/SUSPENDED, `owner_customer_id` UNIQUE — `vendor_onboarding` DDL). Permissions computed by `computePermissionsForRole` (`packages/db/src/auth/auth-repository.ts:163`).

---

## 2. Feature specifications

Phase mapping summary: **V1** (core gaps) · **V5** (quick wins) · **V6** (bulk edit) · **V7+** (growth) · **GATED** (client decisions).

---

### FV-01 — Delete / deactivate a product `[PROPOSED]` — Phase V1

**User story:** As a vendor I want to remove one of my products from my catalogue so that sold or withdrawn stones no longer appear.

**Behaviour:**
- Soft delete only: sets `products.deleted_at = now()` and `state = 'ARCHIVED'`; no row is ever physically removed.
- Products attached to an open cart line, an unpaid checkout session or a non-terminal order are **refused** (`409 PRODUCT_IN_ACTIVE_COMMERCE`) — inventory reservations must be released first.
- Deletion is reversible by the vendor within the portal (`POST …/restore`) while no order references the product; after a delivered order it is admin-only.

**Endpoint:**
- `DELETE /api/v1/vendor/products/{productId}` (and `POST …/restore`)

**Data sources:** `products.deleted_at`, `products.state`, `carts`/`cart_items` (open-line check), `inventory_reservations` (active-hold check), `order_lines` (non-terminal order check), `audit_logs`.

**Edge cases:** double delete → idempotent `200`; product in another vendor's catalogue → `404` (ownership scoping, never `403` to avoid existence leaks); concurrent admin moderation while deleting → transaction takes `FOR UPDATE` on the row.

**Acceptance criteria:**
- Deleted product disappears from `listVendorProducts` and all storefront SELECTs (which already filter `deleted_at IS NULL` — `vendor-repository.ts:410,608`).
- Deletion with an active hold → `409`, reservation untouched.
- Audit row written with before/after state.
- `pnpm -r run test` green including new vendor-delete spec.

---

### FV-02 — Mark product as sold (availability flag) `[PROPOSED]` — Phase V1

**User story:** As a vendor I want to flip a stone to "sold" instantly (e.g. after an offline sale) so the storefront stops showing it without a full delete.

**Client decision (2026-10-xx):** **availability flag only** — do NOT set `state='SOLD_OUT'` for now.

**Behaviour:**
- New vendor action sets `products.availability = false` (and back to `true`).
- Storefront SELECTs already respect `availability` (active products are filtered on `availability = true` in `lib/storefront-data.ts`).
- Server-side guard: an order line that is PAID for this product overrides the flag — a vendor cannot un-sell a paid stone (`409 ORDER_LINE_ACTIVE`).
- The product stays editable and visible in the vendor's own list, labelled `Sold (offline)`.

**Endpoints:**
- `POST /api/v1/vendor/products/{productId}/availability` — body `{ available: boolean, reason?: string }`

**Data sources:** `products.availability`, `order_lines` (paid check), `audit_logs`.

**Edge cases:** product already `ARCHIVED` → `409`; product in an open checkout session → allowed (the session re-validates on confirm); flag flip is idempotent.

**Acceptance criteria:**
- `availability=false` removes the stone from the storefront within one request (no cache beyond the existing catalogue cache).
- Attempting `available=true` on a stone with a PAID order line → `409`.
- Audit row with reason recorded.

---

### FV-03 — Async bulk product upload (job + report) `[PROPOSED]` — Phase V1

**User story:** As a vendor I want to upload hundreds of products in one CSV/JSON file and receive a per-row report, so I don't create stones one by one.

**Client decision:** **async job + report** (uploads can exceed 100 rows).

**Behaviour — end-to-end flow:**
1. Vendor uploads a file (CSV or JSON, schema below) via `POST /vendor/products/bulk` (`multipart/form-data`, ≤ 5 MB).
2. Handler validates **structure only** (header/mimetype/size) and enqueues one `jobs` row (`job_type='vendor.bulk_product_import'`, queue `default`, payload = parsed rows + vendor_id + upload id). Returns `202 { job_id }`.
3. Worker handler (`apps/worker/src/handlers/vendor-bulk-import.ts`) processes rows in a bounded loop:
   - Per-row validation against the same zod schema as `createVendorProduct` (images ≤12, price > 0, kind/variety rules, SKU uniqueness within the vendor).
   - Valid rows → `createVendorProduct` in the row-processing transaction (all rows land as `DRAFT`, moderation path unchanged — bulk upload NEVER bypasses review).
   - Invalid rows → quarantined with a row number and reason; **never silently dropped** (project discipline, AGENTS.md §9).
4. A report is written and retrievable: totals (inserted / failed), per-row errors with line numbers, and a downloadable CSV of failed rows with reasons.
5. Vendor polls `GET /vendor/bulk-uploads/{jobId}` or sees the result surfaced in the portal's bulk-upload panel.

**Input schema (CSV columns):** `title, subtitle, kind (LOOSE_STONE|STONE_PAIR|READY_MADE), variety, colour, weight_ct, stone_count, price, currency (ISO-4217, default USD), description, image_url_1..12, origin, treatment, sku (optional vendor ref)`.

**Endpoints:**
- `POST /api/v1/vendor/products/bulk` → `202 { job_id }`
- `GET /api/v1/vendor/bulk-uploads/{jobId}` → `{ status: QUEUED|RUNNING|SUCCEEDED|FAILED, inserted, failed, errors: [{line, field, reason}], report_csv_url? }`

**Data sources:** `jobs` (existing queue infra: lease reclamation, backoff, dead-letter — `apps/worker`), `products`, `audit_logs`, `import_batches` (batch provenance row per upload; batch_key `vendor-bulk-{vendor_id}-{job_id}`).

**Edge cases:** duplicate rows within one file → second occurrence fails with `DUPLICATE_IN_FILE`; file with 0 valid rows → job SUCCEEDED with `inserted=0` + full error report (never a silent success); vendor suspended mid-run → job pauses and fails gracefully with partial report; worker crash → lease reclamation re-runs the job; per-row idempotency via vendor SKU + batch key so a re-run never duplicates.

**Acceptance criteria:**
- 500-row file: job completes, report matches DB row counts exactly, second run of the same file inserts 0 (idempotent).
- Malformed row produces an error entry with the correct line number, and the remaining rows still import.
- Failed-row CSV downloads and re-imports cleanly after fixing.
- No row enters `ACTIVE` state; all await moderation.

---

### FV-04 — Sales analytics upgrade `[PROPOSED]` — Phase V1

**User story:** As a vendor I want to see my real sales performance — per product, per day, over a date range — so I know what to stock.

**Current gap `[OBSERVED]`:** `getVendorDashboardHandler` (vendor-handlers.ts:104-144) computes `total_revenue_usd` by summing `line_total` in JS over ALL order lines — no date ranges, no per-product breakdown, no trends.

**Behaviour:**
- Replace JS aggregation with SQL aggregates over `order_lines JOIN orders` (orders filtered to `PAID`/`COMPLETED` states, excluding `CANCELLED`/`REFUNDED` — same semantics as today, now enforced in SQL).
- Metrics: gross sales, net of refunds, units sold, average order value; grouped per product and per day.
- Date-range parameter (`from`, `to`, default last 30 days), plus a `granularity=day|week|month` series for charts.
- Response is a pure read model; no PII (buyer identities are never exposed to vendors — only order numbers).

**Endpoints:**
- `GET /api/v1/vendor/analytics/sales?from=&to=&granularity=`
- `GET /api/v1/vendor/analytics/products?from=&to=&sort=sales|units|margin` (paged)

**Data sources:** `order_lines` (vendor_id, line_total, quantity), `orders` (state, created_at), `products` (title/sku), existing indexes on `orders.created_at`.

**Edge cases:** refunds after range end → the refund window applies to the original sale date, documented; empty range → zeroed series, not an error; vendors with no sales → honest empty state.

**Acceptance criteria:**
- Per-product totals reconcile exactly with the dashboard's existing `total_revenue_usd` for the same range (cross-check test).
- Query uses indexes (no seq-scan on `orders`); `EXPLAIN` captured in the spec.
- No customer email/name/order address appears anywhere in the response (PII rule).

---

### FV-05 — Bulk edit (price / inventory) `[PROPOSED]` — Phase V6

**User story:** As a vendor I want to update prices or stock on many products at once, with a preview before applying.

**Behaviour:** same job+report machinery as FV-03 (`job_type='vendor.bulk_product_edit'`), plus a **preview→apply→undo** contract:
1. Upload CSV (`sku, field, new_value`) → job returns a **dry-run preview**: per-row current vs proposed value, flagged conflicts (price evidence downgrades, >50% price change requires re-moderation).
2. Vendor confirms → apply job executes row updates in one transaction per batch of 100.
3. Undo: an inverse job is auto-drafted (previous values are stored in the job payload); undo is available for 24h and refused if any row was since sold or modified elsewhere.
- Price changes > 50% or any change to evidence-bearing fields set the product back to `SUBMITTED` for re-moderation.

**Endpoints:** `POST /vendor/products/bulk-edit` (dry-run), `POST /vendor/products/bulk-edit/{jobId}/apply`, `POST /vendor/products/bulk-edit/{jobId}/undo`.

**Data sources:** `jobs`, `products`, `audit_logs` (before/after per row).

**Acceptance criteria:** preview math verified against apply results in a live-DB spec; undo restores byte-identical values; re-moderation flag fires on the documented thresholds.

---

### FV-06 — Order notification emails to vendor `[PROPOSED]` — Phase V5

**User story:** As a vendor I want an email when a paid order includes my stone, so I can start fulfilment immediately.

**Behaviour:** when an order transitions to `PAID`, the existing outbox emits `OrderCreated`/payment events (worker dispatch is live — `apps/worker/src/dispatch/outbox.ts`); add a consumer that, per vendor with lines in the order, enqueues one `notify.email` job (Resend → Mailtrap → OUTBOX_LOG fallback is already live, `apps/worker/src/handlers/email.ts`).
- Email contains order number, line items (no customer personal data beyond first name), and a deep link to `/vendor/orders`.
- Preference flag `email_on_new_order` on vendor profile (default true).

**Data sources:** outbox events, `notify.email` jobs, `vendor_onboarding` email, profile preferences.

**Acceptance criteria:** one email per vendor per order (not per line); duplicate webhook replay does not double-send (idempotent on event id); opted-out vendor gets no email.

---

### FV-07 — Low-stock alerts `[PROPOSED]` — Phase V5

**User story:** As a vendor I want to be told when an active product's stock hits zero (or a threshold), so my storefront listing is never stale.

**Behaviour:** the worker already runs inventory sweeps (`apps/worker/src/operations/reconciliation-sweeps.ts`); add a sweep step that finds products with `availability=true AND inventory_quantity <= threshold` (vendor-configurable, default 0) and enqueues one `notify.email` per vendor per day (digest, not per-product spam).
- Products at zero stock for > 24h are auto-flagged `availability=false` with an audit row and a notice in the report email (vendor can re-enable).

**Data sources:** `products`, `jobs`, sweep registration, `audit_logs`.

**Acceptance criteria:** second sweep run in the same day sends nothing (digest idempotency); auto-flag writes an audit row and is reflected in the vendor dashboard's `out_of_stock_products` count.

---

### FV-08 — Performance scorecard `[PROPOSED]` — Phase V5

**User story:** As a vendor I want to see my fulfilment reliability (SLA, cancellation rate) so I can maintain good standing.

**Behaviour (read-only, SQL aggregates):**
- **Fulfilment SLA:** median/95th percentile hours from order `PAID` → `SHIPPED` (from `fulfillments` + `order_events`).
- **Cancellation rate:** cancelled or refund-requested lines ÷ total lines (90-day window).
- **Approval rate:** admin-APPROVED ÷ SUBMITTED products (moderation quality).
- Standing bands (e.g. Gold/Standard/Watch) drive nothing automatically in V5 — display-only; enforcement (auto-suspension) is an admin decision, see `ADMIN_PORTAL_FEATURES.md` FA-22.

**Endpoints:** `GET /api/v1/vendor/analytics/performance`

**Data sources:** `fulfillments`, `order_events`, `order_lines`, `orders`, `products.structured_extra->>'moderation_status'`.

**Acceptance criteria:** all bands computable for a vendor with zero orders (honest "not enough data" state); numbers reconcile with admin-side vendor scorecard (FA-22) in a shared-spec test.

---

### FV-09 — Guided onboarding wizard `[PROPOSED]` — Phase V7

**User story:** As an invited vendor I want a step-by-step setup (password → store profile → first product) so I can start selling without guessing.

**Behaviour:** extends the admin invite flow (FA-03): after the vendor completes password reset, `/vendor/onboarding` walks through: 1) set password (token link from invite), 2) store profile (display name, country, city, bourse membership, description, phone — the `vendor_onboarding` columns), 3) create first product (reuses FV-03 single-row form), 4) submit for review.
- Each step is a separate endpoint call; progress persisted on `vendor_onboarding` as `structured_extra`-style metadata if a column exists, else in `jobs` metadata — **no new migration**.
- Vendor remains `PENDING` (cannot list products) until admin approves, but can prepare everything.

**Acceptance criteria:** fresh invite → wizard completion → product SUBMITTED without leaving the wizard; back/forward navigation preserves state; PENDING vendors cannot see the sales dashboards (honest locked states).

---

### FV-10 — Store branding (logo / banner) `[PROPOSED]` — Phase V7

**User story:** As a vendor I want my store page to carry my logo and banner so my brand shows on the marketplace.

**Behaviour:** `PATCH /vendor/profile` extended with `logo_url` and `banner_url` (validated `ImageAssetSchema`-style: MIME allowlist, size cap). Rendering on the public vendor/seller surface is part of the storefront migration (M5) — this feature ships the data + validation half only.
- Client-gated note: real file upload replaces URL entry once the storage ADR lands (see FV-13).

**Acceptance criteria:** invalid MIME/dimensions rejected with field errors; branding fields surface in `getVendorById` read model; zero effect on storefront until the UI wires it.

---

### FV-11 — Delivery SLA dashboard detail `[PROPOSED]` — Phase V7

**User story:** As a vendor I want a per-shipment view of my carrier performance so I can spot problem carriers/routes.

**Behaviour:** table of recent `fulfillments` with carrier, tracking, shipped-at vs PAID-at delta, delivered-at; highlighted rows exceeding the SLA threshold (72h default). Export CSV reuses the admin export pattern (FA-06).

**Data sources:** `fulfillments`, `order_events`.

**Acceptance criteria:** delta math tested against hand-computed fixtures; carriers with no deliveries render an honest empty state.

---

### FV-12 — Product view / inquiry analytics `[PROPOSED]` — Phase V7

**User story:** As a vendor I want to know which of my stones get viewed and inquired about, so I can price and photograph better.

**Behaviour:** consumes existing observability counters (no new tracking layer): per-product daily views and `create_customer_request` submissions attributed to the product. Counts only — no visitor identities (PII rule).
- Endpoint: `GET /vendor/analytics/engagement?from=&to=`
- Requires the storefront to emit the counter per product view (small addition to the PDP server path — count by product id, cardinality-safe label).

**Acceptance criteria:** counter cardinality guard (`CardinalityViolationError`) not triggered by product ids (aggregated per day); view counts reconcile with the metric registry in a spec.

---

### FV-13 — Real image file uploads `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**User story:** As a vendor I want to upload product photos directly instead of pasting URLs.

**Current state `[OBSERVED]`:** products accept up to 12 image **URLs** (`ImageAssetSchema`, vendor-handlers.ts:62); certificate uploads have MIME/magic-byte validation (`createCertificateHandler`) but real storage/presign is the mock dev-seam (SG-5/6 ORANGE).

**Gate:** storage/vision ADR + private bucket keys (P2-4). **In-repo half:** switch vendor images to the presign seam now (dev-seam presign → upload → confirm → asset rows with `asset_usages`), so the flip to real storage is config-only.

**Acceptance criteria:** upload flow passes the SG-5 checklist minus AV scan (client gate); 12-image cap enforced server-side; rejected uploads leave no orphaned asset rows.

---

### FV-14 — Vendor webhooks / API key `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**User story:** As a vendor with my own inventory system I want order events pushed to my endpoint.

**Behaviour:** reuses the platform's own HMAC-over-raw-body webhook pattern (`webhook_receipts`, signature headers, dedup by external event id — the same discipline the storefront applies to Stripe webhooks). Vendor registers one endpoint + secret in the portal; events: `order.paid`, `order.line.fulfilled` (their lines only). Delivery via the jobs queue with backoff + dead-letter, receipt rows for every attempt.

**Gate:** policy decision (which events, rate limits, secret rotation UX). No schema change — `webhook_receipts` is generic on `(provider, external_event_id)`.

**Acceptance criteria:** replay of the same event id → no duplicate delivery; tampered payload → delivery refused and flagged; vendor cannot see other vendors' events (scoping test).

---

### FV-15 — Payout statement view (read-only) `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**User story:** As a vendor I want to see what my sales mean in money owed, so I can reconcile my accounts.

**Current state:** `[OBSERVED]` zero payout/commission code exists in the repo; policy is ADR-031 (vendor payout/commission model, Proposed).

**In-repo half (buildable now):** a read-only statement computed from `order_lines` × the platform commission rate **once ADR-031 defines it** — until then this feature is spec-only. UI: monthly statement, per-order breakdown, opening/closing balance, refunds deducted.

**Gate:** ADR-031 ratification (commission %, payout schedule, currency). **Never** invent a rate.

---

## 3. Cross-cutting rules for all vendor features

1. **Identity:** session-derived `vendor_id` only (P1-4). Any new endpoint accepting vendor identity from body/query is a defect.
2. **Moderation:** nothing a vendor does puts a product in front of customers without admin approval (bulk included).
3. **Money:** vendors post no monetary amounts the server trusts; all pricing flows through server re-pricing / snapshots.
4. **Audit:** every mutation → `audit_logs` with before/after.
5. **Idempotency:** bulk jobs are re-runnable; per-row idempotency keys (vendor SKU + batch).
6. **Quarantine, never drop:** failed rows always produce a report entry.
7. **No PII:** vendor surfaces never receive customer contact data beyond the minimum (first name + order number).
8. **Tests:** each feature ships with a live-Postgres spec (the repo's standard — DB-gated suites run against `maihan_dev`); phase ends green: build, lint, tests, budgets.
9. **Schema:** zero new migrations in V1–V6. Anything needing a column/ADR is marked `[CLIENT-GATED]` and parked.

## 4. Dependency notes

- FV-03 (bulk upload) is the foundation for FV-05 (bulk edit) — shared job/report/preflight machinery.
- FV-04 (analytics) feeds FV-08 (scorecard) — shared SQL module for vendor aggregates.
- FV-09 depends on admin FA-03 (invite flow) — build together or FA-03 first.
- FV-13/FV-14/FV-15 are client-gated; their in-repo halves should be built only when their gate is about to open, to avoid dead code.
