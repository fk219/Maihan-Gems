# `apps/web/src/app/api`

Next-side route handlers. Two live surfaces:

- **`api/search/route.ts`** — the storefront search bar's suggest endpoint.
  Reads the storefront data seam directly (`lib/storefront-data.ts`).
- **`api/v1/[...path]/route.ts`** — the App Router mounting of the
  framework-free app API in `src/api/**` (the single
  `(Request) => Promise<Response>` function that `server.ts` also wraps).
  With `MAIHAN_API_URL` set it FORWARDS to the API process
  (`node dist/api/server.js`, port `API_PORT`, default 3001) — the
  deployment-accurate seam, one API plane, zero extra pools in the Next
  process. Without it, it delegates in-process (single-process local runs).

This realises the mounting reserved by the earlier Task 1 note below: the
frontend phase wires the browser's `/api/v1/**` fetches (cart, checkout,
account, DYO, AI, AR) through the documented delegation instead of leaving
them unrouted.

The framework-free handler itself is NOT re-implemented here and stays the
only place where route logic lives.
