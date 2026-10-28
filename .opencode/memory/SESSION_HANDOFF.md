# SESSION HANDOFF

**Read this file first. Then `AGENTS.md`.**

---

> **2026-10-28 — CURRENT STATE: FRESH DATABASE IS THE ONLY DATABASE.** ADR-035
> pivot executed end-to-end: F1 design → F2 cleaning (22,737 gems / 10,349
> settings / 1,429 products / 10,240 assets) → F2.9 semantic codes → F2.10
> media limits (≤10/≤5/≤2 + 3D/VTO) → **F3-DB platform increments (commerce,
> vendor portal, trust/diamond-4C, CMS/ops — 44 tables, 47 FKs)** →
> **CUT-OVER EXECUTED:** locked `public` schema backed up
> (`backups/maihan_dev_public_locked_schema_2026-10-28.dump`, SHA-256
> `408f1240…`) and dropped from local dev `maihan_dev`. The old
> locked-schema app/tests are retired (code remains in-repo as history).
> Authority docs: `technical_design/41/42/43` + `docs/fresh-schema/0001–0009`.
> **NEXT: app layer on `fresh` (F3-V vendor portal UI/API, storefront,
> commerce APIs).**

---

## What this project is

A rebuild of **Natural Gemstones → Maihan Gems**, a fine-gemstone e-commerce
business (loose stones, matched pairs, settings, a "Design Your Own"
configurator). The source Nuxt/Vue site was reverse-engineered into a validated
evidence package, which produced a locked architecture.

**This repository is planning and architecture only.**

---

## Completed

| Done | Artifact |
|---|---|
| Reverse-engineering package, validated and closed | `PROJECT_SOURCE_OF_TRUTH.md` |
| Architecture **LOCKED**, live-validated on PostgreSQL 16.2 | Same |
| 13-phase implementation plan | `INITIAL_IMPLEMENTATION_PLAN.md` |
| 40 technical design documents | `technical_design/01–40` |
| Skill and tooling matrix | `SKILL_MATRIX_AND_TOOLING.md` |
| Persistent project context | `AGENTS.md`, `.opencode/memory/` |

## Started

**Phase 1 Task 1 — workspace skeleton — COMPLETE.** 8 packages, 9 workspace
projects, pnpm workspaces, TypeScript project references, ESLint boundary rules
active. Committed as `1e9e26f feat: Phase 1 Task 1 workspace skeleton`.

**Phase 1 Task 4 — ordered DDL migrations — COMPLETE (2026-10-05).** 17
migrations in `packages/db/migrations/` (doc 04 ordering), applied cleanly from
a pristine local database AND on the Neon dev database; introspection matches
every documented count; local vs Neon schema metadata identical. Migration
runner: `packages/db/src/migrate.ts`; introspection CLI:
`packages/db/src/verify-schema.ts`.

**Phase 1 Task 5 — schema-fidelity CI assertion — COMPLETE (2026-10-07).**
Framework-free: shared introspection (`packages/db/src/introspect.ts`),
expectations mirror (`packages/db/src/expected-schema.ts`), assertion
(`assert-schema.ts`), and a fresh-database orchestrator (`schema-fidelity.ts`)
that migrates a scratch database from zero, asserts the locked schema exactly,
and always drops the scratch. Blocking GitHub Actions workflow:
`.github/workflows/ci.yml`.

**ADR-021 — ACCEPTED (2026-10-07, explicit user authorization).** Vitest
5.0.3 is the unit/domain/integration/contract runner (installed for the domain
layer); Playwright is accepted for E2E but NOT installed until a phase
requires it; the load-test tool remains open.

**Phase 1 Task 6 — domain value objects + INV-01/02/03 — COMPLETE
(2026-10-07).** Pure `packages/domain`: ten doc-05 value objects (no parser,
no hash function — Tasks 7/8), enum unions, DomainError/InvariantError model,
and `assertComposition` + `satisfiesInv01/02/03`. ZERO runtime dependencies;
70 Vitest tests green; CI gained the domain-test step.

**Phase 1 Task 7 — SKU grammar parser + 1,024-record corpus validation —
COMPLETE (2026-10-07).** `packages/domain/src/sku/grammar.ts`, grammar
version '1': SETTING / CONFIGURED / READY-MADE + `parseSkuFromSlug`
(Example B trailing-token) + `composeSku` (doc-05 inverse). **Corpus gate
V3+V19: 1,024/1,024 with 0 mismatches and 0 malformed** on
`naturalgemstones/reverse_engineered/data/products.jsonl` (MANIFEST entry 5,
SHA-256 cross-checked, read-only); every SoT-verified aggregate reproduced
(105 cores, 35 gemRefs, 11 metals, 683 variants, 113 pairs / 911 singles).
Provenance split preserved: observed → SourceSku; slug-derived →
DerivedSku/URL_SLUG. 100 tests / 13 files green. The archive stays
all-external and untouched.

**Phase 1 Task 8 — configuration hash + slug derivation — COMPLETE
(2026-10-07, commit `ef6a72b`).** Pure `packages/domain/src/configuration/`:
the SoT 19.2 / doc-14 §2 canonical configuration representation,
`computeConfigurationHash` (frozen Task 6 ConfigurationHash VO;
hash_version inside the hashed object), the configuration slug =
fixed-43-digit base62 of the full sha256 digest (URL-safe, no truncation,
collision-resistant in the versioned identity space), and the pure
`normaliseSlug` primitive. 26 + 12 tests with 10 frozen digest/slug
examples; rejects malformed inputs with stable codes; node:crypto only.

**Phase 1 Task 9 — reference data seeds — COMPLETE (2026-10-07, commit
`992d14b`).** `packages/db/src/seed/` + CLI: 70 idempotent rows — 15 metals
(full enum, R10 INFERRED), 8 jewellery types (full enum, BROOCH/CUFFLINKS/
CHARM INFERRED), 22 setting styles, 3 treatments + 5 verbatim treatment
labels, 5 colour intensities, 5 clarities + 7 clarity labels. ON CONFLICT
(natural key) DO NOTHING; second run inserts 0. Corpus gate re-derives the
values from taxonomy.json + urls.jsonl (SHA-256-gated, read-only): 14 metal
phrase 1:1 (per-code aggregates match the SoT counts), 22 style slugs
reconcile exactly (9,500 + 1,272 = 10,772 settings routes). 15/15 tests on a
disposable scratch DB.

**Phase 1 Task 10 — tools/migrate — COMPLETE (2026-10-07, commit
`22c57dd`).** bin `maihan-migrate` (plan / run / status); durable stage
state over the LOCKED `import_batches` table; SHA-256 gating against
`docs/evidence/MANIFEST.md` before any artifact-consuming stage (refusal
names stage/artifact/expected/actual); 3 implemented stages
(verify-artifacts, migrate-schema, seed-reference) + 11 DECLARED future
stages that refuse until their plan tasks land. Hash-mismatch refusal,
resume and idempotency are test-frozen (14/14); the REAL 13-artifact chain
was executed read-only on a disposable scratch DB and re-run as a pure skip.
Production never touched; the real archive never written.

**PHASE 1 IS COMPLETE. PHASE 2 IS OPEN (next task: the extract stage — see
CURRENT STATE "Next major action" for the exact plan numbering).**

**Zero application code beyond the skeleton + migration tooling + the pure
domain foundation.** No Drizzle TS schema, no repositories, no seeders.

---

## Authoritative documents

Read in this order; higher wins.

1. `PROJECT_SOURCE_OF_TRUTH.md` — evidence + locked architecture
2. `INITIAL_IMPLEMENTATION_PLAN.md` — build order, gates, first 20 tasks
3. `technical_design/01–40` — detail per subsystem (`40` holds all ADRs)
4. `SKILL_MATRIX_AND_TOOLING.md` — what is approved, open or prohibited

**Load `technical_design/` lazily.** Only the documents relevant to the task.

State lives in `.opencode/memory/`:
`CURRENT_STATE.md` · `IMPLEMENTATION_STATE.md` · `DECISIONS.md` · `LESSONS.md`

---

## Current phase

**Phase 1 — Database + Domain Foundation. COMPLETE (2026-10-07).**

- Task 1 — workspace skeleton — **COMPLETE**, committed `1e9e26f`.
- Task 2 — database infrastructure — **COMPLETE 2026-10-05 (final pass)**.
  **Local:** PostgreSQL 16.15 via `compose.yaml`, database `maihan_dev`, six
  extensions, HNSW + NUMERIC smoke PASS.
  **Neon:** NEW project "Maihan Gems Dev" (client-created in the console after
  the PG16 requirement), PostgreSQL **16.15**, database **`maihan_dev`**, schema
  public, six extensions live-verified. The old PG18.6 "Maihan Gems" project is
  abandoned for dev use — **not deleted, not a target**. Production never
  touched.
- Task 4 — ordered DDL migrations — **COMPLETE 2026-10-05.** 17 migrations
  (`0001_extensions` … `0017_trust_view`), verbatim port of SoT §8 in doc 04
  order; history in `drizzle.__drizzle_migrations`; rerun = no-op; failure =
  full rollback (proven); schema counts match the locked numbers (74 tables,
  33 enums, 94 FKs, 263 indexes, 9 named invariants, 2 HNSW, 6/6 RLS, 1
  trigger, 2 functions, 1 view); local and Neon metadata identical.
- Task 5 — schema-fidelity CI assertion — **COMPLETE 2026-10-07.** Blocking,
  framework-free: `pnpm run schema-fidelity` migrates a FRESH scratch database
  from zero and asserts the locked schema exactly (counts + exact names and
  definitions); GitHub Actions workflow added.
- **ADR-021 — ACCEPTED 2026-10-07 by explicit user authorization.** Vitest
  5.0.3 runs the domain unit tests; Playwright accepted-only (never installed
  until a phase requires it); the load-test tool remains open.
- Task 6 — domain value objects + INV-01/02/03 — **COMPLETE 2026-10-07.**
  Pure domain layer, zero runtime dependencies, 70 unit tests green.
- Task 3 — evidence manifest — **COMPLETE 2026-10-07** (`docs/evidence/MANIFEST.md`;
  the corpus is checksum-recorded there, which is how Task 7 binds its gate).
- **Task 7 — COMPLETE 2026-10-07.** Parser + corpus gate 1,024/1,024 / 0
  mismatches / 0 malformed (V3+V19), SHA-256 cross-checked, archive untouched. 100 tests green.
- Task 3 — evidence manifest — **COMPLETE 2026-10-07.**
  `docs/evidence/MANIFEST.md` created and validated: 13 physical artifacts
  implementing the 10 authoritative logical entries of plan §22.3; every
  SHA-256 computed from the actual archive bytes during the run; retention
  class **A — "Must remain permanently"** (`technical_design/31` §2A);
  criticality and loss consequences verbatim from the authoritative documents;
  `crawler.sqlite`/`-wal`/`-shm` as separate rows under one logical artifact;
  `report.json`/`appraisal.json` hashed separately; canonical-vs-redundant path
  disambiguation recorded; SQLite WAL state documented byte-level (not
  checkpointed; the three files are one indivisible unit; checkpoint only ever
  on a disposable copy). The source archive is **PRESENT** in this Codespace
  (46,810 files) and was proven unmodified; it stays Git-ignored and untracked.
- **Variable contract enforced:** `DATABASE_URL` is the ONLY database variable
  (`PROJECT_SOURCE_OF_TRUTH.md` §29.6). Interim suffixed variables removed.
- **Credential note:** the client states the Neon API key was rotated and `.env`
  updated. Confirm the `neondb_owner` password was reset too; both live only in
  gitignored `.env`.
- **Task 7 — COMPLETE 2026-10-07.** SKU grammar parser + V3/V19 corpus gate:
  1,024/1,024, 0 mismatches, 0 malformed; the provenance split (observed
  SourceSku vs slug-derived DerivedSku) is preserved end to end.
- **Tasks 8, 9, 10 COMPLETE (2026-10-07).** Phase 1 done. Next: Phase 2,
  starting from the plan's extract stage (plan task 11 / detailed task 3).
- Full task list: `IMPLEMENTATION_STATE.md` → **Next**.

---

## Blocked on

| # | Blocker | Type |
|---|---|---|
| 1 | ~~ADR-021 test tooling unresolved~~ **RESOLVED 2026-10-07 — ACCEPTED by explicit user authorization** (Vitest for unit/domain; Playwright accepted; load tool still open) | — |
| 2 | ~~Repository structure not signed off~~ — **RESOLVED** at Task 1 authorisation | — |
| 3 | ~~`docs/evidence/MANIFEST.md`~~ **RESOLVED 2026-10-07** — created and validated; the archive is present, so the manifest doubles as the corpus-checksum ledger for Task 7 | — |
| 4 | ~~Local PostgreSQL 16~~ **RESOLVED 2026-10-05**: `compose.yaml`, `pgvector/pgvector:pg16`, DB `maihan_dev` on 127.0.0.1:5433, healthy, migrated by Task 4 | — |
| 5 | ~~Neon dev target on PG18.6~~ **RESOLVED 2026-10-05**: NEW "Maihan Gems Dev" project, PostgreSQL 16.15, database `maihan_dev`; migrated by Task 4, schema identical to local | — |
| 6 | Vercel env secrets, OTel collector, error reporting not configured | Execution |
| 6a | **ADR-024 (provenance storage) remains PROPOSED and gates Phase 2's provenance model** — unchanged by Phase 1, must be resolved by the client | Client |
| 7 | **Confirm the exposed `neondb_owner` password was rotated** (client states the API key was rotated) | **Client: Neon console** |

No design blocker remains. The remaining execution blockers are provisioning
and the deferred Task 3 archive.

---

## Critical — do NOT do

- **Do NOT** begin Task 8 or later without explicit user authorization.
- **Do NOT** modify `naturalgemstones/` in any way — it is now PRESENT and must
  stay read-only, Git-ignored and untracked. This includes not checkpointing
  `crawler.sqlite`'s WAL in place (the checkpoint td31 requires must run on a
  disposable copy).
- **Test runner is DECIDED (ADR-021, ACCEPTED 2026-10-07): Vitest** for
  unit/domain/integration/contract. Do not add Jest or any other runner.
  **Playwright is accepted for E2E but not installed** — do not install it
  before a phase requires browser testing. The load-test tool is still open.
- **Do NOT** treat ADR-022/023/024 as accepted. They remain Proposed.
- **Do NOT** treat the PostgreSQL 18.6 Neon branch as conformant. The
  authoritative development contract is PostgreSQL 16.x.
- **Do NOT** attempt to create a Neon project, rotate the API key, or complete a
  Neon OAuth flow from this environment. The available credential is
  project-scoped; those actions require account-level capability. A Neon OAuth
  authorization code carries organization-wide scope including `projects:delete`
  and `orgs:delete` and must not be completed on an agent's initiative.
- ~~Do NOT install any test framework (ADR-021 blocks it)~~ **OBSOLETE
  2026-10-07:** ADR-021 is ACCEPTED; Vitest is the installed runner. Do not
  add any runner BEYOND it, and do not install Playwright before its phase.
- **Do NOT** add any technology not in `technical_design/02`. That needs an ADR.
- **Do NOT** redesign the locked architecture. Propose a change; do not implement one.
- **Do NOT** restart reverse engineering. It is complete and validated.
- **Do NOT** restart architecture or planning.
- **Do NOT** connect to a managed or production database. Use a Neon dev branch.
- **Do NOT** fabricate source data or invent values for the 221 derived DYO rows.
- **Do NOT** treat `products.jsonl` (1,245 records, 2.4%) as the catalogue.
- **Do NOT** use 9,484 for setting variants. **10,349 is correct.**
- **Do NOT** write the LLM as anything but an orchestrator over deterministic tools.
- **Do NOT** run `git add .` or `git add -A`. Stage explicit paths.
- **Do NOT** convert `[INFERRED]` or `[UNKNOWN]` into observed fact.

---

## Source archive

```
naturalgemstones/     46,810 files, 3.0 GB. PRESENT in this Codespace
                      (verified + SHA-256 recorded 2026-10-07, docs/evidence/MANIFEST.md)
```

**Never committed. Ignored by `.gitignore` (`.gitignore:19`).**

**It will be ABSENT in a fresh clone or Codespace. That is expected and correct.**
Absence is not evidence that it does not exist. Restore it out of band.

Never stage, commit, delete or modify it — including `crawler.sqlite` and its
`-wal`/`-shm` files, and any raw HTML.

If a task needs source datasets and they are unavailable: **stop and report that
the source archive must be made available. Do not synthesise a substitute.**

Two irreversible-loss files: `pages_analyzed.jsonl` (all 1,024 prices) and
`urls.jsonl` (the migration spine; 33,934 commerce URLs).

---

## Git state

| Item | Value |
|---|---|
| Remote | `origin` → `https://github.com/fk219/Maihan-Gems.git` |
| Branch | `main` |
| Baseline commit | `7a3f3c9` — *chore: establish architecture baseline* |
| Working tree | Clean after the persistent-context commit |

`.gitignore` was **empty** until 2026-10-05, which left the source archive
untracked-but-not-ignored. Fixed and verified with `git check-ignore`.

---

## What to read next

1. `AGENTS.md` — rules and orientation (~250 lines)
2. `.opencode/memory/CURRENT_STATE.md` — verified current state
3. `.opencode/memory/IMPLEMENTATION_STATE.md` — exact next task and blockers
4. `.opencode/memory/DECISIONS.md` — what is decided, what is open
5. `.opencode/memory/LESSONS.md` — before doing anything resembling data work
6. Then, **only if relevant**: the specific `technical_design/` document

Quick-reference table for "which doc answers what": `AGENTS.md` §3.

---

## Known inconsistencies (reported, not fixed)

Four plan-level wording issues. None breaks the architecture. Do not "fix" them
without the plan owner's agreement. Detail in `CURRENT_STATE.md` §8.

---

NEXT SESSION:
Start by reading AGENTS.md and SESSION_HANDOFF.md.
Then inspect IMPLEMENTATION_STATE.md.
Do not restart architecture/planning.
Do not repeat reverse engineering.
Do not invent missing source data.
Wait for the user before beginning implementation if the handoff says the project is ready.