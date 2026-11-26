/**
 * packages/db/src/compat/fresh-compat-repository.ts
 *
 * READ-ONLY projections for the develop-UI compatibility surface
 * (`/api/fresh/**`, see docs/FRESH_COMPAT_LAYER.md).
 *
 * Why this module exists
 * ----------------------
 * `develop`'s console and vendor portal were built against a different API
 * service (`apps/fresh-api`) with its own schema. `main` owns the locked
 * schema (22 migrations). The compatibility routes need the handful of list and
 * aggregate reads that `main`'s existing repositories do not expose (the
 * catalogue repositories serve the storefront read models, not operator
 * consoles). Every one of them is a SELECT; this module contains no INSERT,
 * UPDATE or DELETE, and it is the ONLY place the compatibility surface touches
 * the database.
 *
 * Two rules carried from the locked architecture:
 *   1. packages/db is the only package permitted to touch the database
 *      (technical_design/03). Handlers in apps/web never hold SQL.
 *   2. Every value is a bound parameter. Identifiers and enum literals come
 *      from closed whitelists in this file, never from caller input.
 *
 * Honesty rules
 * -------------
 * A field `main` cannot answer is `null` and named in the row/aggregate's
 * `unsupported` list — never zero, never a nearby guess. Derived display
 * tokens (e.g. a variety `code`) are documented at the point of derivation.
 */

import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

/* ------------------------------------------------------------------ helpers */

/** Postgres timestamptz arrives as a Date (pg) or a string (fakes/serialised). */
function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = iso(value);
  return text.length === 0 ? null : text;
}

/** NUMERIC arrives as a string from pg; a null amount stays null, never 0. */
function money(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A count is always answerable, so an absent value is honestly 0. */
function count(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* -------------------------------------------------------------------- stats */

/**
 * Every number `main` can answer, plus explicit nulls for the concepts it does
 * not model (vendor submissions, marketing leads, a SOLD gemstone state).
 */
export interface ConsoleStats {
  readonly gemstones_total: number;
  readonly gemstones_active: number;
  /** `gemstones.state` is record_state (DRAFT|ACTIVE|ARCHIVED): no SOLD. */
  readonly gemstones_sold: null;
  readonly settings_total: number;
  readonly settings_active: number;
  readonly products_total: number;
  readonly products_active: number;
  /** `products.state` has SOLD_OUT, which is "not for sale", not "sold". */
  readonly products_sold: null;
  readonly orders_total: number;
  readonly orders_pending: number;
  readonly orders_paid: number;
  readonly revenue_total: number;
  readonly revenue_currency: string;
  readonly customers_total: number;
  readonly vendors_total: number;
  readonly vendors_active: number;
  readonly vendors_pending: number;
  /** No vendor-submission concept exists in the locked schema. */
  readonly submissions_pending: null;
  readonly submissions_total: null;
  /** No lead/marketing-contact concept exists in the locked schema. */
  readonly leads_total: null;
  readonly leads_new: null;
  readonly inventory_value: number;
  readonly configurations_total: number;
  readonly certificates_total: number;
  /** Field names above whose concept the locked schema does not model. */
  readonly unsupported: readonly string[];
}

/**
 * One statement, scalar subqueries only. Revenue is the sum of orders that
 * reached a settled state (PAID / IN_FULFILLMENT / FULFILLED); main's
 * `order_state` enum has no DELIVERED.
 */
export async function readConsoleStats(db: CatalogDatabase): Promise<ConsoleStats> {
  const result = await db.execute<Record<string, string | null>>(sql`
    SELECT
      (SELECT count(*) FROM products
        WHERE deleted_at IS NULL)::text AS products_total,
      (SELECT count(*) FROM products
        WHERE deleted_at IS NULL AND state = 'ACTIVE')::text AS products_active,
      (SELECT count(*) FROM gemstones
        WHERE deleted_at IS NULL)::text AS gemstones_total,
      (SELECT count(*) FROM gemstones
        WHERE deleted_at IS NULL AND state = 'ACTIVE')::text AS gemstones_active,
      (SELECT count(*) FROM setting_variants
        WHERE deleted_at IS NULL)::text AS settings_total,
      (SELECT count(*) FROM setting_variants
        WHERE deleted_at IS NULL AND state = 'ACTIVE')::text AS settings_active,
      (SELECT count(*) FROM orders)::text AS orders_total,
      (SELECT count(*) FROM orders
        WHERE state = 'PENDING_PAYMENT')::text AS orders_pending,
      (SELECT count(*) FROM orders
        WHERE state = 'PAID')::text AS orders_paid,
      (SELECT COALESCE(sum(grand_total), 0) FROM orders
        WHERE state IN ('PAID', 'IN_FULFILLMENT', 'FULFILLED'))::text AS revenue_total,
      (SELECT count(*) FROM customers)::text AS customers_total,
      (SELECT count(*) FROM vendors)::text AS vendors_total,
      (SELECT count(*) FROM vendors
        WHERE state = 'APPROVED')::text AS vendors_active,
      (SELECT count(*) FROM vendors
        WHERE state = 'PENDING')::text AS vendors_pending,
      (SELECT COALESCE(sum(price_amount), 0) FROM products
        WHERE deleted_at IS NULL AND state = 'ACTIVE')::text AS inventory_value,
      (SELECT count(*) FROM dyo_configurations)::text AS configurations_total,
      (SELECT count(*) FROM certificates
        WHERE deleted_at IS NULL)::text AS certificates_total
  `);
  const row = result.rows[0] ?? {};

  return {
    gemstones_total: count(row['gemstones_total']),
    gemstones_active: count(row['gemstones_active']),
    gemstones_sold: null,
    settings_total: count(row['settings_total']),
    settings_active: count(row['settings_active']),
    products_total: count(row['products_total']),
    products_active: count(row['products_active']),
    products_sold: null,
    orders_total: count(row['orders_total']),
    orders_pending: count(row['orders_pending']),
    orders_paid: count(row['orders_paid']),
    revenue_total: count(row['revenue_total']),
    revenue_currency: 'USD',
    customers_total: count(row['customers_total']),
    vendors_total: count(row['vendors_total']),
    vendors_active: count(row['vendors_active']),
    vendors_pending: count(row['vendors_pending']),
    submissions_pending: null,
    submissions_total: null,
    leads_total: null,
    leads_new: null,
    inventory_value: count(row['inventory_value']),
    configurations_total: count(row['configurations_total']),
    certificates_total: count(row['certificates_total']),
    unsupported: [
      'gemstones_sold',
      'products_sold',
      'submissions_pending',
      'submissions_total',
      'leads_total',
      'leads_new',
    ],
  };
}

/* ---------------------------------------------------------------- inventory */

/** `products.state` as the locked enum spells it. */
export const PRODUCT_STATES = [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
  'SOLD_OUT',
  'DISCONTINUED',
] as const;
export type ProductState = (typeof PRODUCT_STATES)[number];

/** `product_kind` as the locked enum spells it. */
export const PRODUCT_KINDS = [
  'CONFIGURED',
  'READY_MADE',
  'LOOSE_STONE',
  'STONE_PAIR',
  'SETTING_ONLY',
] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

/**
 * The console's inventory row.
 *
 * Field origins (all from `main`):
 *   ref            <- products.slug (main has no `ref` column; the slug is the
 *                     stable, unique public identifier)
 *   name           <- products.title
 *   variety        <- gemstone_varieties.name
 *   weight_ct      <- products.total_weight_ct, else the linked stone's weight
 *   colour/shape/origin <- the linked gemstone (NULL for a piece with no stone)
 *   vendor_code    <- vendors.slug (main identity for a vendor)
 *   table_name     <- literal 'products'
 *   primary_image  <- assets.cdn_url/source_url through asset_usages
 *   quantity       <- NULL: `products` carries `availability`, not a quantity
 *   origin_type    <- NULL: no such column in the locked schema
 */
export interface ConsoleInventoryItem {
  readonly ref: string;
  readonly name: string;
  readonly kind: string;
  readonly status: string;
  readonly price_amount: number | null;
  readonly currency: string;
  readonly weight_ct: number | null;
  readonly variety: string;
  readonly origin: string | null;
  readonly origin_type: string | null;
  readonly vendor_code: string | null;
  readonly vendor_name: string | null;
  readonly table_name: 'products';
  readonly primary_image: string | null;
  readonly created_at: string;
  readonly quantity: null;
}

export interface ConsoleInventoryPage {
  readonly items: readonly ConsoleInventoryItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface ConsoleInventoryQuery {
  readonly search?: string;
  readonly state?: ProductState;
  readonly kind?: ProductKind;
  readonly limit: number;
  readonly offset: number;
}

/**
 * The projection is shared by the admin console and the vendor portal; the
 * vendor variant adds its boundary predicate (see `readVendorInventory`).
 */
const INVENTORY_SELECT = sql`
  SELECT p.slug AS ref,
         p.title AS name,
         p.kind::text AS kind,
         p.state::text AS status,
         p.price_amount::text AS price_amount,
         p.currency,
         COALESCE(p.total_weight_ct, g.total_weight_ct)::text AS weight_ct,
         COALESCE(v.name, '') AS variety,
         o.name AS origin,
         NULL::text AS origin_type,
         vend.slug AS vendor_code,
         vend.display_name AS vendor_name,
         p.created_at,
         (SELECT COALESCE(a.cdn_url, a.source_url)
            FROM asset_usages au
            JOIN assets a ON a.id = au.asset_id
           WHERE au.entity_type = 'PRODUCT'
             AND au.entity_id = p.id
             AND a.deleted_at IS NULL
           ORDER BY au.position, a.position
           LIMIT 1) AS primary_image
    FROM products p
    LEFT JOIN gemstone_varieties v ON v.id = p.variety_id
    LEFT JOIN gemstones g ON g.id = p.gemstone_id
    LEFT JOIN gemstone_origins o ON o.id = g.origin_id
    LEFT JOIN vendors vend ON vend.id = p.vendor_id
`;

function inventoryFilters(query: ConsoleInventoryQuery): SQL[] {
  const predicates: SQL[] = [sql`p.deleted_at IS NULL`];
  const search = query.search?.trim();
  if (search !== undefined && search.length > 0) {
    const pattern = `%${search}%`;
    predicates.push(sql`(p.title ILIKE ${pattern} OR p.slug ILIKE ${pattern})`);
  }
  if (query.state !== undefined) {
    predicates.push(sql`p.state = ${query.state}::product_state`);
  }
  if (query.kind !== undefined) {
    predicates.push(sql`p.kind = ${query.kind}::product_kind`);
  }
  return predicates;
}

function inventoryRow(row: Record<string, unknown>): ConsoleInventoryItem {
  return {
    ref: String(row['ref']),
    name: String(row['name']),
    kind: String(row['kind']),
    status: String(row['status']),
    price_amount: money(row['price_amount']),
    currency: String(row['currency'] ?? 'USD'),
    weight_ct: money(row['weight_ct']),
    variety: String(row['variety'] ?? ''),
    origin: row['origin'] === null || row['origin'] === undefined ? null : String(row['origin']),
    origin_type: null,
    vendor_code:
      row['vendor_code'] === null || row['vendor_code'] === undefined
        ? null
        : String(row['vendor_code']),
    vendor_name:
      row['vendor_name'] === null || row['vendor_name'] === undefined
        ? null
        : String(row['vendor_name']),
    table_name: 'products',
    primary_image:
      row['primary_image'] === null || row['primary_image'] === undefined
        ? null
        : String(row['primary_image']),
    created_at: iso(row['created_at']),
    quantity: null,
  };
}

/** Platform-wide inventory page. Count and page are separate statements so the
 *  total stays true when `offset` is past the last row. */
export async function listConsoleInventory(
  db: CatalogDatabase,
  query: ConsoleInventoryQuery,
): Promise<ConsoleInventoryPage> {
  const limit = Math.min(Math.max(Math.trunc(query.limit), 1), 200);
  const offset = Math.max(Math.trunc(query.offset), 0);
  const where = sql.join(inventoryFilters(query), sql` AND `);

  const counted = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count FROM products p WHERE ${where}
  `);

  const page = await db.execute<Record<string, unknown>>(sql`
    ${INVENTORY_SELECT}
    WHERE ${where}
    ORDER BY p.created_at DESC, p.slug ASC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    items: page.rows.map(inventoryRow),
    total: count(counted.rows[0]?.['count']),
    limit,
    offset,
  };
}

/* ------------------------------------------------------------------- orders */

export interface ConsoleOrderRow {
  readonly order_number: string;
  readonly email: string;
  readonly status: string;
  readonly grand_total: string;
  readonly currency: string;
  readonly placed_at: string;
  readonly payment_provider: string | null;
}

export interface ConsoleOrderPage {
  readonly items: readonly ConsoleOrderRow[];
  readonly total: number;
}

/**
 * `placed_at` is written at placement by `placeOrder`; `created_at` is the
 * fallback for a row that predates that guarantee, so the console never
 * receives an unparseable instant.
 */
export async function listConsoleOrders(
  db: CatalogDatabase,
  options: { limit: number; offset: number },
): Promise<ConsoleOrderPage> {
  const limit = Math.min(Math.max(Math.trunc(options.limit), 1), 500);
  const offset = Math.max(Math.trunc(options.offset), 0);

  const counted = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count FROM orders
  `);

  const page = await db.execute<Record<string, unknown>>(sql`
    SELECT o.order_number,
           o.email,
           o.state::text AS status,
           o.grand_total::text AS grand_total,
           o.currency,
           COALESCE(o.placed_at, o.created_at) AS placed_at,
           (SELECT pay.provider
              FROM payments pay
             WHERE pay.order_id = o.id
             ORDER BY pay.created_at DESC
             LIMIT 1) AS payment_provider
      FROM orders o
     ORDER BY COALESCE(o.placed_at, o.created_at) DESC, o.order_number DESC
     LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    total: count(counted.rows[0]?.['count']),
    items: page.rows.map((row) => ({
      order_number: String(row['order_number']),
      email: String(row['email']),
      status: String(row['status']),
      grand_total: String(row['grand_total']),
      currency: String(row['currency'] ?? 'USD'),
      placed_at: iso(row['placed_at']),
      payment_provider:
        row['payment_provider'] === null || row['payment_provider'] === undefined
          ? null
          : String(row['payment_provider']),
    })),
  };
}

/* ------------------------------------------------------------------ vendors */

export interface ConsoleVendorRow {
  readonly code: string;
  readonly name: string;
  readonly country: string | null;
  readonly status: string;
  readonly email: string;
  /** No contact-person column exists in the locked schema. */
  readonly contact_name: null;
  /** `vendors.state` IS the onboarding decision in main; there is no second record. */
  readonly onboarding_status: string;
  /** Count of the vendor's ACTIVE products (the sellable unit in main). */
  readonly live_gems: number;
  readonly inventory_value: number;
  /** Released allocations only; a PENDING allocation is not yet revenue. */
  readonly revenue: number;
  /** No vendor-submission concept exists in the locked schema. */
  readonly total_submissions: null;
}

export async function listConsoleVendors(db: CatalogDatabase): Promise<ConsoleVendorRow[]> {
  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT v.slug AS code,
           v.display_name AS name,
           v.country,
           v.state::text AS status,
           v.email,
           v.state::text AS onboarding_status,
           (SELECT count(*) FROM products p
             WHERE p.vendor_id = v.id
               AND p.deleted_at IS NULL
               AND p.state = 'ACTIVE')::text AS live_gems,
           (SELECT COALESCE(sum(p.price_amount), 0) FROM products p
             WHERE p.vendor_id = v.id
               AND p.deleted_at IS NULL
               AND p.state = 'ACTIVE')::text AS inventory_value,
           (SELECT COALESCE(sum(a.vendor_payable), 0)
              FROM order_vendor_allocations a
             WHERE a.vendor_id = v.id
               AND a.state = 'RELEASED')::text AS revenue
      FROM vendors v
     ORDER BY v.created_at ASC, v.slug ASC
  `);

  return result.rows.map((row) => ({
    code: String(row['code']),
    name: String(row['name']),
    country: row['country'] === null || row['country'] === undefined ? null : String(row['country']),
    status: String(row['status']),
    email: String(row['email']),
    contact_name: null,
    onboarding_status: String(row['onboarding_status']),
    live_gems: count(row['live_gems']),
    inventory_value: count(row['inventory_value']),
    revenue: count(row['revenue']),
    total_submissions: null,
  }));
}

/* -------------------------------------------------------------------- audit */

export interface ConsoleAuditRow {
  readonly id: string;
  readonly actor_kind: string;
  readonly action: string;
  readonly entity_kind: string;
  readonly entity_id: string | null;
  readonly after: unknown;
  readonly created_at: string;
}

/** `audit_logs` is append-only; this is a bounded newest-first page. */
export async function listConsoleAudit(
  db: CatalogDatabase,
  limit: number,
): Promise<ConsoleAuditRow[]> {
  const bounded = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT id::text AS id,
           actor_type AS actor_kind,
           action,
           entity_type AS entity_kind,
           entity_id::text AS entity_id,
           after_state AS after,
           created_at
      FROM audit_logs
     ORDER BY created_at DESC, id DESC
     LIMIT ${bounded}
  `);

  return result.rows.map((row) => ({
    id: String(row['id']),
    actor_kind: String(row['actor_kind']),
    action: String(row['action']),
    entity_kind: String(row['entity_kind']),
    entity_id: row['entity_id'] === null || row['entity_id'] === undefined
      ? null
      : String(row['entity_id']),
    after: row['after'] ?? null,
    created_at: iso(row['created_at']),
  }));
}

/* ---------------------------------------------------------------- discounts */

export interface ConsoleDiscountRow {
  readonly id: string;
  readonly code: string | null;
  /** PERCENTAGE -> PERCENT, FIXED_AMOUNT -> FIXED; anything else verbatim. */
  readonly kind: string;
  readonly value: string | null;
  readonly min_subtotal: string | null;
  readonly starts_at: string;
  readonly ends_at: string | null;
  readonly usage_limit: number | null;
  readonly used_count: number;
  readonly active: boolean;
  readonly created_at: string;
}

export async function listConsoleDiscounts(db: CatalogDatabase): Promise<ConsoleDiscountRow[]> {
  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT id::text AS id,
           code,
           type::text AS type,
           value::text AS value,
           min_subtotal::text AS min_subtotal,
           valid_from AS starts_at,
           valid_to AS ends_at,
           max_redemptions AS usage_limit,
           redemption_count AS used_count,
           state::text AS state,
           created_at
      FROM discounts
     ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map((row) => ({
    id: String(row['id']),
    code: row['code'] === null || row['code'] === undefined ? null : String(row['code']),
    kind: discountKind(String(row['type'])),
    value: row['value'] === null || row['value'] === undefined ? null : String(row['value']),
    min_subtotal:
      row['min_subtotal'] === null || row['min_subtotal'] === undefined
        ? null
        : String(row['min_subtotal']),
    starts_at: iso(row['starts_at']),
    ends_at: isoOrNull(row['ends_at']),
    usage_limit:
      row['usage_limit'] === null || row['usage_limit'] === undefined
        ? null
        : Number(row['usage_limit']),
    used_count: count(row['used_count']),
    active: String(row['state']) === 'ACTIVE',
    created_at: iso(row['created_at']),
  }));
}

/**
 * The console knows PERCENT and FIXED. `main` also has FREE_SHIPPING,
 * FINANCING and PROTECTION_PLAN; those are passed through verbatim rather than
 * flattened into a discount the console would then price incorrectly.
 */
function discountKind(type: string): string {
  if (type === 'PERCENTAGE') return 'PERCENT';
  if (type === 'FIXED_AMOUNT') return 'FIXED';
  return type;
}

/* ------------------------------------------------------- vendor inventory */

export interface VendorInventoryStats {
  readonly total_items: number;
  readonly live_items: number;
  readonly sold_items: number;
  readonly hidden_items: number;
  readonly total_value: number;
  readonly currency: string;
}

export interface VendorInventoryPage {
  readonly items: readonly ConsoleInventoryItem[];
  readonly stats: VendorInventoryStats;
}

/**
 * The vendor boundary is a required argument; there is no overload without it
 * (ADR-026). Items are the same projection the admin console sees, so a field
 * means the same thing on both surfaces.
 */
export async function readVendorInventory(
  db: CatalogDatabase,
  vendorId: string,
): Promise<VendorInventoryPage> {
  const items = await db.execute<Record<string, unknown>>(sql`
    ${INVENTORY_SELECT}
     WHERE p.deleted_at IS NULL
       AND p.vendor_id = ${vendorId}::uuid
     ORDER BY p.created_at DESC, p.slug ASC
  `);

  const totals = await db.execute<Record<string, unknown>>(sql`
    SELECT count(*)::text AS total_items,
           count(*) FILTER (WHERE p.state = 'ACTIVE')::text AS live_items,
           count(*) FILTER (WHERE p.state = 'SOLD_OUT')::text AS sold_items,
           count(*) FILTER (WHERE p.state = 'DRAFT')::text AS hidden_items,
           COALESCE(sum(p.price_amount) FILTER (WHERE p.state = 'ACTIVE'), 0)::text AS total_value,
           COALESCE(min(p.currency), 'USD') AS currency
      FROM products p
     WHERE p.deleted_at IS NULL
       AND p.vendor_id = ${vendorId}::uuid
  `);
  const row = totals.rows[0] ?? {};

  return {
    items: items.rows.map(inventoryRow),
    stats: {
      total_items: count(row['total_items']),
      live_items: count(row['live_items']),
      sold_items: count(row['sold_items']),
      hidden_items: count(row['hidden_items']),
      total_value: count(row['total_value']),
      currency: String(row['currency'] ?? 'USD'),
    },
  };
}

/* ------------------------------------------------------- vendor analytics */

export interface ConsoleVendorAnalytics {
  readonly totals: { readonly revenue: number; readonly units: null; readonly orders: number };
  readonly series: ReadonlyArray<{
    readonly day: string;
    readonly revenue: number;
    readonly units: null;
    readonly orders: number;
  }>;
  /** No product-level attribution exists on `order_vendor_allocations`. */
  readonly top_items: readonly [];
  /** Payments are per order, not per vendor; attributing them would overstate. */
  readonly payments: readonly [];
  readonly ledger: {
    readonly balance: string;
    readonly entry_count: number;
    readonly by_type: ReadonlyArray<{ readonly entry_type: string; readonly amount: string }>;
  };
  readonly currency: string;
  readonly unsupported: readonly string[];
}

/**
 * Vendor sales, derived from the two real money tables:
 *   - `order_vendor_allocations` is per-vendor money for one order;
 *   - `vendor_ledger` is the append-only movement ledger.
 * Revenue counts RELEASED allocations only. A PENDING allocation is money the
 * platform has not released, so reporting it as revenue would be a claim the
 * data does not support.
 */
export async function readVendorAnalytics(
  db: CatalogDatabase,
  vendorId: string,
): Promise<ConsoleVendorAnalytics> {
  const totals = await db.execute<Record<string, unknown>>(sql`
    SELECT COALESCE(sum(a.vendor_payable) FILTER (WHERE a.state = 'RELEASED'), 0)::text AS revenue,
           count(DISTINCT a.order_id) FILTER (WHERE a.state <> 'CANCELLED')::text AS orders,
           COALESCE(min(a.currency), 'USD') AS currency
      FROM order_vendor_allocations a
     WHERE a.vendor_id = ${vendorId}::uuid
  `);
  const totalRow = totals.rows[0] ?? {};

  const series = await db.execute<Record<string, unknown>>(sql`
    SELECT to_char(date_trunc('day', a.created_at), 'YYYY-MM-DD') AS day,
           COALESCE(sum(a.vendor_payable) FILTER (WHERE a.state = 'RELEASED'), 0)::text AS revenue,
           count(DISTINCT a.order_id)::text AS orders
      FROM order_vendor_allocations a
     WHERE a.vendor_id = ${vendorId}::uuid
       AND a.created_at >= now() - interval '30 days'
     GROUP BY 1
     ORDER BY 1
  `);

  const ledger = await db.execute<Record<string, unknown>>(sql`
    SELECT COALESCE(sum(l.amount), 0)::text AS balance,
           count(*)::text AS entry_count
      FROM vendor_ledger l
     WHERE l.vendor_id = ${vendorId}::uuid
  `);
  const ledgerRow = ledger.rows[0] ?? {};

  const byType = await db.execute<Record<string, unknown>>(sql`
    SELECT l.entry_type,
           COALESCE(sum(l.amount), 0)::text AS amount
      FROM vendor_ledger l
     WHERE l.vendor_id = ${vendorId}::uuid
     GROUP BY l.entry_type
     ORDER BY l.entry_type
  `);

  return {
    totals: {
      revenue: count(totalRow['revenue']),
      units: null,
      orders: count(totalRow['orders']),
    },
    series: series.rows.map((row) => ({
      day: String(row['day']),
      revenue: count(row['revenue']),
      units: null,
      orders: count(row['orders']),
    })),
    top_items: [],
    payments: [],
    ledger: {
      balance: String(ledgerRow['balance'] ?? '0'),
      entry_count: count(ledgerRow['entry_count']),
      by_type: byType.rows.map((row) => ({
        entry_type: String(row['entry_type']),
        amount: String(row['amount'] ?? '0'),
      })),
    },
    currency: String(totalRow['currency'] ?? 'USD'),
    unsupported: ['units', 'top_items', 'payments'],
  };
}

/* ---------------------------------------------------------------- varieties */

export interface ConsoleVarietyRow {
  /**
   * A DISPLAY token derived from `gemstone_varieties.slug`
   * (`slug.toUpperCase()`). The locked schema has no variety `code` column;
   * the slug is the stored fact and this is letter-case only.
   */
  readonly code: string;
  readonly slug: string;
  readonly name: string;
  /** `gemstone_species.code` — main's single taxonomy level above variety. */
  readonly species: string | null;
  /** Alias of `species`: develop modelled family AND species; main has one. */
  readonly family: string | null;
  readonly family_name: string | null;
  readonly stones: number;
}

/**
 * ACTIVE varieties only (`state = 'ACTIVE'`, not soft-deleted). `stones` counts
 * non-archived gemstones of that variety.
 */
export async function listActiveVarieties(db: CatalogDatabase): Promise<ConsoleVarietyRow[]> {
  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT v.slug,
           v.name,
           v.display_name,
           sp.code AS species_code,
           sp.name AS species_name,
           (SELECT count(*) FROM gemstones g
             WHERE g.variety_id = v.id
               AND g.deleted_at IS NULL
               AND g.state <> 'ARCHIVED')::text AS stones
      FROM gemstone_varieties v
      LEFT JOIN gemstone_species sp ON sp.id = v.species_id
     WHERE v.state = 'ACTIVE'
       AND v.deleted_at IS NULL
     ORDER BY v.name ASC, v.slug ASC
  `);

  return result.rows.map((row) => {
    const slug = String(row['slug']);
    const species = row['species_code'] === null || row['species_code'] === undefined
      ? null
      : String(row['species_code']);
    return {
      code: slug.toUpperCase(),
      slug,
      name: String(row['display_name'] ?? row['name'] ?? slug),
      species,
      family: species,
      family_name:
        row['species_name'] === null || row['species_name'] === undefined
          ? null
          : String(row['species_name']),
      stones: count(row['stones']),
    };
  });
}

/* ----------------------------------------------------------- vendor lookup */

/**
 * Resolve the `{code}` path segment of `/vendors/{code}/**`.
 *
 * develop used `V-{CC}-{NNN}` codes from a different schema. `main` identifies
 * a vendor by UUID or by `slug`, so a segment is accepted when it is the slug
 * (exact, then case-insensitive) or the vendor's UUID. Returns null for
 * anything else, so the caller answers 404 without leaking existence.
 */
export async function resolveVendorSegment(
  db: CatalogDatabase,
  segment: string,
): Promise<{ id: string; slug: string; display_name: string; state: string } | null> {
  const raw = segment.trim();
  if (raw.length === 0) return null;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const result = uuidPattern.test(raw)
    ? await db.execute<Record<string, unknown>>(sql`
        SELECT id::text AS id, slug, display_name, state::text AS state
          FROM vendors
         WHERE id = ${raw}::uuid
         LIMIT 1
      `)
    : await db.execute<Record<string, unknown>>(sql`
        SELECT id::text AS id, slug, display_name, state::text AS state
          FROM vendors
         WHERE lower(slug) = lower(${raw})
         LIMIT 1
      `);

  const row = result.rows[0];
  if (row === undefined) return null;
  return {
    id: String(row['id']),
    slug: String(row['slug']),
    display_name: String(row['display_name']),
    state: String(row['state']),
  };
}
