import { describe, expect, it } from 'vitest';

import { gemAttenuationHex, gemDispersion, gemHexFor, gemIor, gemRefractionParams } from './colors.js';

describe('gemHexFor', () => {
  it('maps named NGC colours to hex so Three.js does not render white', () => {
    expect(gemHexFor('Violetish Blue', 'Tanzanite')).toBe('#6B32E6');
    expect(gemHexFor('Bluish Green', 'Paraiba Tourmaline')).toBe('#06B6D4');
    expect(gemHexFor('Green', 'Emerald')).toBe('#065F46');
    expect(gemHexFor('#1E3A8A')).toBe('#1E3A8A');
    expect(gemHexFor(null, 'Sapphire')).toBe('#1E3A8A');
  });

  it('uses a darker tanzanite body colour for Beer-law attenuation', () => {
    expect(gemAttenuationHex('Violetish Blue', 'Tanzanite')).toBe('#3A1578');
    expect(gemAttenuationHex('#6B32E6')).toBe('#3A1578');
  });

  it('uses tanzanite RI ~1.69 rather than diamond 2.42', () => {
    expect(gemIor('Tanzanite')).toBe(1.69);
    expect(gemIor('Diamond')).toBe(2.42);
    expect(gemDispersion('Tanzanite')).toBeGreaterThan(gemDispersion('Emerald'));
    expect(gemDispersion('Tanzanite')).toBeGreaterThan(0.2);
  });
});

describe('gemRefractionParams', () => {
  it('traces 3–5 internal bounces with tanzanite IOR and chromatic fire', () => {
    const params = gemRefractionParams('Tanzanite');
    expect(params.ior).toBe(1.69);
    expect(params.bounces).toBeGreaterThanOrEqual(3);
    expect(params.bounces).toBeLessThanOrEqual(5);
    expect(params.aberrationStrength).toBeGreaterThan(0.01);
    expect(params.absorption).toBeGreaterThan(0.4);
  });
});
