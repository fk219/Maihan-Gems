import { describe, expect, it } from 'vitest';

import { cardMatchesBrand, storefrontBySlug, withPrefix } from './storefronts.js';

describe('sister storefronts', () => {
  it('prefixes canonical paths and leaves the house root as /sapphire', () => {
    expect(withPrefix('/jewellery', '/sapphire')).toBe('/sapphire/jewellery');
    expect(withPrefix('/', '/sapphire')).toBe('/sapphire');
    expect(withPrefix('/natural-gemstones', '')).toBe('/natural-gemstones');
  });

  it('filters catalogue cards to the house stone', () => {
    expect(cardMatchesBrand({ title: 'Royal Blue Sapphire', stoneType: 'Sapphire' }, 'sapphire')).toBe(true);
    expect(cardMatchesBrand({ title: 'Pigeon Blood Ruby', stoneType: 'Ruby' }, 'sapphire')).toBe(false);
    expect(storefrontBySlug('ruby').defaultStone).toBe('ruby');
  });
});
