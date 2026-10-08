/**
 * packages/contracts/src/dto/catalog/cursor.ts
 *
 * Deterministic keyset-pagination cursor contract (Phase 3 task 4).
 *
 * Sort tuple. Every catalogue listing is ordered by the deterministic pair
 *   (sort column FROM the doc 12 indexed-column table, product_number)
 * where `product_number` is `BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE` on
 * products — a monotonic, collision-free tiebreaker that can never repeat a
 * row. The direction of BOTH components follows the sort direction, so the
 * tuple is a total order under that direction and keyset seeking with
 * `ROW(a, b) > ROW($1, $2)` (asc) / `<` (desc) is gap-free: no duplicated
 * and no missing records between pages (the undefined-behaviour class an
 * offset pager carries).
 *
 * Contract. A cursor is a self-describing envelope carrying its own sort key
 * and direction, base64url-encoded. The port validates:
 *   - structural integrity (Zod);
 *   - sort key/direction match against the request (a cursor minted for
 *     price-asc may not be replayed against price-desc);
 *   - tuple domain (numeric finiteness, integral tiebreaker).
 * A cursor for a different total-order shape is REJECTED with
 * VALIDATION_FAILED, never silently re-applied.
 */
import { z } from 'zod';
import { PRODUCT_SORT_KEYS, SORT_DIRECTION_SCHEMA } from './filters.js';
import type { ProductSortKey, SortDirection } from './filters.js';

export const PRODUCT_CURSOR_DEFAULT_LIMIT = 24;
export const PRODUCT_CURSOR_MAX_LIMIT = 100;

/**
 * Cursor payload.
 *   s : sort key ('price' | 'weight' | 'recency')
 *   d : sort direction driving BOTH components of the tuple
 *   n : product_number tiebreaker (int)
 *   a : the sort-column VALUE of the seek boundary row (finite; the column
 *       is NOT NULL on every configured sort key, so the strict keyset
 *       comparison `ROW(col, n) > ROW(a, n)` has no NULL branch)
 *   v : schema version, so a future tuple-shape change must re-key cursors
 *       instead of silently mis-seeking.
 */

export const CursorPayloadSchema = z
  .object({
    /** Cursor schema version for forward migration. */
    v: z.literal(1),
    /** Sort key the cursor was minted under. */
    s: z.enum(PRODUCT_SORT_KEYS),
    /** Sort direction of BOTH tuple components. */
    d: SORT_DIRECTION_SCHEMA,
    /** Current-row product_number tiebreaker (monotonic identity). */
    n: z.number().int().nonnegative(),
    /** Current-row sort-column value; must be finite and non-null. */
    a: z.number().finite(),
  })
  .strict();

export type CursorPayload = z.infer<typeof CursorPayloadSchema>;

/** Settings-listing cursor: deterministic design_code-ascending order, so the tuple is the string itself. */
export const SettingCursorPayloadSchema = z
  .object({
    v: z.literal(1),
    /** Deterministic settings sort: design_code ascending (plain-text). */
    d: z.literal('design_code'),
    /** Current-row design_code tiebreaker+key. */
    n: z.string().min(1).max(64),
  })
  .strict();

export type SettingCursorPayload = z.infer<typeof SettingCursorPayloadSchema>;

export const CURSOR_PREFIX = 'cur1_';

/** base64url, unpadded, URL-safe (RFC 4648 §5). Node-compatible + browser-compatible. */
function encodeBase64Url(json: string): string {
  const encoded = Buffer.from(json, 'utf8');
  return encoded
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(token: string): string {
  const padded = token
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const pad = padded.length % 4 === 0 ? padded : padded + '='.repeat(4 - (padded.length % 4));
  return Buffer.from(pad, 'base64').toString('utf8');
}

export type CursorEnvelopeFailure =
  | 'NOT_A_TOKEN'
  | 'MALFORMED_PAYLOAD'
  | 'SCHEMA_MISMATCH';

/**
 * Cursor encoding/decoding helpers. Structural failures yield a reason, not
 * a throw — the port turns the reason into a VALIDATION_FAILED contract
 * error with machine-readable details. Contract says: replay is deterministic
 * under identical data.
 */
export function encodeProductCursor(cursor: CursorPayload): string {
  return CURSOR_PREFIX + encodeBase64Url(JSON.stringify(cursor));
}

export function tryDecodeProductCursor(token: string | null | undefined): CursorPayload | CursorEnvelopeFailure {
  if (typeof token !== 'string' || !token.startsWith(CURSOR_PREFIX)) return 'NOT_A_TOKEN';
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(token.slice(CURSOR_PREFIX.length)));
  } catch {
    return 'MALFORMED_PAYLOAD';
  }
  const result = CursorPayloadSchema.safeParse(parsed);
  return result.success ? result.data : 'SCHEMA_MISMATCH';
}

export function encodeSettingCursor(cursor: SettingCursorPayload): string {
  return CURSOR_PREFIX + encodeBase64Url(JSON.stringify(cursor));
}

export function tryDecodeSettingCursor(token: string | null | undefined): SettingCursorPayload | CursorEnvelopeFailure {
  if (typeof token !== 'string' || !token.startsWith(CURSOR_PREFIX)) return 'NOT_A_TOKEN';
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(token.slice(CURSOR_PREFIX.length)));
  } catch {
    return 'MALFORMED_PAYLOAD';
  }
  const result = SettingCursorPayloadSchema.safeParse(parsed);
  return result.success ? result.data : 'SCHEMA_MISMATCH';
}
export const CURSOR_LIMITS = {
  defaultLimit: PRODUCT_CURSOR_DEFAULT_LIMIT,
  maxLimit: PRODUCT_CURSOR_MAX_LIMIT,
} as const;

export type { ProductSortKey, SortDirection };
