# MAIHAN GEMS — PROJECT STATUS (Single Source of Truth)

**This is the ONE file to read for the complete, current state of the project.**
History and per-item evidence live in `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` (§22–§24); the roadmap in `INITIAL_IMPLEMENTATION_PLAN.md` (Appendix A); decisions in `docs/adr/`.

**Last updated:** 2026-10-29 · branch `develop` · head `c9dec46`

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
- Vendor portal: `http://localhost:3000/vendor` (login: vendor code + API key)
- Admin console: `http://localhost:3000/admin` (login: admin password)
- API direct: `http://localhost:3010/api/v1/healthz`

## 3. What's COMPLETE

### 3.1 Database (fresh schema, `docs/fresh-schema/0001–0010`)
- 44 tables, 47 FKs, 5 enums — the whole business model
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
| **Vendor portal** | register (mints `V-{CC}-{NNN}`), onboarding approve/reject/suspend, submissions (gemstone/setting/product forms), my submissions | admin password · vendor API key (httpOnly cookies via proxy) |
| **Admin** | submissions moderation (approve mints semantic codes + audit rows), orders list | admin password (HMAC session, httpOnly cookie via proxy) |
| **DYO configurations** | POST (create+quote: F-INV + carat-range validated, dupe-hash deduped), GET dossier, cart accepts `configuration_code` | public |
| **Commerce** | carts (guest tokens, lines with price snapshots), checkout (domain tax engine, discounts, **inventory reservations**), orders (number, items, events), test payment instrument | public (checkout) / admin (orders) |

### 3.4 Storefront (all pages on fresh data, exact applet design)
- Home (hero video + rails) · browse/shop (CollectionExplorer, 60 real stones) · variety + colour landings
- Gemstones hub · PDPs (gemstone by slug/ref, product composition, settings with metal/size selectors)
- DYO configurator (4 steps → Acquire Commission → checkout) · review dossier (fresh configuration)
- Search (fresh-api `q` param) · Cmd+K palette · compare · favourites (localStorage)
- Editorial pages (ComingSoon → Sanity per ADR-036) · contact (SALON CONCIERGE)
- Admin console + vendor portal (login + working consoles)
- **Link cascade fixed** (mgh-applet preflight + gold focus-visible ring)
- Soft-404 at the edge (proxy middleware + variety registry)

### 3.5 Old database — fully retired
- `packages/db`, `apps/worker`, `tools/migrate`, `apps/api`, old web API surface, all old lib seams: **deleted**
- Old locked schema: dropped from `maihan_dev` (backed up first)
- `naturalgemstones/` archive: **deleted** (3 GB freed; fresh dump is the catalogue's insurance)
- CI re-pointed (removed db/worker/migrate steps; kept domain/contracts/ai/observability/web)

## 4. What's REMAINING

### 4.1 In progress (owner-visible gaps)
| Item | What | Blocker |
|---|---|---|
| **Vendor photo upload** | DYO pool + product cards need real photos — vendors must submit images | Next increment: image upload endpoint + vendor portal UI |
| **Vendor portal production** | Complete: light theme sidebar, inventory management, admin feedback, variety dropdowns — committed `c9dec46` | DONE |
| **Sanity CMS** (ADR-036) | about/education/blog/policy/showrooms → real content | Needs Sanity project credentials (owner) |
| **DYO configurator pool** | Empty until vendor stones have photos | Same as photo upload |
| **Soft-404 remaining** | Non-variety single-segment unknowns still 200 (e.g. deep 404s in nested routes) | Edge guard covers top-level only; deep unknowns are a lower-priority SEO polish |

### 4.2 Commerce completion (code-ready, needs owner decisions)
| Item | What | Owner decision needed |
|---|---|---|
| **Real payment provider** | Stripe adapter (old pattern exists); currently dev test instrument only | Choose PSP + provide API keys |
| **Shipping rates** | Currently 0 (pending-fulfilment); needs rate table | Choose carriers + rate logic |
| **Live FX rates** | Display constants now (USD/AED/THB); needs an FX API source | Choose FX provider + API key |
| **DYO checkout 3-step rewiring** | Currently single-page checkout; the applet's 3-step flow needs the cart→order seam | Design preference |
| **Order fulfilment** | Fulfilments table exists; no ship/track flow yet | Business process decision |

### 4.3 Production deploy (all local dev currently)
| Item | What |
|---|---|
| **Neon production database** | Local `maihan_dev` → Neon project + secrets |
| **Vercel deployment** | apps/web + apps/fresh-api → Vercel (or alternative) |
| **Secrets** | FRESH_ADMIN_PASSWORD, vendor keys, Sanity token, Stripe keys → platform secret manager |
| **CI re-point** | Current CI runs domain/contracts/ai/observability/web build — needs fresh-era test additions (fresh-api tests) |
| **Domain + analytics** | maihangems.com DNS + analytics |
| **Rate limiting** | None on fresh-api (localhost dev); production needs per-scope limits |

### 4.4 Nice-to-have (post-launch polish)
| Item | What |
|---|---|
| Search quality | trigram/full-text index for fuzzy gemstone search |
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
