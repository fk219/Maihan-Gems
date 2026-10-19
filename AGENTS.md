# AGENTS.md — Maihan Gems

Project rules for any OpenCode (or human) session working in this repository.

**This file is orientation and rules, not architecture.** The architecture lives in
`technical_design/` and is authoritative. Do not put architecture detail here.

---

## 1. What this project is

A rebuild of **Natural Gemstones → Maihan Gems**, a fine-gemstone e-commerce
business. The source business ran a server-rendered Nuxt/Vue site selling loose
gemstones, matched gemstone pairs (earrings), jewellery settings, and a
"Design Your Own" configurator.

This repository is the **planning and architecture package** for that rebuild.
The source site was reverse-engineered into a validated evidence package; that
evidence became a locked architecture, a 13-phase implementation plan, and 40
technical design documents.

**Nothing is implemented yet.** See `.opencode/memory/CURRENT_STATE.md`.

---

## 2. Repository structure

```
/
  AGENTS.md                          # this file — rules and orientation
  PROJECT_SOURCE_OF_TRUTH.md         # validated evidence + locked architecture
  INITIAL_IMPLEMENTATION_PLAN.md     # 13 phases, dependency graph, first 20 tasks
  SKILL_MATRIX_AND_TOOLING.md        # required skills/tools; approval status
  DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md   # vision + charter authority
  technical_design/                  # 40 design documents (01–40)
  .opencode/memory/                  # persistent project context (this layer)
  naturalgemstones/                  # SOURCE ARCHIVE — never committed
```

Future code layout, when Phase 1 begins (from `INITIAL_IMPLEMENTATION_PLAN.md` §5):

```
apps/web   apps/worker
packages/{db,domain,contracts,config,observability,ai}
tools/migrate   docs/adr   docs/evidence   e2e   tests
```

---

## 3. Authoritative documentation hierarchy

Read in this order when you need depth. Higher wins on conflict.

| Rank | Document | Authority |
|---|---|---|
| 1 | `PROJECT_SOURCE_OF_TRUTH.md` | Validated evidence and the **locked** architecture. Evidence hierarchy, domain model, schema, invariants, ADRs 001–020. |
| 2 | `INITIAL_IMPLEMENTATION_PLAN.md` | The 13-phase build order, dependency graph, gates, first 20 tasks. Implements rank 1; reopens nothing. |
| 3 | `technical_design/01–40` | Detailed design per subsystem. `40_ARCHITECTURE_DECISION_RECORDS.md` holds all ADRs. |
| 4 | `SKILL_MATRIX_AND_TOOLING.md` | Which skills/tools are approved, open or prohibited. Gates what may be installed. |
| — | `.opencode/memory/` | Project state and decisions. **Never contradicts rank 1–4.** |

**Load these lazily.** Only open the `technical_design/` documents relevant to
the task at hand. Do not read all 40 to answer a narrow question.

Useful single-document shortcuts:

| Question | Read |
|---|---|
| What can I use? | `technical_design/02_TECH_STACK.md` |
| How is the code laid out? | `technical_design/03_REPOSITORY_ARCHITECTURE.md` |
| What is the DB schema? | `technical_design/04_DATABASE_IMPLEMENTATION.md` |
| Why is this decision made? | `technical_design/40_ARCHITECTURE_DECISION_RECORDS.md` |
| What is the truth about the source data? | `technical_design/39_GLOSSARY_AND_EVIDENCE_LEDGER.md` |
| How do I migrate the data? | `technical_design/33_MIGRATION_ARCHITECTURE.md` |
| What is decided vs open? | `technical_design/40` + `SKILL_MATRIX_AND_TOOLING.md` §6 |

---

## 4. Evidence hierarchy — mandatory labelling

Every factual claim about the **source** carries one of these labels. Preserve
the label when you quote, restate or build on a claim.

| Label | Meaning |
|---|---|
| `OBSERVED` | Directly present in a source artefact |
| `VERIFIED` | Observed and checked at scale, with a recorded pass rate |
| `EXTRACTED` | Derived by deterministic parsing from an artefact |
| `PATTERN` | Derived from a regular pattern across many samples |
| `INFERRED` | A reasoned proposal, **not** observed |
| `INFERRED / PROPOSED` | Proposed design awaiting approval |
| `UNKNOWN` | Not determinable from the evidence |

**`UNKNOWN` is a valid, final answer.** It is not a failure and not a gap to fill
with a guess.

---

## 5. Source archive rule — READ THIS

The reverse-engineering source archive lives at:

```
naturalgemstones/
```

It holds the crawler database, raw HTML, reverse-engineered JSONL datasets and
all migration-critical source material. **It is intentionally not committed to
GitHub and is excluded by `.gitignore`.**

### NEVER

- `git add naturalgemstones/` or `git commit naturalgemstones/`
- delete, move, rename or modify `naturalgemstones/` in any way
- modify `crawler.sqlite` (including its `-wal` / `-shm` files) or any raw HTML
- recreate or fabricate `naturalgemstones` data when it is missing
- **infer that the archive does not exist because it is absent from GitHub**

### Its absence is expected

A fresh clone, a Codespace, or the home machine after `git pull` will **not**
have `naturalgemstones/`. That is correct and expected. It must be restored from
durable storage out of band.

### When migration data is needed

If a task requires source datasets (`urls.jsonl`, `specifications.jsonl`,
`pages_analyzed.jsonl`, `media_analyzed.jsonl`, `taxonomy.json`, `crawler.sqlite`,
`entities/media/*.json`, `source_snapshots/manifest.jsonl`):

1. **Stop and report that the source archive must be made available to the environment.**
2. Do not synthesise a substitute.
3. Do not proceed on assumed values.

The same applies to raw HTML (needed only if a later phase re-fetches the 502
error shells, which is a deferred decision).

---

## 6. Hard prohibitions

These are not preferences. Violating any of them is a defect.

| # | Prohibition |
|---|---|
| 1 | **No fabricated source data.** Never invent a source value, an observed count or a source behaviour. |
| 2 | **No manufactured source SKUs.** The 221 derived DYO identities stay `source_sku_derived`, `sku_evidence_status='INFERRED'`, every attribute column null, `state='DRAFT'`, unpublished. See §7. |
| 3 | **No silently promoting `INFERRED` to observed.** Never write a proposal as a fact. |
| 4 | **No managed/production database access** without explicit, current user approval. Migrations run on a **Neon dev branch** or local PostgreSQL 16. |
| 5 | **No silent technology additions.** Any new runtime dependency, framework or external service requires an ADR. See `SKILL_MATRIX_AND_TOOLING.md` §13–14. |
| 6 | **No resolving open ADRs implicitly.** ADR-021 to ADR-024 are **Proposed**, not Accepted. |
| 7 | ~~**No test framework installation** until ADR-021 is resolved.~~ **RESOLVED:** ADR-021 was **Accepted 2026-10-07** (Vitest + Playwright); both are installed and in use. New test tooling beyond them still requires an ADR. |
| 8 | **No redesigning the locked architecture.** It is LOCKED. Propose a change; do not implement one. |
| 9 | **No secrets** in the repository, the database, a config table, a log or a trace. |
| 10 | **No AI/agent writing directly to the database.** See §8. |
| 11 | **No `git add .` or `git add -A`.** Stage explicit paths only, so the archive can never be swept in. |

---

## 7. Domain facts that are easy to get wrong

These are the highest-consequence facts in the project. All are verified in
`PROJECT_SOURCE_OF_TRUTH.md`.

| Fact | Value |
|---|---|
| Total source URLs | **44,218** |
| Commerce URLs absent from `products.jsonl` | **33,934** |
| `products.jsonl` records | **1,245** — this is **2.4%** of commerce URLs and is **NOT the catalogue** |
| Setting design cores | **951** |
| **Setting variants (design × metal)** | **10,349** (an earlier figure of 9,484 was wrong; it excluded 865 silver SKUs) |
| Loose stones / pairs | **19,665** / **3,072** |
| DYO configuration URLs | **9,812**; 1,024 with an observed SKU, **221 with a derived SKU only** |
| Ready-made products | **88** |
| Media records | **241,961** (≈44,480 product media; 120,832 are nav icons) |
| Recovered prices | **1,024** |
| `price == weight × per_carat` | **0 of 1,024** — price is *not* a simple weight calculation |
| Schema objects | 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 9 named invariant constraints, 6 RLS policies, 2 HNSW indexes, 1 trigger, 1 view, 2 functions |
| Validation gates | **V1–V22** |
| Non-functional requirements | NFR-01 … NFR-15 |

### Enforced invariants

| ID | Invariant |
|---|---|
| INV-01 | A configured product has exactly one setting variant and exactly one gemstone **XOR** one pair |
| INV-02 | A pair may attach **only** to EARRINGS |
| INV-03 | A single gemstone may attach **only** to RING, PENDANT, NECKLACE or BRACELET |
| INV-07 | A document field with `verification_status != 'VERIFIED'` may never render as verified truth |
| INV-08 | An inferred identifier may never be a confirmed external reference without `review_state='APPROVED'` |

### Two single points of irreversible loss

- `pages_analyzed.jsonl` is the **only** source of price, availability and JSON-LD. Lose it and all 1,024 prices are gone permanently.
- `urls.jsonl` is the **migration spine**. Lose it and 33,934 commerce URLs are gone.

---

## 8. AI architecture rule — non-negotiable

```
LLM MUST NOT directly mutate database state.
AI operates only through deterministic application tools.
```

The AI is an **orchestration layer** over a fixed tool registry and trusted
data. It is never a system of record and never a database client.

**There is deliberately no tool that mutates price, inventory, orders, payments,
certificates or permissions.** Two tools mutate, both via application services:
`create_customer_request` and `transfer_to_human`.

Enforced by four independent layers (ADR-003, NFR-05):

1. **Structural** — the mutating tool does not exist, so it cannot be called.
2. **Contractual** — every tool declares `mutates` and names its application service; the AI module holds no repository handle.
3. **Runtime** — `authorization()` runs in code before `execute()`.
4. **Prompt** — defence-in-depth only, never the sole control.

The AI must **refuse rather than guess**. A NULL structured field produces an
honest refusal, never a plausible value. 911 of 1,024 products have no structured
stone type, so this path is common, not exceptional.

---

## 9. Migration discipline

| Rule | Detail |
|---|---|
| Spine | **`urls.jsonl`**, joined with `specifications.jsonl` and `pages_analyzed.jsonl`. **Never `products.jsonl` alone.** |
| Staging | Loads **verbatim**. Normalisation happens only in the canonical stage. |
| Determinism | Stages 1–5 are fully deterministic given identical input hashes. |
| Idempotency | Gate **V17**: a second run must change zero rows. |
| Provenance | Every migrated row carries `evidence_status`, `source_url`, `import_batch_id` and, where useful, `raw_spec`. |
| Conflicts | Stored in `staging_conflicts`, both sides, **never auto-resolved**. |
| Quarantine | Failures are quarantined with a reason, counted, **never silently dropped**. |
| The 221 | Derived identity only. Null attributes, `DRAFT`, unpublished. Never manufacture a source SKU, never infer attributes from a sibling product sharing a stone reference. |
| Evidence manifest | `docs/evidence/MANIFEST.md` records storage location, SHA-256 and retention class per artefact. Data stays out of Git; the manifest makes provenance checkable. |

---

## 10. Security principles

| Principle | Rule |
|---|---|
| Trust boundary | The **application service layer** is the primary boundary. RLS is defence-in-depth, not the primary control. |
| Fail closed | On money, trust and authorization. Fail open only on cache. |
| Postgres is truth | Redis is cache and transient state only. Never the sole copy of an order, payment, price or stock fact. |
| No PII | Not in logs, metric labels, event payloads, embeddings or model context beyond the minimum required. |
| Idempotency | Every mutating endpoint, job and event consumer. |
| Webhooks | Verify the HMAC over the **raw body, before parsing**. |
| Audit | Every privileged action, with before and after state. Append-only. |
| Privacy | Certificates and appraisals are private; short-lived signed URLs only. Camera frames never leave the device. |
| Secrets | Platform secret manager only. Never in repo, database, config table, log or trace. |

---

## 11. Implementation phase discipline

- The MVP chain is **Phase 1 → 2 → 3 → 4 → 5 → 6**. Phases 7–13 are post-MVP.
- A phase may not begin until every dependency has **passed its exit gate**, not merely started.
- No phase may be declared done by pointing at future hardening work.
- Phase 1 has **no features and no catalogue data**. Do not add a second domain concept that is not in `PROJECT_SOURCE_OF_TRUTH.md` §7.
- Current phase and next task: `.opencode/memory/IMPLEMENTATION_STATE.md`.

---

## 12. Where project state lives

| Need | Read |
|---|---|
| Session start | `.opencode/memory/SESSION_HANDOFF.md` |
| What phase are we in? | `.opencode/memory/CURRENT_STATE.md` |
| What is the exact next task? | `.opencode/memory/IMPLEMENTATION_STATE.md` — **update this after meaningful work** |
| Why was X decided? | `.opencode/memory/DECISIONS.md`, then `technical_design/40` |
| What went wrong before? | `.opencode/memory/LESSONS.md` |
| Can I install this? | `SKILL_MATRIX_AND_TOOLING.md` §13–14 |

**If reality and `.opencode/memory/` disagree, the authoritative documents win.
Fix the memory file.**

---

## 13. Working rules for this repository

1. Read `AGENTS.md` and `.opencode/memory/SESSION_HANDOFF.md` before doing anything.
2. Load `technical_design/` documents **only when relevant to the current task**.
3. Do not restart reverse engineering. It is complete and validated.
4. Do not restart architecture or planning.
5. Do not begin implementation without explicit user approval, and do not begin a phase whose predecessor has not passed its exit gate.
6. Update `.opencode/memory/IMPLEMENTATION_STATE.md` when you complete meaningful work.
7. Stage explicit paths. Never `git add .`.
8. When in doubt about a source fact, say `[UNKNOWN]` and ask. Do not guess.

---

## Cursor Cloud specific instructions

Cloud Agents boot a local PostgreSQL 16 cluster with pgvector on `127.0.0.1:5433`, database `maihan_dev`. The throwaway role and password are the ones already published in `compose.yaml` (`postgres` / `maihan_local_dev_only`). That is the same URL CI uses. `shared_preload_libraries` includes `pg_stat_statements` so migration `0001` can create the optional extension. Redis is not required; an absent `REDIS_URL` bypasses the cache.

```bash
export DATABASE_URL="postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev"
export MAIHAN_ENV=local
export API_PORT=3001
```

- Run `pnpm run build` (`tsc -b`) before the storefront or the catalogue API. Workspace packages export compiled `dist/`.
- Storefront (port 3000): `pnpm --filter @maihan/web exec next dev --webpack --hostname 0.0.0.0 --port 3000`. Do not pass `--hostname` through `pnpm dev --`; Next.js treats the extra `--` as a project directory.
- Catalogue API (port 3001): `API_PORT=3001 pnpm --filter @maihan/web run start`. Port 3000 belongs to the storefront.
- Schema and reference vocabulary: `pnpm --filter @maihan/db run migrate`, then `pnpm --filter @maihan/db run seed`. Both are idempotent.
- `naturalgemstones/` is not in git. Domain corpus tests skip when that archive is absent.
- `pnpm run schema-fidelity` migrates a scratch database and drops it. `pnpm --filter @maihan/domain run test`, `pnpm --filter @maihan/db run test`, and `pnpm --filter @maihan/contracts run test` are the checks that match this environment.