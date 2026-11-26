/**
 * apps/web/src/app/api/fresh/[...path]/route.ts
 *
 * P1.1-compatible mount for the develop-UI compatibility surface.
 *
 * `develop`'s console, vendor portal and storefront helpers fetch
 * `/api/fresh/**`. On `develop` that path was a proxy to its own API service;
 * here it is answered from `main`'s locked schema by
 * `src/api/fresh/index.ts`. Nothing under `src/components` changes: the
 * caller's URLs and response shapes stay as they are.
 *
 * A static segment outranks the generic `[...path]` catch-all in
 * `src/app/api/[...path]/route.ts`, so `/api/fresh/**` lands here and every
 * other `/api/**` path keeps its existing pipeline.
 *
 * Node runtime: `pg` is a Node API. Dynamic: every response depends on a live
 * database and a session cookie.
 *
 * With `DATABASE_URL` unset the pool factory throws; the route answers the
 * documented INTERNAL envelope, exactly as `/api/[...path]` already does, so a
 * build without a database still succeeds and the shell still renders.
 */
import { ContractError } from '@maihan/contracts';
import { runtimeEnvironment } from '@maihan/config';
import { getServerDb } from '../../../../api/next-adapter.js';
import { createFreshCompatApi } from '../../../../api/fresh/index.js';
import { errorResponse, newRequestId, newTraceId } from '../../../../api/envelope.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  const ids = { traceId: newTraceId(), requestId: newRequestId() };

  let db: Awaited<ReturnType<typeof getServerDb>>;
  try {
    db = await getServerDb();
  } catch {
    // Configuration or pool-construction failure only. The compatibility
    // surface says so honestly; it does not pretend the request was unauthorised.
    return errorResponse(
      new ContractError('INTERNAL', 'The API is not configured in this environment.'),
      ids,
    );
  }

  // No `allowRoleHeader`: the compatibility surface accepts the same session
  // cookie as the rest of main, and nothing else. `environment` lets the
  // development-only payment instrument fail closed outside the four local
  // names.
  return createFreshCompatApi({ db, environment: runtimeEnvironment() })(request);
}

// Every verb is exported so a non-GET request to a compatibility path gets the
// documented METHOD_NOT_ALLOWED envelope from the shared route table, not the
// framework's bodyless 405.
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
