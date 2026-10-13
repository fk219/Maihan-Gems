/**
 * packages/db/src/catalog/sort.ts
 *
 * Cursor validation and sort-tuple plumbing for the catalogue listings
 * (Phase 3 task 4: "deterministic keyset pagination" + "cursor validation").
 *
 * The tuple itself is defined in query-assembly.ts:
 *   (sort column, product_number)  for products
 *   (design_code)                  for settings (UNIQUE while not deleted)
 *
 * THIS module owns the boundary between the contract layer's structural
 * encoding (base64url envelope in @maihan/contracts) and the port's SEMANTIC
 * validation:
 *   - sort key + direction carried by a cursor MUST match the request that
 *     replays it (a price-asc cursor may never seek into a price-desc order;
 *     a difference is an INVALID cursor, not a silent re-anchor);
 *   - tuple values must lie in the domain the ORDER BY projects from
 *     (finite float8, integral non-negative product_number);
 *   - settings cursors carry the design_code seek key only.
 *
 * Every failure is a closed-registry ContractError (VALIDATION_FAILED) with
 * a machine-readable field/reason — never a throw of an ad-hoc error and
 * never a silent ignore (doc 07).
 */
import { ContractError } from '@maihan/contracts';
import {
  tryDecodeProductCursor,
  tryDecodeSettingCursor,
  type CursorEnvelopeFailure,
  type CursorPayload,
  type SettingCursorPayload,
  type ProductSortKey,
  type SortDirection,
} from '@maihan/contracts';
import { invalidCursorError } from './query-assembly.js';

const ENVELOPE_FAILURE_REASON: Record<CursorEnvelopeFailure, string> = {
  NOT_A_TOKEN: 'cursor-style-prefix-missing',
  MALFORMED_PAYLOAD: 'payload-not-decodable-json',
  SCHEMA_MISMATCH: 'payload-not-a-schema-member',
};

function envelopeFailureReason(code: string): string {
  if (code === 'NOT_A_TOKEN' || code === 'MALFORMED_PAYLOAD' || code === 'SCHEMA_MISMATCH') {
    return ENVELOPE_FAILURE_REASON[code];
  }
  return ENVELOPE_FAILURE_REASON.SCHEMA_MISMATCH;
}

/**
 * Structural + semantic cursor validation for the products listing.
 *
 * @throws ContractError VALIDATION_FAILED when the token cannot be trusted
 *         as a seek anchor for the REQUESTED total order.
 */
export function validateProductCursor(
  token: string | null | undefined,
  request: { sortKey: ProductSortKey; direction: SortDirection },
): CursorPayload | null {
  if (token === undefined || token === null || token === '') return null;
  const decoded = tryDecodeProductCursor(token);
  if (typeof decoded === 'string') {
    throw invalidCursorError(envelopeFailureReason(decoded));
  }
  if (decoded.s !== request.sortKey || decoded.d !== request.direction) {
    throw invalidCursorError('sort-shape-mismatch');
  }
  return decoded;
}

/** Settings lookups: the tuple is (design_code asc); the cursor carries the key. */
export function validateSettingCursor(token: string | null | undefined): SettingCursorPayload | null {
  if (token === undefined || token === null || token === '') return null;
  const decoded = tryDecodeSettingCursor(token);
  if (typeof decoded === 'string') {
    // Reuse the product error — same closed code, settings-shaped field.
    throw new ContractError('VALIDATION_FAILED', 'Invalid or incompatible page cursor.', [
      { field: 'cursor', reason: envelopeFailureReason(decoded) },
    ]);
  }
  return decoded;
}

/** Clamp the requested page size to the contract domain (port default 24, max 100). */
export function clampLimit(requested: number, max: number): number {
  if (requested < 1) return 1;
  if (requested > max) return max;
  return requested;
}
