/**
 * apps/web/src/modules/catalog/testing/doubles.ts
 *
 * Test doubles for the catalogue module: a fake CatalogQueryPort with
 * contract-valid fixtures, plus failure-injectable cache/generation stores.
 *
 * These are what let the Task 6/7 tests simulate EVERY failure mode exactly —
 * Redis unavailable, GET failure, SET failure, index/invalidation failure,
 * generation failure, malformed payloads — without a live Redis, deterministically.
 * The live-Redis suites exercise the real client when REDIS_URL is present.
 *
 * Not shipped as runtime behaviour: this folder is imported only by *.spec.ts
 * (mirrors packages/domain/src/testing/).
 */
import type {
  CatalogQueryPort,
  GemstoneDetailReadModel,
  ProductDetailReadModel,
  ProductListQuery,
  ProductListResult,
  SettingDesignReadModel,
  SettingListQuery,
  SettingListResult,
  SettingVariantEnvelope,
  TaxonomyReadModel,
  SearchQuery,
  SearchResult,
  SearchSuggestQuery,
  SearchSuggestResult,
  SimilarGemstonesResult,
} from '@maihan/contracts';
import { contractNotFound } from '@maihan/contracts';
import { MemoryCacheStore, MemoryGenerationStore } from '../infrastructure/cache-store.js';
import type { CacheStore } from '../infrastructure/cache-store.js';
import type { GenerationStore } from '../application/generation-store.js';
import type { CacheScope, Generation } from '../application/cache-identity.js';

// ─── Contract-valid fixtures ──────────────────────────────────────────────────

const EMPTY_FACETS = {
  variety: [],
  color: [],
  jewellery_type: [],
  metal: [],
  settingStyle: [],
  shape: [],
  origin: [],
  treatment: [],
} as ProductListResult['facets'];

export function emptyProductList(limit = 24): ProductListResult {
  return {
    items: [],
    facets: EMPTY_FACETS,
    rejected_filters: [],
    meta: { limit, has_more: false, next_cursor: null },
  };
}

export function emptyTaxonomy(): TaxonomyReadModel {
  return {
    species: [],
    varieties: [],
    colours: [],
    intensities: [],
    clarities: [],
    origins: [],
    treatments: [],
    metals: [],
    setting_styles: [],
    jewellery_types: [],
  };
}

export function productDetailFixture(slug = 'pave-green-tourmaline-ring'): ProductDetailReadModel {
  return {
    slug,
    title: 'Pave Green Tourmaline Ring 1.28 Ct., 14K White Gold',
    subtitle: null,
    kind: 'CONFIGURED',
    jewellery_type: 'RING',
    variety: { slug: 'green-tourmaline', name: 'Green Tourmaline' },
    color: { slug: 'green', name: 'Green' },
    total_weight_ct: 1.28,
    stone_count: 1,
    price_amount: 3420,
    currency: 'USD',
    state: 'ACTIVE',
    availability: true,
    provenance: {
      source_url: 'https://naturalgemstones.com/green-tourmaline-ring-example',
      source_sku: 'JS1409W14',
      source_sku_derived: null,
      import_batch: 'phase2-load',
      price_evidence: 'OBSERVED',
      sku_evidence: 'OBSERVED',
    },
    description: null,
    short_description: null,
    seo_title: null,
    seo_description: null,
    engraving_enabled: false,
    setting_variant: { sku: 'JS1409W14', slug: 'js1409w14-variant', design_code: 'JS1409' },
    gemstone: {
      gem_ref: 'K1324',
      kind: 'SINGLE',
      provenance: {
        source_url: 'https://naturalgemstones.com/green-tourmaline-example',
        ref_evidence: 'OBSERVED',
        price_evidence: 'OBSERVED',
        import_batch: 'phase2-load',
      },
    },
    gemstone_pair: null,
  };
}

export function gemstoneDetailFixture(gemRef = 'K1324'): GemstoneDetailReadModel {
  return {
    gem_ref: gemRef,
    kind: 'SINGLE',
    variety: { slug: 'green-tourmaline', name: 'Green Tourmaline' },
    species: { slug: 'tourmaline', name: 'Tourmaline' },
    color: { slug: 'green', name: 'Green' },
    intensity: { code: 'medium', label: 'Medium' },
    clarity: { code: 'VSI', label: 'Very Slightly Included' },
    shape: 'OVAL',
    cut_label: 'Mixed Brilliant Cut',
    cutting_style: 'FACETED',
    total_weight_ct: 1.28,
    stone_count: 1,
    length_mm: 7.1,
    width_mm: 5.4,
    depth_mm: 3.9,
    treatment: { code: 'NO_ENHANCEMENT', label: 'No Enhancement', requires_disclosure: false },
    origin: { slug: 'brazil', name: 'Brazil' },
    price_per_carat: 700,
    price_amount: 896,
    currency: 'USD',
    availability: true,
    state: 'ACTIVE',
    provenance: {
      source_url: 'https://naturalgemstones.com/green-tourmaline-example',
      ref_evidence: 'OBSERVED',
      price_evidence: 'OBSERVED',
      import_batch: 'phase2-load',
    },
    stones: [],
  };
}

export function settingDesignFixture(designCode = 'JS1409'): SettingDesignReadModel {
  return {
    design_code: designCode,
    name: 'Pave Setting',
    jewellery_type: 'RING',
    style: { code: 'pave', label: 'Pave' },
    is_vedic: false,
    side_stone_count: 16,
    variant_count: 1,
    state: 'ACTIVE',
    provenance: {
      source_url: 'https://naturalgemstones.com/setting-example',
      evidence_status: 'EXTRACTED',
      import_batch: 'phase2-load',
    },
    description: null,
    variants: [
      {
        sku: 'JS1409W14',
        slug: 'js1409w14-variant',
        metal: 'W14',
        base_price: 1200,
        currency: 'USD',
        availability: true,
        state: 'ACTIVE',
        provenance: {
          source_url: 'https://naturalgemstones.com/setting-variant-example',
          evidence_status: 'OBSERVED',
          price_evidence: 'OBSERVED',
          import_batch: 'phase2-load',
        },
      },
    ],
  };
}

// ─── Fake port ────────────────────────────────────────────────────────────────

export interface PortCallCounts {
  listProducts: number;
  getProductBySlug: number;
  getGemstoneByGemRef: number;
  listSettings: number;
  getSettingByDesignCode: number;
  getSettingVariantBySku: number;
  getTaxonomy: number;
  search: number;
  suggest: number;
  similarGemstones: number;
}

/**
 * A CatalogQueryPort that counts calls and returns fixtures. `failure` makes
 * every executed method reject — used to prove database errors are NOT
 * swallowed by the cache layer (they must surface, not degrade).
 */
export class FakeCatalogPort implements CatalogQueryPort {
  readonly calls: PortCallCounts = {
    listProducts: 0,
    getProductBySlug: 0,
    getGemstoneByGemRef: 0,
    listSettings: 0,
    getSettingByDesignCode: 0,
    getSettingVariantBySku: 0,
    getTaxonomy: 0,
    search: 0,
    suggest: 0,
    similarGemstones: 0,
  };

  /** When set, executed methods reject with this error. */
  failure: Error | null = null;

  /** Identities that resolve to their documented not-found contract error. */
  readonly notFound = new Set<string>();

  /** Configurable responses (Phase 4 page specs); defaults stay as before. */
  private productLists = new Map<string, ProductListResult>();
  private productDetails = new Map<string, ProductDetailReadModel>();
  private settingListResult: SettingListResult | null = null;
  private taxonomyResult: TaxonomyReadModel | null = null;
  private searchResult: SearchResult | null = null;
  private suggestResult: SearchSuggestResult | null = null;
  private similarGemstonesResult: SimilarGemstonesResult | null = null;

  /** Queue a product list for the matching filter identity (variety slug). */
  setProductListForVariety(varietySlug: string, result: ProductListResult): void {
    this.productLists.set(`variety:${varietySlug}`, result);
  }

  /** Queue a product list for any query (fallback when no variety match). */
  setProductList(result: ProductListResult): void {
    this.productLists.set('*', result);
  }

  setProductDetail(slug: string, detail: ProductDetailReadModel): void {
    this.productDetails.set(slug, detail);
  }

  setSettingList(result: SettingListResult): void {
    this.settingListResult = result;
  }

  setTaxonomy(taxonomy: TaxonomyReadModel): void {
    this.taxonomyResult = taxonomy;
  }

  setSearchResult(result: SearchResult): void {
    this.searchResult = result;
  }

  setSuggestResult(result: SearchSuggestResult): void {
    this.suggestResult = result;
  }

  setSimilarGemstonesResult(result: SimilarGemstonesResult): void {
    this.similarGemstonesResult = result;
  }

  private guard<K extends keyof PortCallCounts>(method: K): void {
    this.calls[method] += 1;
    if (this.failure !== null) throw this.failure;
  }

  async listProducts(query: ProductListQuery): Promise<ProductListResult> {
    this.guard('listProducts');
    const variety = (query as { filters?: { variety?: string[] } }).filters?.variety?.[0];
    if (variety !== undefined && this.productLists.has(`variety:${variety}`)) {
      return this.productLists.get(`variety:${variety}`) as ProductListResult;
    }
    if (this.productLists.has('*')) return this.productLists.get('*') as ProductListResult;
    const parsed = (query as { limit?: number }).limit;
    return emptyProductList(typeof parsed === 'number' ? parsed : 24);
  }

  async getProductBySlug(slug: string): Promise<ProductDetailReadModel> {
    this.guard('getProductBySlug');
    if (this.notFound.has(slug)) {
      throw contractNotFound('PRODUCT_NOT_FOUND', 'slug', slug);
    }
    const configured = this.productDetails.get(slug);
    if (configured !== undefined) return configured;
    return productDetailFixture(slug);
  }

  async getGemstoneByGemRef(gemRef: string): Promise<GemstoneDetailReadModel> {
    this.guard('getGemstoneByGemRef');
    if (this.notFound.has(gemRef)) {
      throw contractNotFound('GEMSTONE_NOT_FOUND', 'gem_ref', gemRef);
    }
    return gemstoneDetailFixture(gemRef);
  }

  async listSettings(_query: SettingListQuery): Promise<SettingListResult> {
    this.guard('listSettings');
    void _query;
    if (this.settingListResult !== null) return this.settingListResult;
    return {
      items: [],
      facets: EMPTY_FACETS,
      rejected_filters: [],
      meta: { limit: 24, has_more: false, next_cursor: null },
    };
  }

  async getSettingByDesignCode(designCode: string): Promise<SettingDesignReadModel> {
    this.guard('getSettingByDesignCode');
    if (this.notFound.has(designCode)) {
      throw contractNotFound('SETTING_NOT_FOUND', 'design_code', designCode);
    }
    return settingDesignFixture(designCode);
  }

  async getSettingVariantBySku(sku: string): Promise<SettingVariantEnvelope> {
    this.guard('getSettingVariantBySku');
    if (this.notFound.has(sku)) {
      throw contractNotFound('SETTING_VARIANT_NOT_FOUND', 'sku', sku);
    }
    const design = settingDesignFixture();
    const variant = design.variants.find((v) => v.sku === sku) ?? design.variants[0];
    if (variant === undefined) {
      throw contractNotFound('SETTING_VARIANT_NOT_FOUND', 'sku', sku);
    }
    return { variant, design };
  }

  async getTaxonomy(): Promise<TaxonomyReadModel> {
    this.guard('getTaxonomy');
    if (this.taxonomyResult !== null) return this.taxonomyResult;
    return emptyTaxonomy();
  }

  async search(_query: SearchQuery): Promise<SearchResult> {
    this.guard('search');
    void _query;
    if (this.searchResult !== null) return this.searchResult;
    return {
      items: [],
      facets: EMPTY_FACETS,
      rejected_filters: [],
      meta: {
        limit: 24,
        has_more: false,
        next_cursor: null,
        search_version: 'search-v1',
        strategy: 'STRUCTURED_ONLY',
        intent: 'PRODUCT_SEARCH',
        degraded: false,
        candidate_count: 0,
      },
    };
  }

  async suggest(query: SearchSuggestQuery): Promise<SearchSuggestResult> {
    this.guard('suggest');
    if (this.suggestResult !== null) return this.suggestResult;
    return {
      prefix: query.prefix,
      suggestions: [],
    };
  }

  async similarGemstones(gemRef: string, _limit?: number): Promise<SimilarGemstonesResult> {
    this.guard('similarGemstones');
    void _limit;
    if (this.similarGemstonesResult !== null) return this.similarGemstonesResult;
    return {
      source_gem_ref: gemRef,
      items: [],
    };
  }

  totalCalls(): number {
    return Object.values(this.calls).reduce((sum, n) => sum + n, 0);
  }
}

// ─── Failure-injectable stores ────────────────────────────────────────────────

export type CacheOperation = 'get' | 'set' | 'addToIndex' | 'members' | 'del';

/**
 * A MemoryCacheStore whose named operations throw on demand — the exact
 * simulation of a Redis GET/SET/DEL/index failure, run in-process and
 * deterministically.
 */
export class FailingCacheStore implements CacheStore {
  readonly calls: Record<CacheOperation, number> = {
    get: 0,
    set: 0,
    addToIndex: 0,
    members: 0,
    del: 0,
  };

  /** Operations that currently throw. */
  readonly failing = new Set<CacheOperation>();

  constructor(private readonly inner: MemoryCacheStore = new MemoryCacheStore()) {}

  fail(operation: CacheOperation): void {
    this.failing.add(operation);
  }

  recover(operation: CacheOperation): void {
    this.failing.delete(operation);
  }

  /** Direct access so tests can plant malformed payloads under real keys. */
  get underlying(): MemoryCacheStore {
    return this.inner;
  }

  private touch(operation: CacheOperation): void {
    this.calls[operation] += 1;
    if (this.failing.has(operation)) throw new Error(`simulated ${operation} failure`);
  }

  async get(key: string): Promise<string | null> {
    this.touch('get');
    return this.inner.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.touch('set');
    await this.inner.set(key, value, ttlSeconds);
  }

  async addToIndex(indexKeys: readonly string[], member: string, ttlSeconds: number): Promise<void> {
    this.touch('addToIndex');
    await this.inner.addToIndex(indexKeys, member, ttlSeconds);
  }

  async members(indexKey: string): Promise<string[]> {
    this.touch('members');
    return this.inner.members(indexKey);
  }

  async del(keys: string[]): Promise<void> {
    this.touch('del');
    await this.inner.del(keys);
  }
}

/** A generation store whose get/bump throw on demand (Task 7 generation failure). */
export class FailingGenerationStore implements GenerationStore {
  readonly failing = new Set<'get' | 'bump'>();
  get calls(): { get: number; bump: number } {
    return { get: this._get, bump: this._bump };
  }

  private _get = 0;
  private _bump = 0;

  constructor(private readonly inner: GenerationStore = new MemoryGenerationStore()) {}

  async get(scope: CacheScope): Promise<Generation> {
    this._get += 1;
    if (this.failing.has('get')) throw new Error('simulated generation lookup failure');
    return this.inner.get(scope);
  }

  async bump(scope: CacheScope): Promise<Generation> {
    this._bump += 1;
    if (this.failing.has('bump')) throw new Error('simulated generation bump failure');
    return this.inner.bump(scope);
  }
}
