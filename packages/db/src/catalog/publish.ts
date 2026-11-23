/**
 * packages/db/src/catalog/publish.ts
 *
 * P3.1 — the product publication path.
 *
 * Until now nothing in application code could move a product out of DRAFT: the
 * migrated corpus is DRAFT, the read models filter `state = 'ACTIVE'`, and the
 * only `UPDATE ... 'ACTIVE'` statements in the repository were test fixtures.
 * This module is the one supported way to publish.
 *
 * Gate V15 is enforced here, not in the UI: a product whose price evidence is
 * `UNKNOWN` may not be published. Hiding a button is not a control.
 *
 * The two-person rule (plan task 3) is enforced here too: a DRAFT -> ACTIVE
 * move whose price evidence is not VERIFIED requires an approver different from
 * the last recorded editor of the product. The editor is read from the audit
 * ledger before any write; when no editor is recorded the rule is satisfied and
 * the fact is written into the audit snapshot.
 *
 * Every transition writes `audit_logs` with before and after state. The audit
 * row is written in the SAME statement batch as the update, so a published row
 * without an audit row is not representable.
 */
import { sql } from 'drizzle-orm';
import {
  assertTwoPerson,
  productPublishEntityKind,
  twoPersonAuditFields,
  twoPersonRuleFor,
} from '@maihan/domain';
import type { CatalogDatabase } from './executor.js';

export type PublishFailureCode = 'NOT_FOUND' | 'INVALID_STATE' | 'UNVERIFIED_PRICE';

export class ProductPublishError extends Error {
  constructor(readonly code: PublishFailureCode) {
    super(`PRODUCT_PUBLISH: ${code}`);
    this.name = 'ProductPublishError';
  }
}

export interface AdminProductRow extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  kind: string;
  state: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  price_amount: string;
  currency: string;
  price_evidence: string;
  published_at: string | null;
}

const ADMIN_PRODUCT_COLUMNS = sql`
  p.id, p.slug, p.title, p.kind, p.state,
  p.price_amount, p.currency, p.price_evidence, p.published_at
`;

/** RETURNING cannot use the SELECT alias. */
const ADMIN_PRODUCT_RETURNING = sql`
  id, slug, title, kind, state,
  price_amount, currency, price_evidence, published_at
`;

export interface ListAdminProductsOptions {
  readonly state?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  readonly limit: number;
  readonly offset: number;
}

export async function listProductsForAdmin(
  db: CatalogDatabase,
  options: ListAdminProductsOptions,
): Promise<AdminProductRow[]> {
  const limit = Math.min(Math.max(options.limit, 1), 200);
  const offset = Math.max(options.offset, 0);
  if (options.state === undefined) {
    const r = await db.execute<AdminProductRow>(sql`
      SELECT ${ADMIN_PRODUCT_COLUMNS}
      FROM products p
      WHERE p.deleted_at IS NULL
      ORDER BY p.product_number ASC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return r.rows;
  }
  const r = await db.execute<AdminProductRow>(sql`
    SELECT ${ADMIN_PRODUCT_COLUMNS}
    FROM products p
    WHERE p.deleted_at IS NULL AND p.state = ${options.state}
    ORDER BY p.product_number ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return r.rows;
}

export async function countProductsForAdmin(
  db: CatalogDatabase,
  state?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
): Promise<number> {
  const r = state === undefined
    ? await db.execute<{ count: string }>(sql`
        SELECT count(*)::text AS count FROM products p WHERE p.deleted_at IS NULL
      `)
    : await db.execute<{ count: string }>(sql`
        SELECT count(*)::text AS count FROM products p
        WHERE p.deleted_at IS NULL AND p.state = ${state}
      `);
  return Number(r.rows[0]?.count ?? '0');
}

export interface PublishParams {
  readonly productId: string;
  readonly actorId: string;
  readonly requestId?: string;
}

/**
 * The last actor recorded against this product in the audit ledger.
 *
 * `products` has no `updated_by` column, so the audit ledger is the recorded
 * source of "who edited it last". This is the same fact the console shows, and
 * it is read BEFORE the write so a refused self-approval writes nothing.
 */
async function readLastProductEditor(
  db: CatalogDatabase,
  productId: string,
): Promise<string | null> {
  const rows = await db.execute<{ actor_id: string | null }>(sql`
    SELECT a.actor_id
      FROM audit_logs a
     WHERE a.entity_type = 'products'
       AND a.entity_id = ${productId}::uuid
       AND a.actor_type = 'ADMIN'
       AND a.actor_id IS NOT NULL
     ORDER BY a.id DESC
     LIMIT 1
  `);
  return rows.rows[0]?.actor_id ?? null;
}

async function transition(
  db: CatalogDatabase,
  params: PublishParams,
  target: 'ACTIVE' | 'DRAFT' | 'ARCHIVED',
  action: 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE',
): Promise<AdminProductRow> {
  const current = await db.execute<AdminProductRow & { price_evidence: string }>(sql`
    SELECT ${ADMIN_PRODUCT_COLUMNS}
    FROM products p
    WHERE p.id = ${params.productId} AND p.deleted_at IS NULL
    FOR UPDATE
  `);
  const before = current.rows[0];
  if (before === undefined) throw new ProductPublishError('NOT_FOUND');

  // Publishing is not idempotent by accident: ACTIVE -> ACTIVE is a no-op that
  // still returns the row, so a retried request cannot create a second audit
  // entry claiming a state change that did not happen.
  if (before.state === target) return before;

  if (target === 'ACTIVE' && before.price_evidence === 'UNKNOWN') {
    throw new ProductPublishError('UNVERIFIED_PRICE');
  }
  if (before.state === 'ARCHIVED' && target === 'ACTIVE') {
    // Archived is terminal for the product lifecycle (no resurrect-by-accident).
    throw new ProductPublishError('INVALID_STATE');
  }

  // Two-person rule, checked before the write. `assertTwoPerson` throws the
  // typed TwoPersonError, which the API maps to 403 TWO_PERSON_REQUIRED.
  const rule = twoPersonRuleFor(
    productPublishEntityKind(before.state, target, before.price_evidence),
  );
  const editorId = rule.required ? await readLastProductEditor(db, params.productId) : null;
  assertTwoPerson(rule, editorId, params.actorId);
  const twoPerson = twoPersonAuditFields(rule, editorId, params.actorId);
  const twoPersonJson = JSON.stringify(twoPerson);

  const updated = await db.execute<AdminProductRow>(sql`
    UPDATE products
    SET state = ${target},
        published_at = ${target === 'ACTIVE' ? sql`now()` : sql`NULL`}
    WHERE id = ${params.productId} AND deleted_at IS NULL
    RETURNING ${ADMIN_PRODUCT_RETURNING}
  `);
  const after = updated.rows[0];
  if (after === undefined) throw new ProductPublishError('NOT_FOUND');

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id,
      before_state, after_state, diff, request_id, reason
    ) VALUES (
      'ADMIN', ${params.actorId}::uuid, ${action}, 'products', ${params.productId}::uuid,
      ${JSON.stringify({ state: before.state, published_at: before.published_at })}::jsonb,
      ${JSON.stringify({ state: after.state, published_at: after.published_at, two_person: twoPerson })}::jsonb,
      ${twoPersonJson}::jsonb,
      ${params.requestId ?? null},
      ${rule.required
        ? `Product ${action.toLowerCase()} with second approver recorded`
        : `Product ${action.toLowerCase()} from the admin console`}
    )
  `);

  return after;
}

export async function publishProduct(
  db: CatalogDatabase,
  params: PublishParams,
): Promise<AdminProductRow> {
  return transition(db, params, 'ACTIVE', 'PUBLISH');
}

export async function unpublishProduct(
  db: CatalogDatabase,
  params: PublishParams,
): Promise<AdminProductRow> {
  return transition(db, params, 'DRAFT', 'UNPUBLISH');
}
