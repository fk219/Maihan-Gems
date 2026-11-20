/**
 * apps/web/src/app/api/[...path]/route.ts
 *
 * P1.1 — the single Next.js entry point for `/api/**`.
 *
 * There is deliberately ONE catch-all rather than per-endpoint route files:
 * the handler table in `src/api/routes.ts` is the single routing authority, and
 * the parity test (`openapi-parity.spec.ts`) already proves every documented
 * endpoint has a handler. Duplicating 132 endpoints into the App Router would
 * create a second, drifting route table.
 *
 * Node runtime is required: `pg` and `ioredis` are Node APIs, not Edge APIs.
 * The route is dynamic because every response depends on a live database.
 */
import { ContractError } from '@maihan/contracts';
import { getCatalogApi } from '../../../api/next-adapter.js';
import { errorResponse, newRequestId, newTraceId } from '../../../api/envelope.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: Request): Promise<Response> {
  const ids = { traceId: newTraceId(), requestId: newRequestId() };
  let api: Awaited<ReturnType<typeof getCatalogApi>>;
  try {
    api = await getCatalogApi();
  } catch {
    // Configuration or pool-construction failure. The storefront shell still
    // renders; only the API is unavailable, and it says so honestly.
    return errorResponse(
      new ContractError('INTERNAL', 'The API is not configured in this environment.'),
      ids,
    );
  }
  return api(request);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
