/**
 * apps/web/src/app/api/fresh-auth/[...path]/route.ts
 *
 * `develop`'s customer sign-in family: `/api/fresh-auth/login`, `register`,
 * `request-reset`, `logout`.
 *
 * The path is `/api/fresh-auth/**`, not `/api/fresh/**`, so it needs its own
 * mount. Every handler behind it is a thin adapter over main's existing auth
 * handlers (`src/api/auth-handlers.ts`): the same `users` row, the same scrypt
 * hash, the same `sessions` table and the same `maihan_session` cookie. There is
 * no second auth model (ADR-027).
 *
 * Node runtime (`pg` and `scrypt` are Node APIs). Dynamic: every response
 * depends on a live database and a cookie.
 */
import { ContractError } from '@maihan/contracts';
import { runtimeEnvironment } from '@maihan/config';
import { getServerDb } from '../../../../api/next-adapter.js';
import { createFreshAuthCompatApi } from '../../../../api/fresh/index.js';
import { errorResponse, newRequestId, newTraceId } from '../../../../api/envelope.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  const ids = { traceId: newTraceId(), requestId: newRequestId() };

  let db: Awaited<ReturnType<typeof getServerDb>>;
  try {
    db = await getServerDb();
  } catch {
    return errorResponse(
      new ContractError('INTERNAL', 'The API is not configured in this environment.'),
      ids,
    );
  }

  return createFreshAuthCompatApi({ db, environment: runtimeEnvironment() })(request);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
