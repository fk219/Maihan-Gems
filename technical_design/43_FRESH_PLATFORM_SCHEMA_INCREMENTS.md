# 43 FRESH PLATFORM SCHEMA INCREMENTS

**Status:** Approved design (owner direction 2026-10-28: "complete the whole database thing").
**Companion to:** `technical_design/41` (catalogue core) · `technical_design/42` (semantic codes).
**Scope:** the remaining database layers of the business on the fresh, clean design — commerce/identity, vendor portal, trust, CMS/ops. **No migration apparatus anywhere; zero provenance; no redirects.**

---

## 1. Increment map

| DDL | Increment | Tables | Purpose |
|---|---|---|---|
| `0006_commerce_identity.sql` | Customers + cart + orders | customers, customer_addresses, auth_sessions, favourites, carts, cart_items, inventory_reservations, orders, order_items, payments, refunds, discounts, order_events, order_fulfillments | sell: identity, bag, checkout, money |
| `0007_vendor_portal.sql` | Vendors | vendor_onboarding, vendor_submissions | supply: onboarding, submissions, moderation |
| `0008_trust.sql` | Trust | certificates, diamond_grades, verification_events | certification + diamond 4C (deferred design, now realised) |
| `0009_cms_ops.sql` | CMS + ops | pages, seo_metadata, audit_log, feature_flags | content + governance (NO redirects — descoped) |

## 2. Commerce & identity — key design decisions

- **Identity:** `customers` (email-unique at `lower(email)`, password hash app-managed, `email_verified_at` honest NULL), `customer_addresses` (shipping/billing, one default), `auth_sessions` (SHA-256 token hash at rest, expiry, revocation), `favourites` (polymorphic over product/gemstone/setting).
- **Cart:** `carts` (guest token or customer-owned; ACTIVE → CONVERTED/ABANDONED/EXPIRED) + `cart_items` (exactly one of product | configuration — CHECK; `unit_price` snapshot at add time).
- **Inventory:** `inventory_reservations` (gemstone | product rows; ACTIVE → CONSUMED/RELEASED/EXPIRED) — the one-of-one stones are guarded here; a sold stone moves to SOLD at order payment.
- **Orders:** `orders` (app-minted `MG-YYYY-######`; frozen totals; shipping/billing address snapshots as JSONB — snapshot semantics, not live FKs), `order_items` (description + code snapshot; trace refs to product/configuration and, for configured lines, the gemstone/setting of the moment).
- **Money:** `payments` (provider-agnostic: provider + provider_ref; AUTHORIZED → CAPTURED → REFUNDED), `refunds`, `discounts` (percent|fixed, window, usage cap, `used_count`), `order_events` (append-only timeline), `order_fulfillments` (carrier + tracking + state).
- **Laws:** totals CHECK ≥ 0; line references exactly one source (CHECK); money mutations only via payments/refunds rows (never edited totals); order status machine is app-owned with every transition logged to `order_events`.

## 3. Vendor portal — supply side

- `vendor_onboarding` (1:1 with `vendors`; PENDING → APPROVED/SUSPENDED/REJECTED with reviewer + timestamp).
- `vendor_submissions`: vendor proposes a gemstone/setting/product as **JSONB payload** (their fields + their `vendor_ref`); DRAFT → SUBMITTED → **APPROVED**/REJECTED. On APPROVED the app mints our semantic code (via `code_counters`), inserts the catalogue row with `vendor_id`, and records `resulting_ref` on the submission. Vendors track by their own ref; we track by ours. **Only APPROVED submissions enter the catalogue.**

## 4. Trust — certificates + diamond 4C

- `certificates` (polymorphic on gemstone|product; agency + cert_no + private url + `verified UNVERIFIED/VERIFIED/FLAGGED`; unique per owner+agency+cert_no).
- `diamond_grades` (1:1 with a gemstone): colour D–N, clarity FL–I3, cut Excellent–Poor, fluorescence, cert agency/no, table/depth %. Lab-grown diamonds get the same table (`origin_type` distinguishes). Melee/accent stones simply have no row (honest).
- `verification_events` — append-only trust ledger (who verified what, when).

## 5. CMS + ops — content and governance

- `pages` (slug-unique, DRAFT/PUBLISHED, JSONB blocks, SEO fields), `seo_metadata` (path-unique). **No `redirects` table — descoped by design (fresh SEO start).**
- `audit_log` — append-only (actor kind/id, action, entity, before/after JSONB) for privileged actions.
- `feature_flags` — key/enable/payload.

## 6. What is deliberately NOT here

Staging/import tables, provenance columns, redirects, WhatsApp/queues/event-outbox machinery (ops beyond audit/flags), AI knowledge/embeddings (later F3-AI increment), WebAR asset tables (VTO lives on `assets.vto_ready` + `calibration`). Each gets its own increment if/when the owner approves it.

## 7. Verification standard for every increment

1. DDL applies cleanly; 2. constraint smoke tests (both accept and reject paths); 3. flow smoke (customer→cart→order; vendor→submit→approve→catalogue row); 4. counts + F-INV battery unchanged; 5. doc + audit + memory updated.
