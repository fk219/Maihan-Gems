# PHASE 12 — TASK-TO-REQUIREMENT TRACEABILITY

Authority: `INITIAL_IMPLEMENTATION_PLAN.md` §19 (Phase 12 — Admin + CMS),
`technical_design/23_ADMIN_CONSOLE_AND_RBAC.md` (RBAC/console), doc 09
(auth/security), doc 22 (CMS). Statuses update per completed Global Task.

| Phase 12 task (plan §19) | Requirement source | Implementation surface | Tests | Status |
|---|---|---|---|---|
| 1. Typed CMS blocks + 20 renderers | td22 block catalogue; enum `content_block_type` (0002_enums.sql, 20 values) | `packages/contracts/dto/cms/blocks.ts` + `apps/web` renderers | schema + renderer snapshot tests | 🔲 planned (Stage B) |
| 2. Page revisions DRAFT→IN_REVIEW→PUBLISHED→ARCHIVED | §19 task 2; doc 23 §7 versioning | `packages/db/src/cms/*`, `apps/web` approval API | transition/concurrency/audit tests | 🔲 planned (Stage B) |
| 3. Two-person approval for trust content | §19 task 3; doc 23 §8 rule 3 | `TWO_PERSON_MODULES` + approval service | self-approval rejection tests | 🔲 planned (Stage E) |
| 4. Navigation + redirects admin, 44,218 bulk import | §19 task 4; doc 34 | admin API over `navigations`/`redirects` | loop/conflict/uniqueness tests | 🔲 planned (Stage C) |
| 5. SEO metadata management | §19 task 5 | admin API over `seo_metadata` | validation tests | 🔲 planned (Stage C) |
| 6. Catalogue admin: bulk edit, preview, undo | §19 task 6; doc 23 §6 | admin API over catalogue repos | preview-staleness/invariant tests | 🔲 planned (Stage D) |
| 7. Derived-reference approval queue | §19 task 7; SoT §133–144 (V18 subset rules) | `packages/db/src/admin/governance-repository.ts`; `apps/web/api/admin/governance-handlers.ts`; `/admin/derived-identities` | INV-08 + per-row approval tests | ✅ Stage E (C6) |
| 8. Migration console: batches/counts/conflicts/quarantine | §19 task 8; td33 §4 | `packages/db/src/admin/governance-repository.ts`; `apps/web/api/admin/governance-handlers.ts`; `/admin/migration` | visibility/authorisation tests | ✅ Stage E (C4) |
| 9. Conflict resolution UI, never silent overwrite | §19 task 9 | `apps/web/api/admin/governance-handlers.ts`; `/admin/migration` | non-overwrite tests | ✅ Stage E (C5) |
| 10. Certificate review queue + anomaly triage | §19 task 10; td17 state machine | admin API over cert repos; thin slice per R-17 | state-machine/authorisation tests | 🔲 planned (Stage E) |
| 11. AI console: conversations/tool audit/guardrails/evals | §19 task 11; td18 | admin API over `@maihan/db ai` tables | redaction + no-write-path tests | 🔲 planned (Stage F) |
| 12. RBAC ten roles + BYPASSRLS admin + audit | §19 task 12; doc 23 §3/§4 | **`@maihan/domain/auth/roles.ts`, `contracts/dto/admin/*`, `apps/web/api/admin/{authz,audit}.ts`** | **policy-matrix + role-injection + audit-redaction tests** | ✅ Stage A (GT-A1..A3) |
| 13. Bulk ops: preview, approval, audit, bounded undo | §19 task 13; doc 23 §6–7 | admin API bulk endpoints | undo-window tests | 🔲 planned (Stage D) |

## Stage A — implemented and verified (commands + results)

| Item | Verification |
|---|---|
| Ten-role matrix as pure domain data (`ADMIN_ROLES`/`ROLE_SCOPES`/`hasCapability`) | `packages/domain`: `pnpm build` 0 errors; `vitest run src/auth` → 12 passed |
| Actor resolution contract (identity ≠ customer; role never client-asserted) | `packages/contracts`: `pnpm build` 0 errors; full suite → 18 passed |
| Admin authorization gate + audit redaction in `apps/web` | `apps/web`: `tsc -b` 0 errors; full suite → 409 passed, 16 skipped (47 files) |
| V18 re-verified on the live dev DB during pre-flight | exact 221 subset: 0 violations; break-down 221 + 8,567 CONFIGURED-derived + 88 READY_MADE-derived (code-documented design) |

## Stage A explicit non-goals carried forward

- The managed identity provider (doc 09 Authentication) remains a later task:
  Stage A ships the actor RESOLUTION contract and gates against a
  server-trusted header seam that production must not enable; swapping the
  resolution source to real sessions does not change the contract.
- RLS `BYPASSRLS` wiring and the append-only DB grant checks for
  `audit_logs` are enforced at the DB layer (0016_rls.sql) and re-validated
  in the Stage G gate.

## Stage E (tasks 7-9) — implemented and verified (commands + results)

| Item | Verification |
|---|---|
| Data-governance repository (batches / conflicts / derived identities) | `packages/db`: `tsc -b` 0 errors; `vitest run src/admin/governance-repository.spec.ts` → 14 passed |
| Six admin endpoints + gate-first authorization | `apps/web`: `tsc -b` 0 errors; `vitest run src/api/admin/governance-handlers.spec.ts` → 12 passed |
| Full suites after the change | `@maihan/db` → 219 passed, 33 skipped; `@maihan/web` → 467 passed, 21 skipped |
| Workspace typecheck | `pnpm -r run typecheck` → 0 errors |
| Production build with no database | `pnpm --filter @maihan/web run build` → exit 0 with `DATABASE_URL` unset (Next 16.4.0 advisory reminder on first attempt; build continues on retry) |

### Stage E follow-up — INV-08 decision moved to a real column (2026-11-23)

| Item | Verification |
|---|---|
| Migration 0022 `packages/db/migrations/0022_product_review_state.sql` | expand-only: four nullable `products` columns (`review_state`, `review_note`, `reviewed_by` FK → `users`, `reviewed_at`), one CHECK, one partial index `products_review_state_idx`; JSON-era APPROVED/REJECTED carried forward, every other derived identity set PENDING; `structured_extra` untouched; journal `idx 21` |
| Governance repository reads/writes the columns | `@maihan/db`: `tsc -b` 0 errors; `vitest run src/admin/governance-repository.spec.ts` → 17 passed |
| Full suites after the change | `@maihan/db` → 222 passed, 33 skipped; `@maihan/web` → 467 passed, 21 skipped |
| Workspace typecheck | `pnpm -r run typecheck` → 0 errors |
| Not done here | no database was connected and migration 0022 was not applied; the schema-fidelity absolute counts still await a sanctioned fresh-database run (TODO in `expected-schema.ts`) |

### Stage E explicit non-goals carried forward

- ~~The locked `products` table has no `review_state` column. The INV-08
  decision is recorded in `products.structured_extra` under
  `derived_identity_review` and projected as `review_state`; a future approved
  schema change should move it to a real column.~~ **Resolved 2026-11-23 by
  migration 0022.** `products.review_state`, `review_note`, `reviewed_by` and
  `reviewed_at` are explicit columns with the partial index
  `products_review_state_idx`; the governance repository reads and writes those
  columns and no longer reads the `structured_extra` `derived_identity_review`
  key (ADR-024: an approval fact must be filterable and gate-enforceable). The
  JSON itself is left untouched on existing rows. Migration 0022 is registered
  in `_journal.json` (idx 21) but **has not been applied to any database** — the
  client applies it.
- Quarantine is a per-batch recorded count (`records_quarantined`); the schema
  has no per-row quarantine ledger, so the console cannot list quarantined
  rows.
- The console renders the first 50 rows of each queue with the true total;
  pagination controls are not part of this stage.
- No statement was executed against PostgreSQL in this stage; the SQL is
  proven by fake-executor text/shape assertions plus typecheck.

