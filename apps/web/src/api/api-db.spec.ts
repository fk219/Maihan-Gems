/**
 * Tasks 8-10 — the DB-BACKED contract checks: the documented surface proven
 * against the REAL migrated catalogue (Phase 2 output in `maihan_dev`), not
 * fixtures. This is where "contract tests + facet consistency + pagination
 * determinism + provenance" stop being schema-only assertions and start
 * being data assertions.
 *
 * Requires DATABASE_URL (local PostgreSQL 16, maihan_dev). Without it every
 * test SKIPS — never faked, never invented (AGENTS.md §5: no fabricated
 * source data; the numbers below are read from the live database).
 *
 * Also covers the Task 9 Postgres fallback END-TO-END: Redis primary down ->
 * `rate_limit_counters` counts -> limit still enforced over HTTP.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ErrorEnvelopeSchema,
  ProductDetailEnvelopeSchema,
  GemstoneDetailEnvelopeSchema,
  ProductListEnvelopeSchema,
} from '@maihan/contracts';
import { createCatalogDatabase, createCatalogQueryPort, createPool, type CatalogDatabase } from '@maihan/db';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { PostgresRateLimitStore, type RateLimitStore } from './ratelimit/stores.js';
import { createRateLimitGate } from './ratelimit/gate.js';

const DB_URL = process.env['DATABASE_URL'] ?? null;
const describeDb = DB_URL === null ? describe.skip : describe;

/**
 * True when the target database actually carries the catalogue schema.
 * CI's compose database is fresh (migrations run elsewhere), so the
 * DB-backed suites SKIP there instead of failing on a missing relation.
 */
let schemaReady = false;
let corpusReady = false;

beforeAll(async () => {
  if (DB_URL === null) return;
  const probe = createPool(DB_URL, { max: 1 });
  try {
    const result = await probe.query(
      `SELECT to_regclass('public.products') AS t, to_regclass('public.rate_limit_counters') AS r`,
    );
    const row = result.rows[0] as { t: string | null; r: string | null };
    schemaReady = row.t !== null && row.r !== null;
    if (schemaReady) {
      const dataProbe = await probe.query(
        `SELECT (SELECT count(*) FROM gemstones WHERE gem_ref = 'K1551') AS k1551,
                (SELECT count(*) FROM products WHERE state = 'DRAFT' AND deleted_at IS NULL AND source_url LIKE 'https://naturalgemstones.com/%') AS drafts`,
      );
      const counts = dataProbe.rows[0] as { k1551: string; drafts: string };
      corpusReady = Number(counts.k1551) > 0 && Number(counts.drafts) >= 4;
    }
  } catch {
    schemaReady = false; // unreachable database: every DB-backed test skips
    corpusReady = false;
  } finally {
    await probe.end();
  }
});

/** Runs only when the catalogue schema exists (mirrors packages/db port.spec). */
const itDb = (name: string, fn: () => Promise<void>): void =>
  it(name, async (ctx) => {
    if (!schemaReady) return ctx.skip();
    await fn();
  });

/** Runs only when the Phase 2 source corpus has been loaded into the database. */
const itData = (name: string, fn: () => Promise<void>): void =>
  it(name, async (ctx) => {
    if (!schemaReady || !corpusReady) return ctx.skip();
    await fn();
  });

const IDS = { traceId: '00000000000000000000000000000dd4', requestId: 'req_test_000000000004' };

/** A real gemstone reference from the migrated catalogue (not state-gated). */
const REAL_GEM_REF = 'K1551';

interface DbHarness {
  api: CatalogApi;
  db: CatalogDatabase;
  pool: ReturnType<typeof createPool>;
  close(): Promise<void>;
}

function buildApi(): DbHarness {
  const pool = createPool(DB_URL as string);
  const db = createCatalogDatabase(pool);
  const service = createCatalogQueryService({
    port: createCatalogQueryPort(db),
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-db',
  });
  const api = createCatalogApi({ service, ids: () => ({ ...IDS }) });
  return { api, db, pool, close: () => pool.end() };
}

const get = (api: CatalogApi, path: string): Promise<Response> =>
  api(new Request(`http://localhost${path}`));

interface PublishedFixture {
  slug: string;
  sourceUrl: string | null;
  priorState: string;
}

describeDb('catalogue API against the real migrated database', () => {
  let harness: DbHarness;
  let fixtures: PublishedFixture[] = [];

  beforeAll(async () => {
    if (!schemaReady || !corpusReady) return;
    harness = buildApi();
    // The migrated corpus is DRAFT until Phase 12 curation — the product
    // read model gates on state='ACTIVE' (products-repository.ts, doc 10).
    // To exercise the REAL list / facet / cursor / provenance path against
    // the migrated rows, publish exactly three DRAFT products for the
    // duration of this suite and restore their exact prior state afterwards.
    // maihan_dev is the disposable local dev database (compose.yaml); no
    // archive data is written and nothing outside this database changes.
    const selected = await harness.pool.query(
      `SELECT slug, source_url, state FROM products
        WHERE state = 'DRAFT' AND deleted_at IS NULL AND slug IS NOT NULL AND slug <> ''
        ORDER BY slug LIMIT 3`,
    );
    fixtures = (selected.rows as Array<{ slug: string; source_url: string | null; state: string }>).map(
      (row) => ({ slug: row.slug, sourceUrl: row.source_url, priorState: row.state }),
    );
    expect(fixtures.length).toBe(3); // the migrated corpus must hold DRAFT rows
    await harness.pool.query(
      `UPDATE products SET state = 'ACTIVE', published_at = now() WHERE slug = ANY($1::text[])`,
      [fixtures.map((fixture) => fixture.slug)],
    );
  });

  afterAll(async () => {
    if (!schemaReady || !corpusReady) return;
    for (const fixture of fixtures) {
      await harness.pool.query(
        'UPDATE products SET state = $2, published_at = NULL WHERE slug = $1',
        [fixture.slug, fixture.priorState],
      );
    }
    await harness.close();
  });

  itData('product list: documented envelope, real published items, real facet values', async () => {
    const response = await get(harness.api, '/api/v1/products?limit=2');
    expect(response.status).toBe(200);
    const body = ProductListEnvelopeSchema.parse(await response.json());
    expect(body.data.length).toBe(2);
    expect(body.rejectedFilters).toEqual([]);
    // Publication gate: only ACTIVE rows ever appear.
    for (const item of body.data) expect(item.state).toBe('ACTIVE');
    // Facet consistency: real taxonomy-derived values with counts >= 1.
    expect(body.facets.variety.length).toBeGreaterThan(0);
    for (const value of body.facets.variety) expect(value.count).toBeGreaterThanOrEqual(1);
    // Every listed item carries its identity + provenance (Phase 2 verbatim).
    for (const item of body.data) {
      const fixture = fixtures.find((f) => f.slug === item.slug);
      expect(fixture).toBeDefined();
      expect(item.provenance.source_url).toBe(fixture?.sourceUrl);
      expect(item.provenance.source_url).toMatch(/^https:\/\/naturalgemstones\.com\//);
    }
  });

  itData('pagination determinism: identical requests return identical pages; cursors advance without overlap', async () => {
    const firstA = ProductListEnvelopeSchema.parse(
      await (await get(harness.api, '/api/v1/products?limit=2')).json(),
    );
    const firstB = ProductListEnvelopeSchema.parse(
      await (await get(harness.api, '/api/v1/products?limit=2')).json(),
    );
    // Determinism: same query -> same items, same meta (incl. next_cursor).
    expect(firstA).toEqual(firstB);
    expect(firstA.meta.next_cursor).not.toBeNull();

    const second = ProductListEnvelopeSchema.parse(
      await (
        await get(
          harness.api,
          `/api/v1/products?limit=2&cursor=${encodeURIComponent(firstA.meta.next_cursor as string)}`,
        )
      ).json(),
    );
    expect(second.data.length).toBe(1); // the third published product
    const firstSlugs = firstA.data.map((item) => item.slug);
    const secondSlugs = second.data.map((item) => item.slug);
    expect(firstSlugs.filter((slug) => secondSlugs.includes(slug))).toEqual([]); // keyset pages never overlap
    expect(second.meta.next_cursor).toBeNull(); // end of the published set
  });

  itData('an unsupported filter VALUE is honestly reported in rejectedFilters, never silently dropped', async () => {
    const response = await get(
      harness.api,
      '/api/v1/products?limit=5&variety=definitely-not-a-migrated-variety',
    );
    expect(response.status).toBe(200);
    const body = ProductListEnvelopeSchema.parse(await response.json());
    expect(body.rejectedFilters.length).toBeGreaterThan(0);
    expect(JSON.stringify(body.rejectedFilters)).toContain('definitely-not-a-migrated-variety');
  });

  itData('product detail: real slug resolves and provenance travels verbatim from Phase 2', async () => {
    const fixture = fixtures[0] as PublishedFixture;
    const response = await get(harness.api, `/api/v1/products/${fixture.slug}`);
    expect(response.status).toBe(200);
    const body = ProductDetailEnvelopeSchema.parse(await response.json());
    expect(body.data.slug).toBe(fixture.slug);
    expect(body.data.provenance.source_url).toBe(fixture.sourceUrl);
    expect(body.data.provenance.sku_evidence).toMatch(/^(OBSERVED|EXTRACTED|PATTERN|INFERRED|UNKNOWN)$/);
    expect(typeof body.data.provenance.import_batch).toBe('string');
  });

  itData('the publication gate still bites: a DRAFT product stays 404', async () => {
    const draft = await harness.pool.query(
      `SELECT slug FROM products
        WHERE state = 'DRAFT' AND deleted_at IS NULL AND slug IS NOT NULL AND slug <> ''
          AND slug <> ALL($1::text[])
        LIMIT 1`,
      [fixtures.map((fixture) => fixture.slug)],
    );
    const draftSlug = (draft.rows as Array<{ slug: string }>)[0]?.slug;
    expect(draftSlug).toBeTruthy();
    const response = await get(harness.api, `/api/v1/products/${draftSlug as string}`);
    expect(response.status).toBe(404);
    const body = ErrorEnvelopeSchema.parse(await response.json());
    expect(body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  itData('gemstone detail: real gemRef resolves with provenance', async () => {
    const response = await get(harness.api, `/api/v1/gemstones/${REAL_GEM_REF}`);
    expect(response.status).toBe(200);
    const body = GemstoneDetailEnvelopeSchema.parse(await response.json());
    expect(body.data.gem_ref).toBe(REAL_GEM_REF);
    expect(body.data.provenance.source_url).toMatch(/^https:\/\/naturalgemstones\.com\//);
  });

  itData('taxonomy reflects the migrated reference data (facets endpoint is taxonomy-derived)', async () => {
    const response = await get(harness.api, '/api/v1/taxonomy/facets');
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    const data = (body as { data: Array<{ dimension: string }> }).data;
    // The closed 8-dimensional facet set (facet-definitions.ts).
    expect(data.map((facet) => facet.dimension).sort()).toEqual(
      ['color', 'jewellery_type', 'metal', 'origin', 'settingStyle', 'shape', 'treatment', 'variety'].sort(),
    );
  });
});

describeDb('rate-limit Postgres fallback (rate_limit_counters, end-to-end)', () => {
  let pool: ReturnType<typeof createPool>;
  let db: CatalogDatabase;
  const bucket = `rl:test:dbfallback:${Date.now()}`;

  beforeAll(() => {
    if (!schemaReady) return;
    pool = createPool(DB_URL as string);
    db = createCatalogDatabase(pool);
  });

  // The per-IP gate buckets created by the HTTP test are removed with the
  // suite: they embed the hashed IP + current window, so LIKE + window is
  // the precise cleanup without ever logging the identity.
  const gateWindow = Math.floor(Date.now() / 1000 / 60) * 60;

  afterAll(async () => {
    if (!schemaReady) return;
    // Cleanup: the test buckets leave no rows behind (raw pool query — no
    // ORM import in apps/web; the pool type comes from @maihan/db).
    await pool.query('DELETE FROM rate_limit_counters WHERE bucket = $1', [bucket]);
    await pool.query(
      `DELETE FROM rate_limit_counters WHERE bucket LIKE 'rl:public_get:%' AND window_start = to_timestamp($1)`,
      [gateWindow],
    );
    await pool.end();
  });

  itDb('atomic increment counts 1, 2 in the same window', async () => {
    const store = new PostgresRateLimitStore(db);
    const windowStart = 1_700_000_000;
    expect(await store.increment(bucket, windowStart)).toBe(1);
    expect(await store.increment(bucket, windowStart)).toBe(2);
  });

  itDb('Redis primary down -> the fallback counts -> the limit is still enforced over HTTP', async () => {
    const failingPrimary: RateLimitStore = {
      async increment(): Promise<number> {
        throw new Error('redis down');
      },
    };
    const gate = createRateLimitGate({
      policy: { scope: 'public_get', limit: 2, windowSeconds: 60 },
      backends: { primary: failingPrimary, fallback: new PostgresRateLimitStore(db) },
      failureMode: 'allow',
    });
    const service = createCatalogQueryService({
      port: createCatalogQueryPort(db),
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'mh-test-db-fallback',
    });
    const api = createCatalogApi({ service, ids: () => ({ ...IDS }), rateLimit: gate });
    const ip = (n: number): Request =>
      new Request('http://localhost/api/v1/products?limit=1', {
        headers: { 'x-client-ip': `198.18.0.${n}` },
      });
    expect((await api(ip(1))).status).toBe(200);
    expect((await api(ip(1))).status).toBe(200);
    const rejected = await api(ip(1));
    expect(rejected.status).toBe(429);
    const body = ErrorEnvelopeSchema.parse(await rejected.json());
    expect(body.error.code).toBe('RATE_LIMITED');
    // A different client is unaffected (per-IP buckets live in Postgres too).
    expect((await api(ip(2))).status).toBe(200);
  });
});
