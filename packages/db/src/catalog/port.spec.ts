/**
 * Catalog port integration tests (Phase 3 tasks 1–5, against a local dev
 * database with the Phase 2 load).
 *
 * Graceful degradation, required because the suite runs in three shapes:
 *   1. no DATABASE_URL / unreachable  → every test skips;
 *   2. reachable but schema-less (CI's fresh compose container) → skip;
 *   3. schema present but no Phase 2 load → data-dependent tests skip;
 *   4. full Phase 2 load → everything runs.
 *
 * Publication gating (doc 10): the product surfaces read `state='ACTIVE'`
 * only; the migrated corpus is entirely DRAFT until Phase 12 curation, so
 * product listings are expected EMPTY here and detail lookups of real DRAFT
 * slugs must return PRODUCT_NOT_FOUND. Settings and gemstones are not
 * publication-gated (reference/inventory reads) and carry real rows, which
 * is where pagination/filter/facet/provenance integration coverage lands.
 *
 * Provenance assertions echo Phase 2 semantics: statuses appear verbatim,
 * every evidence-bearing field carries its evidence status, and INFERRED
 * rows stay labelled INFERRED.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase, createCatalogQueryPort } from '../index.js';
import type { CatalogQueryPort } from '@maihan/contracts';
import {
  ProductListResultSchema,
  TaxonomyListSchema,
  encodeProductCursor,
} from '@maihan/contracts';

const SKIP = process.env['SKIP_DB_TESTS'] === '1';
const d = SKIP ? describe.skip : describe;

const EVIDENCE_HIERARCHY = ['OBSERVED', 'EXTRACTED', 'PATTERN', 'INFERRED', 'UNKNOWN'] as const;

/** True when the beforeAll probe reached a migrated catalogue schema. */
let hasSchema = false;
/** True when the schema carries the Phase 2 load (settings/variants present). */
let hasData = false;
/** Count of published products on this database (0 for the DRAFT corpus). */
let activeProductCount = 0;
/** An existing gem reference on this database (the corpus's refs are data, not code). */
let sampleGemRef: string | null = null;

const portReady = (): boolean => port !== undefined && hasSchema;

/**
 * Schema-only test: runs whenever the catalogue schema exists (statement
 * shape, rejection plumbing, cursor validation — none need loaded rows).
 */
const itDb = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!portReady()) return ctx.skip();
    await fn();
  });

/** Data-dependent test: runs only against a Phase-2-loaded database. */
const itData = (name: string, fn: (ctx: import('vitest').TestContext) => Promise<void>) =>
  it(name, async (ctx) => {
    if (!portReady() || !hasData) return ctx.skip();
    await fn(ctx);
  });

let pool: Pool;
let port: CatalogQueryPort;

beforeAll(async () => {
  if (SKIP) return;
  pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 2 });
  try {
    const probe = new Pool({ connectionString: process.env['DATABASE_URL'], max: 1 });
    const schemaRes = await probe.query(`SELECT to_regclass('public.settings') AS t`);
    const schemaExists = schemaRes.rows[0]?.t !== null && schemaRes.rows[0]?.t !== undefined;
    if (schemaExists) {
      const dataRes = await probe.query(
        `SELECT (SELECT count(*) FROM settings) AS settings,
                (SELECT count(*) FROM setting_variants) AS variants,
                (SELECT count(*) FROM products WHERE state = 'ACTIVE') AS active_products`,
      );
      const row = dataRes.rows[0] as { settings: string; variants: string; active_products: string };
      hasData = Number(row.settings) > 0 && Number(row.variants) > 0;
      activeProductCount = Number(row.active_products);
      // Prefer a provenance-carrying (seeded) gemstone — the sample feeds
      // the verbatim-evidence assertion; a leftover ad-hoc fixture row
      // (import_batch NULL) would otherwise defeat it.
      const gemRes = await probe.query(
        `SELECT gem_ref FROM gemstones WHERE deleted_at IS NULL AND import_batch_id IS NOT NULL ORDER BY gem_ref LIMIT 1`,
      );
      sampleGemRef = (gemRes.rows[0] as { gem_ref: string } | undefined)?.gem_ref ?? null;
      const db = createCatalogDatabase(pool);
      port = createCatalogQueryPort(db);
      hasSchema = true;
    }
    await probe.end();
  } catch {
    // Unreachable database: every test above degrades to a skip. No throw —
    // a bare local run must stay green.
    if (pool !== undefined) await pool.end();
    pool = undefined as unknown as Pool;
  }
});

afterAll(async () => {
  await pool?.end();
});

d('CatalogQueryPort.listProducts (tasks 2–4)', () => {
  itDb('returns a contract-valid page and never leaks a DRAFT row (doc 10 gate)', async () => {
    const result = await port.listProducts({});
    expect(() => ProductListResultSchema.parse(result)).not.toThrow();
    expect(result.items.length).toBeLessThanOrEqual(24);
    expect(result.rejected_filters).toEqual([]);
    // Structural gate: only published rows may ever appear, whatever the
    // underlying corpus holds.
    for (const item of result.items) expect(item.state).toBe('ACTIVE');
    if (activeProductCount === 0) {
      // The Phase 2 corpus is entirely DRAFT: an empty public catalogue is
      // the CORRECT response, not a failure.
      expect(result.items).toEqual([]);
      expect(result.meta.has_more).toBe(false);
      expect(result.meta.next_cursor).toBeNull();
      for (const dim of Object.values(result.facets)) expect(dim).toEqual([]);
    }
  });

  itDb('is deterministic: identical queries return identical pages', async () => {
    const a = await port.listProducts({ limit: 5 });
    const b = await port.listProducts({ limit: 5 });
    expect(a.items.map((i) => i.slug)).toEqual(b.items.map((i) => i.slug));
    expect(a.rejected_filters).toEqual(b.rejected_filters);
  });

  itDb('paginates forward with no duplicates across pages (keyset)', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page += 1) {
      const result = await port.listProducts({ limit: 10, cursor: cursor ?? undefined });
      for (const item of result.items) seen.push(item.slug);
      if (!result.meta.has_more) break;
      cursor = result.meta.next_cursor;
      expect(cursor).not.toBeNull();
    }
    expect(new Set(seen).size).toBe(seen.length); // no duplicate records
  });

  itDb('rejects foreign and malformed cursors with VALIDATION_FAILED (task 4)', async () => {
    // A structurally VALID cursor minted under a different total order
    // (price desc) replayed against price asc must be refused — not
    // silently re-anchored.
    const foreign = encodeProductCursor({ v: 1, s: 'price', d: 'desc', n: 7, a: 123.45 });
    await expect(
      port.listProducts({ limit: 2, cursor: foreign, sort: 'price', direction: 'asc' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    // A cursor for a different sort key is equally foreign.
    const otherSort = encodeProductCursor({ v: 1, s: 'weight', d: 'asc', n: 7, a: 123.45 });
    await expect(
      port.listProducts({ limit: 2, cursor: otherSort, sort: 'price', direction: 'asc' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(port.listProducts({ limit: 2, cursor: 'garbage' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  itDb('reports unknown taxonomy values in rejected_filters without widening (task 2)', async () => {
    const result = await port.listProducts({
      filters: { variety: ['definitely-not-a-variety'] },
    });
    expect(result.rejected_filters).toHaveLength(1);
    expect(result.rejected_filters[0]).toMatchObject({
      filter: 'variety',
      value: 'definitely-not-a-variety',
      reason: 'UNKNOWN_VALUE',
      message: expect.stringContaining('rejected'),
    });
    // A lone rejected filter can never constrain: the page equals the unfiltered one.
    const unfiltered = await port.listProducts({});
    expect(result.items.map((i) => i.slug)).toEqual(unfiltered.items.map((i) => i.slug));
  });

  itData('applies a known structured filter and keeps facets consistent (task 3)', async () => {
    // With published rows this asserts non-emptiness; with the current DRAFT
    // corpus it still asserts the gate + the filter predicate holds.
    const filtered = await port.listProducts({
      filters: { jewelleryType: ['RING'] },
      limit: 24,
    });
    for (const item of filtered.items) {
      expect(item.jewellery_type).toBe('RING');
    }
    if (activeProductCount > 0) {
      expect(filtered.items.length).toBeGreaterThan(0);
      const ring = filtered.facets.jewellery_type.find((f) => f.value === 'RING');
      expect(ring?.selected).toBe(true);
      expect(ring!.count).toBeGreaterThanOrEqual(filtered.items.length);
    }
  });

  itDb('is deterministic on zero-result filters (task 3 zero-result case)', async () => {
    const result = await port.listProducts({
      filters: {
        kind: ['CONFIGURED'],
        jewelleryType: ['EARRINGS'],
        metal: ['R10'], // enum-only metal, seeded with zero variants
      },
    });
    expect(result.items).toEqual([]);
    for (const dim of Object.values(result.facets)) {
      expect(dim).toEqual([]);
    }
    expect(result.meta.has_more).toBe(false);
    expect(result.meta.next_cursor).toBeNull();
  });

  itDb('reports an inverted price range as INVALID_RANGE (task 2 ranges)', async () => {
    const result = await port.listProducts({ filters: { minPrice: 500, maxPrice: 100 } });
    expect(result.rejected_filters).toHaveLength(1);
    expect(result.rejected_filters[0]?.reason).toBe('INVALID_RANGE');
  });
});

d('CatalogQueryPort product identity (tasks 1 + 5 provenance)', () => {
  itDb('throws PRODUCT_NOT_FOUND for an unknown slug', async () => {
    await expect(port.getProductBySlug('definitely-not-a-slug')).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      httpStatus: 404,
    });
  });

  itData('detail lookup is publication-gated: real DRAFT slugs are NOT_FOUND (doc 10)', async () => {
    // Fetch a REAL migrated slug straight from the table (the port itself
    // must not return it) and prove the public identity lookup refuses it.
    const res = await pool.query(
      `SELECT slug FROM products WHERE state = 'DRAFT' AND deleted_at IS NULL LIMIT 1`,
    );
    const draftSlug = res.rows[0]?.slug as string | undefined;
    if (draftSlug === undefined) return; // no DRAFT rows to gate — nothing to prove
    await expect(port.getProductBySlug(draftSlug)).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
    });
  });

  itData('returns gemstone detail with verbatim evidence statuses and per-stone rows', async () => {
    if (!sampleGemRef) return ctx.skip();
    const detail = await port.getGemstoneByGemRef(sampleGemRef);
    expect(detail.gem_ref).toBe(sampleGemRef);
    expect(EVIDENCE_HIERARCHY).toContain(detail.provenance.ref_evidence);
    expect(detail.provenance.import_batch).toBeTruthy();
    expect(detail.stones.length).toBe(detail.kind === 'PAIR' ? 2 : 1);
    for (const stone of detail.stones) {
      expect(EVIDENCE_HIERARCHY).toContain(stone.evidence_status);
    }
  });

  itData('preserves INFERRED evidence on derived gemstone identity rows (task 5)', async () => {
    // The 221 derived-only DYO corpus carries INFERRED stone references;
    // the port must echo INFERRED, never promote it.
    const res = await pool.query(
      `SELECT gem_ref FROM gemstones WHERE ref_evidence_status = 'INFERRED' LIMIT 1`,
    );
    const gemRef = res.rows[0]?.gem_ref as string | undefined;
    if (gemRef === undefined) return; // no INFERRED rows on this database
    const detail = await port.getGemstoneByGemRef(gemRef);
    expect(detail.provenance.ref_evidence).toBe('INFERRED');
  });

  itDb('throws GEMSTONE_NOT_FOUND for an unknown gem_ref', async () => {
    await expect(port.getGemstoneByGemRef('ZZZ999')).rejects.toMatchObject({
      code: 'GEMSTONE_NOT_FOUND',
    });
  });
});

d('CatalogQueryPort settings + taxonomy (task 1 read models)', () => {
  itData('lists settings keyset-ordered by design_code with variants batched', async () => {
    const page1 = await port.listSettings({ limit: 5 });
    expect(page1.items.length).toBe(5);
    expect(page1.meta.has_more).toBe(true);
    const codes = page1.items.map((s) => s.design_code);
    expect([...codes].sort()).toEqual(codes); // design_code ascending
    for (const design of page1.items) {
      expect(design.provenance.evidence_status).toBeTruthy();
      for (const variant of design.variants) {
        expect(variant.provenance.import_batch).toBeTruthy();
      }
    }
    // Forward pagination continues without overlap (no duplicates).
    const page2 = await port.listSettings({ limit: 5, cursor: page1.meta.next_cursor! });
    expect(page2.items[0]!.design_code > codes[codes.length - 1]!).toBe(true);
    // Full-walk determinism: a second walk equals the first exactly.
    const walkA = await port.listSettings({ limit: 5 });
    expect(walkA.items.map((s) => s.design_code)).toEqual(codes);
  });

  itData('applies settings filters and reports unknown styles without widening (tasks 2–3)', async () => {
    const filtered = await port.listSettings({
      filters: { jewellery_type: ['RING'] },
      limit: 10,
    });
    expect(filtered.items.length).toBeGreaterThan(0);
    for (const design of filtered.items) expect(design.jewellery_type).toBe('RING');
    // Facet consistency: the jewellery_type facet marks RING selected with a
    // count that covers at least the displayed page.
    const ring = filtered.facets.jewellery_type.find((f) => f.value === 'RING');
    expect(ring?.selected).toBe(true);
    expect(ring!.count).toBeGreaterThanOrEqual(filtered.items.length);

    // Unknown style descriptor → rejected with a reason, page unchanged.
    const unknownStyle = await port.listSettings({
      filters: { style: ['not-a-style-slug'] },
      limit: 10,
    });
    expect(unknownStyle.rejected_filters).toHaveLength(1);
    expect(unknownStyle.rejected_filters[0]?.reason).toBe('UNKNOWN_VALUE');
    const plain = await port.listSettings({ limit: 10 });
    expect(unknownStyle.items.map((s) => s.design_code)).toEqual(
      plain.items.map((s) => s.design_code),
    );
  });

  itData('returns setting detail by design_code and variant detail by SKU', async () => {
    const page = await port.listSettings({ limit: 1 });
    const designCode = page.items[0]!.design_code;
    const detail = await port.getSettingByDesignCode(designCode);
    expect(detail.design_code).toBe(designCode);
    expect(detail.variant_count).toBe(detail.variants.length);

    const sku = detail.variants[0]?.sku;
    if (sku !== undefined) {
      const variantDetail = await port.getSettingVariantBySku(sku);
      expect(variantDetail.variant.sku).toBe(sku);
      expect(variantDetail.design.design_code).toBe(designCode);
      // Variant provenance travels verbatim with its evidence status.
      expect(EVIDENCE_HIERARCHY).toContain(variantDetail.variant.provenance.evidence_status);
      expect(EVIDENCE_HIERARCHY).toContain(variantDetail.variant.provenance.price_evidence);
    }
  });

  itDb('throws SETTING_NOT_FOUND / SETTING_VARIANT_NOT_FOUND for unknown identities', async () => {
    await expect(port.getSettingByDesignCode('ZZZZ99')).rejects.toMatchObject({
      code: 'SETTING_NOT_FOUND',
    });
    await expect(port.getSettingVariantBySku('JSNOPE999')).rejects.toMatchObject({
      code: 'SETTING_VARIANT_NOT_FOUND',
    });
  });

  itData('returns the full taxonomy read model with verbatim evidence statuses', async () => {
    const taxonomy = await port.getTaxonomy();
    expect(() => TaxonomyListSchema.parse(taxonomy)).not.toThrow();
    expect(taxonomy.metals.length).toBe(15); // full enum seeded (R10 INFERRED)
    expect(taxonomy.varieties.length).toBeGreaterThan(0);
    for (const metal of taxonomy.metals) {
      expect(EVIDENCE_HIERARCHY).toContain(metal.evidence_status);
    }
    // The enum-only metal honestly keeps INFERRED — never promoted.
    const r10 = taxonomy.metals.find((m) => m.code === 'R10');
    expect(r10?.evidence_status).toBe('INFERRED');
  });
});
