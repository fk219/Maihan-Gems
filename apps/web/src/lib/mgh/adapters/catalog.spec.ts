/**
 * apps/web/src/lib/mgh/adapters/catalog.spec.ts
 *
 * The storefront's ONE data seam. These tests pin the two halves of its
 * contract:
 *
 *  1. MAPPING — when main's CatalogueQueryService answers, develop's applet
 *     types are filled from the real DTO fields only (slug, title, price,
 *     variety, colour, total weight) and nothing is invented.
 *  2. DEMO FALLBACK — when the catalogue cannot answer (no DATABASE_URL / an
 *     empty table / an unknown row), develop's fixture rows are returned and
 *     `DEMO_CONTENT` says so, so the UI can label them.
 *
 * The service is injected through `setCatalogServiceForTest`, the same test
 * seam the API suites use. No database is contacted.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEMO_CONTENT,
  GEMSTONES,
  MATCHED_PAIRS,
  SETTINGS,
} from '@/lib/mgh/fixtures';
import {
  getAllGemstones,
  getAllMatchedPairs,
  getAllSettings,
  getCatalogColourCollection,
  getCatalogGemstoneBySlugOrId,
  getCatalogRelatedGemstones,
  getCatalogVarietyCollection,
  getFreshColourLinks,
  getFreshSettingBySkuOrSlug,
  getFreshVarietyLinks,

  getFixtureEarringSettings,
  getHomeCatalogGemstones,
  getHomeCatalogMatchedPairs,

  getPdpCatalogGemstone,
  getVarietyBySlug,
  searchCatalogGemstones,
  STANDARD_RING_SIZES,
  slugify,
} from './catalog.js';
import { setCatalogServiceForTest } from '../../catalog-server.js';
import {
  FakeCatalogPort,
  emptyProductList,
  productDetailFixture,
  settingDesignFixture,
} from '../../../modules/catalog/testing/doubles.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../../../modules/catalog/index.js';
import type { ProductListResult, ProductSummary, TaxonomyReadModel } from '@maihan/contracts';

function wire(port: FakeCatalogPort): void {
  setCatalogServiceForTest(
    createCatalogQueryService({
      port,
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'catalog-adapter-spec',
    }),
  );
}

afterEach(() => {
  setCatalogServiceForTest(undefined);
});

function summary(slug: string): ProductSummary {
  const d = productDetailFixture(slug);
  return {
    slug: d.slug,
    title: d.title,
    subtitle: d.subtitle,
    kind: d.kind,
    jewellery_type: d.jewellery_type,
    variety: d.variety,
    color: d.color,
    total_weight_ct: d.total_weight_ct,
    stone_count: d.stone_count,
    price_amount: d.price_amount,
    currency: d.currency,
    state: 'ACTIVE',
    availability: d.availability,
    provenance: d.provenance,
  };
}

function taxonomy(): TaxonomyReadModel {
  return {
    species: [],
    varieties: [
      {
        slug: 'tsavorite-garnet',
        name: 'Tsavorite',
        display_name: 'Tsavorite Garnet',
        species_code: 'GARNET',
        source_route: '/tsavorite-garnet',
        is_organic: false,
        state: 'ACTIVE',
        evidence_status: 'OBSERVED',
      },
    ],
    colours: [
      {
        slug: 'green',
        name: 'Green',
        parent_slug: null,
        modifier: null,
        hue: '#0f0',
        is_chromatic: true,
        sort_order: 1,
        state: 'ACTIVE',
        evidence_status: 'OBSERVED',
      },
    ],
    intensities: [],
    clarities: [],
    origins: [],
    treatments: [],
    metals: [],
    setting_styles: [],
    jewellery_types: [],
  } as TaxonomyReadModel;
}

function portWithStones(): FakeCatalogPort {
  const port = new FakeCatalogPort();
  port.setProductList({ ...emptyProductList(24), items: [summary('tsavorite-1ct-round')] } as ProductListResult);
  port.setTaxonomy(taxonomy());
  return port;
}

describe('DEMO_CONTENT — the fixture switch', () => {
  it('is a single exported constant that is currently true', () => {
    expect(DEMO_CONTENT).toBe(true);
  });

  it('the fixture ledger is non-empty (otherwise the badge would be a lie)', () => {
    expect(GEMSTONES.length).toBeGreaterThan(0);
    expect(MATCHED_PAIRS.length).toBeGreaterThan(0);
    expect(SETTINGS.length).toBeGreaterThan(0);
  });
});

describe('mapping main DTOs onto the applet types', () => {
  it('maps a ProductSummary to a GemstoneItem with real fields only', async () => {
    wire(portWithStones());
    const [stone] = await getAllGemstones();
    const d = productDetailFixture('tsavorite-1ct-round');

    expect(stone?.slug).toBe(d.slug);
    expect(stone?.name).toBe(d.title);
    expect(stone?.price).toBe(d.price_amount);
    expect(stone?.varietySlug).toBe(d.variety?.slug);
    expect(stone?.currency).toBe('USD');
    expect(stone?.availability).toBe(d.availability ? 'IN_VAULT' : 'RESERVED');
    // No media in the contract DTOs → honest empty, never a stock photograph.
    expect(stone?.images).toEqual([]);
    expect(stone?.webarAssetId).toBeNull();
  });

  it('keeps every evidence plate field null (no lab values in the DTO)', async () => {
    wire(portWithStones());
    const [stone] = await getAllGemstones();
    expect(Object.values(stone?.evidence ?? {}).every((v) => v === null)).toBe(true);
  });

  it('maps settings and exposes the real variant SKUs as metals', async () => {
    const port = new FakeCatalogPort();
    port.setSettingList({
      ...emptyProductList(24),
      items: [settingDesignFixture('JS1409')],
    } as never);
    wire(port);

    const [setting] = await getAllSettings();
    expect(setting?.sku).toBe('JS1409');
    expect(setting?.metals.map((m) => m.variantSku)).toContain('JS1409W14');
    expect(setting?.sizes).toEqual(STANDARD_RING_SIZES);
    expect(setting?.images).toEqual([]);
  });

  it('resolves a setting by design code and by variant SKU', async () => {
    const port = new FakeCatalogPort();
    port.setSettingList({
      ...emptyProductList(24),
      items: [settingDesignFixture('JS1409')],
    } as never);
    wire(port);

    expect((await getFreshSettingBySkuOrSlug('JS1409'))?.sku).toBe('JS1409');
    expect((await getFreshSettingBySkuOrSlug('JS1409W14'))?.sku).toBe('JS1409');
  });

  it('builds variety and colour collections from the taxonomy + product pool', async () => {
    wire(portWithStones());

    const variety = await getCatalogVarietyCollection('tsavorite-garnet');
    expect(variety?.meta.slug).toBe('tsavorite-garnet');
    expect(variety?.stones.length).toBe(1);

    const colour = await getCatalogColourCollection('green');
    expect(colour?.stones.length).toBe(1);

    const viaAlias = await getVarietyBySlug('tsavorite-garnet');
    expect(viaAlias?.meta.slug).toBe('tsavorite-garnet');
  });

  it('maps taxonomy variety/colour links with the observed pool counts', async () => {
    wire(portWithStones());

    const varieties = await getFreshVarietyLinks();
    expect(varieties[0]?.slug).toBe('tsavorite-garnet');
    expect(typeof varieties[0]?.stones).toBe('number');

    const colours = await getFreshColourLinks();
    expect(colours[0]?.slug).toBe('green');
    expect(typeof colours[0]?.stones).toBe('number');
  });

  it('returns the PDP resolution from the product detail and the gemstone detail', async () => {
    const port = portWithStones();
    const detail = productDetailFixture('tsavorite-1ct-round');
    port.setProductDetail('tsavorite-1ct-round', detail);
    wire(port);

    const pdp = await getPdpCatalogGemstone('tsavorite-1ct-round');
    expect(pdp?.displayTitle).toBe(detail.title);
    expect(pdp?.productDetail?.slug).toBe(detail.slug);
    expect(pdp?.stone.slug).toBe(detail.slug);

    const stone = await getCatalogGemstoneBySlugOrId('tsavorite-1ct-round');
    expect(stone?.slug).toBe(detail.slug);
  });

  it('serves related stones without repeating the current one', async () => {
    wire(portWithStones());
    const related = await getCatalogRelatedGemstones('someone-else', 'tsavorite-garnet', 4);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((s) => s.id !== 'someone-else')).toBe(true);
  });
});

describe('demo fallback — main cannot evidence the row', () => {
  it('returns the fixture home selection when no service can answer', async () => {
    // No test service and no DATABASE_URL in the test process: the adapter
    // must catch the configuration failure and serve demo content.
    expect(await getHomeCatalogGemstones()).toEqual(GEMSTONES.slice(0, 21));
    expect(await getHomeCatalogMatchedPairs()).toEqual(MATCHED_PAIRS.slice(0, 3));
    expect(await getAllGemstones()).toEqual(GEMSTONES);
    expect(await getAllMatchedPairs()).toEqual(MATCHED_PAIRS.slice(0, 100));
    expect(await getAllSettings()).toEqual(SETTINGS);
  });

  it('falls back for an empty catalogue (zero rows is not "no products")', async () => {
    const port = new FakeCatalogPort();
    port.setProductList(emptyProductList(24));
    port.setTaxonomy({ ...taxonomy(), varieties: [], colours: [] } as TaxonomyReadModel);
    wire(port);

    expect((await getHomeCatalogGemstones()).length).toBe(GEMSTONES.length);
    expect((await getAllSettings()).length).toBe(SETTINGS.length);
    expect((await getFreshVarietyLinks()).length).toBeGreaterThan(0);
    expect((await getFreshColourLinks()).length).toBeGreaterThan(0);
  });

  it('resolves fixture slugs and ids on the PDP, and an unknown key is null', async () => {
    const fixture = GEMSTONES[0]!;
    const pdp = await getPdpCatalogGemstone(fixture.slug);
    expect(pdp?.stone.id).toBe(fixture.id);
    expect(pdp?.productDetail).not.toBeNull();

    expect(await getCatalogGemstoneBySlugOrId('definitely-not-a-stone')).toBeNull();
    expect(await getPdpCatalogGemstone('definitely-not-a-stone')).toBeNull();
  });

  it('searches the fixture ledger when the service yields nothing', async () => {
    const port = new FakeCatalogPort();
    port.setProductList(emptyProductList(24));
    wire(port);

    const results = await searchCatalogGemstones('tanzanite');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.variety.toLowerCase().includes('tanzanite') || s.name.toLowerCase().includes('tanzanite') || s.varietySlug.includes('tanzanite'))).toBe(true);
  });

  it('an empty query returns nothing (never the whole catalogue)', async () => {
    expect(await searchCatalogGemstones('   ')).toEqual([]);
  });

  it('fixture-only variety and colour slugs still resolve', async () => {
    const fixtureStone = GEMSTONES[0]!;
    const variety = await getCatalogVarietyCollection(fixtureStone.varietySlug);
    expect(variety).not.toBeNull();

    const colour = await getCatalogColourCollection(fixtureStone.colourSlug);
    expect(colour).not.toBeNull();
  });

  it('an entirely unknown collection slug is null, not an empty page', async () => {
    expect(await getCatalogVarietyCollection('not-a-real-variety')).toBeNull();
    expect(await getCatalogColourCollection('not-a-real-colour')).toBeNull();
  });

  it('fixture settings resolve by sku, slug and variant sku', async () => {
    const setting = SETTINGS[0]!;
    expect((await getFreshSettingBySkuOrSlug(setting.sku))?.sku).toBe(setting.sku);
    expect((await getFreshSettingBySkuOrSlug(setting.slug))?.sku).toBe(setting.sku);
    const variant = setting.metals.find((m) => m.variantSku)?.variantSku;
    if (variant !== undefined) {
      expect((await getFreshSettingBySkuOrSlug(variant))?.sku).toBe(setting.sku);
    }
    expect(await getFreshSettingBySkuOrSlug('no-such-setting')).toBeNull();
  });

  it('slugify is the single slug rule used by the mapping', () => {
    expect(slugify('Tsavorite Garnet')).toBe('tsavorite-garnet');
    expect(slugify('  --Green  Tourmaline-- ')).toBe('green-tourmaline');
  });

  it('related stones fall back to the fixture ledger when the pool is empty', async () => {
    const port = new FakeCatalogPort();
    port.setProductList(emptyProductList(24));
    wire(port);
    const related = await getCatalogRelatedGemstones('none', 'tanzanite', 4);
    expect(related.length).toBe(4);
    expect(related.every((s) => s.id !== 'none')).toBe(true);
  });

  it('the earring settings view is a subset of the full settings catalogue', async () => {
    const all = await getAllSettings();
    const earrings = await getFixtureEarringSettings();
    expect(earrings.length).toBeLessThanOrEqual(all.length);
    expect(earrings.every((s) => s.category === 'earrings')).toBe(true);
  });
});
