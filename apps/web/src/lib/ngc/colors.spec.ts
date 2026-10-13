import { describe, expect, it } from 'vitest';

import { gemAttenuationHex, gemDispersion, gemHexFor, gemIor } from './colors.js';

describe('gemHexFor', () => {
  it('maps named NGC colours to hex so Three.js does not render white', () => {
    expect(gemHexFor('Violetish Blue', 'Tanzanite')).toBe('#5A2FE0');
    expect(gemHexFor('Bluish Green', 'Paraiba Tourmaline')).toBe('#06B6D4');
    expect(gemHexFor('Green', 'Emerald')).toBe('#065F46');
    expect(gemHexFor('#1E3A8A')).toBe('#1E3A8A');
    expect(gemHexFor(null, 'Sapphire')).toBe('#1E3A8A');
  });

  it('uses a darker tanzanite body colour for Beer-law attenuation', () => {
    expect(gemAttenuationHex('Violetish Blue', 'Tanzanite')).toBe('#2A1078');
    expect(gemAttenuationHex('#5A2FE0')).toBe('#2A1078');
  });

  it('uses tanzanite RI ~1.7 rather than diamond 2.42', () => {
    expect(gemIor('Tanzanite')).toBe(1.7);
    expect(gemIor('Diamond')).toBe(2.42);
    expect(gemDispersion('Tanzanite')).toBeGreaterThan(gemDispersion('Emerald'));
    expect(gemDispersion('Tanzanite')).toBeGreaterThan(0.2);
  });
});
