import { describe, expect, it } from 'vitest';

import {
  compatibleSettings,
  compatibleStones,
  pairingCaption,
  settingAcceptsStone,
  stoneFitStatus,
} from './dyo-compat.js';
import type { SettingForDyo, StorefrontCard } from './storefront-types.js';

function stone(partial: Partial<StorefrontCard>): StorefrontCard {
  return {
    id: 'S1',
    sku: 'S1',
    slug: 'stone',
    title: 'Oval sapphire',
    kind: 'gemstone',
    description: null,
    priceUsd: 1200,
    stoneType: 'Sapphire',
    variety: null,
    caratTotal: 1.2,
    shape: 'Oval',
    colorHue: 'Blue',
    originCountry: 'Sri Lanka',
    treatment: null,
    quantityType: 'single',
    jewelryType: null,
    settingFor: null,
    style: null,
    metalType: null,
    metalColor: null,
    imageUrl: null,
    vendorName: null,
    certificateLab: null,
    ...partial,
  };
}

function setting(partial: Partial<SettingForDyo> = {}): SettingForDyo {
  return {
    ...stone({
      id: 'K1',
      sku: 'K1',
      title: 'Solitaire ring setting',
      kind: 'setting',
      stoneType: null,
      caratTotal: null,
      shape: 'Oval',
      settingFor: 'ring',
      quantityType: null,
      priceUsd: 800,
    }),
    accepts: [{ shape: 'Oval', minCarat: 0.35, maxCarat: 30 }],
    ...partial,
  };
}

describe('DYO compatibility', () => {
  it('accepts a matching oval for a ring and refuses a pair (INV-03)', () => {
    const ring = setting();
    expect(settingAcceptsStone(ring, stone({}))).toBe(true);
    expect(settingAcceptsStone(ring, stone({ quantityType: 'pair' }))).toBe(false);
  });

  it('accepts a pair only on earrings (INV-02)', () => {
    const earrings = setting({
      settingFor: 'earrings',
      accepts: [{ shape: 'Oval', minCarat: 0.35, maxCarat: 8 }],
    });
    expect(settingAcceptsStone(earrings, stone({ quantityType: 'pair' }))).toBe(true);
    expect(settingAcceptsStone(earrings, stone({ quantityType: 'single' }))).toBe(false);
  });

  it('flags a large stone as needs_review rather than hiding it', () => {
    const ring = setting();
    expect(stoneFitStatus(ring, stone({ caratTotal: 6.2 }))).toBe('needs_review');
    expect(stoneFitStatus(ring, stone({ caratTotal: 1.1 }))).toBe('fits');
    expect(stoneFitStatus(ring, stone({ shape: 'Round' }))).toBe('incompatible');
  });

  it('filters both directions', () => {
    const oval = setting();
    const round = setting({
      id: 'K2',
      accepts: [{ shape: 'Round', minCarat: 0.35, maxCarat: 30 }],
    });
    const gem = stone({});
    expect(compatibleStones(oval, [gem, stone({ id: 'S2', shape: 'Round' })]).map((row) => row.id)).toEqual(['S1']);
    expect(compatibleSettings(gem, [oval, round]).map((row) => row.id)).toEqual(['K1']);
  });

  it('writes an atelier preview caption from the pairing', () => {
    const text = pairingCaption(setting(), stone({}), '18K Yellow Gold');
    expect(text.toLowerCase()).toContain('atelier preview');
    expect(text.toLowerCase()).toContain('sapphire');
    expect(text).toContain('not a photograph');
  });
});
