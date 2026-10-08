/**
 * Task 8 — API contract tests (test matrix categories C, D, E, R and the
 * envelope half of the Phase 3 acceptance criteria).
 *
 * Runs against the real handler pipeline with a fixture port: this is the
 * layer that proves the DOCUMENTED surface — envelopes, validation, error
 * registry, correlation headers — independent of database state. The
 * database-backed contract checks (rejectedFilters with real taxonomy,
 * pagination over real rows, provenance verbatim from Phase 2) live in
 * `api-db.spec.ts` and skip without DATABASE_URL.
 */
import { describe, expect, it } from 'vitest';
import {
  ErrorEnvelopeSchema,
  FacetDefinitionEnvelopeSchema,
  GemstoneDetailEnvelopeSchema,
  ProductDetailEnvelopeSchema,
  ProductListEnvelopeSchema,
  SettingDesignEnvelopeSchema,
  SettingListEnvelopeSchema,
  SettingVariantEnvelopeResponseSchema,
  ColourListEnvelopeSchema,
  MetalListEnvelopeSchema,
  OriginListEnvelopeSchema,
  VarietyListEnvelopeSchema,
} from '@maihan/contracts';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';

const IDS = { traceId: '00000000000000000000000000000aa1', requestId: 'req_test_000000000001' };

interface Harness {
  api: CatalogApi;
  port: FakeCatalogPort;
}

function buildApi(): Harness {
  const port = new FakeCatalogPort();
  const service = createCatalogQueryService({
    port,
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-contract',
  });
  const api = createCatalogApi({ service, ids: () => ({ ...IDS }) });
  return { api, port };
}

const get = (api: CatalogApi, path: string, init?: RequestInit): Promise<Response> =>
  api(new Request(`http://localhost${path}`, init));

/** Every documented endpoint: 200 + the exact envelope schema OpenAPI documents. */
describe('endpoint envelopes (documented surface)', () => {
  const cases: Array<[string, { parse(v: unknown): unknown }]> = [
    ['/api/v1/products?limit=5', ProductListEnvelopeSchema],
    ['/api/v1/products/pave-green-tourmaline-ring', ProductDetailEnvelopeSchema],
    ['/api/v1/gemstones/K1324', GemstoneDetailEnvelopeSchema],
    ['/api/v1/settings?limit=5', SettingListEnvelopeSchema],
    ['/api/v1/settings/JS1409W14', SettingVariantEnvelopeResponseSchema],
    ['/api/v1/settings/designs/JS1409', SettingDesignEnvelopeSchema],
    ['/api/v1/taxonomy/varieties', VarietyListEnvelopeSchema],
    ['/api/v1/taxonomy/colors', ColourListEnvelopeSchema],
    ['/api/v1/taxonomy/origins', OriginListEnvelopeSchema],
    ['/api/v1/taxonomy/metals', MetalListEnvelopeSchema],
    ['/api/v1/taxonomy/facets', FacetDefinitionEnvelopeSchema],
  ];

  for (const [path, schema] of cases) {
    it(`GET ${path} -> 200 with the documented envelope`, async () => {
      const { api } = buildApi();
      const response = await get(api, path);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('X-Trace-Id')).toBe(IDS.traceId);
      const body: unknown = await response.json();
      expect(() => schema.parse(body)).not.toThrow();
    });
  }
});

describe('validation (strict, machine-readable)', () => {
  it('unknown query parameter -> 400 VALIDATION_FAILED with its name in details', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products?notAFilter=1');
    expect(response.status).toBe(400);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.requestId).toBe(IDS.requestId);
    expect(body.error.traceId).toBe(IDS.traceId);
    expect(JSON.stringify(body.error.details)).toContain('notAFilter');
  });

  it('unknown enum value -> 400 (never coerced, never ignored)', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products?sort=levance');
    expect(response.status).toBe(400);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('VALIDATION_FAILED');
  });

  it('out-of-range and non-numeric pagination -> 400', async () => {
    const { api } = buildApi();
    expect((await get(api, '/api/v1/products?limit=0')).status).toBe(400);
    expect((await get(api, '/api/v1/products?limit=999')).status).toBe(400);
    expect((await get(api, '/api/v1/products?limit=abc')).status).toBe(400);
    expect((await get(api, '/api/v1/products?limit=1&limit=2')).status).toBe(400);
  });

  it('repeated list parameters are accepted as arrays', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products?variety=tsavorite-garnet&variety=padparadscha');
    expect(response.status).toBe(200);
  });

  it('boolean and numeric filters coerce from the query string', async () => {
    const { api } = buildApi();
    expect((await get(api, '/api/v1/products?certified=true&minPrice=100&maxWeightCt=2.5')).status).toBe(200);
    expect((await get(api, '/api/v1/products?certified=maybe')).status).toBe(400);
  });

  it('invalid identity path segment -> 400 before any database access', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products/bad%20slug%21');
    expect(response.status).toBe(400);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(JSON.stringify(body.error.details)).toContain('slug');
  });
});

describe('error registry (SoT 10.4 envelope)', () => {
  it('unknown route -> 404 NOT_FOUND envelope', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/nope');
    expect(response.status).toBe(404);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('NOT_FOUND');
    expect(response.headers.get('X-Trace-Id')).toBe(IDS.traceId);
  });

  it('wrong method -> 405 METHOD_NOT_ALLOWED envelope', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products', { method: 'POST' });
    expect(response.status).toBe(405);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('unknown slug -> 404 PRODUCT_NOT_FOUND with machine-readable details', async () => {
    const { api, port } = buildApi();
    port.notFound.add('missing-product');
    const response = await get(api, '/api/v1/products/missing-product');
    expect(response.status).toBe(404);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
    expect(body.error.details?.[0]?.['field']).toBe('slug');
  });

  it('unexpected failure -> 500 INTERNAL with no internals leaked', async () => {
    const { api, port } = buildApi();
    port.failure = new Error('SELECT * FROM products -- raw sql detail');
    const response = await get(api, '/api/v1/settings');
    expect(response.status).toBe(500);
    const raw = JSON.stringify(await response.json());
    const body = ErrorEnvelopeSchema.parse(JSON.parse(raw));
    expect(body.error.code).toBe('INTERNAL');
    expect(raw).not.toContain('SELECT');
    expect(raw).not.toContain('raw sql');
  });
});

describe('HTTP-level cache behaviour and leakage', () => {
  it('identical requests are byte-identical and hit the cache once', async () => {
    const { api, port } = buildApi();
    const first = await get(api, '/api/v1/products?limit=5&sort=price');
    const second = await get(api, '/api/v1/products?limit=5&sort=price');
    expect(port.calls.listProducts).toBe(1);
    expect(await first.json()).toEqual(await second.json());
  });

  it('response headers never leak cache/Redis implementation details', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products?limit=5');
    for (const [name, value] of response.headers) {
      expect(name).not.toMatch(/redis|x-cache/i);
      expect(value).not.toMatch(/redis|:v1:|mh-test/i);
    }
    // Only documented headers (+ standard content headers).
    expect(response.headers.get('X-Trace-Id')).toBe(IDS.traceId);
  });

  it('error bodies carry correlation but no stack traces', async () => {
    const { api } = buildApi();
    const response = await get(api, '/api/v1/products?limit=0');
    const raw = JSON.stringify(await response.json());
    expect(raw).toContain(IDS.requestId);
    expect(raw).toContain(IDS.traceId);
    expect(raw).not.toMatch(/at .*\.ts:\d+/);
  });
});

describe('provenance and evidence status (Phase 3 task 5 through the API)', () => {
  it('product detail exposes provenance with evidence status beside every evidence field', async () => {
    const { api } = buildApi();
    const body = ProductDetailEnvelopeSchema.parse(await (await get(api, '/api/v1/products/any-slug')).json());
    expect(body.data.provenance.source_url).toContain('https://');
    expect(body.data.provenance.price_evidence).toBe('OBSERVED');
    expect(body.data.provenance.sku_evidence).toBe('OBSERVED');
    expect(body.data.provenance.import_batch).toBe('phase2-load');
  });

  it('gemstone detail exposes provenance verbatim', async () => {
    const { api } = buildApi();
    const body = GemstoneDetailEnvelopeSchema.parse(await (await get(api, '/api/v1/gemstones/K1324')).json());
    expect(body.data.provenance.ref_evidence).toBe('OBSERVED');
    expect(body.data.gem_ref).toBe('K1324');
  });

  it('/taxonomy/facets publishes the closed dimension list with values, no invented counts', async () => {
    const { api } = buildApi();
    const body = FacetDefinitionEnvelopeSchema.parse(await (await get(api, '/api/v1/taxonomy/facets')).json());
    expect(body.data.map((d) => d.dimension)).toEqual([
      'variety',
      'color',
      'jewellery_type',
      'metal',
      'settingStyle',
      'shape',
      'origin',
      'treatment',
    ]);
    for (const dimension of body.data) {
      for (const value of dimension.values) {
        expect(value).not.toHaveProperty('count');
      }
    }
  });
});
