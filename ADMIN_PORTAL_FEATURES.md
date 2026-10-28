# ADMIN PORTAL — COMPLETE FEATURE SPECIFICATION

**Purpose:** Single reference document for every admin-portal feature — built, in-flight and proposed — so future sessions can integrate them without re-deriving context.
**Status legend:** `[OBSERVED]` = exists in code today (file references given) · `[PROPOSED]` = designed here, not yet built · `[CLIENT-GATED]` = blocked on a client decision, key or ADR ratification.
**Companion document:** `VENDOR_PORTAL_FEATURES.md` (vendor-side features, bulk upload, sales analytics).

---

## 1. Current state summary `[OBSERVED]`

### 1.1 RBAC foundation (`packages/domain/src/auth/roles.ts`)

The ten-role matrix already covers the four user types the platform needs:

| Business role | Technical role | Scope |
|---|---|---|
| Admin (ecom owner) | `ADMIN_SUPER` | implicit-everything (`hasCapability` short-circuit, roles.ts:142) |
| Manager | `CATALOG_MANAGER` | products/gemstones: read+list+write+**bulk**; settings/taxonomy/media: write; discounts: write (roles.ts:83-90) |
| Vendor | `VENDOR` (account role) | vendor portal — see `VENDOR_PORTAL_FEATURES.md` |
| Customer | `CUSTOMER` (account role) | storefront |

Specialised staff roles also exist: `CONTENT_EDITOR`, `CONTENT_PUBLISHER`, `COMMERCE_OPERATOR`, `TRUST_REVIEWER`, `CONCIERGE_AGENT`, `AI_OPERATIONS`, `MIGRATION_ENGINEER`, `READ_ONLY_ANALYST` (PII-redacted). `ADMIN_MODULES` (21 modules) × `ADMIN_ACTIONS` (read/list/write/approve/publish/resolve/revert/bulk) is the capability vocabulary. Two-person rule enforced for `content`, `derived_approvals`, `certificates` (`requiresTwoPersonRule`).

### 1.2 Existing consoles and API surface

| Console / area | Routes (verified, `apps/web/src/api/routes.ts` + `apps/web/src/app/admin/**`) |
|---|---|
| Dashboard | `GET /admin/dashboards/summary` — **counts only** (`getCatalogueSummary`, dashboards-repository.ts:105-153: products/gemstones/settings/DYO/orders/refunds/vendors/CMS/assets) |
| Products | list + `moderate` (APPROVE/REJECT/PUBLISH/UNPUBLISH/ARCHIVE — `moderateProductByAdmin`, vendor-repository.ts:762) |
| Vendors | list + `moderate` (APPROVED/SUSPENDED/REJECTED — `moderateVendor`, vendor-repository.ts:271) |
| Orders / Refunds | list (`listBackOfficeOrders` 198, `listBackOfficeRefunds` 222) |
| Discounts | list + create (`createBackOfficeDiscount` 279) |
| Customers | directory list; `POST /admin/users/{userId}/role` (assign role) |
| CMS content | pages CRUD + submit-review/decide/publish/archive (`/admin/cms/**`) |
| Certificates | review workspace (`/admin/certificates`) |
| Migration | overview + INV-08 derived-reference approval (`decideDerivedReference` 553) |
| SEO | `seo_metadata` upsert + Redirect Manager (301/302/307/308, dup → 409) |
| Navigation | header/footer/mega-menu editor |
| AI-Ops | jobs list + guarded dead-letter requeue + `ai_logs` tail (`jobs-ops-repository.ts`) |
| Audit | append-only log review (`listBackOfficeAuditLogs` 351) |

Enforcement stack: `gateAdmin` (session + CSRF + RBAC) → `hasCapability(role, module, action)` server-side → zod validation → audit row. `READ_ONLY_ANALYST` gets PII redaction.

### 1.3 Verified gaps behind this document

- No revenue anywhere: `getCatalogueSummary` is counts-only; zero `revenue`/`sales` queries exist in `dashboards-repository.ts`.
- No admin product create/update/delete (list + moderate only).
- No vendor create/invite/delete (moderation only; vendors self-register).
- No bulk-edit implementation (the `bulk` action exists in CATALOG_MANAGER scope but no handler implements it).
- No CSV exports, staff console, feature-flags UI.

---

## 2. Feature specifications

Phase mapping: **V2** (core gaps) · **V3** (manager seat) · **V4** (quick wins) · **V6** (bulk edit) · **V7+** (growth) · **GATED** (client decisions).

---

### FA-01 — Platform revenue dashboard `[PROPOSED]` — Phase V2

**User story:** As the store owner I want GMV, per-vendor revenue and net revenue after refunds on one screen, so I know the business position at a glance.

**Behaviour:**
- SQL aggregates (never JS loops) over `orders` (state `PAID`+`COMPLETED`, excluding `CANCELLED`/`REFUNDED`) × `order_lines` (vendor attribution via the line's product's vendor) with the order-total columns `subtotal / discount_total / shipping_total / tax_total / grand_total` (orders DDL).
- Tiles: GMV, net revenue (GMV − refunds), refunds outstanding, take-rate placeholder until ADR-031 defines commission; series by day/week/month; per-vendor revenue table (paged, sortable).
- Date-range parameter with sane defaults; currency fixed (platform USD until ADR-033 FX).
- Read model only — no PII in responses (READ_ONLY_ANALYST-safe).

**Endpoints:**
- `GET /api/v1/admin/analytics/revenue?from=&to=&granularity=`
- `GET /api/v1/admin/analytics/revenue/vendors?from=&to=` (per-vendor breakdown)

**Data sources:** `orders`, `order_lines`, `products` (vendor attribution), `refunds`, existing `orders.created_at` indexes.

**Edge cases:** order with lines from multiple vendors → GMV counted once, per-vendor split by `line_total` (test proves no double-count); refunds partially outside range → attributed to the original sale date (documented); vendor deleted (FA-04) → revenue kept under "(deleted vendor)".

**Acceptance criteria:** per-vendor sums reconcile to the vendor's own analytics (FV-04) in a shared live-DB test; `EXPLAIN` shows index usage; response contains zero customer PII.

---

### FA-02 — Admin product CRUD (owner's own products) `[PROPOSED]` — Phase V2

**User story:** As the store owner I want to create and edit my own catalogue products (house inventory, not vendor-moderated), so the house stock is fully DB-managed.

**Behaviour:**
- Create: reuses the locked schema's product composition (INV-01: one setting variant + one gemstone XOR one pair, or READY_MADE) through the same repository path the catalogue seed uses — admin inputs are validated by the same zod schemas, evidence fields (`price_evidence`, `source_url`, `raw_spec`) are required when claimed.
- Update: field-level PATCH with audit before/after; price changes re-stamp `price_evidence` honestly (an admin-typed price is `INFERRED` unless evidence attached — INV-07 discipline).
- Delete: soft delete (`deleted_at`), same active-commerce guard as FV-01.
- House products skip vendor moderation but **publish is still a state transition** (`DRAFT → ACTIVE`) with audit; never a bare UPDATE.
- UI: extend the existing products console (list + moderate) with create/edit drawers.

**Endpoints:** `POST /api/v1/admin/products`, `PATCH /api/v1/admin/products/{productId}`, `DELETE /api/v1/admin/products/{productId}` (capability: `products: write` — CATALOG_MANAGER and ADMIN_SUPER).

**Data sources:** `products`, `gemstones`, `settings`, `setting_variants`, `assets`/`asset_usages`, `audit_logs`.

**Edge cases:** INV violations (e.g. pair attached to non-EARRINGS) → 422 from `assertComposition` (domain layer already enforces); duplicate SKU → 409; price without evidence → accepted as `INFERRED`, rendered with the unverified badge everywhere.

**Acceptance criteria:** created product appears on the storefront only after `ACTIVE`; INV-01/02/03 negative tests; audit rows on every mutation.

---

### FA-03 — Vendor invite (admin creates → vendor self-setup) `[PROPOSED]` — Phase V2

**User story:** As the store owner I want to invite a vendor by email so they can set their own password and store profile, rather than me handling credentials.

**Client decision:** **admin invites; vendor performs password reset + store setup** (no admin-set passwords).

**Behaviour:**
1. Admin submits invite: email, display name, legal name, country/city (the `vendor_onboarding` natural fields).
2. Server: creates the `vendor_onboarding` row (`status='PENDING'`) + customer account (`role='VENDOR'`, unverified) in one transaction — `owner_customer_id` UNIQUE is the idempotency anchor (existing invite for the same email → return the existing row, never a duplicate).
3. Enqueues a `notify.email` job with a single-use hashed set-password token — **reuses the existing auth token machinery verbatim** (SHA-256 hashed, TTL, session revocation pattern from the password-reset flow, `auth-repository.ts:889-902`); raw token never stored (P1-5 token hygiene).
4. Vendor follows the link → sets password → completes store profile (the FV-09 wizard consumes this).
5. Admin approves (`moderateVendor`) before the store can list products.
- Invites expire (default 7 days); re-invite revokes the old token and issues a new one.
- No new migration: `vendor_onboarding` + `jobs` + existing token patterns carry it. Wizard progress stored per FV-09 (no schema change).

**Endpoints:**
- `POST /api/v1/admin/vendors/invite` (capability: `ADMIN_SUPER` only)
- `GET /api/v1/admin/vendors/invites` (status list: PENDING_INVITE / INVITED / SETUP_IN_PROGRESS)
- `POST /api/v1/admin/vendors/{vendorId}/reinvite`

**Data sources:** `vendor_onboarding`, `customers` (auth repo register path), `jobs` (`notify.email`), `audit_logs`.

**Edge cases:** email already a customer → link accounts via the existing customer record (role upgrade to VENDOR + onboarding row); email already an invited vendor → idempotent re-invite; invitee never completes setup → invite expires, admin sees stale status; suspended vendor re-invited → stays SUSPENDED.

**Acceptance criteria:** full happy path live-DB tested (invite → token email job → password set → profile → admin approve → vendor dashboard accessible); raw token absent from `jobs` payload and all logs (assert in spec); duplicate invite → single onboarding row.

---

### FA-04 — Vendor delete / deactivate `[PROPOSED]` — Phase V2

**User story:** As the store owner I want to remove a vendor from the platform while preserving order history, so accounting and customers stay intact.

**Behaviour:**
- **Deactivate** (default): `vendor_onboarding.status = 'SUSPENDED'` (existing enum value) + all vendor products `availability=false` + in-flight order lines surface to admin for manual resolution. Vendor login is refused with an honest state.
- **Delete** (soft, destructive-lite): marks the onboarding row deleted (status + metadata), unassigns storefront visibility, **keeps** `vendor_onboarding` row + all `order_lines` history (financial records are never destroyed). `owner_customer_id` UNIQUE means the email can be re-invited fresh after deletion — handled by the FA-03 idempotency path.
- Guard: deletion refused while the vendor has non-terminal orders (`409 VENDOR_HAS_OPEN_ORDERS`) with a count in the error detail.
- Everything audit-logged with before/after.

**Endpoints:**
- `POST /api/v1/admin/vendors/{vendorId}/deactivate`
- `DELETE /api/v1/admin/vendors/{vendorId}` (capability: `ADMIN_SUPER`)

**Data sources:** `vendor_onboarding`, `products`, `order_lines`/`orders`, `audit_logs`.

**Acceptance criteria:** deleted vendor's products vanish from storefront + admin catalogue lists but their historical order lines still render in order views; open-order guard tested; re-invite of a deleted vendor's email succeeds and does not resurrect old products.

---

### FA-05 — Manager seat (capability-filtered console) `[PROPOSED]` — Phase V3

**User story:** As a manager (CATALOG_MANAGER) I want an admin console that shows exactly my permitted modules, so I can work without hitting walls.

**Behaviour:**
- The console shell already keys off `hasCapability`; this feature completes the UX: navigation, dashboards and action buttons render strictly from the session's computed permissions (`computePermissionsForRole` — already returned on every session verify, auth-repository.ts:163-196).
- Server remains the authority: every handler re-checks capability (existing `gateAdmin` pattern) — the UI filter is convenience only.
- Manager lands on a catalogue-first home (products due moderation, inventory flags) instead of the owner's full dashboard.
- Staff provisioning: admin assigns `CATALOG_MANAGER` via the existing `POST /admin/users/{userId}/role`.

**Acceptance criteria:** role-matrix test extended to assert a CATALOG_MANAGER session sees zero buttons for modules outside scope AND direct API calls to those modules fail with the standard error envelope; no capability check relies on the UI.

---

### FA-06 — CSV exports `[PROPOSED]` — Phase V4

**User story:** As the owner/manager I want to export orders, products, customers and vendor reports as CSV for accounting and analysis.

**Behaviour:**
- Streaming CSV generation (no full-table materialisation) over the existing list repositories, honouring the same filters as the console views.
- Exportable sets: orders (+ lines), products (+ vendor), customers (PII-redacted for non-ADMIN_SUPER per the READ_ONLY_ANALYST precedent), vendor sales report (delegates to FV-04 aggregates), revenue report (FA-01).
- Async for large sets: > 10k rows → `jobs` row + downloadable report (same pattern as FV-03), else synchronous stream.
- Exports are audited (what was exported, by whom, when) — data-egress is a privileged action.

**Endpoints:** `GET /api/v1/admin/export/{dataset}?format=csv&from=&to=&filters=`

**Data sources:** existing list repositories + `jobs` + `audit_logs`.

**Acceptance criteria:** CSV parses cleanly (header/types); row counts match the console's filtered count for the same query; export of customers as READ_ONLY_ANALYST contains redacted columns (assert); audit row written.

---

### FA-07 — Staff console `[PROPOSED]` — Phase V4

**User story:** As the owner I want to see all staff accounts (admins/managers/operators), assign roles and deactivate accounts, from one place.

**Behaviour:**
- Staff list: all accounts with admin roles + last-login + status, from the auth credential store.
- Assign/reassign role: exists (`adminAssignRoleHandler`); add **deactivate** (revokes all sessions via the existing revocable-session machinery and blocks login) and **reactivate**.
- Guard: the last active `ADMIN_SUPER` cannot be deactivated (lockout protection); self-deactivation refused.
- All actions audited with before/after roles.

**Endpoints:** `GET /api/v1/admin/staff`, `POST /api/v1/admin/staff/{userId}/deactivate`, `POST /api/v1/admin/staff/{userId}/reactivate`.

**Data sources:** auth credentials store (jobs `auth_sessions` queue per existing pattern), `audit_logs`.

**Acceptance criteria:** deactivating a staff member terminates their live session (next request 401); last-super guard tested; role matrix tests extended.

---

### FA-08 — Feature flags console `[PROPOSED]` — Phase V4

**User story:** As the owner I want to toggle platform features without a deploy.

**Behaviour:**
- UI over the existing `feature_flags` table (live since the BE-4 fix; `search.generation_bump` consumption wired).
- List flags with descriptions, current values, last-modified actor; toggle writes with audit + cache-invalidation through the existing generation-bump mechanism.
- Typed flag registry in `packages/config` (names/descriptions/types) so flags are code-reviewed, with unknown flags surfaced in AI-Ops.

**Endpoints:** `GET /api/v1/admin/flags`, `PATCH /api/v1/admin/flags/{key}` (capability: ADMIN_SUPER).

**Data sources:** `feature_flags`, `jobs` (generation bump), `audit_logs`.

**Acceptance criteria:** toggle → consumers see the new value without redeploy (integration test via the generation store); unknown flag PATCH → 404; audit row written.

---

### FA-09 — Bulk edit with preview → approve → undo `[PROPOSED]` — Phase V6

**User story:** As the owner/manager I want to mass-update catalogue fields (price, inventory, state) with a preview and undo, so bulk operations are safe.

**Behaviour:** admin counterpart of FV-05 with a wider field set (price, `availability`, state transitions within the product state machine, taxonomy re-pointing):
1. Upload/select target set (by filter query or CSV of SKUs) → **dry-run preview**: per-row current vs proposed, flagged risks (evidence-bearing field changes, >50% price moves, products in active commerce).
2. Approve → batched apply (100/tx) with per-row audit entries.
3. **Undo** window 24h: inverse job auto-drafted from stored previous values; refused per-row if that row changed since (last-write-wins guard) — partially-applied undo is reported honestly.
- State changes go through `transitionOrderState`-equivalent product state transitions — never bare UPDATEs.

**Endpoints:** `POST /api/v1/admin/products/bulk-edit` (preview), `POST …/bulk-edit/{jobId}/apply`, `POST …/bulk-edit/{jobId}/undo`.

**Data sources:** `jobs`, `products`, `audit_logs` (per-row before/after).

**Acceptance criteria:** preview ↔ apply equality on a 1k-row live-DB fixture; undo restores byte-identical values where uncontested and reports contested rows; every row has an audit entry.

---

### FA-10 — Unified notification center `[PROPOSED]` — Phase V7

**User story:** As the owner I want one inbox of everything needing attention (pending vendor approvals, pending refunds, dead-letter jobs, low-stock flags, failed webhooks) instead of touring five consoles.

**Behaviour:**
- Aggregates counters and top-N items from existing sources: `vendor_onboarding` PENDING, `refunds` REQUESTED/APPROVED, `jobs` DEAD_LETTER (already requeuable in AI-Ops), webhook receipts flagged for review, low-stock sweep output (FV-07), certificate review backlog.
- Each item deep-links to its console action. Read/dismiss state per admin (stored in `jobs` metadata or a lightweight table — no schema change if stored as a dismissed-jobs list; a small `admin_notifications` table is acceptable if ADR-035 is drafted).
- Optional daily digest email via `notify.email`.

**Acceptance criteria:** every counter reconciles with its source console in a cross-check test; dead-letter item → requeue works from the center; zero PII.

---

### FA-11 — Concierge / human-handoff triage queue `[PROPOSED]` — Phase V7

**User story:** As a concierge agent I want a queue of conversations the AI escalated (`AWAITING_HUMAN`), so no customer waits unseen.

**Behaviour:** the handoff engine (`packages/ai` HandoffEngine, 9 triggers, conversations transition to `AWAITING_HUMAN`) already produces the state — this console renders it: queue of awaiting conversations with trigger reason, history viewer (the transcript API exists: `GET /ai/conversations/{key}`), reply/resolve actions, assignment to `CONCIERGE_AGENT` actors.
- Replies go through the conversation message path (never direct DB writes from the agent UI — SG-10 discipline).
- SLA badges (time in AWAITING_HUMAN).

**Endpoints:** `GET /api/v1/admin/concierge/queue`, `POST /api/v1/admin/concierge/{conversationKey}/reply|resolve` (capability: `conversations: write` for CONCIERGE_AGENT + ADMIN_SUPER).

**Data sources:** `conversations`, `messages`, `tool_calls`, `ai_interactions`, `guardrail_events`.

**Acceptance criteria:** escalation created by the AI appears in the queue within one poll; resolve transitions state + audit; agent cannot access conversations outside their assignment (scoping test).

---

### FA-12 — Curated collections editor `[PROPOSED]` — Phase V7

**User story:** As the owner I want to curate "Gemstone of the week" and homepage collections without a code deploy.

**Behaviour:** named collections of products (manual ordering), scheduled visibility windows, rendered by the storefront through the CMS machinery (`pages`/blocks pattern) or a `collections` surface — **schema check first**: if no locked table fits, this needs an expand migration + ADR-035 (do NOT touch the schema unilaterally — M-03 lesson). Spec until that gate.
- Storefront render contract: server component reads the active collection; empty → honest fallback (current homepage behaviour).

**Gate:** schema decision (ADR if needed). **Acceptance criteria:** curation appears on the storefront within the cache TTL; ordering preserved; scheduled end auto-unpublishes via a sweep.

---

### FA-13 — Certificate re-verification reminders `[PROPOSED]` — Phase V7

**User story:** As the trust reviewer I want certificates flagged when their verification ages out, so trust claims stay current.

**Behaviour:** sweep over `certificates` with `verification_status='VERIFIED'` and a staleness threshold (configurable, default 24 months — lab re-issue cycles) → flags them `REVIEW_DUE` (display-level flag, not a status-machine change) and enqueues a `notify.email` to the trust queue.
- Product pages keep rendering per INV-07 unchanged (the flag is an ops signal, not a customer-facing downgrade).

**Data sources:** `certificates`, `verification_events`, sweeps, `notify.email`.

**Acceptance criteria:** second sweep run same day → no duplicates; INV-07 render tests untouched and green.

---

### FA-14 — Customer session manager `[PROPOSED]` — Phase V7

**User story:** As the owner/support I want to see and revoke a customer's active sessions (with their request or on fraud suspicion).

**Behaviour:** sessions are already HMAC-signed + PG-backed and revocable (auth repository). Admin view: active sessions per customer (created, last-seen, no device fingerprints beyond coarse data — PII rule), revoke-one / revoke-all (which the password-reset flow already does account-wide).
- Every revoke audited; page requires ADMIN_SUPER (session data is sensitive).
- Rate-limited per the SoT 11.11 table (admin scope).

**Acceptance criteria:** revoked session's next request → 401; password-reset still revokes everything (regression test); audit rows.

---

### FA-15 — Price history timeline `[PROPOSED]` — Phase V7

**User story:** As the owner I want to see any product's price over time (and who/what changed it), so pricing is accountable.

**Behaviour:** timeline sourced from existing truth: `audit_logs` (before/after on price mutations), `dyo_price_snapshots` for DYO-derived values, migration provenance (`import_batches` batch_key) for seeded prices, and `price_evidence` transitions. No new recording mechanism — pure read model over audit data.
- Rendered in the admin product console as a side panel.

**Acceptance criteria:** every price change path (admin edit FA-02, bulk edit FA-09, vendor edit, migration seed) appears on the timeline in a live-DB test; unverified sources labelled per INV-07.

---

### FA-16 — Abandoned-checkout view + recovery emails `[PROPOSED]` — Phase V7

**User story:** As the owner I want to see carts that reached checkout but didn't complete, and (optionally) send one recovery email.

**Behaviour:**
- View: carts/checkout-sessions idle beyond N hours with contactable owners, aggregated (count, value) + drill-down. PII-visible to ADMIN_SUPER only.
- Recovery: opt-in customer email ("complete your order") via `notify.email`, max 1 per cart per 7 days (idempotency key on the job), suppressed for `marketing_opt_in=false` (consent field exists).
- The existing cart-expiry sweep defines when a cart is truly dead — recovery only targets live-idle carts.

**Acceptance criteria:** opt-out customer never emailed (test); repeat runs don't spam (7-day guard); recovery email contains no price that can diverge from the server repricing (link-only, no totals).

---

### FA-17 — Restock / price-drop alert configuration `[PROPOSED]` — Phase V7

**User story:** As the owner I want customers to be able to subscribe to restock/price-drop alerts on sold-out stones, and to see that pipeline's health.

**Behaviour:**
- Customer-facing: "Alert me" on an unavailable product (favorites-like record; needs a storage surface — reuse `favorites` semantics if it fits, else ADR-035; no unilateral schema).
- Trigger: when FA-02/FV-02 flips `availability=true` or price drops, a job fans out `notify.email` to subscribers (cap per event, dedup by customer+product+event).
- Admin view: subscribers per product, sends, failures.

**Gate:** storage surface decision (ADR-035 if no fit). **Acceptance criteria:** price-drop threshold honoured; unsubscribed/opt-out never emailed; event replay doesn't double-send.

---

### FA-18 — Newsletter / customer segments `[PROPOSED]` — Phase V7

**User story:** As the owner I want to email a segment of opted-in customers (new arrivals, high-value collectors).

**Behaviour:** segment builder over existing customer data (spend from FA-01 aggregates, `marketing_opt_in=true` only — hard filter, tested), message composer with the house template, send via the `notify.email` pipeline in rate-limited batches with a per-campaign suppression list (unsubscribes).
- Campaign = `jobs` payload + audit; previews send to the admin's own email first.

**Acceptance criteria:** opted-out customers provably absent from any send list; batch idempotent (resume mid-send sends no duplicates); campaign report (sent/failed) honest.

---

### FA-19 — Scheduled promotions `[PROPOSED]` — Phase V7

**User story:** As the owner I want discount codes that activate and expire on a schedule, planned ahead of time.

**Behaviour:** extends the existing discounts module (codes, validation, redemption counting all live post-P1-23): add `starts_at`/`ends_at` windowing evaluated server-side at validate/apply time (no scheduler needed — time-of-check), plus a sweep to auto-archive expired codes.
- Admin UI on the existing discounts console: schedule fields + a "scheduled/upcoming" section.

**Data sources:** `discounts` (columns exist per DDL — verify window columns; if absent → ADR-035), redemption counters (P1-23).

**Acceptance criteria:** early use before `starts_at` → rejected; expiry honoured mid-checkout by the re-pricing snapshot semantics; redemption limits still enforced.

---

### FA-20 — Email / notification log viewer `[PROPOSED]` — Phase V4.5

**User story:** As the owner I want to see every transactional email the platform tried to send and its outcome, so support can debug "I didn't get the email".

**Behaviour:** read-only tail over the `notify.email` job stream (the AI-Ops `ai_logs` pattern): recipient (PII-redacted for non-ADMIN_SUPER), template, queue path taken (Resend → Mailtrap → OUTBOX_LOG — honest `delivered` semantics per P1-24), error details, retry count.
- Filter by customer email (ADMIN_SUPER), template, status, date.

**Acceptance criteria:** OUTBOX_LOG fallback rows show as NOT delivered (honesty rule); redaction verified for analyst roles; no body content with tokens is ever rendered (P1-5).

---

### FA-22 — Vendor performance oversight `[PROPOSED]` — Phase V7

**User story:** As the owner I want a comparative scorecard of all vendors (SLA, cancellation, approval rate) so I can manage quality.

**Behaviour:** admin-facing aggregation of the FV-08 metrics across vendors, sortable/rankable, with standing bands (Gold/Standard/Watch — display-only in V7). **Enforcement (auto-suspension or listing caps) is explicitly out of scope until the owner defines policy** — manual `moderateVendor` remains the enforcement tool.
- Export via FA-06.

**Acceptance criteria:** vendor's own scorecard (FV-08) and admin's number match in a shared test; bands render for zero-order vendors honestly.

---

### FA-21 — "Similar stones" recommendation management `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**User story:** As the owner I want the PDP "similar stones" to be relevant and overridable.

**Behaviour:** the schema already carries 2 HNSW vector indexes and the hybrid retrieval function (`match_knowledge_chunks` pattern); product embeddings key off the AI provider gate (P2-5). Admin side: per-product "pinned alternatives" override list (manual curation wins over vector similarity), plus a similarity-preview tool once embeddings go live.

**Gate:** AI provider ADR + key (P2-5) for the vector half; the pinned-override half is in-repo buildable.

---

### FA-23 — Real uploads / storage console `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**User story:** As the owner I want product/certificate file storage on real object storage with private signed URLs.

**Current state:** SG-5/6 ORANGE — MIME/magic-byte validation live, real presign is the dev-seam mock. **Gate:** storage/vision ADR + keys (P2-4). Admin console half: asset browser over `assets`/`asset_usages` (orphaned-asset cleanup, re-scan trigger, storage class per retention policy).

---

### FA-24 — Multi-currency FX console `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**Gate:** ADR-033 (FX policy, Proposed). Console: rate table management (source, effective-from, audit), currency enablement per storefront, display-only conversion rules. Pricing/storage stays base-currency (NUMERIC(12,2)) until ratified — never invent a rate.

---

### FA-25 — Payouts console `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**Gate:** ADR-031 (payout/commission model, Proposed). Console: commission ledger per vendor (from FA-01 data × ratified rates), payout batch preparation, statement issuance (pairs with FV-15), dispute flags. Spec-only until ratification.

---

### FA-26 — RMA / returns console `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8

**Gate:** ADR-034 (RMA + restock + saved-DYO schema, DRAFT/Proposed — no migration until ratified). Console: RMA queue, inspection → disposition (restock/refund/repair), restock inventory events, customer notifications. Spec-only until ratification.

---

### FA-27 — B2B / trade accounts `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8+

**Gate:** new ADR needed (trade pricing tiers, credit terms, tax handling). Gems-industry core (dealers/bourses). Would extend RBAC with a trade-customer role + price-list overrides. Spec-only until the owner defines terms.

---

### FA-28 — Layaway / instalment holds `[PROPOSED]` + `[CLIENT-GATED]` — Phase V8+

**Gate:** new ADR needed (deposit schedules, default policy, legal). Would build on `inventory_reservations` + add-ons + the payment provider abstraction. Spec-only.

---

## 3. Cross-cutting rules for all admin features

1. **Authority chain:** `gateAdmin` (session + CSRF + RBAC) → `hasCapability(role, module, action)` → zod → execute → audit. The UI never grants anything.
2. **Session-only identity:** no customer/vendor identity from headers/body/query anywhere (P1-4).
3. **State machines:** all status changes go through transition guards; no bare UPDATEs on state columns.
4. **Evidence discipline:** typed values without evidence are `INFERRED` and render as such (INV-07/INV-08).
5. **Audit:** every mutation and every export writes `audit_logs` before/after (SG-8).
6. **Idempotency:** mutating endpoints and jobs replay-safe; bulk operations per-row idempotent.
7. **PII:** customer data redacted for non-ADMIN_SUPER surfaces (READ_ONLY_ANALYST precedent); nothing sensitive in logs/metrics.
8. **Fail-closed:** missing config/keys/flags disable features honestly — never default-open.
9. **Schema:** zero unilateral migrations. Anything needing a new table/column drafts an ADR first (ADR-035 registry below). Reuse locked tables (`jobs`, `audit_logs`, `import_batches`, `feature_flags`) wherever possible.
10. **Tests:** live-Postgres specs for every repository change; phase ends green: build, lint, tests, budgets, schema-fidelity.

## 4. Execution order (V1→V8) — dependency-aware

| Phase | Contents | Depends on |
|---|---|---|
| V1 | FV-01…FV-04 (vendor core gaps) | — |
| V2 | FA-01, FA-02, FA-03, FA-04 (admin core gaps) | FA-03 ↔ FV-09 co-designed |
| V3 | FA-05 (manager seat) | FA-02 (catalogue CRUD exists to manage) |
| V4 | FA-06, FA-07, FA-08, FA-20 | — |
| V5 | FV-06, FV-07, FV-08 | V1 analytics module |
| V6 | FA-09 + FV-05 (shared bulk machinery) | FV-03 |
| V7 | FA-10…FA-22, FV-09…FV-12 (growth wave) | respective prerequisites above |
| V8 | Client-gated wave: FV-13…FV-15, FA-21…FA-28 | keys/ADRs per row |

## 5. Open decisions register (client)

| # | Decision | Unblocks | Status |
|---|---|---|---|
| 1 | crawler.sqlite pristine unit or manifest amendment | corpus migration, load tests (P2-1) | pending |
| 2 | Stripe sandbox keys | real-money journeys (P2-2) | pending |
| 3 | Resend/Mailtrap key + bounce policy | FA-20 truthfulness, all email (P2-6) | pending |
| 4 | AI provider ADR + key | FA-21 vector half, real embeddings (P2-5) | ADR pending |
| 5 | Storage/vision ADR + keys | FV-13, FA-23, SG-5/6 GREEN (P2-4) | ADR pending |
| 6 | Ratify ADR-028…034 | FA-25/FA-26 and RLS/IdP/authenticity/FX foundations | pending |
| 7 | ADR-035 (new): collections/alerts/newsletter surfaces if no locked-table fit | FA-12, FA-17, FA-18, FA-19 | to draft |
| 8 | Trade accounts terms; layaway policy | FA-27, FA-28 | pending |
| 9 | Vendor standing policy (enforcement bands) | FA-22 enforcement | pending |
