import { describe, expect, it } from 'vitest';
import { assessTax, findTaxRule, resolveAuthoritativeShippingMethod, SHIPPING_RATE_TABLE } from '../index.js';

describe('tax rules (P2-3)', () => {
  it('applies the approved rate with integer-cents half-up rounding', () => {
    // AE 5% on 9000.00 → 450.00
    const applied = assessTax('AE', 900_000n);
    expect(applied).toEqual({
      evidence: 'APPLIED',
      rate: '0.05',
      label: 'UAE VAT 5%',
      taxTotal: '450.00',
    });
    // rounding: 10.13 * 5% = 0.5065 → 0.51 (half-up on cents)
    expect(assessTax('AE', 1_013n).taxTotal).toBe('0.51');
  });

  it('zero-rate rules and unconfigured destinations stay honest', () => {
    expect(findTaxRule('US')).toBeUndefined();
    expect(assessTax('US', 900_000n)).toEqual({ evidence: 'UNCONFIGURED', taxTotal: '0.00' });
    expect(assessTax(null, 900_000n)).toEqual({ evidence: 'UNCONFIGURED', taxTotal: '0.00' });
  });

  it('case/whitespace-insensitive country matching', () => {
    expect(findTaxRule(' ae ')).toBeDefined();
    expect(findTaxRule('th')?.rate).toBe('0.07');
  });
});

describe('shipping rules (P1-7)', () => {
  it('the table is authoritative; unknown codes are refused', () => {
    const express = resolveAuthoritativeShippingMethod({ code: 'express', amount: '0.00' });
    expect(express.amount).toBe('25.00');
    expect(express.estimated_days).toBe(2);
    expect(SHIPPING_RATE_TABLE.length).toBeGreaterThanOrEqual(3);
    expect(() => resolveAuthoritativeShippingMethod({ code: 'EVIL_FREE_SHIPPING' })).toThrow();
  });
});
