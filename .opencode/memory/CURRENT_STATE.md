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

| Object | Count |
|---|---|
| Tables | 74 |
| Enums | 33 |
| Foreign keys | 94 (graph provably acyclic) |
| CHECK constraints | 591 |
| UNIQUE constraints | 59 |
| Indexes | 263 (12 GIN, 2 HNSW) |
| Named invariant constraints | 9 |
| RLS tables / policies | 6 / 6 (0 policy-less) |
| Triggers | 1 (`gemstones_search_document_fn`) |
| Views | 1 (`certificate_public`) |
| Functions | 2 (`match_knowledge_chunks`, `gemstones_search_document_fn`) |
| Validation gates | V1–V22 |
| NFRs | NFR-01 … NFR-15 |
| Invariants | INV-01 … INV-10 |
| ADRs | 20 Accepted (001–020) + 4 Proposed (021–024) |

**Extension availability gap:** `vector` 0.6.2 was executed during validation.
`citext`, `pg_trgm`, `unaccent` and `btree_gin` were **statically validated only**
(absent from the validation build; standard on the Neon image). Confirm on the
target instance before Phase 1 migrations.

---

## 3. Implementation status

**Workspace skeleton exists. ZERO application code beyond it.** No migrations,
no schema, no domain models, no tests, no infrastructure.

| Item | Status |
|---|---|
| Current phase | **Phase 1 — Database + Domain Foundation. IN PROGRESS.** |
| Task 1 — workspace skeleton | **COMPLETE.** Exit gate PASS |
| Tasks 2-9 | Not started |
| Coding status | Task 1 authorised and complete. Further tasks need their own approval |
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
| 1 | **ADR-021 test tooling unresolved** | **Approval.** Unit/integration/E2E/load runners not selected. Plan task 6 requires green unit tests. | Client decision |
| 2 | `docs/evidence/MANIFEST.md` not written | Execution. No dependency; can start immediately. | `MIGRATION_ENGINEER` |
| 3 | Repository structure not approved | Approval on plan §5 | Client sign-off |
| 4 | Local PostgreSQL 16 not provisioned | Execution | Engineering |
| 5 | Neon dev branch not provisioned | Execution | Engineering |
| 6 | Vercel env secrets not configured | Execution | Engineering |
| 7 | OTel collector + error reporting not configured | Execution | Engineering |
| 8 | Contrib extension availability unconfirmed on target | Verification, not design | Engineering |

**ADR-021 is the only true design blocker.** Everything else is provisioning or
approval, and nothing requires a later phase.

---

## 7. Unresolved decisions

| Decision | Blocks | Owner |
|---|---|---|
| ADR-021 test tooling | **Phase 1 task 6** | Client |
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
| 1 | Plan §35.2 says "no technology has been chosen" while `technical_design/40` ADR-021 names Vitest and Playwright as *proposed* | **Medium** — a reader could install a runner |
| 2 | Plan task 9 seeds "15 metals, 8 jewellery types"; observed counts are 14 metal codes and 5 jewellery types (`R10` is enum-only) | Low |
| 3 | Plan says "thirteen" AI evaluation dimensions in three places; source of truth and `technical_design/32` both enumerate **fourteen** | Low |
| 4 | Plan §35 and `technical_design/02` both use pre-ADR-022 wording for the design system | Informational |

---

## 9. Next major action

1. Client resolves **ADR-021**.
2. Client signs off on the repository structure (`INITIAL_IMPLEMENTATION_PLAN.md` §5).
3. Build `docs/evidence/MANIFEST.md` (plan task 3, no dependency).
4. Provision local PostgreSQL 16 + Neon dev branch; confirm contrib extensions.
5. Then, and only then, begin Phase 1 task 1.

**Do not begin Phase 1 without explicit user approval.**