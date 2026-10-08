/**
 * Task 8 — OpenAPI parity: the generated document, the router and the
 * handlers must describe the SAME API.
 *
 * Three directions, each a hard failure:
 *   - a documented endpoint with no handler      -> the spec lies
 *   - a handler with no documented endpoint      -> an undocumented surface
 *   - a documented path the router cannot match  -> a dead endpoint
 *
 * This is what makes "do not document endpoints that do not exist" and "do
 * not expose fields you do not return" mechanically enforced: the document
 * is generated from the contract catalog, the router is derived from the
 * same catalog, and the handler table is asserted to cover it exactly.
 */
import { describe, expect, it } from 'vitest';
import { CATALOG_ENDPOINTS, generateOpenApiDocument } from '@maihan/contracts';
import { CATALOG_ROUTES, lookupRoute } from './routes.js';
import { HANDLERS } from './handlers.js';

type Json = Record<string, unknown>;

describe('OpenAPI <-> router parity', () => {
  const doc = generateOpenApiDocument();
  const documentedPaths = Object.keys((doc['paths'] ?? {}) as object).sort();

  it('router exposes exactly the documented paths', () => {
    expect(CATALOG_ROUTES.map((r) => r.path).sort()).toEqual(documentedPaths);
  });

  it('every documented endpoint resolves to a GET route through the router', () => {
    for (const endpoint of CATALOG_ENDPOINTS) {
      const concrete = endpoint.path.replace(/\{(\w+)\}/g, 'TESTVALUE');
      const lookup = lookupRoute('GET', concrete);
      expect(lookup.kind).toBe('match');
      if (lookup.kind !== 'match') continue;
      expect(lookup.route.path).toBe(endpoint.path);
      expect(lookup.route.surface).toBeTruthy();
    }
  });

  it('path captures land in route params', () => {
    const lookup = lookupRoute('GET', '/api/v1/settings/designs/JS1409');
    expect(lookup.kind).toBe('match');
    if (lookup.kind === 'match') {
      expect(lookup.params).toEqual({ designCode: 'JS1409' });
    }
  });
});

describe('OpenAPI <-> handler parity', () => {
  it('every documented endpoint id has exactly one handler', () => {
    const handlerIds = Object.keys(HANDLERS).sort();
    const endpointIds = CATALOG_ENDPOINTS.map((e) => e.id).sort();
    expect(handlerIds).toEqual(endpointIds);
  });

  it('every route id is documented (no undocumented surface)', () => {
    const endpointIds = new Set(CATALOG_ENDPOINTS.map((e) => e.id));
    for (const route of CATALOG_ROUTES) {
      expect(endpointIds.has(route.id)).toBe(true);
    }
  });

  it('documented operations are GET-only, matching the router', () => {
    const paths = (doc2()['paths'] ?? {}) as Json;
    for (const [, item] of Object.entries(paths)) {
      const methods = Object.keys(item as Json).sort();
      expect(methods).toEqual(['get']);
    }
  });
});

function doc2(): Json {
  return generateOpenApiDocument();
}
