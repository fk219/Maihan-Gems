/**
 * packages/domain — test-only helper for asserting stable error codes
 * (INV-01..INV-10 and the INVALID_* validation codes).
 *
 * Asserting the code via the property (not by substring-matching the message)
 * is the point: the code is the contract; the message is human context.
 * This file is test infrastructure ONLY — it is never re-exported through
 * index.ts and never imported by runtime domain logic.
 */
import { expect } from 'vitest';
import { DomainError } from '../errors.js';

/** Expects fn to throw a DomainError (or subclass) with exactly this code. */
export function expectErrorCode(fn: () => unknown, code: string): void {
  let error: unknown;
  let threw = false;
  try {
    fn();
  } catch (e) {
    error = e;
    threw = true;
  }
  expect(threw, 'expected the call to throw a DomainError').toBe(true);
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
}

/** Expects fn to throw an InvariantError with exactly this registry code. */
export function expectInvariantCode(fn: () => unknown, code: string): void {
  let error: unknown;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
}
