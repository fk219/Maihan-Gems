import { describe, it, expect } from 'vitest';
import {
  assertValidOrderTransition,
  formatOrderNumber,
  parseOrderNumber,
  transitionOrder,
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

  it('transitionOrder pure state machine executes valid events', () => {
    // 1. Payment received
    const payRes = transitionOrder('PENDING_PAYMENT', {
      type: 'PAYMENT_RECEIVED',
      transactionId: 'tx_123',
      amount: '500.00',
    });
    expect(payRes.nextState).toBe('PAID');

    // 2. Fulfillment started
    const fulStartRes = transitionOrder('PAID', { type: 'FULFILLMENT_STARTED' });
    expect(fulStartRes.nextState).toBe('IN_FULFILLMENT');

    // 3. Fulfillment completed
    const fulCompRes = transitionOrder('IN_FULFILLMENT', {
      type: 'FULFILLMENT_COMPLETED',
      trackingNumber: 'TRK123',
    });
    expect(fulCompRes.nextState).toBe('FULFILLED');

    // 4. Cancellation
    const cancelRes = transitionOrder('PENDING_PAYMENT', {
      type: 'CANCEL_REQUESTED',
      reason: 'Customer changed mind',
    });
    expect(cancelRes.nextState).toBe('CANCELLED');

    // 5. Partial refund
    const partRefRes = transitionOrder('PAID', {
      type: 'REFUND_APPLIED',
      refundId: 'ref_1',
      amount: '100.00',
      isFull: false,
    });
    expect(partRefRes.nextState).toBe('PARTIALLY_REFUNDED');

    // 6. Full refund
    const fullRefRes = transitionOrder('PAID', {
      type: 'REFUND_APPLIED',
      refundId: 'ref_2',
      amount: '500.00',
      isFull: true,
    });
    expect(fullRefRes.nextState).toBe('REFUNDED');
  });

  it('transitionOrder pure state machine rejects illegal events from terminal states', () => {
    expectErrorCode(
      () =>
        transitionOrder('CANCELLED', {
          type: 'PAYMENT_RECEIVED',
          transactionId: 'tx_999',
          amount: '500.00',
        }),
      'INVALID_ORDER_TRANSITION',
    );
    expectErrorCode(
      () =>
        transitionOrder('REFUNDED', {
          type: 'FULFILLMENT_STARTED',
        }),
      'INVALID_ORDER_TRANSITION',
    );
  });
});
