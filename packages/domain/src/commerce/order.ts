/**
 * packages/domain/src/commerce/order.ts
 *
 * Phase 6 Task 4 & Task 13 — Order numbering, invariants, and state transition rules.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §82-96, §114-131.
 * - Format: MG-YYYY-NNNNNN
 * - Placed orders are immutable: snapshots freeze money, configuration, gems, and documents.
 */
import { DomainError } from '../errors.js';

export type OrderState =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'IN_FULFILLMENT'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

const VALID_STATE_TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['IN_FULFILLMENT', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  IN_FULFILLMENT: ['FULFILLED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  FULFILLED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ['REFUNDED'],
};

/**
 * Formats standard order number: MG-YYYY-NNNNNN
 */
export function formatOrderNumber(year: number, sequence: number): string {
  if (sequence < 1 || sequence > 999999) {
    throw new DomainError('INVALID_ORDER_NUMBER', `Order sequence out of range [1-999999]: ${sequence}`);
  }
  return `MG-${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Parses standard order number: MG-YYYY-NNNNNN
 */
export function parseOrderNumber(orderNumber: string): { year: number; sequence: number } {
  const match = /^MG-(\d{4})-(\d{6})$/.exec(orderNumber.trim());
  if (!match || !match[1] || !match[2]) {
    throw new DomainError('INVALID_ORDER_NUMBER', `Invalid order number format: "${orderNumber}"`);
  }
  return {
    year: Number.parseInt(match[1], 10),
    sequence: Number.parseInt(match[2], 10),
  };
}

/**
 * Asserts valid order state transition.
 */
export function assertValidOrderTransition(from: OrderState, to: OrderState): void {
  const allowed = VALID_STATE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new DomainError(
      'INVALID_ORDER_TRANSITION',
      `Illegal order transition from ${from} to ${to}.`,
    );
  }
}

export type OrderEvent =
  | { type: 'PAYMENT_RECEIVED'; transactionId: string; amount: string }
  | { type: 'CANCEL_REQUESTED'; reason: string; actor?: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' }
  | { type: 'FULFILLMENT_STARTED' }
  | { type: 'FULFILLMENT_COMPLETED'; trackingNumber?: string }
  | { type: 'REFUND_APPLIED'; refundId: string; amount: string; isFull: boolean };

export interface OrderTransitionResult {
  nextState: OrderState;
  reason: string;
}

/**
 * Pure domain state transition function: (currentState, event) -> nextState
 */
export function transitionOrder(
  currentState: OrderState,
  event: OrderEvent,
): OrderTransitionResult {
  switch (event.type) {
    case 'PAYMENT_RECEIVED': {
      assertValidOrderTransition(currentState, 'PAID');
      return { nextState: 'PAID', reason: `Payment received: $${event.amount}` };
    }
    case 'CANCEL_REQUESTED': {
      assertValidOrderTransition(currentState, 'CANCELLED');
      return { nextState: 'CANCELLED', reason: event.reason };
    }
    case 'FULFILLMENT_STARTED': {
      assertValidOrderTransition(currentState, 'IN_FULFILLMENT');
      return { nextState: 'IN_FULFILLMENT', reason: 'Fulfillment started' };
    }
    case 'FULFILLMENT_COMPLETED': {
      assertValidOrderTransition(currentState, 'FULFILLED');
      return { nextState: 'FULFILLED', reason: 'Fulfillment completed' };
    }
    case 'REFUND_APPLIED': {
      const targetState: OrderState = event.isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      assertValidOrderTransition(currentState, targetState);
      return { nextState: targetState, reason: `Refund applied: $${event.amount}` };
    }
    default: {
      throw new DomainError('INVALID_ORDER_TRANSITION', `Unknown event type: ${(event as any).type}`);
    }
  }
}

