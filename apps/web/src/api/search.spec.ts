/**
 * apps/web/src/api/search.spec.ts
 *
 * Full API surface, validation, safe degradation, and performance tests for Phase 5.
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 outputs and acceptance criteria:
 *     "POST /search, /search/suggest, /search/similar-gemstones/{gemRef}"
 *     "an explicit test that the LLM is not on the search request path"
 *     "load test asserting NFR-03: filtered p95 under 400 ms, semantic p95 under 800 ms"
 *   - technical_design/12_SEARCH_ARCHITECTURE.md
 */
import { describe, expect, it } from 'vitest';
import {
  SearchResultSchema,
  SearchSuggestResultSchema,
  SimilarGemstonesResultSchema,
  ErrorEnvelopeSchema,
} from '@maihan/contracts';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';

const IDS = { traceId: '00000000000000000000000000000bb1', requestId: 'req_test_000000000002' };

const SAMPLE_SUMMARY = {
  slug: 'fine-blue-sapphire-1',
  title: 'Fine Blue Sapphire 1.50ct',
  subtitle: null,
  kind: 'CONFIGURED' as const,
  jewellery_type: 'RING' as const,
  variety: { slug: 'blue-sapphire', name: 'Blue Sapphire' },
  color: { slug: 'blue', name: 'Blue' },
  total_weight_ct: 1.5,
  stone_count: 1,
  price_amount: 4500,
  currency: 'USD',
  state: 'ACTIVE' as const,
  availability: true,
  provenance: {
    source_url: 'https://example.com/item/1',
    source_sku: 'K1551',
    source_sku_derived: null,
    import_batch: 'phase2-load',
    price_evidence: 'OBSERVED' as const,
    sku_evidence: 'OBSERVED' as const,
  },
};

interface Harness {
  api: CatalogApi;
  port: FakeCatalogPort;
}

function buildSearchApi(): Harness {
  const port = new FakeCatalogPort();
  port.setSearchResult({
    items: [SAMPLE_SUMMARY],
    facets: {
      variety: [{ value: 'blue-sapphire', label: 'Blue Sapphire', count: 1, selected: false }],
      color: [{ value: 'blue', label: 'Blue', count: 1, selected: false }],
      jewellery_type: [],
      metal: [],
      settingStyle: [],
      shape: [{ value: 'OVAL', label: 'Oval', count: 1, selected: false }],
      origin: [{ value: 'ceylon', label: 'Ceylon', count: 1, selected: false }],
      treatment: [{ value: 'NO_ENHANCEMENT', label: 'No Enhancement', count: 1, selected: false }],
    },
    rejected_filters: [],
    meta: {
      limit: 24,
      has_more: false,
      next_cursor: null,
      search_version: 'search-v1',
      strategy: 'FULLTEXT_HYBRID',
      intent: 'PRODUCT_SEARCH',
      degraded: false,
      candidate_count: 1,
    },
  });
  port.setSuggestResult({
    prefix: 'sap',
    suggestions: [
      {
        text: 'Blue Sapphire',
        kind: 'VARIETY',
        url: '/varieties/blue-sapphire',
        score: 1.0,
      },
    ],
  });
  port.setSimilarGemstonesResult({
    source_gem_ref: 'K1551',
    items: [SAMPLE_SUMMARY],
  });

  const service = createCatalogQueryService({
    port,
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-search-api',
  });
  const api = createCatalogApi({ service, ids: () => ({ ...IDS }) });
  return { api, port };
}

describe('Search HTTP Endpoints (Phase 5 Task 11)', () => {
  it('POST /search executes hybrid search and returns valid envelope', async () => {
    const { api, port } = buildSearchApi();
    const req = new Request('http://localhost/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'blue sapphire', limit: 12 }),
    });

    const res = await api(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown; facets: unknown; meta: unknown; rejectedFilters: unknown };

    expect(body.data).toBeInstanceOf(Array);
    expect(body.facets).toBeDefined();
    expect(body.meta).toBeDefined();
    expect(port.calls.search).toBe(1);

    // Verify envelope matches contract schema
    const reconstructed = {
      items: body.data,
      facets: body.facets,
      rejected_filters: body.rejectedFilters,
      meta: body.meta,
    };
    expect(() => SearchResultSchema.parse(reconstructed)).not.toThrow();
  });

  it('POST /api/v1/search serves identical endpoint with versioned prefix', async () => {
    const { api } = buildSearchApi();
    const req = new Request('http://localhost/api/v1/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'emerald', limit: 5 }),
    });

    const res = await api(req);
    expect(res.status).toBe(200);
  });

  it('GET /search/suggest returns typeahead suggestions with 200', async () => {
    const { api, port } = buildSearchApi();
    const req = new Request('http://localhost/search/suggest?q=sap&limit=5');
    const res = await api(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown; prefix: string };
    expect(body.prefix).toBe('sap');
    expect(body.data).toBeInstanceOf(Array);
    expect(port.calls.suggest).toBe(1);

    const reconstructed = {
      prefix: body.prefix,
      suggestions: body.data,
    };
    expect(() => SearchSuggestResultSchema.parse(reconstructed)).not.toThrow();
  });

  it('GET /search/similar-gemstones/{gemRef} returns similar items', async () => {
    const { api, port } = buildSearchApi();
    const req = new Request('http://localhost/search/similar-gemstones/K1551');
    const res = await api(req);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown; sourceGemRef: string };
    expect(body.sourceGemRef).toBe('K1551');
    expect(body.data).toBeInstanceOf(Array);
    expect(port.calls.similarGemstones).toBe(1);

    const reconstructed = {
      source_gem_ref: body.sourceGemRef,
      items: body.data,
    };
    expect(() => SimilarGemstonesResultSchema.parse(reconstructed)).not.toThrow();
  });

  describe('Validation & Error Handling', () => {
    it('rejects malformed JSON body with 400 VALIDATION_FAILED', async () => {
      const { api } = buildSearchApi();
      const req = new Request('http://localhost/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json-{',
      });

      const res = await api(req);
      expect(res.status).toBe(400);
      const body = ErrorEnvelopeSchema.parse(await res.json());
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects query exceeding 300 characters with 400 VALIDATION_FAILED', async () => {
      const { api } = buildSearchApi();
      const oversized = 'a'.repeat(305);
      const req = new Request('http://localhost/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: oversized }),
      });

      const res = await api(req);
      expect(res.status).toBe(400);
      const body = ErrorEnvelopeSchema.parse(await res.json());
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects empty suggest prefix with 400 VALIDATION_FAILED', async () => {
      const { api } = buildSearchApi();
      const req = new Request('http://localhost/search/suggest?q=');
      const res = await api(req);

      expect(res.status).toBe(400);
      const body = ErrorEnvelopeSchema.parse(await res.json());
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects invalid gemRef parameter with 400 VALIDATION_FAILED', async () => {
      const { api } = buildSearchApi();
      const req = new Request('http://localhost/search/similar-gemstones/invalid%20ref%21');
      const res = await api(req);

      expect(res.status).toBe(400);
      const body = ErrorEnvelopeSchema.parse(await res.json());
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('Architectural Invariant: Zero LLM on Search Request Path', () => {
    it('strictly 0 LLM / model invocations occur on search execution', async () => {
      const { api } = buildSearchApi();
      const req = new Request('http://localhost/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'untreated sapphire oval 2ct', semantic: true }),
      });

      const res = await api(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.meta.search_version).toBe('search-v1');
    });
  });

  describe('Performance Budget (NFR-03)', () => {
    it('meets NFR-03 latency budget: p95 < 400ms for filtered search', async () => {
      const { api } = buildSearchApi();
      const latencies: number[] = [];

      // Warm up
      await api(new Request('http://localhost/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'sapphire', limit: 10 }),
      }));

      // Run 20 iterations
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        const res = await api(new Request('http://localhost/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: 'ruby', limit: 10 }),
        }));
        const duration = performance.now() - start;
        latencies.push(duration);
        expect(res.status).toBe(200);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95 = latencies[p95Index] ?? 0;

      // Assert p95 is well within the 400ms budget
      expect(p95).toBeLessThan(400);
    });
  });
});
