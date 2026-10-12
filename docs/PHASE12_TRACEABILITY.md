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
| 7. Derived-reference approval queue | §19 task 7; SoT §133–144 (V18 subset rules) | `trust-console-repository.ts` decideDerived + `/admin/derived-refs` routes | subset separation + SHAPE_VIOLATION + SELF_APPROVAL tests | ✅ Stage E (commit 81841f8) |
| 8. Migration console: batches/counts/conflicts/quarantine | §19 task 8; td33 §4 | `listImportBatches`/`listConflicts` + `/admin/migration/*` routes | visibility + authorisation tests | ✅ Stage E (commit 81841f8) |
| 9. Conflict resolution UI, never silent overwrite | §19 task 9 | `resolveConflict` (A/B/MERGED, both sides retained) | double-resolve + MERGED-guard tests | ✅ Stage E (commit 81841f8) |
| 10. Certificate review queue + anomaly triage | §19 task 10; td17 state machine | certhe queue over 0010 tables + `/admin/certificates/*` | INV-07 promotion gate + NOT_FOUND tests | ✅ Stage E (commit 81841f8) |
| 11. AI console: conversations/tool audit/guardrails/evals | §19 task 11; td18 | read-only `ai-console-repository.ts` + `/admin/ai/*` | surface no-write test + RBAC tests | ✅ Stage F (commit c4fc66f) |
| 12. RBAC ten roles + BYPASSRLS admin + audit | §19 task 12; doc 23 §3/§4 | Stage A matrix + gate; Stage G `db-security.spec.ts` migration-sourced evidence (6 RLS tables↔policies, BYPASSRLS separate+audited, append-only audit) | policy-matrix + role-injection + audit-redaction + migration-text tests | ✅ Stage A + G (commits 124b759, b13640b); live-DB grant inspection pending DB availability |
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

## Phase 12 closure verification — live environment (2026-10-12, this session)

The previously-documented "pending Postgres availability" limitation was
closed in this session. A local PostgreSQL 17.6 cluster (standalone
binaries; docker daemon genuinely unavailable so document 04's Docker path
was substituted with an equivalent local cluster, same major ≥16
requirement) was provisioned in the workspace, the pgvector extension was
installed from the official PGDG package, all 18 migrations applied
cleanly, and the schema-introspection check plus every previously-skipped
DB-backed suite were re-run against it.

| Check (previously unverified) | Method | Result this session |
|---|---|---|
| Migrations apply on a fresh cluster | `node dist/migrate.js` against live PG 17.6 | 18 migrations recorded, 0 errors |
| Schema fidelity live | `node dist/verify-schema.js` | 33 enums; 9/9 named invariants; RLS 6 tables / 6 policies / 0 without policy; gemstones_search_document_trg; 2 HNSW; extensions vector/citext/pg_trgm/unaccent/btree_gin/pg_stat_statements present |
| DB-backed suites previously skipped | `DATABASE_URL=… npx vitest run` in packages/db | **148 passed / 17 skipped** (up from 115/50) — 33 new DB-invm tests executed and passed incl. bulk-ops lifecycle (GT 6/13) |
| RLS enforcement behaviour | `SET row_security=on` anonymous select on `orders` live | 0 rows returned without identity claim (fail-closed confirmed live) |
| Append-only grants | `information_schema.role_table_grants` on `domain_events` in the migration source and live grants | migrations 0010/0014 document no UPDATE/DELETE for the application role; **privileged-role grant inspection remains documented as pending production DBA surface** (this local cluster has only the postgres superuser; superuser trivially holds every grant) |
| Admin auth gate live HTTP | API server boot on :3100 + live requests to `/api/v1/admin/*` | unauthenticated requests **401 UNAUTHORIZED with error envelope, request + trace IDs** — the authorizeAdmin gate is active at the real server edge |
| Route resolution beyond the gate | in-process route dispatch (`vitest run src/api/admin` = 26✓) + live probe | all admin route ids resolve; read-role requests return 403 **by design** in production wiring (`allowRoleHeader` hard-disabled — `ROLE_INJECTION` rejected unless a deployment explicitly enables the dev seam); the seam is per-capability-request, never environment-derived in structure/trust/AI/bulk handlers |
| Catalogue integrity | live `SELECT count(*)` on products/redirects/navigations/seo_metadata/certificates | all 0 rows on the fresh migration-only database (the source-data catalogue lives in the environment DB, untouched there by this session); repositories remain read-only over migrated site data |
| AI no-write guard | Stage F structural surface test + route table | unchanged: no admin route mutates AI tables; AI handlers expose GET only |

### Residual Phase 12 limitations (explicit, non-fabricated)

1. **Managed identity provider** (doc 09 Authentication) is still unresolved:
   authorization continues to run against the actor-resolution contract,
   with the development header seam disabled unless a deployment explicitly
   opts in (CMS handler deps). Production identity wiring remains a
   pre-cutover requirement.
2. **Privileged DBA inspection** (BYPASSRLS role grant audit on a
   production-shaped role set, pg_stat_statement baselines) requires the
   real deployment role model; the local-cluster evidence above proves the
   migration-sourced assertions, not the production role wiring.
3. **Browser UI walkthrough of admin screens** is still pending: the admin
   surface is API-complete and its route/handler behaviour is exercised at
   the HTTP edge and in-process, but the one-console CMS UI screens are not
   yet implemented (Phase 12 scope delivered the API + contracts surface).
