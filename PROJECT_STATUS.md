# MAIHAN GEMS — PROJECT STATUS (Single Source of Truth)

**This is the ONE file to read for the complete, current state of the project.**
History and per-item evidence live in `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` (§22–§24); the roadmap in `INITIAL_IMPLEMENTATION_PLAN.md` (Appendix A); decisions in `docs/adr/`.

**Last updated:** 2026-11-01 · branch `develop` · head `develop` — see `git log -1`

---

## 1. What this project IS now

A complete fine-gemstone e-commerce platform built on a **fresh, clean database designed by us, for us** (ADR-035). The old locked-schema architecture and its migration pipeline are **fully retired and deleted** — the `fresh` schema (44 tables, 47 FKs) is the project's only database.

```
┌─────────────────────────────────────────────────────────────────────┐
│  THE THREE PILLARS                                                  │
│                                                                     │
│  GEMSTONES (variety-first)     SETTINGS          JEWELLERY          │
│  22,737 stones · 86 varieties  10,349 settings   1,429 products     │
│  11 families · semantic codes  951 design codes  1,024 priced       │
│                                                                     │
│  CODES: G-COR-RUB-AE014-00317 · S-R-JS1003-PT-HQ · J-E-C-R14-HQ-001 │
│  (doc 42 — every code is a readable document)                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. What's RUNNING right now

| Service | Port | What it does |
|---|---|---|
| **Storefront** (`apps/web`) | :3000 | All pages on the fresh database — exact MaihanGems applet design |
| **Fresh API** (`apps/fresh-api`) | :3010 | Catalogue reads, vendor portal, auth, commerce, DYO, admin |
| **PostgreSQL** (`maihan_dev`) | :5433 | The `fresh` schema — 44 tables, all business data |

**Access URLs** (local dev, `MAIHAN_DEV_SEAM=1`):
- Storefront: `http://localhost:3000`
- Catalogue: `http://localhost:3000/gemstones` · `/browse` · `/shop` · `/varieties`
- Vendor portal: `http://localhost:3000/vendor` (email + password · first-time setup with the one-time API key)
- Admin console: `http://localhost:3000/admin` (login: admin password)
- API direct: `http://localhost:3010/api/v1/healthz`

## 3. What's COMPLETE

### 3.1 Database (fresh schema, `docs/fresh-schema/0001–0013`)
- 48 tables + `schema_migrations`, 47+ FKs, enums — the whole business model
- **Reproducible bootstrap**: `pnpm --filter @maihan/fresh-api run migrate` applies every DDL file in order, tracked in `fresh.schema_migrations`; `0013_reference_seed.sql` carries the owner-approved reference vocabulary (11 families, 86 varieties, 55 colours, 43 origins, shapes, metals, jewellery types). Verified on a scratch database (49 tables, counts exact).
- Semantic code architecture (doc 42) with `code_counters` (never-repeat guarantee)
- Composition law F-INV-01/02/03 (DB CHECKs + trigger — 0 violations live)
- Media rules (≤10 images / ≤5 videos / ≤2 3D per item — DB trigger enforced)
- `origin_type` (NATURAL / LAB_CREATED / SIMULANT) · multi-treatment join
- Settings carat-range (min_ct/max_ct) · `code_counters` atomic minting
- **Backed up**: `backups/maihan_dev_fresh_schema_2026-10-28.dump` (SHA-256 `72deede4…`)

### 3.2 Catalogue data (cleaned from source, tools/fresh-clean)
- 22,737 gemstones (19,665 singles + 3,072 pairs — SoT counts exact)
- 10,349 settings / 951 design codes · 1,429 products (1,024 CONFIGURED priced + 405 READY_MADE DRAFT)
- 10,240 media assets (TNSC photography, ≤10 per product) · 1,024 priced (USD)
- Reference vocab: 86 varieties (76 cleaned + 10 owner-added: ruby, sapphire, emerald, diamond…) · 11 families · 55 colours · 45 origins · 27 shapes · 14 metals · 6 jewellery types · 15 styles
- Two measured corrections recorded: ready-made = 405 (not 88); pair per-piece = 5 refs/10 rows (not 113/226)

### 3.3 Fresh API (`apps/fresh-api`)
| Area | Endpoints | Auth |
|---|---|---|
| Health | `GET /healthz` | — |
| **Catalogue reads** | gemstones (filters: variety/family/colour/origin/shape/kind/price/q), settings (filters + design-group), products (filters), varieties (with counts), families, metals, shapes, colours, origins, assets | public |
| **Detail** | gemstone by slug-or-ref (media, per-pair stones, treatments) · product detail (composition trace) · setting by ref (design variants) · configuration by code | public |
| **Customer auth** | register / login / logout / me | scrypt + session tokens (SHA-256 at rest, 30-day) |
| **Vendor portal** | email+password login, **first-time password setup (one-time API key → session)**, submissions (gemstone/setting/product forms), my submissions, inventory status, image upload | admin password · vendor session or API key |
| **Admin** | submissions moderation (approve mints semantic codes + audit rows), vendors (create/approve/reject/suspend), orders, stats, inventory, leads | admin password (HMAC session, httpOnly cookie via proxy) |
| **DYO configurations** | POST (create+quote: F-INV + carat-range validated, dupe-hash deduped), GET dossier, cart accepts `configuration_code` | public |
| **Commerce** | carts (guest tokens, lines with price snapshots), checkout (domain tax engine, discounts, **inventory reservations**), orders (number, items, events), test payment instrument | public (checkout) / admin (orders) |
| **Leads** | `POST /leads` (newsletter / viewing_request / contact; deduped per email+source, optional note) | public (rate-limited) |

### 3.4 Storefront (all pages on fresh data, exact applet design)
- Home (hero video + rails) · browse/shop (CollectionExplorer, 60 real stones) · variety + colour landings
- Gemstones hub · PDPs (gemstone by slug/ref, product composition, settings with metal/size selectors)
- DYO configurator (4 steps → Acquire Commission → checkout) · review dossier (fresh configuration)
- Search (fresh-api `q` param) · **Cmd+K palette live** (gemstones/pairs/settings) · **compare live** (gemstones + settings tables) · **favourites live** (saved refs fetched from the catalogue)
- Editorial pages (ComingSoon → Sanity per ADR-036) · contact (SALON CONCIERGE)
- **Forms are real**: journal newsletter + footer + viewing request POST to the leads API (deduped, validated, admin-visible)
- **Order confirmation** (`/checkout/confirmation/<order>`) reads the live fresh-api ledger
- **Sitemap** (`/sitemap.xml`) — static routes + varieties + stones + settings + products (~31.5k URLs)
- Admin console + vendor portal (login + working consoles) — **premium light theme with sidebar (portal-premium.css)**
- **Link cascade fixed** (mgh-applet preflight + gold focus-visible ring)
- Soft-404 at the edge (proxy middleware + variety registry)

### 3.6 Accounts, operations & trust (2026-11-01)
- **Customer accounts**: register / login / logout, profile, order history (guest orders matched by verified email), saved pieces synced to the account, change password, reset-token flow. `/account` is a live applet page (was a closed placeholder).
- **Credential lifecycle**: single-use reset tokens for customer, vendor and admin (SHA-256 at rest, 60 min, dev token returned only outside production); change-password for customer/vendor; DB admin sessions now accepted by every admin route.
- **Order lifecycle**: PAID → IN_FULFILLMENT → FULFILLED → DELIVERED transitions, shipment records (carrier + tracking), refunds recorded as PENDING against the captured payment (no PSP claimed), all with order events + audit rows and an admin dossier UI.
- **Discounts**: admin create/pause + checkout validation against window, usage limit and minimum subtotal.
- **Submissions moderation**: Approve / Hold / Release / Reject (HOLD added in `0014`), with a dedicated admin tab; vendor portal shows the Hold tab and house feedback.
- **Certificates**: vendor upload/list/remove (`UNVERIFIED`); public catalogue exposes only `VERIFIED` reports.
- **Email seam**: transactional messages (order placed, password reset) are queued in `fresh.email_outbox` and logged in dev — no delivery is claimed; a provider adapter drains the box.
- **Operations**: structured JSON request logs with `x-request-id`, CORS allow-list (`ALLOWED_ORIGINS`), dev-only env admin token gate, trigram-ranked search (typo tolerant), audit-log feed in the admin overview.
- **Vendor onboarding is invite-only** (owner decision 2026-11-01): partners are created and approved by the house; there is no public self-registration. **Security**: vendor creation is admin-only; vendor detail requires the vendor session or admin; admin console uses DB email+password sessions; method-aware rate limits cover vendor login/setup, resets, API-key rotation, leads and media writes; 8 MB request-body cap; vendor API-key rotation with one-time display.
- **Order privacy**: public order reads require the one-time checkout access token or the owning customer session (no enumeration); confirmation page is edge-guarded (anonymous → true 404). Emails carry the private confirmation link.
- **Media storage**: uploads are written to disk (`MEDIA_DIR`, default `var/media`) and served at `/media/<file>` through the web proxy — no base64 in Postgres; deletion removes the file. External HTTPS URLs stay as-is.
- **Deep 404s**: the edge validates dynamic slugs against `/catalogue/exists` (10-min cache) for products, settings, varieties, DYO dossiers and variety-scoped routes — unknown slugs return true 404s.
- **Shared rate limits**: windows are atomic Postgres upserts (`0018`), safe across instances; in-memory fallback if the database is unavailable.
- **Catalogue load-more**: browse/varieties append pages of 60 live stones on demand.
- **Vendor route auth fix**: every vendor inventory/media/submission route now enforces the session's own vendor code (cross-vendor mismatch → 403); image deletion requires authentication.
- **Order cancellation**: pre-fulfilment cancel restores each stone to its *pre-reservation* status (`0016`), releases reservations, and records a pending refund for the captured amount. Marking DELIVERED stamps the fulfilment record.
- **Certificate verification**: admin Certificates tab lists submissions and moves them VERIFIED / FLAGGED / UNVERIFIED; only VERIFIED reports render publicly.
- **Email verification**: registration queues a hashed single-use verification link (24 h); the account app shows a verify/resend banner and completes `?verify=<token>`. Dev returns the token locally.
- **Address book**: customer address CRUD (list/add/default/delete), used by the checkout "saved address" selector.
- **Email lifecycle + drain**: paid / shipped / cancelled / verification emails queue in `email_outbox`; `POST /admin/outbox/dispatch` and `pnpm --filter @maihan/fresh-api run mail:drain` deliver via Resend when configured, with attempts/backoff state. Without a provider rows stay QUEUED — no delivery claimed.
- **Sitemap index + chunks**: `/sitemap.xml` lists 5,000-URL chunks (`/sitemap/<n>.xml`), generated live from the catalogue (31,551 URLs across 9 chunks).
- **Discount editing**: full admin edit of value, minimum, window and status (validated; duplicate-code protection).
- **Unsubscribe**: `/unsubscribe` + `POST /leads/unsubscribe` marks newsletter leads LOST without touching service/viewing leads.
- **CSRF origin guard**: cross-site writes to `/api/*` are rejected at the edge (Origin / Sec-Fetch-Site), verified 403 vs 200.
- **Engineering cleanup**: removed the unused fixture-era operator/account shells and the dead `api-origin` seam; CI now boots fresh-api and runs the full storefront unit suite (including the homepage probe, scoped to layout-independent axe rules for speed).
- **Metrics**: Prometheus text endpoint at `:3010/metrics` — request counters (bounded path buckets), uptime and RSS, no PII.
- **Trace context + OTLP**: W3C `traceparent` parsed/issued/echoed and logged; the web proxy propagates it. With `OTEL_EXPORTER_OTLP_ENDPOINT` set, request spans batch-export to OTLP/HTTP (10 s flush, global headers).
- **Search**: `/search` is a live server-rendered ledger over the catalogue (no fixture chat); `/ai-gemologist` permanently redirects to `/concierge` preserving `q`.
- **Live concierge**: `/concierge` and the hero AI search read the real catalogue — deterministic parsing of variety/colour/origin/shape/budget/carat/pair intent with an honest refusal. When an OpenAI-compatible key is configured, a **read-only** tool registry (`search_catalogue`, `get_stone`; no writes, ADR-003) enriches the reply; without a key it stays deterministic and says so.

### 3.5 Old database — fully retired
- `packages/db`, `apps/worker`, `tools/migrate`, `apps/api`, old web API surface, all old lib seams: **deleted**
- Old locked schema: dropped from `maihan_dev` (backed up first)
- `naturalgemstones/` archive: **deleted** (3 GB freed; fresh dump is the catalogue's insurance)
- CI re-pointed (removed db/worker/migrate steps; kept domain/contracts/ai/observability/web)

## 4. What's REMAINING

### 4.1 In progress (owner-visible gaps)
| Item | What | Blocker |
|---|---|---|
| **Vendor photo upload** | Endpoint + vendor portal widget shipped; DYO pool now depends on vendors actually uploading | Content, not code |
| **Vendor portal production** | Complete: light theme sidebar, inventory management, admin feedback, variety dropdowns — committed `c9dec46` | DONE |
| **Admin console production** | Complete: light sidebar with 5 tabs (Overview/Inventory/Orders/Vendors/Leads) + full stats — committed `68d41dd` | DONE |
| **Leads/newsletter** | Leads table + public signup + admin management — committed `68d41dd` | DONE |
| **Sanity CMS** (ADR-036) | about/education/blog/policy/showrooms → real content | Needs Sanity project credentials (owner) |
| **DYO configurator pool** | Empty until vendor stones have photos | Vendor content |
| **Soft-404 remaining** | Non-variety single-segment unknowns still 200 (e.g. deep 404s in nested routes) | Edge guard covers top-level only; deep unknowns are a lower-priority SEO polish |

### 4.2 Commerce completion (code-ready, needs owner decisions)
| Item | What | Owner decision needed |
|---|---|---|
| **Real payment provider** | Stripe adapter (old pattern exists); currently dev test instrument only | Choose PSP + provide API keys |
| **Shipping rates** | Currently 0 (pending-fulfilment); needs rate table | Choose carriers + rate logic |
| **Live FX rates** | Display constants now (USD/AED/THB); needs an FX API source | Choose FX provider + API key |
| **Order fulfilment** | Fulfilments table exists; no ship/track flow yet | Business process decision |

### 4.3 Production deploy (all local dev currently)
| Item | What |
|---|---|
| **Neon production database** | Local `maihan_dev` → Neon project + secrets |
| **Vercel deployment** | apps/web + apps/fresh-api → Vercel (or alternative) |
| **Secrets** | FRESH_ADMIN_PASSWORD, vendor keys, Sanity token, Stripe keys → platform secret manager |
| **CI re-point** | DONE — CI now bootstraps `docs/fresh-schema/0001–0014` on the disposable DB and runs fresh-api unit + DB integration tests |
| **Domain + analytics** | maihangems.com DNS + analytics |
| **Rate limiting** | In-memory per-IP on fresh-api; production needs distributed limits |

### 4.4 Nice-to-have (post-launch polish)
| Item | What |
|---|---|
| Search quality | DONE — trigram-ranked gemstone/setting search (typo tolerant) |
| WebAR/3D content | `MODEL_3D` assets table ready; GLB models needed |
| Certificate intelligence | 0008 schema ready (diamond 4C grading); UI + OCR flow needed |
| i18n | Decorative EN/FR/AR switcher ported; full i18n needs a translation strategy |

## 5. Design decisions (owner-locked, one-line each)

| Decision | Authority |
|---|---|
| Fresh clean database: 3 pillars, zero provenance, no redirects | ADR-035 |
| Semantic codes: `G-{FAM}-{VAR}-{CCVV}-{seq}` grammar; metal in code, carat in DB | doc 42 |
| Vendor portal: vendor_ref is vendor-only; platform mints all codes | doc 42 §8 R-2 |
| Only SOLD DYO designs promotable to public listings | doc 42 §8 R-1 |
| Variety governance: vendor requests → admin approves + assigns family/code | doc 42 §8 R-3 |
| Ring sizes: standard US 4–9.5 as presentation constant | doc 44 |
| Sanity CMS for editorial content | ADR-036 |
| naturalgemstones archive deleted (fresh dump is the catalogue insurance) | AGENTS §5 amendment |
| Payments: dev test instrument only (real PSPs owner-gated) | commerce.ts honesty note |
| C-9 amendment: attribute-identical stones remain separate items (1-of-1 law) | doc 41 §6 |

## 6. How to develop

```bash
# Start everything
docker compose up -d db
pnpm install

# Apply the fresh schema (if not loaded)
docker exec -i maihan-dev-db psql -U postgres -d maihan_dev < docs/fresh-schema/0001_reference.sql
# ... (0002–0010 in order)
# OR restore from backup:
# docker exec -i maihan-dev-db pg_restore -U postgres -d maihan_dev < backups/maihan_dev_fresh_schema_*.dump

# Load the cleaned catalogue (requires naturalgemstones/ — restore out of band)
pnpm --filter @maihan/fresh-clean run clean

# Start the API + storefront
DATABASE_URL="postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev" \
FRESH_ADMIN_TOKEN=dev-admin-token FRESH_ADMIN_PASSWORD=maihan-admin-dev \
pnpm --filter @maihan/fresh-api run start &

MAIHAN_DEV_SEAM=1 SITE_URL=http://localhost:3000 \
pnpm --filter @maihan/web run start &

# Verify
open http://localhost:3000
```

## 7. Key files

| File | Authority |
|---|---|
| `technical_design/41` | Fresh clean database design |
| `technical_design/42` | Semantic code architecture (master sheet) |
| `technical_design/43` | Platform schema increments |
| `technical_design/44` | Storefront UI plan |
| `docs/fresh-schema/0001–0010` | Schema DDL (source of truth) |
| `docs/adr/ADR-035` | Fresh clean database decision |
| `docs/adr/ADR-036` | Sanity CMS decision |
| `tools/fresh-clean/` | Cleaning script (gate: `check`) |
| `apps/fresh-api/` | API service (catalogue, auth, vendor, commerce) |
| `apps/web/` | Storefront + portals |
| `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` | Full audit trail (§22 phases, §24 change log) |
| `.opencode/memory/` | Persistent context (session handoff, decisions, lessons) |
