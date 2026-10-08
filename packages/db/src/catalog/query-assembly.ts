/**
 * packages/db/src/catalog/query-assembly.ts
 *
 * Deterministic sort tuples, keyset seek predicates and ORDER BY assembly
 * for the catalogue read queries (Phase 3 task 4).
 *
 * Tuple: (sort column, product_number) — product_number is
 * `BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE` on products, a monotonic and
 * collision-free tiebreaker, so records sharing the primary sort value
 * still order precisely and identically on every run. Both tuple components
 * follow the sort direction.
 *
 * Seek predicate: strictly-ordered ROW comparison in the sort direction —
 *   asc : ROW(col, product_number) > ROW(:a, :n)
 *   desc: ROW(col, product_number) < ROW(:a, :n)
 * which is gap-free: no duplicated and no missing records across page
 * boundaries. The comparison uses the same total-order expression the
 * ORDER BY uses, and no NULLS ordering decision is left to planner
 * defaults: the weight sort maps NULL weight onto a constant sentinel (-1)
 * inside that SAME expression, keeping the order total under identical
 * data.
 *
 * Cursors carry their own sort key + direction (contracts CursorPayload).
 * Replaying a cursor under a different total-order shape, or a structurally
 * invalid cursor token, is REJECTED with the closed-registry
 * VALIDATION_FAILED code — never silently re-applied (task 4: cursor
 * validation).
 */
import { sql, type SQL } from 'drizzle-orm';
import { ContractError, type ContractErrorCode } from '@maihan/contracts';
import type { CursorPayload, ProductSortKey, SortDirection } from '@maihan/contracts';

export interface SortTupleColumn {
  /** Canonical key name inside the cursor payload. */
  readonly key: ProductSortKey;
  /** Ordering expression shared by ORDER BY and the seek predicate (never NULL). */
  readonly orderedExpr: SQL;
  /** Projection for minting the next cursor (same expression, float8 cast). */
  readonly valueExpr: SQL;
}

/**
 * Sort keys over indexed columns only (doc 12 filter table). `price_amount`
 * is NOT NULL; the weight sort maps a NULL weight onto the constant -1 via
 * COALESCE so the tuple stays total. Sorting on `-1` puts loose-stone
 * placeholder rows deterministically first (asc) / last (desc), invariant
 * under identical data.
 *
 * `recency` sorts on `published_at` — an indexed column (doc 06 listing
 * order) whose NULL state (migrated DRAFT rows, not yet published) also maps
 * onto a sentinel so the tuple stays total under both directions.
 */
export const PRODUCT_SORT_COLUMNS: Record<ProductSortKey, SortTupleColumn> = {
  price: {
    key: 'price',
    orderedExpr: sql`p.price_amount`,
    valueExpr: sql`p.price_amount::float8`,
  },
  weight: {
    key: 'weight',
    orderedExpr: sql`coalesce(p.total_weight_ct, -1)`,
    valueExpr: sql`coalesce(p.total_weight_ct, -1)::float8`,
  },
  recency: {
    key: 'recency',
    orderedExpr: sql`coalesce(p.published_at, '-infinity'::timestamptz)`,
    valueExpr: sql`coalesce(extract(epoch from p.published_at), -1)::float8`,
  },
};

export function orderBySql(key: ProductSortKey, direction: SortDirection): SQL {
  const col = PRODUCT_SORT_COLUMNS[key].orderedExpr;
  return sql`${col} ${sql.raw(direction)}, p.product_number ${sql.raw(direction)}`;
}

export function seekPredicateSql(key: ProductSortKey, direction: SortDirection, cursor: CursorPayload): SQL {
  const col = PRODUCT_SORT_COLUMNS[key].orderedExpr;
  const tupleValue = sql.param(cursor.a);
  const tupleNumber = sql.param(cursor.n);
  const comparison = direction === 'asc' ? sql`>` : sql`<`;
  // Row-value comparison in the tuple order: (col, product_number) placed
  // strictly after/before the boundary row. Postgres compares the tuple in
  // the ORDER BY's collation-free numeric domain, which is exactly the
  // projection `valueExpr` minted the cursor from.
  return sql`ROW(${col}, p.product_number) ${comparison} ROW((${tupleValue})::float8, (${tupleNumber}))`;
}

/**
 * Maps a contract-level cursor decode failure onto the closed registry.
 * `detail` machine-readable shape: the field and the reason.
 */
export type { CursorPayload, ProductSortKey, SortDirection } from '@maihan/contracts';

export function invalidCursorError(reason: string, field = 'cursor'): ContractError {
  const code: ContractErrorCode = 'VALIDATION_FAILED';
  return new ContractError(code, `Invalid or incompatible page cursor.`, [
    { field, reason },
  ]);
}
