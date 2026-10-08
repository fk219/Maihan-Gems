/**
 * apps/web/src/lib/catalog-errors.ts
 *
 * Error classification for catalogue pages (Tasks 4/5).
 *
 * The Phase 3 service throws the closed-registry ContractError. Pages need
 * exactly one decision: is this a NOT_FOUND (render not-found) or a transient
 * failure (route error boundary with a recovery action)? Nothing else leaks:
 * messages and stack traces never reach the UI.
 */
import { isContractError, type ContractError } from '@maihan/contracts';

const NOT_FOUND_CODES = new Set([
  'PRODUCT_NOT_FOUND',
  'GEMSTONE_NOT_FOUND',
  'SETTING_VARIANT_NOT_FOUND',
  'SETTING_NOT_FOUND',
]);

export function isProductNotFound(error: unknown): boolean {
  return isContractError(error) && NOT_FOUND_CODES.has((error as ContractError).code);
}

export type LoadResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: unknown };
