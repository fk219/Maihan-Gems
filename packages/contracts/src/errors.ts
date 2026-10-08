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
