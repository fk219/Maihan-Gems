import { describe, it, expect } from 'vitest';
import {
  assertValidOrderTransition,
  formatOrderNumber,
  parseOrderNumber,
} from './order.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('Order Domain Rules (Phase 6 Task 4 & 13)', () => {
  it('formats valid order numbers in MG-YYYY-NNNNNN structure', () => {
    expect(formatOrderNumber(2026, 1)).toBe('MG-2026-000001');
    expect(formatOrderNumber(2026, 42)).toBe('MG-2026-000042');
    expect(formatOrderNumber(2026, 999999)).toBe('MG-2026-999999');
  });

  it('rejects sequence outside range [1-999999]', () => {
    expectErrorCode(() => formatOrderNumber(2026, 0), 'INVALID_ORDER_NUMBER');
    expectErrorCode(() => formatOrderNumber(2026, 1000000), 'INVALID_ORDER_NUMBER');
  });

  it('parses valid order numbers', () => {
    const parsed = parseOrderNumber('MG-2026-000123');
    expect(parsed.year).toBe(2026);
    expect(parsed.sequence).toBe(123);
  });

  it('rejects malformed order numbers', () => {
    expectErrorCode(() => parseOrderNumber('ORD-2026-001'), 'INVALID_ORDER_NUMBER');
    expectErrorCode(() => parseOrderNumber('MG-2026-123'), 'INVALID_ORDER_NUMBER');
  });

  it('allows valid order state transitions', () => {
    expect(() => assertValidOrderTransition('PENDING_PAYMENT', 'PAID')).not.toThrow();
    expect(() => assertValidOrderTransition('PAID', 'IN_FULFILLMENT')).not.toThrow();
    expect(() => assertValidOrderTransition('IN_FULFILLMENT', 'FULFILLED')).not.toThrow();
    expect(() => assertValidOrderTransition('PAID', 'REFUNDED')).not.toThrow();
  });

  it('rejects illegal order state transitions', () => {
    expectErrorCode(
      () => assertValidOrderTransition('PENDING_PAYMENT', 'FULFILLED'),
      'INVALID_ORDER_TRANSITION',
    );
    expectErrorCode(
      () => assertValidOrderTransition('CANCELLED', 'PAID'),
      'INVALID_ORDER_TRANSITION',
    );
  });
});
