/**
 * apps/web/src/api/index.ts
 *
 * Tasks 8-10 — the catalogue API as a single framework-free handler:
 *
 *     (request: Request) => Promise<Response>
 *
 * Web-standard Request/Response on purpose: the Phase 4 Next.js route
 * handlers delegate to exactly this function (doc 08), the node:http adapter
 * in server.ts wraps it, and tests call it directly — one surface, no
 * framework coupling, no new runtime dependency.
 *
 * Pipeline (the order IS the architecture):
 *
 *   1. correlation ids           (doc 06: X-Trace-Id on every response)
 *   2. route lookup              (404 NOT_FOUND / 405 METHOD_NOT_ALLOWED)
 *   3. rate limit                (Task 9 gate: AFTER lookup — unknown paths
 *                                 are 404 without consuming budget — and
 *                                 BEFORE the handler, at the request
 *                                 boundary. Rejection = 429 RATE_LIMITED in
 *                                 the SoT 10.4 envelope with RateLimit-* and
 *                                 Retry-After; allowance attaches its
 *                                 RateLimit-* budget headers to whatever
 *                                 response follows.)
 *   4. handler                   (validate -> one service call -> serialize)
 *   5. cache headers             (Task 10: Cache-Control + Surrogate-Key
 *                                 derived from the handler's CacheInfo and
 *                                 the route's surface policy)
 *   6. error envelope            (SoT 10.4, one registry, no leaks)
 *
 * The handler returns `HandlerOutcome` (status/body/cache); only this module
 * turns it into a `Response`, so response policy can never fork per handler.
 */
import { ContractError } from '@maihan/contracts';
import { HANDLERS, type HandlerOutcome, type RouteContext } from './handlers.js';
import { SEARCH_HANDLERS } from './search-handlers.js';
import { COMMERCE_HANDLERS } from './commerce-handlers.js';
import { ACCOUNT_HANDLERS } from './account-handlers.js';
import { FAVORITES_HANDLERS } from './favorites-handlers.js';
import { ADDON_HANDLERS } from './addon-handlers.js';
import { DISCOUNT_HANDLERS } from './discount-handlers.js';
import { REFUND_HANDLERS } from './refund-handlers.js';
import {
  errorResponse,
  newRequestId,
  newTraceId,
  successResponse,
  type CorrelationIds,
} from './envelope.js';
import { lookupRoute } from './routes.js';
import { applyCacheHeaders } from './headers.js';
import type { RateLimitDecision, RateLimitGate } from './ratelimit/gate.js';
import type { CatalogQueryService } from '../modules/catalog/index.js';
import type { CatalogDatabase } from '@maihan/db';

export type { RateLimitDecision, RateLimitGate } from './ratelimit/gate.js';

export interface CatalogApiOptions {
  service: CatalogQueryService;
  db?: CatalogDatabase;
  /** Injected in tests for deterministic correlation ids. */
  ids?: Partial<CorrelationIds> | (() => CorrelationIds);
  /** Rate-limit gate (Task 9). Absent = no limiter wired (tests, local runs). */
  rateLimit?: RateLimitGate;
}

export type CatalogApi = (request: Request) => Promise<Response>;

function resolveIds(options: CatalogApiOptions): CorrelationIds {
  const spec = options.ids;
  if (typeof spec === 'function') return spec();
  return {
    traceId: spec?.traceId ?? newTraceId(),
    requestId: spec?.requestId ?? newRequestId(),
  };
}

export function createCatalogApi(options: CatalogApiOptions): CatalogApi {
  return async function handle(request: Request): Promise<Response> {
    const ids = resolveIds(options);
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return errorResponse(new ContractError('VALIDATION_FAILED', 'Malformed request URL.'), ids);
    }

    const lookup = lookupRoute(request.method, url.pathname);
    if (lookup.kind === 'not-found') {
      return errorResponse(new ContractError('NOT_FOUND', 'No route matches this path.'), ids);
    }
    if (lookup.kind === 'method-not-allowed') {
      return errorResponse(
        new ContractError('METHOD_NOT_ALLOWED', 'Catalogue endpoints accept GET only.'),
        ids,
      );
    }

    // Task 9: the request-boundary gate. RateLimit-* headers travel on the
    // ALLOWED response too; a rejection is the SoT 10.4 RATE_LIMITED
    // envelope with Retry-After, built by the one envelope builder.
    let rateHeaders: Record<string, string> = {};
    if (options.rateLimit !== undefined) {
      const decision: RateLimitDecision = await options.rateLimit(request, {
        id: lookup.route.id,
        path: lookup.route.path,
      });
      rateHeaders = decision.headers;
      if (!decision.allowed) {
        return errorResponse(
          new ContractError('RATE_LIMITED', 'Rate limit exceeded for this client.'),
          ids,
          rateHeaders,
        );
      }
    }

    const handler =
      HANDLERS[lookup.route.id] ??
      SEARCH_HANDLERS[lookup.route.id] ??
      COMMERCE_HANDLERS[lookup.route.id] ??
      ACCOUNT_HANDLERS[lookup.route.id] ??
      FAVORITES_HANDLERS[lookup.route.id] ??
      ADDON_HANDLERS[lookup.route.id] ??
      DISCOUNT_HANDLERS[lookup.route.id] ??
      REFUND_HANDLERS[lookup.route.id];
    if (handler === undefined) {
      return errorResponse(new ContractError('INTERNAL', 'Unrouted handler.'), ids, rateHeaders);
    }

    const ctx: RouteContext = {
      service: options.service,
      params: lookup.params,
      url,
      ids,
      request,
      db: options.db,
    };

    let outcome: HandlerOutcome;
    try {
      outcome = await handler(ctx);
    } catch (error) {
      return errorResponse(error, ids, rateHeaders);
    }

    // Task 10: cache headers derive from the handler's CacheInfo and the
    // route's surface policy — one place, so no handler can emit its own.
    const cacheHeaders =
      outcome.cache === undefined || lookup.route.surface === undefined
        ? { 'Cache-Control': 'private, no-store' }
        : applyCacheHeaders(outcome.cache, lookup.route.surface);

    return successResponse(outcome.body, outcome.status, ids, { ...cacheHeaders, ...rateHeaders });
  };
}
