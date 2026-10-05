# SESSION HANDOFF

**Read this file first. Then `AGENTS.md`.**

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

**Phase 1 Task 1 — workspace skeleton — is COMPLETE.** 8 packages, 9 workspace
projects, pnpm workspaces, TypeScript project references, ESLint boundary rules
active. Committed as `feat: Phase 1 Task 1 workspace skeleton`.

**Zero application code beyond the skeleton.** No migrations, no schema, no
domain models, no tests, no infrastructure.

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

**Phase 1 — Database + Domain Foundation. IN PROGRESS.**

Task 1 complete. **Next task: Task 2** — provision a disposable local
PostgreSQL 16 and a Neon dev branch target (`INITIAL_IMPLEMENTATION_PLAN.md`
§36 task 2). Task 3, the evidence manifest, is also dependency-free but is
blocked until the source archive is restored.

Full task list: `IMPLEMENTATION_STATE.md` → **Next**.

---

## Blocked on

| # | Blocker | Type |
|---|---|---|
| 1 | **ADR-021 test tooling unresolved.** Plan task 6 requires green unit tests; §23.4 forbids selecting a runner. | **Client approval** |
| 2 | Repository structure not signed off (plan §5) | Client approval |
| 3 | `docs/evidence/MANIFEST.md` not written — no dependency, can start now | Execution |
| 4 | Local PostgreSQL 16 + Neon dev branch not provisioned | Execution |
| 5 | Vercel env secrets, OTel collector, error reporting not configured | Execution |
| 6 | Contrib extensions (`citext`, `pg_trgm`, `unaccent`, `btree_gin`) unconfirmed on target | Verification |

ADR-021 is the **only** true design blocker. Nothing else needs a later phase.

---

## Critical — do NOT do

- **Do NOT** begin implementation without explicit user approval.
- **Do NOT** begin Phase 1 until ADR-021 is resolved and the structure is signed off.
- **Do NOT** install any test framework (ADR-021 blocks it).
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
naturalgemstones/     46,810 files. ABSENT in this Codespace (verified 2026-10-05)
```

**Never committed. Ignored by `.gitignore`.**

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