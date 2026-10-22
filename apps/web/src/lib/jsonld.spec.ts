/**
 * apps/web/src/lib/jsonld.spec.ts
 *
 * Task 8 — structured-data tests:
 *  - valid JSON-LD output (parses back) with the required @graph entities;
 *  - Product required properties grounded in the contract DTO (name, url,
 *    sku/mpn identity, evidence-gated offers);
 *  - canonical URLs built from SITE_URL and matching the page's own links;
 *  - BreadcrumbList mirroring the page's breadcrumbs, position ordering;
 *  - Organization carrying ONLY the observed SoT evidence;
 *  - missing/incomplete data handled by omission (nothing invented);
 *  - unsafe payloads (script breakouts, U+2028, quotes) neutralised;
 *  - no duplicate entities or duplicate script blocks.
 */
import { describe, expect, it } from 'vitest';

import {
  ORGANIZATION_EVIDENCE,
  absoluteUrl,
  breadcrumbListNode,
  organizationJsonLdPayload,
  organizationNode,
  productJsonLd,
  productNode,
  serializeJsonLd,
} from './jsonld.js';
import { productDetailFixture } from '../modules/catalog/testing/doubles.js';

const BASE = 'https://maihan.example';

function parse(payload: string): unknown {
  return JSON.parse(payload);
}

const fixture = productDetailFixture();

const CRUMBS = [
  { label: 'Home', href: '/' },
  { label: 'Green Tourmaline', href: '/green-tourmaline' },
  { label: fixture.title },
] as const;

describe('serializeJsonLd — safe embedding', () => {  it('produces parseable JSON for hostile payloads', () => {
    const hostile = {
      name: `</script><script>alert(1)</script>`,
      nested: { deep: ['a&b', { s: 'quote " and \\ backslash' }] },
    };
    const out = serializeJsonLd(hostile);
    // The escaped payload cannot contain the raw breakout sequence.
    expect(out.includes('</script>')).toBe(false);
    expect(out.includes('\\u003c/script\\u003e')).toBe(true);
    // It round-trips to the original data (the parser un-escapes).
    expect(parse(out)).toEqual(hostile);
  });

  it('escapes &, U+2028 and U+2029', () => {
    const raw = 'a&b\u2028c\u2029d';
    const out = serializeJsonLd({ s: raw });
    expect(out.includes('\\u0026')).toBe(true);
    expect(out.includes('\\u2028')).toBe(true);
    expect(out.includes('\\u2029')).toBe(true);
    expect(parse(out)).toEqual({ s: raw });
  });

  it('keeps numbers, booleans and null intact', () => {
    const out = parse(serializeJsonLd({ n: 1.28, b: false, x: null }));
    expect(out).toEqual({ n: 1.28, b: false, x: null });
  });
});

describe('absoluteUrl', () => {
  it('joins and normalises like the sitemap policy', () => {
    expect(absoluteUrl('https://x.example/', '/a')).toBe('https://x.example/a');
    expect(absoluteUrl('https://x.example', '/')).toBe('https://x.example/');
  });
});

describe('organizationNode — storefront identity from config', () => {
  it('carries the Maihan placeholders, not NGC contact details', () => {
    const org = organizationNode(BASE);
    expect(org['@type']).toBe('Organization');
    expect(org['name']).toBe(ORGANIZATION_EVIDENCE.name);
    expect(org['url']).toBe(`${BASE}/`);
    const contact = org['contactPoint'] as Array<Record<string, unknown>>;
    expect(contact).toHaveLength(1);
    expect(contact[0]!['telephone']).toBe(
      ORGANIZATION_EVIDENCE.telephone === '' ? undefined : ORGANIZATION_EVIDENCE.telephone,
    );
    // No invented fields: no logo, no sameAs, no openingHours, no geo.
    const keys = Object.keys(org);
    expect(keys.sort()).toEqual(['@type', 'contactPoint', 'name', 'url']);
  });

  it('is omitted (null payload) when SITE_URL is unset — no fabricated domain on static prerenders', () => {
    expect(organizationJsonLdPayload({})).toBeNull();
    expect(organizationJsonLdPayload({ SITE_URL: '' })).toBeNull();
    expect(organizationJsonLdPayload({ SITE_URL: '   ' })).toBeNull();
    const payload = organizationJsonLdPayload({ SITE_URL: 'https://maihan.example' });
    expect(payload).not.toBeNull();
    expect(parse(payload as string)).toMatchObject({ '@context': 'https://schema.org', '@type': 'Organization' });
  });

  it('does not claim rating or review data, and carries the address only inside the observed contactPoint', () => {
    const serialized = serializeJsonLd(organizationNode(BASE));
    expect(serialized.includes('aggregateRating')).toBe(false);
    expect(serialized.includes('"review"')).toBe(false);
    expect(serialized.includes('"logo"')).toBe(false);
    expect(serialized.includes('"sameAs"')).toBe(false);
    // The observed address appears once, inside the ContactPoint.
    expect(serialized.match(/streetAddress/g) ?? []).toHaveLength(1);
  });
});

describe('breadcrumbListNode', () => {
  it('mirrors the page breadcrumbs with 1-based positions', () => {
    const node = breadcrumbListNode(BASE, CRUMBS);
    expect(node['@type']).toBe('BreadcrumbList');
    const items = node['itemListElement'] as Array<Record<string, unknown>>;
    expect(items.map((i) => i['position'])).toEqual([1, 2, 3]);
    expect(items[0]!['item']).toBe(`${BASE}/`);
    expect(items[1]!['item']).toBe(`${BASE}/green-tourmaline`);
    // The current page has a name but no href -> no item URL invented.
    expect(items[2]!['name']).toBe(fixture.title);
    expect(items[2]!['item']).toBeUndefined();
  });

  it('refuses an empty label instead of emitting an invalid ListItem', () => {
    expect(() => breadcrumbListNode(BASE, [{ label: '  ' }])).toThrow(/empty name/);
  });
});

describe('productNode — grounded in the contract DTO', () => {
  it('emits required identity from the DTO', () => {
    const node = productNode(BASE, fixture);
    expect(node['@type']).toBe('Product');
    expect(node['name']).toBe(fixture.title);
    expect(node['url']).toBe(`${BASE}/products/${fixture.slug}`);
    expect(node['sku']).toBe('JS1409W14'); // observed source SKU
    expect(node['mpn']).toBe(fixture.setting_variant?.sku);
    expect(node['category']).toBe('Green Tourmaline');
  });

  it('gates offers on OBSERVED price evidence (no fabricated commerce)', () => {
    const withPrice = productNode(BASE, fixture);
    const offers = withPrice['offers'] as Record<string, unknown>;
    expect(offers).toMatchObject({
      '@type': 'Offer',
      price: fixture.price_amount,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${BASE}/products/${fixture.slug}`,
    });

    const unpriced = productNode(BASE, {
      ...fixture,
      provenance: { ...fixture.provenance, price_evidence: 'UNKNOWN' as const },
    });
    expect(unpriced['offers']).toBeUndefined();
  });

  it('marks out-of-stock products honestly', () => {
    const node = productNode(BASE, { ...fixture, availability: false });
    const offers = node['offers'] as Record<string, unknown>;
    expect(offers['availability']).toBe('https://schema.org/OutOfStock');
  });

  it('omits fields the evidence does not support (no invention)', () => {
    const serialized = serializeJsonLd(productNode(BASE, fixture));
    for (const forbidden of ['image', 'aggregateRating', 'review', 'brand', 'gtin', 'priceValidUntil', 'itemCondition']) {
      expect(serialized).not.toContain(`"${forbidden}"`);
    }
  });

  it('omits sku when the DTO has neither observed nor derived SKU', () => {
    const noSku = productNode(BASE, {
      ...fixture,
      provenance: { ...fixture.provenance, source_sku: null, source_sku_derived: null },
    });
    expect(noSku['sku']).toBeUndefined();
    // mpn stays: it comes from the setting variant, not the SKU evidence.
    expect(noSku['mpn']).toBeDefined();
  });

  it('prefers the observed source SKU over the derived one', () => {
    const node = productNode(BASE, {
      ...fixture,
      provenance: { ...fixture.provenance, source_sku: 'JS1409W14', source_sku_derived: 'DERIVED-1' },
    });
    expect(node['sku']).toBe('JS1409W14');
  });
});

describe('productJsonLd — the page payload', () => {
  it('is parseable JSON with exactly Product + BreadcrumbList + Organization', () => {
    const doc = parse(productJsonLd(BASE, fixture, CRUMBS)) as { '@context': string; '@graph': Array<Record<string, unknown>> };
    expect(doc['@context']).toBe('https://schema.org');
    expect(doc['@graph']).toHaveLength(3);
    const types = doc['@graph'].map((n) => n['@type']);
    expect(types).toEqual(['Product', 'BreadcrumbList', 'Organization']);
  });

  it('is deterministic for identical input', () => {
    expect(productJsonLd(BASE, fixture, CRUMBS)).toBe(productJsonLd(BASE, fixture, CRUMBS));
  });

  it('references the Organization once with a stable @id (no duplication)', () => {
    const payload = productJsonLd(BASE, fixture, CRUMBS);
    expect(payload.match(/"Organization"/g) ?? []).toHaveLength(1);
    const doc = parse(payload) as { '@graph': Array<Record<string, unknown>> };
    expect(doc['@graph'][2]!['@id']).toBe(`${BASE}/#organization`);
  });

  it('matches the canonical URL the visible page links to', () => {
    // The page breadcrumb href is `/${variety.slug}`; the JSON-LD item URL must
    // be the same path under the same base.
    const doc = parse(productJsonLd(BASE, fixture, CRUMBS)) as { '@graph': Array<Record<string, unknown>> };
    const bclist = doc['@graph'][1] as Record<string, unknown>;
    const items = bclist['itemListElement'] as Array<Record<string, unknown>>;
    expect(items[1]!['item']).toBe(`${BASE}/green-tourmaline`);
  });
});
