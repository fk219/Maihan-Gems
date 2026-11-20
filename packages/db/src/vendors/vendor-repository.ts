/**
 * packages/db/src/vendors/vendor-repository.ts
 *
 * ADR-026 — vendor persistence and the money ledger.
 *
 * Rules enforced here, not in callers:
 *   - A state change must be legal per the pure transition table; the database
 *     CHECK is the last line, the domain table is the authority.
 *   - Every state change writes `audit_logs` with before/after state.
 *   - Ledger rows are append-only. There is no update or delete function.
 *   - A terminated vendor cannot be approved again.
 */
import { sql } from 'drizzle-orm';
import {
  assertVendorTransition,
  type VendorState,
} from '@maihan/domain';
import type { CatalogDatabase } from '../catalog/executor.js';

export type VendorMemberRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface VendorRow extends Record<string, unknown> {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  email: string;
  country: string | null;
  state: VendorState;
  commission_bps: number;
  payout_currency: string;
  approved_at: string | null;
  approved_by: string | null;
}

const VENDOR_COLUMNS = sql`
  id, slug, display_name, legal_name, email, country, state,
  commission_bps, payout_currency, approved_at, approved_by
`;

export interface CreateVendorParams {
  readonly slug: string;
  readonly displayName: string;
  readonly legalName?: string | null;
  readonly email: string;
  readonly country?: string | null;
  readonly commissionBps?: number;
  readonly payoutCurrency?: string;
}

export async function createVendor(
  db: CatalogDatabase,
  params: CreateVendorParams,
): Promise<VendorRow> {
  const r = await db.execute<VendorRow>(sql`
    INSERT INTO vendors (slug, display_name, legal_name, email, country,
                         commission_bps, payout_currency)
    VALUES (${params.slug}, ${params.displayName}, ${params.legalName ?? null},
            ${params.email}, ${params.country ?? null},
            ${params.commissionBps ?? 1500}, ${params.payoutCurrency ?? 'USD'})
    RETURNING ${VENDOR_COLUMNS}
  `);
  const row = r.rows[0];
  if (row === undefined) throw new Error('VENDOR: insert returned no row');
  return row;
}

export async function findVendorBySlug(
  db: CatalogDatabase,
  slug: string,
): Promise<VendorRow | null> {
  const r = await db.execute<VendorRow>(sql`
    SELECT ${VENDOR_COLUMNS} FROM vendors WHERE slug = ${slug}
  `);
  return r.rows[0] ?? null;
}

export async function findVendorById(
  db: CatalogDatabase,
  id: string,
): Promise<VendorRow | null> {
  const r = await db.execute<VendorRow>(sql`
    SELECT ${VENDOR_COLUMNS} FROM vendors WHERE id = ${id}
  `);
  return r.rows[0] ?? null;
}

export async function listVendors(
  db: CatalogDatabase,
  options: { state?: VendorState; limit: number; offset: number },
): Promise<VendorRow[]> {
  const limit = Math.min(Math.max(options.limit, 1), 200);
  const offset = Math.max(options.offset, 0);
  const r =
    options.state === undefined
      ? await db.execute<VendorRow>(sql`
          SELECT ${VENDOR_COLUMNS} FROM vendors
          ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}
        `)
      : await db.execute<VendorRow>(sql`
          SELECT ${VENDOR_COLUMNS} FROM vendors
          WHERE state = ${options.state}
          ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}
        `);
  return r.rows;
}

export interface VendorTransitionParams {
  readonly vendorId: string;
  readonly to: VendorState;
  readonly actorId: string;
  readonly reason: string;
  readonly requestId?: string;
}

export async function transitionVendor(
  db: CatalogDatabase,
  params: VendorTransitionParams,
): Promise<VendorRow> {
  const current = await db.execute<VendorRow>(sql`
    SELECT ${VENDOR_COLUMNS} FROM vendors WHERE id = ${params.vendorId} FOR UPDATE
  `);
  const before = current.rows[0];
  if (before === undefined) throw new Error('VENDOR: not found');

  // Legal-transition check uses the pure table; the throw is a domain error.
  assertVendorTransition(before.state, params.to);

  const updated = await db.execute<VendorRow>(sql`
    UPDATE vendors
    SET state = ${params.to},
        approved_at = ${params.to === 'APPROVED' ? sql`now()` : sql`approved_at`},
        approved_by = ${params.to === 'APPROVED' ? sql`${params.actorId}::uuid` : sql`approved_by`},
        updated_at = now()
    WHERE id = ${params.vendorId}
    RETURNING ${VENDOR_COLUMNS}
  `);
  const after = updated.rows[0];
  if (after === undefined) throw new Error('VENDOR: update returned no row');

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id,
      before_state, after_state, request_id, reason
    ) VALUES (
      'ADMIN', ${params.actorId}::uuid, 'UPDATE', 'vendors', ${params.vendorId}::uuid,
      ${JSON.stringify({ state: before.state })}::jsonb,
      ${JSON.stringify({ state: after.state })}::jsonb,
      ${params.requestId ?? null}, ${params.reason}
    )
  `);

  return after;
}

export async function addVendorMember(
  db: CatalogDatabase,
  params: { vendorId: string; userId: string; role?: VendorMemberRole },
): Promise<void> {
  await db.execute(sql`
    INSERT INTO vendor_members (vendor_id, user_id, role)
    VALUES (${params.vendorId}, ${params.userId}, ${params.role ?? 'STAFF'})
    ON CONFLICT (vendor_id, user_id) DO UPDATE SET role = EXCLUDED.role
  `);
}

export async function findVendorsForUser(
  db: CatalogDatabase,
  userId: string,
): Promise<Array<{ vendor: VendorRow; role: VendorMemberRole }>> {
  const r = await db.execute<VendorRow & { member_role: VendorMemberRole }>(sql`
    SELECT v.id, v.slug, v.display_name, v.legal_name, v.email, v.country, v.state,
           v.commission_bps, v.payout_currency, v.approved_at, v.approved_by,
           m.role AS member_role
    FROM vendor_members m
    JOIN vendors v ON v.id = m.vendor_id
    WHERE m.user_id = ${userId}
    ORDER BY v.created_at ASC
  `);
  return r.rows.map((row) => ({
    vendor: row,
    role: row.member_role,
  }));
}

/** Assign an existing product to a vendor. Null is never accepted. */
export async function assignProductVendor(
  db: CatalogDatabase,
  params: { productId: string; vendorId: string; actorId: string; requestId?: string },
): Promise<void> {
  const before = await db.execute<{ vendor_id: string | null }>(sql`
    SELECT vendor_id FROM products WHERE id = ${params.productId} FOR UPDATE
  `);
  const row = before.rows[0];
  if (row === undefined) throw new Error('PRODUCT: not found');

  await db.execute(sql`
    UPDATE products SET vendor_id = ${params.vendorId}
    WHERE id = ${params.productId}
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id,
      before_state, after_state, request_id, reason
    ) VALUES (
      'ADMIN', ${params.actorId}::uuid, 'UPDATE', 'products', ${params.productId}::uuid,
      ${JSON.stringify({ vendor_id: row.vendor_id })}::jsonb,
      ${JSON.stringify({ vendor_id: params.vendorId })}::jsonb,
      ${params.requestId ?? null}, 'Product vendor assignment'
    )
  `);
}

export type LedgerEntryType = 'SALE' | 'COMMISSION' | 'REFUND' | 'PAYOUT' | 'ADJUSTMENT';

/** Append-only. There is deliberately no update or delete counterpart. */
export async function appendLedgerEntry(
  db: CatalogDatabase,
  params: {
    vendorId: string;
    orderId?: string | null;
    entryType: LedgerEntryType;
    /** Signed minor-unit amount as a decimal string, e.g. '-1500'. */
    amount: string;
    currency?: string;
    reference?: string | null;
  },
): Promise<void> {
  await db.execute(sql`
    INSERT INTO vendor_ledger (vendor_id, order_id, entry_type, amount, currency, reference)
    VALUES (${params.vendorId}, ${params.orderId ?? null}::uuid, ${params.entryType},
            ${params.amount}::numeric, ${params.currency ?? 'USD'}, ${params.reference ?? null})
  `);
}

export async function vendorBalance(
  db: CatalogDatabase,
  vendorId: string,
): Promise<string> {
  const r = await db.execute<{ balance: string | null }>(sql`
    SELECT COALESCE(sum(amount), 0)::text AS balance
    FROM vendor_ledger WHERE vendor_id = ${vendorId}
  `);
  return r.rows[0]?.balance ?? '0';
}
