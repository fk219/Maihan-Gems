/**
 * Task 8 — OpenAPI tests (test matrix categories M and N).
 *
 * Four properties:
 *   1. GENERATION: the document builds from the Zod contracts and covers
 *      every Phase 3 endpoint with its parameters and status codes.
 *   2. DETERMINISM: two generations are byte-identical (no timestamps, no
 *      randomness, stable order).
 *   3. SNAPSHOT/DRIFT: the committed `src/generated/openapi.json` equals a
 *      fresh generation — CI fails when contracts and spec diverge
 *      (technical_design/06: "OpenAPI drift | Generated spec matches
 *      committed spec").
 *   4. FIDELITY: documented parameters are EXACTLY the contract schema's
 *      fields, and documented response fields are EXACTLY the envelope
 *      schema's fields — OpenAPI cannot expose a field that is not returned
 *      nor omit one that is.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateOpenApiDocument } from './generate.js';
import { CATALOG_ENDPOINTS } from './endpoints.js';
import {
  CONTRACT_ERROR_CODES,
  IDENTIFIER_PATTERN,
  ProductListQueryParamsSchema,
  SettingListQueryParamsSchema,
  ProductListEnvelopeSchema,
} from '../index.js';

type Json = Record<string, unknown>;

const committedPath = fileURLToPath(new URL('../generated/openapi.json', import.meta.url));

interface DocumentedParameter {
  name: string;
  in: string;
  required?: boolean;
  schema?: Json;
}

interface DocumentedResponse {
  description?: string;
  content?: Record<string, { schema?: Json }>;
}

interface Operation {
  parameters?: DocumentedParameter[];
  responses: Record<string, DocumentedResponse>;
}

const operation = (doc: Json, path: string): Operation => {
  const paths = doc['paths'] as Record<string, Json> | undefined;
  const pathItem = paths?.[path];
  const get = pathItem?.['get'];
  if (get === undefined) throw new Error(`missing documented operation: ${path}`);
  return get as unknown as Operation;
};

const pathsOf = (doc: Json): string[] => Object.keys((doc['paths'] ?? {}) as object);

const successSchema = (doc: Json, path: string): Json | undefined =>
  operation(doc, path).responses['200']?.content?.['application/json']?.schema;

describe('OpenAPI generation', () => {
  const doc = generateOpenApiDocument();

  it('produces an OpenAPI 3.1 document with info and every Phase 3 endpoint', () => {
    expect(doc['openapi']).toBe('3.1.0');
    expect((doc['info'] as Json)['title']).toBe('Maihan Gems Catalog API');
    expect(pathsOf(doc).sort()).toEqual(CATALOG_ENDPOINTS.map((e) => e.path).sort());
    expect(pathsOf(doc).length).toBe(CATALOG_ENDPOINTS.length);
  });

  it('documents the documented status codes per endpoint', () => {
    for (const endpoint of CATALOG_ENDPOINTS) {
      const responses = Object.keys(operation(doc, endpoint.path).responses);
      expect(responses).toContain('200');
      expect(responses).toContain('400');
      expect(responses).toContain('405');
      expect(responses).toContain('429');
      expect(responses).toContain('500');
      if (endpoint.canRespondNotFound) expect(responses).toContain('404');
      // Nothing beyond what the API can actually produce.
      expect(
        responses.filter((code) => code.startsWith('4') || code.startsWith('5')).sort(),
      ).toEqual(endpoint.canRespondNotFound ? ['400', '404', '405', '429', '500'] : ['400', '405', '429', '500']);
    }
  });

  it('documents the X-Trace-Id response header (doc 06 conventions)', () => {
    const success = operation(doc, '/api/v1/products').responses['200'];
    expect(JSON.stringify(success)).toContain('X-Trace-Id');
  });

  it('documents the 429 RATE_LIMITED response with Retry-After and RateLimit-* headers (task 9)', () => {
    const rejected = operation(doc, '/api/v1/products').responses['429'];
    const headers = JSON.stringify(rejected);
    expect(headers).toContain('Retry-After');
    expect(headers).toContain('RateLimit-Limit');
    expect(headers).toContain('RateLimit-Remaining');
    expect(headers).toContain('RateLimit-Reset');
    // Same closed error envelope as every other error response.
    expect(rejected?.content?.['application/json']?.schema).toBeDefined();
  });
});

describe('parameter fidelity', () => {
  const doc = generateOpenApiDocument();

  it('products query parameters are exactly the contract schema fields', () => {
    const documented = (operation(doc, '/api/v1/products').parameters ?? [])
      .filter((p) => p.in === 'query')
      .map((p) => p.name)
      .sort();
    expect(documented).toEqual(Object.keys(ProductListQueryParamsSchema.shape).sort());
  });

  it('settings query parameters are exactly the contract schema fields', () => {
    const documented = (operation(doc, '/api/v1/settings').parameters ?? [])
      .filter((p) => p.in === 'query')
      .map((p) => p.name)
      .sort();
    expect(documented).toEqual(Object.keys(SettingListQueryParamsSchema.shape).sort());
  });

  it('path parameters carry the shared identity pattern and are required', () => {
    const slug = (operation(doc, '/api/v1/products/{slug}').parameters ?? []).find(
      (p) => p.in === 'path',
    );
    expect(slug?.name).toBe('slug');
    expect(slug?.required).toBe(true);
    expect(slug?.schema?.['pattern']).toBe(IDENTIFIER_PATTERN.source);
  });

  it('defaults and enum constraints travel into the document', () => {
    const params = operation(doc, '/api/v1/products').parameters ?? [];
    const limit = params.find((p) => p.name === 'limit');
    expect(limit?.schema?.['default']).toBe(24);
    const sort = params.find((p) => p.name === 'sort');
    expect(sort?.schema?.['enum']).toEqual(['price', 'weight', 'recency']);
  });
});

describe('response fidelity', () => {
  const doc = generateOpenApiDocument();

  it('list response documents EXACTLY the envelope fields (no invented fields)', () => {
    const schema = successSchema(doc, '/api/v1/products');
    const properties = Object.keys(((schema ?? {})['properties'] ?? {}) as object).sort();
    expect(properties).toEqual(Object.keys(ProductListEnvelopeSchema.shape).sort());
    expect(properties).toEqual(['data', 'facets', 'meta', 'rejectedFilters']);
  });

  it('error envelope documents the closed code registry', () => {
    const schema = operation(doc, '/api/v1/products').responses['400']?.content?.[
      'application/json'
    ]?.schema;
    const empty: Json = {};
    const properties = ((schema ?? empty)['properties'] ?? empty) as Json;
    const errorObject = ((properties['error'] ?? empty) as Json)['properties'] ?? empty;
    const codeObject = ((errorObject as Json)['code'] ?? empty) as Json;
    expect(codeObject['enum']).toEqual([...CONTRACT_ERROR_CODES]);
  });
});

describe('determinism and committed-spec drift', () => {
  it('two generations are byte-identical', () => {
    const first = JSON.stringify(generateOpenApiDocument(), null, 2);
    const second = JSON.stringify(generateOpenApiDocument(), null, 2);
    expect(first).toBe(second);
  });

  it('committed openapi.json equals a fresh generation (no drift)', () => {
    const fresh = `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`;
    const onDisk = readFileSync(committedPath, 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk).toBe(fresh);
  });

  it('committed document covers the same endpoints as the catalog', () => {
    const committed = JSON.parse(readFileSync(committedPath, 'utf8')) as Json;
    expect(pathsOf(committed).sort()).toEqual(CATALOG_ENDPOINTS.map((e) => e.path).sort());
  });
});
