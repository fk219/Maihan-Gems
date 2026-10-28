# 41 FRESH CLEAN DATABASE DESIGN

**Status:** Accepted design (2026-10-28, by explicit owner authorization — ADR-035).
**Scope:** Design + draft DDL only. Nothing here replaces the live locked schema until the owner separately approves the cut-over ("design first, decide later").
**Supersedes:** the migration-centric parts of `technical_design/33` (staging pipeline, provenance model) and the redirect scope of `technical_design/34`, **for future schema work only**. The locked schema remains the live database until a cut-over decision is made.
**Authoritative learnings still honoured:** `PROJECT_SOURCE_OF_TRUTH.md` evidence facts (counts, category structures, invariants) — as *input to the design*, not as rows in the database.

---

## 1. Why this document exists

The owner decided on 2026-10-28 that the database must be **designed for the business, not for a migration pipeline**:

| Decision | Value |
|---|---|
| Category model | Three pillars: **Gemstones** (ruby, emerald, sapphire, …) · **Settings** (ring / earring / necklace settings, …) · **Jewellery** (earring, necklace, nose ring, …) |
| Data | Keep the existing source entries, **cleaned** into the three pillars |
| Provenance | **Zero** — no `evidence_status`, no staging tables, no `import_batches`, no `raw_spec` |
| SEO | Fresh start — **no redirects table**; old URL parity descoped |
| Existing code | Untouched; this design sits alongside for comparison |

The locked schema (74 tables, `packages/db/migrations/0001…0022`) taught us *what the business is*. It bundled that with machinery whose only purpose was importing and proving provenance of reverse-engineered data. This document keeps the business model and drops the machinery.

## 2. What was dropped, and why it is safe

| Dropped | Why it existed | Why dropping is safe |
|---|---|---|
| `import_batches`, `staging_source_pages`, `staging_parsed_urls`, `staging_conflicts` (migration 0003) | Verbatim staging + idempotency tracking for a 44,218-row corpus import | No corpus import runs against the fresh schema. Cleaning is a one-off deterministic script whose acceptance is checked against the counts in §6 before it writes anything. |
| `evidence_status` / `source_url` / `raw_spec` / `sku_evidence_status` columns (ADR-024 model) | Answer "where did this value come from?" for every migrated field | Owner decision: the DB holds only business truth. Honesty rules survive as **cleaning acceptance rules** (§6): a value we cannot clean is NULL, never invented. |
| `price_model_observations`, verbatim `*_labels` tables | Recording source price observations and exact source strings | Prices land directly on entities; `price_history` (§4) keeps an append-only change log. |
| `redirects` + doc-34 URL parity | Preserve old-site Google rankings | Owner chose a fresh SEO start. |
| INV-07/INV-08 (evidence-verified rendering law) | Prevent unverified migration data reaching customers | Replaced by a simpler rule: **a fresh row is either clean and publishable, or it does not exist.** There is no third "unverified but visible" state to police. |
| The 221 derived-identity rows (INV-08 subject) | Preserving inferred DYO identities | Dropped entirely. Zero provenance means zero inferred rows: only observed, cleaned data enters the fresh DB. |

**Unchanged and still binding:** nothing in this document authorises touching `naturalgemstones/` (AGENTS.md §5 protections remain), fabricating data (§6 #1), or committing secrets.

## 3. Three-pillar model

```text
GEMSTONES                 SETTINGS                    JEWELLERY
(variety-first catalogue) (what you mount stones in)  (what the customer buys)
─────────────────────     ─────────────────────────   ─────────────────────────
gemstone_varieties        jewellery_types ──────┐     products
gemstone_colours          setting_styles ──────┤        kind: READY_MADE   (finished item)
gemstone_origins          metals               │        kind: CONFIGURED   (setting + stone)
shapes                    settings ────────────┘     configurations
clarities                 setting_compatible_shapes     (Design-Your-Own, pre-purchase)
treatments                (which shapes fit)
gemstones ── gemstone_stones (per-piece rows for pairs)
assets (images/video for all three pillars)
price_history (append-only price log)
```

Composition law (carried from INV-01/02/03, re-derived as business rules):

- **F-INV-01** A `CONFIGURED` product has exactly one setting and exactly one gemstone. A `READY_MADE` product has neither.
- **F-INV-02** A gemstone of kind `PAIR` may be configured only into an `EARRING`.
- **F-INV-03** A gemstone of kind `SINGLE` may be configured into any jewellery type except `EARRING` (rings, pendants, necklaces, bracelets, nose rings, …).

Enforcement: single-table cases by CHECK constraints; the cross-table composition law by **one trigger** (`products_composition_trg`) plus the existing `packages/domain` predicates, which stay valid.

## 4. Fresh schema v1 — catalogue core

17 tables, 5 enums, 2 functions, 5 triggers. Draft DDL: `docs/fresh-schema/0001_reference.sql`, `0002_catalogue.sql`.

### 4.1 Reference vocabulary (9 tables)

| Table | Columns (beyond id/created_at) | Notes |
|---|---|---|
| `gemstone_varieties` | name, slug (both unique), species, sort | ruby, emerald, sapphire, … seeded from cleaned source |
| `gemstone_colours` | name, slug, hex_preview | filter vocabulary |
| `gemstone_origins` | name, slug | Ceylon, Kashmir, … |
| `shapes` | name, slug | round, oval, emerald cut, … |
| `clarities` | code (unique), name | VVS, VS, SI, … |
| `treatments` | code (unique), name | none, heated, … |
| `metals` | code (unique), name, purity, sort | 14 cleaned codes; owner may trim |
| `setting_styles` | name, slug | solitaire, halo, … |
| `jewellery_types` | code (unique), name, sort | **seeded from the owner's list:** ring, earring, pendant, necklace, bracelet, nose ring, … — source families map onto these; owner-only types (e.g. nose ring) start with zero rows |

### 4.2 Gemstones

`gemstones` — one row per sellable stone or matched pair.

- Keys: `id bigserial`, `ref` (`G-#####` single / `P-#####` pair, unique), `slug` (unique, URL-facing)
- Identity: `name`, `variety_id` FK NOT NULL
- Attributes: `colour_id`, `origin_id`, `shape_id`, `clarity_id`, `treatment_id` (all nullable FKs — unknown stays NULL, never invented)
- Body: `kind` (`SINGLE`|`PAIR`), `pieces` 1|2 (CHECK-consistent with kind), `weight_ct` (per piece), `length_mm`/`width_mm`/`depth_mm`, `description`
- Money: `price_amount numeric(12,2)`, `currency char(3)` default `USD`
- Stock: `quantity smallint` default 1, `status` (`DRAFT`/`ACTIVE`/`RESERVED`/`SOLD`/`ARCHIVED`)
- CHECKs: kind⇔pieces; price ≥ 0; status ∈ full enum

`gemstone_stones` — per-piece rows, **required for pairs** (carries the V8 learning: pair per-stone weights must sum): `(gemstone_id, position 1|2, weight_ct NOT NULL, l/w/d mm)`, unique per position. Cleaning rule C-6 asserts the sum.

### 4.3 Settings

`settings` — one row = one **sellable setting in one metal** (the old design×metal variant, flattened; no separate design table).

- Keys: `id`, `ref` (`S-#####`), `slug`, `sku` (unique, own grammar `S-{design_code}-{metal_code}-{seq}`)
- Identity: `name`, `design_code` (groups the same design across metals), `jewellery_type_id` FK NOT NULL, `style_id` FK, `metal_id` FK NOT NULL
- Money/stock: `price_amount`, `currency`, `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `description`
- UNIQUE `(design_code, metal_id)` — one variant per design per metal

`setting_compatible_shapes` — `(setting_id, shape_id)` PK. Drives the configurator; replaces the old 1,024-pair compatibility rule family with the simpler shape-fits-setting model.

### 4.4 Jewellery (products) + configurations

`products` — what the customer buys.

- Keys: `id`, `ref` (`J-#####`), `slug`, `name`
- `jewellery_type_id` FK NOT NULL; `kind` `READY_MADE` | `CONFIGURED`
- Composition: `setting_id` FK, `gemstone_id` FK (nullable; CHECK law per §3)
- Money: `price_amount` (ready-made) / computed at quote time (configured) + `making_fee_amount`
- `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `description`

`configurations` — Design-Your-Own sessions before they become products.

- `code` (`DYO-####`, unique), `composition_hash` (unique, canonical representation — reuses `packages/domain` hash), `jewellery_type_id`, `setting_id` NOT NULL, `gemstone_id`
- `status` `OPEN`→`QUOTED`→`CONVERTED` | `EXPIRED` | `CANCELLED`; `quoted_amount` required once QUOTED

### 4.5 Assets + pricing

`assets` — `(owner_kind ∈ {gemstone, setting, product, configuration}, owner_id, role ∈ {PRIMARY, GALLERY, VIDEO, CERTIFICATE}, kind ∈ {IMAGE, VIDEO, GIF, MODEL_3D, CERTIFICATE}, url, position, alt)` + index on owner.

**Media rules (owner-approved 2026-10-28, DDL `0005_media_3d_vto.sql`):**
- **Limits per item (DB trigger, live-verified):** ≤ 10 images · ≤ 5 videos/GIFs · ≤ 2 3D models. DYO session renders are exempt (runtime scratch).
- **3D / virtual try-on:** a `MODEL_3D` asset carries `vto_ready boolean` + `calibration jsonb` (honest NULL until measured). CHECK: `vto_ready` only on `MODEL_3D`.
- Exactly **one PRIMARY image per item** (partial unique index).
- **Orphan rule:** `owner_id` is a polymorphic soft reference (no FK) — deleting an owner must delete its assets in the same application transaction; the cleaning gate asserts 0 orphans.

`price_history` — append-only: `(entity_kind ∈ {gemstone, setting, product}, entity_id, amount, currency, reason, changed_at)`. Live price lives on the entity; this table never blocks reads and is the audit trail for price changes (replaces price_lists/entries/observations with one honest table).

### 4.6 Deliberately deferred (later increments, same philosophy)

Auth/accounts, carts/orders/payments, admin/RBAC, CMS/SEO, AI/knowledge, ops/events, certificates/OCR, WebAR, vendor portal. Each gets a numbered increment against §3's pillars when its phase is approved. They are **out of v1 on purpose**: the owner asked for a clean catalogue database first.

## 5. Locked-schema census — what became of each area

Census of the locked chain (`0001…0022`, 82 declared tables + normalized additions), classified for the fresh design:

| Locked area (migration file) | Tables | Verdict in fresh design |
|---|---|---|
| 0003 migration staging | import_batches, staging_source_pages, staging_parsed_urls, staging_conflicts | **DROP** (§2) |
| 0004 taxonomy/reference | species, varieties, colours, colour_intensities, origins, treatments, treatment_labels, clarities, clarity_labels, metals, setting_styles, jewellery_types | **KEEP simplified** — 9 tables; species→column, `*_labels`/intensities dropped |
| 0005 catalogue core | gemstones, gemstone_stones, settings, setting_variants, setting_compatibility_rules, products, product_gemstones | **KEEP simplified** — variants flattened into settings; product_gemstones→direct FK; compatibility→shapes |
| 0007 DYO | dyo_configurations, dyo_price_snapshots, dyo_quotes | **KEEP simplified** — one `configurations` table (quote amount in-row) |
| 0008 pricing | price_lists, price_entries, price_model_observations | **KEEP simplified** — price on entity + `price_history` |
| 0009 commerce | customers … order_events (13) | **DEFER** (increment 2) |
| 0010 trust | certificates + ocr/extraction/anomaly/review/verification | **DEFER** (increment 3) |
| 0011 assets | assets, asset_variants, asset_usages, webar_assets, ar_handoff_tokens | **KEEP simplified** — one `assets` table; AR/WebAR defer |
| 0012 CMS | pages, page_revisions, navigations, redirects, seo_metadata | **DEFER**; `redirects` **DROP** |
| 0013 AI | conversations, messages, tool_calls, knowledge_*, product_embeddings, ai_interactions, ai_evaluations, guardrail_events | **DEFER** (increment 4) |
| 0014 operations | domain_events, event_consumers, jobs, audit_logs, webhook_receipts, rate_limit_counters, feature_flags | **DEFER**; audit logging returns with the first privileged surface |
| 0018–0022 expansions | page_review_state, auth_*, favorites, checkout_sessions, inventory_reservations, notifications, vendor_onboarding, integrity indexes | **DEFER** with their home areas |

Net: the ~60-table commerce/AI/ops estate is deferred, not deleted as an idea; the fresh core is **17 tables** the owner can read on one page.

## 6. Cleaning rules — adopting the existing entries

Cleaning reads `naturalgemstones/` read-only (protections intact) and writes the fresh schema. It is deterministic, re-runnable, and **acceptance-checked before commit**. No staging tables: the acceptance checks run in the script against its own in-memory results.

| # | Rule |
|---|---|
| C-1 | **Varieties**: distinct source base slugs → `gemstone_varieties` verbatim (they are already clean names). |
| C-2 | **Stones**: loose `K#####` + pair `PR#####` refs → new `G-`/`P-` refs, sequential. Attributes from slug + specifications; **unknown → NULL**. |
| C-3 | **Pairs**: `kind='PAIR'`, `pieces=2`, two `gemstone_stones` rows. Acceptance: per-stone weights sum to the pair's stated total (all 113/113 source-checked pairs). |
| C-4 | **Settings**: 951 design cores × metals → `settings` rows (target 10,349). `design_code` groups metals; `sku` minted by the new grammar; jewellery type from the source family mapped onto the owner's `jewellery_types` list. |
| C-5 | **Products**: 88 ready-made → `READY_MADE`. The 1,024 DYO URLs with an **observed** SKU → `CONFIGURED` products. The 8,788 unobserved DYO URL permutations and the 221 failed-fetch identities → **dropped** (zero provenance ⇒ zero inferred rows). |
| C-6 | **Prices**: the 1,024 observed prices land on their entities; every priced change also appends `price_history`. |
| C-7 | **Media**: keep only assets owned by a kept entity; dedupe by storage path; primary image gets role `PRIMARY`. |
| C-8 | **Jewellery types**: owner's list seeds `jewellery_types`; source families map in; owner-only types (nose ring, …) exist with zero rows. |
| C-9 | **Dedupe = distinct source refs only.** Gem inventory is 1-of-1 physical stock: two stones with identical listed attributes (variety, weight, dims, colour, origin) are legitimately **separate items** and are kept as separate rows. *(Amended 2026-10-28 — the original "collapse identical-attribute duplicates" rule conflicted with physical-inventory semantics and would have destroyed real stock; health audit §22.7e finding #1.)* |
| C-10 | **No invention**: a field we cannot clean is NULL. If acceptance counts (below) fail, the script halts — it never writes "close enough" data. |

**Acceptance targets** (cleaning gate, replacing gates V1–V22) — **measured & passed 2026-10-28**:

| Target | Value | Measured |
|---|---|---|
| Gemstones (singles + pairs) | 19,665 + 3,072 catalogue refs (**22,737 rows**) | ✅ 22,737 (all DYO gem refs resolve inside the catalogue) |
| Settings rows | 10,349 (951 design codes) | ✅ 10,349 / 951 |
| Products | **405** ready-made + 1,024 configured | ✅ 405 + 1,024. Note: the SoT's "88" counted only the `/{variety}-rings/` family; the full observed ready-made set is 405 (88 rings + 94 earrings + 64 bracelets + 159 necklace/pendant routes) |
| Priced entities | 1,024 (all on CONFIGURED products, USD) | ✅ 1,024 (unpriced entities load as `DRAFT`) |
| Pair per-piece rows | Per-piece weights exist only where DYO pages provide them: **5 observed pair refs → 10 `gemstone_stones` rows** (113 pair DYO pages share those 5 refs; 54 more pair refs appear only on failed-fetch pages and are dropped) | ✅ 5 pairs / 10 rows, sums 5/5 exact |
| FK resolution | 100% | ✅ 1,024/1,024 configured products resolve setting + gemstone; 0 asset orphans |
| Rows carrying invented values | 0 | ✅ 0 (slug tokens all classified; unknown → NULL) |

**Measured reference vocabulary:** 76 varieties · 55 colours (slug tokens + help phrases) · 45 origins · 27 shapes · 6 clarities · 5 treatments · 14 metals · 6 jewellery types (incl. owner-only NOSE_RING, zero rows) · 15 setting styles. **Assets:** 32,956 (TNSC product photography deduped per configured product; logos/nav/chat/tracking excluded). **Verification:** pair sums, F-INV-02/03 violations (0), settings `(design_code, metal)` uniqueness, slug uniqueness — all asserted against the loaded database. **Idempotency:** re-run refuses when loaded (zero changes); `--force` reload reproduces the identical state.

## 7. Naming and grammar (ours, not the source's)

| Object | Pattern | Example |
|---|---|---|
| Stone single | `G-#####` | `G-00001` |
| Stone pair | `P-#####` | `P-00001` |
| Setting ref / sku | `S-#####` / `S-{design}-{metal}-{seq}` | `S-0042`, `S-0042-G18Y-7` |
| Product | `J-#####` | `J-00001` |
| Configuration | `DYO-####` | `DYO-0031` |

Slugs are kebab-case, unique, and minted by `normaliseSlug` (already in `packages/domain`).

## 8. Implementation status of THIS document

| Item | Status |
|---|---|
| Design doc (this file) | **Written 2026-10-28** |
| Draft DDL `docs/fresh-schema/0001_reference.sql` + `0002_catalogue.sql` | **Written and applied cleanly to a scratch database** (create → verify → drop), then applied to the local dev database (`maihan_dev`, schema `fresh` — additive; the locked `public` schema untouched) |
| Cleaning script (`tools/fresh-clean`) | **COMPLETE + VERIFIED 2026-10-28** — `--check` gate PASS; loaded into `maihan_dev.fresh`; all acceptance counts matched; idempotency verified (refuse + `--force` reload identical); lint clean |
| **Semantic code architecture + vendors (2026-10-28 PM batch)** | **COMPLETE + VERIFIED** — `technical_design/42` (master code sheet, families, 86-variety registry, minting rules) · DDL `0003_vendors.sql` (vendors + trace columns) · `0004_semantic_codes.sql` (families, variety codes + 10 owner-added varieties, `origin_type`, `gemstone_treatments` join + extended vocabulary, settings `min_ct/max_ct`, `code_counters`) · cleaning v2 reloaded everything with semantic codes (`G-QUA-AME-HQ-00001`, `P-BER-AQU-HQ-00001`, `S-R-JS1003-PT-HQ`, `J-E-C-R14-HQ-00001`) · word-level name de-doubling verified (0 doubled names left) · reload deterministic (identical codes) |
| **Media limits + 3D/VTO (2026-10-28)** | **COMPLETE + VERIFIED** — DDL `0005_media_3d_vto.sql` (`kind` enum, ≤10 images / ≤5 videos+GIFs / ≤2 models per item, one PRIMARY, VTO only on models); all five rejections live-verified; cleaning caps at best-10 per product (10,240 assets) |
| **Platform increments — commerce/identity, vendor portal, trust, CMS/ops (2026-10-28, `technical_design/43`)** | **COMPLETE + VERIFIED** — DDL `0006_commerce_identity.sql` (customers/addresses/sessions/favourites/carts/items/reservations/orders/items/payments/refunds/discounts/order_events/fulfillments; 14 tables) · `0007_vendor_portal.sql` (onboarding + submissions→APPROVED mints our code) · `0008_trust.sql` (certificates + **diamond 4C** grading + verification ledger) · `0009_cms_ops.sql` (pages/SEO — **no redirects by design** — audit log, feature flags) · **44 tables, 47 FKs**; flows verified: customer→cart→reservation→order→payment→events (both reject paths firing), vendor→submit→approve→`resulting_ref`, bad 4C grade rejected; smoke data cleaned; core counts unchanged |
| Treatments vocabulary regression | **FIXED 2026-10-28** — extended vocabulary now seeded by the cleaning tool (survives reloads); treatments = 9 |
| Cut-over of live implementation to the fresh schema | **EXECUTED 2026-10-28 (owner order "ok do it then", Option A path taken early):** backup taken first — `backups/maihan_dev_public_locked_schema_2026-10-28.dump` (2,134,116 B, SHA-256 `408f1240c678391f6b606b3d014f66281dc5f8c463522c50f6eb7931db70eca3`, gitignored; contains the complete locked schema + data) — then `DROP SCHEMA public CASCADE` on the local dev database `maihan_dev`. The locked schema no longer exists in the dev DB; `fresh` (44 tables) is the only schema. **Known consequence (accepted by owner):** the pre-existing locked-schema app (`apps/web` storefront/admin/vendor), its repositories and its tests are now non-functional against `maihan_dev` — that code is retired from the runtime and remains in the repository as history. New work targets `fresh` exclusively. Production/Neon was never touched. |

Verification of the DDL and the cleaning run is recorded in `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` §24 (2026-10-28 entries).
