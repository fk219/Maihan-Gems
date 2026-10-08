/**
 * packages/contracts/src/openapi/generate.ts
 *
 * Task 8 — OpenAPI generation FROM THE ZOD CONTRACTS.
 *
 * Generator: `@asteasolutions/zod-to-openapi` ("Zod-to-OpenAPI", APPROVED
 * for this slot in SKILL_MATRIX_AND_TOOLING.md §14 — a competing generator
 * is forbidden). Zod stays the single source of truth: every parameter,
 * envelope and error body below is a Zod schema already committed in
 * `src/dto/**`; nothing is hand-written JSON Schema and no request or
 * response schema is duplicated.
 *
 * Documented surface, per the task contract:
 *   - request parameters (flat query params incl. filters, pagination, sort)
 *   - path parameters (the shared IdentifierSchema pattern)
 *   - response envelopes (data/meta/facets/rejectedFilters, provenance)
 *   - the SoT 10.4 error envelope for 400 / 404 / 405 / 429 / 500
 *   - the X-Trace-Id response header (doc 06 conventions)
 *   - the 429 RATE_LIMITED response with Retry-After and the RateLimit-*
 *     budget headers (task 9, SoT 11.11 public-GET policy)
 *   - ONLY endpoints that exist (the CATALOG_ENDPOINTS catalog drives both
 *     apps/web's router and this document — tested for parity)
 *
 * Determinism: no timestamps, no random ids, stable construction order —
 * two generations are byte-identical (tested), and the committed
 * `src/generated/openapi.json` must equal a fresh generation (drift test,
 * doc 06 "OpenAPI drift | Generated spec matches committed spec").
 */
import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
  type ResponseConfig,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { CATALOG_ENDPOINTS, type CatalogEndpoint } from './endpoints.js';
import { ErrorEnvelopeSchema } from '../dto/http/envelopes.js';

// Adds `.openapi()` metadata support to zod schemas. Must run before any
// `.openapi()` call; none of the shared dto schemas call it (metadata stays
// local to this generator), so load order is safe.
extendZodWithOpenApi(z);

const TRACE_HEADER_ENTRY = {
  description: 'Correlation trace id echoed on every response (doc 06 conventions).',
  schema: { type: 'string' },
} as const;

const TRACE_HEADER: ResponseConfig['headers'] = {
  'X-Trace-Id': TRACE_HEADER_ENTRY,
};

/**
 * The 429 response headers (task 9): the trace header plus the draft
 * rate-limit headers. Declared as one contextually-typed constant (the
 * library's header types do not compose under spreads).
 */
const RATE_LIMIT_RESPONSE_HEADERS: ResponseConfig['headers'] = {
  'X-Trace-Id': TRACE_HEADER_ENTRY,
  'Retry-After': {
    description: 'Seconds until the fixed rate-limit window resets.',
    schema: { type: 'integer' },
  },
  'RateLimit-Limit': {
    description: 'Policy limit for this scope (SoT 11.11 public GET: 300/min per IP).',
    schema: { type: 'integer' },
  },
  'RateLimit-Remaining': {
    description: 'Requests remaining in the current window for this client.',
    schema: { type: 'integer' },
  },
  'RateLimit-Reset': {
    description: 'Seconds until the current rate-limit window resets.',
    schema: { type: 'integer' },
  },
};

function errorResponse(description: string): ResponseConfig {
  return {
    description,
    headers: TRACE_HEADER,
    content: { 'application/json': { schema: ErrorEnvelopeSchema } },
  };
}

export interface GenerateOpenApiOptions {
  title?: string;
  version?: string;
  description?: string;
}

const DEFAULT_DESCRIPTION = [
  'Maihan Gems catalogue read API (Phase 3).',
  '[INFERRED / PROPOSED] target API per PROJECT_SOURCE_OF_TRUTH.md section 11;',
  'the source site exposed no observable API surface.',
  'All catalogue endpoints are public GET reads; provenance (source URL,',
  'evidence status, import batch) travels on every product and stone response.',
  'Unmatched paths return NOT_FOUND; non-GET methods return METHOD_NOT_ALLOWED.',
  'Clients exceeding the SoT 11.11 public-GET rate limit (300/min per IP) receive 429 RATE_LIMITED.',
].join(' ');

/** Build the full OpenAPI 3.1 document from the committed Zod contracts. */
export function generateOpenApiDocument(options: GenerateOpenApiOptions = {}): Record<string, unknown> {
  const registry = new OpenAPIRegistry();

  for (const endpoint of CATALOG_ENDPOINTS) {
    registry.registerPath(routeConfig(endpoint));
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const document = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: options.title ?? 'Maihan Gems Catalog API',
      version: options.version ?? '1.0.0',
      description: options.description ?? DEFAULT_DESCRIPTION,
    },
  });
  return document as unknown as Record<string, unknown>;
}

function routeConfig(endpoint: CatalogEndpoint): RouteConfig {
  const responses: RouteConfig['responses'] = {
    '200': {
      description: 'Success.',
      headers: TRACE_HEADER,
      content: { 'application/json': { schema: endpoint.response } },
    },
    '400': errorResponse(
      'VALIDATION_FAILED: malformed query or path input; `details` lists each offending field. Unknown query parameters are rejected, never ignored.',
    ),
    '405': errorResponse('METHOD_NOT_ALLOWED: catalogue endpoints accept GET only.'),
    '429': {
      description:
        'RATE_LIMITED: the SoT 11.11 public-GET policy (300 requests per minute per IP) rejected this client. `Retry-After` names the seconds until the window resets.',
      headers: RATE_LIMIT_RESPONSE_HEADERS,
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
    '500': errorResponse('INTERNAL: unexpected failure; no internal detail is exposed.'),
  };
  if (endpoint.canRespondNotFound) {
    responses['404'] = errorResponse(
      'Unknown identity: PRODUCT_NOT_FOUND / GEMSTONE_NOT_FOUND / SETTING_NOT_FOUND / SETTING_VARIANT_NOT_FOUND with machine-readable `details`.',
    );
  }

  const request: RouteConfig['request'] =
    endpoint.query === undefined && endpoint.pathParams === undefined
      ? undefined
      : {
          ...(endpoint.query === undefined ? {} : { query: endpoint.query }),
          ...(endpoint.pathParams === undefined ? {} : { params: endpoint.pathParams }),
        };

  return {
    method: 'get',
    path: endpoint.path,
    summary: endpoint.summary,
    tags: ['catalog'],
    ...(request === undefined ? {} : { request }),
    responses,
  };
}
