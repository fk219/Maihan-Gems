/**
 * packages/contracts/src/errors.ts
 *
 * The shared contract-error surface for application code that validates
 * DTOs and query ports.
 *
 * technical_design/07 "Error model": one envelope, one closed registry,
 * `details` always machine-readable, "an ad-hoc string is a defect".
 * technical_design/06 "Implementation constraints": every DTO validates
 * inputs and rejects unknown fields with a stable code.
 *
 * This module holds the closed catalogue error-code registry plus the
 * `ContractError` type. HTTP mapping (route handlers, envelope serialisation,
 * requestId/traceId) is NOT done here — it belongs to the HTTP layer that
 * consumes these typed errors.
 *
 * Codes below are the subset of the doc 07 registry needed by the Phase 3
 * catalogue query foundation:
 *   - VALIDATION_FAILED   (400) : malformed query input, including cursor validation.
 *   - INVALID_FILTER      (400) : a filter name/value not in the structured whitelist.
 *   - PRODUCT_NOT_FOUND   (404) : unknown slug or soft-deleted (doc 10 error handling).
 *   - GEMSTONE_NOT_FOUND  (404) : unknown gemRef (doc 10).
 *   - SETTING_VARIANT_NOT_FOUND (404) : unknown SKU (doc 10).
 *   - SETTING_NOT_FOUND   (404) : unknown setting design code (doc 10 family).
 *
 * Adding a code here is a registry change that requires review (doc 07);
 * inventing a code at a call site instead of importing a member is forbidden.
 */
import { z } from 'zod';

export const CONTRACT_ERROR_CODES = [
  'VALIDATION_FAILED',
  'INVALID_FILTER',
  'PRODUCT_NOT_FOUND',
  'GEMSTONE_NOT_FOUND',
  'SETTING_VARIANT_NOT_FOUND',
  'SETTING_NOT_FOUND',
  // ─── HTTP API surface codes (Phase 3 tasks 8-10) ───────────────────────────
  // RATE_LIMITED and INTERNAL are named verbatim in the doc 07 / SoT 10.4
  // registry (429 / 500 rows). NOT_FOUND and METHOD_NOT_ALLOWED complete the
  // routing surface: doc 07's table lists example codes per class and its
  // rule is "a new code requires review; an ad-hoc string is a defect" —
  // these four are registered HERE so no call site invents a string.
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'RATE_LIMITED',
  'INTERNAL',
  // ─── Commerce & Checkout surface codes (Phase 6) ───────────────────────────
  'PRICE_CHANGED',
  'OUT_OF_STOCK',
  'ALREADY_RESERVED',
  'CART_EXPIRED',
  'CHECKOUT_SESSION_EXPIRED',
  'PAIR_RESERVATION_FAILED',
  'DISCOUNT_INVALID',
  'REFUND_EXCEEDS_CAPTURED',
  'IDEMPOTENCY_CONFLICT',
  'PAYMENT_FAILED',
  'ORDER_NOT_FOUND',
  'CART_NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'UNPROCESSABLE',
] as const;

export type ContractErrorCode = (typeof CONTRACT_ERROR_CODES)[number];

/** Error class of the HTTP status each registry code maps to (doc 07). */
const HTTP_STATUS_BY_CODE: Record<ContractErrorCode, number> = {
  VALIDATION_FAILED: 400,
  INVALID_FILTER: 400,
  PRODUCT_NOT_FOUND: 404,
  GEMSTONE_NOT_FOUND: 404,
  SETTING_VARIANT_NOT_FOUND: 404,
  SETTING_NOT_FOUND: 404,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  PRICE_CHANGED: 409,
  OUT_OF_STOCK: 409,
  ALREADY_RESERVED: 409,
  CART_EXPIRED: 409,
  CHECKOUT_SESSION_EXPIRED: 409,
  PAIR_RESERVATION_FAILED: 409,
  DISCOUNT_INVALID: 422,
  REFUND_EXCEEDS_CAPTURED: 422,
  IDEMPOTENCY_CONFLICT: 409,
  PAYMENT_FAILED: 402,
  ORDER_NOT_FOUND: 404,
  CART_NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  UNPROCESSABLE: 422,
};

export type ContractErrorDetail = { [field: string]: unknown };

/** Machine-readable, closed-registry contract error. */
export class ContractError extends Error {
  readonly code: ContractErrorCode;
  readonly details?: ReadonlyArray<ContractErrorDetail> | null;

  constructor(
    code: ContractErrorCode,
    message: string,
    details?: ReadonlyArray<ContractErrorDetail> | null,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'ContractError';
    this.code = code;
    this.details = details ?? null;
  }

  /** HTTP status assigned by the closed registry mapping (doc 07). */
  get httpStatus(): number {
    return HTTP_STATUS_BY_CODE[this.code];
  }
}

export function isContractError(value: unknown): value is ContractError {
  return value instanceof ContractError;
}

/** Not-found factory used by repository/ports for identity lookups. */
export function contractNotFound(
  code: 'PRODUCT_NOT_FOUND' | 'GEMSTONE_NOT_FOUND' | 'SETTING_VARIANT_NOT_FOUND' | 'SETTING_NOT_FOUND',
  identifierField: string,
  identifier: string,
): ContractError {
  return new ContractError(code, defaultNotFoundMessage(code), [
    { field: identifierField, value: identifier },
  ]);
}

function defaultNotFoundMessage(code: ContractErrorCode): string {
  switch (code) {
    case 'PRODUCT_NOT_FOUND':
      return 'Unknown slug or soft-deleted product.';
    case 'GEMSTONE_NOT_FOUND':
      return 'Unknown gemstone reference.';
    case 'SETTING_VARIANT_NOT_FOUND':
      return 'Unknown setting variant SKU.';
    case 'SETTING_NOT_FOUND':
      return 'Unknown setting design code.';
    default:
      return 'Not found.';
  }
}

/** Zod schema validating an error-code string against the closed registry. */
export const ContractErrorCodeSchema = z.enum(CONTRACT_ERROR_CODES);
