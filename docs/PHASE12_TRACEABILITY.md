# PHASE 12 — TASK-TO-REQUIREMENT TRACEABILITY

Authority: `INITIAL_IMPLEMENTATION_PLAN.md` §19 (Phase 12 — Admin + CMS),
`technical_design/23_ADMIN_CONSOLE_AND_RBAC.md` (RBAC/console), doc 09
(auth/security), doc 22 (CMS). Statuses update per completed Global Task.

| Phase 12 task (plan §19) | Requirement source | Implementation surface | Tests | Status |
|---|---|---|---|---|
| 1. Typed CMS blocks + 20 renderers | td22 block catalogue; enum `content_block_type` (0002_enums.sql, 20 values) | `packages/contracts/dto/cms/blocks.ts` + `apps/web/src/components/cms/block-renderers.tsx` | schema (contracts 43✓) + renderer tests (9✓) | ✅ Stage B (commits f5eec9c, 3ef9257, c9d25c6) |
| 2. Page revisions DRAFT→IN_REVIEW→PUBLISHED→ARCHIVED | §19 task 2; doc 23 §7 versioning | `packages/db/src/cms/cms-repository.ts` + `apps/web/src/api/admin/cms-handlers.ts` (+ route table 3ef9257) | lifecycle repo tests 8✓ (self-approval, version conflict, transitions) | ✅ Stage B (commits f5eec9c, 3ef9257) |
| 3. Two-person approval for trust content | §19 task 3; doc 23 §8 rule 3 | `TWO_PERSON_MODULES` (domain) + `decideRevision` self-approval rejection + approve scope gate (content:approve = CONTENT_PUBLISHER up) | self-approval rejection tests (db 8✓, web admin 11✓) | ✅ Stage B (content pages scope; module-wide extension pending with Stage E surfaces) |
| 4. Navigation + redirects admin, 44,218 bulk import | §19 task 4; doc 34 | `packages/db/src/cms/{navigation,redirect}-repository.ts` + `apps/web/src/api/admin/catalog-structure-handlers.ts` (+ routes) | 9 validation tests + 8 handler/authz tests | ✅ Stage C (commits 1f29752, 11cefb8) — existing 44,218 rows preserved; bulk import all-or-nothing |
| 5. SEO metadata management | §19 task 5 | `packages/db/src/cms/seo-repository.ts` (+ GT4-commit handler surface) | 6 validation-ordering tests | ✅ Stage C (commit 11cefb8) |
| 6. Catalogue admin: bulk edit, preview, undo | §19 task 6; doc 23 §6 | `packages/db/src/catalog/bulk-operations-repository.ts` + `apps/web/src/api/admin/bulk-handlers.ts` | 4 pure tests + DB-backed lifecycle (skips w/o DB) + authz tests | ✅ Stage D (commit 404af8c) |
| 7. Derived-reference approval queue | §19 task 7; SoT §133–144 (V18 subset rules) | admin API over `products` derived class | INV-08 + per-row approval tests | 🔲 planned (Stage E) |
| 8. Migration console: batches/counts/conflicts/quarantine | §19 task 8; td33 §4 | admin API over `import_batches`/`staging_conflicts` | visibility/authorisation tests | 🔲 planned (Stage E) |
| 9. Conflict resolution UI, never silent overwrite | §19 task 9 | admin API resolution endpoints | non-overwrite tests | 🔲 planned (Stage E) |
| 10. Certificate review queue + anomaly triage | §19 task 10; td17 state machine | admin API over cert repos; thin slice per R-17 | state-machine/authorisation tests | 🔲 planned (Stage E) |
| 11. AI console: conversations/tool audit/guardrails/evals | §19 task 11; td18 | admin API over `@maihan/db ai` tables | redaction + no-write-path tests | 🔲 planned (Stage F) |
| 12. RBAC ten roles + BYPASSRLS admin + audit | §19 task 12; doc 23 §3/§4 | **`@maihan/domain/auth/roles.ts`, `contracts/dto/admin/*`, `apps/web/api/admin/{authz,audit}.ts`** | **policy-matrix + role-injection + audit-redaction tests** | ✅ Stage A (GT-A1..A3) |
| 13. Bulk ops: preview, approval, audit, bounded undo | §19 task 13; doc 23 §6–7 | same bulk repo surface (preview token/apply/revert) | staleness + dual-approval + confirmation + undo tests | ✅ Stage D (commit 404af8c) |

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
