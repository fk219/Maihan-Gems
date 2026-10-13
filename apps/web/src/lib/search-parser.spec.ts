import { describe, expect, it } from 'vitest';

import { parseSearchQuery } from './search-parser.js';

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
