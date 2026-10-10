/**
 * apps/web/src/lib/search-view.spec.ts
 *
 * Unit tests for search URL view-model parsing and facet href building.
 */
import { describe, expect, it } from 'vitest';
import {
  parseSearchParamsToSearchQuery,
  buildSearchHref,
  extractActiveFilterChips,
  searchPaginationBasePath,
} from './search-view.js';

describe('search-view helpers', () => {
  it('parses raw search parameters into a valid SearchQuery', () => {
    const sp = {
      q: 'blue sapphire',
      variety: 'sapphire',
      color: 'blue',
      shape: 'OVAL,ROUND',
      minPrice: '1000',
      maxPrice: '5000',
      sort: 'price',
      direction: 'desc',
    };

    const query = parseSearchParamsToSearchQuery(sp);

    expect(query.query).toBe('blue sapphire');
    expect(query.sort).toBe('price');
    expect(query.direction).toBe('desc');
    expect(query.filters).toEqual({
      variety: ['sapphire'],
      color: ['blue'],
      shape: ['OVAL', 'ROUND'],
      minPrice: 1000,
      maxPrice: 5000,
    });
  });

  it('handles empty and default parameters cleanly', () => {
    const query = parseSearchParamsToSearchQuery({});
    expect(query.query).toBe('');
    expect(query.sort).toBe('relevance');
    expect(query.direction).toBe('asc');
    expect(query.limit).toBe(24);
    expect(query.filters).toEqual({});
  });

  it('buildSearchHref toggles facets on and off correctly', () => {
    const base = { q: 'emerald', color: 'green' };

    // Add a new facet
    const added = buildSearchHref(base, 'variety', 'emerald');
    expect(added).toContain('q=emerald');
    expect(added).toContain('color=green');
    expect(added).toContain('variety=emerald');

    // Remove an existing facet
    const removed = buildSearchHref(base, 'color', 'green');
    expect(removed).toBe('/search?q=emerald');

    // Resets cursor on filter change
    const withCursor = { q: 'emerald', cursor: 'curs_abc123' };
    const reset = buildSearchHref(withCursor, 'variety', 'emerald');
    expect(reset).not.toContain('cursor');
  });

  it('extracts active filter chips with removal links', () => {
    const sp = { q: 'spinel', variety: 'spinel', color: 'red' };
    const chips = extractActiveFilterChips(sp);

    expect(chips.length).toBe(2);
    expect(chips[0]?.label).toBe('Variety: spinel');
    expect(chips[1]?.label).toBe('Colour: red');
  });

  it('generates pagination base path preserving active query and filters', () => {
    const sp = { q: 'tourmaline', color: 'green', cursor: 'curs_page2' };
    const basePath = searchPaginationBasePath(sp);

    expect(basePath).toContain('q=tourmaline');
    expect(basePath).toContain('color=green');
    expect(basePath).not.toContain('cursor');
  });
});
