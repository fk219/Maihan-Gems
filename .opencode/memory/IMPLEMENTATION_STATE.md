# IMPLEMENTATION STATE

**Last updated:** 2026-10-05
**Update this file after every meaningful implementation task.**

---

# Current Phase

**Phase 1 — Database + Domain Foundation. IN PROGRESS.**

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

**Task 3 COMPLETE (2026-10-07) — migration evidence manifest. Task 7 is next.**

| Check | Result |
|---|---|
| Manifest location | `docs/evidence/MANIFEST.md` (the path plan §22.3 and doc 03 both prescribe) |
| Logical entries | **10 / 10** authoritative entries of `INITIAL_IMPLEMENTATION_PLAN.md` §22.3 |
| Physical files hashed | **13** — `crawler.sqlite` + `-wal` + `-shm` as three separate rows under one logical artifact; `report.json` + `appraisal.json` hashed separately |
| SHA-256 | 13/13 computed from actual archive bytes this run, 64 lowercase hex, 0 failures, 0 duplicates |
| Retention class | **A — "Must remain permanently"** (`technical_design/31` §2A; the authoritative terminology, not an invented label) with the §22.3 operational requirements: durable external storage, reachable read-only at import, checksum-verifiable, excluded from Git |
| Criticality / loss consequences | Preserved verbatim from plan §22.3 and td31 §2A — the two single points of irreversible loss (`pages_analyzed.jsonl` → all 1,024 prices; `urls.jsonl` → 33,934 commerce URLs) stated exactly as documented |
| Path disambiguation | `reverse_engineered/data/products.jsonl` (929 KB) is canonical; `exports/products.jsonl` documented as class-B redundant (td31 §2B), not a manifest entry |
| SQLite WAL state | **Not checkpointed** — byte-level inspection only (no SQLite library invoked, no `PRAGMA wal_checkpoint`); `-wal` is 26 MB ≈ 6,349 frames; `-shm` header does not correspond to the current WAL (stale index) so checkpoint progress is undeterminable from bytes. Documented: the three files must be retained and restored as one indivisible unit, and any checkpoint must run on a disposable copy, never in place |
| Source archive safety | Read-only throughout. File count (46,810) and total size (3,069,038,249 B) identical pre/post; all 13 hashes stable within the run; `git status` reports nothing for the archive; no temp file created inside it (working files in `/tmp`) |
| Git exclusion | `git check-ignore -v naturalgemstones/` → `.gitignore:19:/naturalgemstones` |
| Secret scan | **0** secret-bearing strings in the manifest (relative paths, digests, sizes, retention metadata only) |
| Scope | `docs/evidence/MANIFEST.md` is the ONLY substantive change; no migrations/schema/domain/test/Task-7 work |

**Next task: Task 7** — SKU grammar parser + 1,024-record corpus validation. The
corpus (`naturalgemstones/reverse_engineered/data/products.jsonl`) is now
present in this environment, so Task 7's completion gate is reachable.
| lint / build / tsc --dry / install --frozen-lockfile | PASS / PASS / PASS / PASS |
| Task 5 schema fidelity | **STILL PASS** from zero (fresh scratch, 17 migrations) — no migration touched |
| CI | `Domain unit tests` step added to `.github/workflows/ci.yml` between Build and Schema fidelity; E2E/Playwright deliberately absent |

---

# Status

| Item | State |
|---|---|
| Phase 1 | **Started. Tasks 1, 2, 3, 4, 5 and 6 complete.** Tasks 7-10 not started |
| Application code | **None exists beyond the domain foundation.** Workspace skeleton + migrations + pure domain layer + evidence manifest |
| Database migrations | **17 ordered DDL migrations, applied and verified on both dev targets** (Task 4) |
| Schema-fidelity gate | **Blocking CI assertion, green on fresh databases** (Task 5) |
| Domain layer | **Pure value objects + INV-01/02/03 with zero runtime dependencies** (Task 6) |
| Tests | **70 unit tests green (packages/domain).** Vitest per ADR-021 (ACCEPTED 2026-10-07) |
| Repository / workspaces | **EXISTS.** 8 packages, 9 workspace projects, pnpm 12.3.4 |
| CI | **EXISTS.** `.github/workflows/ci.yml`: lint → build → domain tests → schema fidelity on a disposable fresh PostgreSQL 16 |
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
| **Phase 1 Task 3 — migration evidence manifest** | **COMPLETE 2026-10-07.** `docs/evidence/MANIFEST.md`: 13 physical files / 10 logical entries per plan §22.3; every SHA-256 computed from the actual archive bytes during the run (0 failures, 0 duplicates, 64-lowercase-hex); retention class **A — "Must remain permanently"** (`technical_design/31` §2A) with the §22.3 operational requirements; criticality + loss consequences verbatim from the authoritative documents; `crawler.sqlite`/`-wal`/`-shm` as separate rows under one logical artifact; `report.json`/`appraisal.json` hashed separately; canonical-vs-redundant path disambiguation recorded (`exports/products.jsonl` = class B per td31 §2B); WAL state documented byte-level (**not checkpointed**, no SQLite library invoked, three files are one indivisible unit, checkpoint only ever on a disposable copy); archive proven unmodified (46,810 files and 3,069,038,249 B identical pre/post, all 13 hashes stable, `git status` silent, no temp file inside the archive); secret scan 0 hits |
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
| 3 | Write `docs/evidence/MANIFEST.md` recording storage location, SHA-256 and retention class of every migration-critical file | 1 | — | All ten entries present with verified checksums |
| 4 | Port the validated DDL into ordered migrations, one logical unit per source-of-truth schema subsection | 1 | 2 | Applies cleanly on a clean database — **DONE** |
| 5 | Assert schema fidelity in CI: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariant constraints, 6 RLS policies with 0 policy-less tables, 2 HNSW indexes, 1 trigger, 1 view, 2 functions | 1 | 4 | Introspection test green against a fresh database — **DONE** (framework-free assertion + blocking workflow) |
| 6 | Implement the domain value objects and INV-01, INV-02, INV-03 as pure predicates | 1 | 4 | Unit tests green; no infrastructure imports — **DONE** (70 Vitest tests; zero runtime dependencies) |
| 7 | Implement the SKU grammar parser with the validated regex and prove it against the 1,024-record corpus | 1 | 6 | 1,024/1,024 match, 0 mismatches (gates V3, V19) |
| 8 | Implement the configuration-hash function and slug derivation | 1 | 6 | Deterministic; property tests green |
| 9 | Seed reference data: 15 metals, 8 jewellery types, setting styles, treatments, intensities, clarities | 1 | 4 | Seeds idempotent; counts asserted |
| 10 | Build `tools/migrate` with resumable, idempotent stage execution and per-artifact SHA-256 gating | 2 | 9 | Refuses to run on hash mismatch |

**Note on task 9.** "15 metals, 8 jewellery types" are **enum member counts**.
Observed counts are 14 metal codes and 5 jewellery types. `R10` is enum-only and
is recorded as absent from all evidence. Insert the full enum; do not describe
these counts as observed.

Tasks 1, 2 and 3 have no prior dependency. Tasks 4–9 complete Phase 1. Task 10
opens Phase 2.

---

# Blockers

| # | Blocker | Type | Resolvable by |
|---|---|---|---|
| 1 | **ADR-021 test tooling unresolved.** Plan task 6's completion criterion is "unit tests green". Plan §23.4 forbids selecting a runner. | **Approval** | Client |
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
| **Task 6 files** | `packages/domain/src/{errors,enums}.ts`, `packages/domain/src/value-objects/{gem-ref,money,weight-ct,dimensions-mm,source-sku,derived-sku,sku,configuration-hash,index}.ts`, `packages/domain/src/product/invariants.ts`, `packages/domain/src/testing/expect-domain-code.ts`, `packages/domain/src/index.ts`, 11 `*.spec.ts` files, `packages/domain/vitest.config.ts`, `packages/domain/package.json` (+vitest devDep + test script), root `package.json` (`test` script), `eslint.config.mjs` (spec exemption), `.github/workflows/ci.yml` (test step), `pnpm-lock.yaml`, 3 memory files | Task 6 commit |
| **Task 3 files** | `docs/evidence/MANIFEST.md` (NEW — 13 physical artifacts / 10 logical entries, SHA-256 from actual bytes, retention class A per td31 §2A, WAL state documented), 3 memory files | Task 3 commit |

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

---

# Migration Status

**DDL migrations: COMPLETE (Task 4). Data pipeline: not started (Phase 2).**

| Item | Status |
|---|---|
| `packages/db` DDL migrations | **17 applied and verified on both dev targets** |
| `tools/migrate` built | No (Phase 2, task 10) |
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
| Modify `naturalgemstones/` in any way — including checkpointing `crawler.sqlite`'s WAL | The archive is read-only evidence. The WAL checkpoint td31 requires must run on a disposable COPY, never in place |
| Copy checksums from a manifest instead of recomputing them | Manifest digests are only trustworthy when recomputed from the actual files; re-verify before relying on them |
| Treat `exports/products.jsonl` or `architecture/taxonomy/taxonomy.json` as the canonical artifacts | `reverse_engineered/data/products.jsonl` (929 KB) and `data/taxonomy.json` (26 KB) are canonical per plan §22.3 / td31 §2A; the others are class-B redundant |

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