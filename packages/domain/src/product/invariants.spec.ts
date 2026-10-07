import { describe, expect, it } from 'vitest';
import { InvariantError } from '../errors.js';
import {
  assertComposition,
  satisfiesInv01,
  satisfiesInv02,
  satisfiesInv03,
  type ProductComposition,
} from './invariants.js';

function composition(overrides: Partial<ProductComposition>): ProductComposition {
  return {
    kind: 'CONFIGURED',
    jewelleryType: 'RING',
    settingVariantId: 'variant-1',
    gemstoneId: 'stone-1',
    gemstonePairId: null,
    ...overrides,
  };
}

describe('INV-01 — composition by kind (products_composition_ck semantics)', () => {
  it('PASS: configured + setting + single stone', () => {
    expect(satisfiesInv01(composition({}))).toBe(true);
  });

  it('PASS: configured + setting + pair (earrings)', () => {
    expect(satisfiesInv01(composition({ gemstoneId: null, gemstonePairId: 'pair-1', jewelleryType: 'EARRINGS' }))).toBe(true);
  });

  it('FAIL: configured without a setting variant', () => {
    const p = composition({ settingVariantId: null });
    expect(satisfiesInv01(p)).toBe(false);
    expect(() => assertComposition(p)).toThrowError(InvariantError);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvariantError);
      expect((error as InvariantError).code).toBe('INV-01');
    }
  });

  it('FAIL: configured with neither stone nor pair', () => {
    const p = composition({ gemstoneId: null, gemstonePairId: null });
    expect(satisfiesInv01(p)).toBe(false);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-01');
      expect((error as InvariantError).message).toMatch(/exactly one/);
    }
  });

  it('FAIL: configured with BOTH a stone and a pair', () => {
    const p = composition({ gemstonePairId: 'pair-1' });
    expect(satisfiesInv01(p)).toBe(false);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-01');
    }
  });

  it('PASS: setting_only with a setting and no stones', () => {
    const p = composition({ kind: 'SETTING_ONLY', gemstoneId: null });
    expect(satisfiesInv01(p)).toBe(true);
    expect(() => assertComposition(p)).not.toThrow();
  });

  it('FAIL: setting_only with a stone attached', () => {
    const p = composition({ kind: 'SETTING_ONLY' });
    expect(satisfiesInv01(p)).toBe(false);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-01');
      expect((error as InvariantError).message).toMatch(/SETTING_ONLY/);
    }
  });

  it('FAIL: setting_only without a setting variant', () => {
    const p = composition({ kind: 'SETTING_ONLY', settingVariantId: null, gemstoneId: null });
    expect(satisfiesInv01(p)).toBe(false);
    expect(() => assertComposition(p)).toThrowError(InvariantError);
  });

  it('PASS: ready_made with no setting and no stones', () => {
    const p = composition({ kind: 'READY_MADE', settingVariantId: null, gemstoneId: null });
    expect(satisfiesInv01(p)).toBe(true);
    expect(() => assertComposition(p)).not.toThrow();
  });

  it('FAIL: ready_made carrying a setting variant', () => {
    const p = composition({ kind: 'READY_MADE', gemstoneId: null });
    expect(satisfiesInv01(p)).toBe(false);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-01');
      expect((error as InvariantError).message).toMatch(/only CONFIGURED and SETTING_ONLY/);
    }
  });

  it('PASS/FAIL matrix across the stone-bearing kinds (loose_stone, stone_pair)', () => {
    expect(() => assertComposition(composition({ kind: 'LOOSE_STONE', settingVariantId: null }))).not.toThrow();
    expect(() => assertComposition(composition({ kind: 'STONE_PAIR', settingVariantId: null }))).not.toThrow();
    expect(() => assertComposition(composition({ kind: 'LOOSE_STONE' }))).toThrowError(/INV-01|only CONFIGURED/);
  });
});

describe('INV-02 — a pair may attach only to EARRINGS', () => {
  it('PASS: pair + earrings', () => {
    const p = composition({ gemstoneId: null, gemstonePairId: 'pair-1', jewelleryType: 'EARRINGS' });
    expect(satisfiesInv02(p)).toBe(true);
    expect(() => assertComposition(p)).not.toThrow();
  });

  it('FAIL: pair + every non-earrings jewellery type', () => {
    for (const jewelleryType of ['RING', 'NECKLACE', 'PENDANT', 'BRACELET', 'BROOCH', 'CUFFLINKS', 'CHARM'] as const) {
      const p = composition({ gemstoneId: null, gemstonePairId: 'pair-1', jewelleryType });
      expect(satisfiesInv02(p)).toBe(false);
      try {
        assertComposition(p);
        expect.unreachable();
      } catch (error) {
        expect((error as InvariantError).code).toBe('INV-02');
      }
    }
  });

  it('PASS: a single stone on any jewellery type never triggers INV-02', () => {
    for (const jewelleryType of ['RING', 'PENDANT', 'NECKLACE', 'BRACELET'] as const) {
      expect(() => assertComposition(composition({ jewelleryType }))).not.toThrow();
    }
  });

  it('FAIL: INV-02 bites even when the composition is otherwise incomplete (checked after INV-01)', () => {
    // configured + setting + pair + RING: INV-01 passes, INV-02 must fire.
    const p = composition({ gemstoneId: null, gemstonePairId: 'pair-1', jewelleryType: 'RING' });
    expect(satisfiesInv01(p)).toBe(true);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-02');
    }
  });
});

describe('INV-03 — configured EARRINGS require a pair', () => {
  it('PASS: configured earrings with a pair', () => {
    const p = composition({ gemstoneId: null, gemstonePairId: 'pair-1', jewelleryType: 'EARRINGS' });
    expect(satisfiesInv03(p)).toBe(true);
    expect(() => assertComposition(p)).not.toThrow();
  });

  it('FAIL: configured earrings with a single stone instead of a pair', () => {
    const p = composition({ jewelleryType: 'EARRINGS' });
    expect(satisfiesInv03(p)).toBe(false);
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-03');
      expect((error as InvariantError).message).toMatch(/require a gemstone pair/);
    }
  });

  it('FAIL: configured earrings with no stone at all (INV-01 fires first)', () => {
    const p = composition({ jewelleryType: 'EARRINGS', gemstoneId: null, gemstonePairId: null });
    try {
      assertComposition(p);
      expect.unreachable();
    } catch (error) {
      expect((error as InvariantError).code).toBe('INV-01');
    }
  });

  it('PASS: non-configured earrings are not required to carry a pair (no false positive)', () => {
    const p = composition({ kind: 'READY_MADE', jewelleryType: 'EARRINGS', settingVariantId: null, gemstoneId: null });
    expect(satisfiesInv03(p)).toBe(true);
    expect(() => assertComposition(p)).not.toThrow();
  });

  it('PASS: rings, pendants, necklaces and bracelets never require a pair', () => {
    for (const jewelleryType of ['RING', 'PENDANT', 'NECKLACE', 'BRACELET'] as const) {
      expect(satisfiesInv03(composition({ jewelleryType }))).toBe(true);
    }
  });
});

describe('invariant error identity', () => {
  it('codes are the stable registry identifiers', () => {
    const cases: [ProductComposition, 'INV-01' | 'INV-02' | 'INV-03'][] = [
      [composition({ settingVariantId: null }), 'INV-01'],
      [composition({ gemstoneId: null, gemstonePairId: null }), 'INV-01'],
      [composition({ gemstoneId: null, gemstonePairId: 'pair-1', jewelleryType: 'RING' }), 'INV-02'],
      [composition({ jewelleryType: 'EARRINGS' }), 'INV-03'],
    ];
    for (const [p, code] of cases) {
      try {
        assertComposition(p);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(InvariantError);
        expect((error as InvariantError).code).toBe(code);
        expect((error as InvariantError).name).toBe('InvariantError');
      }
    }
  });
});
