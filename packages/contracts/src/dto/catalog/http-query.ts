/**
 * packages/contracts/src/dto/catalog/http-query.ts
 *
 * Task 8 — the FLAT HTTP query-parameter contracts for the catalogue list
 * endpoints, composed from the port query schemas so the two can never
 * drift: an HTTP query string is flat (OpenAPI cannot express a nested
 * object as repeated query parameters), while the port input nests filters
 * under `filters`.
 *
 * Composition, not duplication:
 *   - `ProductListQueryParamsSchema` = the exact same
 *     `ProductFilterShapeSchema` + `ListQueryCommonSchema` the port parses,
 *     merged into one level;
 *   - `SettingListQueryParamsSchema` = `SettingFiltersSchema.partial()` +
 *     the same limit/cursor contract.
 *
 * Consequences that tests enforce:
 *   - every parameter name/type here is exactly what the port accepts after
 *     the API layer re-nests `filters` (parity is structural);
 *   - `.strict()` survives the merge: an unknown query parameter is a 400,
 *     never silently ignored (doc 06 "Validation rules");
 *   - defaults (`limit`, `sort`, `direction`) are applied at parse time, so
 *     semantically identical requests share one cache key (Task 6).
 *
 * This module is the single source for BOTH the API layer's coercion and
 * the generated OpenAPI parameter lists — the documented surface and the
 * executed surface are the same object.
 */
import { z } from 'zod';
import {
  PRODUCT_CURSOR_DEFAULT_LIMIT,
  PRODUCT_CURSOR_MAX_LIMIT,
} from './cursor.js';
import { SettingFiltersSchema } from './filters.js';
import { ListQueryCommonSchema, ProductFilterShapeSchema } from './queries.js';

/**
 * `GET /api/v1/products` query parameters (SoT 11.2): every structured
 * filter as a flat, repeatable parameter plus pagination and sort.
 */
// `.strict()` is re-applied after the merge: zod's merge inherits the RIGHT
// operand's unknownKeys policy, and ListQueryCommonSchema is strip-by-default
// — without this an unknown query parameter would be silently dropped
// instead of being a 400 (doc 06 validation rule 2). Verified by test.
export const ProductListQueryParamsSchema = ProductFilterShapeSchema.merge(
  ListQueryCommonSchema,
).strict();

export type ProductListQueryParams = z.infer<typeof ProductListQueryParamsSchema>;

/**
 * `GET /api/v1/settings` query parameters: jewellery type, style, metal
 * and vedic flag as flat parameters plus the shared keyset pagination.
 */
export const SettingListQueryParamsSchema = SettingFiltersSchema.partial()
  .extend({
    limit: z
      .number()
      .int()
      .min(1)
      .max(PRODUCT_CURSOR_MAX_LIMIT)
      .default(PRODUCT_CURSOR_DEFAULT_LIMIT),
    cursor: z.string().optional(),
  })
  .strict();

export type SettingListQueryParams = z.infer<typeof SettingListQueryParamsSchema>;
