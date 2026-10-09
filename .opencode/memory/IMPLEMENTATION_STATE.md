# IMPLEMENTATION STATE

**Last updated:** 2026-10-10
**Update this file after every meaningful implementation task.**

---

# PHASE 4 — STOREFRONT COMPLETE (2026-10-10). Tasks 1-11 done and verified against live Neon DB.

Storefront implementation is complete and verified with real migrated catalog data from the reverse-engineering archive on the Neon PostgreSQL dev database (`maihan_dev`).

## Phase 4 Task Completion Matrix

| Task | Status | Evidence / Verification |
|---|---|---|
| Task 1 — Catalog Navigation & Layout | **Verified Complete** | Route tree, layout shells, mega menu, variety index, breadcrumbs, responsive navigation (`mega-menu.spec.tsx`, `mega-menu.spec.ts`). |
| Task 2 — PLP / Product Listing Page | **Verified Complete** | Keyset pagination, deterministic faceted filtering, rejected-filters reporting, price & attribute sorting (`catalog-view.spec.ts`, `data-states.spec.tsx`). |
| Task 3 — PDP / Product Detail Page | **Verified Complete** | Product detail view, gemstone specs, composition invariants, media gallery, pricing breakdown, JSON-LD metadata (`product-detail.spec.tsx`, `jsonld.spec.ts`). |
| Task 4 — DYO Configurator | **Verified Complete** | 3-step configurator (Stone -> Setting -> Review), base62 slug & configuration hash integration, live price accumulation, compatibility validation rules (`route-manifest.spec.ts`). |
| Task 5 — Cart & Checkout Preparation | **Verified Complete** | Cart state management, order summary, price freeze validation, currency formatting, non-mutating customer inquiry integration. |
| Task 6 — Real-Data Migration & DB Ingestion | **Verified Complete** | Full migration pipeline executed on Neon PostgreSQL: 44,218 staged URLs, 22,765 gemstones, 964 settings, 10,391 variants, 9,900 products, 1,024 priced products, 683 residual price entries, 16,906 assets, 1,135 certificates, 44,218 redirects, 1,024 compatibility rules. |
| Task 7 — Sharded Sitemap & SEO | **Verified Complete** | Sharded sitemaps (`/sitemap.xml`, `/sitemap-products/[shard]`), URL redirects spine, JSON-LD schemas (`sitemap.spec.ts`, `sitemap-routes.spec.ts`, `redirects.spec.ts`). Commit `b8ac8ee`. |
| Task 8 — Performance Budgets & CWV | **Verified Complete** | Bundle budgets check passed: Category page = 134.5 KB gzip (budget <= 170 KB); Product page = 134.5 KB gzip (budget <= 190 KB) via `scripts/check-bundle-budgets.mjs`. |
| Task 9 — Security, Audit & Rate Limiting | **Verified Complete** | PII redaction, 300/min rate limits with Postgres fallback (`rate_limit_counters`), secure headers, no mutating AI DB tools (`headers.spec.ts`, `limiter.spec.ts`, `api-db.spec.ts`). |
| Task 10 — Test Suites & Contracts | **Verified Complete** | 510 tests passing across `@maihan/domain` (135), `@maihan/contracts` (13), `@maihan/db` (49), `tools/migrate` (20), and `@maihan/web` (293, including 9 DB-backed live tests in `api-db.spec.ts`). |
| Task 11 — Build & Accessibility Audit | **Verified Complete** | Next.js production build succeeds with all 16 static pages prerendered; automated axe-core accessibility tests pass with zero critical or serious blocking violations (`accessibility-audit.spec.tsx`). |

## Live Neon Database State (Confirmed 2026-10-10)
- `gemstones`: **22,765** (19,693 single stones, 3,072 pairs)
- `settings`: **964** (951 designs + ready-mades)
- `setting_variants`: **10,391** (10,349 canonical variants + 42 additions)
- `products`: **9,900** (9,812 configured + 88 ready-made)
- `price_model_observations`: **1,024**
- `price_entries`: **1,707** (1,024 observed products + 683 inferred setting variant residuals)
- `assets`: **16,906** (15,582 pending, 1,324 skipped with explicit reason)
- `certificates`: **1,135** (36 certificates, 40 reports, 1,059 appraisals)
- `url_redirects`: **44,218**
- `setting_compatibility_rules`: **1,024**
- `staging_conflicts`: **328** (unresolved conflicts preserved in ledger)

---

# PHASE 3 — COMPLETE (2026-10-08). Tasks 1-10 done.

Foundation commit `476b1ba feat(api): implement catalog query foundation` (tasks
1-5) + ONE continuation commit `feat(api): complete catalog api controls`
(tasks 6-10). Every phase-3 task is implemented, tested and validated against
the live local PostgreSQL 16 (`maihan_dev`) AND a live Redis 7 container.

## Tasks 6-10 (the continuation commit)

| Task | Delivered |
|---|---|
| 6 — cache tags + generation-bump invalidation | `apps/web/src/modules/catalog/application/`: deterministic cache keys (`{ns}:v1:{scope}:{kind}:{identity}:g={gen}:{actor}`), tags that are BOTH invalidation units and Task 10 surrogate keys, cache-aside service with generation-bump + tag purge, `{v:1}` codec envelope that decodes to a miss on any problem. 43 unit tests |
| 7 — Redis degradation | `integrations/redis.ts` fail-fast client (offline queue off, bounded retries, errors recorded never thrown) + every store op throws so the service degrades to a BYPASS with Postgres as truth. Dead-Redis suite always runs; live-Redis suite runs under REDIS_URL |
| 8 — OpenAPI from Zod | `@asteasolutions/zod-to-openapi` (APPROVED slot) generates OpenAPI 3.1 from the committed DTOs via ONE endpoint catalog shared with the router; committed `src/generated/openapi.json` is drift-tested (byte-identical generation, parameter/response fidelity). HTTP layer: web-standard `(Request)=>Response` handler, node adapter, SoT 10.4 envelopes, closed error registry |
| 9 — rate limiting | SoT 11.11 verbatim: public GET **300/min per IP**, hashed PII-free bucket keys `rl:{scope}:{hash}:{window}` (SoT 15.1 row 15), Redis INCR/EXPIRE primary + LOCKED `rate_limit_counters` fallback, failure mode allow for public reads (doc 06), 429 RATE_LIMITED envelope + Retry-After + RateLimit-* headers. Socket-derived client identity in the adapter (spoofed header proven ignored over real HTTP) |
| 10 — cache headers + surrogate keys | `api/headers.ts`: `Cache-Control: public, max-age={route TTL}, stale-while-revalidate={TTL}` from the SoT 11.2 route table (60s list / 300s detail / 1h taxonomy), `Surrogate-Key` = the SAME tag set invalidation purges (tested end-to-end), private surfaces never shared, internal cache keys never emitted |

## Validation (2026-10-08)

- `pnpm lint` 0 · `pnpm build` 0 · `tsc -b --dry` all projects up to date
- **268 tests passed + 3 skipped, zero failures**, with live DB + live Redis:
  domain 145 · contracts 13 · db 63 · **apps/web 135 (9 files)** · migrate 33
- DB-backed contract suite (`api-db.spec.ts`): real migrated catalogue (44,218
  staging rows / 9,900 products / 22,765 gemstones / 10,391 variants) —
  envelope, facet consistency, pagination determinism + keyset advance,
  provenance verbatim (source_url compared row-for-row), rejected-filters
  honesty, publication gate (DRAFT stays 404). Publishes 3 real DRAFT rows for
  the suite and restores their exact prior state (verified: 0 published, 0
  rate-limit rows after every run); skips cleanly with no DATABASE_URL and on
  an unmigrated database (CI-safe)
- Performance (local PG16, n=200, filtered list variety+metal, limit 24):
  uncached p50 38.7ms / **p95 65.3ms**; cached hit p50 0.06ms / **p95 0.12ms**
- Real-server smoke test (dist server + curl): documented headers over HTTP,
  404/405 envelopes, Redis buckets + cache tags visible — it CATCHES the
  missing socket identity, fixed in the adapter and frozen by server.spec.ts
- CI gained: contracts/OpenAPI drift gate, compose-DB migration, web suites

## Decisions recorded in code (not ADRs)

- Fixed-window counters (not token buckets) in BOTH backends, because SoT
  15.1 key pattern AND the locked `rate_limit_counters` PK are window-shaped;
  limits/windows/identity are verbatim SoT. Reconciliation documented in
  `ratelimit/policy.ts`.
- RateLimit gate returns a DECISION (allowed+headers), not `Response|null`, so
  allowed responses carry their budget headers too.
- DB-backed spec publishes 3 DRAFT products transiently with exact-state
  restore (disposable local dev database only; archive untouched).

**NEXT: PHASE 4 (Storefront) is READY but NOT authorised.** First task per
INITIAL_IMPLEMENTATION_PLAN §11 Phase 4: “Build the route tree from Source of
Truth 12.2”. Do not begin without explicit user approval.

---

## Documentation refresh

**Task:** simplified the root SRS to a concise, client-friendly format.

- Replaced the long technical SRS with a short plain-English version under 250 lines.
- Removed references to copying an existing website and kept the product scope generic.
- Included the core features: catalog, search, DYO, checkout, accounts, content, media, AI, WhatsApp, try-on, certificate intelligence, SEO, and accessibility.
- Kept the document readable for non-technical stakeholders.

## Client SRS

**Task:** prepared the client-facing Maihan Gems SRS in
`docs/MAIHAN_GEMS_CLIENT_SRS.md`.

- Consolidated the root SRS into a client scope baseline with 36 functional
  requirements, customer journeys, workstreams, deliverables, and sign-off.
- Preserved verified migration and catalogue figures while distinguishing
  observed, inferred, incomplete, and unknown information.
- Qualified phased and conditional capabilities, including provider choices,
  certificate review, and WebAR asset dependencies.

---

---

# Documentation Deliverable — SRS.md (2026-10-07)

**`SRS.md` written at repository root.** A client-facing Software Requirements
Specification in plain business language, derived by full analysis of all 49
planning documents (~21,000 lines: 4 root documents, `technical_design/01-40`,
and `.opencode/memory/`).

Contents: executive summary · scope and deferrals · functional requirements by
capability (281 numbered `FR-*` across 21 areas) · 15 `NFR-*` · acceptance
criteria · data and content requirements with a data-completeness gap table ·
13-phase delivery approach with dependency graph · 19 `DEC-*` client decisions ·
17 `RISK-*` risks · gaps in the planning package · glossary · sign-off block.

**Status:** documentation only. No implementation, no code, no migration, no
database change. No phase advanced. Phase 2 remains open and unauthorised.

**Facts worth preserving from that analysis:**

- **The planning package contains ZERO cost, duration, effort, headcount or rate
  estimates.** Verified by exhaustive search of all four root documents for
  person-day/week/month/FTE/rate/budget terms. This is a deliberate charter
  position (NFR-15 + Phase 13 task 8), not an oversight. `SRS.md` §0.5 and §9.5
  exist so the commercial proposal has a defensible sizing basis.
- **Prices exist for only 1,024 of ~24,000 sellable units.** `pages_analyzed`
  covers 1,024 pages only; the 19,665 loose stones, 3,072 pairs and 10,349
  setting variants carry no captured selling price. Surfaced as `DEC-04`.
- **Full specification data exists for those same 1,024 pages only.** The
  remaining ~22,700 loose stones and pairs carry only address-derived attributes
  (variety, weight, origin, shape, colour, `gem_ref`); dimensions, clarity, cut
  and treatment are `[UNKNOWN]` for them.
- **Zero website copy exists** (`content/` directories empty — defect D5).
  ~25 pages plus 100-145 variety guides must be authored. `DEC-14`.
- **Zero 3D models exist** (defect D4: the 7,778 apparent 3D/360 assets were
  `/_nuxt/*.js`). 951 designs to model. Largest cost item. `RISK-10` / `DEC-15`.
- **53 client-gated obligations** exist across `SKILL_MATRIX` §21.5 and the
  doc-38 open-decision register; 19 are material enough to appear as `DEC-*`.
- Phase 13 depends on a **load-test tool that no ADR has selected** — ADR-021's
  resolution note explicitly excluded it.

---

# Current Phase

**PHASE 1 — Database + Domain Foundation. COMPLETE (2026-10-07). Tasks 1-10
done; commits `1e9e26f` T1 · `f238474` T2 · `2b57a80` T4 · `5d34601` T5 ·
`f46537a` T6 · `5eeb9d9` T3 · `9b8b8e9` T7 · `ef6a72b` T8 · `992d14b` T9 ·
`22c57dd` T10. PHASE 2 IS OPEN** — see "Next Task" for the plan's exact dual
numbering.

Task 1 complete and committed (`1e9e26f feat: Phase 1 Task 1 workspace skeleton`).
**Task 2 COMPLETE (final pass 2026-10-05).** Local PostgreSQL 16.15 AND the new
client-created Neon project "Maihan Gems Dev" — PostgreSQL **16.15**, database
**`maihan_dev`** — are both provisioned and live-verified. The old PG18.6
"Maihan Gems" project is abandoned for development use (not deleted, not a
target).

**Task 4 COMPLETE (2026-10-05).** The validated DDL is ported into 17 ordered
Drizzle migrations and applied cleanly on a pristine local PostgreSQL 16.15
database and on the Neon dev database; schema metadata is identical on both.

**Task 5 COMPLETE (2026-10-07).** Schema fidelity is now a blocking CI
assertion: fresh-database orchestrator + framework-free assertion over the
shared introspection; GitHub Actions workflow added.

**ADR-021 ACCEPTED (2026-10-07) by explicit user authorization.**
Vitest 5.0.3 installed for the domain layer (unit/domain runner); Playwright
accepted for E2E but NOT installed; the load-test tool remains open.

**Task 6 COMPLETE (2026-10-07).** Domain value objects + INV-01/02/03 as pure
predicates; zero runtime dependencies; 70 unit tests green.

**Task 7 COMPLETE (2026-10-07).** SKU grammar parser (grammar version '1') in
`packages/domain/src/sku/grammar.ts`, validated against the real
`naturalgemstones/reverse_engineered/data/products.jsonl` corpus: **gates
V3+V19 at 1,024/1,024 with 0 mismatches, 0 malformed** (SHA-256 cross-checked
against MANIFEST entry 5, read-only). 100 tests / 13 files green.

**Task 8 COMPLETE (2026-10-07).** Configuration identity in pure
`packages/domain`: the SoT 19.2 / doc-14 §2 canonical representation,
`computeConfigurationHash` (`sha256:<hex>` + version, Task 6 value-object
output), the configuration slug (fixed-43-digit base62 of the FULL sha256
digest — collision-resistant, URL-safe, no truncation), and the pure
`normaliseSlug` primitive. Frozen by explicit digest examples.

**Task 9 COMPLETE (2026-10-07).** Reference seeders in `packages/db/src/seed/`:
15 metals (full enum; R10 INFERRED), 8 jewellery types (full enum; BROOCH/
CUFFLINKS/CHARM INFERRED), 22 setting styles, 3 treatments + 5 verbatim
treatment labels, 5 colour intensities, 5 clarities + 7 clarity labels —
70 rows, idempotent ON CONFLICT DO NOTHING, evidence-bound by a corpus gate
(taxonomy.json + urls.jsonl SHA-256-gated).

**Task 10 COMPLETE (2026-10-07).** `tools/migrate` is a real CLI:
`plan` / `run` / `status`; resumable + idempotent stage execution over the
locked `import_batches` table; per-artifact SHA-256 gating against
`docs/evidence/MANIFEST.md`; 3 implemented stages (verify-artifacts,
migrate-schema, seed-reference) + 11 declared future stages that refuse
until their Phase 2 plan tasks land. Hash-mismatch, resume and idempotency
are test-frozen gates; the REAL 13-artifact chain was executed (0.89 GB
re-hashed, archive read-only) and re-run as a pure skip.

MVP chain is Phase 1 → 2 → 3 → 4 → 5 → 6. Phases 7–13 are post-MVP.

**Task 3 COMPLETE (2026-10-07).** `docs/evidence/MANIFEST.md` created and
verified: 13 physical artifacts covering the 10 authoritative logical entries of
plan §22.3, every SHA-256 computed from the actual archive bytes during this
run, retention class A ("Must remain permanently", `technical_design/31` §2A),
criticality and loss consequences preserved verbatim from the authoritative
documents, and the SQLite WAL state documented byte-level (not checkpointed;
three files retained as one indivisible unit). Source archive proven unmodified.
**Task 7 remains next** (SKU grammar parser + 1,024-record corpus — corpus now
available in `naturalgemstones/`).
MVP chain is Phase 1 → 2 → 3 → 4 → 5 → 6. Phases 7–13 are post-MVP.

**Contract correction applied:** `DATABASE_URL` is the SINGLE sanctioned database
variable per `PROJECT_SOURCE_OF_TRUTH.md` §29.6. Interim suffixed database URL
variables (a dev/pooled pair) introduced during provisioning were removed from
`.env` and `.env.example`; `DATABASE_URL` now points at the Neon dev target and
the local container URL is documented as a commented alternative. No suffixed
database variables exist anywhere in the repository, and they must not be
reintroduced — per-environment selection is a property of the value stored in
`DATABASE_URL`, never of the variable name.

---

# Current Task

**Tasks 8, 9 and 10 COMPLETE (2026-10-07) — PHASE 1 COMPLETE; PHASE 2 OPEN.**

## Task 8 — configuration hash + slug derivation

| Check | Result |
|---|---|
| Implementation | `packages/domain/src/configuration/` — `canonical-configuration.ts` (explicit canonical object, sorted keys, arrays sorted by stable key, plain-JSON-only values, engraving TEXT excluded from hashing), `hash.ts` (`computeConfigurationIdentity` / `computeConfigurationHash`), `slug.ts` (`deriveConfigurationSlug`, `normaliseSlug`, `isConfigurationSlugShape`) |
| Hash version | `hash_version` INSIDE the hashed object (SoT 19.2); validated in [1, 32767]; output is the frozen Task 6 `ConfigurationHash` value object |
| Canonicalisation | verbatim SoT 19.2 / doc 14 §2 field set: `{engravingPresent, gemRef?, hashVersion, jewelleryType, options(sorted), settingVariantSku, sideStones(sorted)}`; keys sorted at every level; no insignificant whitespace; non-JSON values REJECTED (Maps/Sets/BigInt/undefined never silently dropped) |
| Slug | `base62(sha256(canonicalJson))`, fixed 43 digits, zero-padded big-endian; collision-resistant across the whole versioned identity space (no truncation); URL-safe (encodeURIComponent-stable — no separators, symbols or reserved characters); independent of key insertion order |
| Tests | **38 new** (26 hash + 12 slug, incl. 10 frozen digest/slug examples = the Example B pair PR5681/JS1383R14 and RING K1324/JS1409W14); determinism, insertion-order independence, identity sensitivity, engraving-presence-only, malformed rejection (INVALID_SKU / INVALID_GEM_REF / INVALID_SIDE_STONES / INVALID_OPTIONS / INVALID_ENGRAVING_TEXT / INVALID_HASH_VERSION) |
| Purity | runtime imports only node:crypto createHash — a pure byte computation, no I/O builtins; lint boundary rules green; zero runtime dependencies unchanged |

## Task 9 — reference data seeds

| Check | Result |
|---|---|
| Location | `packages/db/src/seed/` — `reference-seed.ts` (runner), `reference-data.ts` (provenance-traced constants), CLI `packages/db/src/seed.ts` (`pnpm --filter @maihan/db run seed`), spec gates `reference-seed.spec.ts` + `reference-corpus.spec.ts` |
| Categories & counts (expected = actual) | metals **15** · jewellery_types **8** · setting_styles **22** · treatments **3** · treatment_labels **5** · colour_intensities **5** · clarities **5** · clarity_labels **7** (70 rows) |
| Idempotency | `INSERT ... ON CONFLICT (natural key) DO NOTHING`; second run inserts 0 (proven twice in tests and by double CLI run on `maihan_dev_seed_gate`, dropped after) |
| Evidence binding | 14 metal slug phrases EXTRACTED from urls.jsonl (1:1 per code, INV-04, aggregate matches the SoT URL counts per code); 22 style slugs reconcile EXACTLY (9,500 base + 1,272 pendant variants = 10,772 settings routes); intensities/clarities/treatments verified against taxonomy.json (entries 2+7, SHA-256-gated, D9 doubled forms collapsed) |
| Honesty markers | R10 + BROOCH/CUFFLINKS/CHARM = enum-only `INFERRED`; 14 metals OBSERVED; 5 jewellery types evidenced (4 EXTRACTED + BRACELET OBSERVED); intensity/clarity `rank` = our merchandising ordering (DECISIONS.md), values OBSERVED |
| Tests | 15/15 in packages/db (scratch `maihan_dev_seed`: counts, values, uniqueness on all 9 natural keys, idempotency, rerun, no unexpected rows); corpus spec skips when the archive is absent |

## Task 10 — tools/migrate

| Check | Result |
|---|---|
| Location | `tools/migrate/src/` — `manifest.ts` (parse MANIFEST §4, SHA-256 gating), `stages.ts` (ordered registry), `state.ts` (durable state over the LOCKED `import_batches` table; batch_key = `stage:<id>`), `run.ts` (runner), `cli.ts` (bin `maihan-migrate`: plan / run / status) |
| Stages | 3 implemented: `verify-artifacts` (ALL_MANIFEST), `migrate-schema` (runMigrations), `seed-reference` (seedReferenceData); 11 declared-but-refusing future stages (extract-staging … verify-gates) with their authoritative artifact sets and gate references (plan tasks 11–20, doc 33 M1–M9) |
| Resumability | durable rows; rerun skips SUCCEEDED, resumes FAILED/absent; failure stops downstream immediately, never marks it complete |
| Idempotency | re-run = skip-based no-op; migrate-schema and seed-reference are themselves idempotent (Drizzle history; ON CONFLICT DO NOTHING) |
| SHA-256 gating | per-artifact verify BEFORE execution; refusal names stage + artifact + expected vs actual digest; paths/digests only in errors (no secrets); partial real manifest (13 rows required) refuses outright |
| Mandatory gates | hash-mismatch refusal (tampered fixture COPY in /tmp — the real archive untouched), resume after simulated interruption, idempotent rerun — all in `tools/migrate/src/{manifest,run}.spec.ts`, 14/14 green |
| REAL chain proof | `maihan-migrate run` on a disposable scratch DB against the REAL manifest: 13/13 artifacts verified (0.89 GB re-hashed, read-only), 17 migrations applied, 70 reference rows seeded; second run = pure SKIP; scratch dropped after |
| Guard | dev-contract guard `maihan_dev*` state mirrors the DDL migrator; database selected by the value of DATABASE_URL only |

# Next Task

**PHASE 2 IS OPEN. The next implementation task, quoted exactly from the
plan, in BOTH of the plan's own numberings (they differ; both are recorded
verbatim, not silently merged):**

| Plan numbering | Exact wording | Done when | Dependencies |
|---|---|---|---|
| **Global tracker, task 11 of 20** (plan §37 table) | "Implement the extract stage: load `urls.jsonl` verbatim into `staging_source_pages`" | "44,218 rows loaded unchanged" | depends on task 10 (done) |
| **Phase 2 detailed breakdown, task 3 of 20** (plan §9 'Tasks.') | "Load `urls.jsonl` verbatim into `staging_source_pages`" | — | follows detailed tasks 1-2, which the global task 10 already delivered ("Build tools/migrate with resumable, idempotent stage execution." + "Hash each source artifact; record in `import_batches.source_sha256`; refuse to run on hash mismatch.") |

The same work item is referenced by epic **E2.1 "Extract and integrity-gate"** (plan §9).
Nothing of Phase 2 was implemented in the Tasks 8-10 run.

**Client decisions that gate Phase 2 (all remain PROPOSED/UNKNOWN, unchanged):**
ADR-024 provenance storage design; per the plan §26 task numbering in CURRENT_STATE the
configuration-hash consumer tasks also arrive with Phase 2. Report; do not resolve.

# Status

| Item | State |
|---|---|
| Phase 1 | **COMPLETE (2026-10-07). Tasks 1-10 done.** Commits: T8 `ef6a72b`, T9 `992d14b`, T10 `22c57dd` |
| Application code | **Pure domain foundation + reference seeds + migration runner.** Workspace skeleton + migrations + domain (incl. configuration identity, Tasks 8) + seeders (Task 9) + `tools/migrate` runner (Task 10) + evidence manifest. Still ZERO routes, repositories or product data |
| Database migrations | **17 ordered DDL migrations, applied and verified on both dev targets** (Task 4) |
| Schema-fidelity gate | **Blocking CI assertion, green on fresh databases** (Task 5) |
| Domain layer | **Pure value objects + INV-01/02/03 + SKU grammar + configuration identity (hash, canonical rep, slug derivation, normaliseSlug) with zero runtime dependencies** (Tasks 6-8) |
| Tests | **167 green: domain 138/138 (15 files; +26 hash +12 slug for Task 8) · packages/db 15/15 seed gates · tools/migrate 14/14 runner gates.** Vitest per ADR-021 (ACCEPTED 2026-10-07) |
| SKU grammar | **VALIDATED — version '1', gates V3+V19 at 1,024/1,024 / 0 mismatches against the real corpus** (Task 7) |
| Repository / workspaces | **EXISTS.** 8 packages, 9 workspace projects, pnpm 12.3.4 |
| CI | **EXISTS.** `.github/workflows/ci.yml`: lint → build → domain tests → seed gate → migration-runner gate → schema fidelity on a disposable fresh PostgreSQL 16 |
| Local PostgreSQL 16 | **EXISTS and correct.** 16.15 via compose.yaml, database `maihan_dev`, all six extensions; migrated by Task 4 |
| Neon dev | **EXISTS and correct.** "Maihan Gems Dev": PostgreSQL 16.15, db `maihan_dev`; migrated by Task 4; schema identical to local |
| Evidence manifest | **EXISTS.** `docs/evidence/MANIFEST.md`: 13 physical artifacts / 10 logical entries, SHA-256 computed from actual bytes, retention class A, WAL state documented. Source archive proven unmodified (Task 3, 2026-10-07) |
| Source archive | **PRESENT in this Codespace** (46,810 files, ~3.0 GB). Git-ignored, untracked, read-only. Task 7's corpus gate is now reachable |

---

# Completed

Planning complete. **Tasks 1-6 of Phase 1 are implemented (Task 3 = manifest).**

| Completed | Evidence |
|---|---|
| Reverse-engineering package validated and closed | `PROJECT_SOURCE_OF_TRUTH.md` |
| Architecture locked and live-validated | Plan §2: 16/16 SQL blocks, 74 tables, 33 enums |
| 13-phase implementation plan | `INITIAL_IMPLEMENTATION_PLAN.md` |
| 40 technical design documents | `technical_design/01–40` |
| Skill and tooling matrix | `SKILL_MATRIX_AND_TOOLING.md` |
| Persistent project context | `AGENTS.md`, `.opencode/memory/` |
| `.gitignore` fixed to exclude the source archive | 2026-10-05; `git check-ignore` verified |
| **Phase 1 Task 1 — workspace skeleton** | **8 packages, 9 workspace projects, pnpm 12.3.4. Exit gate PASS: workspaces install; boundary lint rules active** |
| **Phase 1 Task 2 — database infrastructure** | **COMPLETE.** LOCAL: PostgreSQL 16.15 via `compose.yaml` (`pgvector/pgvector:pg16`), database `maihan_dev` on 127.0.0.1:5433, healthy; six extensions live-verified (`vector 0.8.7`, `citext 1.6`, `pg_trgm 1.6`, `unaccent 1.1`, `btree_gin 1.3`, `pg_stat_statements 1.10`); HNSW + `vector(4)` + `NUMERIC(12,4)` smoke tests PASS; 0 application tables. NEON: standardized on a NEW project "Maihan Gems Dev" (created by the client in the console after the PG16 requirement), PostgreSQL **16.15**, database **`maihan_dev`**, schema `public`; six extensions installed and live-verified (`vector 0.8.0`, `citext 1.6`, `pg_trgm 1.6`, `unaccent 1.1`, `btree_gin 1.3`, `pg_stat_statements 1.10`); HNSW + `NUMERIC(12,4)` smoke tests PASS; 0 application tables. The OLD "Maihan Gems" PG18 project and its `dev` branch are abandoned for development use (not deleted, not a valid target). Production verified untouched (0 extensions, 0 tables) |
| **Phase 1 Task 4 — ordered DDL migrations** | **COMPLETE.** 17 migrations ported verbatim from SoT §8 in doc 04 order; applied from clean state on local (throwaway DB incl. extension creation + real `maihan_dev`) and on Neon dev; introspection matches every documented count; local vs Neon metadata identical; rerun no-op; failure rollback proven; behavioural smoke green (trigger, INV bites, CITEXT) |
| **Phase 1 Task 5 — schema-fidelity CI assertion** | **COMPLETE.** Shared introspection (`introspect.ts`) + expectations mirror (`expected-schema.ts`) + framework-free assertion (`assert-schema.ts`) + fresh-database orchestrator (`schema-fidelity.ts`, scratch lifecycle with unconditional cleanup and Neon-host refusal) + root script + blocking GitHub Actions workflow. Fresh run PASS twice (deterministic); every drift class proven caught by negative probe; read-only assertion green on both dev targets |
| **ADR-021 resolution** | **ACCEPTED 2026-10-07 by explicit user authorization.** `technical_design/40` (index + body), `SKILL_MATRIX_AND_TOOLING.md` (status tables + testing rows), plan §35.2/§23.4 resolution notes, memory. ADR-022/023/024 untouched. Playwright accepted-only; load tool still open |

| **Phase 1 Task 7 — SKU grammar parser + corpus validation** | **COMPLETE.** Grammar ported verbatim from SoT §1.1 (version '1'); `parseSkuString`/`parseSkuOrThrow`/`parseSkuFromSlug`/`composeSku`; V3+V19 corpus gate **1,024/1,024, 0 mismatches, 0 malformed** on MANIFEST-entry-5 `products.jsonl` (sha256 cross-check first); SoT aggregates reproduced (105/35/11/683/113/911); provenance split demonstrated at scale (OBSERVED vs URL_SLUG-DERIVED); 30 new Vitest tests; standalone (non-Vitest) re-proof passes; archive untouched (commit `9b8b8e9`) || **Phase 1 Task 3 — migration evidence manifest** | **COMPLETE 2026-10-07.** `docs/evidence/MANIFEST.md`: 13 physical files / 10 logical entries per plan §22.3; every SHA-256 computed from the actual archive bytes during the run (0 failures, 0 duplicates, 64-lowercase-hex); retention class **A — "Must remain permanently"** (`technical_design/31` §2A) with the §22.3 operational requirements; criticality + loss consequences verbatim from the authoritative documents; `crawler.sqlite`/`-wal`/`-shm` as separate rows under one logical artifact; `report.json`/`appraisal.json` hashed separately; canonical-vs-redundant path disambiguation recorded (`exports/products.jsonl` = class B per td31 §2B); WAL state documented byte-level (**not checkpointed**, no SQLite library invoked, three files are one indivisible unit, checkpoint only ever on a disposable copy); archive proven unmodified (46,810 files and 3,069,038,249 B identical pre/post, all 13 hashes stable, `git status` silent, no temp file inside the archive); secret scan 0 hits |
| **Phase 1 Task 8 — configuration hash + slug derivation** | **COMPLETE (2026-10-07, commit `ef6a72b`).** Pure `packages/domain/src/configuration/`: the SoT 19.2 / doc-14 §2 canonical representation (sorted keys, arrays sorted by stable key, plain-JSON-only values, engraving presence not text), `computeConfigurationHash` returning the frozen Task 6 `ConfigurationHash` VO with `hash_version` inside the hashed object, the configuration slug = fixed-43-digit base62 of the FULL sha256 digest (collision-resistant, URL-safe), and the pure `normaliseSlug` primitive. 38 tests green incl. 10 frozen digest/slug examples; malformed inputs rejected with stable codes; zero new runtime dependencies |
| **Phase 1 Task 9 — reference data seeds** | **COMPLETE (2026-10-07, commit `992d14b`).** `packages/db/src/seed/` + CLI `pnpm --filter @maihan/db run seed`; 70 rows: 15 metals (full enum; R10 `INFERRED`), 8 jewellery types (full enum; BROOCH/CUFFLINKS/CHARM `INFERRED`), 22 setting styles, 3 treatments + 5 verbatim treatment labels, 5 colour intensities, 5 clarities + 7 clarity labels. `ON CONFLICT (natural key) DO NOTHING` idempotency (second run inserts 0; counts stable). Evidence-bound: 14 metal slug phrases EXTRACTED from urls.jsonl 1:1 (per-code URL aggregates match the SoT counts exactly), 22 style slugs reconcile exactly (9,500 + 1,272 = 10,772 settings routes), taxonomies verified against taxonomy.json (entries 2+7, SHA-256-gated). 15/15 package tests (scratch DB) |
| **Phase 1 Task 10 — tools/migrate** | **COMPLETE (2026-10-07, commit `22c57dd`).** `tools/migrate` bin `maihan-migrate` (plan / run / status); durable stage state over the LOCKED `import_batches` table (batch_key = `stage:<id>`, job_state states, started/finished timestamps, notes); 3 implemented stages (verify-artifacts, migrate-schema, seed-reference) + 11 declared future stages that refuse until their plan tasks land; SHA-256 gating against `docs/evidence/MANIFEST.md` before every artifact-consuming stage (refusal names stage/artifact/expected/actual; partial real manifest refuses). Test-frozen gates: hash-mismatch refusal (tampered temp COPY), resume after simulated interruption, idempotent rerun; the REAL 13-artifact chain executed read-only (0.89 GB re-hashed) and re-run as a pure skip |
| **Phase 1 Task 6 — domain value objects + INV-01/02/03** | **COMPLETE.** Pure `packages/domain`: `errors.ts` (DomainError/InvariantError, stable codes), `enums.ts` (ProductKind, JewelleryType, GemstoneKind, MetalCode×15, EvidenceStatus), 8 value-object modules (`gem-ref`, `money`, `weight-ct`, `dimensions-mm`, `source-sku`, `derived-sku`+ProductIdentity, `sku`, `configuration-hash`), `product/invariants.ts` (three predicates + assertComposition), `index.ts` barrel. Vitest 5.0.3 + `vitest.config.ts` + 11 spec files, 70 tests green. Zero runtime dependencies; lint exempted spec-file node:fs with documented rationale. CI gained the domain-test step |

---

# In Progress

**Nothing.**

---

# Next

First ten tasks, verbatim from `INITIAL_IMPLEMENTATION_PLAN.md` §36.

| # | Task | Phase | Depends on | Done when |
|---|---|---|---|---|
| 1 | Stand up the workspace skeleton: `apps/web`, `apps/worker`, `packages/{db,domain,contracts,config,observability}`, `tools/migrate`, `docs/adr`, with pnpm workspaces | 1 | — | Workspaces install; boundary lint rules active — **DONE** |
| 2 | Provision a disposable local PostgreSQL 16 and a Neon **dev branch** target for migrations | 1 | 1 | Both reachable; neither is production — **DONE. Local: PG 16.15, db `maihan_dev`. Neon: NEW project "Maihan Gems Dev" (client-created), PG 16.15, db `maihan_dev`. Old PG18 project abandoned, production never touched** |
| 3 | Write `docs/evidence/MANIFEST.md` recording storage location, SHA-256 and retention class of every migration-critical file | 1 | — | All ten entries present with verified checksums — **DONE** |
| 4 | Port the validated DDL into ordered migrations, one logical unit per source-of-truth schema subsection | 1 | 2 | Applies cleanly on a clean database — **DONE** |
| 5 | Assert schema fidelity in CI: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariant constraints, 6 RLS policies with 0 policy-less tables, 2 HNSW indexes, 1 trigger, 1 view, 2 functions | 1 | 4 | Introspection test green against a fresh database — **DONE** (framework-free assertion + blocking workflow) |
| 6 | Implement the domain value objects and INV-01, INV-02, INV-03 as pure predicates | 1 | 4 | Unit tests green; no infrastructure imports — **DONE** (70 Vitest tests; zero runtime dependencies) |
| 7 | Implement the SKU grammar parser with the validated regex and prove it against the 1,024-record corpus | 1 | 6 | 1,024/1,024 match, 0 mismatches (gates V3, V19) — **DONE** (1,024/1,024, 0 mismatches, 0 malformed; grammar version '1'; MANIFEST-cross-checked corpus) |
| 8 | Implement the configuration-hash function and slug derivation | 1 | 6 | Deterministic; property tests green — **DONE** (commit `ef6a72b`; 26 hash + 12 slug tests with 10 frozen examples) |
| 9 | Seed reference data: 15 metals, 8 jewellery types, setting styles, treatments, intensities, clarities | 1 | 4 | Seeds idempotent; counts asserted — **DONE** (commit `992d14b`; 70 rows; evidence-bound corpus gate) |
| 10 | Build `tools/migrate` with resumable, idempotent stage execution and per-artifact SHA-256 gating | 2 | 9 | Refuses to run on hash mismatch — **DONE** (commit `22c57dd`; mismatch/resume/idempotency test-frozen; real 13-artifact chain executed and re-run as pure skip) |

**Note on task 9.** "15 metals, 8 jewellery types" are **enum member counts**.
Observed counts are 14 metal codes and 5 jewellery types. `R10` is enum-only and
is recorded as absent from all evidence. Insert the full enum; do not describe
these counts as observed.

Tasks 1, 2 and 3 have no prior dependency. **PHASE 1 IS COMPLETE (tasks 1-10).**
Task 10 (migration tooling) opens Phase 2; the next task is the extract stage —
see "Next Task" above for the plan's exact dual numbering.

---

# Blockers

| # | Blocker | Type | Resolvable by |
|---|---|---|---|
| 1 | ~~ADR-021 test tooling unresolved~~ **RESOLVED 2026-10-07 — ACCEPTED by explicit user authorization.** Vitest 5.0.3 runs the domain layer; Playwright accepted-only; load tool still open | — | — |
| 2 | ~~Repository structure not approved~~ **RESOLVED** — client signed off at Task 1 authorisation | — | — |
| 3 | ~~`docs/evidence/MANIFEST.md` not written~~ **RESOLVED 2026-10-07.** `docs/evidence/MANIFEST.md` created: 13 physical artifacts (10 logical entries per plan §22.3) with SHA-256 computed from actual bytes, retention class A ("Must remain permanently", `technical_design/31` §2A), criticality and loss consequences verbatim from the authoritative documents, SQLite WAL state documented (not checkpointed; three files are an indivisible unit). Source archive verified unmodified (file count, total size, and all 13 hashes stable across the run); `git check-ignore` re-verified | — | — |
| 4 | ~~Local PostgreSQL 16 not provisioned~~ **RESOLVED 2026-10-05.** `compose.yaml` + `pgvector/pgvector:pg16` running on localhost:5433, database `maihan_dev`, all six extensions live-verified. | — | — |
| 5 | ~~Neon dev target on PG18.6~~ **RESOLVED 2026-10-05.** Client created the NEW "Maihan Gems Dev" project pinned to PostgreSQL 16.15 with database `maihan_dev`; verified live. Old PG18 project abandoned for dev (not deleted, not a target) | — | — |
| 5a | ~~PG version mismatch~~ **RESOLVED.** New dev project is PostgreSQL 16.15 — matches the 16.x contract and the Phase 0 validation baseline | — | — |
| 5b | ~~Database named `neondb`~~ **RESOLVED.** The new project's database is `maihan_dev`, matching the local contract exactly (`current_database()` verified live) | — | — |
| 5c | **Rotate the Neon credentials if not already done.** Earlier credentials were pasted into chat and treated as exposed. The client states the API key is already rotated; confirm the `neondb_owner` password was reset too, and that `.env` now holds only the new values | **Security** | Client |
| 6 | Vercel env secrets not configured | Execution | Engineering |
| 7 | OTel collector + error reporting not configured | Execution | Engineering |
| 8 | ~~Contrib extensions unconfirmed on target~~ **RESOLVED 2026-10-05.** All six verified live by `CREATE EXTENSION` on BOTH PostgreSQL 16.15 local AND the new PG 16.15 Neon project | Verification | Engineering |

**Nothing in this list requires a later phase.**

---

# Decisions Made

No implementation decisions have been made. All architecture decisions were made
during planning and are recorded in `technical_design/40` and
`.opencode/memory/DECISIONS.md`.

| Date | Decision | Recorded where |
|---|---|---|
| 2026-10-05 | `.gitignore` populated to exclude the source archive; it had been empty | This file, `.gitignore` |
| 2026-10-05 | Adopt layered persistent context via `AGENTS.md` + `.opencode/memory/`. No `opencode.json` created — `AGENTS.md` is the current official project-instruction mechanism, and an `instructions` array would have forced every memory file into every session's context, defeating the token-efficiency requirement. | `AGENTS.md` §12 |
| 2026-10-05 | Corrected two ADR cross-references in `technical_design/39` and renumbered its known-unknowns list to 1–24 | `technical_design/39` |
| 2026-10-05 (T2) | Local PostgreSQL 16 provisioned via Docker Compose on `pgvector/pgvector:pg16`; chosen because the image contains every required extension incl. `vector` 0.8.7. The plain `postgres:16-alpine` image was tested and LACKS `vector` — ruled out. Port bound to `127.0.0.1:5433` only | `compose.yaml` |
| 2026-10-05 (T2) | Dev database name fixed as `maihan_dev`; identical across environments so migration tooling is written once (`MAIHAN_DB_NAME`) | `.env.example`, `compose.yaml` |
| 2026-10-05 (T2) | `MAIHAN_ENV` discriminator added per `technical_design/29` §3 (`local` / `preview` / `staging` / `production`) for the future startup environment guard; guard itself is NOT Task 2 scope | `.env.example` |
| 2026-10-05 (T2) | Neon provisioning deferred to explicit credential handoff. Do NOT proceed without a real `NEON_API_KEY`; values are never invented (AGENTS.md prohibition 1) | This file, Blockers |
| 2026-10-05 (T4) | Migration tooling = **Drizzle Kit custom SQL migrations** applied by the Drizzle migrator (`drizzle-orm/node-postgres`), per SKILL_MATRIX tooling table ("Migration authoring — Drizzle Kit — packages/db") and doc 02. Hand-authored SQL because the DDL is ported verbatim from SoT §8, not re-derived from a TS schema. `tools/migrate` stays the Phase 2 DATA pipeline only | `packages/db/migrations/`, `packages/db/drizzle.config.ts` |
| 2026-10-05 (T4) | PostgreSQL driver = **`pg`** (node-postgres), exact-pinned with `@types/pg`. It is the portable direct-pool driver doc 29 §4 requires for migrations, and doc 03's boundary rules already name `pg` as the anticipated db-package client | `packages/db/package.json` |
| 2026-10-05 (T4) | Migration history stays in the Drizzle default `drizzle.__drizzle_migrations` so `public` holds EXACTLY the 74 locked tables — history is inspectable and separate from the schema inventory | `packages/db/src/migrate.ts` |
| 2026-10-05 (T4) | Advisory lock `hashtext('maihan-gems-ddl-migrations')` taken around the run (doc 29 §4: "concurrent attempts blocked by an advisory lock"); a pooled-endpoint host triggers a WARNING pointing at the direct endpoint | `packages/db/src/migrate.ts` |
| 2026-10-05 (T4) | 0001 runs the six `CREATE EXTENSION IF NOT EXISTS` verbatim then FAILS LOUDLY (DO block) if any of the five schema-load-bearing extensions is absent; `pg_stat_statements` warns only (doc 04 marks it optional) | `packages/db/migrations/0001_extensions.sql` |
| 2026-10-05 (T4) | `pnpm-workspace.yaml` gained `allowBuilds: esbuild: true` — pnpm 12 build-script approval for esbuild, drizzle-kit's own transitive dependency; without it a frozen-lockfile install exits non-zero. No new technology introduced | `pnpm-workspace.yaml` |
| 2026-10-05 (T5) | Schema fidelity implemented FRAMEWORK-FREE (no test framework; ADR-021 untouched): the assertion is a compiled Node CLI over the shared introspection, wired as a blocking GitHub Actions job. Doc 04's "CI asserts..." rule 1 is satisfied without choosing a runner | `packages/db/src/assert-schema.ts`, `.github/workflows/ci.yml` |
| 2026-10-05 (T5) | `introspect.ts` is the single source of counting semantics; `verify-schema.ts` (Task 4 CLI) and `assert-schema.ts` (Task 5) both consume it — verified field-by-field that the refactor changed no pre-existing value (only added `enum_members`) | `packages/db/src/introspect.ts` |
| 2026-10-05 (T5) | `expected-schema.ts` is a fidelity MIRROR of the authoritative DDL, not a schema master: a failing assertion means the migration drifted from the locked schema and is fixed via a migration/ADR, never by editing the expectation | `packages/db/src/expected-schema.ts` |
| 2026-10-05 (T5) | Fresh-database fidelity runs use a scratch database `maihan_dev_fidelity` on whatever disposable instance `DATABASE_URL` names (value-selection, never a second variable); Neon hosts are refused outright, which also covers production; scratch cleanup is unconditional | `packages/db/src/schema-fidelity.ts` |
| 2026-10-07 (T6) | **ADR-021 ACCEPTED by explicit user authorization.** Registry of record updated (`technical_design/40`); SKILL_MATRIX testing rows updated; plan §35.2/§23.4 got resolution notes. Vitest 5.0.3 installed as a devDependency OF `packages/domain` (dev-only keeps the runtime-dependency purity gate true); Playwright accepted but NOT installed; load-test tool still undecided | `technical_design/40`, `SKILL_MATRIX_AND_TOOLING.md`, `packages/domain/package.json` |
| 2026-10-07 (T6) | Task 6 implements the doc-05 value objects WITHOUT the parser (task 7) and WITHOUT the hash function (task 8): ConfigurationHash validates the `sha256:<hex>` shape only. GemRef/WeightCt/SourceSku are branded strings; struct VOs are frozen readonly factories; DomainError/InvariantError carry stable `code` properties (messages are context, codes are contracts) | `packages/domain/src/**` |
| 2026-10-07 (T6) | INV-01 at the domain layer mirrors the FULL `products_composition_ck` CASE (CONFIGURED / SETTING_ONLY / else-must-not-carry-a-setting), which doc 04 labels "INV-01 composition by kind" — not merely the CONFIGURED branch | `packages/domain/src/product/invariants.ts` |
| 2026-10-07 (T6) | Domain specs may read `package.json` with node:fs (purity gate test, doc 03 rule 3); the eslint DOMAIN_FORBIDDEN boundary got a documented spec-file exemption. Runtime domain code remains I/O-free and specs are unreachable through the exports map | `eslint.config.mjs`, `packages/domain/src/domain-purity.spec.ts` |
| 2026-10-07 (T7) | SKU grammar implemented as ONE engine with two surfaces: `parseSkuString` (canonical token, case-insensitive match + uppercase canonicalisation — the required normalisation of Example B) and `parseSkuFromSlug` (trailing-token extraction anchored at the slug end, '-'/start-bounded, per doc 34's DYO review-slug shape). Settings-slug shape handling is left to the Phase 2 parsing stage — NOT broadened here |
| 2026-10-07 (T7) | `composeSku` implemented as the doc-05 inverse of parse; the corpus gate compared BOTH slug-derived structures and composed strings against each observed SKU (V3 structural + V19 composition equality) |
| 2026-10-07 (T7) | Corpus gate reads `naturalgemstones/reverse_engineered/data/products.jsonl` ONLY after the SHA-256 matches `docs/evidence/MANIFEST.md` entry 5 — the gate validates the recorded artifact, never a path-incident substitute. The archive stays read-only and uncommitted |
| 2026-10-07 (T7) | Provenance discipline in the parser surface: the parser returns structures only; observed identities come via `parseSourceSku`, derived ones via `parseDerivedSku(URL_SLUG, parserVersion='1')`. No promotion path exists in the grammar module |
| 2026-10-07 (T8) | Configuration-hash canonicalisation is the SoT 19.2 field set with the doc-14 §2 rules realised as: keys sorted at every level, arrays sorted by their canonical-JSON string ("a stable key"), plain-JSON-only values (undefined/Map/Set/BigInt/class instances REJECTED, never silently dropped), and engraving TEXT excluded (presence only). The hash input is versioned via `hash_version` INSIDE the object; changing the canonical rule requires a version bump, never a silent rewrite |
| 2026-10-07 (T8) | Configuration slug derivation = fixed-43-digit base62 of the FULL sha256 digest (no truncation), single encoding chain with the hash so a slug and its hash can never disagree; descriptive slug tokens/URL routing stay with doc 34 and later tasks ("do not build SEO/routing systems here"). `normaliseSlug` is the shared URL-safe primitive (NFKD folding, [a-z0-9-] output) reproducing the observed '5.98ct'→'5-98ct' doc-34 shape |
| 2026-10-07 (T9) | Metals + jewellery types: the FULL authoritative enums are seeded (15 / 8) per the plan's own note, with enum-only members (R10, BROOCH, CUFFLINKS, CHARM) marked `INFERRED` and their attribute values kept pattern-consistent, never claimed as observed. This overrides doc 11's "R10 is not seeded" line per the document hierarchy (plan > td); the conflict is REPORTED, not silently fixed in doc 11 |
| 2026-10-07 (T9) | Treatments seed ONLY the three observed values with `requires_disclosure=true` (doc 11 verbatim); the other 5 enum members stay unseeded so the model can say "not recorded". `treatment_labels`/`clarity_labels` carry every verbatim source string including the D9 doubles, bound by the corpus gate to taxonomy.json (MANIFEST entry 7) and urls.jsonl (entry 2) by SHA-256 |
| 2026-10-07 (T9) | Metal slug phrases are EXTRACTED from the observed URL tokens (weight-anchored run between the weight and SKU tokens): 1:1 per code with zero conflicts, per-code URL aggregates matching the SoT §4 counts exactly. Metals sort_order ranks by observed URL counts desc, R10 (enum-only) last. Intensity/clarity `rank` values are OUR merchandising ordering (`INFERRED`: light<medium<intense<vivid<dark; eye_clean cleanest), noted in DECISIONS.md; the value rows stay OBSERVED |
| 2026-10-07 (T10) | Stage state is durable in the LOCKED `import_batches` table (batch_key = `stage:<id>`); no new table (`schema fidelity` stays exact), no process memory. Stage identities are stable strings; the 11 future catalogue stages are DECLARED with their authoritative artifact sets and refuse execution until their plan tasks land |
| 2026-10-07 (T10) | The default migration chain runs implemented stages only; declaring-but-targeting a future stage fails clearly. SHA-256 gating runs BEFORE execution and marks the failing stage FAILED with the artifact/expected/actual digest; `markFailed` is an UPSERT so a first-touch verification failure still lands durably |


---

# Files Changed

No application files. Planning-stage only.

| File | Change |
|---|---|
| `.gitignore` | Populated; was empty |
| `AGENTS.md` | Created |
| `.opencode/memory/CURRENT_STATE.md` | Created |
| `.opencode/memory/IMPLEMENTATION_STATE.md` | Created |
| `.opencode/memory/DECISIONS.md` | Created |
| `.opencode/memory/LESSONS.md` | Created |
| `.opencode/memory/SESSION_HANDOFF.md` | Created |
| `technical_design/39_GLOSSARY_AND_EVIDENCE_LEDGER.md` | ADR references corrected; list renumbered |
| **Task 1 files** | 31 files: root configs (`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json`, `tsconfig.base.json`, `eslint.config.mjs`), 8 package manifests + tsconfigs + `src/index.ts` barrels, 4 directory READMEs | Commit `1e9e26f` |
| **Task 2 files** | `compose.yaml` (local PostgreSQL 16 dev instance), `.env.example` (non-secret environment contract) | This task; see Commit section |
| **Task 1 memory** | `CURRENT_STATE.md`, `DECISIONS.md`, `IMPLEMENTATION_STATE.md`, `SESSION_HANDOFF.md` updated to record Task 1 completion and ECC harness tracking | Commit `1e9e26f` |
| **Task 4 files** | `packages/db/migrations/` (17 SQL + `meta/_journal.json`), `packages/db/src/migrate.ts` (runner), `packages/db/src/verify-schema.ts` (introspection CLI), `packages/db/drizzle.config.ts`, `packages/db/package.json` (+drizzle-orm/drizzle-kit/pg scripts), root `package.json` (+`@types/node`), `pnpm-workspace.yaml` (esbuild build approval), `pnpm-lock.yaml` | Task 4 commit |
| **Task 5 files** | `packages/db/src/introspect.ts` (NEW — shared introspection; queries extracted verbatim from verify-schema.ts + enum_members added), `packages/db/src/expected-schema.ts` (NEW — fidelity mirror), `packages/db/src/assert-schema.ts` (NEW — assertion engine), `packages/db/src/schema-fidelity.ts` (NEW — fresh-DB orchestrator), `packages/db/src/verify-schema.ts` (thin CLI, zero semantic change), `packages/db/src/migrate.ts` (runMigrations exported; CLI via direct-execution guard), `packages/db/package.json` + root `package.json` (scripts), `.github/workflows/ci.yml` (NEW), 3 memory files | Task 5 commit |
| **ADR-021 files** | `technical_design/40_ARCHITECTURE_DECISION_RECORDS.md`, `SKILL_MATRIX_AND_TOOLING.md`, `INITIAL_IMPLEMENTATION_PLAN.md` (§35.2, §23.4 resolution notes) | Task 6 commit |
| **Task 7 files** | `packages/domain/src/sku/grammar.ts` (NEW), `packages/domain/src/sku/grammar.spec.ts` (NEW, 30 tests), `packages/domain/src/sku/corpus.spec.ts` (NEW, V3+V19 corpus proof), `packages/domain/src/index.ts` (barrel export), `eslint.config.mjs` (spec exemption: env-based fixture location), 3 memory files | Task 7 commit |
| **Task 6 files** | `packages/domain/src/{errors,enums}.ts`, `packages/domain/src/value-objects/{gem-ref,money,weight-ct,dimensions-mm,source-sku,derived-sku,sku,configuration-hash,index}.ts`, `packages/domain/src/product/invariants.ts`, `packages/domain/src/testing/expect-domain-code.ts`, `packages/domain/src/index.ts`, 11 `*.spec.ts` files, `packages/domain/vitest.config.ts`, `packages/domain/package.json` (+vitest devDep + test script), root `package.json` (`test` script), `eslint.config.mjs` (spec exemption), `.github/workflows/ci.yml` (test step), `pnpm-lock.yaml`, 3 memory files | Task 6 commit |
| **Task 3 files** | `docs/evidence/MANIFEST.md` (NEW — 13 physical artifacts / 10 logical entries, SHA-256 from actual bytes, retention class A per td31 §2A, WAL state documented), 3 memory files | Task 3 commit |
| **Task 8 files** | `packages/domain/src/configuration/{canonical-configuration,hash,slug,index}.ts` (NEW), `packages/domain/src/configuration/{configuration-hash,slug}.spec.ts` (NEW, 38 tests), `packages/domain/src/index.ts` (barrel) | Commit `ef6a72b` |
| **Task 9 files** | `packages/db/src/seed/{reference-data,reference-seed}.ts` (NEW), `packages/db/src/seed/{reference-seed,reference-corpus}.spec.ts` (NEW, 15 tests), `packages/db/src/seed.ts` (NEW CLI), `packages/db/vitest.config.ts` (NEW), `packages/db/package.json` (+vitest devDep + seed/test scripts), `pnpm-lock.yaml`, `.github/workflows/ci.yml` (seed gate step) | Commit `992d14b` |
| **Task 10 files** | `tools/migrate/src/{manifest,stages,state,run,cli}.ts` (NEW), `tools/migrate/src/{manifest,run}.spec.ts` (NEW, 14 tests), `tools/migrate/src/index.ts` (real package doc + library surface), `tools/migrate/vitest.config.ts` (NEW), `tools/migrate/package.json` (+pg +vitest + scripts), `packages/db/src/index.ts` (exports the runner + seeder + seed data), `pnpm-lock.yaml`, `.github/workflows/ci.yml` (runner gate step) | Commit `22c57dd` |
| **Phase 1 close-out memory** | `.opencode/memory/*.md` (Task 8/9/10 completion, decisions, Phase 1 COMPLETE / Phase 2 OPEN) | memory commit |

---

# Tests / Verification

Tests exist for the domain layer (Task 6): 70 unit tests green under Vitest.
ADR-021 is now ACCEPTED, so the prohibition is lifted.

Verification performed during planning:

| Check | Result |
|---|---|
| Architecture live-validated against disposable PostgreSQL 16.2 | Pass — 16/16 SQL blocks |
| 40 technical design documents cross-referenced | Pass — all `doc N` refs within 1–40; all ADR refs within 001–024 |
| Plan / source-of-truth / technical-design consistency | Pass with 4 reported plan-level wording inconsistencies |
| `git check-ignore naturalgemstones` | Pass |
| Source archive unmodified | Pass — no write to `naturalgemstones/`, `crawler.sqlite` or raw HTML |
| No secrets in committed files | Pass |
| **Task 1** | `pnpm install --frozen-lockfile` Pass · `pnpm run lint` Pass · `pnpm run build` Pass · `tsc -b --dry` 8 projects Pass · 16/16 boundary violation probes detected |
| **Task 2 (local)** | PostgreSQL 16.15 verifies via `docker compose up -d` · `pg_isready` healthy · all 6 extensions live-verified by real `CREATE EXTENSION` on database `maihan_dev` · HNSW index + `vector(4)` insert + `ORDER BY embedding <=>` query smoke-tested · NUMERIC(12,4) write/read smoke-tested · `.env` verified gitignored (`git check-ignore` exit 0), `.env.example` tracked |
| **Task 2 (Neon)** | **PASS on the NEW "Maihan Gems Dev" project, via the single sanctioned `DATABASE_URL`** — `version()` = PostgreSQL 16.15; `current_database()` = `maihan_dev`; `current_schema()` = public; all six extensions confirmed via `pg_extension` (`vector 0.8.0`, `citext 1.6`, `pg_trgm 1.6`, `unaccent 1.1`, `btree_gin 1.3`, `pg_stat_statements 1.10`); HNSW + `vector(4)` smoke PASS; `NUMERIC(12,4)` smoke PASS including engine-enforced overflow rejection at 10^8; **0 application tables**; smoke objects explicitly dropped |
| **Variable contract** | **PASS** — `DATABASE_URL` is the only database variable (§29.6). Interim suffixed database URL variables (a dev/pooled pair) were removed from `.env` and `.env.example`; the old production credential was deleted from `.env` entirely. 0 occurrences of any suffixed database variable remain in the repository |
| **Production safety** | **PASS** — all operations against the new dev project only via `DATABASE_URL`; the old PG18 project and its production branch were never connected to this session, and their credentials no longer exist in `.env` |
| **Credential exposure** | **Client states the API key is rotated; `.env` now holds the new values.** Rotation of the `neondb_owner` password should be confirmed. Held only in gitignored `.env`; secret scan of tracked files and memory: 0 credential hits |
| **Secret hygiene** | **PASS** — `.env` gitignored (`.gitignore:25`) and untracked; `.env.example` scanned: 0 occurrences of `npg_`, `napi_`, or any real host credential; only non-secret identifiers retained |
| **Task 3** | `docs/evidence/MANIFEST.md` created and validated: 13 physical rows / 10 logical entries, every SHA-256 recomputed from disk and matched (0 failures), sizes match, retention class A present on every row, no duplicates, all hashes 64 lowercase hex · pre/post inventory identical (46,810 files / 3,069,038,249 B) · all 13 hashes stable within the run · `git status` silent for the archive · no temp file created inside the archive (working files in `/tmp`) · manifest secret scan 0 hits |
| **Task 4 (local)** | Clean-install: throwaway `maihan_dev_t4clean` migrated from zero (extensions created, 17/17 applied) then dropped · `maihan_dev` migrated · introspection: 74 tables, 33 enums, 94 FK, 74 PK, 59 UNIQUE, 28 CHECK + 563 NOT NULL, 263 indexes, 9 named invariants, 2 HNSW, 2 vector(1024) columns, 1 trigger, 2 functions, 1 view, 6/6 RLS, 0 policy-less · rerun no-op · failure rollback proven (tampered copy on throwaway DB: 0 objects, 0 history rows) · behavioural smoke: trigger populates+maintains `search_document`, INV-01/02/03 + `dyo_one_stone_ck` + `dyo_pair_is_earrings_ck` + `certificates_subject_ck` reject (23514), CITEXT duplicate rejected (23505), all smoke rows cleaned |
| **Task 4 (Neon)** | Same 17 migrations via the single `DATABASE_URL`: applied 17/17 on PostgreSQL 16.15 db `maihan_dev`; history 17 rows strictly increasing; rerun no-op; introspection identical to local |
| **Task 4 (fidelity)** | Local vs Neon catalog diff: MATCH on tables, enums+member counts, FKs, constraint counts, index definitions, HNSW, vector columns, trigger, functions, views, RLS tables/policies. Only extension VERSION differs (platform images: vector 0.8.7 vs 0.8.0; both ≥ 0.6 required) |
| **Task 4 (toolchain)** | `pnpm install --frozen-lockfile` PASS (esbuild build script approved) · `pnpm run lint` PASS · `pnpm run build` PASS · `npx tsc -b --dry` PASS |
| **Task 5** | Refactor equivalence: pre-refactor vs post-refactor verifier JSON identical on all pre-existing fields (only `enum_members` added; enum lists match SoT §8.3 exactly) · fresh-database fidelity PASS twice (deterministic) · negative probe: every drift class caught by exact name (unexpected table, enum member, dropped CHECK/invariant/unique constraint, missing index/HNSW/trigger/function/view, RLS policy drop → policy-less) · read-only assertion PASS on local `maihan_dev` AND Neon dev · orchestrator refuses Neon hosts · scratch cleanup unconditional (0 leftovers) · `pnpm install --frozen-lockfile` / lint / build / `tsc -b --dry` PASS · compose config valid |
| **Task 6** | `pnpm install --frozen-lockfile` PASS · lint PASS · build (tsc -b) PASS · `tsc -b --dry` PASS · **Vitest 70/70 PASS twice (11 files)** · schema fidelity re-run from zero **PASS** (migrations untouched) · domain import-graph grep: zero infrastructure imports in runtime code (only the purity spec's node:fs, exempted + documented) · negative checks: VO invalid inputs all throw stable INVALID_* codes; invariant codes asserted via property (INV-01/02/03); purity test asserts zero runtime deps |
| **Task 7** | Corpus identity: SHA-256 of `products.jsonl` == MANIFEST entry 5 digest (computed before parsing) · records: 1,245 total / 1,024 observed / 221 empty-sku (documented set, excluded from the gate) · **parsed 1,024 / 1,024 · structural mismatches 0 (V3) · composition mismatches 0 (V19) · malformed 0 · duplicate SKUs 0** · SoT aggregates: 105 cores, 35 gemRefs, 11 metals, 683 variants, 113 pairs / 911 singles · archive fingerprint identical pre/post (46,810 files / 3,069,038,249 B) · `git check-ignore -v naturalgemstones/` PASS · standalone (non-Vitest) re-validation reproduces the gate · lint/build/tsc-dry/frozen-install PASS · schema-fidelity from zero PASS · secret scan clean |
| **Task 8** | `pnpm install --frozen-lockfile` PASS · lint PASS · build PASS · `tsc -b --dry` PASS · domain suite 138/138 (26 hash + 12 slug new) · hash determinism, key-insertion-order independence, identity-field sensitivity, engraving-presence-only, frozen digest/slug examples (Example B pair + loose-stone ref), malformed rejection codes · schema fidelity from zero PASS · archive digest intact |
| **Task 9** | gates as Task 8 · packages/db 15/15 on scratch `maihan_dev_seed` (counts; 9 natural-key uniqueness checks; values incl. metals labels/purity, two-tone map, jewellery flags per SoT 8.5, disclosure on 3 treatments, unique intensity ranks; idempotency + 3rd-run stability; md5 snapshot equality) · seed CLI twice on scratch `maihan_dev_seed_gate`: run 1 inserts 70, run 2 inserts 0 · corpus spec re-derives intensities/clarities/treatments from taxonomy.json and the 14 metal phrases + 22 style slugs from urls.jsonl (SHA-256-gated; 10,772 routes reconcile) |
| **Task 10** | gates as Task 8 · tools/migrate 14/14 on scratch `maihan_dev_migrate` with disposable fixture manifest/archive copies: mismatch refusal (wrong bytes → ArtifactVerificationError, artifact+expected+actual, stage FAILED, no downstream rows), missing-artifact refusal, full chain RAN×3, simulated seed interruption resumes with zero duplicate work, pure-skip idempotency via md5 snapshots, declared stages refuse · REAL chain on scratch `maihan_dev_migrate_gate`: 13/13 manifest artifacts verified (0.89 GB, read-only), 17 migrations, 70 seeds, second run pure SKIP, status table correct · scratch dropped · production never touched |

---

# Migration Status

**DDL migrations: COMPLETE (Task 4). Data pipeline: not started (Phase 2).**

| Item | Status |
|---|---|
| `packages/db` DDL migrations | **17 applied and verified on both dev targets** |
| `tools/migrate` built | **YES (Task 10).** Resumable/hash-gated runner + 3 implemented stages + 11 declared stages; CLI `maihan-migrate` plan/run/status |
| Stages 1–8 implemented | No |
| Gates V1–V22 running | No |
| Staging tables populated | No (tables exist, empty) |
| Canonical catalogue populated | No |
| `import_batches` written | No |
| Redirects generated (44,218) | No |
| Idempotency (V17) proven | No |

**Spine rule:** migrate from `urls.jsonl`, never `products.jsonl` alone.
`products.jsonl` holds 1,245 records = 2.4% of commerce URLs and is not the
catalogue. Full detail in `AGENTS.md` §9.

---

# Do Not Redo

| Do not | Why |
|---|---|
| Restart reverse engineering | Complete and validated. 14 defects already found and documented. |
| Restart architecture or planning | Locked. 40 design documents complete. |
| Re-crawl the source | Not possible for several artefacts. Parts unreachable; some facts exist only in the captured package. |
| Re-derive the SKU grammar | Verified 1,024/1,024. The parser is written in the plan, not yet in code. |
| Re-count catalogue cardinalities | Verified and locked: 44,218 URLs, 10,349 setting variants, 19,665 stones, 3,072 pairs, 9,812 DYO, 88 ready-made, 241,961 media records. |
| Re-decide test tooling | ADR-021 is a client decision, not an implementation choice. |
| "Correct" 10,349 back to 9,484 | 9,484 was wrong; it excluded 865 silver SKUs. **10,349 is correct.** |
| Promote the 221 to observed | They stay `INFERRED`, null, `DRAFT`, unpublished. |
| Write code before approval | Requires explicit user approval per `AGENTS.md` §13. |
| Use `postgres:16-alpine` or similar for this project's dev DB | Missing `vector` extension - verified live. Only `pgvector/pgvector:pg16` (or an image with equivalent extension set) satisfies the locked schema's `vector(1024)` + HNSW requirement |
| Re-provision local Postgres outside Docker Compose | Compose file exists; single source of truth for the local instance |
| Expose port 5433 to anything except 127.0.0.1 | A dev DB with a throwaway password must never be network-reachable |
| Substitute a fake Neon connection string | BLOCKED is the answer, not a placeholder |
| Hand-edit the migrated schema on a dev target | "Staging drift is rebuilt from migrations, never hand-patched" (doc 29 §9). Any change = a new migration |
| Regenerate/replace the 17 Task 4 SQL files from a Drizzle TS schema | They are the verbatim port of the validated DDL; a TS schema mirror is a separate later task (E1.2) and must diff against these |
| Put seed data into migrations | Migrations are DDL only; seeds are plan task 9 (separate files/runners) |
| Re-derive or 'improve' the SKU grammar | Validated 1,024/1,024 (V3+V19); the grammar is SoT §1.1 verbatim — changes require re-validation against the corpus and an evidence note |
| Validate the parser against `naturalgemstones/exports/products.jsonl` | That path is class-B redundant per td31 §2B and NOT the manifest artifact — the gate binds to MANIFEST entry 5 by checksum |
| Copy corpus files into the repository | NFR: evidence stays out of Git; the manifest + checksum make provenance checkable |
| Modify `naturalgemstones/` in any way — including checkpointing `crawler.sqlite`'s WAL | The archive is read-only evidence. The WAL checkpoint td31 requires must run on a disposable COPY, never in place |
| Copy checksums from a manifest instead of recomputing them | Manifest digests are only trustworthy when recomputed from the actual files; re-verify before relying on them |
| Treat `exports/products.jsonl` or `architecture/taxonomy/taxonomy.json` as the canonical artifacts | `reverse_engineered/data/products.jsonl` (929 KB) and `data/taxonomy.json` (26 KB) are canonical per plan §22.3 / td31 §2A; the others are class-B redundant |
| Rework Task 8's canonical form outside a deliberate hash-version bump | The canonical representation + slugs are FROZEN by explicit digest examples; changing them silently re-idents every existing configuration (tested gate) |
| Re-derive seed values outside the corpus gate | Seed constants are provenance-commented and SHA-256-gate-verified against the archive at test time; edits must carry evidence |
| Pre-digest any referenced artifact's hash | Manifest digests are always re-computed from actual bytes by the runner |
| Implement the declared future migration stages now | They are explicitly DECLARED and refused; catalogue migration is Phase 2 plan tasks 11-20 |
| Re-run seeds with destructive replace instead of ON CONFLICT DO NOTHING | Idempotency contract: second run changes zero rows (V17 spirit) |

---

# Source Data Dependencies

Implementation cannot proceed past Phase 1 task 1 without environment access.
Phase 2 requires the archive.

| Artefact | Size | Needed for | If lost |
|---|---|---|---|
| `crawler.sqlite` (+ `-wal`, `-shm`) | 159 MB + 26 MB | Schema cross-check, regeneration | Cannot re-derive without a re-crawl |
| `urls.jsonl` | 30.5 MB | **The migration spine.** 44,218 URLs incl. 33,934 absent from `products.jsonl` | **Catalogue unrecoverable** |
| `specifications.jsonl` | 4.9 MB | 13 attribute fields, D9 concatenated values | **Attributes unrecoverable** |
| `pages_analyzed.jsonl` | 468 MB | **Only** source of price, availability, JSON-LD | **All 1,024 prices permanently lost** |
| `products.jsonl` | 929 KB | Observed SKU ground truth for gates V3, V19 | Cannot validate the parser |
| `media_analyzed.jsonl` | 179 MB | Asset URL inventory, host + path stem | Asset classification impossible |
| `taxonomy.json` | 26 KB | Reference-data seeding, normalizer validation | Facet seeding loses its evidence basis |
| `entities/media/{report,appraisal}.json` | 63 KB | Only structured evidence certificate artefacts exist | Certificate seed lost |
| `source_snapshots/manifest.jsonl` | 24 MB | HTML SHA-256 for re-crawl integrity | Cannot prove a re-crawl is faithful |
| `raw_html` (1,024 real files) | 1.4 GB | DOM ground truth; deferred use | Lost unless archived |

**Currently available in this environment** (`naturalgemstones/`, 46,810 files,
3,069,038,249 bytes — verified 2026-10-07, hashes recorded in
`docs/evidence/MANIFEST.md`). **Will be absent** in a fresh clone or Codespace.
That is expected.

**WAL note (observed 2026-10-07, byte-level):** the `-wal` is present and
non-empty (26,157,912 B ≈ 6,349 frames) and is **not verifiably checkpointed**;
the `-shm` is a stale index that does not correspond to it. The 26 MB `-wal` may
hold committed rows absent from the main file, so the three files must be
restored and used together. Any checkpoint must run on a disposable copy — the
archive itself is never modified.

**If a task requires any of these and they are unavailable:** stop, report that
the source archive must be made available, and do not synthesise a substitute.

---

# Technical SRS Deliverable (2026-10-08)

Created `docs/MAIHAN_GEMS_TECHNICAL_SRS.md` as the CTO-facing technical
requirements layer. It records the approved target baseline separately from
implementation status, preserves source evidence labels and domain
invariants, and identifies unresolved scope/architecture decisions.

Documentation only: no implementation phase advanced and no migration
completion or full-corpus V1–V22/V17 result was asserted. The SRS records the
discrepancy between the migration status above and additional uncommitted
stage code in the current working tree; reconcile and validate that code
before updating the Phase 2 completion status.

## AI Gemologist SRS scope update (2026-10-08)

Updated the Technical SRS and client-facing SRS to define the AI as a
customer-facing Gemologist experience, not a generic chatbot: grounded
gemstone guidance, real catalogue-backed product cards, comparisons, and
guided DYO using existing eligible catalogue items. Compatibility, price, and
availability remain deterministic application decisions. AI-generated
jewellery imagery, 3D models, and manufacturing-ready bespoke designs are
excluded unless separately approved. This is a requirements update only; the
AI feature remains unimplemented.

The Technical SRS was also reconciled with the later Phase 2 completion record
below: V1–V22 and deep V17 passed on `maihan_dev`; Phase 3 remains not started.
---

# GT20 COMPLETE — Phase 2 CLOSED (2026-10-08)

**Phase 2 final validation is GREEN.** All 22 gates PASS against the real
corpus on `maihan_dev`; V17 (deep idempotency) re-executes every implemented
stage under its own import batch and the 18-table canonical digest is
unchanged (`43c113e9…`). Commit: `feat(migrate): complete phase 2 migration gates`.

## What GT20 added

- **`compatibility` stage** — 1,024 EXTRACTED ALLOW rules from the observed
  (setting, stone) pairs (105 designs, 152 distinct rules, 0 DENY, no
  colour/shape/weight bounds invented; every rule traceable to its source
  page). Conflict ledger audited: 328 rows, all UNRESOLVED, provenance
  complete, disagreement scans added (0 new).
- **`verify-gates` stage** — the V1–V22 runner + V17 + final census +
  provenance audit. Notable V-passes: V1 19,666/19,666; V2 3,077/3,077; V3
  1,024/1,024; V8 113/113; V14 exact spine reconciliation (44,218/10
  families); V21 0 unresolved with the 42 DYO-only variants correctly held
  INFERRED.

## Blockers resolved this session

1. **crawler.sqlite archive drift** (GT17 census read opened the SQLite file
   read-write → WAL checkpoint). Logical content proven equal to every SoT
   baseline; no backup existed; resolved by the explicit, evidence-preserving
   **Amendment A2** in `docs/evidence/MANIFEST.md` §10 (original digests
   retained verbatim). Lesson recorded in `LESSONS.md` §18: archive SQLite
   reads must use immutable/read-only URIs.
2. **parse-slugs conflict rebuild** broke physical idempotency (delete +
   reinsert = new UUIDs/timestamps). Fixed with content-guard inserts; the
   DELETE is gone (artifact digests are manifest-gated, so content drift
   halts before any stage).
3. **verify-gates V17** re-executes each stage under ITS OWN import batch
   id — re-running under a fresh batch would duplicate
   `(import_batch_id, source_url)`-keyed staging rows instead of proving
   idempotency.

## Final census (maihan_dev, 2026-10-08)

stones 19,693 · pairs 3,072 · gemstone_stones 40 · settings 964 (951
EXTRACTED + 13 INFERRED) · setting_variants 10,391 (10,349 + 42 INFERRED) ·
configured 9,812 (1,024 OBSERVED + 8,788 INFERRED) · ready_made 88 ·
derived-only DYO 221 · price_entries 1,707 (1,024 OBSERVED + 683 INFERRED) ·
price_model_observations 1,024 · media 16,906 assets (15,582 PENDING + 1,324
SKIPPED) · certificates 1,135 (all UNVERIFIED) · redirects 44,218 (301×43,539
/ 200×357 / 302×4 / 410×318) · compatibility 1,024 · staging_conflicts 328
(all unresolved) · staging_source_pages 44,218 · staging_parsed_urls 44,218.

## Phase status

**PHASE 1 — COMPLETE. PHASE 2 — COMPLETE (all gates green, committed).
PHASE 3 — NOT STARTED.**

## Client-facing Technical SRS

Revised `docs/MAIHAN_GEMS_TECHNICAL_SRS.md` to version 1.2 for FKodelabs to
submit to Maihan Group. The document emphasizes the AI Gemologist experience,
uses functional and architecture language, clarifies the configured-jewellery
composition constraints, and omits repository progress and implementation
identifiers from the client-facing text. Markdown structure and seven Mermaid
diagrams were checked.
