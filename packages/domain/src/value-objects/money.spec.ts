import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors.js';
import { isMoneyAmount, moneyEquals, parseMoney } from './money.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('Money', () => {
  it('accepts decimal-string amounts with the USD currency', () => {
    expect(parseMoney('0')).toEqual({ amount: '0', currency: 'USD' });
    expect(parseMoney('0.00')).toEqual({ amount: '0.00', currency: 'USD' });
    expect(parseMoney('10')).toEqual({ amount: '10', currency: 'USD' });
    expect(parseMoney('10.5')).toEqual({ amount: '10.5', currency: 'USD' });
    expect(parseMoney('10.55')).toEqual({ amount: '10.55', currency: 'USD' });
    expect(parseMoney('9999999999.99')).toEqual({ amount: '9999999999.99', currency: 'USD' });
  });

  it('never touches floating point: the amount stays exactly as given', () => {
    // '10.10' must survive as '10.10', not become 10.1 (a float artefact).
    const m = parseMoney('10.10');
    expect(m.amount).toBe('10.10');
    expect(typeof m.amount).toBe('string');
  });

  it('rejects a numeric amount at compile time and invalid shapes at runtime', () => {
    for (const bad of ['', ' 10', '10 ', '10.555', '-1', '-0.01', '+1', '1e5', '1,000.00', '10.', '.50', '0x1A']) {
      expect(() => parseMoney(bad)).toThrowError(DomainError);
      expectErrorCode(() => parseMoney(bad), 'INVALID_MONEY_AMOUNT');
      expect(isMoneyAmount(bad)).toBe(false);
    }
  });

  it('rejects amounts beyond NUMERIC(12,2) precision (10 integral digits)', () => {
    expectErrorCode(() => parseMoney('10000000000'), 'INVALID_MONEY_AMOUNT');
    expectErrorCode(() => parseMoney('99999999999'), 'INVALID_MONEY_AMOUNT');
    expect(isMoneyAmount('10000000000')).toBe(false);
  });

  it('rejects any currency other than USD', () => {
    // @ts-expect-error the currency literal is USD only
    expectErrorCode(() => parseMoney('10.00', 'EUR'), 'INVALID_MONEY_CURRENCY');
  });

  it('compares exactly on amount and currency', () => {
    expect(moneyEquals(parseMoney('10.10'), parseMoney('10.10'))).toBe(true);
    expect(moneyEquals(parseMoney('10.10'), parseMoney('10.1'))).toBe(false);
    expect(moneyEquals(parseMoney('0'), parseMoney('0.00'))).toBe(false);
  });

  it('is immutable', () => {
    const m = parseMoney('10.00');
    // @ts-expect-error readonly fields cannot be assigned
    expect(() => (m.amount = '20.00')).toThrowError(TypeError);
  });
});
