/**
 * packages/domain — Money value object (doc 05 "Value objects"; SoT 8.2).
 *
 * Rules that are load-bearing:
 *   - amount is a DECIMAL STRING, never a number. A float in a price path is
 *     a defect (doc 05; doc 06 rule 4). The type makes a number unassignable.
 *   - currency is USD, matching the verified evidence (USD 1,024 of 1,024) and
 *     the architecture's single display/storing currency (doc 35 section 8).
 *   - precision/scale mirror the locked column type NUMERIC(12,2): at most
 *     10 integral digits and 2 fractional digits. Values are stored and
 *     compared exactly as given — no normalisation, no arithmetic here.
 *   - non-negative: every money CHECK in the schema is amount >= 0; a
 *     negative amount has no domain meaning.
 */
import { DomainError } from '../errors.js';

/** NUMERIC(12,2): max 9999999999.99. */
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_INTEGRAL_DIGITS = 10;

export interface Money {
  readonly amount: string;
  readonly currency: 'USD';
}

function validAmountShape(amount: string): boolean {
  if (!MONEY_PATTERN.test(amount)) return false;
  const integral = amount.split('.')[0] ?? '';
  return integral.length <= MAX_INTEGRAL_DIGITS;
}

export function isMoneyAmount(value: string): boolean {
  return validAmountShape(value);
}

export function parseMoney(amount: string, currency: 'USD' = 'USD'): Money {
  if (!validAmountShape(amount)) {
    throw new DomainError(
      'INVALID_MONEY_AMOUNT',
      `money amount must be a non-negative decimal string with at most ${MAX_INTEGRAL_DIGITS} integral and 2 fractional digits (NUMERIC(12,2)); got "${amount}"`,
    );
  }
  if (currency !== 'USD') {
    throw new DomainError('INVALID_MONEY_CURRENCY', `money currency is USD in this build; got "${currency}"`);
  }
  return Object.freeze({ amount, currency } as const);
}

/** Equality is exact string equality on the amount plus the currency. */
export function moneyEquals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}
