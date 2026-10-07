import { describe, expect, it } from 'vitest';
import { dimensionWarnings, parseDimensionsMm } from './dimensions-mm.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('DimensionsMm', () => {
  it('accepts positive NUMERIC(8,3) dimensions in millimetres', () => {
    expect(parseDimensionsMm('9.84', '7.82', '5.32')).toEqual({
      lengthMm: '9.84',
      widthMm: '7.82',
      depthMm: '5.32',
    });
    expect(parseDimensionsMm('1', '1', '1')).toEqual({ lengthMm: '1', widthMm: '1', depthMm: '1' });
    expect(parseDimensionsMm('99999.999', '99999.999', '99999.999')).toBeDefined();
  });

  it('rejects non-positive or malformed axes, naming the axis', () => {
    expect(() => parseDimensionsMm('0', '7.82', '5.32')).toThrowError(/length_mm must be positive/);
    expectErrorCode(() => parseDimensionsMm('9.84', '-1', '5.32'), 'INVALID_DIMENSIONS_MM');
    expectErrorCode(() => parseDimensionsMm('9.84', '7.82', '0'), 'INVALID_DIMENSIONS_MM');
    expectErrorCode(() => parseDimensionsMm('1.0005', '7.82', '5.32'), 'INVALID_DIMENSIONS_MM');
    expectErrorCode(() => parseDimensionsMm('100000', '7.82', '5.32'), 'INVALID_DIMENSIONS_MM');
    expectErrorCode(() => parseDimensionsMm('', '7.82', '5.32'), 'INVALID_DIMENSIONS_MM');
  });

  it('treats depth exceeding min(length, width) as a WARN, not an error', () => {
    const noisy = parseDimensionsMm('5.00', '4.00', '6.00');
    expect(dimensionWarnings(noisy)).toEqual(['DEPTH_EXCEEDS_MIN_DIMENSION']);
  });

  it('reports no warning for a depth within the two sides', () => {
    expect(dimensionWarnings(parseDimensionsMm('9.84', '7.82', '5.32'))).toEqual([]);
    // exactly at the minimum side is not exceeding
    expect(dimensionWarnings(parseDimensionsMm('5.00', '4.00', '4.00'))).toEqual([]);
  });

  it('is immutable', () => {
    const d = parseDimensionsMm('9.84', '7.82', '5.32');
    // @ts-expect-error readonly fields cannot be assigned
    expect(() => (d.lengthMm = '1')).toThrowError(TypeError);
  });
});
