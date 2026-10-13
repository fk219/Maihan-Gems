import { describe, expect, it } from 'vitest';

import { productImage } from './storefront-images.js';

describe('productImage', () => {
  it('maps loose sapphires to a blue stone, not jewellery', () => {
    expect(productImage({ kind: 'gemstone', stoneType: 'sapphire', title: 'Kashmir Sapphire', colorHue: 'blue' }))
      .toBe('/media/stone-sapphire.jpg');
  });

  it('maps a Burmese ruby to a red stone', () => {
    expect(productImage({ kind: 'gemstone', stoneType: 'ruby', title: 'Burmese Ruby' }))
      .toBe('/media/stone-ruby.jpg');
  });

  it('maps padparadscha and pink sapphires by colour', () => {
    expect(productImage({ kind: 'gemstone', stoneType: 'sapphire', variety: 'Padparadscha' }))
      .toBe('/media/stone-padparadscha.jpg');
    expect(productImage({ kind: 'gemstone', stoneType: 'sapphire', colorHue: 'pink' }))
      .toBe('/media/stone-sapphire-pink.jpg');
  });

  it('maps settings to empty mountings', () => {
    expect(productImage({ kind: 'setting', settingFor: 'ring', title: 'Solitaire Ring Setting' }))
      .toBe('/media/setting-ring.jpg');
    expect(productImage({ kind: 'setting', settingFor: 'pendant', title: 'Classic Pendant Setting' }))
      .toBe('/media/setting-pendant.jpg');
    expect(productImage({ kind: 'setting', settingFor: 'earrings', title: 'Stud Earring Setting' }))
      .toBe('/media/setting-earrings.jpg');
  });

  it('maps jewellery to the matching finished piece', () => {
    expect(productImage({ kind: 'jewelry', jewelryType: 'bracelet', title: 'Diamond Tennis Bracelet' }))
      .toBe('/media/jew-tennis-bracelet.jpg');
    expect(productImage({ kind: 'jewelry', jewelryType: 'necklace', title: 'Emerald and Diamond Necklace' }))
      .toBe('/media/jew-emerald-necklace.jpg');
    expect(productImage({ kind: 'jewelry', jewelryType: 'ring', title: 'Sapphire and Diamond Halo Ring' }))
      .toBe('/media/jew-sapphire-ring.jpg');
  });
});
