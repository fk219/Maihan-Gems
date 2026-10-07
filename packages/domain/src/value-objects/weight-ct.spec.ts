import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors.js';
import { isWeightCt, parseWeightCt } from './weight-ct.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('WeightCt', () => {
  it('accepts NUMERIC(8,3) decimal strings, strictly positive', () => {
    expect(parseWeightCt('0.001')).toBe('0.001');
    expect(parseWeightCt('1')).toBe('1');
    expect(parseWeightCt('2.87')).toBe('2.87');
    expect(parseWeightCt('99999.999')).toBe('99999.999');
  });

  it('rejects zero and negatives: a physical stone has positive weight', () => {
    // zero is well-formed but not a weight: the positivity rule fires
    for (const bad of ['0', '0.000']) {
      expect(() => parseWeightCt(bad)).toThrowError(/weight must be positive/);
    }
    // negatives are structurally invalid for NUMERIC(8,3): the shape rule fires
    for (const bad of ['-1', '-0.001']) {
      expectErrorCode(() => parseWeightCt(bad), 'INVALID_WEIGHT_CT');
    }
    expect(isWeightCt('0')).toBe(false);
    expect(isWeightCt('-1')).toBe(false);
  });

  it('rejects shapes beyond NUMERIC(8,3)', () => {
    for (const bad of ['', ' 1', '1.0005', '100000', '1e1', '1.2.3', '2,87', '  ']) {
      expect(() => parseWeightCt(bad)).toThrowError(DomainError);
      expectErrorCode(() => parseWeightCt(bad), 'INVALID_WEIGHT_CT');
      expect(isWeightCt(bad)).toBe(false);
    }
  });

  it('rejects 5+ integral digit overflow (NUMERIC(8,3) bound)', () => {
    expectErrorCode(() => parseWeightCt('100000'), 'INVALID_WEIGHT_CT');
  });

  it('keeps the exact decimal string (no float round-trip)', () => {
    expect(parseWeightCt('2.870')).toBe('2.870');
    expect(typeof parseWeightCt('2.87')).toBe('string');
  });
});
