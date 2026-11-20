# P1 + P2/P4 INCREMENT — API MOUNTED, SESSIONS, ADMIN CONSOLE (2026-11-20)

Production program (§37) authorised by the client on 2026-11-20. Two commits:

- `011eb51` — plan §37, ADR-026 (multivendor), ADR-027 (sessions), and the
  Next.js API mount.
- `55ed085` — identity and the admin console.

## What is now true

- **The API exists at runtime.** `app/api/[...path]/route.ts` delegates to the
  same `createCatalogApi` pipeline the tests exercise. Before this, all 132
  route entries were reachable only from `*.spec.ts` files and a standalone
  Node process. `pnpm start` is now `next start`; the node adapter is
  `start:api-legacy`.
- **Admin identity is real.** `users` + `sessions` (migration 0019), scrypt
  password hashing, opaque 256-bit tokens stored as SHA-256, HttpOnly cookie,
  session-first authorization. The `x-admin-*` header seam is reachable only
  when explicitly enabled AND the environment is development/test/local; an
  omitted environment fails closed.
- **The CMS endpoints are routed.** They existed, were tested and were
  unreachable. Eight routes now register under `/api/v1/admin/cms/**`.
- **The admin console renders.** `/admin/login` signs in; `/admin` lists CMS
  pages and publishes/archives them. The API enforces authorization; the UI
  only reflects it.
- **A first admin can be created** with
  `ADMIN_SEED_EMAIL=… ADMIN_SEED_PASSWORD=… pnpm --filter @maihan/web run create-admin`.

## Verified

- `pnpm -r run typecheck` — 0 errors across 9 projects.
- `pnpm --filter @maihan/domain exec vitest run src/auth` — 20 passed.
- `pnpm --filter @maihan/web run test` — 404 passed, 21 skipped, 3 suites fail
  on the **pre-existing** Neon credential error (checkout, order, webhook).
  No new failures.
- `route-manifest` 9/9, `openapi-parity` and `admin/authz` green.

## Still blocked / not done

- **P0.1** — `DATABASE_URL` in `.env` is stale (`28P01`). No migration, no
  runtime verification, no store build until the client supplies the current
  Neon password. Everything above is verified by types and unit tests only.
- **P3** — no publish path for `products`, no media storage. The storefront
  still cannot show a real, purchasable product. This is the next task.
- **P5/P6** — vendor portal and multivendor commerce are schema-only decisions
  so far (ADR-026 accepted, no tables yet).
- Login throttling beyond the global rate limit is still open.
