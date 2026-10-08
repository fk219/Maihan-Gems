/**
 * Pure unit tests for the raw-row mappers and the composed listing
 * statement (no database).
 *
 * Task 5 coverage for PRODUCTS runs here against synthetic raw rows,
 * because the live Phase 2 corpus is entirely DRAFT (and therefore invisible
 * to the public port): the mapper must echo evidence statuses verbatim —
 * INFERRED stays INFERRED — and must never produce a DTO without the
 * evidence status beside its evidence-bearing value.
 *
 * Task 4 / task 2 statement-shape coverage: the composed SQL must carry the
 * publication gate, a strict ROW keyset seek, LIMIT n+1 — and never an
 * OFFSET (offset pagination is forbidden for the catalogue baseline).
 */
import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { ProductSummarySchema, ProductDetailSchema, GemstoneDetailSchema } from '@maihan/contracts';
import { mapProductSummaries, mapProductDetail, mapGemstoneDetail } from './mappers.js';
import { composeProductListStatement } from './products-repository.js';
import { buildProductsWhere, resolveProductFilters } from './predicates.js';
import type { FilterPlan } from './predicates.js';
import type { GemstoneStoneRow } from './gemstones-repository.js';

const toSql = (query: Parameters<PgDialect['sqlToQuery']>[0]): string =>
  new PgDialect().sqlToQuery(query).sql;

/** A complete ACTIVE product summary row as the repository projects it. */
const ACTIVE_PRODUCT_ROW = {
  slug: 'test-ring-slug',
  title: 'Test Ring',
  subtitle: null,
  kind: 'CONFIGURED',
  jewellery_type: 'RING',
  total_weight_ct: '1.234',
  stone_count: 1,
  price_amount: '1999.00',
  currency: 'USD',
  state: 'ACTIVE',
  availability: true,
  variety_slug: 'tsavorite-garnet',
  variety_name: 'Tsavorite Garnet',
  color_slug: 'green',
  color_name: 'Green',
  source_url: 'https://example.test/products/test-ring-slug',
  source_sku: 'JS1150W14',
  source_sku_derived: null,
  price_evidence: 'OBSERVED',
  sku_evidence_status: 'INFERRED', // a derived SKU honestly labelled INFERRED
  import_batch: 'ng-catalog-v1',
};

describe('product summary mapper (task 5)', () => {
  it('echoes provenance verbatim and produces a contract-valid DTO', () => {
    const [dto] = mapProductSummaries([ACTIVE_PRODUCT_ROW]);
    expect(() => ProductSummarySchema.parse(dto)).not.toThrow();
    expect(dto!.provenance).toEqual({
      source_url: 'https://example.test/products/test-ring-slug',
      source_sku: 'JS1150W14',
      source_sku_derived: null,
      import_batch: 'ng-catalog-v1',
      price_evidence: 'OBSERVED',
      sku_evidence: 'INFERRED', // NOT promoted to OBSERVED
    });
  });

  it('keeps DRAFT state verbatim (the mapper echoes; the PORT gates)', () => {
    const [dto] = mapProductSummaries([{ ...ACTIVE_PRODUCT_ROW, state: 'DRAFT' }]);
    expect(dto!.state).toBe('DRAFT');
  });

  it('refuses a row whose evidence status is outside the Phase 2 hierarchy', () => {
    // An unknown enum value (e.g. a fabricated 'VERIFIED') must fail loudly
    // rather than serialise into a response.
    expect(() =>
      mapProductSummaries([{ ...ACTIVE_PRODUCT_ROW, price_evidence: 'VERIFIED' }]),
    ).toThrow();
    expect(() =>
      mapProductSummaries([{ ...ACTIVE_PRODUCT_ROW, price_evidence: null }]),
    ).toThrow();
  });

  it('refuses a row whose evidence status column is absent (declared beside its value)', () => {
    // "no response exposes a field whose evidence status it does not also
    // declare" — a missing evidence column must fail loudly, not serialise.
    const broken: Record<string, unknown> = { ...ACTIVE_PRODUCT_ROW };
    delete broken['price_evidence'];
    expect(() => mapProductSummaries([broken])).toThrow();
  });

  it('always exposes the import batch key (nullable only when the row truly has none)', () => {
    const withoutBatch: Record<string, unknown> = { ...ACTIVE_PRODUCT_ROW };
    delete withoutBatch['import_batch'];
    const [dto] = mapProductSummaries([withoutBatch]);
    expect(dto!.provenance).toHaveProperty('import_batch');
    expect(dto!.provenance.import_batch).toBeNull();
  });
});

describe('product detail mapper (tasks 1 + 5)', () => {
  const DETAIL_ROW = {
    ...ACTIVE_PRODUCT_ROW,
    description: null,
    short_description: null,
    seo_title: null,
    seo_description: null,
    engraving_enabled: false,
    setting_variant_sku: 'JS1150W14',
    setting_variant_slug: '14k-white-gold-pave-ring-setting-js1150w14',
    setting_variant_design_code: '1150',
    gemstone_gem_ref: 'K1324',
    gemstone_kind: 'SINGLE',
    gemstone_source_url: 'https://example.test/gems/k1324',
    gemstone_ref_evidence: 'INFERRED',
    gemstone_price_evidence: 'OBSERVED',
    gemstone_import_batch: 'ng-gems-v1',
    gemstone_pair_gem_ref: null,
    gemstone_pair_kind: null,
    gemstone_pair_source_url: null,
    gemstone_pair_ref_evidence: null,
    gemstone_pair_price_evidence: null,
    gemstone_pair_import_batch: null,
  };

  it('maps the INV-01 aggregate with the stone X-or-pair structure', () => {
    const dto = mapProductDetail(DETAIL_ROW, []);
    expect(() => ProductDetailSchema.parse(dto)).not.toThrow();
    expect(dto.setting_variant?.design_code).toBe('1150');
    expect(dto.gemstone?.gem_ref).toBe('K1324');
    expect(dto.gemstone_pair).toBeNull();
  });

  it('declares the gemstone provenance beside its evidence, verbatim', () => {
    const dto = mapProductDetail(DETAIL_ROW, []);
    expect(dto.gemstone!.provenance).toEqual({
      source_url: 'https://example.test/gems/k1324',
      ref_evidence: 'INFERRED', // stays INFERRED
      price_evidence: 'OBSERVED',
      import_batch: 'ng-gems-v1',
    });
  });

  it('rejects a gemstone embedded without an evidence status', () => {
    const broken = {
      ...DETAIL_ROW,
      // ref_evidence missing from the embedded gemstone provenance block —
      // "no response exposes a field whose evidence status it does not also
      // declare" is enforced by the schema, not by convention.
    } as Record<string, unknown>;
    // Simulate a mapper-path row where the evidence column is absent:
    delete broken['gemstone_ref_evidence'];
    expect(() => mapProductDetail(broken as typeof DETAIL_ROW, [])).toThrow();
  });
});

describe('gemstone detail mapper (tasks 1 + 5)', () => {
  const GEMSTONE_ROW = {
    gem_ref: 'K1324',
    kind: 'SINGLE',
    variety_slug: 'topaz',
    variety_name: 'Topaz',
    species_code: 'silicate',
    species_name: 'Silicate',
    color_slug: 'golden-orange',
    color_name: 'Golden Orange',
    intensity_code: 'vivid',
    intensity_name: 'Vivid',
    clarity_code: 'vvs1',
    clarity_label: 'Very Very Slightly Included',
    shape: 'OVAL',
    cut_label: 'Mixed Brilliant',
    cutting_style: 'FACETED',
    total_weight_ct: '3.640',
    stone_count: 1,
    length_mm: '12.650',
    width_mm: '6.690',
    depth_mm: '4.680',
    treatment_code: 'NONE',
    treatment_label: 'No Enhancement',
    treatment_requires_disclosure: false,
    origin_slug: 'brazil',
    origin_name: 'Brazil',
    price_per_carat: '412.00',
    price_amount: '1499.00',
    currency: 'USD',
    availability: true,
    state: 'ACTIVE',
    source_url: 'https://example.test/gems/k1324',
    ref_evidence: 'OBSERVED',
    price_evidence: 'OBSERVED',
    import_batch: 'ng-gems-v1',
  };

  const STONES: GemstoneStoneRow[] = [
    {
      position: 1,
      weight_ct: 3.64,
      length_mm: 12.65,
      width_mm: 6.69,
      depth_mm: 4.68,
      raw_weight_text: '3.64 Ct.',
      raw_dimensions_text: 'Length: 12.65 Width: 6.69 Height: 4.68',
      evidence_status: 'EXTRACTED',
    },
  ];

  it('maps detail + per-stone rows with declared evidence, verbatim', () => {
    const dto = mapGemstoneDetail(GEMSTONE_ROW, STONES);
    expect(() => GemstoneDetailSchema.parse(dto)).not.toThrow();
    expect(dto.provenance).toEqual({
      source_url: 'https://example.test/gems/k1324',
      ref_evidence: 'OBSERVED',
      price_evidence: 'OBSERVED',
      import_batch: 'ng-gems-v1',
    });
    expect(dto.stones[0]!.evidence_status).toBe('EXTRACTED');
  });

  it('refuses a stone row whose evidence status is fabricated', () => {
    const bad: GemstoneStoneRow[] = [{ ...STONES[0]!, evidence_status: 'VERIFIED' }];
    expect(() => mapGemstoneDetail(GEMSTONE_ROW, bad)).toThrow();
  });
});

describe('composed listing statement (tasks 2 + 4)', () => {
  const EMPTY_PLAN: FilterPlan = {
    kind: [],
    jewelleryType: [],
    singleStone: false,
    pairStone: false,
    varietyIds: [],
    colourIds: [],
    intensityIds: [],
    clarityIds: [],
    treatmentIds: [],
    originIds: [],
    shapes: [],
    metalCodes: [],
    styleIds: [],
    certified: false,
    available: false,
    minPrice: null,
    maxPrice: null,
    minWeightCt: null,
    maxWeightCt: null,
  };

  it('carries the publication gate in the base WHERE (doc 10)', () => {
    const where = toSql(buildProductsWhere(EMPTY_PLAN, 'all'));
    expect(where).toContain(`p.deleted_at IS NULL`);
    expect(where).toContain(`p.state = 'ACTIVE'`);
  });

  it('page AND every facet arm share the same base gate', () => {
    const statement = toSql(
      composeProductListStatement({
        filterPlan: EMPTY_PLAN,
        sortKey: 'price',
        direction: 'asc',
        limitPlusOne: 25,
        cursor: null,
      }),
    );
    expect(statement).toContain(`p.state = 'ACTIVE'`);
    // The page and the arms are ONE statement (single snapshot, task 3).
    expect(statement.match(/state = 'ACTIVE'/g)!.length).toBeGreaterThanOrEqual(2);
  });

  it('uses keyset seek and NEVER OFFSET (task 4)', () => {
    const statement = toSql(
      composeProductListStatement({
        filterPlan: EMPTY_PLAN,
        sortKey: 'price',
        direction: 'asc',
        limitPlusOne: 25,
        cursor: { v: 1, s: 'price', d: 'asc', n: 42, a: 199.5 },
      }),
    );
    expect(statement).not.toMatch(/\bOFFSET\b/i); // offset pagination forbidden
    expect(statement).toMatch(/ROW\(/); // strict tuple seek
    expect(statement).toContain('p.product_number'); // deterministic tiebreaker
    expect(statement).toContain('LIMIT'); // has_more via limit+1
  });

  it('seek direction follows the sort direction', () => {
    const base = {
      filterPlan: EMPTY_PLAN,
      limitPlusOne: 25,
      cursor: { v: 1 as const, s: 'weight' as const, d: 'asc' as const, n: 1, a: -1 },
    };
    const asc = toSql(
      composeProductListStatement({ ...base, sortKey: 'weight', direction: 'asc' }),
    );
    expect(asc).toContain(' > ROW('); // strict '>' seek under asc
    const desc = toSql(
      composeProductListStatement({
        ...base,
        sortKey: 'weight',
        direction: 'desc',
        cursor: { ...base.cursor, d: 'desc' },
      }),
    );
    expect(desc).toContain(' < ROW('); // strict '<' seek under desc
  });
});

describe('filter plan immutability (task 2)', () => {
  it('drops unresolvable descriptors instead of reporting twice', () => {
    const whitelist = {
      variety: new Map(),
      color: new Map(),
      intensity: new Map(),
      clarity: new Map(),
      treatment: new Map(),
      origin: new Map(),
      settingStyle: new Map(),
    };
    const { plan, rejected } = resolveProductFilters(
      {
        kind: [],
        jewelleryType: [],
        gemstoneKind: [],
        variety: ['unknown-slug'],
        color: [],
        intensity: [],
        clarity: [],
        treatment: [],
        origin: [],
        shape: [],
        metal: [],
        settingStyle: [],
        certified: false,
        available: false,
      },
      whitelist,
    );
    // The whitelist owns descriptor rejections (reported once, at the port
    // layer); the plan simply omits what did not resolve.
    expect(plan.varietyIds).toEqual([]);
    expect(rejected).toEqual([]); // no double-reporting here
  });
});

describe('sql fragment hygiene', () => {
  it('never inlines caller values as raw text (parameterised only)', () => {
    const statement = sql`SELECT 1 WHERE x = ${'evil; DROP TABLE products'}`;
    const text = toSql(statement);
    expect(text).toContain('$1'); // parameter placeholder
    expect(text).not.toContain('DROP TABLE'); // value never interpolated
  });
});
