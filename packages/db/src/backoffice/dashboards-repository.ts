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
    countOne(db, sql`SELECT count(*)::text AS n FROM vendor_onboarding WHERE status = 'PENDING'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM vendor_onboarding WHERE status = 'APPROVED'`),
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

/** CMS pages with their locking-workflow state and head revision id (back-office read). */
export async function listCmsPages(
  db: CatalogDatabase,
  limit = 100,
): Promise<Record<string, unknown>[]> {
  const res = await db.execute(sql`
    SELECT p.id::text AS id, p.slug, p.title, p.page_kind::text AS page_kind,
           p.status::text AS state, p.version, p.created_at::text AS created_at,
           r.id::text AS head_revision_id,
           COALESCE(prs.review_state, 'PENDING') AS review_state
    FROM pages p
    LEFT JOIN LATERAL (
      SELECT id FROM page_revisions pr
      WHERE pr.page_id = p.id
      ORDER BY pr.revision_number DESC
      LIMIT 1
    ) r ON true
    LEFT JOIN page_review_state prs ON prs.revision_id = r.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `);
  return res.rows as unknown as Record<string, unknown>[];
}

export interface BackOfficeCertificateRow {
  id: string;
  kind: string;
  gemstone_id: string | null;
  product_id: string | null;
  lab_name: string | null;
  certificate_number: string | null;
  verification_status: string;
  confidence_overall: string | null;
  source_url: string | null;
  anomaly_count: number;
  created_at: string;
}

export async function listBackOfficeCertificates(
  db: CatalogDatabase,
  limit = 100,
): Promise<BackOfficeCertificateRow[]> {
  const res = await db.execute(sql`
    SELECT c.id::text AS id, c.kind::text AS kind,
           c.gemstone_id::text AS gemstone_id, c.product_id::text AS product_id,
           c.lab_name, c.certificate_number,
           c.verification_status::text AS verification_status,
           c.confidence_overall::text AS confidence_overall,
           c.source_url,
           c.created_at::text AS created_at,
           (SELECT count(*)::int FROM certificate_anomalies ca WHERE ca.certificate_id = c.id AND ca.resolved_at IS NULL) AS anomaly_count
    FROM certificates c
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `);
  return (res.rows as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row['id']),
    kind: String(row['kind']),
    gemstone_id: row['gemstone_id'] ? String(row['gemstone_id']) : null,
    product_id: row['product_id'] ? String(row['product_id']) : null,
    lab_name: row['lab_name'] ? String(row['lab_name']) : null,
    certificate_number: row['certificate_number'] ? String(row['certificate_number']) : null,
    verification_status: String(row['verification_status']),
    confidence_overall: row['confidence_overall'] ? String(row['confidence_overall']) : null,
    source_url: row['source_url'] ? String(row['source_url']) : null,
    anomaly_count: Number(row['anomaly_count'] ?? 0),
    created_at: new Date(String(row['created_at'])).toISOString(),
  }));
}

export interface BackOfficeMigrationOverview {
  batches: Array<{
    id: string;
    batch_key: string;
    status: string;
    records_seen: number;
    records_accepted: number;
    records_quarantined: number;
    started_at: string;
    finished_at: string | null;
    notes: string | null;
  }>;
  conflicts: Array<{
    id: string;
    conflict_kind: string;
    natural_key: string;
    source_url_a: string | null;
    source_url_b: string | null;
    resolution: string;
    created_at: string;
  }>;
  derived_refs: Array<{
    id: string;
    slug: string;
    title: string;
    source_sku: string | null;
    source_sku_derived: string | null;
    sku_evidence_status: string;
    state: string;
  }>;
}

export async function getBackOfficeMigrationOverview(
  db: CatalogDatabase,
): Promise<BackOfficeMigrationOverview> {
  const [batchesRes, conflictsRes, derivedRes] = await Promise.all([
    db.execute(sql`
      SELECT id::text AS id, batch_key, status::text AS status,
             COALESCE(records_seen, 0) AS records_seen,
             COALESCE(records_accepted, 0) AS records_accepted,
             COALESCE(records_quarantined, 0) AS records_quarantined,
             COALESCE(started_at, created_at)::text AS started_at,
             finished_at::text AS finished_at, notes
      FROM import_batches
      ORDER BY created_at DESC
      LIMIT 50
    `),
    db.execute(sql`
      SELECT id::text AS id, entity_kind AS conflict_kind, entity_ref AS natural_key,
             source_url_a, source_url_b, COALESCE(resolution, 'UNRESOLVED') AS resolution,
             created_at::text AS created_at
      FROM staging_conflicts
      ORDER BY created_at DESC
      LIMIT 50
    `),
    db.execute(sql`
      SELECT id::text AS id, slug, title, source_sku, source_sku_derived,
             sku_evidence_status::text AS sku_evidence_status, state::text AS state
      FROM products
      WHERE deleted_at IS NULL
        AND (source_sku_derived IS NOT NULL OR sku_evidence_status = 'INFERRED')
      ORDER BY created_at DESC
      LIMIT 100
    `),
  ]);

  return {
    batches: (batchesRes.rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r['id']),
      batch_key: String(r['batch_key']),
      status: String(r['status']),
      records_seen: Number(r['records_seen'] ?? 0),
      records_accepted: Number(r['records_accepted'] ?? 0),
      records_quarantined: Number(r['records_quarantined'] ?? 0),
      started_at: new Date(String(r['started_at'])).toISOString(),
      finished_at: r['finished_at'] ? new Date(String(r['finished_at'])).toISOString() : null,
      notes: r['notes'] ? String(r['notes']) : null,
    })),
    conflicts: (conflictsRes.rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r['id']),
      conflict_kind: String(r['conflict_kind']),
      natural_key: String(r['natural_key']),
      source_url_a: r['source_url_a'] ? String(r['source_url_a']) : null,
      source_url_b: r['source_url_b'] ? String(r['source_url_b']) : null,
      resolution: String(r['resolution']),
      created_at: new Date(String(r['created_at'])).toISOString(),
    })),
    derived_refs: (derivedRes.rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r['id']),
      slug: String(r['slug']),
      title: String(r['title']),
      source_sku: r['source_sku'] ? String(r['source_sku']) : null,
      source_sku_derived: r['source_sku_derived'] ? String(r['source_sku_derived']) : null,
      sku_evidence_status: String(r['sku_evidence_status']),
      state: String(r['state']),
    })),
  };
}

/**
 * INV-08 Derived Reference Approval (technical_design/06 §Admin & doc 23):
 * Promotes or rejects an INFERRED derived SKU, writing an audit_logs row
 * naming the approving human actor and emitting DerivedReferenceApproved.
 */
export async function decideDerivedReference(
  db: CatalogDatabase,
  input: {
    productId: string;
    decision: 'APPROVE' | 'REJECT';
    actorSub: string;
    actorRole: string;
    reason?: string;
  },
): Promise<{ id: string; source_sku: string | null; sku_evidence_status: string; state: string }> {
  const existingRes = await db.execute(sql`
    SELECT id::text AS id, source_sku, source_sku_derived,
           sku_evidence_status::text AS sku_evidence_status, state::text AS state
    FROM products
    WHERE id = ${input.productId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `);
  if (existingRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Product for derived reference not found.');
  }
  const existing = existingRes.rows[0] as {
    id: string;
    source_sku: string | null;
    source_sku_derived: string | null;
    sku_evidence_status: string;
    state: string;
  };

  if (input.decision === 'REJECT') {
    const upd = await db.execute(sql`
      UPDATE products
      SET state = 'ARCHIVED',
          structured_extra = jsonb_set(COALESCE(structured_extra, '{}'::jsonb), '{review_state}', '"REJECTED"'::jsonb),
          version = version + 1,
          updated_at = now()
      WHERE id = ${input.productId}::uuid
      RETURNING id::text AS id, source_sku, sku_evidence_status::text AS sku_evidence_status, state::text AS state
    `);
    await db.execute(sql`
      INSERT INTO audit_logs (actor_type, action, entity_type, entity_id, before_state, after_state, reason)
      VALUES (
        'ADMIN',
        'DERIVED_REF_REJECTED',
        'product',
        ${input.productId}::uuid,
        ${JSON.stringify(existing)}::jsonb,
        ${JSON.stringify({ decision: 'REJECT', actor: input.actorSub, role: input.actorRole })}::jsonb,
        ${input.reason ?? 'Rejected inferred derived reference'}
      )
    `);
    return upd.rows[0] as { id: string; source_sku: string | null; sku_evidence_status: string; state: string };
  }

  const promotedSku = existing.source_sku ?? existing.source_sku_derived;
  if (!promotedSku) {
    throw new ContractError('UNPROCESSABLE', 'Product does not carry a derived SKU to approve.');
  }

  const upd = await db.execute(sql`
    UPDATE products
    SET source_sku = ${promotedSku},
        sku_evidence_status = 'EXTRACTED',
        structured_extra = jsonb_set(COALESCE(structured_extra, '{}'::jsonb), '{review_state}', '"APPROVED"'::jsonb),
        version = version + 1,
        updated_at = now()
    WHERE id = ${input.productId}::uuid
    RETURNING id::text AS id, source_sku, sku_evidence_status::text AS sku_evidence_status, state::text AS state
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (actor_type, action, entity_type, entity_id, before_state, after_state, reason)
    VALUES (
      'ADMIN',
      'DERIVED_REF_APPROVED',
      'product',
      ${input.productId}::uuid,
      ${JSON.stringify(existing)}::jsonb,
      ${JSON.stringify({ source_sku: promotedSku, review_state: 'APPROVED', actor: input.actorSub, role: input.actorRole })}::jsonb,
      ${input.reason ?? 'Approved derived SKU reference (INV-08)'}
    )
  `);

  await db.execute(sql`
    INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, aggregate_version, payload, status)
    VALUES (
      gen_random_uuid(),
      'DerivedReferenceApproved',
      'product',
      ${input.productId}::uuid,
      1,
      ${JSON.stringify({ product_id: input.productId, source_sku: promotedSku, approved_by: input.actorSub })}::jsonb,
      'PENDING'
    )
  `);

  return upd.rows[0] as { id: string; source_sku: string | null; sku_evidence_status: string; state: string };
}

export interface BackOfficeOperationsOverview {
  outbox: {
    pending: number;
    published: number;
    dead_letter: number;
  };
  recent_events: Array<{
    id: string;
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    status: string;
    attempts: number;
    occurred_at: string;
    published_at: string | null;
    last_error: string | null;
  }>;
  queues: Array<{
    queue: string;
    state: string;
    count: number;
  }>;
}

export async function getBackOfficeOperationsOverview(
  db: CatalogDatabase,
): Promise<BackOfficeOperationsOverview> {
  const [pendingCount, publishedCount, deadCount, eventsRes, queuesRes] = await Promise.all([
    countOne(db, sql`SELECT count(*)::text AS n FROM domain_events WHERE status = 'PENDING'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM domain_events WHERE status = 'PUBLISHED'`),
    countOne(db, sql`SELECT count(*)::text AS n FROM domain_events WHERE status = 'DEAD_LETTER'`),
    db.execute(sql`
      SELECT id::text AS id, event_type, aggregate_type, aggregate_id::text AS aggregate_id,
             status::text AS status, attempts, occurred_at::text AS occurred_at,
             published_at::text AS published_at, last_error
      FROM domain_events
      ORDER BY occurred_at DESC
      LIMIT 40
    `),
    db.execute(sql`
      SELECT queue, state::text AS state, count(*)::int AS count
      FROM jobs
      GROUP BY queue, state
      ORDER BY queue ASC, state ASC
    `),
  ]);

  return {
    outbox: {
      pending: pendingCount,
      published: publishedCount,
      dead_letter: deadCount,
    },
    recent_events: (eventsRes.rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r['id']),
      event_type: String(r['event_type']),
      aggregate_type: String(r['aggregate_type']),
      aggregate_id: String(r['aggregate_id']),
      status: String(r['status']),
      attempts: Number(r['attempts'] ?? 0),
      occurred_at: new Date(String(r['occurred_at'])).toISOString(),
      published_at: r['published_at'] ? new Date(String(r['published_at'])).toISOString() : null,
      last_error: r['last_error'] ? String(r['last_error']) : null,
    })),
    queues: (queuesRes.rows as Array<Record<string, unknown>>).map((r) => ({
      queue: String(r['queue']),
      state: String(r['state']),
      count: Number(r['count'] ?? 0),
    })),
  };
}
