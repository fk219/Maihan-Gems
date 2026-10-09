/**
 * apps/web/src/lib/mega-menu.spec.ts
 *
 * Task 9 — mega-menu view model:
 *  - hierarchy built ONLY from the taxonomy (no hard-coded varieties);
 *  - DRAFT/ARCHIVED taxonomy never renders;
 *  - route families match SoT 13.1 (/v, /v-pairs, /v-rings, /colour/c);
 *  - empty groups dropped; empty taxonomy still yields the static entries;
 *  - deterministic ordering;
 *  - every href passes the canonical-route assertion.
 */
import { describe, expect, it } from 'vitest';

import type { TaxonomyReadModel } from '@maihan/contracts';

import { assertCanonicalHrefs, buildMegaMenu, staticMenuGroups } from './mega-menu.js';
import { emptyTaxonomy } from '../modules/catalog/testing/doubles.js';

function taxonomy(): TaxonomyReadModel {
  const base = emptyTaxonomy();
  return {
    ...base,
    varieties: [
      { slug: 'tsavorite-garnet', name: 'Tsavorite', display_name: 'Tsavorite Garnet', species_code: 'GARNET', source_route: '/tsavorite-garnet', is_organic: false, state: 'ACTIVE', evidence_status: 'OBSERVED' },
      { slug: 'draft-stone', name: 'Draft', display_name: 'Draft Stone', species_code: 'X', source_route: '/draft-stone', is_organic: false, state: 'DRAFT', evidence_status: 'INFERRED' },
    ],
    colours: [
      { slug: 'green', name: 'Green', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 1, state: 'ACTIVE', evidence_status: 'OBSERVED' },
      { slug: 'retired', name: 'Retired', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 2, state: 'ARCHIVED', evidence_status: 'OBSERVED' },
    ],
  } as TaxonomyReadModel;
}

describe('buildMegaMenu — taxonomy-driven, no hard-coded catalogue', () => {
  const menu = buildMegaMenu(taxonomy());

  it('produces the documented route families in fixed order', () => {
    expect(menu.map((g) => g.id)).toEqual(['gemstones', 'pairs', 'ready-made', 'colours', 'settings']);
  });

  it('links every ACTIVE variety into /{slug}, /{slug}-pairs and /{slug}-rings', () => {
    const gemstones = menu.find((g) => g.id === 'gemstones')!.links;
    expect(gemstones).toEqual([{ label: 'Tsavorite Garnet', href: '/tsavorite-garnet' }]);
    expect(menu.find((g) => g.id === 'pairs')!.links).toEqual([{ label: 'Tsavorite Garnet', href: '/tsavorite-garnet-pairs' }]);
    expect(menu.find((g) => g.id === 'ready-made')!.links).toEqual([{ label: 'Tsavorite Garnet', href: '/tsavorite-garnet-rings' }]);
  });

  it('links ACTIVE colour families at /colour/{slug}', () => {
    expect(menu.find((g) => g.id === 'colours')!.links).toEqual([{ label: 'Green', href: '/colour/green' }]);
  });

  it('never renders DRAFT or ARCHIVED taxonomy', () => {
    const all = JSON.stringify(menu);
    expect(all.includes('draft-stone')).toBe(false);
    expect(all.includes('retired')).toBe(false);
  });

  it('keeps the static preserved-route entries', () => {
    expect(menu.find((g) => g.id === 'settings')!.links).toEqual([
      { label: 'All settings', href: '/settings' },
      { label: 'Design your own', href: '/design-your-own' },
    ]);
  });

  it('is deterministic for identical taxonomy', () => {
    expect(JSON.stringify(buildMegaMenu(taxonomy()))).toBe(JSON.stringify(menu));
  });
});

describe('buildMegaMenu — empty and degenerate taxonomy', () => {
  it('drops every empty group and keeps only the static entries', () => {
    const menu = buildMegaMenu(emptyTaxonomy());
    expect(menu).toEqual(staticMenuGroups());
    // The navigation still renders — no broken or empty panels.
    expect(menu.length).toBeGreaterThan(0);
  });
});

describe('assertCanonicalHrefs', () => {
  it('accepts the built menu', () => {
    expect(() => assertCanonicalHrefs(buildMegaMenu(taxonomy()))).not.toThrow();
  });

  it('rejects a non-canonical href', () => {
    const bad = [{ id: 'x', label: 'X', links: [{ label: 'X', href: 'https://evil.example' }] }];
    expect(() => assertCanonicalHrefs(bad)).toThrow(/non-canonical href/);
  });

  it('rejects a path that merely embeds an excluded prefix', () => {
    const bad = [{ id: 'x', label: 'X', links: [{ label: 'X', href: '/ar/asset' }] }];
    expect(() => assertCanonicalHrefs(bad)).toThrow(/non-canonical href/);
  });
});
