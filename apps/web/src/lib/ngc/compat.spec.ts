import { describe, expect, it } from 'vitest';

import { fitStoneToSetting } from './compat.js';
import type { NgcProduct } from './types.js';

function stub(partial: Partial<NgcProduct>): NgcProduct {
  return {
    id: 'X',
    kind: 'loose_stone',
    category: 'Gemstones',
    subcategory: 'Tanzanite',
    parentSubcategory: null,
    title: 'Stone',
    slug: 'stone',
    path: '/stone',
    listingPath: '/tanzanite',
    sourceUrl: null,
    priceUsd: 100,
    discountPriceUsd: null,
    bankWirePriceUsd: null,
    pricePerCt: 100,
    availability: 'available',
    availabilityCode: 0,
    descriptionHtml: '',
    seoTitle: null,
    breadcrumbs: [],
    detailsTable: [],
    colorCategories: [],
    styles: [],
    metals: [],
    metalName: null,
    metalCode: null,
    stoneType: 'Tanzanite',
    stoneSubType: null,
    weightCt: 1,
    lengthMm: 6,
    widthMm: 6,
    depthMm: 4,
    shape: 'Round',
    cut: null,
    cuttingStyle: 'Faceted',
    color: 'Blue',
    colorIntensity: null,
    clarity: null,
    enhancement: null,
    origin: null,
    lab: null,
    labColor: null,
    isStar: false,
    starAppearance: null,
    pairStones: [],
    centerStones: [],
    sideStones: [],
    dyoEnabled: true,
    gemologistSuggestions: false,
    interestCount: 0,
    shipDaysMin: null,
    shipDaysMax: null,
    estimatedShipDate: null,
    settingType: null,
    jewelryType: null,
    ringSizes: null,
    chainLength: null,
    chainIncluded: null,
    engravingMax: null,
    vedicSetting: false,
    containsVideo360: false,
    containsSarin: false,
    contains3D: false,
    threeDFilePath: null,
    sarinPath: null,
    media: [],
    spin: null,
    settingRef: null,
    stoneRef: null,
    ...partial,
  };
}

describe('fitStoneToSetting', () => {
  const ring = stub({ id: 'JS1', kind: 'setting', settingType: 'ring', styles: ['Solitaire'] });
  const earring = stub({ id: 'JS2', kind: 'setting', settingType: 'earring', styles: ['Studs'] });

  it('pairs attach only to earrings', () => {
    const pair = stub({ id: 'PR1', kind: 'stone_pair' });
    expect(fitStoneToSetting(pair, ring)).toBe('incompatible');
    expect(fitStoneToSetting(pair, earring)).toBe('fits');
  });

  it('single stones do not attach to earrings', () => {
    const stone = stub({ id: 'K1', kind: 'loose_stone' });
    expect(fitStoneToSetting(stone, earring)).toBe('incompatible');
    expect(fitStoneToSetting(stone, ring)).toBe('fits');
  });

  it('asks a jeweller to review large stones on halo seats', () => {
    const halo = stub({ id: 'JS3', kind: 'setting', settingType: 'ring', styles: ['Halo'] });
    const large = stub({ id: 'K2', weightCt: 12 });
    expect(fitStoneToSetting(large, halo)).toBe('needs_review');
  });
});
