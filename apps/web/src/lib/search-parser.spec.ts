import { describe, expect, it } from 'vitest';

import { parseCollectionSlug, parseSearchQuery } from './search-parser.js';

describe('parseSearchQuery', () => {
  it('extracts untreated emerald, carat and price', () => {
    const parsed = parseSearchQuery('untreated 3ct emeralds under 50000');
    expect(parsed.stoneType).toBe('emerald');
    expect(parsed.treatment).toBe('no_enhancement');
    expect(parsed.minCarat).toBeCloseTo(2.75);
    expect(parsed.maxPriceUsd).toBe(50000);
  });

  it('detects sapphire pairs', () => {
    const parsed = parseSearchQuery('sapphire pairs');
    expect(parsed.stoneType).toBe('sapphire');
    expect(parsed.quantityType).toBe('pair');
  });

  it('maps Ceylon origin and cushion shape', () => {
    const parsed = parseSearchQuery('cushion ceylon sapphire');
    expect(parsed.stoneType).toBe('sapphire');
    expect(parsed.shape).toBe('cushion');
    expect(parsed.origin).toBe('Sri Lanka');
  });
});

describe('parseCollectionSlug', () => {
  it('parses a stone browse slug', () => {
    expect(parseCollectionSlug('sapphire')).toEqual({
      mode: 'stone',
      slug: 'sapphire',
      stoneSlug: 'sapphire',
      stoneType: 'sapphire',
    });
  });

  it('parses pairs and compound stone names', () => {
    expect(parseCollectionSlug('paraiba-tourmaline-pairs')).toMatchObject({
      mode: 'pairs',
      stoneType: 'paraiba_tourmaline',
    });
  });

  it('parses jewellery form suffixes', () => {
    expect(parseCollectionSlug('sapphire-rings')?.mode).toBe('jewelry');
    expect(parseCollectionSlug('ruby-earrings')).toMatchObject({
      jewelryType: 'earrings',
      formLabel: 'earrings',
    });
    expect(parseCollectionSlug('emerald-settings')?.mode).toBe('settings');
  });

  it('returns null for empty input instead of throwing', () => {
    expect(parseCollectionSlug(undefined)).toBeNull();
    expect(parseCollectionSlug('')).toBeNull();
  });
});
