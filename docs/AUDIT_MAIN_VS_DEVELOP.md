# AUDIT — `main` vs `develop`

Date: 2026-11-26. Method: read-only git inspection (`git ls-tree`, `git show`,
`git rev-list`). No checkout was used for the analysis; a detached worktree was
created separately for browsing develop's code.

Goal: keep **develop's design and theme** for the storefront and every portal,
while carrying **main's backend and code-level capabilities**. This document
records what must move, in what order, and what must not be lost.

---

## 1. The two architectures are different

| | `main` (8778b67, 2026-11-26) | `develop` (b965cc1, 2026-11-01) |
|---|---|---|
| Backend shape | `packages/db` shared + API mounted inside Next | separate service `apps/fresh-api` |
| SQL migrations | **22** (0001-0022) | **0** |
| Schema | locked, measured (83 tables) | "fresh clean schema" (`technical_design/43`) |
| Shared data layer | 129 files | none |
| Worker | `apps/worker` (37 files) | absent |
| Test files | 134 | 71 |
| `apps/web` | 280 files | 471 files (design) |
| Divergence | 69 commits main-only | 134 commits develop-only |

This is not "frontend vs backend". It is **two data architectures**. A port is a
reconciliation, not a copy.

---

## 2. What `main` has that `develop` lacks (ignore design)

| # | Capability | Evidence | Port cost |
|---|---|---|---|
| 1 | Ordered SQL migrations (22) | `packages/db/migrations/0001..0022` | highest (schema reconciliation) |
| 2 | Shared repositories | `packages/db/src/**` (129 files) | high |
| 3 | Schema fidelity harness | `expected-schema.ts`, `introspect.ts`, `assert-schema.ts` | low |
| 4 | Search platform | intent, structured, fulltext, trigram, semantic, facets, ranking, circuit breaker, cache | high |
| 5 | Commerce core | cart, checkout, orders, payments, refunds, discounts, addons, wishlist | high |
| 6 | Admin governance | conflicts, 221 derived identities, certificate queue, bulk edit + undo, two-person rule | high |
| 7 | Vendor portal backend | vendor-scoped repository + API + UI | medium |
| 8 | Customer auth | sessions, scrypt, verification, password reset | medium |
| 9 | Async platform | outbox dispatcher, handlers, email transports, SIGTERM | medium |
| 10 | Migration tooling | `tools/migrate` (26 files, 14 stages, SHA-256 gating) | medium |
| 11 | Media pipeline | storage port, content-addressed ingest, backfill, delivery | medium |
| 12 | Contracts + OpenAPI | `@maihan/contracts` with parity tests | low |
| 13 | ADRs 026/027, backlog, autonomous brief | `technical_design/40`, `BUILD_BACKLOG.md` | low |

## 3. What `develop` has that `main` lacks (do not lose)

| Capability | Files |
|---|---|
| TOTP / 2FA | `apps/fresh-api/src/totp.ts` |
| OpenTelemetry, tracing, metrics | `otel.ts`, `tracing.ts`, `metrics.ts` |
| Rate limiting service | `rate-limit.ts` |
| Mail outbox drain | `drain-outbox.ts`, `mail.ts` |
| Maintenance CLI | `maintenance.ts`, `maintenance-cli.ts` |
| Vendor onboarding / submissions / analytics | `onboarding.ts`, `submissions.ts`, `vendor-analytics.ts` |
| Vendor auth | `vendor-auth.ts` |
| Separate API process | `apps/fresh-api/src/server.ts` |
| Design and theme | `apps/web` (471 files) |

---

## 4. Non-negotiable rule

**Never let develop's schema replace main's.** Develop has zero migrations; its
"fresh schema" cannot reproduce an environment. Main's 22 migrations and the
measured 83-table schema are the only source of truth.

Design may move freely. Data model may not.

---

## 5. Target architecture

```
apps/web          develop's design, Next.js, UI only
apps/api          develop's fresh-api shell, ON packages/db (not its own db.ts)
apps/worker       main's outbox, handlers, email, schedules
packages/db       main — 22 migrations, locked schema
packages/domain   main — pure invariants
packages/contracts main — DTO + OpenAPI
packages/observability  develop's wired OTel + main's package
```

## 6. Execution plan

### Phase 0 — safe base (0.5 day)
1. Branch `integration` from `main`.
2. Keep `develop` frozen; never merge it wholesale.
3. Create a detached worktree for develop (already at `../Maihan Gems-develop`).

### Phase 1 — shell and swap (2-3 days)
4. Copy `apps/fresh-api` into `apps/api`.
5. Replace its `db.ts` / `migrate.ts` with `packages/db` and the existing runner.
6. Delete duplicate schema definitions; API reads the locked schema only.
7. Move OTel/metrics/tracing/rate-limit into `packages/observability` so web, api
   and worker share one implementation.
8. Port TOTP, mail drain, maintenance, vendor onboarding/submissions/analytics
   onto the locked schema.

### Phase 2 — web design (3-5 days)
9. Bring `develop`'s `apps/web` onto `integration`.
10. Re-point imports: develop's web calls the API over HTTP; main's web calls
    in-process. Choose ONE (recommended: HTTP via `apps/api`).
11. Re-attach main's working flows that the design does not yet have: admin
    console, vendor portal, account, checkout states.
12. Re-run the design audit harness (`docs/design-shots/v2`).

### Phase 3 — parity gates (2-3 days)
13. `pnpm -r run typecheck` — 0 errors across every workspace.
14. All 134 test files pass, not just develop's 71.
15. `pnpm --filter @maihan/web run build` with no `DATABASE_URL`.
16. Schema fidelity assertion green against `maihan_dev`.
17. axe: 0 violations on every page, all four widths.
18. Bundle budgets: <= 170 / 190 KB gzip.
19. Deploy preview; verify storefront, admin, vendor, account.

### Phase 4 — decommission (0.5 day)
20. Archive `develop` as a tag (`develop-archive-2026-11-01`); do not delete.
21. Document the new branch model in `AGENTS.md`.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Develop's web calls a different API contract | Freeze the HTTP contract first; port develop's UI against main's DTOs |
| Two auth models (sessions vs vendor-auth) | One session model; vendor membership is a scope, not a second login |
| Design regression while wiring real data | Screenshot every page before and after; the harness fails on drift |
| Hidden duplication in develop's API | Delete develop's db layer outright rather than reconcile line by line |
| Time overrun | Phase 1 is the gate: if the API on `packages/db` does not typecheck, stop and reassess |

---

## 8. What this does NOT do

- It does not merge develop's schema.
- It does not copy develop's tests over main's; main's stay.
- It does not delete history.
- It does not claim the result is production-ready: payments, media delivery
  credentials and email provider remain external decisions.
