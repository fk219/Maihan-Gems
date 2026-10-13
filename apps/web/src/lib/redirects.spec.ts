/**
 * apps/web/src/lib/redirects.spec.ts
 *
 * Unit coverage for the legacy redirect resolver (Phase 4 Task 6).
 * Authority: technical_design/34 sections 2-7, 14.
 */
import { describe, expect, it } from 'vitest';

import {
  classifyLegacyPath,
  createRedirectResolver,
  familyRedirect,
  isNewRoute,
  mapQuery,
  normalizePath,
  sourceSlugOf,
  type RedirectRow,
} from './redirects.js';

const status = (path: string): number | undefined => familyRedirect(path)?.status;
const target = (path: string): string | undefined => familyRedirect(path)?.target;

describe('normalizePath (doc 34 section 7)', () => {
  it('lowercases, collapses separators and strips a trailing slash', () => {
    expect(normalizePath('/Agate//10ct-K1/')).toBe('/agate/10ct-k1');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('agate')).toBe('/agate');
  });
});

describe('mapQuery (doc 34 section 4)', () => {
  it('renames ?design-styles= to ?style= and preserves everything else', () => {
    expect(mapQuery('?design-styles=mens')).toBe('?style=mens');
    expect(mapQuery('design-styles=mens')).toBe('?style=mens');
    expect(mapQuery('?rs=price-asc&utm_source=x')).toBe('?rs=price-asc&utm_source=x');
    expect(mapQuery('')).toBe('');
  });
});

describe('sourceSlugOf (doc 34 section 5 — target slug preserves the source shape)', () => {
  it('strips the trailing reference token', () => {
    expect(sourceSlugOf('/agate/10.49ct-brazilian-oval-blue-agate-k27053')).toBe('10.49ct-brazilian-oval-blue-agate');
    expect(sourceSlugOf('/agate-pairs/x-agate-pair-pr9544')).toBe('x-agate-pair');
    expect(sourceSlugOf('/agate/x-j10763')).toBe('x');
  });
});

describe('isNewRoute', () => {
  it('recognises target-only routes', () => {
    expect(isNewRoute('/products/halo-ring')).toBe(true);
    expect(isNewRoute('/product/natural-sapphire-company-s11050')).toBe(true);
    expect(familyRedirect('/product/natural-sapphire-company-s11050')).toBeNull();
    expect(isNewRoute('/varieties')).toBe(true);
    expect(isNewRoute('/search')).toBe(true);
    expect(isNewRoute('/agate')).toBe(false);
    expect(isNewRoute('/gemstone-ring-settings/x')).toBe(false);
  });
});

describe('family rules (doc 34 section 3)', () => {
  it('loose stone -> /products/{source slug} 301', () => {
    expect(status('/agate/10.49ct-brazilian-oval-blue-agate-k27053')).toBe(301);
    expect(target('/agate/10.49ct-brazilian-oval-blue-agate-k27053')).toBe('/products/10.49ct-brazilian-oval-blue-agate');
  });

  it('matched pair -> /products/{source slug} 301', () => {
    expect(target('/agate-pairs/12.01ct-namibia-oval-agate-pair-pr13241')).toBe('/products/12.01ct-namibia-oval-agate-pair');
  });

  it('setting -> /settings/{sku} 301 for all three mounts', () => {
    expect(target('/gemstone-ring-settings/10k-white-gold-accent-stones-ring-setting-js1016w10')).toBe('/settings/JS1016W10');
    expect(target('/gemstone-necklace-pendant-settings/10k-white-gold-accent-stones-necklace-setting-js1390w10')).toBe('/settings/JS1390W10');
    expect(target('/gemstone-earring-settings/14k-rose-gold-accent-stones-earring-setting-js1132r14')).toBe('/settings/JS1132R14');
  });

  it('DYO review -> /design-your-own/review/{code} 301', () => {
    expect(target('/design-your-own/review/alexandrite-necklace-cushion-0.47ct-10k-white-gold-js1247w10-k13124')).toBe(
      '/design-your-own/review/JS1247W10-K13124',
    );
    expect(target('/design-your-own/review/alexandrite-earrings-oval-1.18ct-14k-white-gold-js1523w14-pr12910')).toBe(
      '/design-your-own/review/JS1523W14-PR12910',
    );
  });

  it('colour index -> /colour/{colour} 301', () => {
    expect(target('/bi-color-gemstones')).toBe('/colour/bi-color');
  });

  it('collection family -> /search 302', () => {
    expect(status('/all-natural-gemstones')).toBe(302);
    expect(target('/all-natural-gemstones')).toBe('/search?collection=all');
  });

  it('fixed functional redirects keep the documented status', () => {
    expect(familyRedirect('/auth')).toEqual({ target: '/account/sign-in', status: 301 });
    expect(familyRedirect('/compare-list')).toEqual({ target: '/compare', status: 301 });
    expect(familyRedirect('/showroom/preview')).toEqual({ target: '/showrooms/preview', status: 301 });
    expect(familyRedirect('/sitemap-products-1.xml')).toEqual({ target: '/sitemap-products/1.xml', status: 301 });
    // Documented deviation from the section 3 table: the route differs, so 301.
    expect(familyRedirect('/gemstone-bracelet-settings')).toEqual({ target: '/settings', status: 301 });
    // Temporary mapping: 302 (doc 34 section 2).
    expect(familyRedirect('/mens-gemstone-ring-settings')).toEqual({ target: '/settings?style=mens', status: 302 });
  });

  it('served-directly routes produce no redirect at all', () => {
    expect(familyRedirect('/')).toBeNull();
    expect(familyRedirect('/agate')).toBeNull();
    expect(familyRedirect('/agate-pairs')).toBeNull();
    expect(familyRedirect('/education/about-us/our-history')).toBeNull();
    expect(familyRedirect('/gemstone-bracelets')).toBeNull();
    expect(familyRedirect('/cart')).toBeNull();
  });

  it('READY_MADE needs the explicit row — never guessed', () => {
    expect(classifyLegacyPath('/alexandrite-rings/alexandrite-halo-ring-cushion-0.00ct-14k-yellow-gold-j10763')).toEqual({
      disposition: 'needs-row',
      decision: null,
    });
  });

  it('an unresolvable commerce family is a 410, not a redirect to a random page', () => {
    expect(familyRedirect('/gemstone-bracelets-bangles/some-bracelet-j12345')).toEqual({
      target: '/gemstone-bracelets-bangles/some-bracelet-j12345',
      status: 410,
    });
    // The single S##### reference recorded in the migration's UNKNOWN family.
    expect(familyRedirect('/garnet/3.16ct-tanzanian-emerald-cut-purplish-pink-garnet-s42254')).toEqual({
      target: '/garnet/3.16ct-tanzanian-emerald-cut-purplish-pink-garnet-s42254',
      status: 410,
    });
  });

  it('an unknown path is never redirected', () => {
    for (const path of ['/nope', '/nope/deeper/thing', '/foo/bar/baz']) {
      expect(familyRedirect(path)).toBeNull();
    }
  });
});

describe('resolver', () => {
  const rows: readonly RedirectRow[] = [
    { from_path: '/alexandrite-rings/alexandrite-halo-ring-cushion-0.00ct-14k-yellow-gold-j10763', to_path: '/products/alexandrite-halo-ring-14k-yellow-gold-j10763', status_code: 301 },
    { from_path: '/agate', to_path: '/agate', status_code: 200 },
    { from_path: '/agate/10.49ct-brazilian-oval-blue-agate-k27053?rs=price-asc', to_path: '/products/10.49ct-brazilian-oval-blue-agate?sort=price', status_code: 301 },
  ];

  it('uses an explicit row when one exists (READY_MADE resolves here)', () => {
    const resolver = createRedirectResolver(rows);
    expect(
      resolver.resolve('/alexandrite-rings/alexandrite-halo-ring-cushion-0.00ct-14k-yellow-gold-j10763'),
    ).toEqual({ target: '/products/alexandrite-halo-ring-14k-yellow-gold-j10763', status: 301 });
  });

  it('treats a 200 explicit row as served', () => {
    const resolver = createRedirectResolver(rows);
    expect(resolver.resolve('/agate')).toBeNull();
  });

  it('matches a query-specific row on its exact query', () => {
    const resolver = createRedirectResolver(rows);
    expect(resolver.resolve('/agate/10.49ct-brazilian-oval-blue-agate-k27053', '?rs=price-asc')).toEqual({
      target: '/products/10.49ct-brazilian-oval-blue-agate?sort=price',
      status: 301,
    });
  });

  it('falls back to the family rule and preserves unmapped query parameters', () => {
    const resolver = createRedirectResolver();
    expect(resolver.resolve('/agate/10ct-oval-agate-k1', '?utm_source=nl&design-styles=mens')).toEqual({
      target: '/products/10ct-oval-agate?utm_source=nl&style=mens',
      status: 301,
    });
  });

  it('never produces a self-redirect loop', () => {
    const resolver = createRedirectResolver();
    // A request that already IS the canonical DYO code must be served.
    expect(resolver.resolve('/design-your-own/review/JS1247W10-K13124')).toBeNull();
  });

  it('recognises legacy URLs and rejects non-legacy ones', () => {
    const resolver = createRedirectResolver(rows);
    expect(resolver.recognises('/auth')).toBe(true);
    expect(resolver.recognises('/nope/deeper')).toBe(false);
    expect(resolver.size).toBe(3);
  });
});
