/**
 * packages/db/src/vendors/vendor-portal-repository.ts
 *
 * ADR-026 / BUILD_BACKLOG Track D — the vendor-scoped read and write layer.
 *
 * The vendor boundary is a REQUIRED first argument on every function here.
 * There is deliberately no overload that lists products, allocations or ledger
 * rows without a `vendorId`: a query that forgets the boundary cannot be
 * written against this module, which is what ADR-026 consequence (1) asks for.
 *
 * Rules enforced here, not in callers:
 *   - a vendor product is created DRAFT with `price_evidence = 'UNKNOWN'`;
 *     publishing is a platform decision (P3.1), never a vendor one;
 *   - an update only matches a row owned by the same vendor, and a mismatch
 *     returns null — the same answer as "does not exist", so the portal cannot
 *     use the endpoint to probe another vendor's identifiers;
 *   - every write appends an `audit_logs` row with before/after state.
 *
 * Money arrives as integer minor units and is written as a decimal string
 * built with BigInt. Nothing here performs float arithmetic on money.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export type VendorProductState = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'SOLD_OUT' | 'DISCONTINUED';

export type VendorProductKind =
  | 'CONFIGURED'
  | 'READY_MADE'
  | 'LOOSE_STONE'
  | 'STONE_PAIR'
  | 'SETTING_ONLY';

/**
 * The kinds the portal can create TODAY.
 *
 * `products_composition_ck` (INV-01) requires `setting_variant_id` for
 * CONFIGURED and SETTING_ONLY, and a gemstone/pair for CONFIGURED. The portal
 * does not capture those references yet, so offering those kinds would produce
 * a database constraint failure. When reference intake exists, widen this type
 * with the same migration discipline the constraint implies.
 */
export type VendorCreatableProductKind = 'READY_MADE' | 'LOOSE_STONE' | 'STONE_PAIR';

export type VendorJewelleryType =
  | 'RING'
  | 'EARRINGS'
  | 'NECKLACE'
  | 'PENDANT'
  | 'BRACELET'
  | 'BROOCH'
  | 'CUFFLINKS'
  | 'CHARM';

export interface VendorProductRow extends Record<string, unknown> {
  id: string;
  vendor_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  kind: VendorProductKind;
  state: VendorProductState;
  price_amount: string;
  currency: string;
  price_evidence: string;
  availability: boolean;
  total_weight_ct: string | null;
  created_at: string;
  updated_at: string;
}

const VENDOR_PRODUCT_COLUMNS = sql`
  p.id, p.vendor_id, p.slug, p.title, p.subtitle, p.kind, p.state,
  p.price_amount::text AS price_amount, p.currency, p.price_evidence,
  p.availability, p.total_weight_ct::text AS total_weight_ct,
  p.created_at, p.updated_at
`;

/** RETURNING has no table alias, so the columns are listed without one. */
const VENDOR_PRODUCT_RETURNING = sql`
  id, vendor_id, slug, title, subtitle, kind, state,
  price_amount::text AS price_amount, currency, price_evidence,
  availability, total_weight_ct::text AS total_weight_ct,
  created_at, updated_at
`;

export interface VendorProductList {
  readonly items: readonly VendorProductRow[];
  readonly total: number;
}

export interface ListVendorProductsOptions {
  readonly state?: VendorProductState;
  readonly limit: number;
  readonly offset: number;
}

/** Vendors never see another vendor's stock: the id predicate is not optional. */
export async function listVendorProducts(
  db: CatalogDatabase,
  vendorId: string,
  options: ListVendorProductsOptions,
): Promise<VendorProductList> {
  const limit = Math.min(Math.max(options.limit, 1), 200);
  const offset = Math.max(options.offset, 0);
  const stateClause =
    options.state === undefined ? sql`` : sql`AND p.state = ${options.state}::product_state`;

  // Count and page are separate statements on purpose: a window count would
  // vanish with an empty page (offset past the end), and pagination would then
  // claim there are zero rows. The total must stay true for any offset.
  const counted = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count
    FROM products p
    WHERE p.vendor_id = ${vendorId}::uuid
      AND p.deleted_at IS NULL
      ${stateClause}
  `);

  const r = await db.execute<VendorProductRow>(sql`
    SELECT ${VENDOR_PRODUCT_COLUMNS}
    FROM products p
    WHERE p.vendor_id = ${vendorId}::uuid
      AND p.deleted_at IS NULL
      ${stateClause}
    ORDER BY p.created_at DESC, p.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return {
    items: r.rows,
    total: Number(counted.rows[0]?.count ?? '0'),
  };
}

export interface CreateVendorProductInput {
  /** The signed-in vendor member. Required: the audit row names a person. */
  readonly actorId: string;
  readonly kind: VendorCreatableProductKind;
  readonly slug: string;
  readonly title: string;
  readonly jewelleryType: VendorJewelleryType;
  /** Integer minor units. Never a float. */
  readonly priceMinor: number;
  readonly currency?: string;
  readonly subtitle?: string | null;
  readonly description?: string | null;
  readonly shortDescription?: string | null;
  readonly totalWeightCt?: string | null;
  readonly requestId?: string;
}

/** Bounded by NUMERIC(12,2): the largest representable amount in minor units. */
const MAX_PRICE_MINOR = 999_999_999_999n;

/**
 * Decimal string for `NUMERIC(12,2)` without touching floating point.
 * Exported so the test can prove the conversion directly.
 */
export function minorUnitsToDecimalString(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new Error('VENDOR_PRODUCT: priceMinor must be a non-negative safe integer');
  }
  const value = BigInt(minor);
  if (value > MAX_PRICE_MINOR) {
    throw new Error('VENDOR_PRODUCT: priceMinor exceeds the NUMERIC(12,2) range');
  }
  const whole = value / 100n;
  const cents = value % 100n;
  return `${whole}.${cents.toString().padStart(2, '0')}`;
}

export async function createVendorProduct(
  db: CatalogDatabase,
  vendorId: string,
  input: CreateVendorProductInput,
): Promise<VendorProductRow> {
  const price = minorUnitsToDecimalString(input.priceMinor);

  // `state` and `price_evidence` are FIXED literals: the input type has no
  // field for either, so a vendor cannot publish or claim price evidence even
  // if a future caller forwards extra request properties.
  const inserted = await db.execute<VendorProductRow>(sql`
    INSERT INTO products (
      vendor_id, kind, slug, title, subtitle, jewellery_type,
      price_amount, currency, price_evidence, state,
      total_weight_ct, description, short_description
    ) VALUES (
      ${vendorId}::uuid,
      ${input.kind}::product_kind,
      ${input.slug},
      ${input.title},
      ${input.subtitle ?? null},
      ${input.jewelleryType}::jewellery_type,
      ${price}::numeric,
      ${input.currency ?? 'USD'},
      'UNKNOWN',
      'DRAFT',
      ${input.totalWeightCt ?? null},
      ${input.description ?? null},
      ${input.shortDescription ?? null}
    )
    RETURNING ${VENDOR_PRODUCT_RETURNING}
  `);
  const row = inserted.rows[0];
  if (row === undefined) throw new Error('VENDOR_PRODUCT: insert returned no row');

  await writeAudit(db, {
    actorId: input.actorId,
    action: 'CREATE',
    productId: row.id,
    before: null,
    after: {
      vendor_id: vendorId,
      state: row.state,
      price_evidence: row.price_evidence,
      slug: row.slug,
      title: row.title,
    },
    requestId: input.requestId,
    reason: 'Vendor stock intake (DRAFT pending platform approval)',
  });

  return row;
}

export interface UpdateVendorProductPatch {
  readonly actorId: string;
  readonly title?: string;
  readonly subtitle?: string | null;
  readonly description?: string | null;
  readonly shortDescription?: string | null;
  /** Integer minor units. Never a float. */
  readonly priceMinor?: number;
  readonly currency?: string;
  readonly totalWeightCt?: string | null;
  readonly availability?: boolean;
  readonly requestId?: string;
}

/**
 * Update a product owned by `vendorId`.
 *
 * Returns null for "not yours" AND for "does not exist". The caller maps both
 * to 404, so a mismatched identifier reveals nothing (ADR-026).
 */
export async function updateVendorProduct(
  db: CatalogDatabase,
  vendorId: string,
  productId: string,
  patch: UpdateVendorProductPatch,
): Promise<VendorProductRow | null> {
  const beforeResult = await db.execute<VendorProductRow>(sql`
    SELECT ${VENDOR_PRODUCT_COLUMNS}
    FROM products p
    WHERE p.id = ${productId}::uuid
      AND p.vendor_id = ${vendorId}::uuid
      AND p.deleted_at IS NULL
    LIMIT 1
  `);
  const before = beforeResult.rows[0];
  if (before === undefined) return null;

  const assignments: SQL[] = [];
  if (patch.title !== undefined) assignments.push(sql`title = ${patch.title}`);
  if (patch.subtitle !== undefined) assignments.push(sql`subtitle = ${patch.subtitle}`);
  if (patch.description !== undefined) assignments.push(sql`description = ${patch.description}`);
  if (patch.shortDescription !== undefined) {
    assignments.push(sql`short_description = ${patch.shortDescription}`);
  }
  if (patch.priceMinor !== undefined) {
    assignments.push(sql`price_amount = ${minorUnitsToDecimalString(patch.priceMinor)}::numeric`);
  }
  if (patch.currency !== undefined) assignments.push(sql`currency = ${patch.currency}`);
  if (patch.totalWeightCt !== undefined) {
    assignments.push(sql`total_weight_ct = ${patch.totalWeightCt}::numeric`);
  }
  if (patch.availability !== undefined) {
    assignments.push(sql`availability = ${patch.availability}`);
  }

  // Nothing editable was supplied: return the current row without inventing a
  // version bump or an audit row that claims a change.
  if (assignments.length === 0) return before;

  assignments.push(sql`version = version + 1`);
  assignments.push(sql`updated_at = now()`);

  const updated = await db.execute<VendorProductRow>(sql`
    UPDATE products
    SET ${sql.join(assignments, sql`, `)}
    WHERE id = ${productId}::uuid
      AND vendor_id = ${vendorId}::uuid
      AND deleted_at IS NULL
    RETURNING ${VENDOR_PRODUCT_RETURNING}
  `);
  const after = updated.rows[0];
  // A concurrent delete/transfer between the read and the write is a miss,
  // not a 500, and still reveals nothing about the other owner.
  if (after === undefined) return null;

  await writeAudit(db, {
    actorId: patch.actorId,
    action: 'UPDATE',
    productId: after.id,
    before: {
      state: before.state,
      title: before.title,
      price_amount: before.price_amount,
      availability: before.availability,
    },
    after: {
      state: after.state,
      title: after.title,
      price_amount: after.price_amount,
      availability: after.availability,
    },
    requestId: patch.requestId,
    reason: 'Vendor product update',
  });

  return after;
}

export interface VendorOrderRow extends Record<string, unknown> {
  allocation_id: string;
  order_id: string;
  order_number: string;
  order_state: string;
  order_currency: string;
  subtotal: string;
  commission: string;
  vendor_payable: string;
  currency: string;
  allocation_state: string;
  allocated_at: string;
  placed_at: string | null;
  order_created_at: string;
}

export interface VendorOrderList {
  readonly items: readonly VendorOrderRow[];
  readonly total: number;
}

export interface ListVendorOrdersOptions {
  readonly limit: number;
  readonly offset: number;
}

/** Allocations for ONE vendor, joined to the order they belong to. */
export async function listVendorOrders(
  db: CatalogDatabase,
  vendorId: string,
  options: ListVendorOrdersOptions,
): Promise<VendorOrderList> {
  const limit = Math.min(Math.max(options.limit, 1), 200);
  const offset = Math.max(options.offset, 0);

  const counted = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count
    FROM order_vendor_allocations a
    WHERE a.vendor_id = ${vendorId}::uuid
  `);

  const r = await db.execute<VendorOrderRow>(sql`
    SELECT a.id AS allocation_id,
           a.order_id,
           o.order_number,
           o.state::text AS order_state,
           o.currency AS order_currency,
           a.subtotal::text AS subtotal,
           a.commission::text AS commission,
           a.vendor_payable::text AS vendor_payable,
           a.currency,
           a.state::text AS allocation_state,
           a.created_at AS allocated_at,
           o.placed_at,
           o.created_at AS order_created_at
    FROM order_vendor_allocations a
    JOIN orders o ON o.id = a.order_id
    WHERE a.vendor_id = ${vendorId}::uuid
    ORDER BY o.created_at DESC, a.id ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return {
    items: r.rows,
    total: Number(counted.rows[0]?.count ?? '0'),
  };
}

export interface VendorStatementEntry extends Record<string, unknown> {
  id: string;
  order_id: string | null;
  entry_type: string;
  amount: string;
  currency: string;
  reference: string | null;
  created_at: string;
  /** Balance after this entry, including every earlier entry for the vendor. */
  running_balance: string;
}

export interface VendorStatement {
  readonly entries: readonly VendorStatementEntry[];
  /** Net movement inside the requested window, minor-unit decimal string. */
  readonly total: string;
  readonly from: string | null;
  readonly to: string | null;
}

export interface VendorStatementRange {
  readonly from?: string;
  readonly to?: string;
}

/**
 * Ledger statement for one vendor.
 *
 * `running_balance` is cumulative over the vendor's whole ledger, so the first
 * row of a window already includes earlier history. `total` is the movement
 * inside the window only — the two answer different questions and the UI
 * labels both.
 */
export async function vendorStatement(
  db: CatalogDatabase,
  vendorId: string,
  range: VendorStatementRange = {},
): Promise<VendorStatement> {
  const r = await db.execute<VendorStatementEntry & { period_total: string }>(sql`
    WITH ledger AS (
      SELECT id, order_id, entry_type, amount, currency, reference, created_at,
             sum(amount) OVER (
               ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             )::text AS running_balance
      FROM vendor_ledger
      WHERE vendor_id = ${vendorId}::uuid
    )
    SELECT id,
           order_id,
           entry_type,
           amount::text AS amount,
           currency,
           reference,
           created_at,
           running_balance,
           sum(amount) OVER ()::text AS period_total
    FROM ledger
    WHERE created_at >= COALESCE(${range.from ?? null}::timestamptz, '-infinity'::timestamptz)
      AND created_at <  COALESCE(${range.to ?? null}::timestamptz, 'infinity'::timestamptz)
    ORDER BY id ASC
  `);
  return {
    entries: r.rows,
    total: r.rows[0]?.period_total ?? '0',
    from: range.from ?? null,
    to: range.to ?? null,
  };
}

interface AuditParams {
  readonly actorId: string;
  readonly action: 'CREATE' | 'UPDATE';
  readonly productId: string;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown>;
  readonly requestId?: string;
  readonly reason: string;
}

async function writeAudit(db: CatalogDatabase, params: AuditParams): Promise<void> {
  // `STAFF`, not `ADMIN`: a vendor member is not an administrator, and the
  // distinction must survive in the audit trail even though the column is TEXT.
  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id,
      before_state, after_state, request_id, reason
    ) VALUES (
      'STAFF', ${params.actorId}::uuid, ${params.action}, 'products',
      ${params.productId}::uuid,
      ${params.before === null ? null : JSON.stringify(params.before)}::jsonb,
      ${JSON.stringify(params.after)}::jsonb,
      ${params.requestId ?? null},
      ${params.reason}
    )
  `);
}
