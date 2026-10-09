/**
 * apps/web/src/lib/sitemap-routes.spec.ts
 *
 * Task 7 route-handler tests. The pure library specs (sitemap.spec.ts) cannot
 * catch a `[shard]` parameter mismatch, so these call the real route handlers
 * through the same interface Next.js uses.
 *
 * Authority: SoT 12.8, doc 34 section 9 (canonical shard URL is
 * `/sitemap-products/{N}.xml`), doc 34 section 14 ("Sitemap purity: only
 * canonical 200 URLs appear").
 *
 * The service is wired over the FakeCatalogPort via the documented test seam,
 * so no database is required; SITE_URL is set explicitly (it is never faked in
 * production code).
 */
import type { ProductListResult, ProductSummary, SettingListResult, TaxonomyReadModel } from '@maihan/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setCatalogServiceForTest } from './catalog-server.js';
import {
  FakeCatalogPort,
  emptyProductList,
  emptyTaxonomy,
  productDetailFixture,
  settingDesignFixture,
} from '../modules/catalog/testing/doubles.js';
import { MemoryCacheStore, MemoryGenerationStore, createCatalogQueryService } from '../modules/catalog/index.js';
import { GET as getIndex } from '../app/sitemap.xml/route.js';
import { GET as getShard } from '../app/sitemap-products/[shard]/route.js';

const BASE = 'https://maihan.example';
const SITE_URL_KEY = 'SITE_URL';
let previousSiteUrl: string | undefined;

beforeEach(() => {
  previousSiteUrl = process.env[SITE_URL_KEY];
  process.env[SITE_URL_KEY] = BASE;
});

afterEach(() => {
  setCatalogServiceForTest(undefined);
  if (previousSiteUrl === undefined) delete process.env[SITE_URL_KEY];
  else process.env[SITE_URL_KEY] = previousSiteUrl;
});

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

function productList(slugs: readonly string[]): ProductListResult {
  return {
    items: slugs.map((s) => summaryOf(s)),
    facets: emptyProductList().facets,
    rejected_filters: [],
    meta: { limit: 100, has_more: false, next_cursor: null },
  };
}

function settingList(skus: readonly string[]): SettingListResult {
  const design = settingDesignFixture();
  return {
    items: [{ ...design, variants: skus.map((sku) => ({ ...design.variants[0]!, sku })) }],
    facets: emptyProductList().facets,
    rejected_filters: [],
    meta: { limit: 100, has_more: false, next_cursor: null },
  };
}

function taxonomy(): TaxonomyReadModel {
  return {
    ...emptyTaxonomy(),
    varieties: [
      {
        slug: 'agate',
        name: 'Agate',
        display_name: 'Agate',
        species_code: 'AGATE',
        source_route: '/agate',
        is_organic: false,
        state: 'ACTIVE',
        evidence_status: 'OBSERVED',
      },
    ],
    colours: [{ slug: 'blue', name: 'Blue', state: 'ACTIVE', evidence_status: 'OBSERVED' }],
  } as TaxonomyReadModel;
}

function wire(): void {
  const port = new FakeCatalogPort();
  port.setTaxonomy(taxonomy());
  port.setProductList(productList(['agate-3ct-cushion']));
  port.setSettingList(settingList(['JS1000W14']));
  setCatalogServiceForTest(
    createCatalogQueryService({ port, store: new MemoryCacheStore(), generations: new MemoryGenerationStore(), namespace: 't7' }),
  );
}

function shardContext(shard: string): { params: Promise<{ shard: string }> } {
  return { params: Promise.resolve({ shard }) };
}

describe('GET /sitemap.xml (sitemap index)', () => {
  it('lists the canonical product shard for the current catalogue', async () => {
    wire();
    const response = await getIndex();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    const xml = await response.text();
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${BASE}/sitemap-products/1.xml</loc>`);
  });
});

describe('GET /sitemap-products/[shard] (shard)', () => {
  it('serves the canonical {N}.xml shard URL the index emits', async () => {
    wire();
    const response = await getShard(new Request('http://localhost/sitemap-products/1.xml'), shardContext('1.xml'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    const xml = await response.text();
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${BASE}/products/agate-3ct-cushion</loc>`);
    expect(xml).toContain(`<loc>${BASE}/settings/JS1000W14</loc>`);
    expect(xml).toContain(`<loc>${BASE}/agate</loc>`);
    // Purity: no non-canonical/private surfaces leak into the set.
    expect(xml).not.toContain('/search');
    expect(xml).not.toContain('/ar');
  });

  it('404s an out-of-range shard instead of emitting an empty document', async () => {
    wire();
    const response = await getShard(new Request('http://localhost/sitemap-products/2.xml'), shardContext('2.xml'));
    expect(response.status).toBe(404);
  });

  it('404s a non-canonical or malformed shard segment', async () => {
    wire();
    for (const shard of ['1', '0.xml', 'abc.xml', '1.xml.bak', '..', '1.XML']) {
      const response = await getShard(new Request(`http://localhost/sitemap-products/${shard}`), shardContext(shard));
      expect(response.status, shard).toBe(404);
    }
  });
});
