# INITIAL_IMPLEMENTATION_PLAN

## Natural Gemstones -> Maihan Gems

**Document status:** Planning only. Derived from `PROJECT_SOURCE_OF_TRUTH.md` (Architecture LOCKED) and the validated reverse-engineering package.
**Purpose:** translate the locked architecture into an executable, ordered roadmap.
**Prepared:** 2026-10-04.
**Companion documents:** `PROJECT_SOURCE_OF_TRUTH.md` (authority for all design decisions), `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` (authority for vision and charter).

> **UPDATE 2026-10-28 (ADR-035, owner-authorized):** A new direction replaces
> the corpus data-import scope: the **Fresh Clean Database** (design:
> `technical_design/41`, DDL: `docs/fresh-schema/`, ADR: `docs/adr/ADR-035`).
> Three pillars — Gemstones · Settings · Jewellery — zero provenance, no
> redirects. Phase F1–F3 below (see Appendix A at the end of this file) supersedes
> any remaining corpus-import task for future schema work. Tracking:
> `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` §22/§24 + `.opencode/memory/IMPLEMENTATION_STATE.md`.

---

## 0. HOW TO READ THIS PLAN

Every plan item carries an evidence tag inherited from the Source of Truth. **No item in this plan may promote an inference into source fact.**

| Tag | Meaning in this plan |
|---|---|
| `[OBSERVED]` | Proven in the captured source evidence. Counted and reproducible. |
| `[EXTRACTED]` | Deterministically derived from observed evidence by a stated transform. |
| `[PATTERN]` | Repeated structure across records. Correlation, not causation. |
| `[INFERRED]` | A locked target-design decision from the Source of Truth. |
| `[INFERRED / PROPOSED]` | Target design replacing a source `[UNKNOWN]`. |
| `[UNKNOWN]` | Not decided. Must not be implemented as fact. |

Two rules govern this plan:

1. **Ordering changes require an ADR.** If implementation reveals that a phase boundary is wrong, the boundary is changed deliberately and recorded, not quietly absorbed.
2. **A phase that cannot pass its exit gate does not advance.** Gates are listed per phase and are the only definition of progress.

---

## 1. EXECUTIVE SUMMARY

Maihan Gems is a gemstone and fine-jewelry commerce platform built on a validated reconstruction of the Natural Gemstones public site. The single most important finding of the architecture phase is that the source catalogue is **not** a flat list of products but a **materialised composition** of a settings catalogue and a gemstone inventory, joined by a deterministic SKU grammar.

`[VERIFIED][OBSERVED]` The decoded grammar, validated at 1,024 / 1,024 exact matches with zero mismatches:

```
SETTING    JS<design><metalCode>              e.g. JS1016W10, JS1169SL
CONFIGURED JS<design><metalCode>-<gemRef>     e.g. JS1383R14-PR5681
READY-MADE J<digits>                          e.g. J10347
STONE      K<digits>                          e.g. K1324, K32255
STONE PAIR PR<digits>                         e.g. PR5681, PR14703
```

`[VERIFIED][OBSERVED]` Catalogue scale, derived from the full 44,218-URL inventory:

| Family | URLs | Distinct entities |
|---|---:|---:|
| Loose gemstones | 19,997 | 19,665 |
| Gemstone pairs | 3,077 | 3,072 |
| **Settings** | 10,772 | **10,349 setting SKUs across 951 designs** |
| Configured (DYO) products | 9,812 | 1,024 with observed SKU, 221 with derived SKU only |
| Ready-made products | 88 | 88 |

This plan delivers that catalogue as a set of normalised domain entities, exposes it through stable APIs, renders it as a storefront, makes it searchable, sells it, and only then layers the differentiating capabilities (DYO, certificates, AI, WhatsApp, WebAR) on top.

The plan is deliberately sequenced so that **the MVP is commercially and operationally meaningful without any AI**: phases 1 through 6 produce a searchable, sellable, source-traceable gemstone storefront. Phases 7 through 12 add the differentiators.

**MVP = Phases 1-6.** **Later = Phases 7-12.**

---

## 2. ARCHITECTURE STATUS

**LOCKED.** Validated by live execution against a disposable PostgreSQL 16.2 instance.

| Validation dimension | Result |
|---|---|
| SQL blocks extracted and executed | 16 blocks, 262 statements, 16/16 blocks OK |
| Tables | 74 declared / 74 created / 0 missing / 0 extra |
| Enums | 33 / 33, all member labels present |
| Foreign keys | 94, 0 unresolvable targets, **graph provably acyclic** |
| Constraints | 74 PK, 59 UNIQUE, 591 CHECK |
| Indexes | 263 (12 GIN), 2 HNSW vector indexes built |
| Triggers | 1, functionally tested |
| Functions / views | `match_knowledge_chunks`, `gemstones_search_document_fn`, `certificate_public` |
| RLS | 6 tables enabled, 6 policies, 0 deny-all gaps |
| Extensions executed | `vector` 0.6.2. `citext`, `pg_trgm`, `unaccent`, `btree_gin` statically validated only (absent from the validation build; standard on Neon) |
| Defects found and fixed | 11, all genuine (see section 35) |

### 2.1 Validated numbers that constrain this plan

| Fact | Value | Tag |
|---|---|---|
| Total source URLs | 44,218 | `[OBSERVED]` |
| Crawled pages | 44,173 | `[OBSERVED]` |
| Commerce URLs absent from `products.jsonl` | 33,934 | `[VERIFIED][EXTRACTED]` |
| `products.jsonl` records | 1,245 (2.4% of commerce URLs) | `[OBSERVED]` |
| Setting design cores | 951 | `[VERIFIED]` |
| **Setting SKUs (design x metal)** | **10,349** | `[VERIFIED]` |
| Distinct stone references | 19,665 K + 3,072 PR | `[VERIFIED]` |
| Observed DYO SKUs | 1,024 | `[OBSERVED]` |
| Derived-only DYO SKUs | 221, all new, zero duplicates | `[VERIFIED]` |
| Usable product HTML | 1,024 of 44,173 (2.32%) | `[VERIFIED]` |
| Media records | 241,961, of which ~44,480 are product media | `[VERIFIED]` |
| Recovered prices | 1,024, range $1,074-$17,599 | `[VERIFIED]` |
| `price == weight x per_carat` | **0 of 1,024** | `[VERIFIED]` |

### 2.2 Phase-order divergence from the Source of Truth, declared

`PROJECT_SOURCE_OF_TRUTH.md` section 39 ordered phases as: 1 Database, 2 Catalog, 3 Search, 4 Storefront, 5 DYO, 6 Cart, 7 Certificates, 8 AI, 9 WhatsApp, 10 WebAR, 11 CMS/Admin, 12 Hardening.

This plan uses the ordering directed for it: 1 Database, 2 Migration + Catalog, 3 Catalog APIs, 4 Storefront, 5 Search, 6 Cart + Checkout, 7 DYO, 8 Certificates, 9 AI, 10 WhatsApp, 11 WebAR, 12 Admin + CMS, 13 Hardening.

Two orderings differ. Both are reconciled without changing the locked architecture:

| Divergence | Source of Truth said | This plan does | Why it is safe |
|---|---|---|---|
| Search vs Storefront | Search before Storefront, "because category pages depend on facets" | Storefront (4) before Search (5) | Phase 2/3 deliver a `CatalogQueryPort` with a baseline structured-SQL implementation **including facet counts**. Phase 5 replaces the implementation behind the same port. Storefront call sites never change. §39's intent is satisfied by Phase 2, not deferred. |
| DYO vs Cart | DYO before Cart, "because most configured products enter the cart through DYO" | Cart (6) before DYO (7) | The 9,812 migrated CONFIGURED products are ordinary `products` rows from Phase 2. Cart and checkout need no configurator. Phase 7 adds the **interactive** configurator, which creates *additional* configurations on top of an already-working cart. |

Neither divergence changes a data model, an invariant, an API contract or a security control. Both are recorded here so the deviation is explicit rather than silent.

---

## 3. PRODUCT SCOPE

### 3.1 In scope for the MVP (Phases 1-6)

| Capability | Source of requirement |
|---|---|
| Gemstone catalogue with variety, colour, origin, shape, cut, clarity, treatment facets | `[OBSERVED]` spec fields and route inventory |
| Gemstone pair catalogue | `[VERIFIED]` PR semantics |
| Setting catalogue by design and metal | `[VERIFIED]` 10,349 setting SKUs |
| Configured-product catalogue | `[VERIFIED]` SKU grammar |
| Ready-made product catalogue | `[OBSERVED]` 88 `J#####` URLs |
| Category, variety and colour landing pages | `[OBSERVED]` route triplets |
| Product detail with full specification table and provenance | `[OBSERVED]` JSON-LD in source |
| Hybrid search with facets | `[INFERRED]` charter 36 |
| Cart | `[OBSERVED]` `/cart` |
| Four-step checkout | `[OBSERVED]` four cart routes |
| Customer accounts | `[OBSERVED]` `/account`, `/auth`, `/verify-email` |
| Favorites and compare | `[OBSERVED]` `/favorites`, `/compare-list` |
| Financing and protection add-ons | `[OBSERVED]` `/financing`, `/extend-protection-plan` |
| SEO, redirects, sitemap | `[INFERRED]` charter 50, plus 44,218 source URLs to redirect |
| Asset delivery and classification | `[VERIFIED]` media path-stem taxonomy |

### 3.2 Deferred to Later (Phases 7-12)

| Capability | Phase |
|---|---|
| Interactive Design Your Own configurator | 7 |
| Certificate OCR, confidence, review, verification | 8 |
| AI concierge, RAG, guardrails, evaluation | 9 |
| WhatsApp concierge | 10 |
| WebAR virtual try-on | 11 |
| Admin back office and CMS | 12 |

### 3.3 Explicitly out of scope entirely

| Item | Reason |
|---|---|
| CRM or ERP integration | `[UNKNOWN]` in source; no vendor chosen (deferred decision) |
| Loyalty and review subsystem | `[OBSERVED]` as testimonials only; no source behaviour |
| Multi-language | Deferred decision |
| Micro-frontends | Deferred decision |
| Any capability not in sections 3.1 or 3.2 | Would require a new requirement and an ADR |

---

## 4. TARGET SYSTEM OVERVIEW

`[INFERRED]` Per Source of Truth sections 10.1, 14, 16, 20, 21, 29, 30.

```
                    +---------------------------------------------+
   Browser -------->|  Next.js on Vercel                         |
   WhatsApp ------->|    Route Handlers / BFF                    |
   Admin ---------->|      -> Application Services               |
   Webhooks ------->|        -> Domain (pure logic)             |
   Worker --------->|          -> Repositories (Drizzle)        |
                    +----+------------------+------------------+
                         |                  |                  |
                    Neon Postgres        Redis          R2 / ImageKit
                    + pgvector                              + CDN
                         |
                    AI Gateway / OpenRouter
                    Meta WhatsApp Cloud API
                    Payment provider [UNKNOWN, adapter]
```

Components and their single responsibility:

| Component | Responsibility | Owns |
|---|---|---|
| Storefront + API | Rendering, request handling, validation, serialization | nothing |
| Application services | Use-case orchestration, transactions, authorization, idempotency, event emission | nothing |
| Domain | Pure logic and invariants, zero I/O | nothing |
| Repositories | SQL only | nothing |
| Worker | Asynchronous jobs and event dispatch | nothing |
| Neon Postgres | Transactional truth, full-text, vectors | all state |
| Redis | Cache, rate limits, sessions, coordination, **never truth** | no durable state |
| R2 + ImageKit | Object storage and image delivery | blobs |
| AI Gateway | Model routing behind `ModelGateway` | nothing |

Data ownership rules that implementation must not violate:

1. Postgres is the only source of truth for price, stock, order, payment and certificate state.
2. Redis never holds the only copy of a transactional fact.
3. Media metadata is separate from media binaries.
4. `event type` count and consumer set are explicit per phase, never implicit.
5. A module reaches another module only through its application service.

---

## 5. REPOSITORY / MONOREPO STRUCTURE

`[INFERRED]` Derived from Source of Truth sections 10.2 and 10.3. No new technology is introduced: Next.js, TypeScript (implied by the locked Next.js choice), Drizzle (named in the Source of Truth layer contract), pnpm workspaces.

```
/
  apps/
    web/                        Next.js storefront, API, admin, WebAR route
    worker/                     background job runner and event dispatcher
  packages/
    db/                         Drizzle schema, migrations, repositories, seeders
    domain/                     pure domain logic and invariants (no I/O)
    contracts/                  Zod DTOs, generated OpenAPI, event schemas
    config/                     env parsing, feature flags, constants
    observability/              OpenTelemetry setup, logger, metric names
  tools/
    migrate/                    import pipeline CLI (staging -> canonical)
  docs/
    adr/                        ADR markdown files
    evidence/                   pointer file + checksums (NOT the datasets)
```

Module layout inside `packages/domain` and `apps/web/src/modules`, per Source of Truth 10.2:

```
src/modules/<module>/
  domain/          entities, invariants, value objects, *.spec.ts
  application/     commands/, queries/, services/, dto/, policies/, events/
  infrastructure/  repositories/, mappers/, events/
  index.ts         the module's ONLY public surface
```

Enforcement:

- ESLint `no-restricted-imports` boundaries so `domain/` cannot import `infrastructure/`, and modules cannot import each other's `infrastructure/`.
- `index.ts` barrel exports are the enforced public surface; deep imports fail lint.
- CI runs the boundary lint as a blocking gate.

### 5.1 What is deliberately NOT in the repository

The reverse-engineering datasets are **not** vendored into the application repository. Reasons: `pages_analyzed.jsonl` is 468 MB, `media_analyzed.jsonl` is 179 MB, `raw_html/` is 1.5 GB; Git LFS would make the repository unusable; and the datasets are evidence, not application source. See section 22.3.

---

## 6. DEVELOPMENT PRINCIPLES

1. **Evidence tags travel with the data.** Any field imported from source carries `evidence_status`. Any field we chose carries `INFERRED`. Code that reads a migrated field must be able to explain where the value came from.
2. **The source spine is `urls.jsonl`, never `products.jsonl`.** `[DEFECT D1]` Section 22 restates this as a hard rule.
3. **Inferred never becomes observed.** A derived identifier stays in `*_derived` with an evidence status and a review gate until a human approves it (INV-08).
4. **Unknown stays null.** Missing evidence produces `null` plus an evidence status, never a plausible default.
5. **Business logic lives below the route handler.** A handler may read a session, validate, call one service, serialize. Nothing else.
6. **Invariants are database constraints, not application checks.** `[VERIFIED]` nine invariant constraints already exist in the locked schema; application code must not duplicate them, and tests must prove they bite.
7. **Every mutating endpoint is idempotent** and writes an audit row.
8. **Deterministic pricing.** No model computes a price.
9. **No AI mutation path.** Structural, contractual, runtime and prompt layers, per Source of Truth 16.7.
10. **Events are consequences of commands**, written through a transactional outbox (ADR-020).
11. **Migrations are forward-only, expand-then-contract**, and reversible or explicitly documented as irreversible.
12. **Fail closed on money and trust.** Cache loss degrades speed, not correctness.

---

## 7. IMPLEMENTATION PHASES

| Phase | Name | Gate summary | MVP |
|---|---|---|---|
| 1 | Database + Domain Foundation | Schema applies cleanly on a branch; 74 tables, 33 enums, invariants enforced | Yes |
| 2 | Migration + Catalog | V1-V14, V17-V22 pass; counts reconcile to section 2.1 | Yes |
| 3 | Catalog APIs | Contract tests green; provenance answerable per product | Yes |
| 4 | Storefront | Lighthouse and a11y budgets met; 44,218 redirects resolve | Yes |
| 5 | Search + Filters | NFR-03 met on staging load test | Yes |
| 6 | Cart + Checkout + Commerce | E2E green; price-tampering test green | Yes |
| 7 | Design Your Own | INV-01/02/03 hold; price reproducible from snapshots | Later |
| 8 | Certificate Intelligence | No unverified field renders as fact | Later |
| 9 | AI Concierge | All evaluation dimensions pass; injection tests green | Later |
| 10 | WhatsApp | Tool-registry equality test green | Later |
| 11 | WebAR | No storefront LCP regression; fallback matrix green | Later |
| 12 | Admin + CMS | Approval workflow functional; audit complete | Later |
| 13 | Performance + Security + Observability | NFR targets met; security matrix green | Later |

Critical path: **1 -> 2 -> 3 -> 4 -> 5 -> 6**. Phases 7 and 8 both depend on 3; 7 additionally depends on 6. Phase 9 depends on 3, 8 and 6. Phase 10 depends on 9. Phase 11 depends only on 3 and 4, so it can run in parallel with 8, 9, 10. Phase 12 depends on 2, 3, 7, 8. Phase 13 depends on all.

---

## 8. PHASE 1 - DATABASE + DOMAIN FOUNDATION

**Objective.** Materialise the locked schema as running migrations, seed the reference data, and implement the pure domain layer with its invariants. No features. No catalogue data yet.

**Dependencies.** None. This is the root phase.

**Inputs.** `PROJECT_SOURCE_OF_TRUTH.md` section 8 (the validated 74-table schema, 33 enums, 9 invariant constraints, 2 user functions, 1 view, 6 RLS policies, 1 trigger); section 10.3 (layer contract); section 39 phase 1.

**Outputs.** Migration history; `packages/db` with Drizzle schema mirroring the validated DDL; `packages/domain` with entities, invariants and value objects; seeded taxonomy tables; CI schema-drift check.

**Epics.**
- E1.1 Migration harness and local/branch database
- E1.2 Drizzle schema mirroring the validated DDL
- E1.3 Reference-data seeders (taxonomy, metals, jewellery types, setting styles)
- E1.4 Domain entities and invariants for Gemstone, Setting, SettingVariant, Product
- E1.5 Configuration-hash and slug derivation (pure functions)
- E1.6 Authorization policy primitives
- E1.7 Observability and error-envelope primitives

**Tasks.**
1. Stand up the workspace skeleton from section 5 with boundary lint rules.
2. Create a disposable local PostgreSQL and a Neon dev branch target.
3. Port the validated DDL into ordered migrations, one logical unit per section 8 subsection.
4. Reproduce all 9 invariant constraints in migration form and assert they exist.
5. Reproduce the `gemstones_search_document_fn` trigger and the `certificate_public` view.
6. Reproduce all 6 RLS policies and add a test asserting no RLS-enabled table lacks a policy.
7. Write seeders for `metals` (15 codes), `jewellery_types` (8), `setting_styles`, `treatments`, `colour_intensities`, `clarities`.
8. Implement `Gemstone`, `GemstonePair`, `Setting`, `SettingVariant`, `Product` value objects.
9. Implement INV-01, INV-02, INV-03 as pure domain predicates.
10. Implement the SKU grammar parser as a pure function with the validated regex.
11. Implement the configuration-hash function per Source of Truth 19.2.
12. Implement slug derivation and normalisation.
13. Implement the standard error envelope and the error-code registry.
14. Wire OpenTelemetry tracing with `trace_id` propagation.
15. Add the schema-drift CI job comparing Drizzle schema to migrations.

**Acceptance criteria.**
- Migrations apply in order on a clean Neon branch with zero errors.
- `pg_tables` shows 74 tables; `pg_type` shows 33 enums; 94 FKs; 591 CHECK; 263 indexes.
- All 9 named invariant constraints exist by name.
- RLS: 6 enabled, 6 policies, 0 without policy.
- Both HNSW indexes exist and `vector(1024)` accepts a row.
- The `gemstones` trigger populates `search_document` (verified by test insert).
- Domain layer imports nothing from `infrastructure/` (lint-enforced).
- The SKU parser reproduces all 1,024 observed SKUs exactly, 0 mismatches.

**Tests required.** Unit tests for every domain invariant and value object; property tests for the SKU parser over the 1,024-record corpus; a migration smoke test on an empty database; a schema-introspection test asserting object counts and constraint names; a trigger behaviour test; an RLS completeness test.

**Definition of Done.** A fresh database matches the validated schema exactly; the domain layer is covered; no route handler or UI exists yet.

**What must NOT be implemented yet.** No catalogue import. No product, category or search APIs. No storefront routes. No cart, pricing computation, AI, certificates, DYO engine, admin or CMS. Do not add a second domain concept not in Source of Truth section 7.

---

## 9. PHASE 2 - MIGRATION + CATALOG

**Objective.** Transform the reverse-engineering evidence into the canonical domain, preserving provenance, and pass every applicable validation gate.

**Dependencies.** Phase 1 complete. Requires the migration-critical evidence files (section 22.3) to be reachable at their recorded paths.

**Inputs.** `urls.jsonl` (spine, 44,218), `specifications.jsonl` (12,401), `products.jsonl` (1,245), `pages_analyzed.jsonl` (1,024 priced), `media_analyzed.jsonl` (241,961), `taxonomy.json`, `entities/media/{report,appraisal}.json`, `crawler.sqlite` (read-only), `raw/source_snapshots/manifest.jsonl`.

**Outputs.** `staging_source_pages`, `staging_parsed_urls`, `staging_conflicts` populated; canonical taxonomy, 19,665 stones, 3,072 pairs, 951 settings, **10,349 setting variants**, 9,812 configured products, 88 ready-made products; price entries and price model observations; assets classified; certificates created from path convention; `import_batches` records; 44,218 redirects.

**Epics.**
- E2.1 Extract and integrity-gate
- E2.2 Deterministic URL parsing
- E2.3 Specification normalisation including the D9 tokenizer
- E2.4 Canonical upserts in dependency order
- E2.5 Price recovery and residual derivation
- E2.6 Asset classification and disposition
- E2.7 Certificate artefact extraction from path convention
- E2.8 Redirect generation
- E2.9 Conflict ledger and quarantine
- E2.10 Gate runner

**Tasks.**
1. Build `tools/migrate` with resumable, idempotent stage execution.
2. Hash each source artifact; record in `import_batches.source_sha256`; refuse to run on hash mismatch.
3. Load `urls.jsonl` verbatim into `staging_source_pages`.
4. Implement the slug parser for all five families; write `staging_parsed_urls` with per-field confidence and evidence status.
5. Classify `url_family` and assert the totals in section 2.1 reconcile exactly (V14).
6. Load `specifications.jsonl` and implement the D9 multi-value tokenizer producing `gemstone_stones` rows.
7. Verify the pair weight-sum rule (113/113) and the `Ct.Tw.` slug rule (V8, V9).
8. Upsert taxonomy in dependency order: species, varieties, colours, intensities, origins, shapes, clarities, treatments, metals, setting styles, jewellery types.
9. Upsert stones and pairs; assert `gem_ref` uniqueness (V10).
10. Upsert settings and setting variants; assert SKU uniqueness (V12) and metal resolution (V13).
11. Upsert configured products; assert INV-01 and the earrings invariants (V5, V6, V7); assert `source_url` uniqueness (V11).
12. Upsert ready-made products.
13. Handle the 221 derived-only DYO rows: `source_sku = NULL`, `source_sku_derived = <parsed>`, `sku_evidence_status = 'INFERRED'`, `state = 'DRAFT'`, every attribute column null (V18). Run the V19 regression and the V20 collision check.
14. Recover prices from `pages_analyzed.jsonl` JSON-LD; write `price_entries` and `price_model_observations` with `implied_making`.
15. Seed compatibility rules from the 1,024 observed `(setting, stone)` pairs with `evidence_status = 'EXTRACTED'`. Do not auto-generate DENY rules.
16. Classify media by path stem per the Source of Truth 27.2 table; disposition chrome and JavaScript as `SKIPPED` with a reason (V16).
17. Create certificate rows from `/cert`, `/sarin`, `/appraisal` paths with `verification_status = 'UNVERIFIED'` and no populated fields.
18. Generate 44,218 redirect rows from the section 13.1 mapping.
19. Record every disagreement in `staging_conflicts`, unresolved.
20. Implement the gate runner V1-V22 as CI-executable assertions.

**Acceptance criteria.**
- V1, V2 at 100% parse rate (19,666/19,666 and 3,077/3,077).
- V3 and V19: parser reproduces 1,024/1,024 observed SKUs.
- V4: variety token equals assigned variety for every stone.
- V5, V6, V7: zero invariant violations.
- V8, V9: all 113 pairs reconcile.
- V10, V11, V12, V13: zero duplicates or unresolved codes.
- V14: per-family counts match section 2.1 exactly.
- V16: zero assets classified from a JavaScript URL.
- V17: a second run produces zero new or updated rows.
- V18, V20: the 221 land correctly with no collisions.
- V21, V22: every design/metal pair and stone reference resolves.
- Every migrated row answers "where did this value come from?"

**Tests required.** Parser unit tests with the real corpus as fixtures; tokenizer tests including all doubled-value forms; gate-runner tests; an idempotency test that runs the pipeline twice and diffs the database; a provenance test asserting no canonical row lacks evidence status or import batch.

**Definition of Done.** All blocking gates green; counts reconcile; the catalogue is queryable through the domain layer; nothing is published (`state` remains `DRAFT` until Phase 12 curation, except where evidence permits).

**What must NOT be implemented yet.** No OCR or confidence scoring. No pricing engine or discount logic. No DYO compatibility engine. No AI. No asset binary downloads beyond metadata. Do not merge conflicting records; do not invent values for the 221.

---

## 10. PHASE 3 - CATALOG APIs

**Objective.** Expose the migrated catalogue through stable, validated, cacheable, authorized contracts.

**Dependencies.** Phase 2.

**Inputs.** Catalogue tables; `CatalogQueryPort` interface; Zod contracts; error registry.

**Outputs.** `/api/v1/products`, `/products/{slug}`, `/gemstones/{gemRef}`, `/settings`, `/settings/{sku}`, `/taxonomy/*`, and the `CatalogQueryPort` baseline implementation with facet counts.

**Epics.**
- E3.1 Query layer and read models
- E3.2 Facet computation
- E3.3 Provenance exposure
- E3.4 Caching with event-driven invalidation
- E3.5 API contract and OpenAPI generation
- E3.6 Rate limiting

**Tasks.**
1. Implement repositories for every catalogue read model.
2. Implement `CatalogQueryPort` with structured filters over indexed columns only.
3. Implement facet counts in a single grouped pass consistent with the result set.
4. Implement keyset pagination on a deterministic sort tuple.
5. Expose provenance (source URL, evidence status, import batch) on every product and stone response.
6. Implement cache tags per Source of Truth 15.1 and the generation-bump invalidation.
7. Implement Redis degradation: bypass on Redis failure, never wrong data.
8. Generate OpenAPI from Zod DTOs.
9. Apply rate limits per Source of Truth 11.11.
10. Add response caching headers and surrogate keys.

**Acceptance criteria.** Every endpoint returns the documented envelope; unknown filter values return `rejectedFilters` with reasons rather than silently widening; p95 for a filtered list under 400 ms on staging; no response exposes a field whose evidence status it does not also declare; Redis-down behaviour verified.

**Tests required.** Contract tests per endpoint; authorization tests for admin-only fields; facet-consistency tests (facet counts must equal result-set counts); pagination determinism tests; cache hit/miss/invalidation tests; a Redis-failure degradation test; OpenAPI snapshot test.

**Definition of Done.** All catalogue reads are served through the port; no storefront code exists yet; provenance is answerable from any response.

**What must NOT be implemented yet.** No cart, checkout, pricing quote, DYO, AI or certificate endpoints. No write endpoints for catalogue data (admin arrives in Phase 12). No semantic or vector search (Phase 5).

---

## 11. PHASE 4 - STOREFRONT

**Objective.** Render the catalogue as a fast, accessible, SEO-correct storefront with every state handled.

**Dependencies.** Phase 3.

**Inputs.** Catalog APIs; route map (Source of Truth 13); design-system inventory; redirect table; performance budgets (12.11).

**Outputs.** All public routes rendering data-driven; 44,218 redirects; sitemap sharded to match the source's 44 shards; JSON-LD for Product, BreadcrumbList and Organization.

**Epics.**
- E4.1 App shell, layout, navigation
- E4.2 Design system primitives
- E4.3 Catalog pages (home, variety, colour, category, settings index)
- E4.4 Product detail
- E4.5 States: loading, error, empty, not-found
- E4.6 SEO, redirects, sitemap, structured data
- E4.7 Accessibility and performance budgets

**Tasks.**
1. Build the route tree from Source of Truth 12.2.
2. Build design-system primitives with no page-local variants.
3. Implement server-rendered category, variety and colour pages driven by taxonomy.
4. Implement product detail with specification table, media, provenance badge, availability badge.
5. Implement skeleton, error, empty and not-found for every data-dependent view.
6. Implement redirect handling from the `redirects` table including the section 13.1 mapping.
7. Implement sitemap generation, sharded above 50,000 URLs.
8. Implement JSON-LD reproducing the observed source markup and extending it.
9. Implement the mega menu from the observed menu taxonomy.
10. Enforce the performance budget in CI.
11. Run an accessibility audit and fix violations to zero blocking.

**Acceptance criteria.** No page is created per product or variety; all four states exist on every data view; LCP p75 under 2.5s on category and product pages on staging; initial JS within the 12.11 budget; zero blocking accessibility violations; every one of the 44,218 source URLs either serves or 301s; sitemap valid.

**Tests required.** Per-route smoke tests; a redirect completeness test over all 44,218 source URLs; structured-data validity tests; Lighthouse CI; axe accessibility CI; visual regression on six representative templates.

**Definition of Done.** The catalogue is browsable end to end with no interactive commerce yet; SEO surface is complete and redirects are provably total.

**What must NOT be implemented yet.** No cart or checkout UI. No DYO configurator. No chat. No WebAR route beyond a disabled entry point. No AI-generated content on any page. Do not special-case a variety or product in a component.

---

## 12. PHASE 5 - SEARCH + FILTERS

**Objective.** Add hybrid search with facets, synonyms and business ranking behind the existing port, without changing storefront call sites.

**Dependencies.** Phase 4. Requires `pg_trgm`, `unaccent` (contrib, available on Neon).

**Inputs.** Indexed catalogue; `knowledge_chunks` (empty until Phase 12); synonym reference data; ranking configuration.

**Outputs.** `POST /search`, `/search/suggest`, `/search/similar-gemstones/{gemRef}`; ranking versioned and unit-tested; synonym seed data.

**Epics.**
- E5.1 Query parsing and intent rules
- E5.2 Full-text arm with trigram fallback
- E5.3 Semantic arm with gating
- E5.4 Ranking function, versioned
- E5.5 Synonyms and typo tolerance
- E5.6 Facets, caching, index maintenance

**Tasks.**
1. Implement deterministic intent detection by rule, not by model, on the request path.
2. Implement the structured filter arm with index-backed predicates only.
3. Implement the full-text arm using `websearch_to_tsquery` and `ts_rank_cd`.
4. Implement the trigram fallback on `gem_ref`, title and variety name.
5. Implement the semantic arm against `product_embeddings`, gated as specified.
6. Implement embedding generation for products, content-hash gated for idempotency.
7. Implement the weighted ranking function with the documented modifier table.
8. Implement the synonym map seeded from observed evidence, distinguishing observed from curated.
9. Implement facet counts with disjunctive colour handling.
10. Implement search caching with generation-based invalidation.
11. Implement the vector-arm circuit breaker so search degrades to structured plus full-text.

**Acceptance criteria.** NFR-03 met on a staging load test: filtered p95 under 400 ms, semantic p95 under 800 ms. Zero-result queries return zero results with an explanation, never a fabricated near-match. Treated stones are never demoted in ranking. Ranking is deterministic for a fixed configuration. Search degrades gracefully with the vector index disabled.

**Tests required.** Ranking determinism tests; synonym and typo tests; facet-consistency tests; a no-vector degradation test; index-maintenance tests proving invalidation; load test asserting NFR-03; an explicit test that the LLM is not on the search request path.

**Definition of Done.** Search is live behind the same port the storefront already uses; no storefront file changed except configuration.

**What must NOT be implemented yet.** No dedicated search engine. No AI-generated result explanations on the search path. No personalised ranking. Do not add `btree_gin` unless facet storage moves to arrays (Source of Truth 8.1).

---

## 13. PHASE 6 - CART + CHECKOUT + COMMERCE

**Objective.** Deliver the observed four-step checkout, orders, payments behind an adapter, and accounts.

**Dependencies.** Phase 5 for final pricing surfaces; Phase 3 for catalogue reads. Requires a payment provider decision (currently `[UNKNOWN]`).

**Inputs.** Cart, order, payment schema; `ProductAddOn`; the observed funnel route map; discount and refund policy (both `[UNKNOWN]`, require client decisions).

**Outputs.** `/carts/**`, `/checkout/**`, `/orders/**`, `/account/**`, `/favorites`, `/compare`, `/webhooks/payments/{provider}`; the `PaymentProvider` interface and one adapter; order timeline and document issuance.

**Epics.**
- E6.1 Cart lifecycle
- E6.2 Four-step checkout with server checkpoints
- E6.3 Order placement and immutability
- E6.4 Payment adapter and webhook reconciliation
- E6.5 Accounts, addresses, wishlist
- E6.6 Add-ons, discounts, refunds
- E6.7 Inventory reservation

**Tasks.**
1. Implement cart create, add, update, remove with server-side re-pricing.
2. Implement checkout session creation with stock reservation and a frozen price snapshot.
3. Implement shipping, payment-intent and confirm steps as the observed funnel.
4. Implement order placement writing immutable snapshots of configuration, gem and document state.
5. Define the `PaymentProvider` interface; implement exactly one adapter.
6. Implement webhook verification, idempotent receipt, and reconciliation.
7. Implement accounts, profiles, addresses, order history.
8. Implement wishlist and compare-list.
9. Implement protection-plan and financing add-ons as separate order lines.
10. Implement discount validation (scope, window, minimum, per-customer limit, redemption count).
11. Implement refund request and approval workflow.
12. Implement reservation expiry and release.
13. Implement order state machine and `order_events` timeline.

**Acceptance criteria.** The four observed steps are distinct server checkpoints. A tampered client price is rejected with `409 PRICE_CHANGED`. Webhook replay is deduplicated. Orders are immutable after placement. Every state change writes an audit row. RLS prevents cross-customer access.

**Tests required.** Four-step E2E; price-tampering test (explicitly required by the Source of Truth gate); idempotency replay tests; webhook forgery and replay tests; the authorization matrix across all roles; refund and cancellation state-machine tests; reservation expiry tests; RLS cross-customer access tests.

**Definition of Done.** A migrated configured product can be bought end to end on staging with a test payment adapter.

**What must NOT be implemented yet.** No DYO configurator (Phase 7). No financing or payment provider beyond the adapter chosen. No tax engine beyond a zero-return stub. No certificate issuance from OCR (Phase 8). Do not invent tax, shipping-rate or discount policy; where unknown, surface the decision as a configuration gap.

---

## 14. PHASE 7 - DESIGN YOUR OWN

**Objective.** Ship the interactive configurator as a first-class domain: configuration state machine, deterministic compatibility engine, reproducible pricing, cart conversion.

**Dependencies.** Phase 6 (cart conversion), Phase 3 (catalogue), Phase 1 (invariants).

**Inputs.** `setting_compatibility_rules`; the configuration-hash function; the pricing component model; the verified earrings invariant.

**Outputs.** `/dyo/**` endpoints; configuration state machine; compatibility evaluator; price snapshots; shareable short codes; rendered preview job.

**Epics.**
- E7.1 Configuration aggregate and state machine
- E7.2 Compatibility engine
- E7.3 Pricing and quoting
- E7.4 Cart conversion
- E7.5 DYO UI flow
- E7.6 Preview rendering

**Tasks.**
1. Implement the configuration hash per Source of Truth 19.2, including `hash_version`.
2. Implement the state machine DRAFT, VALIDATING, VALID, INCOMPATIBLE, PRICED, ADDED_TO_CART, ORDERED, EXPIRED.
3. Implement rule seeding provenance so ALLOW rules are traceable to the 1,024 observed pairs.
4. Implement the evaluator returning per-rule outcomes; unknown means unknown, never compatible.
5. Implement pricing components and versioned snapshots.
6. Implement cart conversion re-validating and re-pricing inside the transaction.
7. Implement compatible-settings lookup for a chosen stone.
8. Implement the multi-step DYO UI with optimistic compatibility feedback.
9. Implement shareable short codes and resume.
10. Implement the preview render job and asset pipeline.
11. Implement QR-independent deep links.

**Acceptance criteria.** INV-01, INV-02, INV-03 hold for configurations created through the API. A configuration matching no rule returns `UNKNOWN`, not compatibility. Any change to stone, setting or options resets to DRAFT and forces re-validation. Price is reproducible from a stored snapshot and its rule version. Earrings cannot be configured with a single stone; non-earrings cannot take a pair.

**Tests required.** State-machine transition tests; compatibility rule tests including the unknown path; price reproducibility tests; cart-conversion re-validation tests; E2E configuring a ring, earrings, pendant and necklace; a test proving no pair may attach to a non-earring type at the API and database layers.

**Definition of Done.** A customer can configure, price, share and buy a piece; compatibility is explainable; pricing is auditable.

**What must NOT be implemented yet.** No side-stone catalogue (the source is empty; `all_side_stones.json` is `[]`). No engraving workflow beyond storing text, because engraving has no source evidence. No ring-sizing recommendation, because no ring-size evidence exists. No AR preview (Phase 11).

---

## 15. PHASE 8 - CERTIFICATE INTELLIGENCE

**Objective.** Turn observed certificate and appraisal artefacts into a trust workflow where low-confidence extraction can never become verified fact.

**Dependencies.** Phase 3 (asset and gemstone reads), Phase 12 (admin review UI). Requires a vision model decision within the locked `ModelGateway`.

**Inputs.** 2,762 certificate rows created in Phase 2 with no fields; `certificate_*` schema; the cross-check rule set including the D9-derived weight checks.

**Outputs.** Upload and presign flow; OCR runs; per-field extraction with confidence; anomalies; review queue; `certificate_public` view enforced; `verification_events` ledger.

**Epics.**
- E8.1 Secure upload and storage
- E8.2 OCR and vision extraction
- E8.3 Confidence and validation policy
- E8.4 Cross-checks against structured data and slug
- E8.5 Human review workflow
- E8.6 Read-model enforcement

**Tasks.**
1. Implement presigned upload with content sniffing, size and dimension caps, virus scan.
2. Implement private storage with short-lived signed URLs.
3. Implement the strict extraction schema and persist per-field rows with model, version and bbox.
4. Implement the confidence bands and the whole-document verification rule.
5. Implement the nine cross-checks, including pair weight-sum and slug weight mismatch.
6. Implement the state machine UNVERIFIED, EXTRACTED, CROSS_CHECKED, VERIFIED, REJECTED.
7. Implement anomaly detection and the review queue.
8. Implement the `certificate_public` view as the only public read path.
9. Implement customer-facing "on file, pending verification" presentation.
10. Implement the verification ledger.

**Acceptance criteria.** No field below 0.50 is ever returned publicly. Verification requires every material field at 0.90 or above, no unresolved ERROR anomaly, and human approval. The charter's worked example holds exactly: origin "Nigeria" at confidence 0.54 is stored and displayed as extracted and unverified, never as `Origin: Nigeria`. Every transition writes a ledger row.

**Tests required.** Upload security tests; extraction schema validation tests including malformed output; confidence-band boundary tests; one test per cross-check rule with synthetic fixtures; a test asserting the view withholds low-confidence values; a test asserting a reviewer override changes only the targeted field; state-machine tests.

**Definition of Done.** An operator can upload, review and approve; a customer sees truthful status; no path exists to promote low-confidence data to verified truth.

**What must NOT be implemented yet.** No lab API integration (deferred). No automated verification without human approval. Do not populate any field from inference when OCR confidence is below threshold; store null plus the rejected value.

---

## 16. PHASE 9 - AI CONCIERGE

**Objective.** Ship the orchestrator over controlled tools, RAG, grounding and guardrails, with evaluation as a release gate.

**Dependencies.** Phases 3, 6, 8. Requires a knowledge corpus from the CMS (Phase 12 supplies content; Phase 9 must be able to run with a seed corpus).

**Inputs.** Tool registry; `ModelGateway`; grounding gate; evaluation suites; knowledge tables.

**Outputs.** `/ai/**` endpoints including SSE streaming; tool registry with authorization; RAG ingestion and retrieval; guardrail engine; handoff; evaluation runner.

**Epics.**
- E9.1 Model gateway and routing
- E9.2 Orchestrator pipeline
- E9.3 Tool registry and authorization
- E9.4 Grounding and provenance gate
- E9.5 Guardrails and injection defence
- E9.6 RAG ingestion and retrieval
- E9.7 Handoff
- E9.8 Logging and evaluation

**Tasks.**
1. Implement `ModelGateway` with provider abstraction, fallback chain and budget enforcement.
2. Implement the ten-tool registry with the strict input and output schemas.
3. Implement `authorization()` evaluated in code before every `execute()`.
4. Implement the orchestrator stages: receive, classify, plan, authorize, execute, ground, synthesize, policy, record.
5. Implement the grounding gate that strips unverifiable claims and escalates when nothing survives.
6. Implement the null-refusal rules, including the stone-type refusal path that will be hit often.
7. Implement the guardrail engine and injection defences with delimited untrusted blocks.
8. Implement knowledge chunking, embedding and hybrid retrieval with trust-tier weighting.
9. Implement structured-versus-semantic routing in code, not by prompt.
10. Implement citations with resolution and `grounded_ratio`.
11. Implement human handoff with persisted triggers.
12. Implement the evaluation suites across all thirteen dimensions.
13. Implement the CI test proving the AI module's import graph contains no write path.

**Acceptance criteria.** Every evaluation dimension passes. Injected instructions in product copy and certificate text produce no tool escalation. "Set inventory to 0" produces a guardrail event and zero row changes. Grounded ratio above threshold. Every factual claim resolves to a citation. Handoff triggers fire on all defined conditions.

**Tests required.** The full evaluation suite as a blocking CI gate; prompt-injection tests using real product descriptions; tool-authorization matrix tests; a test proving no mutating tool exists for price, inventory, orders, payments, certificates or permissions; refusal tests for every null field; escalation tests; cost-budget tests; tool-replay tests.

**Definition of Done.** The concierge answers only from grounded data, refuses correctly, cites correctly, and escalates correctly.

**What must NOT be implemented yet.** No WhatsApp channel (Phase 10). No admin assist. No autonomous action of any kind. Do not add a tool that mutates state beyond `create_customer_request` and `transfer_to_human`.

---

## 17. PHASE 10 - WHATSAPP

**Objective.** Deliver the WhatsApp concierge on the same brain as the web, with no second intelligence system.

**Dependencies.** Phase 9 complete.

**Inputs.** Orchestrator, tools, guardrails; Meta WhatsApp Cloud API credentials; template registry.

**Outputs.** `/webhooks/whatsapp`; channel adapter; template management; handoff to an agent queue; shared conversation state.

**Epics.**
- E10.1 Inbound webhook and verification
- E10.2 Conversation binding
- E10.3 Channel adapter and capability model
- E10.4 Formatting, templates and the 24-hour window
- E10.5 Handoff integration
- E10.6 Identity and consent

**Tasks.**
1. Implement signature verification over the raw body before parsing.
2. Implement idempotent receipt on provider plus external event id.
3. Implement conversation resolution by thread key and MSISDN-to-customer binding.
4. Implement `ChannelCapabilities` so the orchestrator never assumes streaming or rich rendering.
5. Implement message chunking and template selection for the service window.
6. Implement attachment handling including routing images into the certificate pipeline.
7. Implement handoff notification and SLA.
8. Implement opt-in enforcement for marketing messages.
9. Implement the shared-brain CI test asserting tool-registry equality with web.

**Acceptance criteria.** Web and WhatsApp resolve to an identical tool registry. A conversation started on one channel is visible on the other. Signature failures never reach parsing. Replayed webhooks are ignored. Handoff sets an explicit expectation for the customer.

**Tests required.** Tool-registry equality test (mandated by the gate); signature forgery and replay tests; template window tests; chunking tests; identity-merge tests; opt-in enforcement tests.

**Definition of Done.** A WhatsApp conversation is served by the same orchestrator, tools and guardrails as the web, with human handoff intact.

**What must NOT be implemented yet.** No broadcast campaigns. No autonomous quoting or ordering by message without an explicit confirm step. No second model configuration.

---

## 18. PHASE 11 - WEBAR

**Objective.** Ship client-side virtual try-on without degrading the storefront.

**Dependencies.** Phases 3 and 4. Runs in parallel with 8, 9 and 10.

**Inputs.** `webar_assets`; setting catalogue; jewellery types; device-capability tiers; fit rules.

**Outputs.** 3D asset pipeline; AR route; MediaPipe and Three.js runtime; fallback matrix; QR handoff.

**Epics.**
- E11.1 Asset pipeline
- E11.2 Client runtime and tracking
- E11.3 Placement and smoothing
- E11.4 Performance and device tiers
- E11.5 Fallbacks
- E11.6 QR handoff and privacy

**Tasks.**
1. Define per-jewellery-type triangle, texture and size budgets.
2. Build the decimation, UV, PBR-map, KTX2 and Draco pipeline with validation.
3. Store GLB in R2 and publish CDN URLs with immutable caching.
4. Build the AR route with server rendering disabled and route-level splitting.
5. Integrate MediaPipe HandLandmarker with WASM and the GPU delegate.
6. Implement finger selection, axis computation, placement and clamping.
7. Implement critically damped smoothing and hand-occlusion rendering.
8. Implement the device-tier governor with frame-rate adaptation.
9. Implement the full fallback matrix.
10. Implement QR handoff with hashed, single-use, expiring tokens.
11. Implement camera-permission-on-demand and the no-permission path.
12. Verify zero camera frames leave the device.

**Acceptance criteria.** No regression in storefront LCP (measured before and after). Fallback matrix green: no camera, no WebGL2, no WebAssembly, low-power device, tracking lost, asset still processing, slow network. One model per setting variant serves every stone for that setting, keeping asset count bounded by the 951 designs rather than the 9,812 configurations. Camera frames never leave the device.

**Tests required.** Asset budget validation tests; bundle-size budget test; device-tier matrix tests; fallback tests; tracking-loss tests; a privacy test asserting no frame upload exists in the bundle; LCP regression comparison.

**Definition of Done.** Try-on works on supported devices, degrades honestly elsewhere, and costs the storefront nothing.

**What must NOT be implemented yet.** No server-side rendering of camera frames. No collection of camera imagery. No necklace or bracelet anchor refinement beyond the documented modes. Do not create per-stone models.

---

## 19. PHASE 12 - ADMIN + CMS

**Objective.** Deliver the structured CMS with a review workflow, and the back office needed to operate the catalogue, trust and AI surfaces.

**Dependencies.** Phases 2, 3, 7, 8. Provides the review surfaces Phases 8 and 9 depend on, so it may need a thin earlier slice.

**Inputs.** `pages`, `content_blocks`, `navigations`, `redirects`, `seo_metadata`; RBAC matrix; audit requirements; migration console requirements.

**Outputs.** CMS with 20 typed block renderers and approval workflow; admin modules for products, gemstones, settings, taxonomy, inventory, orders, customers, DYO, certificates, content, media, AI, migration, operations; RBAC; audit trail; derived-reference approval queue.

**Epics.**
- E12.1 CMS blocks and editing
- E12.2 Approval workflow
- E12.3 Navigation, redirects and SEO
- E12.4 Catalogue administration
- E12.5 Trust review console
- E12.6 Migration console and conflict resolution
- E12.7 AI operations console
- E12.8 RBAC and audit

**Tasks.**
1. Implement typed blocks and one renderer per `content_block_type`.
2. Implement page revisions and the DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED workflow.
3. Require second approval for trust-bearing content.
4. Build navigation editing and redirect management with bulk import of the 44,218 rows.
5. Implement SEO metadata management.
6. Build catalogue admin with bulk edit, preview and undo.
7. Build the derived-reference approval queue for the 221 and any future inferred identifiers.
8. Build the migration console exposing batches, counts, conflicts and quarantined rows.
9. Build the conflict resolution UI that never silently overwrites.
10. Build the certificate review queue and anomaly triage.
11. Build the AI console: conversations, tool-call audit, guardrail events, evaluation runs.
12. Implement RBAC across the ten roles with `BYPASSRLS` for admin and full audit.
13. Implement bulk operations with preview, approval, audit and bounded undo.

**Acceptance criteria.** Approval workflow functional with two-person rule on trust content. Every privileged mutation writes an audit row with before and after state. The 221 can be individually approved or rejected. Conflicts are visible and resolvable without data loss. Navigation is data-driven.

**Tests required.** RBAC matrix tests across all ten roles for every admin endpoint; approval-workflow tests; audit completeness tests; bulk-operation undo tests; conflict-resolution tests; block-renderer snapshot tests.

**Definition of Done.** The catalogue, trust and AI surfaces are operable by humans with full attribution.

**What must NOT be implemented yet.** No CRM or ERP integration. No AI-generated content published without human approval. No destructive bulk action without typed confirmation. Do not grant `BYPASSRLS` outside the admin role.

---

## 20. PHASE 13 - PERFORMANCE + SECURITY + OBSERVABILITY

**Objective.** Prove the non-functional requirements with measurement, close the security matrix, and make the system operable.

**Dependencies.** All phases. Final gate before production.

**Inputs.** NFR-01 to NFR-15; security matrix; observability specification; production-shaped dataset.

**Outputs.** Load-test evidence; security test evidence; dashboards and alerts; runbooks; SLOs; the full verification suite green on production-shaped data.

**Epics.**
- E13.1 Load and performance testing
- E13.2 Security matrix
- E13.3 Observability completion
- E13.4 Operational readiness
- E13.5 Capacity statement

**Tasks.**
1. Build a production-shaped dataset at catalogue scale.
2. Run load tests against every NFR-03 and NFR-02 target.
3. Run the full security matrix including the AI-specific rows.
4. Complete traces, metrics, logs and alerts for every layer in the 32.2 table.
5. Define SLOs and error budgets with alerts derived from them.
6. Write runbooks for payment failure, certificate backlog, AI cost anomaly, queue backlog, DSO degradation.
7. Exercise the documented degradation paths.
8. Publish the capacity statement from measurement, replacing the current explicit non-claim.
9. Run the full verification suite including all 22 gates.

**Acceptance criteria.** Every NFR target met with evidence. Security matrix fully green. Every alert has an owner and a runbook. Degradation paths verified. The capacity statement is measurement-based.

**Tests required.** Load tests; the complete security matrix; injection and authorization tests; chaos and degradation tests; alert-delivery tests; runbook walkthroughs.

**Definition of Done.** The system is operable, measured and defensible. Only then may production cutover be scheduled.

**What must NOT be implemented yet.** No new capability. No architecture change without an ADR. No capacity claim before measurement.

---

## 21. DEPENDENCY GRAPH

### 21.1 Phase-level graph

```
                          [P1 Database + Domain]
                                    |
                          [P2 Migration + Catalog]
                                    |
                          [P3 Catalog APIs]
                          /        |         \
                         /         |          \
            [P4 Storefront]  [P7 DYO]   [P11 WebAR]
                    |            |          (parallel)
                    |            |
            [P5 Search]   (needs P6)
                    |            |
                    +------> [P6 Cart + Checkout] <------ P7
                                    |
                    +---------------+---------------+
                    |                               |
              [P8 Certificates]            [P9 AI Concierge]
                    |                               |
                    +------------> [P10 WhatsApp] <---+
                                    |
                             [P12 Admin + CMS]
                                    |
                             [P13 Hardening]
```

### 21.2 Hard dependencies

| Phase | Requires | Cannot start without |
|---|---|---|
| 1 | - | Nothing |
| 2 | 1 | Schema, seeders, domain layer |
| 3 | 2 | Populated catalogue |
| 4 | 3 | Catalogue read APIs |
| 5 | 4 | Port in use, contrib extensions on the target |
| 6 | 3, 5 | Catalogue reads, final price surfaces, a payment provider decision |
| 7 | 6, 3 | Cart conversion target, compatibility rules |
| 8 | 3, 12 (thin) | Asset reads, review UI |
| 9 | 3, 6, 8 | Tools, grounding, certificate truth model |
| 10 | 9 | Complete orchestrator |
| 11 | 3, 4 | Product data, storefront shell. **Runs in parallel with 8, 9, 10** |
| 12 | 2, 3, 7, 8 | Everything it administers. **Thin slice needed before 8** |
| 13 | all | Complete system |

### 21.3 Parallelisation opportunities

| Window | Parallel work | Rationale |
|---|---|---|
| After P3 | P11 asset pipeline (no runtime yet) | Asset production is the long pole for WebAR and needs no other phase |
| P4 and P5 | Storefront pages that do not depend on search refinement | Search is behind the same port |
| P6 and P8 | Commerce flows versus certificate upload | No shared write paths |
| P8 and P9 | Certificate pipeline versus AI build | AI only reads the verification model |

### 21.4 Unambiguous ordering rules

1. A phase may not begin until every dependency in 21.2 has **passed its exit gate**, not merely started.
2. P5 must not change storefront call sites. If it does, the port abstraction has failed and that is a defect, not a refactor opportunity.
3. P7 may not begin cart or checkout work. P6 may not begin configurator work.
4. P9 may not begin before P8, because the AI must be able to answer certificate questions safely and that requires the verification model to exist.
5. P13 is last. No phase may be declared done by pointing at future hardening work.

### 21.5 External decision dependencies

These are not engineering tasks but they block specific phases and must be resolved by the client:

| Decision | Blocks | Latest phase |
|---|---|---|
| Payment provider | P6 | Before P6 starts |
| Tax treatment | P6 (can ship zero-return) | Before production |
| Shipping carriers and rates | P6 (can ship flat placeholder) | Before production |
| Discount policy | P6 | Before production |
| Refund policy | P6 | Before production |
| Vision model for OCR | P8 | Before P8 starts |
| Email and transactional messaging provider | P6 notifications | Before P6 starts |

---

## 22. DATA MIGRATION STRATEGY

### 22.1 The one rule

`[DEFECT D1]` **Migrate from `urls.jsonl` as the spine. Never from `products.jsonl` alone.**

`[VERIFIED]` `products.jsonl` holds 1,245 records, which is 2.4% of commerce URLs, because the crawler's classifier recognised only DYO pages. Migrating from it would discard approximately 97% of the catalogue. This is the single highest-consequence defect in the source package and the single highest-consequence rule in this plan.

### 22.2 Pipeline stages

```
Source (read-only)
   -> [1] EXTRACT   hash each artifact, record in import_batches
   -> [2] STAGE     load verbatim into staging_source_pages
   -> [3] PARSE     deterministic slug/SKU parsers -> staging_parsed_urls
   -> [4] VALIDATE  gates V1-V22
   -> [5] CANONICAL upsert taxonomy, stones, settings, variants, products
   -> [6] SEARCH    tsvector, trigram and facet indexes
   -> [7] EMBED     knowledge documents and product embeddings
   -> [8] PRODUCTION flip traffic, run the full verification suite
```

Every stage is resumable and idempotent. Stages 1-5 are deterministic given identical input hashes.

### 22.3 Migration-critical files: retained OUTSIDE the application repository

`[VERIFIED]` These must be retained in durable object storage with checksum verification, reachable read-only at import time, and **not** vendored into Git.

| File | Size | Why critical | If lost |
|---|---|---|---|
| `crawler.sqlite` (+`-wal`, `-shm`) | 159 MB + 26 MB | Only relational source of truth; table schemas for `documents`, `links`, `media_assets` | Cannot re-derive without a re-crawl |
| `reverse_engineered/data/urls.jsonl` | 30.5 MB | **The migration spine.** All 44,218 URLs including the 33,934 absent from `products.jsonl` | **Catalogue unrecoverable** |
| `reverse_engineered/data/specifications.jsonl` | 4.9 MB | The 13 attribute fields for 1,024 products, and the D9 concatenated values | **Attributes unrecoverable** |
| `reverse_engineered/data/pages_analyzed.jsonl` | 468 MB | **The only source of price, availability and JSON-LD** | **All 1,024 prices permanently lost** |
| `reverse_engineered/data/products.jsonl` | 929 KB | Observed SKU ground truth required by gates V3 and V19 | Cannot validate the parser |
| `reverse_engineered/data/media_analyzed.jsonl` | 179 MB | Asset URL inventory with host and path stem | Asset classification impossible |
| `reverse_engineered/data/taxonomy.json` | 26 KB | Field value distributions, seeds reference data and validates normalizers | Facet seeding loses its evidence basis |
| `reverse_engineered/entities/media/report.json`, `appraisal.json` | 63 KB | Only structured evidence that certificate and report artefacts exist | Certificate seed lost |
| `reverse_engineered/raw/source_snapshots/manifest.jsonl` | 24 MB | HTML SHA-256 hashes for re-crawl integrity | Cannot prove a re-crawl captured the same content |
| `PROJECT_SOURCE_OF_TRUTH.md` | this repo | The durable architecture authority | Architecture lost |

**Two single points of irreversible loss, restated from the Source of Truth:** deleting `pages_analyzed.jsonl` destroys all prices permanently; deleting `urls.jsonl` destroys 33,934 commerce URLs.

### 22.4 What can safely be excluded from GitHub

| Item | Disposition | Reason |
|---|---|---|
| All datasets in 22.3 | Exclude; store in object storage with checksums | Size and evidence-not-source |
| `raw_html/**` (1.5 GB) | Exclude; archive the 1,024 real files compressed | 43,149 files are 502 shells with no content; the 1,024 real files are DOM insurance |
| `exports/*.csv`, `exports/products.jsonl` | Exclude | Redundant with the JSONL datasets and `crawler.sqlite` |
| `architecture/**` | Exclude; safe to archive | Generation A; empty taxonomy arrays, 30-URL sample |
| `relationships/relationship_graph.json` | Exclude; safe to archive | Empty arrays |
| `entities/settings/`, `entities/side_stones/` | Exclude; safe to archive | Both `[]` |
| `entities/gemstones/all_gemstones.json` | Exclude; safe to archive | 11 KB of all-null objects; defective |
| `entities/media/{3d,360}.json` | Exclude; safe to archive | Misclassified JavaScript bundles |
| `content/**`, `design_your_own/`, `logs/` | Exclude; safe to archive | 0 files |
| `DATASET_MANIFEST(1).json`, `validation/**` | Exclude; safe to archive | Generation A, describe a 30-page crawl |
| `ai_context/ARCHITECTURE.md`, `AI_CODING_AGENT_INSTRUCTIONS.md` | Exclude; **do not follow** | Generation A and actively misleading |
| `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` | Keep in repo | Vision and charter authority |

`docs/evidence/MANIFEST.md` in the repository records the storage location, SHA-256 and retention class of each dataset, so provenance is checkable without vendoring data.

### 22.5 Idempotency, conflicts and quarantine

| Requirement | Mechanism |
|---|---|
| Repeatable | Stages are resumable; each records a cursor |
| Idempotent | Deterministic natural keys plus `ON CONFLICT`; gate V17 asserts a second run changes zero rows |
| Provenance-preserving | Every canonical row carries `evidence_status`, `source_url`, `import_batch_id`, and raw values where useful |
| Source-traceable | Any field can be traced to artifact, record and parser |
| Conflict-safe | Every disagreement written to `staging_conflicts` unresolved; never auto-resolved, never overwritten |
| Quarantine-safe | Parse failures, invariant failures and conflicts are quarantined with a reason, counted, and never silently dropped |

Known expected conflicts carried into Phase 2: 5 pair URLs sharing a PR id; 314 stone URLs ending `-J#####`; 113 records with doubled spec strings; 3 stone references present only in the failed-fetch set.

### 22.6 The 221 derived identities

Binding rules, from Source of Truth 19.1 and enforced by gates V18-V20:

1. `[INFERRED / PROPOSED]` identity, two-source corroborated. Never written to `source_sku`.
2. `source_sku_derived` holds the parsed value; `sku_evidence_status = 'INFERRED'`.
3. Every attribute column null; `state = 'DRAFT'`; not published.
4. Human approval required before canonical promotion (INV-08).
5. **Never manufacture a source SKU.** Never infer attributes from a sibling product sharing a stone reference.

---

## 23. TESTING STRATEGY

### 23.1 Layers and what each must prove

| Layer | Proves | Runs on |
|---|---|---|
| Unit | Pure domain logic, invariants, parsers, pricing, ranking | Every commit |
| Domain | Aggregate behaviour and state machines | Every commit |
| Integration | Repositories, RLS, outbox against real PostgreSQL | Every commit |
| API | Schema, authorization, errors, idempotency, rate limits | Every commit |
| Contract | AI tool schemas, provider adapters, queue and storage ports | Every commit |
| Migration | All 22 gates as executable assertions | Every commit |
| E2E | Critical journeys in a real browser | Every PR |
| Security | Authorization matrix, injection, upload, webhook forgery | Nightly and pre-release |
| Performance | Load against NFR targets | Pre-release |
| AI evaluation | All thirteen dimensions | Every prompt or model change, and nightly |

### 23.2 Evidence-linked test matrix

Every reconstructed capability is validated against its evidence. The matrix below is inherited from Source of Truth 34.2 and is binding.

| Feature | Evidence | Test |
|---|---|---|
| SKU grammar | 1,024/1,024 | Parser over the full observed corpus; expects 100% match, 0 mismatches |
| Pair weight rule | 113/113 | Sum check against the `Ct.Tw.` slug value |
| Single-stone weight | 911 single-token | Tokenizer returns exactly 1 token |
| Stone identity stability | 0 unstable | Attribute consistency per `gem_ref` |
| Metal mapping | 14 codes, 1:1 | Every slug phrase maps to its code; no code maps to two phrases |
| Earrings use pairs | 113/113 | INV-02 across the migrated set |
| Variety in slug | 19,666/19,666 | Assigned variety equals slug variety |
| Slug parse rates | 100% | Gates V1 and V2 in CI |
| Derived SKUs | 1,024/1,024 control; 221/221 parse; 0 collisions | Gates V18, V19, V20 |
| Doubled spec strings | 113 x 12 fields | `token_count = 2`; `is_doubled` set |
| Price recovery | 1,024 prices | All recovered from `pages_analyzed` |
| Price model | 0/1,024 exact | Residual non-zero for every row |
| Media classification | 7,778 JS records | Zero assets classified from a `.js` URL |
| Media volume | 120,832 nav icons | Chrome dispositioned `SKIPPED`, not attached to products |
| Checkout funnel | 4 observed URLs | Four-step E2E with server checkpoints |
| Route preservation | 44,218 URLs | Every source URL resolves or 301s |
| Certificate artefacts | Path convention | Every `/cert`, `/sarin`, `/appraisal` URL becomes a certificate row |
| DYO invariants | INV-01/02/03 | Constraint-level tests |
| Catalog completeness | D1 | A test asserting catalogue counts match section 2.1 and that no source family is missing |

### 23.3 The catalog-completeness guard

A permanent regression test asserts that the imported catalogue contains all five source families with the counts in section 2.1. If a future change drops the settings family, the loose-stone family, or the 10,349 setting variants, CI fails. This is the automated defence against repeating defect D1.

### 23.4 Test-runner decision

`[UNKNOWN]` The Source of Truth specifies test layers and required coverage but names no runner. **No runner has been selected in this plan**, because selecting one is a technology decision the Source of Truth does not make. This is recorded as an unresolved decision requiring an ADR at Phase 1 kickoff. The same applies to the E2E driver and the load-test tool.

> **RESOLVED 2026-10-07:** ADR-021 ACCEPTED by explicit user authorization — Vitest (unit/domain/integration/contract) and Playwright (E2E); the load-test tool remains undecided. See `technical_design/40` ADR-021.

---

## 24. CI/CD STRATEGY

### 24.1 Pipeline stages

| Stage | Trigger | Blocking | Contents |
|---|---|---|---|
| Lint and types | Every push | Yes | Boundary rules, no-unused, strict types |
| Unit and domain tests | Every push | Yes | Fast suite |
| Schema drift | Every push | Yes | Drizzle schema matches migrations |
| Migration gates | Every PR | Yes | All 22 gates against a real PostgreSQL |
| Integration and RLS | Every PR | Yes | Real database, cross-customer access tests |
| API and contract | Every PR | Yes | Endpoint contracts, tool schemas |
| E2E | Every PR | Yes | Critical journeys |
| Build | Every PR | Yes | Next.js build, bundle budgets |
| AI evaluation | Prompt or model change | Yes | All thirteen dimensions |
| Security matrix | Nightly and pre-release | Yes for release | Full matrix |
| Load test | Pre-release | Yes for release | NFR targets |
| Deploy preview | Every PR | - | Ephemeral environment |
| Deploy staging | Merge to main | Yes | Migration rehearsal on a branch |
| Deploy production | Manual, gated | Yes | Full verification suite green |

### 24.2 Rules

1. **No migration merges without its gate tests green.** A migration that cannot run on a clean database is a build failure.
2. **Migrations run on a Neon branch first**, never directly against production.
3. **Deploy is blocked by tests, not by convention.** A red pipeline cannot be overridden without a recorded ADR.
4. **Preview environments use synthetic or seed data**, never a copy of production customer data.
5. **Secrets are injected by the platform, never committed.** Verified by a CI scan.
6. **Bundle budgets are enforced in CI**, so a WebAR or AI regression cannot land silently.

---

## 25. ENVIRONMENT STRATEGY

| Environment | Database | Data | Purpose | Migration source |
|---|---|---|---|---|
| local | Local PostgreSQL 16 | Seeded subset | Development | Migrations from scratch |
| preview | Neon branch per PR | Synthetic | PR validation | Migrations from scratch |
| staging | Neon staging | Production-shaped synthetic | Load test, AI evaluation, migration rehearsal | Full migration pipeline |
| production | Neon primary plus read replica | Real | Live | Verified pipeline only |

Rules:

- Production code cannot point at a non-production database; enforced by a startup guard, not convention.
- Full migration runs only on staging until Phase 13 rehearsal succeeds.
- Customer data never leaves production except through an audited, minimised path.
- Preview and staging hold no real customer PII.
- A Neon branch is created per migration verification and destroyed after, to keep schema drift detection cheap.

---

## 26. SECURITY GATES

Security is gated, not deferred. Every gate below is blocking for release.

| Gate | Requirement | Verified by |
|---|---|---|
| SG-1 | Zero unauthorized cross-customer access | RLS and authorization matrix tests |
| SG-2 | Every mutating endpoint is idempotent | Replay tests per endpoint |
| SG-3 | Prices computed server-side only | Price-tampering test |
| SG-4 | Webhook signatures verified before parsing | Forgery and replay tests |
| SG-5 | File uploads validated, scanned, size-capped | Upload security tests |
| SG-6 | Customer documents private, served by signed URL | Access tests |
| SG-7 | No secrets in code, database or logs | CI secret scan |
| SG-8 | Every privileged mutation audited with before and after | Audit completeness tests |
| SG-9 | RLS enabled implies a policy exists | Schema introspection test |
| SG-10 | AI cannot reach any write path | Import-graph test plus mutation-attempt test |
| SG-11 | Prompt injection from retrieved content is inert | Injection suite using real product copy |
| SG-12 | No unverified certificate field renders as fact | View and presentation tests |
| SG-13 | SQL injection surface eliminated | Parameterisation plus fuzzing |
| SG-14 | No PII in logs, analytics or embeddings | Redaction tests |
| SG-15 | Rate limits enforced per scope | Burst tests |

---

## 27. PERFORMANCE GATES

`[INFERRED]` From NFR-01 to NFR-04 and the Source of Truth performance budget. **No capacity claim is made before measurement** (NFR-15).

| Gate | Target | Verified in |
|---|---|---|
| PG-1 | Category page LCP p75 under 2.5s | P13 load test |
| PG-2 | Product page LCP p75 under 2.5s | P13 load test |
| PG-3 | Filtered search p95 under 400ms | P5, re-confirmed P13 |
| PG-4 | Semantic search p95 under 800ms | P5, re-confirmed P13 |
| PG-5 | Initial JS within the 12.11 budget | CI on every PR |
| PG-6 | WebAR causes no storefront LCP regression | P11 comparison |
| PG-7 | Add to cart p95 under 500ms | P13 |
| PG-8 | Checkout session p95 under 800ms | P13 |
| PG-9 | DYO quote p95 under 300ms | P13 |
| PG-10 | AI first token p95 under 2s | P9, P13 |
| PG-11 | Cache hit rate above the agreed floor | P13 |
| PG-12 | Redis-down degradation within budget | P13 |
| PG-13 | Connection pool never exhausts under load | P13 |

---

## 28. OBSERVABILITY

Instrumentation is defined per layer in Source of Truth 32.2 and is built incrementally, not deferred to P13.

| Phase | Instrumentation delivered |
|---|---|
| 1 | Tracing with `trace_id` propagation, structured logs, error envelope |
| 2 | Import batch metrics: records seen, accepted, rejected, quarantined; gate results |
| 3 | API latency, cache hit rate, degradation events |
| 4 | Web Vitals by route, client errors, Core Web Vitals reporting |
| 5 | Search latency, zero-result rate, strategy mix, facet timing |
| 6 | Order conversion, checkout funnel, payment success, refund rate |
| 7 | DYO funnel, compatibility rejections by rule, quote latency |
| 8 | OCR runs, mean confidence, review rate, cost per run |
| 9 | Tokens, cost, latency, TTFB, grounded ratio, handoff rate, tool denials |
| 10 | Message volume, delivery, response time, template failures |
| 11 | AR load time, frame rate, tracking loss rate, device tier |
| 12 | Audit trail, job health, admin action volume |
| 13 | SLOs, error budgets, alerting, runbooks |

Rules: no user id, email, SKU or URL in metric labels; `trace_id` on every log line; alerts derived from SLOs with an owner and a runbook; AI content stored only in redacted form.

---

## 29. RELEASE STRATEGY

1. **Trunk-based with feature flags.** Every risky capability ships dark and is enabled progressively: certificates, AI, WhatsApp, WebAR.
2. **Expand-then-contract migrations.** Add nullable, backfill in batches, dual-write if needed, drop later. Never a destructive change in the same release as the code that stops using the column.
3. **Catalogue publication is a separate act from catalogue import.** Import creates `DRAFT` rows; curation publishes. This protects against a bad import reaching customers.
4. **AI and certificate features never launch without their evaluation suites green.**
5. **WebAR launches last and behind a flag**, because it is the largest asset cost and the least commercially critical.
6. **Progressive rollout by percentage**, with a documented kill switch for every new capability.
7. **Post-release verification**: gates, error budget, and the catalogue-completeness guard re-run in production.

---

## 30. ROLLBACK STRATEGY

| Failure | Rollback |
|---|---|
| Bad migration | Forward-fix preferred. If impossible, restore from the Neon branch or PITR snapshot. Destructive changes are always delayed one release so the previous release still works |
| Bad catalogue import | Roll back `import_batch_id`. Because imports are idempotent and batch-scoped, a single batch is retractable without touching canonical data loaded by earlier batches |
| Bad parser regression | Halt on gate failure. Parser changes are pure functions under property tests, so a regression is caught before import |
| Price defect | Flag off new quoting; the previous pricing rule version remains in `pricing_rule_version`; existing snapshots are unaffected because they are immutable |
| AI defect | Kill switch. The catalogue is unaffected because AI is an orchestration layer, never a dependency of transactional reads |
| Certificate defect | Revert to `UNVERIFIED` for affected rows via a verification event; never delete the ledger |
| Search defect | Disable the semantic arm via flag; structured plus full-text continues. Search is never the only path to a product |
| Cache defect | Bypass Redis; correctness is preserved by design because Redis is never truth |
| WebAR defect | Disable the flag; the storefront is unaffected because AR is route-isolated |
| WhatsApp defect | Pause the webhook; conversations queue rather than fail |

**Non-negotiable:** no rollback may delete an audit row, an order, a payment, a verification event or a domain event. Those are append-only by design and by grant.

---

## 31. DEFINITION OF DONE

A capability is done only when all of the following hold. This is Source of Truth section 40 applied per phase.

1. Source evidence is understood and cited, with an evidence status on every migrated field.
2. Target architecture matches the Source of Truth; any deviation has an ADR.
3. Schema supports it, with constraints and indexes.
4. Logic lives in the correct module and layer; no business logic in route handlers.
5. API contracts are stable, validated and documented.
6. Frontend is data-driven with loading, error, empty and not-found states.
7. Authorization exists and is enforced outside the AI layer.
8. Tests exist at every layer, including the evidence-linked assertions in 23.2.
9. Observability exists: traces, metrics, logs, alerts.
10. Source evidence is respected; nothing promoted, nothing discarded silently.
11. Unknowns are labelled, not guessed.
12. Performance is measured against a stated target.
13. Security requirements are met and tested.
14. Provenance is answerable.
15. Migration is idempotent and re-runnable.
16. Documentation is updated if a decision changed.

---

## 32. RISKS

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | `pages_analyzed.jsonl` lost before migration | Low | **Catastrophic** | Retain per 22.3 with checksums; verify before P2 | Platform |
| R-2 | `urls.jsonl` lost before migration | Low | **Catastrophic** | Same | Platform |
| R-3 | Repeat of defect D1: catalogue built from `products.jsonl` | Medium | **Catastrophic** | The 22.3 spine rule, the 23.3 completeness guard, gate V14 | Data |
| R-4 | Derived SKUs for the 221 leak into `source_sku` | Medium | High | Single write path, gate V18, DB check constraint | Data |
| R-5 | Doubled spec strings produce facets like `Pink Pink` | Medium | High | D9 tokenizer with `token_count`; gate V8 | Data |
| R-6 | Media import ingests 7,778 JavaScript files | Medium | Medium | Path-stem classification with an explicit JS skip; gate V16 | Platform |
| R-7 | 7 parallel phases diverge from one architecture | High | High | Boundary lint, ADR gate, module public surfaces | Architecture |
| R-8 | Setting prices are wrong by construction | **High** | High | Median residual 2.269 is unexplained; residuals stored separately and labelled `INFERRED`; curated before publish | Commerce |
| R-9 | `stone_type` absent for 911/1,024 stones blocks AI answers | **High** | Medium | Varieties derived from slugs at 100%; AI refusal path tested | AI |
| R-10 | WebAR asset production cost exceeds budget | **High** | Medium | One model per setting variant, not per configuration; budgets enforced in pipeline | Product |
| R-11 | Search ranking is wrong for buyers | Medium | Medium | Ranking versioned and unit-tested; explicit test that treatment is never a penalty | Search |
| R-12 | OCR promotes low-confidence data to fact | Low | **Critical** | Single enforced view, gate V18-class tests, whole-document verification | Trust |
| R-13 | AI bypasses authorization | Low | **Critical** | Four independent layers; import-graph test in CI | AI |
| R-14 | Payment provider decision slips | Medium | High | Client decision tracked in 21.5; adapter interface allows late binding | Commerce |
| R-15 | Capacity assumptions unvalidated | High | Medium | NFR-15 forbids claiming capacity before measurement; PG-1 to PG-13 | Platform |
| R-16 | Migration too slow to iterate | Medium | Medium | Staging, resumable stages, batched backfills, Neon branches | Data |
| R-17 | Phase 8 blocked waiting on Phase 12 review UI | Medium | Medium | Thin review-queue slice extracted early, per 21.2 | Trust |

---

## 33. KNOWN UNKNOWNS

Carried from Source of Truth section 37, with the phase that resolves each.

| Unknown | Handling until resolved | Resolved in |
|---|---|---|
| Payment provider | `PaymentProvider` interface, no vendor chosen | Before P6 |
| Tax engine | `tax_component` returns zero | Before production |
| Shipping carriers and rates | Flat placeholder, clearly marked unknown | Before production |
| Discount mechanics | `discounts` schema only, no rules | Before production |
| Refund policy | Request plus approval workflow | Before production |
| Order numbering | `MG-YYYY-NNNNNN` placeholder | Before P6 |
| Setting component of price | Residual-derived, labelled `INFERRED`, curated | P12 curation |
| Certificate schema | OCR plus human review | P8 |
| Lab integrations | None | Deferred |
| Ring size as a DYO option | **No source evidence exists.** Schema supports it; not implemented | Deferred |
| Engraving | **No source evidence exists.** Text stored only | Deferred |
| Side-stone catalogue | **Source is `[]`.** Not implemented | Deferred |
| Customer data model of the source | Reconstructed from requirement only | P6 |
| Original backend, database, infrastructure | **None claimed anywhere** | Never |
| CRM, ERP | None integrated | Deferred |
| Test runner, E2E driver, load-test tool | `[UNKNOWN]`, see 23.4 | ADR at P1 kickoff |

---

## 34. DEFERRED DECISIONS

| Decision | Deferred until | Trigger |
|---|---|---|
| Dedicated search engine | p95 breaches PG-3 or PG-4 under load | Measured |
| Service extraction | A module shows a concrete scaling or isolation need | Measured |
| Multi-region | Real latency or residency requirement | Measured |
| Read replica topology | Reporting load affects the primary | Measured |
| Alternative payment providers | A second provider is commercially needed | Business |
| Vector store externalisation | HNSW recall or memory degrades at 10x catalogue scale | Measured |
| GraphQL facade | A real over-fetching problem appears | Measured |
| Micro-frontends for admin | Admin team growth justifies it | Organisational |
| Internationalisation | Non-English market demand | Business |
| 3D asset outsourcing | Production cost proves unsustainable | Financial |
| Test tooling stack | Phase 1 kickoff | ADR-021 required |

---

## 35. ARCHITECTURE DECISION LOG

The 20 ADRs in Source of Truth section 35 are **binding and inherited unchanged**. This plan implements them; it does not reopen them.

| ADR | Decision | Phase where it first bites |
|---|---|---|
| ADR-001 | Postgres is the transactional source of truth | P1 |
| ADR-002 | Redis is cache and transient state only | P1, P3 |
| ADR-003 | The AI cannot mutate transactional state | P9 |
| ADR-004 | WebAR is client-side only | P11 |
| ADR-005 | DYO is a configuration domain, not a product table | P2, P7 |
| ADR-006 | No dedicated search engine at launch | P5 |
| ADR-007 | Migrate from the URL inventory, not `products.jsonl` | P2 |
| ADR-008 | Derived identifiers are stored separately and gated | P2, P12 |
| ADR-009 | Per-stone measurements are modelled, not concatenated | P1, P2 |
| ADR-010 | The unknown component of price is modelled explicitly | P2, P6 |
| ADR-011 | Certificate artefacts ingested; schema treated as unknown | P2, P8 |
| ADR-012 | Low-confidence OCR never becomes verified truth | P8 |
| ADR-013 | Web and WhatsApp share one AI brain | P9, P10 |
| ADR-014 | The source product-type taxonomy is rejected as a target model | P2 |
| ADR-015 | Source routes preserved through redirects | P2, P4 |
| ADR-016 | Media classification re-derived from path stem | P2 |
| ADR-017 | Generation-A artifacts excluded from migration inputs | P2 |
| ADR-018 | A single embedding dimension and model | P5 |
| ADR-019 | Modular monolith with explicit extraction triggers | All |
| ADR-020 | Transactional outbox rather than direct publishing | P1, P2 |

### 35.1 Phase 0 validation defects fixed (11)

All were genuine and all were fixed before lock: `clarity_labels` double primary key; `ar_handoff_tokens` brace typo; `gemstones` index subquery; `products` index missing `USING gin`; `dyo_configurations` to `customers` circular dependency; undeclared `citext`; RLS enabled without policies on four tables; `max(uuid)` in the certificate view; missing per-field `verification_status`; illustrative pseudo-SQL fenced as `sql`; and the settings count 9,484 to **10,349**.

### 35.2 New ADR required

**ADR-021 (open): test tooling stack.** Unit, E2E and load-test runners are named in Source of Truth 34 but not selected. Must be decided at Phase 1 kickoff and recorded before the first test is written. No technology has been chosen in this plan.

> **RESOLVED 2026-10-07:** ADR-021 is **ACCEPTED** by explicit user authorization at Phase 1 Task 6 — Vitest for unit/domain/integration/contract, Playwright for E2E. Recorded in `technical_design/40_ARCHITECTURE_DECISION_RECORDS.md`, the decision register of record. The text above is preserved as the planning-time record.

---

## 36. FIRST 20 IMPLEMENTATION TASKS

Ordered. Each names its phase, its dependency, and the gate or test that proves it complete. Tasks 1-6 are Phase 1; none of them touches production data or a managed database.

| # | Task | Phase | Depends on | Done when |
|---|---|---|---|---|
| 1 | Stand up the workspace skeleton from section 5: `apps/web`, `apps/worker`, `packages/{db,domain,contracts,config,observability}`, `tools/migrate`, `docs/adr`, with pnpm workspaces | 1 | - | Workspaces install; boundary lint rules active |
| 2 | Provision a disposable local PostgreSQL 16 and a Neon **dev branch** target for migrations | 1 | 1 | Both reachable; neither is production |
| 3 | Write `docs/evidence/MANIFEST.md` recording the storage location, SHA-256 and retention class of every migration-critical file from section 22.3 | 1 | - | All ten entries present with verified checksums |
| 4 | Port the validated DDL into ordered migrations, one logical unit per section 8 subsection | 1 | 2 | Applies cleanly on a clean database |
| 5 | Assert schema fidelity in CI: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariant constraints, 6 RLS policies with 0 policy-less tables, 2 HNSW indexes, 1 trigger, 1 view, 2 functions | 1 | 4 | Introspection test green against a fresh database |
| 6 | Implement the domain value objects and INV-01, INV-02, INV-03 as pure predicates | 1 | 4 | Unit tests green; no infrastructure imports |
| 7 | Implement the SKU grammar parser with the validated regex and prove it against the 1,024-record corpus | 1 | 6 | 1,024/1,024 match, 0 mismatches (gates V3, V19) |
| 8 | Implement the configuration-hash function and slug derivation | 1 | 6 | Deterministic; property tests green |
| 9 | Seed reference data: 15 metals, 8 jewellery types, setting styles, treatments, intensities, clarities | 1 | 4 | Seeds idempotent; counts asserted |
| 10 | Build `tools/migrate` with resumable, idempotent stage execution and per-artifact SHA-256 gating | 2 | 9 | Refuses to run on hash mismatch |
| 11 | Implement the extract stage: load `urls.jsonl` verbatim into `staging_source_pages` | 2 | 10 | 44,218 rows loaded unchanged |
| 12 | Implement the parse stage: five-family slug classifier writing `staging_parsed_urls` with per-field confidence | 2 | 11 | Gates V1, V2 at 100%; V14 counts reconcile |
| 13 | Implement the D9 multi-value tokenizer producing `gemstone_stones` rows | 2 | 11 | Gates V8, V9 pass on all 113 pairs |
| 14 | Implement canonical upserts in dependency order: taxonomy, stones, pairs, settings, **10,349 variants**, products | 2 | 12, 13 | Gates V4, V5, V6, V7, V10, V12, V13 green |
| 15 | Implement the 221 derived-identity write path | 2 | 12 | Gate V18 green: `source_sku` NULL, `source_sku_derived` set, `INFERRED`, `DRAFT`, attributes null; V20 shows 0 collisions |
| 16 | Implement price recovery from `pages_analyzed.jsonl` plus residual derivation into `price_model_observations` | 2 | 14 | 1,024 prices recovered; residual non-zero for every row |
| 17 | Implement media classification by path stem with explicit JavaScript and chrome skip | 2 | 10 | Gate V16 green; chrome dispositioned `SKIPPED` |
| 18 | Implement certificate artefact extraction from `/cert`, `/sarin`, `/appraisal` paths | 2 | 14 | Certificate rows created, all `UNVERIFIED`, no populated fields |
| 19 | Generate the 44,218 redirect rows from the section 13.1 mapping | 2 | 12 | Count matches; mapping applied without collision |
| 20 | Implement the gate runner V1-V22 and the idempotency check | 2 | 14, 15, 16, 17 | All blocking gates green; second run produces zero row changes (V17) |

**Immediately after task 20**, the catalogue-completeness regression test from section 23.3 becomes a permanent CI gate, and Phase 3 begins.

---

## CLOSING NOTE

This plan adds no technology that the Source of Truth does not already require, reopens no locked decision, and promotes no inference to source fact. Where evidence is absent, the plan says so and leaves the behaviour unimplemented rather than guessing.

The three rules that matter most on day one:

1. **The catalogue comes from `urls.jsonl`, never from `products.jsonl`.** Everything else in Phase 2 depends on getting this right.
2. **The 221 failed-fetch records stay inferred, null and unpublished** until a human approves them.
3. **Provenance must be answerable for every migrated field.** If we cannot say where a value came from, it does not ship.

---

## APPENDIX A — DIRECTION CHANGE 2026-10-28: FRESH CLEAN DATABASE (ADR-035)

> **Status: ACCEPTED (owner-authorized 2026-10-28).** This appendix supersedes
> the corpus-import task families (Phase 2 extract/transform/load, §36 tasks
> 11–20, doc-33 gates as *schema mechanisms*) **for future schema work**. The
> locked schema stays live until a separate cut-over decision. Authority:
> `docs/adr/ADR-035-fresh-clean-database-schema.md`, design
> `technical_design/41_FRESH_CLEAN_DATABASE_DESIGN.md`, DDL `docs/fresh-schema/`.

### A.1 Decisions locked by the owner

| Decision | Value |
|---|---|
| Category model | Three pillars: Gemstones (variety-first) · Settings (by jewellery type) · Jewellery (earring, necklace, nose ring, …) |
| Data | Existing source entries **cleaned** into the pillars |
| Provenance | **Zero** — no staging, no evidence columns, no import metadata; unknown → NULL, never invented |
| The 221 inferred DYO identities | **Dropped**, not carried |
| Redirects / old-URL parity | **None** — fresh SEO start |
| Existing locked-schema code | **Untouched** ("design first, decide later") |

### A.2 Phase F1 — Fresh clean schema v1 (COMPLETE 2026-10-28)

| Task | Acceptance | Status |
|---|---|---|
| F1.1 Census + classification of the locked schema (keep / simplify / drop per table) | Doc 41 §5 table | DONE |
| F1.2 Fresh design doc 41 (ER model, 17 tables, 5 enums, composition law F-INV-01/02/03) | Doc 41 §3–§4 | DONE |
| F1.3 Draft DDL `docs/fresh-schema/0001_reference.sql` + `0002_catalogue.sql` | Applies cleanly to a scratch database | DONE |
| F1.4 Composition-law verification | F-INV-02/F-INV-03 trigger rejects both wrong compositions; READY_MADE/CONFIGURED CHECKs fire | DONE |
| F1.5 ADR-035 recorded (file + register in doc 40) | Both written | DONE |

### A.3 Phase F2 — Cleaning script (✅ COMPLETE + VERIFIED 2026-10-28)

| Task | Acceptance | Status |
|---|---|---|
| F2.1 Deterministic cleaning script (`tools/fresh-clean`, reads `naturalgemstones/` read-only) | Idempotent: refuse-if-loaded; `--force` reload identical | ✅ verified both paths |
| F2.2 Varieties + reference vocabulary | 76 varieties · 55 colours · 45 origins · 27 shapes · 6 clarities · 5 treatments · 14 metals · 6 jewellery types · 15 styles | ✅ |
| F2.3 Stones + pairs with per-pair weight sums | 22,737 gemstones (19,665 + 3,072); per-piece rows only where observed (5 DYO pair refs → 10 rows), sums 5/5 exact | ✅ |
| F2.4 Settings load (951 design codes × metals) | 10,349 rows; UNIQUE(design_code, metal_id) holds | ✅ |
| F2.5 Products load | **405** ready-made (88 rings-family per SoT + 317 observed other routes) + 1,024 configured from observed DYO; 8,788 unobserved DYO + 221 failed-fetch dropped | ✅ |
| F2.6 Prices + price_history | 1,024 priced (USD) → products ACTIVE; entities without observed price load as DRAFT | ✅ |
| F2.7 Assets | 32,956 TNSC product images, deduped per configured product; 0 orphans | ✅ |
| F2.8 Acceptance gate | All counts matched BEFORE any write; zero invented values (all slug tokens classified); FK/pair-sum/uniqueness checks green on the loaded DB | ✅ PASS |

Target database: local `maihan_dev`, schema `fresh` (additive; locked `public` schema untouched). Gate command: `pnpm --filter @maihan/fresh-clean run check`.

### A.3b Phase F2.9 — Semantic codes + vendors (✅ COMPLETE + VERIFIED 2026-10-28)

Authority: `technical_design/42_SEMANTIC_CODE_ARCHITECTURE.md` (owner-approved master code sheet).

| Task | Acceptance | Status |
|---|---|---|
| F2.9.1 DDL `0003_vendors.sql` | `vendors` table + `vendor_id`/`vendor_ref` on gemstones/settings/products + per-vendor unique partial indexes | ✅ applied |
| F2.9.2 DDL `0004_semantic_codes.sql` | `gemstone_families` (11) · variety `code` + `family_id` + **10 owner-added varieties** (ruby, sapphire, emerald, diamond, amber, labradorite, sunstone, aventurine, cat's-eye chrysoberyl, amazonite) · `origin_type` (NATURAL/LAB_CREATED/SIMULANT) · `gemstone_treatments` join + extended vocabulary (Doublet/Triplet/Coated/Glass-Filled/Oil-Filled/No Indication) · settings `min_ct`/`max_ct` · `code_counters` | ✅ applied (21 tables) |
| F2.9.3 Cleaning v2 | Semantic minting `G/P-{FAM}-{VAR}-{CCVV}-{NNNNN}`, `S-{JT}-{DSGN}-{MET}-{CCVV}`, `J-{JT}-C/M-{MET}-{CCVV}-{NNNNN}`; HQ = house; word-level name de-doubling; `origin_type=NATURAL`; treatments→join; counters seeded (203 scopes) | ✅ reloaded |
| F2.9.4 Verify | Counts unchanged (22,737/10,349/1,429) · 0 ref dupes · sku=ref · F-INV-02/03 violations 0 · pair sums 5/5 · names de-doubled (0 left) · reload deterministic (identical codes) | ✅ |

Deferred to F3: diamond 4C grading model (certificates increment). Business rules recorded in doc 42 §8 (DYO sold-only promotion; vendor_ref vendor-only; variety governance; metal in code / carat in DB).

### A.4 Phase F3 — Later increments (each separately owner-approved)

Commerce (carts/orders/payments) · Auth/RBAC · CMS/SEO · AI/knowledge ·
Ops/events · Certificates · Cut-over of the live implementation to the fresh
schema (expand-then-migrate plan required at that point).

Tracking for F-phases: `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` §22/§24 +
`.opencode/memory/IMPLEMENTATION_STATE.md`.

---

**End of INITIAL_IMPLEMENTATION_PLAN.md**