/**
 * apps/web/src/lib/sitemap.spec.ts
 *
 * Sitemap tests (Phase 4 Task 7). Authority: SoT 12.8, doc 34 section 9,
 * doc 34 section 14 ("Sitemap purity: only canonical 200 URLs appear").
 */
import type { ProductListResult, ProductSummary, SettingListResult, TaxonomyReadModel } from '@maihan/contracts';
import { describe, expect, it } from 'vitest';

import {
  SITEMAP_MAX_URLS,
  absoluteUrl,
  canonicalStaticPaths,
  collectCanonicalPaths,
  dedupePaths,
  escapeXml,
  isIndexablePath,
  renderSitemapIndex,
  renderUrlset,
  shardCount,
  shardLocations,
  shards,
  siteBaseUrl,
  type SitemapDataSource,
} from './sitemap.js';
import {
  FakeCatalogPort,
  emptyProductList,
  emptyTaxonomy,
  productDetailFixture,
  settingDesignFixture,
} from '../modules/catalog/testing/doubles.js';

function summaryOf(slug: string, state: ProductSummary['state'] = 'ACTIVE'): ProductSummary {
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
    state,
    availability: d.availability,
    provenance: d.provenance,
  };
}

function productList(slugs: readonly string[], states: readonly ProductSummary['state'][] = []): ProductListResult {
  const items = slugs.map((s, i) => summaryOf(s, states[i] ?? 'ACTIVE'));
  return { items, facets: emptyProductList().facets, rejected_filters: [], meta: { limit: 100, has_more: false, next_cursor: null } };
}

function settingList(skus: readonly string[]): SettingListResult {
  const design = settingDesignFixture();
  return {
    items: [
      {
        ...design,
        variants: skus.map((sku) => ({ ...design.variants[0]!, sku })),
      },
    ],
    facets: emptyProductList().facets,
    rejected_filters: [],
    meta: { limit: 100, has_more: false, next_cursor: null },
  };
}

function taxonomy(): TaxonomyReadModel {
  const base = emptyTaxonomy();
  return {
    ...base,
    varieties: [
      { slug: 'agate', name: 'Agate', display_name: 'Agate', species_code: 'AGATE', source_route: '/agate', is_organic: false, state: 'ACTIVE', evidence_status: 'OBSERVED' },
      { slug: 'draft-stone', name: 'Draft', display_name: 'Draft', species_code: 'X', source_route: '/draft-stone', is_organic: false, state: 'DRAFT', evidence_status: 'INFERRED' },
    ],
    colours: [
      { slug: 'blue', name: 'Blue', state: 'ACTIVE', evidence_status: 'OBSERVED' },
      { slug: 'retired', name: 'Retired', state: 'ARCHIVED', evidence_status: 'OBSERVED' },
    ],
  } as TaxonomyReadModel;
}

const source: SitemapDataSource = {
  getTaxonomy: async () => ({ value: taxonomy() }),
  listProducts: async () => ({ value: productList(['stone-a', 'stone-b']) }),
  listSettings: async () => ({ value: settingList(['JS1000W14']) }),
};

describe('siteBaseUrl', () => {
  it('requires SITE_URL and never fabricates a domain', () => {
    expect(() => siteBaseUrl({})).toThrow(/SITE_URL/);
    expect(siteBaseUrl({ SITE_URL: 'https://maihan.example/' })).toBe('https://maihan.example');
  });
});

describe('absoluteUrl / escapeXml', () => {
  it('joins paths to the base and keeps the root single-slashed', () => {
    expect(absoluteUrl('https://x.example', '/agate')).toBe('https://x.example/agate');
    expect(absoluteUrl('https://x.example/', '/')).toBe('https://x.example/');
  });

  it('escapes every XML-significant character (no injection into markup)', () => {
    expect(escapeXml(`</loc><script>alert(1)</script>&"'`)).toBe(
      '&lt;/loc&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;&apos;',
    );
  });
});

describe('isIndexablePath', () => {
  it('excludes private, transactional and parameter-variant URLs (doc 34 section 9)', () => {
    for (const p of ['/search', '/search?q=x', '/cart', '/checkout/order-summary', '/account/orders', '/admin/x', '/ar', '/ar/asset', '/ar/handoff/tok', '/compare', '/favorites']) {
      expect(isIndexablePath(p), p).toBe(false);
    }
    for (const p of ['/', '/agate', '/products/x', '/settings/JS1000W14', '/colour/blue', '/varieties/agate']) {
      expect(isIndexablePath(p), p).toBe(true);
    }
  });

  it('does not exclude canonical paths that merely begin with an excluded token', () => {
    // `/ar` is excluded as a whole segment, not as a string prefix.
    for (const p of ['/argonite', '/argyle-garnet', '/search-results-guide', '/cartography']) {
      expect(isIndexablePath(p), p).toBe(true);
    }
  });
});

describe('dedupePaths', () => {
  it('removes duplicates, preserving first-seen order', () => {
    expect(dedupePaths(['/a', '/b', '/a', '/c', '/b'])).toEqual(['/a', '/b', '/c']);
  });
});

describe('sharding', () => {
  it('never exceeds the 50,000 protocol limit', () => {
    expect(SITEMAP_MAX_URLS).toBe(50_000);
    expect(shardCount(0)).toBe(0);
    expect(shardCount(1)).toBe(1);
    expect(shardCount(50_000)).toBe(1);
    expect(shardCount(50_001)).toBe(2);
    const all = shards(Array.from({ length: 100_001 }, (_, i) => i));
    expect(all.map((s) => s.length)).toEqual([50_000, 50_000, 1]);
    for (const s of all) expect(s.length).toBeLessThanOrEqual(SITEMAP_MAX_URLS);
  });

  it('an empty URL set produces no shards — no misleading empty document', () => {
    expect(shards([])).toEqual([]);
    expect(shardLocations('https://x.example', 0)).toEqual([]);
    expect(shardCount(0)).toBe(0);
  });

  it('shard locations match the shard count and are absolute', () => {
    expect(shardLocations('https://x.example', shardCount(50_001))).toEqual([
      'https://x.example/sitemap-products/1.xml',
      'https://x.example/sitemap-products/2.xml',
    ]);
  });
});

describe('renderUrlset', () => {
  it('emits a valid urlset with escaped absolute locs', () => {
    const xml = renderUrlset(['https://x.example/agate', 'https://x.example/a&b']);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://x.example/agate</loc>');
    expect(xml).toContain('<loc>https://x.example/a&amp;b</loc>');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
    // No fabricated metadata.
    expect(xml).not.toContain('<lastmod>');
    expect(xml).not.toContain('<priority>');
  });

  it('refuses to emit more than the protocol limit', () => {
    expect(() => renderUrlset(Array.from({ length: 50_001 }, () => '/x'))).toThrow(/protocol limit/);
  });

  it('escapes a hostile path so it cannot break out of the loc element', () => {
    const xml = renderUrlset(['https://x.example/</loc><script>alert(1)</script>']);
    expect(xml).not.toContain('<script>');
    expect(xml).toContain('&lt;/loc&gt;');
  });
});

describe('renderSitemapIndex', () => {
  it('references exactly the shard locations', () => {
    const xml = renderSitemapIndex(['https://x.example/sitemap-products/1.xml']);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://x.example/sitemap-products/1.xml</loc>');
    expect(xml.match(/<sitemap>/g)).toHaveLength(1);
  });
});

describe('collectCanonicalPaths', () => {
  it('builds canonical paths from ACTIVE taxonomy, products and settings only', async () => {
    const paths = await collectCanonicalPaths(source);
    expect(paths).toContain('/agate');
    expect(paths).toContain('/agate-pairs');
    expect(paths).toContain('/agate-rings');
    expect(paths).toContain('/varieties/agate');
    expect(paths).toContain('/colour/blue');
    expect(paths).toContain('/products/stone-a');
    expect(paths).toContain('/settings/JS1000W14');
    // DRAFT / ARCHIVED records are excluded.
    expect(paths).not.toContain('/draft-stone');
    expect(paths).not.toContain('/colour/retired');
    // Private / non-canonical routes never appear.
    for (const p of paths) expect(isIndexablePath(p), p).toBe(true);
  });

  it('is deduplicated', async () => {
    const paths = await collectCanonicalPaths(source);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('includes the static canonical pages', async () => {
    const paths = await collectCanonicalPaths(source);
    for (const p of canonicalStaticPaths()) expect(paths).toContain(p);
  });

  it('drives from the real Phase 3 port through the service-shaped wrapper', async () => {
    const port = new FakeCatalogPort();
    port.setTaxonomy(taxonomy());
    port.setProductList(productList(['stone-a'], ['DRAFT']));
    // Mirror CatalogQueryService's `Cached<T>` envelope around the port.
    const viaService: SitemapDataSource = {
      getTaxonomy: async () => ({ value: await port.getTaxonomy() }),
      listProducts: async (query) => ({ value: await port.listProducts(query) }),
      listSettings: async (query) => ({ value: await port.listSettings(query) }),
    };
    const paths = await collectCanonicalPaths(viaService);
    expect(paths).not.toContain('/products/stone-a'); // DRAFT is not indexable
    expect(paths).toContain('/agate');
    expect(port.calls.getTaxonomy).toBe(1);
  });
});
