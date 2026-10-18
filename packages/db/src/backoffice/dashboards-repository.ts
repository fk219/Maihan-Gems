/**
 * packages/db/src/backoffice/dashboards-repository.ts
 *
 * Back-office READ & operational queries (Phase 12 Stage B, E12.1/E12.2).
 *
 * Every query is a REAL read against the migrated catalogue — no metric is
 * invented, cached in the browser, or mocked.
 */
import { sql } from 'drizzle-orm';
import { ContractError } from '@maihan/contracts';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface CatalogueSummary {
  products_active: number;
  products_draft: number;
  products_submitted: number;
  gemstones: number;
  gemstones_with_evidenced_price: number;
  setting_designs: number;
  setting_variants: number;
  dyo_configurations: number;
  orders: number;
  refunds_pending: number;
  vendors_pending: number;
  vendors_approved: number;
  cms_pages_in_review: number;
  assets_not_ready: number;
}

export interface CatalogueProductRow {
  id: string;
  slug: string;
  sku: string;
  title: string;
  kind: string;
  state: string;
  moderation_status: string;
  vendor_id: string | null;
  vendor_name: string | null;
  rejection_reason: string | null;
  inventory_quantity: number;
  evidence_status: string;
  published_at: string | null;
  price_amount: string | null;
  price_evidence: string;
}

export interface BackOfficeOrderRow {
  id: string;
  order_number: string;
  email: string;
  state: string;
  currency: string;
  grand_total: string;
  placed_at: string | null;
}

export interface BackOfficeRefundRow {
  id: string;
  order_id: string;
  order_number: string;
  payment_id: string;
  amount: string;
  currency: string;
  reason: string;
  state: string;
  requested_at: string;
  processed_at: string | null;
}

export interface BackOfficeDiscountRow {
  id: string;
  code: string | null;
  name: string;
  type: string;
  value: string | null;
  currency: string | null;
  min_subtotal: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  state: string;
  valid_from: string;
  valid_to: string | null;
}

export interface BackOfficeAuditLogRow {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

async function countOne(db: CatalogDatabase, statement: Parameters<typeof db.execute>[0]): Promise<number> {
  const res = await db.execute(statement);
  const row = res.rows[0] as { n?: string } | undefined;
  return row?.n !== undefined ? Number(row.n) : -1;
}

export async function getCatalogueSummary(db: CatalogDatabase): Promise<CatalogueSummary> {
  const [
    productsActive,
    productsDraft,
    productsSubmitted,
    gemstones,
    evidencedGems,
    settingDesigns,
    settingVariants,
    dyoConfigurations,
    orders,
    refundsPending,
    vendorsPending,
    vendorsApproved,
    pagesInReview,
    assetsNotReady,
  ] = await Promise.all([
    countOne(db, sql`SELECT count(*)::text AS n FROM products WHERE deleted_at IS NULL AND state = 'ACTIVE'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM products WHERE deleted_at IS NULL AND state = 'DRAFT'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM products WHERE deleted_at IS NULL AND structured_extra->>'moderation_status' = 'SUBMITTED'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM gemstones WHERE deleted_at IS NULL`),
    countOne(db, sql`SELECT count(*)::text AS n FROM gemstones WHERE deleted_at IS NULL AND price_evidence IN ('OBSERVED','EXTRACTED')`),
    countOne(db, sql`SELECT count(*)::text AS n FROM settings WHERE deleted_at IS NULL`),
    countOne(db, sql`SELECT count(*)::text AS n FROM setting_variants WHERE deleted_at IS NULL`),
    countOne(db, sql`SELECT count(*)::text AS n FROM dyo_configurations`),
    countOne(db, sql`SELECT count(*)::text AS n FROM orders`),
    countOne(db, sql`SELECT count(*)::text AS n FROM refunds WHERE state IN ('REQUESTED','APPROVED')`),
    countOne(db, sql`SELECT count(*)::text AS n FROM jobs WHERE queue = 'vendors' AND payload->>'status' = 'PENDING'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM jobs WHERE queue = 'vendors' AND payload->>'status' = 'APPROVED'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM page_review_state WHERE review_state = 'IN_REVIEW'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM assets WHERE deleted_at IS NULL AND processing_state <> 'READY'`),
  ]);
  return {
    products_active: productsActive,
    products_draft: productsDraft,
    products_submitted: productsSubmitted,
    gemstones,
    gemstones_with_evidenced_price: evidencedGems,
    setting_designs: settingDesigns,
    setting_variants: settingVariants,
    dyo_configurations: dyoConfigurations,
    orders,
    refunds_pending: refundsPending,
    vendors_pending: vendorsPending,
    vendors_approved: vendorsApproved,
    cms_pages_in_review: pagesInReview,
    assets_not_ready: assetsNotReady,
  };
}

export async function listCatalogueProducts(
  db: CatalogDatabase,
  limit = 50,
): Promise<CatalogueProductRow[]> {
  const res = await db.execute(sql`
    SELECT p.id::text AS id, p.slug,
           COALESCE(p.source_sku, p.source_sku_derived, p.structured_extra->>'sku', 'MG-' || p.product_number::text) AS sku,
           p.title,
           p.kind::text AS kind, p.state::text AS state,
           p.availability,
           p.structured_extra,
           p.sku_evidence_status::text AS evidence_status,
           p.published_at::text AS published_at,
           p.price_amount::text AS price_amount,
           p.price_evidence::text AS price_evidence
    FROM products p
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `);
  return (res.rows as unknown as Record<string, unknown>[]).map((row) => {
    const extra = (row['structured_extra'] as Record<string, unknown> | null) ?? {};
    const state = String(row['state']);
    return {
      id: String(row['id']),
      slug: String(row['slug']),
      sku: String(row['sku']),
      title: String(row['title']),
      kind: String(row['kind']),
      state,
      moderation_status: String(extra['moderation_status'] ?? (state === 'ACTIVE' ? 'PUBLISHED' : state === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT')),
      vendor_id: extra['vendor_id'] ? String(extra['vendor_id']) : null,
      vendor_name: extra['vendor_name'] ? String(extra['vendor_name']) : null,
      rejection_reason: extra['rejection_reason'] ? String(extra['rejection_reason']) : null,
      inventory_quantity: Number(extra['inventory_quantity'] ?? (row['availability'] ? 1 : 0)),
      evidence_status: String(row['evidence_status']),
      published_at: row['published_at'] === null || row['published_at'] === undefined ? null : String(row['published_at']),
      price_amount: row['price_amount'] === null || row['price_amount'] === undefined ? null : String(row['price_amount']),
      price_evidence: String(row['price_evidence'] ?? 'UNKNOWN'),
    };
  });
}

export async function listBackOfficeOrders(
  db: CatalogDatabase,
  limit = 100,
): Promise<BackOfficeOrderRow[]> {
  const res = await db.execute(sql`
    SELECT o.id::text AS id, o.order_number, o.email,
           o.state::text AS state, o.currency,
           o.grand_total::text AS grand_total,
           o.placed_at::text AS placed_at
    FROM orders o
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `);
  return (res.rows as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row['id']),
    order_number: String(row['order_number']),
    email: String(row['email']),
    state: String(row['state']),
    currency: String(row['currency']),
    grand_total: String(row['grand_total']),
    placed_at: row['placed_at'] === null || row['placed_at'] === undefined ? null : String(row['placed_at']),
  }));
}

export async function listBackOfficeRefunds(
  db: CatalogDatabase,
  limit = 100,
): Promise<BackOfficeRefundRow[]> {
  const res = await db.execute(sql`
    SELECT r.id::text AS id, r.order_id::text AS order_id, o.order_number,
           r.payment_id::text AS payment_id, r.amount::text AS amount,
           r.currency, r.reason, r.state::text AS state,
           r.requested_at::text AS requested_at, r.processed_at::text AS processed_at
    FROM refunds r
    JOIN orders o ON o.id = r.order_id
    ORDER BY r.requested_at DESC
    LIMIT ${limit}
  `);
  return (res.rows as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row['id']),
    order_id: String(row['order_id']),
    order_number: String(row['order_number']),
    payment_id: String(row['payment_id']),
    amount: String(row['amount']),
    currency: String(row['currency']),
    reason: String(row['reason']),
    state: String(row['state']),
    requested_at: new Date(String(row['requested_at'])).toISOString(),
    processed_at: row['processed_at'] ? new Date(String(row['processed_at'])).toISOString() : null,
  }));
}

export async function listBackOfficeDiscounts(
  db: CatalogDatabase,
  limit = 100,
): Promise<BackOfficeDiscountRow[]> {
  const res = await db.execute(sql`
    SELECT id::text AS id, code, name, type::text AS type,
           value::text AS value, currency, min_subtotal::text AS min_subtotal,
           max_redemptions, redemption_count, state::text AS state,
           valid_from::text AS valid_from, valid_to::text AS valid_to
    FROM discounts
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return (res.rows as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row['id']),
    code: row['code'] ? String(row['code']) : null,
    name: String(row['name']),
    type: String(row['type']),
    value: row['value'] !== null && row['value'] !== undefined ? String(row['value']) : null,
    currency: row['currency'] ? String(row['currency']) : null,
    min_subtotal: row['min_subtotal'] !== null && row['min_subtotal'] !== undefined ? String(row['min_subtotal']) : null,
    max_redemptions: row['max_redemptions'] !== null && row['max_redemptions'] !== undefined ? Number(row['max_redemptions']) : null,
    redemption_count: Number(row['redemption_count'] ?? 0),
    state: String(row['state']),
    valid_from: new Date(String(row['valid_from'])).toISOString(),
    valid_to: row['valid_to'] ? new Date(String(row['valid_to'])).toISOString() : null,
  }));
}

export async function createBackOfficeDiscount(
  db: CatalogDatabase,
  input: {
    code: string;
    name: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    value?: number;
    min_subtotal?: number;
    max_redemptions?: number;
    actorSub: string;
  },
): Promise<BackOfficeDiscountRow> {
  const code = (input.code ?? '').trim().toUpperCase();
  const name = (input.name ?? '').trim();
  if (!code || code.length < 3 || !name) {
    throw new ContractError('VALIDATION_FAILED', 'Discount code and name are required.');
  }
  const value = input.value !== undefined ? Number(input.value) : null;
  if (input.type === 'PERCENTAGE' && (value === null || value <= 0 || value > 100)) {
    throw new ContractError('VALIDATION_FAILED', 'Percentage discount value must be between 1 and 100.');
  }
  if (input.type === 'FIXED_AMOUNT' && (value === null || value <= 0)) {
    throw new ContractError('VALIDATION_FAILED', 'Fixed-amount discount value must be positive.');
  }
  const res = await db.execute(sql`
    INSERT INTO discounts (
      code, name, type, value, currency, min_subtotal, max_redemptions, valid_from, state
    ) VALUES (
      ${code},
      ${name},
      ${input.type}::discount_type,
      ${value !== null ? value.toFixed(2) : null},
      'USD',
      ${input.min_subtotal !== undefined ? Number(input.min_subtotal).toFixed(2) : null},
      ${input.max_redemptions ?? null},
      now() - interval '1 minute',
      'ACTIVE'
    )
    RETURNING id::text AS id, code, name, type::text AS type,
              value::text AS value, currency, min_subtotal::text AS min_subtotal,
              max_redemptions, redemption_count, state::text AS state,
              valid_from::text AS valid_from, valid_to::text AS valid_to
  `);
  const row = res.rows[0] as Record<string, unknown>;
  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, action, entity_type, entity_id, after_state, reason
    ) VALUES (
      'ADMIN',
      'DISCOUNT_CREATED',
      'discount',
      ${String(row['id'])}::uuid,
      ${JSON.stringify({ code, name, type: input.type, value, actor: input.actorSub })}::jsonb,
      'Admin created promotional discount code'
    )
  `);
  return {
    id: String(row['id']),
    code: String(row['code']),
    name: String(row['name']),
    type: String(row['type']),
    value: row['value'] !== null && row['value'] !== undefined ? String(row['value']) : null,
    currency: row['currency'] ? String(row['currency']) : null,
    min_subtotal: row['min_subtotal'] !== null && row['min_subtotal'] !== undefined ? String(row['min_subtotal']) : null,
    max_redemptions: row['max_redemptions'] !== null && row['max_redemptions'] !== undefined ? Number(row['max_redemptions']) : null,
    redemption_count: Number(row['redemption_count'] ?? 0),
    state: String(row['state']),
    valid_from: new Date(String(row['valid_from'])).toISOString(),
    valid_to: row['valid_to'] ? new Date(String(row['valid_to'])).toISOString() : null,
  };
}

export async function listBackOfficeAuditLogs(
  db: CatalogDatabase,
  limit = 100,
): Promise<BackOfficeAuditLogRow[]> {
  const res = await db.execute(sql`
    SELECT id::text AS id, actor_type, actor_id::text AS actor_id,
           action, entity_type, entity_id::text AS entity_id,
           before_state, after_state, reason, created_at::text AS created_at
    FROM audit_logs
    ORDER BY id DESC
    LIMIT ${limit}
  `);
  return (res.rows as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row['id']),
    actor_type: String(row['actor_type']),
    actor_id: row['actor_id'] ? String(row['actor_id']) : null,
    action: String(row['action']),
    entity_type: String(row['entity_type']),
    entity_id: row['entity_id'] ? String(row['entity_id']) : null,
    before_state: (row['before_state'] as Record<string, unknown> | null) ?? null,
    after_state: (row['after_state'] as Record<string, unknown> | null) ?? null,
    reason: row['reason'] ? String(row['reason']) : null,
    created_at: new Date(String(row['created_at'])).toISOString(),
  }));
}

/** CMS pages with their locking-workflow state (back-office read). */
export async function listCmsPages(
  db: CatalogDatabase,
  limit = 100,
): Promise<Record<string, unknown>[]> {
  const res = await db.execute(sql`
    SELECT id::text AS id, slug, title, page_kind::text AS page_kind,
           status::text AS state, version, created_at::text AS created_at
    FROM pages
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return res.rows as unknown as Record<string, unknown>[];
}
