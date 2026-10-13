import { describe, expect, it } from 'vitest';

import { displayTitle } from './title.js';
import type { NgcProduct } from './types.js';

function stub(partial: Partial<NgcProduct>): Pick<
  NgcProduct,
  | 'id'
  | 'title'
  | 'kind'
  | 'weightCt'
  | 'color'
  | 'stoneType'
  | 'origin'
  | 'centerStones'
  | 'pairStones'
  | 'metalName'
  | 'styles'
  | 'jewelryType'
> {
  return {
    id: 'K10010',
    title: 'K10010',
    kind: 'loose_stone',
    weightCt: 38.08,
    color: 'White',
    stoneType: 'Jeremejevite',
    origin: 'Madagascar',
    centerStones: [],
    pairStones: [],
    metalName: null,
    styles: [],
    jewelryType: null,
    ...partial,
  };
}

describe('displayTitle', () => {
  it('keeps a full NGC title and replaces underscores', () => {
    expect(
      displayTitle(
        stub({
          title: '1.31 Ct. Violetish Blue Tanzanite from Tanzania',
          id: 'K11733',
        }),
      ),
    ).toBe('1.31 Ct. Violetish Blue Tanzanite from Tanzania');
    expect(displayTitle(stub({ id: 'JS31', title: 'Platinum 950 Solitaire Setting_Ring JS31', kind: 'setting' }))).toBe(
      'Platinum 950 Solitaire Setting Ring JS31',
    );
  });

  it('rebuilds SKU-only stone titles from carat, colour, stone and origin', () => {
    expect(displayTitle(stub({ id: 'K10010', title: 'K10010' }))).toBe(
      '38.08 Ct. White Jeremejevite from Madagascar',
    );
  });

  it('rebuilds pair titles from the first pair spec', () => {
    expect(
      displayTitle(
        stub({
          id: 'PR8606',
          title: 'PR8606',
          kind: 'stone_pair',
          weightCt: 7.07,
          color: null,
          stoneType: 'Spessartite Garnet',
          origin: null,
          pairStones: [
            {
              stoneType: 'Spessartite Garnet',
              stoneSubType: null,
              weightCt: 3.43,
              lengthMm: 9.78,
              widthMm: 7.66,
              depthMm: 4.73,
              shape: 'Oval',
              cut: 'Mixed Brilliant Cut',
              cuttingStyle: 'Faceted',
              color: 'Orange',
              colorIntensity: 'Vivid',
              clarity: 'Eye Clean',
              enhancement: 'No Enhancement',
              origin: 'Nigeria',
              lab: '',
              labColor: 'N/A',
              isStar: false,
              starAppearance: null,
              pricePerCt: null,
            },
          ],
        }),
      ),
    ).toBe('7.07 Ct. Orange Spessartite Garnet Pair from Nigeria');
  });

  it('rebuilds setting titles from metal and style', () => {
    expect(
      displayTitle(
        stub({
          id: 'JS31',
          title: 'JS31',
          kind: 'setting',
          metalName: 'Platinum 950',
          styles: ['Solitaire'],
        }),
      ),
    ).toBe('Platinum 950 Solitaire setting JS31');
  });
});
