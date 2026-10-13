import { describe, expect, it } from 'vitest';

import { convertAmount, formatMoney, parseCurrency } from './currency.js';

describe('formatMoney', () => {
  it('shows USD with an explicit code', () => {
    expect(formatMoney(185000, 'USD')).toBe('USD 185,000');
  });

  it('converts Kashmir-class prices into AED', () => {
    expect(formatMoney(185000, 'AED')).toBe('AED 679,413');
  });

  it('converts into THB', () => {
    expect(formatMoney(185000, 'THB')).toBe('THB 6,382,500');
  });

  it('keeps two decimals under one thousand', () => {
    expect(formatMoney(48.5, 'AED')).toBe('AED 178.12');
  });

  it('falls back to the default rate when the live book is empty', () => {
    expect(convertAmount(100, 'AED', { USD: 1, AED: 0, THB: 0 })).toBe(367.25);
  });
});

describe('parseCurrency', () => {
  it('accepts only the three storefront codes', () => {
    expect(parseCurrency('AED')).toBe('AED');
    expect(parseCurrency('THB')).toBe('THB');
    expect(parseCurrency('EUR')).toBeNull();
  });
});
