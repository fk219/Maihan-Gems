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
Tasks 3 and 5-9 not started.
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

**Task 4 COMPLETE (2026-10-05) — ordered DDL migrations.**

| Check | Result |
|---|---|
| Migration framework | Drizzle Kit custom SQL migrations + the Drizzle migrator, `packages/db/migrations/` + `packages/db/src/migrate.ts` |
| Migration count | **17** (`0001_extensions` … `0017_trust_view`), one logical unit per SoT §8 subsection per doc 04 |
| Clean local install | PASS — pristine throwaway database `maihan_dev_t4clean` (created, migrated, introspected, dropped): extensions created from zero, all 17 applied |
| Local `maihan_dev` install | PASS — 17 applied, introspection green |
| Neon dev install | PASS — same chain via the single `DATABASE_URL`, 17 recorded |
| History | `drizzle.__drizzle_migrations` on both targets; 17 rows, deterministic hashes, strictly increasing `when`; public schema holds exactly the 74 locked tables |
| Rerun behaviour | no-op on both targets (watermark skip by history) |
| Failure behaviour | proven with a tampered migration copy on a throwaway DB: hard failure, FULL rollback (0 tables, 0 enums, 0 extensions, 0 history rows); nothing marked applied |
| Schema counts | 74 tables · 33 enums · 74 PK · 94 FK · 59 UNIQUE · 28 CHECK (+563 NOT NULL = the documented 591) · 263 indexes · 9 named invariants · 2 HNSW · 2 vector(1024) columns · 1 trigger · 2 functions · 1 view · 6/6 RLS · 0 policy-less |
| Local vs Neon fidelity | **IDENTICAL** — tables, enums+member counts, FKs, constraint counts, index definitions, HNSW, vector columns, trigger, functions, views, RLS all MATCH; only descriptive fields differ (platform pgvector 0.8.7 local / 0.8.0 Neon, both ≥ 0.6) |
| Behavioural smoke | trigger populates/maintains `search_document`; INV-01/02/03, `dyo_one_stone_ck`, `dyo_pair_is_earrings_ck`, `certificates_subject_ck` all reject violations (23514); CITEXT email uniqueness rejected case-variant duplicate (23505); smoke rows cleaned, 0 leftovers |
| lint / build / tsc --dry | PASS / PASS / PASS |

**ADR-021 remains OPEN.** No test framework is installed and none may be, until
it is resolved. This blocks Task 6 onward and the Phase 1 exit gate.

---

# Status

| Item | State |
|---|---|
| Phase 1 | **Started. Tasks 1, 2 and 4 complete.** Tasks 3, 5-10 not started |
| Application code | **None exists.** Workspace skeleton only; every `src/index.ts` is a documentation-only barrel |
| Database migrations | **17 ordered DDL migrations, applied and verified on both dev targets** (Task 4) |
| Tests | **None written.** ADR-021 still OPEN |
| Repository / workspaces | **EXISTS.** 8 packages, 9 workspace projects, pnpm 12.3.4 |
| Local PostgreSQL 16 | **EXISTS and correct.** 16.15 via compose.yaml, database `maihan_dev`, all six extensions; Task 4 migrated it |
| Neon dev | **EXISTS and correct.** "Maihan Gems Dev": PostgreSQL 16.15, db `maihan_dev`; Task 4 migrated it; schema identical to local |
| `docs/evidence/MANIFEST.md` | **Not written.** Task 3; blocked, archive absent |

---

# Completed

Planning complete. **Tasks 1 and 2 are the first implementation tasks completed.**

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
| 5 | Assert schema fidelity in CI: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariant constraints, 6 RLS policies with 0 policy-less tables, 2 HNSW indexes, 1 trigger, 1 view, 2 functions | 1 | 4 | Introspection test green against a fresh database |
| 6 | Implement the domain value objects and INV-01, INV-02, INV-03 as pure predicates | 1 | 4 | Unit tests green; no infrastructure imports |
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
| 3 | `docs/evidence/MANIFEST.md` not written | Execution, no dependency. **REQUIRES `naturalgemstones/`, which is ABSENT from this Codespace** — restore the archive out of band first | `MIGRATION_ENGINEER` |
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

---

# Tests / Verification

**No tests exist.** ADR-021 blocks test framework installation.

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
| **Task 4 (local)** | Clean-install: throwaway `maihan_dev_t4clean` migrated from zero (extensions created, 17/17 applied) then dropped · `maihan_dev` migrated · introspection: 74 tables, 33 enums, 94 FK, 74 PK, 59 UNIQUE, 28 CHECK + 563 NOT NULL, 263 indexes, 9 named invariants, 2 HNSW, 2 vector(1024) columns, 1 trigger, 2 functions, 1 view, 6/6 RLS, 0 policy-less · rerun no-op · failure rollback proven (tampered copy on throwaway DB: 0 objects, 0 history rows) · behavioural smoke: trigger populates+maintains `search_document`, INV-01/02/03 + `dyo_one_stone_ck` + `dyo_pair_is_earrings_ck` + `certificates_subject_ck` reject (23514), CITEXT duplicate rejected (23505), all smoke rows cleaned |
| **Task 4 (Neon)** | Same 17 migrations via the single `DATABASE_URL`: applied 17/17 on PostgreSQL 16.15 db `maihan_dev`; history 17 rows strictly increasing; rerun no-op; introspection identical to local |
| **Task 4 (fidelity)** | Local vs Neon catalog diff: MATCH on tables, enums+member counts, FKs, constraint counts, index definitions, HNSW, vector columns, trigger, functions, views, RLS tables/policies. Only extension VERSION differs (platform images: vector 0.8.7 vs 0.8.0; both ≥ 0.6 required) |
| **Task 4 (toolchain)** | `pnpm install --frozen-lockfile` PASS (esbuild build script approved) · `pnpm run lint` PASS · `pnpm run build` PASS · `npx tsc -b --dry` PASS |

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

**Currently available in this environment** (`naturalgemstones/`, 46,810 files).
**Will be absent** in a fresh clone or Codespace. That is expected.

**WAL note:** checkpoint `crawler.sqlite` WAL into the main file before archiving,
or the 26 MB `-wal` may hold committed rows absent from the main file.

**If a task requires any of these and they are unavailable:** stop, report that
the source archive must be made available, and do not synthesise a substitute.