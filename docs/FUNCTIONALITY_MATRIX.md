# Maihan Gems — Functionality & Decisions Matrix

**This is the canonical inventory of what the platform does, what is decided,
and what remains.** Status changes land here first, then in
`PROJECT_STATUS.md`. Architecture authority stays in `technical_design/`.

**Last updated:** 2026-11-01 · branch `develop`

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Working and verified (route/API/test evidence) |
| 🟡 | Deliberately pending a product/business decision |
| ⏳ | Owner-gated (credentials, provider, deployment) |
| 📦 | Content/data pending (not code) |

---

## 0. Resume here (2026-11-01)

**State:** the `fresh` schema is the only database. Every code-side task in
this document is complete and verified; what remains is owner-gated
integrations, product decisions, deploy-time ops and content.

### Run locally

```bash
# Database (compose container on 127.0.0.1:5433)
docker start maihan-dev-db
export DATABASE_URL="postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev"

# Schema + reference data (idempotent, checksum-verified)
pnpm --filter @maihan/fresh-api run migrate

# API (port 3010)
FRESH_ADMIN_TOKEN=dev-admin-token FRESH_ADMIN_PASSWORD=maihan-admin-dev FRESH_API_PORT=3010 SITE_URL=http://localhost:3000 pnpm --filter @maihan/fresh-api run start

# Storefront (port 3000) — STOP `next start` before rebuilding `.next`
pnpm --filter @maihan/web run build
MAIHAN_DEV_SEAM=1 SITE_URL=http://localhost:3000 pnpm --filter @maihan/web run start:web
```

### Useful commands

| Task | Command |
|---|---|
| Tests (API) | `DATABASE_URL=… pnpm --filter @maihan/fresh-api run test` |
| Tests (storefront) | `FRESH_API_URL=http://127.0.0.1:3010 pnpm --filter @maihan/web run test` |
| Domain / contracts | `pnpm --filter @maihan/domain run test` · `pnpm --filter @maihan/contracts run test` |
| Lint / build | `pnpm run lint` · `pnpm run build` · `pnpm --filter @maihan/web run build` |
| Maintenance sweep | `pnpm --filter @maihan/fresh-api run maintenance` |
| Backup | `pnpm run db:backup` (or `scripts/backup-cron.sh --install`) |
| Restore drill | `pnpm run db:restore-drill` |
| Schema bootstrap check | scratch DB + `pnpm --filter @maihan/fresh-api run migrate` (expect 20 migrations / 54 tables) |

### Dev credentials (never production)

| Surface | Credential |
|---|---|
| Admin (`/admin`) | `admin@maihangems.com` / `maihan-admin-dev` (2FA opt-in in Audit tab) |
| Vendor (`/vendor`) | `ahmed@skylinegems.ae` / `Skyline2026!` (V-AE-004) |
| Vendor first-time setup | vendor code + one-time API key → set password |
| API dev token | `dev-admin-token` (accepted only outside production) |

### Where state lives

- **This file** — functionality + decisions + resume pointer.
- `PROJECT_STATUS.md` — single source of truth for current status.
- `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` §22–§24 — history and per-item evidence.
- `.opencode/memory/` — session handoff, implementation state, decisions, lessons.
- `docs/adr/` — accepted ADRs (035 fresh DB, 036 Sanity, 037 media).

**Working tree:** check `git status` before starting — the last batches were
uncommitted at the time of writing, and the portals were concurrently
redesigned.

---

## 1. Storefront (`apps/web`, :3000)

| Capability | Status | Notes |
|---|---|---|
| Homepage (hero, marquee, categories, editorial) | ✅ | Live catalogue counts + editorial sections |
| Browse / shop / gemstones / pairs / jewellery | ✅ | Live fresh-api data, filters, load-more pages of 60 |
| Variety and colour landings | ✅ | Registry-driven, soft-404 guarded |
| Gemstone PDP (`/product/:slugOrRef`) | ✅ | Media, treatments, certificates (verified only) |
| Ready-made / product PDP (`/products/:slug`) | ✅ | Composition trace |
| Settings (`/settings`, `/settings/:ref`) | ✅ | Metal/size selectors, design variants |
| Search (`/search?q=`) | ✅ | Server-rendered live results, honest no-match state |
| Concierge (`/concierge?q=`) | ✅ | Deterministic live parsing + optional model reply |
| `/ai-gemologist` | ✅ | 308 → `/concierge` |
| Cmd+K palette | ✅ | Live gemstones/pairs/settings |
| Favourites / compare | ✅ | Live data; account-synced tray available |
| Cart + checkout (3 steps) | ✅ | Server cart, tax, discounts, stock, test payment |
| Order confirmation | ✅ | Token/session-gated; private email link |
| Customer account (`/account/*`) | ✅ | Register/login, profile, orders, saved, addresses, password |
| Newsletter + viewing request | ✅ | Real leads (deduped, admin-visible) |
| Unsubscribe (`/unsubscribe`) | ✅ | Newsletter leads → LOST only |
| Editorial/CMS pages | 📦 | ComingSoon until Sanity credentials (ADR-036) |
| 3D/AR studio | 📦 | Seam present; GLB assets absent |

## 2. Catalogue data (fresh schema)

| Capability | Status | Notes |
|---|---|---|
| 22,742 stones · 10,350 settings · 1,430 products | ✅ | 19,665 singles + 3,072 pairs + 5 vendor; 1,024 priced |
| Semantic codes (G-/P-/S-/J-/DYO-/V-) | ✅ | `code_counters`, never repeated, soft delete |
| Reference vocabulary | ✅ | 11 families · 86 varieties · 55 colours · 43 origins · 24 shapes · 14 metals |
| Composition invariants (F-INV) | ✅ | DB CHECKs + trigger; 0 violations |
| Ready-made stock quantity | ✅ | `products.quantity`, vendor/admin edits, restock on cancel |
| Configured product availability | ✅ | Follows the stone: sold/reserved stones block add-to-cart and hide the product from listings; product status stays DRAFT/ACTIVE/ARCHIVED |

## 3. Customers & accounts

| Capability | Status | Notes |
|---|---|---|
| Register / login / logout | ✅ | scrypt + SHA-256 session tokens (30 d) |
| Email verification | ✅ | Hashed single-use token (24 h), resend, dev token echo |
| Password reset | ✅ | All actor kinds, 60 min, single use |
| Profile + change password | ✅ | |
| Order history | ✅ | Session owner or matching order email |
| Account-synced favourites | ✅ | Replace-tray API + UI |
| Address book | ✅ | CRUD + edit + default + checkout selector |
| Client account UI | ✅ | Luxury portal theme, tiles/nav, stats, dark mode, labelled forms |
| Per-customer discount limits | 🟡 | Global usage only; needs a business rule |

## 4. Commerce

| Capability | Status | Notes |
|---|---|---|
| Carts (guest tokens, stock-aware caps) | ✅ | |
| Checkout (tax engine, discounts) | ✅ | Domain `assessTax`; discount window/usage/min |
| Checkout UI + pre-placement quote | ✅ | 3-step portal flow, tax/shipping quote before placement, dark mode |
| Cart / favourites / compare UI | ✅ | Portal cards/tables, sticky summary, honest empty/loading |
| Real payment-method UI | ⏳ | Test instrument only; PSP selection owner-gated |
| Inventory reservations | ✅ | Locked, order-linked, 24 h, previous status |
| Test payment instrument | ✅ | No real money; provider seam owner-gated |
| Refunds | ✅ | Recorded PENDING against captured payment |
| Order lifecycle | ✅ | PAID → IN_FULFILLMENT → FULFILLED → DELIVERED |
| Shipments | ✅ | Carrier + tracking; delivered_at stamped |
| Cancellation + restock | ✅ | Pre-fulfilment; stones restored, stock returned |
| Order access tokens | ✅ | Public reads 404 without token/session |
| Discounts admin | ✅ | Create, edit value/window/status, pause |
| Vendor settlements/commissions | 🟡 | No payout ledger; business model decision |
| Product size/option variants | 🟡 | One SKU per ready-made piece; DYO handles sizes |
| Shipping rates / fulfilment labels | ⏳ | Carrier decision |

## 5. Vendor portal (`/vendor`) — invite-only

| Capability | Status | Notes |
|---|---|---|
| Invite-only onboarding | ✅ | Admin creates/approves; no public registration |
| Email + password login | ✅ | First-time setup with one-time API key |
| Password reset / change | ✅ | |
| API-key rotation | ✅ | One-time display |
| Submissions (stone/setting/product) | ✅ | Admin approve mints codes; HOLD/RELEASE |
| Live inventory | ✅ | Publish/hide/sell/restock/delete, stock editing |
| Photo upload | ✅ | Sanitised (EXIF stripped), limits enforced |
| Certificates | ✅ | Upload/list/remove; public only VERIFIED |
| House feedback | ✅ | Reviewer notes, Hold tab |
| Vendor portal UI + depth | ✅ | Petalo shell, dark mode, notifications, CSV, bulk actions, Sales analytics |
| Settlement & payouts UI | 🟡 | Honest “not configured” state; needs PSP/commission |

## 6. Admin console (`/admin`)

| Capability | Status | Notes |
|---|---|---|
| DB email+password sessions | ✅ | Env token dev-only |
| Overview stats + audit feed | ✅ | Revenue, orders, inventory, partners, activity |
| Inventory search/hide/archive/stock | ✅ | Pagination (load more) |
| Orders dossier | ✅ | Items, payments, events, shipments, refunds |
| Orders actions | ✅ | Transitions, shipment, refund, cancel |
| Submissions moderation | ✅ | Approve / Hold / Release / Reject |
| Vendors | ✅ | Create, approve/reject/suspend, one-time key |
| Discounts | ✅ | Create/edit/pause |
| Certificates | ✅ | Verify / Flag / Reset |
| Leads | ✅ | Status transitions |
| Email outbox | ✅ | Summary + dispatch + recent rows |
| Maintenance sweep | ✅ | Manual button + timer + CLI |
| Admin 2FA (TOTP) | ✅ | Setup/enable/disable + second login step; env fallback stays dev-only |
| Admin console UI + depth | ✅ | Petalo shell, dark mode, notifications, CSV, bulk actions, Help, per-vendor revenue |

## 7. AI / concierge

| Capability | Status | Notes |
|---|---|---|
| Deterministic concierge | ✅ | Variety/colour/origin/shape/budget/carat/pair parsing |
| Read-only tools (`search_catalogue`, `get_stone`) | ✅ | No write tool (ADR-003) |
| Model enrichment | ⏳ | OpenAI/OpenRouter key; honest fallback without it |
| Tool registry writes | ✅ | Structurally absent by design |
| Conversation persistence | 🟡 | Stateless by design; needs a privacy/product decision |

## 8. Media

| Capability | Status | Notes |
|---|---|---|
| Local media driver | ✅ | `MEDIA_DIR`, `/media` proxy, immutable cache |
| Metadata stripping | ✅ | JPEG APP1/APP13/COM, PNG text/eXIf, WebP EXIF/XMP |
| Format sniffing + structural validation | ✅ | Magic bytes, PNG CRC/chunk order, JPEG scan/EOI, WebP RIFF; MIME mismatch rejected (no pixel decoding by design) |
| Derivatives | ✅ | `next/image` optimisation for `/media`; external images stay `<img>` |
| Limits | ✅ | ≤10 images / ≤5 videos / ≤2 3D; ≤2 MB uploads |
| Object storage (R2/S3) | ⏳ | Local driver now; driver seam ready |

## 9. Security

| Capability | Status | Notes |
|---|---|---|
| Fresh-schema auth (scrypt, hashed sessions) | ✅ | Customer/vendor/admin |
| Invite-only vendor creation | ✅ | `POST /vendors` admin-only |
| Vendor detail authorization | ✅ | Own session or admin only |
| Vendor route cross-code guard | ✅ | 403 on mismatch |
| Rate limits (shared Postgres windows, method-aware) | ✅ | Auth, resets, leads, media, concierge, commerce |
| CSRF origin guard | ✅ | Cross-site `/api/*` writes → 403 |
| Security headers + CSP | ✅ | `next.config` contract + tests |
| Order access tokens | ✅ | No enumeration |
| Request body cap | ✅ | 8 MB (413) |
| Secrets scan | ✅ | CI gate |
| Distributed limiter (Redis) | 🟡 | Postgres limiter now; Redis optional |
| Least-privilege DB roles | ✅ | `docs/DB_ROLES.sql` template (app vs migrator; audit append-only) — apply at deploy |

## 10. Platform & operations

| Capability | Status | Notes |
|---|---|---|
| Fresh schema 0001–0020 (54 tables) | ✅ | Versioned + **SHA-256 checksums** |
| Reference seed | ✅ | 86 varieties checked in |
| Test suites | ✅ | fresh-api 47 · domain 244 · contracts 43 · web 213 |
| CI | ✅ | Bootstrap + fresh-api + storefront suites + builds/budgets |
| Structured logs + trace context | ✅ | JSON, request id, W3C traceparent |
| OTLP export | ⏳ | Endpoint/collector credentials |
| Prometheus metrics | ✅ | `/metrics` counters + uptime + RSS |
| Maintenance sweep | ✅ | Timer + admin + CLI |
| Backups + restore drill | ✅ | `pnpm run db:backup`, `scripts/backup-cron.sh`, `pnpm run db:restore-drill` (verified) |
| Production deploy | ⏳ | Neon + hosting + secret manager + domain |

---

## 11. Accepted decisions (owner)

| Date | Decision |
|---|---|
| 2026-10-28 | **Fresh clean database** — 3 pillars, zero provenance, no redirects (ADR-035) |
| 2026-10-28 | Semantic code grammar + never-reuse counters (doc 42) |
| 2026-10-29 | Source archive removed; cleaned catalogue is the record |
| 2026-10-30 | Admin/vendor portals use the Maison premium design system |
| 2026-10-31 | Reproducible bootstrap + reference seed checked in |
| 2026-11-01 | **Vendor onboarding is invite-only** (owner direction) |
| 2026-11-01 | AI is read-only over a fixed tool registry (ADR-003) |
| 2026-11-01 | Media: in-house metadata stripping + Next image optimisation (ADR-037) |
| 2026-11-01 | Checkout order access tokens; public reads are credential-gated |
| 2026-11-01 | Ready-made stock quantity; configured pieces remain one-of-one |
| 2026-11-01 | Maintenance sweep owns unpaid-order expiry and reservation release |
| 2026-11-01 | Migration files are checksummed; drift fails the runner |

## 12. Pending decisions (need an owner call)

1. **Vendor settlements/commissions** — consignment payout ledger, fee model, statements.
2. **Per-customer discount limits** — one-per-customer? tiered? requires a rule.
3. **Ready-made size variants** — SKU-per-size vs attributes.
4. **AI conversation persistence** — store turns? retention/privacy.
5. **Tax rules** — static configured rates vs jurisdictional service.
6. **Real-browser accessibility/contrast audit cadence** — the unit probe is structural only.
7. **Branded confirm dialogs/toasts** — a few operator actions still use `window.confirm`.

## 13. Owner-gated integrations

PSP + webhook signature/idempotency · Sanity CMS · shipping rates · live FX ·
email provider key (Resend) · LLM key · OTLP collector · object storage ·
production deploy (Neon/Vercel/secrets/domain/analytics).

## 14. Content pending

Vendor stone photos (DYO pool) · 3D/AR GLB models + calibration · verified certificate data · editorial CMS content (About/Journal/Education/Policies/Showrooms).

---

## 15. Completed work log (for resuming)

| Date | Completed |
|---|---|
| 2026-10-28 | Fresh clean DB design + cleaning (19,665 singles · 3,072 pairs · 10,350 settings · 1,430 products) · semantic codes · media limits · cut-over from the locked schema (backed up) |
| 2026-10-29 | Source archive removed; fresh-schema dump retained as insurance |
| 2026-10-30 | Premium Maison redesign of admin + vendor portals (`portal-premium.css`) |
| 2026-10-31 | Reproducible bootstrap + reference seed (`0001–0013`); vendor onboarding/password setup; live newsletter/contact/leads; live Cmd+K, favourites, compare; sitemap; live order confirmation |
| 2026-11-01 | Security: admin-only vendor creation, vendor-detail auth, DB admin sessions, method-aware rate limits, body cap, API-key rotation · customer accounts (register/verify/reset/profile/orders/saved/addresses) · commerce ops (refunds, transitions, shipments, discounts, HOLD, certificates) · order access tokens, cancellation/restock, delivered_at · media storage + sanitising + Next derivatives · deep 404s · shared Postgres rate limits · catalogue/hardening pagination · deterministic & model-assisted concierge + read-only tools · trace context + OTLP exporter · sitemap chunks · unsubscribe · CSRF origin guard · Prometheus metrics · ready-made stock + configured availability · maintenance sweep · migration checksums · backup + restore drill + role template · admin TOTP 2FA · this matrix |

### Next actions (in order)

1. Decide the first product item you want (settlements, per-customer discounts,
   size variants, AI persistence, tax rules, branded dialogs).
2. Provide owner-gated credentials as they become available:
   - Email provider (Resend) → then `POST /admin/outbox/dispatch` or `mail:drain`.
   - LLM key → concierge replies become model-assisted with the same read-only tools.
   - OTLP endpoint → spans export automatically.
   - PSP + webhook secret → implement the provider adapter and flip off the test instrument.
   - Sanity project → wire the editorial pages.
   - Shipping + FX decisions → replace the zero-rate/constant fallbacks.
   - Object storage → swap the media driver (sanitise before store).
3. At deploy: apply `docs/DB_ROLES.sql`, switch the app role, schedule
   `scripts/backup-cron.sh`, run `db:restore-drill`, then production deploy.
4. Content: vendor photos, 3D/AR models, verified certificates, editorial copy.

---

## Verification snapshot (2026-11-01)

- Bootstrap: **20 migrations · 54 tables · checksums 20/20**
- Tests: **fresh-api 51 · domain 244 · contracts 43 · web 213**
- Build, Next build, lint: **0 errors**
- UI: production build + Playwright desktop/mobile walks (admin, vendor, account, checkout, cart, favourites, compare, editorial); live quote API 17,599 + 879.95 VAT = 18,478.95
- Live route smoke: storefront, search, concierge, account, admin, vendor, sitemap, media — all 200
- 2FA: setup → enable → challenge → verify → disable (live); restore drill passed; sanitised upload verified (GPS metadata stripped)
