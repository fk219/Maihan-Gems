# CURRENT STATE

**Last verified:** 2026-10-10
**Repository:** `Maihan-Gems` — https://github.com/fk219/Maihan-Gems.git
**Branch:** `main`
**Baseline commit:** `7a3f3c9` — *chore: establish architecture baseline*

---

## 1. Artifact status

| Artifact | Status | Notes |
|---|---|---|
| Reverse-engineering package | **READY** | Validated, closed. Do not restart. |
| Architecture lock | **LOCKED** | Validated by live execution against a disposable PostgreSQL 16.2 instance: 16 SQL blocks, 262 statements, 16/16 OK. 11 Phase 0 defects found and fixed. |
| `PROJECT_SOURCE_OF_TRUTH.md` | **READY** | Rank 1 authority |
| `INITIAL_IMPLEMENTATION_PLAN.md` | **READY** | 13 phases; MVP chain 1→6 |
| `technical_design/` | **READY** | 40 of 40 documents complete and cross-validated |
| `SKILL_MATRIX_AND_TOOLING.md` | **READY** | Status: **NOT READY** for coding — see §5 |
| `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` | **READY** | Vision and charter authority |
| `.opencode/memory/` | **READY** | This persistent context layer |

---

## 2. Architecture lock — validated numbers

Locked counts below were **re-produced by the Task 4 migrations** on both dev
targets on 2026-10-05 (see §3 and IMPLEMENTATION_STATE.md). The one number that
needed interpretation is the CHECK count: the migrated DDL holds **28 CHECK
constraints plus 563 NOT NULL column constraints = 591** — the documented 591
counts both classes (PG17-style introspection counts NOT NULL in
`pg_constraint`; PG16 keeps it in `pg_attribute`).

| Object | Count |
|---|---|
| Tables | 74 |
| Enums | 33 |
| Foreign keys | 94 (graph provably acyclic; deferred `dyo_configurations_customer_fk` applied in migration 0009) |
| CHECK constraints | 28 pg_constraint CHECKs (+ 563 NOT NULL columns = 591 documented) |
| UNIQUE constraints | 59 |
| Indexes | 263 (12 GIN, 2 HNSW) |
| Named invariant constraints | 9 (+ `discounts_code_ck`, present but not counted among the 9) |
| RLS tables / policies | 6 / 6 (0 policy-less) |
| Triggers | 1 (`gemstones_search_document_fn`) |
| Views | 1 (`certificate_public`) |
| Functions | 2 (`match_knowledge_chunks`, `gemstones_search_document_fn`) |
| Validation gates | V1–V22 |
| NFRs | NFR-01 … NFR-15 |
| Invariants | INV-01 … INV-10 |
| ADRs | 21 Accepted (001–021; ADR-021 accepted 2026-10-07 by explicit user authorization) + 3 Proposed (022–024) |

**Task 6 domain facts now enforced in code:** INV-01 (full `products_composition_ck` semantics), INV-02, INV-03 as pure predicates in `packages/domain`; the ten doc-05 value objects implemented (configuration-hash validates the `sha256:<hex>` shape only — the hash function itself is plan task 8).

**Tasks 7-10 facts now enforced in code:** the SKU grammar parser (version '1',
1,024/1,024 on the corpus); the SoT 19.2 canonical configuration
representation with `computeConfigurationHash` (hash_version inside the
object) and the base62 configuration slug plus `normaliseSlug`; the 70-row
reference vocabulary seeded idempotently (15 metals / 8 jewellery types /
22 setting styles / 3 treatments + 5 labels / 5 intensities / 5 clarities +
7 labels); the resumable, hash-gated `tools/migrate` runner over the locked
`import_batches` state with 3 implemented + 11 declared stages.

**Extension availability gap: CLOSED.** All six extensions are live-created by
migration 0001 on a pristine local database and verified present on the Neon
dev project. Local image ships `vector` 0.8.7; the Neon image ships `vector`
0.8.0 — both ≥ the 0.6+ architecture requirement and both produce identical
vector columns and HNSW definitions (verified by catalog diff).

---

## 3. Implementation status

**Workspace skeleton, dev databases and the ordered DDL migrations exist.
ZERO application code beyond the skeleton + migration tooling.** No Drizzle TS
schema, no domain models, no repositories, no tests, no seeders.

| Item | Status |
|---|---|
| Current phase | **Phase 1 — Database + Domain Foundation. IN PROGRESS.** |
| Task 1 — workspace skeleton | **COMPLETE.** Exit gate PASS, committed `1e9e26f` |
| Task 2 — database infrastructure | **COMPLETE.** Local PostgreSQL 16.15 (`maihan_dev`) AND new Neon project "Maihan Gems Dev" (PostgreSQL 16.15, `maihan_dev`, schema public) — both with six extensions, HNSW + NUMERIC smoke PASS, 0 application tables. Old PG18 project abandoned for dev; production never touched. `DATABASE_URL` is the single sanctioned database variable (§29.6) |
| Task 4 — ordered DDL migrations | **COMPLETE (2026-10-05).** 17 migrations (doc 04 ordering) in `packages/db/migrations/`; applied cleanly from a pristine local database AND on the Neon dev database; introspection matches every documented count (74 tables, 33 enums, 94 FKs, 59 UNIQUE, 28 CHECK + 563 NOT NULL = the documented 591, 263 indexes, 9 named invariants, 2 HNSW, 1 trigger, 2 functions, 1 view, 6/6 RLS); local vs Neon schema metadata identical. Committed in the Task 4 commit |
| Task 5 — schema-fidelity CI assertion | **COMPLETE (2026-10-07).** Framework-free (ADR-021 untouched): `packages/db/src/assert-schema.ts` asserts the locked schema exactly (counts + exact names/definitions) over the SHARED introspection (`packages/db/src/introspect.ts`, semantics identical to Task 4's verifier); `packages/db/src/schema-fidelity.ts` orchestrates fresh-database runs (scratch `maihan_dev_fidelity` created, migrated from zero, asserted, ALWAYS dropped; refuses Neon hosts); CI command `pnpm run schema-fidelity` + blocking GitHub Actions workflow `.github/workflows/ci.yml` reusing the committed compose.yaml. Fresh-database run PASS (twice — deterministic); negative probe proved every drift class is caught by name; read-only assertion also PASS on local `maihan_dev` and Neon dev |
| **ADR-021 (test tooling)** | **ACCEPTED 2026-10-07 by explicit user authorization.** Vitest 5.0.3 = unit/domain/integration/contract runner (installed for the domain layer); Playwright accepted for E2E, NOT installed (no phase requires it yet); load-test tool remains OPEN (never part of ADR-021's decision) |
| Task 6 — domain value objects + INV-01/02/03 | **COMPLETE (2026-10-07).** Pure `packages/domain`: error model, enum unions (product_kind/jewellery_type/gemstone_kind/metal_code/evidence_status), value objects (GemRef, Money, WeightCt, DimensionsMm, SourceSku, DerivedSku + ProductIdentity union, Sku composite, ConfigurationHash shape), INV-01/02/03 predicates + `assertComposition`. ZERO runtime dependencies. 70 Vitest tests green (11 files); lint/build/tsc green; schema fidelity still PASS |
| Task 3 — evidence manifest | **COMPLETE (2026-10-07).** `docs/evidence/MANIFEST.md`: 13 physical artifacts implementing the 10 authoritative logical entries of plan §22.3; every SHA-256 computed from the actual archive bytes during the run (0 failures, 0 duplicates, all 64 lowercase hex); retention class **A — "Must remain permanently"** (`technical_design/31` §2A) with the §22.3 operational requirements; criticality and loss consequences verbatim from the authoritative documents; `crawler.sqlite`/`-wal`/`-shm` as separate rows under one logical artifact; `report.json`/`appraisal.json` hashed separately; canonical-vs-redundant path disambiguation (`exports/products.jsonl` = class B per td31 §2B); SQLite WAL state documented byte-level (not checkpointed; three files are one indivisible unit; checkpoint only ever on a disposable copy); source archive proven unmodified; secret scan 0 hits |
| Task 7 — SKU grammar parser | **COMPLETE (2026-10-07).** `packages/domain/src/sku/grammar.ts` — the SoT §1.1 grammar (version '1'): SETTING / CONFIGURED / READY-MADE via `parseSkuString` + `parseSkuOrThrow` (precise INVALID_SKU reasons), `parseSkuFromSlug` (Example B trailing-token derivation, case-canonicalising) and `composeSku` (doc-05 inverse); provenance split preserved (observed → `parseSourceSku`; slug → `parseDerivedSku` URL_SLUG/grammar-1). **Corpus gate V3+V19: 1,024 / 1,024, 0 mismatches, 0 malformed** on `naturalgemstones/reverse_engineered/data/products.jsonl` (MANIFEST entry 5; SHA-256 cross-checked read-only). SoT-verified aggregates reproduced exactly: 105 cores, 35 gemRefs, 11 metals, 683 variants, 113 pairs / 911 singles, 0 duplicate SKUs. 100 tests / 13 files green (30 new); archive fingerprint identical pre/post (46,810 files / 3,069,038,249 B) |
| Task 8 — configuration hash + slug derivation | **COMPLETE (2026-10-07).** `packages/domain/src/configuration/`: SoT 19.2 / doc-14 §2 canonical representation + `computeConfigurationHash` + base62 configuration slug + `normaliseSlug`; 38 tests with 10 frozen examples; commit `ef6a72b` |
| Task 9 — reference data seeds | **COMPLETE (2026-10-07).** `packages/db/src/seed/` + CLI; 70 idempotent rows (15/8/22/3+5/5/5+7); evidence-bound corpus gate against taxonomy.json + urls.jsonl (SHA-256-gated); 15/15 package tests; commit `992d14b` |
| Task 10 — `tools/migrate` | **COMPLETE (2026-10-07).** `maihan-migrate` plan/run/status; durable stage state over `import_batches` (locked schema); SHA-256 gating vs `docs/evidence/MANIFEST.md`; 3 implemented + 11 declared stages; mismatch/resume/idempotency test-frozen; real 13-artifact chain executed read-only and re-run as pure skip; commit `22c57dd` |
| Coding status | **Tasks 1-10 authorised and executed per scope; PHASE 1 COMPLETE.** Phase 2 needs its own authorisation (next: the extract stage per the plan's task numbering) |
| Blocking approval | **None for Phase 1.** ADR-021 ACCEPTED (2026-10-07). ADR-022/023/024 remain Proposed — **ADR-024 gates Phase 2's provenance model; it is unchanged and NOT resolved by Phase 1** |

---

## 4. GitHub repository state

| Item | Value |
|---|---|
| Remote | `origin` → `https://github.com/fk219/Maihan-Gems.git` |
| Branch | `main` |
| Commits | 2 after the persistent-context commit |
| Tracked files | 45 planning documents + `.gitignore` + `AGENTS.md` + `.opencode/memory/` |
| Source archive | **Never committed. Ignored by `.gitignore`.** |

---

## 5. Source archive

| Item | Value |
|---|---|
| Path | `naturalgemstones/` |
| Present in this environment | **Yes** — 46,810 files |
| In Git | **No. Intentionally excluded.** |
| `.gitignore` status | Fixed 2026-10-05. It was **empty**, which left the archive untracked-but-not-ignored. Now correctly ignored and verified with `git check-ignore`. |
| On a fresh clone / Codespace | **Will be absent. This is expected and correct.** |
| Restoration | Out of band, from durable storage |

---

## 6. Current blockers

| # | Blocker | Type | Resolvable by |
|---|---|---|---|
| 1 | ~~ADR-021 test tooling unresolved~~ **RESOLVED 2026-10-07 — ACCEPTED by explicit user authorization.** Vitest installed for the domain layer (5.0.3); Playwright accepted, not installed; load-test tool still open (not part of the decision) | — | — |
| 2 | ~~`docs/evidence/MANIFEST.md` not written~~ **RESOLVED 2026-10-07.** Created and validated (13 physical artifacts / 10 logical entries, SHA-256 from actual bytes, retention class A). The archive is now present, and the manifest doubles as the evidence ledger for Task 7's corpus gate | — | — |
| 3 | Repository structure approved | APPROVED — client signed off at Task 1 | — |
| 4 | ~~Local PostgreSQL 16 not provisioned~~ **RESOLVED 2026-10-05.** 16.15 via `compose.yaml`, six extensions live-verified | — | — |
| 5 | ~~Neon dev target on the wrong major version~~ **RESOLVED 2026-10-05.** New "Maihan Gems Dev" project, PostgreSQL 16.15, db `maihan_dev`; Task 4 migrated it | — | — |
| 6 | Vercel env secrets not configured | Execution | Engineering |
| 7 | OTel collector + error reporting not configured | Execution | Engineering |
| 8 | ~~Contrib extension availability~~ **RESOLVED 2026-10-05.** Migration 0001 creates all six on a pristine local DB; all six verified on Neon dev | — | — |
| 9 | **Exposed Neon credentials not rotated** | **Security.** The connection string and API key were pasted into the chat transcript and are treated as compromised. Stored only in gitignored `.env`; verified absent from all tracked files. The API key cannot rotate itself (rejected as an organization key), so rotation needs the console | **Client action** |
| 10 | ~~Neon dev database naming~~ **RESOLVED.** New project's database is `maihan_dev` | — | — |

**ADR-021 is the only true design blocker.** Everything else is provisioning or
approval, and nothing requires a later phase.

---

## 7. Unresolved decisions

| Decision | Blocks | Owner |
|---|---|---|
| ~~ADR-021 test tooling~~ **ACCEPTED 2026-10-07 by explicit user authorization** | ~~Phase 1 task 6~~ — | — |
| ADR-022 design-system primitives | Phase 4 | Client |
| ADR-023 AI evaluation harness | Phase 9 | Client |
| ADR-024 provenance storage design | Phase 2 | Client |
| Payment provider | Phase 6 | Client |
| Tax treatment | Phase 6, before production | Client |
| Shipping carriers and rates | Phase 6, before production | Client |
| Discount policy | Phase 6, before production | Client |
| Refund policy | Phase 6, before production | Client |
| Vision/OCR model | Phase 8 | Client |
| Email provider | Phase 6 notifications | Client |
| Jurisdiction / statutory retention | Compliance | Client |

ADR-021 to ADR-024 are **Proposed, not Accepted.** A proposal names candidates;
it does not authorise installation.

---

## 8. Known plan-level inconsistencies

Found during cross-validation. **Reported, not fixed**, because fixing them
requires editing the authoritative plan.

| # | Issue | Severity |
|---|---|---|
| 1 | ~~Plan §35.2 says "no technology has been chosen" while ADR-021 names Vitest and Playwright as *proposed*~~ **RESOLVED 2026-10-07**: ADR-021 ACCEPTED and a resolution note was appended to plan §35.2 and §23.4, pointing at `technical_design/40` as the register of record | — |
| 2 | Plan task 9 seeds "15 metals, 8 jewellery types"; observed counts are 14 metal codes and 5 jewellery types (`R10` is enum-only) | Low |
| 3 | Plan says "thirteen" AI evaluation dimensions in three places; source of truth and `technical_design/32` both enumerate **fourteen** | Low |
| 4 | Plan §35 and `technical_design/02` both use pre-ADR-022 wording for the design system | Informational |
| 5 | Doc 11 lists the observed intensities as "`Medium, Pale, Vivid, Deep, Light`" while the artifact it cites (`color_intensity_help` → taxonomy.json, MANIFEST entry 7) holds `Intense, Medium, Light, Vivid, Dark` (+3 D9 doubles). **The artifact wins; the seed uses the artifact values; reported, not fixed in doc 11** | Low |
| 6 | Doc 11 says "`R10` ... has no observed data and is not seeded" while plan task 9 explicitly counts **15 metals = the full enum** (plan > td). Seeds insert the full enum with R10 marked `INFERRED`; reported, not silently reconciled | Low |
| 7 | Doc 11: "`setting_styles` 18 families (22 slugs)" — 15 base styles + 7 pendant variants reconcile exactly against the archive (10,772 settings routes), but the 18-family mapping is not derivable from the enumerated evidence (pendant variants merge to 15, distinct slugs give 22). `setting_styles` has no family column, so nothing in the locked schema can represent the grouping either | Informational |

---

## 9. Next major action

1. Task 5 — COMPLETE 2026-10-07 (schema-fidelity CI assertion; fresh-database
   run green; workflow `.github/workflows/ci.yml` blocking).
2. Task 6 — COMPLETE 2026-10-07 (domain value objects + INV-01/02/03 predicates;
   70 unit tests green, framework-free purity intact; ADR-021 accepted and
   Vitest installed).
3. **Task 7 — COMPLETE 2026-10-07**: SKU grammar parser + the V3/V19 corpus gate
   at **1,024/1,024 with 0 mismatches, 0 malformed**, evidence cross-checked
   against MANIFEST entry 5 (SHA-256 verified read-only); archive untouched.
4. Task 3 — COMPLETE 2026-10-07 (manifest exists and validated).
5. **Tasks 8, 9, 10 — COMPLETE 2026-10-07** (commits `ef6a72b`, `992d14b`,
   `22c57dd`). **PHASE 1 IS COMPLETE.**
6. **PHASE 2 IS OPEN.** Next task per `INITIAL_IMPLEMENTATION_PLAN.md`:
   global tracker task 11 — "Implement the extract stage: load `urls.jsonl`
   verbatim into `staging_source_pages`" (44,218 rows unchanged) = Phase 2
   detailed task 3 under epic E2.1. **Do not begin without explicit user
   approval.** ADR-024 (provenance storage) remains PROPOSED and gates the
   provenance model of Phase 2; ADR-022/023 unchanged.