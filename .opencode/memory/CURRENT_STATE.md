# CURRENT STATE

**Last verified:** 2026-10-05
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
| Tasks 3, 7-9 | Not started. Task 3 needs `naturalgemstones/`, ABSENT from this Codespace. Next per plan: **Task 7** (SKU grammar parser, 1,024/1,024 against the corpus) — **BLOCKED: Task 7 depends on Task 6 (done) but needs the corpus from `naturalgemstones/` for its completion gate** |
| Coding status | Tasks 1, 2, 4, 5 and 6 authorised and executed per scope. Further tasks need their own approval |
| Blocking approval | **ADR-021 (test tooling)** blocks Task 6 onward and the Phase 1 exit gate |

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
| 2 | **`docs/evidence/MANIFEST.md` not written** | Execution. No dependency; can start immediately. **Also needs `naturalgemstones/`, ABSENT from this Codespace** | `MIGRATION_ENGINEER` |
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

---

## 9. Next major action

1. Task 5 — COMPLETE 2026-10-07 (schema-fidelity CI assertion; fresh-database
   run green; workflow `.github/workflows/ci.yml` blocking).
2. Task 6 — COMPLETE 2026-10-07 (domain value objects + INV-01/02/03 predicates;
   70 unit tests green, framework-free lint boundaries intact; ADR-021 accepted
   and Vitest installed).
3. Task 7 — SKU grammar parser (depends on Task 6, now done). Its completion
   gate (1,024/1,024 against the observed corpus) REQUIRES `naturalgemstones/`,
   absent from this Codespace — the parser may be built, but Task 7 cannot be
   declared done until the corpus is available or the gate is re-scoped.
4. Task 3 (`docs/evidence/MANIFEST.md`) remains NOT STARTED — requires the
   source archive, absent from this Codespace.

**Do not begin a task without explicit user approval.**