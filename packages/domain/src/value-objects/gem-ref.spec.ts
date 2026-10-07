import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors.js';
import { isPairGemRef, isGemRef, parseGemRef } from './gem-ref.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('GemRef', () => {
  it('accepts the authoritative single-stone form', () => {
    const ref = parseGemRef('K1324');
    expect(ref).toBe('K1324');
    expect(isPairGemRef(ref)).toBe(false);
  });

  it('accepts the authoritative pair form and derives isPair', () => {
    const ref = parseGemRef('PR5681');
    expect(ref).toBe('PR5681');
    expect(isPairGemRef(ref)).toBe(true);
  });

  it('accepts digit-only lengths of one and long references', () => {
    expect(parseGemRef('K7')).toBe('K7');
    expect(parseGemRef('PR56810')).toBe('PR56810');
  });

  it('rejects malformed references deterministically', () => {
    for (const bad of ['', 'K', 'PR', 'X1324', 'K132a', 'k1324', 'pr5681', 'K 1324', 'K1324 ', 'K1324.5', 'PK1324']) {
      expect(() => parseGemRef(bad)).toThrowError(DomainError);
      expectErrorCode(() => parseGemRef(bad), 'INVALID_GEM_REF');
    }
  });

  it('does not normalise: lowercase input is rejected, not repaired', () => {
    expect(() => parseGemRef('k1324')).toThrowError(DomainError);
  });

  it('type guard agrees with the parser', () => {
    expect(isGemRef('K1324')).toBe(true);
    expect(isGemRef('PR5681')).toBe(true);
    expect(isGemRef('K132a')).toBe(false);
  });

  it('the branded type prevents arbitrary strings at compile time', () => {
    // @ts-expect-error an unbranded string is not a GemRef
    const wrong: import('./gem-ref.js').GemRef = 'K1324';
    expect(wrong).toBeDefined();
  });
});
