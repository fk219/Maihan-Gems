# IMPLEMENTATION STATE

**Last updated:** 2026-10-05
**Update this file after every meaningful implementation task.**

---

# Current Phase

**NONE — implementation has not started.**

Next coding phase: **Phase 1 — Database + Domain Foundation**
(`INITIAL_IMPLEMENTATION_PLAN.md` §8)

MVP chain is Phase 1 → 2 → 3 → 4 → 5 → 6. Phases 7–13 are post-MVP.

---

# Current Task

**NONE. No task is in progress.**

The first task is blocked on ADR-021 (test tooling). Do not begin it, and do not
begin any task ahead of it.

---

# Status

| Item | State |
|---|---|
| Phase 1 | Not started |
| Tasks 1–10 | **None completed** |
| Application code | **None exists** |
| Database migrations | **None written** |
| Tests | **None written** |
| Repository / workspaces | **Does not exist** |
| `docs/evidence/MANIFEST.md` | **Not written** |

---

# Completed

Planning only. Nothing in the implementation column.

| Completed | Evidence |
|---|---|
| Reverse-engineering package validated and closed | `PROJECT_SOURCE_OF_TRUTH.md` |
| Architecture locked and live-validated | Plan §2: 16/16 SQL blocks, 74 tables, 33 enums |
| 13-phase implementation plan | `INITIAL_IMPLEMENTATION_PLAN.md` |
| 40 technical design documents | `technical_design/01–40` |
| Skill and tooling matrix | `SKILL_MATRIX_AND_TOOLING.md` |
| Persistent project context | `AGENTS.md`, `.opencode/memory/` |
| `.gitignore` fixed to exclude the source archive | 2026-10-05; `git check-ignore` verified |

---

# In Progress

**Nothing.**

---

# Next

First ten tasks, verbatim from `INITIAL_IMPLEMENTATION_PLAN.md` §36. **None of
these is complete.**

| # | Task | Phase | Depends on | Done when |
|---|---|---|---|---|
| 1 | Stand up the workspace skeleton: `apps/web`, `apps/worker`, `packages/{db,domain,contracts,config,observability}`, `tools/migrate`, `docs/adr`, with pnpm workspaces | 1 | — | Workspaces install; boundary lint rules active |
| 2 | Provision a disposable local PostgreSQL 16 and a Neon **dev branch** target for migrations | 1 | 1 | Both reachable; neither is production |
| 3 | Write `docs/evidence/MANIFEST.md` recording storage location, SHA-256 and retention class of every migration-critical file | 1 | — | All ten entries present with verified checksums |
| 4 | Port the validated DDL into ordered migrations, one logical unit per source-of-truth schema subsection | 1 | 2 | Applies cleanly on a clean database |
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
| 2 | Repository structure not approved | Approval | Client |
| 3 | `docs/evidence/MANIFEST.md` not written | Execution, no dependency | `MIGRATION_ENGINEER` |
| 4 | Local PostgreSQL 16 not provisioned | Execution | Engineering |
| 5 | Neon dev branch not provisioned | Execution | Engineering |
| 6 | Vercel env secrets not configured | Execution | Engineering |
| 7 | OTel collector + error reporting not configured | Execution | Engineering |
| 8 | Contrib extensions unconfirmed on target | Verification | Engineering |

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

---

# Migration Status

**Not started.**

| Item | Status |
|---|---|
| `tools/migrate` built | No |
| Stages 1–8 implemented | No |
| Gates V1–V22 running | No |
| Staging tables populated | No |
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