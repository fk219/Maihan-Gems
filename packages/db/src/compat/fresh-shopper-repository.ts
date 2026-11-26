/**
 * packages/db/src/compat/fresh-shopper-repository.ts
 *
 * The shopper-facing half of the develop-UI compatibility surface.
 *
 * develop's storefront, checkout, account and concierge call `/api/fresh/*`.
 * The console/vendor half of that surface is read-only (`fresh-compat-
 * repository.ts`); this file adds exactly the reads and the four writes the
 * shopper flows need:
 *
 *   - provision a `customers` row for a signed-in `users` row (the
 *     `customers.identity_user_id` column exists for precisely this link);
 *   - read a cart's owner without touching the cart (authorisation first);
 *   - resolve a public product reference to a purchasable product id;
 *   - list gemstones and setting designs in the shape develop reads;
 *   - read one customer's orders, and one order inside that customer boundary;
 *   - record newsletter consent and a customer request.
 *
 * Every statement is composed with Drizzle's `sql` template: every value is a
 * bound parameter. The only literal fragments are fixed identifiers, enum
 * literals and selected column lists written in this file.
 *
 * No statement writes price, inventory, order, payment, certificate or
 * permission state. The two writes that exist (`newsletter_subscriptions`,
 * `customer_requests`) are new records the locked schema did not model; they
 * are created by migration 0023.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import { ContractError } from '@maihan/contracts';

/* ------------------------------------------------------------------ types */

export interface CompatCustomerRow {
  readonly id: string;
  readonly email: string;
  readonly first_name: string | null;
  readonly last_name: string | null;
  readonly phone: string | null;
}

export interface CartOwnershipRow {
  readonly id: string;
  readonly cart_token: string;
  readonly customer_id: string | null;
  readonly state: string;
  readonly expires_at: Date | string;
}

export interface PurchasableProductRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly kind: string;
  readonly price_amount: string | null;
  readonly currency: string;
  readonly availability: boolean;
  readonly state: string;
}

export interface CompatGemstoneRow {
  readonly ref: string;
  readonly slug: string;
  readonly name: string;
  readonly kind: 'SINGLE' | 'PAIR';
  readonly variety: string | null;
  readonly variety_code: string | null;
  readonly family_code: string | null;
  readonly colour: string | null;
  readonly colour_slug: string | null;
  readonly origin: string | null;
  readonly shape: string | null;
  readonly clarity: string | null;
  readonly treatment: string | null;
  readonly weight_ct: string | null;
  readonly total_weight_ct: string | null;
  readonly price_amount: string | null;
  readonly currency: string;
  readonly status: string;
  readonly origin_type: string | null;
  readonly description: string | null;
  readonly primary_image: string | null;
}

export interface CompatSettingRow {
  readonly ref: string;
  readonly sku: string;
  readonly design_code: string;
  readonly name: string;
  readonly jewellery_type: string;
  readonly style: string | null;
  readonly metal: string;
  readonly metal_name: string | null;
  readonly min_ct: string | null;
  readonly max_ct: string | null;
  readonly compatible_shapes: readonly string[];
  readonly price_amount: string | null;
  readonly currency: string;
  readonly description: string | null;
}

export interface CompatOrderSummaryRow {
  readonly order_number: string;
  readonly status: string;
  readonly currency: string;
  readonly grand_total: string;
  readonly placed_at: string;
  readonly item_count: number;
}

export interface CompatOrderItemRow {
  readonly description: string;
  readonly code_snapshot: string;
  readonly quantity: number;
  readonly unit_price: string;
  readonly line_total: string;
}

export interface CompatOrderEventRow {
  readonly event: string;
  readonly created_at: string;
}

export interface CompatOrderDetail {
  readonly id: string;
  readonly order_number: string;
  readonly customer_id: string | null;
  readonly email: string;
  readonly status: string;
  readonly currency: string;
  readonly subtotal: string;
  readonly tax: string;
  readonly shipping: string;
  readonly discount: string;
  readonly grand_total: string;
  readonly shipping_address: unknown;
  readonly customer_note: string | null;
  readonly placed_at: string | null;
  readonly paid_at: string | null;
  readonly items: readonly CompatOrderItemRow[];
  readonly events: readonly CompatOrderEventRow[];
}

export interface NewsletterSubscriptionRow {
  readonly id: string;
  readonly email: string;
  readonly consent_at: string;
}

export interface CustomerRequestRow {
  readonly id: string;
  readonly created_at: string;
}

/* ----------------------------------------------------------------- helpers */

function toIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const out = String(value);
  return out.length === 0 ? null : out;
}

/**
 * Bind an unknown row shape to a plain record before reading properties.
 * `CatalogDatabase.execute` is typed as `Record<string, unknown>`; every
 * projection below names its columns, so the cast is local and narrow.
 */
function record(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

/* --------------------------------------------------------------- customers */

async function ensureCustomerProfile(
  db: CatalogDatabase,
  customerId: string,
): Promise<void> {
  await db.execute(sql`
    INSERT INTO customer_profiles (customer_id)
    VALUES (${customerId})
    ON CONFLICT (customer_id) DO NOTHING
  `);
}

function mapCustomer(value: unknown): CompatCustomerRow {
  const row = record(value);
  return {
    id: String(row['id']),
    email: String(row['email'] ?? ''),
    first_name: text(row['first_name']),
    last_name: text(row['last_name']),
    phone: text(row['phone']),
  };
}

/**
 * Resolve the commerce `customers` row for an identity `users` row.
 *
 * `customers.identity_user_id` is the designed link (migration 0009 comments it
 * as the managed-auth subject). A guest checkout can create a customer row with
 * the same email and a NULL identity: the first signed-in user who owns that
 * login email adopts it, which is exactly the ownership test main's login
 * already applies. An already-linked row that belongs to a DIFFERENT identity
 * is a refusal, never a silent read of someone else's profile.
 *
 * The profile row is provisioned lazily; this is idempotent (`ON CONFLICT DO
 * NOTHING`) and creates no commerce state.
 */
export async function ensureCustomerForIdentity(
  db: CatalogDatabase,
  input: { readonly userId: string; readonly email: string },
): Promise<CompatCustomerRow> {
  const linked = await db.execute(sql`
    SELECT id, email::text AS email, first_name, last_name, phone
    FROM customers
    WHERE identity_user_id = ${input.userId}
      AND deleted_at IS NULL
    LIMIT 1
  `);
  if (linked.rows.length > 0) {
    const row = mapCustomer(linked.rows[0]);
    await ensureCustomerProfile(db, row.id);
    return row;
  }

  const byEmail = await db.execute(sql`
    SELECT id, email::text AS email, first_name, last_name, phone, identity_user_id
    FROM customers
    WHERE email = ${input.email}
      AND deleted_at IS NULL
    LIMIT 1
  `);
  if (byEmail.rows.length > 0) {
    const raw = record(byEmail.rows[0]);
    const owner = text(raw['identity_user_id']);
    if (owner !== null && owner !== input.userId) {
      throw new ContractError('FORBIDDEN', 'That customer record belongs to another identity.');
    }
    const id = String(raw['id']);
    if (owner === null) {
      await db.execute(sql`
        UPDATE customers
        SET identity_user_id = ${input.userId}, updated_at = now()
        WHERE id = ${id}
          AND identity_user_id IS NULL
      `);
    }
    await ensureCustomerProfile(db, id);
    return mapCustomer(byEmail.rows[0]);
  }

  const created = await db.execute(sql`
    INSERT INTO customers (identity_user_id, email)
    VALUES (${input.userId}, ${input.email})
    RETURNING id, email::text AS email, first_name, last_name, phone
  `);
  const row = mapCustomer(created.rows[0]);
  await ensureCustomerProfile(db, row.id);
  return row;
}

/* ------------------------------------------------------------------- carts */

/**
 * Read the cart's owner without touching the cart. Authorisation must run
 * before `getCartByToken`, because that repository re-prices and writes the
 * advisory snapshot on read.
 */
export async function findCartOwnership(
  db: CatalogDatabase,
  cartToken: string,
): Promise<CartOwnershipRow | null> {
  const res = await db.execute(sql`
    SELECT id, cart_token, customer_id, state::text AS state, expires_at
    FROM carts
    WHERE cart_token = ${cartToken}
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const row = record(res.rows[0]);
  return {
    id: String(row['id']),
    cart_token: String(row['cart_token']),
    customer_id: text(row['customer_id']),
    state: String(row['state'] ?? 'ACTIVE'),
    expires_at: (row['expires_at'] as Date | string) ?? new Date(0),
  };
}

/** The newest ACTIVE, unexpired cart for a signed-in customer. */
export async function findActiveCartTokenForCustomer(
  db: CatalogDatabase,
  customerId: string,
): Promise<string | null> {
  const res = await db.execute(sql`
    SELECT cart_token
    FROM carts
    WHERE customer_id = ${customerId}
      AND state = 'ACTIVE'
      AND expires_at > now()
    ORDER BY updated_at DESC
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  return text(record(res.rows[0])['cart_token']);
}

/* ---------------------------------------------------------------- products */

/**
 * Resolve a public reference to a product main can sell.
 *
 * develop's cart line carries `ref`, which its catalogue kept as the gemstone
 * reference or a product ref. Main publishes `products.slug` and keeps the
 * observed source SKU and the gemstone reference on the joined rows, so all
 * three resolve here. A non-purchasable product is returned with its real
 * state/availability so the handler can refuse honestly.
 */
export async function resolvePurchasableProductRef(
  db: CatalogDatabase,
  ref: string,
): Promise<PurchasableProductRow | null> {
  const res = await db.execute(sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      p.kind::text AS kind,
      p.price_amount::text AS price_amount,
      p.currency::text AS currency,
      p.availability,
      p.state::text AS state
    FROM products p
    LEFT JOIN gemstones g
      ON g.id = p.gemstone_id OR g.id = p.gemstone_pair_id
    LEFT JOIN setting_variants sv
      ON sv.id = p.setting_variant_id
    WHERE (
        p.slug = ${ref}
        OR p.source_sku = ${ref}
        OR p.source_sku_derived = ${ref}
        OR g.gem_ref = ${ref}
        OR sv.sku = ${ref}
      )
      AND p.deleted_at IS NULL
    ORDER BY CASE WHEN p.slug = ${ref} THEN 0 ELSE 1 END, p.slug
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const row = record(res.rows[0]);
  return {
    id: String(row['id']),
    slug: String(row['slug']),
    title: String(row['title']),
    kind: String(row['kind']),
    price_amount: text(row['price_amount']),
    currency: String(row['currency'] ?? 'USD'),
    availability: row['availability'] === true,
    state: String(row['state']),
  };
}

/* --------------------------------------------------------------- gemstones */

function mapGemstoneRow(value: unknown): CompatGemstoneRow {
  const row = record(value);
  const kind = String(row['kind'] ?? 'SINGLE');
  return {
    ref: String(row['ref'] ?? ''),
    slug: String(row['slug'] ?? ''),
    name: String(row['name'] ?? ''),
    kind: kind === 'PAIR' ? 'PAIR' : 'SINGLE',
    variety: text(row['variety']),
    variety_code: text(row['variety_code']),
    family_code: text(row['family_code']),
    colour: text(row['colour']),
    colour_slug: text(row['colour_slug']),
    origin: text(row['origin']),
    shape: text(row['shape']),
    clarity: text(row['clarity']),
    treatment: text(row['treatment']),
    weight_ct: text(row['weight_ct']),
    total_weight_ct: text(row['total_weight_ct']),
    price_amount: text(row['price_amount']),
    currency: String(row['currency'] ?? 'USD'),
    status: String(row['status'] ?? 'ACTIVE'),
    origin_type: text(row['origin_type']),
    description: text(row['description']),
    primary_image: text(row['primary_image']),
  };
}

interface GemstoneListQuery {
  readonly q?: string | undefined;
  readonly refs?: readonly string[] | undefined;
  readonly limit: number;
  readonly offset: number;
}

/**
 * Page over the sellable gemstone kinds for develop's `/catalogue/gemstones`
 * list and by-reference lookups (`favorites-client`, `compare-client`).
 * `refs` is matched against the product slug and the gemstone reference.
 */
export async function listCompatGemstones(
  db: CatalogDatabase,
  query: GemstoneListQuery,
): Promise<CompatGemstoneRow[]> {
  const refs = (query.refs ?? []).filter((r) => r.trim().length > 0).slice(0, 100);
  const q = query.q?.trim() ?? '';
  const search = q.length === 0 ? null : `%${q}%`;
  const refFilter =
    refs.length === 0
      ? sql``
      : sql`AND (p.slug = ANY(${refs}::text[]) OR g.gem_ref = ANY(${refs}::text[]))`;
  const searchFilter =
    search === null
      ? sql``
      : sql`AND (
          p.title ILIKE ${search}
          OR p.slug ILIKE ${search}
          OR gv.name ILIKE ${search}
          OR g.gem_ref ILIKE ${search}
        )`;

  const res = await db.execute(sql`
    SELECT
      COALESCE(g.gem_ref, p.slug) AS ref,
      p.slug,
      p.title AS name,
      COALESCE(g.kind::text, CASE p.kind WHEN 'STONE_PAIR' THEN 'PAIR' ELSE 'SINGLE' END) AS kind,
      gv.name AS variety,
      gv.slug AS variety_code,
      gs.code AS family_code,
      gc.name AS colour,
      gc.slug AS colour_slug,
      go.name AS origin,
      g.shape::text AS shape,
      cl.label AS clarity,
      t.code AS treatment,
      g.total_weight_ct::text AS weight_ct,
      p.total_weight_ct::text AS total_weight_ct,
      p.price_amount::text AS price_amount,
      p.currency::text AS currency,
      p.state::text AS status,
      NULL::text AS origin_type,
      p.description,
      NULL::text AS primary_image
    FROM products p
    LEFT JOIN gemstones g
      ON g.id = COALESCE(p.gemstone_id, p.gemstone_pair_id)
    LEFT JOIN gemstone_varieties gv
      ON gv.id = COALESCE(p.variety_id, g.variety_id)
    LEFT JOIN gemstone_species gs
      ON gs.id = gv.species_id
    LEFT JOIN gemstone_colours gc
      ON gc.id = COALESCE(p.colour_id, g.colour_id)
    LEFT JOIN gemstone_origins go
      ON go.id = g.origin_id
    LEFT JOIN clarities cl
      ON cl.id = g.clarity_id
    LEFT JOIN treatments t
      ON t.id = g.treatment_id
    WHERE p.deleted_at IS NULL
      AND p.state = 'ACTIVE'
      AND p.kind IN ('LOOSE_STONE', 'STONE_PAIR')
      ${refFilter}
      ${searchFilter}
    ORDER BY p.title ASC
    LIMIT ${query.limit}
    OFFSET ${query.offset}
  `);

  return res.rows.map(mapGemstoneRow);
}

/** One gemstone by reference, for the tool-gated concierge. */
export async function findCompatGemstoneByRef(
  db: CatalogDatabase,
  gemRef: string,
): Promise<CompatGemstoneRow | null> {
  const res = await db.execute(sql`
    SELECT
      g.gem_ref AS ref,
      COALESCE(p.slug, g.gem_ref) AS slug,
      COALESCE(p.title, g.gem_ref) AS name,
      g.kind::text AS kind,
      gv.name AS variety,
      gv.slug AS variety_code,
      gs.code AS family_code,
      gc.name AS colour,
      gc.slug AS colour_slug,
      go.name AS origin,
      g.shape::text AS shape,
      cl.label AS clarity,
      t.code AS treatment,
      g.total_weight_ct::text AS weight_ct,
      g.total_weight_ct::text AS total_weight_ct,
      COALESCE(g.price_amount, p.price_amount)::text AS price_amount,
      COALESCE(g.currency, p.currency)::text AS currency,
      COALESCE(p.state::text, g.state::text) AS status,
      NULL::text AS origin_type,
      p.description,
      NULL::text AS primary_image
    FROM gemstones g
    LEFT JOIN products p
      ON p.gemstone_id = g.id OR p.gemstone_pair_id = g.id
    LEFT JOIN gemstone_varieties gv
      ON gv.id = g.variety_id
    LEFT JOIN gemstone_species gs
      ON gs.id = gv.species_id
    LEFT JOIN gemstone_colours gc
      ON gc.id = g.colour_id
    LEFT JOIN gemstone_origins go
      ON go.id = g.origin_id
    LEFT JOIN clarities cl
      ON cl.id = g.clarity_id
    LEFT JOIN treatments t
      ON t.id = g.treatment_id
    WHERE g.gem_ref = ${gemRef}
      AND g.deleted_at IS NULL
    ORDER BY p.slug NULLS LAST
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  return mapGemstoneRow(res.rows[0]);
}

/* ---------------------------------------------------------------- settings */

function mapSettingRow(value: unknown): CompatSettingRow {
  const row = record(value);
  const shapes = Array.isArray(row['compatible_shapes'])
    ? (row['compatible_shapes'] as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  return {
    ref: String(row['ref'] ?? ''),
    sku: String(row['sku'] ?? ''),
    design_code: String(row['design_code'] ?? ''),
    name: String(row['name'] ?? ''),
    jewellery_type: String(row['jewellery_type'] ?? ''),
    style: text(row['style']),
    metal: String(row['metal'] ?? ''),
    metal_name: text(row['metal_name']),
    min_ct: text(row['min_ct']),
    max_ct: text(row['max_ct']),
    compatible_shapes: shapes,
    price_amount: text(row['price_amount']),
    currency: String(row['currency'] ?? 'USD'),
    description: text(row['description']),
  };
}

interface SettingListQuery {
  readonly q?: string | undefined;
  readonly refs?: readonly string[] | undefined;
  readonly limit: number;
  readonly offset: number;
}

/**
 * One row per setting DESIGN, because develop's compare/palette read a design
 * reference (`design_code`) while main sells design x metal variants.
 * `metal` aggregates the real ACTIVE metal codes (comma-separated), the price
 * is the cheapest ACTIVE variant's real `base_price`, and the carat/shape
 * window comes from the real compatibility rules. Nothing is estimated: a
 * design with no priced variant has `price_amount = null`.
 */
export async function listCompatSettings(
  db: CatalogDatabase,
  query: SettingListQuery,
): Promise<CompatSettingRow[]> {
  const refs = (query.refs ?? []).filter((r) => r.trim().length > 0).slice(0, 100);
  const q = query.q?.trim() ?? '';
  const search = q.length === 0 ? null : `%${q}%`;
  const refFilter =
    refs.length === 0 ? sql`` : sql`AND s.design_code = ANY(${refs}::text[])`;
  const searchFilter =
    search === null
      ? sql``
      : sql`AND (s.name ILIKE ${search} OR s.design_code ILIKE ${search})`;

  const res = await db.execute(sql`
    SELECT
      s.design_code AS ref,
      s.design_code AS sku,
      s.design_code,
      s.name,
      s.jewellery_type::text AS jewellery_type,
      st.name AS style,
      COALESCE(vars.metal, '') AS metal,
      NULL::text AS metal_name,
      rules.min_ct::text AS min_ct,
      rules.max_ct::text AS max_ct,
      COALESCE(rules.shapes, ARRAY[]::text[]) AS compatible_shapes,
      vars.min_price::text AS price_amount,
      COALESCE(vars.currency, 'USD') AS currency,
      s.description
    FROM settings s
    LEFT JOIN setting_styles st
      ON st.id = s.style_id
    LEFT JOIN LATERAL (
      SELECT
        string_agg(DISTINCT v.metal_code::text, ', ' ORDER BY v.metal_code::text) AS metal,
        min(v.base_price) AS min_price,
        (
          SELECT v2.currency::text
          FROM setting_variants v2
          WHERE v2.setting_id = s.id
            AND v2.deleted_at IS NULL
            AND v2.state = 'ACTIVE'
            AND v2.base_price IS NOT NULL
          ORDER BY v2.base_price ASC
          LIMIT 1
        ) AS currency
      FROM setting_variants v
      WHERE v.setting_id = s.id
        AND v.deleted_at IS NULL
        AND v.state = 'ACTIVE'
    ) vars ON TRUE
    LEFT JOIN LATERAL (
      SELECT min(r.min_weight_ct) AS min_ct, max(r.max_weight_ct) AS max_ct,
             array_agg(DISTINCT r.shape::text) FILTER (WHERE r.shape IS NOT NULL) AS shapes
      FROM setting_compatibility_rules r
      WHERE r.setting_id = s.id
        AND r.state = 'ACTIVE'
    ) rules ON TRUE
    WHERE s.deleted_at IS NULL
      AND s.state = 'ACTIVE'
      ${refFilter}
      ${searchFilter}
    ORDER BY s.name ASC
    LIMIT ${query.limit}
    OFFSET ${query.offset}
  `);

  return res.rows.map(mapSettingRow);
}

/* ------------------------------------------------------------------ orders */

/**
 * The signed-in customer's order history. The `customer_id` predicate is the
 * whole boundary: an order placed by another customer (or a guest order) is
 * not in the result, no matter what the caller asks for.
 */
export async function listCustomerOrderSummaries(
  db: CatalogDatabase,
  customerId: string,
): Promise<CompatOrderSummaryRow[]> {
  const res = await db.execute(sql`
    SELECT
      o.order_number,
      o.state::text AS status,
      o.currency::text AS currency,
      o.grand_total::text AS grand_total,
      COALESCE(o.placed_at, o.created_at) AS placed_at,
      (
        SELECT count(*)::int
        FROM order_items oi
        WHERE oi.order_id = o.id
      ) AS item_count
    FROM orders o
    WHERE o.customer_id = ${customerId}
    ORDER BY COALESCE(o.placed_at, o.created_at) DESC
    LIMIT 50
  `);

  return res.rows.map((value) => {
    const row = record(value);
    return {
      order_number: String(row['order_number']),
      status: String(row['status']),
      currency: String(row['currency'] ?? 'USD'),
      grand_total: String(row['grand_total'] ?? '0.00'),
      placed_at: toIso(row['placed_at'] as Date | string | null) ?? new Date(0).toISOString(),
      item_count: Number(row['item_count'] ?? 0),
    };
  });
}

/**
 * One order, read inside the customer's boundary. Returns null for both
 * "unknown" and "belongs to someone else" so the handler can answer 404
 * without revealing that the order exists.
 */
export async function getCustomerOrderByNumber(
  db: CatalogDatabase,
  customerId: string,
  orderNumber: string,
): Promise<CompatOrderDetail | null> {
  const orderRes = await db.execute(sql`
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.email::text AS email,
      o.state::text AS status,
      o.currency::text AS currency,
      o.subtotal::text AS subtotal,
      o.tax_total::text AS tax,
      o.shipping_total::text AS shipping,
      o.discount_total::text AS discount,
      o.grand_total::text AS grand_total,
      o.shipping_address,
      o.customer_note,
      o.placed_at,
      o.paid_at
    FROM orders o
    WHERE o.order_number = ${orderNumber}
      AND o.customer_id = ${customerId}
    LIMIT 1
  `);
  if (orderRes.rows.length === 0) return null;
  const order = record(orderRes.rows[0]);
  const orderId = String(order['id']);

  const itemRes = await db.execute(sql`
    SELECT sku_snapshot, title_snapshot, quantity,
           unit_price::text AS unit_price, line_total::text AS line_total
    FROM order_items
    WHERE order_id = ${orderId}
    ORDER BY created_at ASC
  `);
  const eventRes = await db.execute(sql`
    SELECT to_state::text AS event, created_at
    FROM order_events
    WHERE order_id = ${orderId}
    ORDER BY id ASC
  `);

  return {
    id: orderId,
    order_number: String(order['order_number']),
    customer_id: text(order['customer_id']),
    email: String(order['email'] ?? ''),
    status: String(order['status']),
    currency: String(order['currency'] ?? 'USD'),
    subtotal: String(order['subtotal'] ?? '0.00'),
    tax: String(order['tax'] ?? '0.00'),
    shipping: String(order['shipping'] ?? '0.00'),
    discount: String(order['discount'] ?? '0.00'),
    grand_total: String(order['grand_total'] ?? '0.00'),
    shipping_address: order['shipping_address'] ?? null,
    customer_note: text(order['customer_note']),
    placed_at: toIso(order['placed_at'] as Date | string | null),
    paid_at: toIso(order['paid_at'] as Date | string | null),
    items: itemRes.rows.map((value) => {
      const row = record(value);
      const sku = String(row['sku_snapshot'] ?? '');
      return {
        description: String(row['title_snapshot'] ?? sku),
        code_snapshot: sku,
        quantity: Number(row['quantity'] ?? 0),
        unit_price: String(row['unit_price'] ?? '0.00'),
        line_total: String(row['line_total'] ?? '0.00'),
      };
    }),
    events: eventRes.rows.map((value) => {
      const row = record(value);
      return {
        event: String(row['event'] ?? ''),
        created_at: toIso(row['created_at'] as Date | string | null) ?? new Date(0).toISOString(),
      };
    }),
  };
}

/* -------------------------------------------------- newsletter + requests */

/**
 * Record newsletter consent. A repeat subscribe revives an unsubscribed row
 * and refreshes `consent_at`; it never deletes the earlier consent history.
 */
export async function subscribeNewsletter(
  db: CatalogDatabase,
  input: { readonly email: string; readonly source: string },
): Promise<NewsletterSubscriptionRow> {
  const res = await db.execute(sql`
    INSERT INTO newsletter_subscriptions (email, source)
    VALUES (${input.email}, ${input.source})
    ON CONFLICT (email)
    DO UPDATE SET
      unsubscribed_at = NULL,
      source = EXCLUDED.source,
      consent_at = now(),
      updated_at = now()
    RETURNING id, email::text AS email, consent_at
  `);
  const row = record(res.rows[0]);
  return {
    id: String(row['id']),
    email: String(row['email'] ?? input.email),
    consent_at: toIso(row['consent_at'] as Date | string | null) ?? new Date().toISOString(),
  };
}

/** Idempotent unsubscribe; an unknown address is a successful no-op. */
export async function unsubscribeNewsletter(
  db: CatalogDatabase,
  email: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE newsletter_subscriptions
    SET unsubscribed_at = now(), updated_at = now()
    WHERE email = ${email}
      AND unsubscribed_at IS NULL
  `);
}

/** The durable record behind the `create_customer_request` tool. */
export async function createCustomerRequestRecord(
  db: CatalogDatabase,
  input: {
    readonly intent: 'INQUIRY' | 'BESPOKE_REQUEST' | 'APPOINTMENT' | 'CUSTOM_CURATION';
    readonly source: string;
    readonly email: string;
    readonly name: string | null;
    readonly notes: string;
    readonly customerId: string | null;
  },
): Promise<CustomerRequestRow> {
  const res = await db.execute(sql`
    INSERT INTO customer_requests (intent, source, email, name, notes, customer_id)
    VALUES (
      ${input.intent},
      ${input.source},
      ${input.email},
      ${input.name},
      ${input.notes},
      ${input.customerId}
    )
    RETURNING id, created_at
  `);
  const row = record(res.rows[0]);
  return {
    id: String(row['id']),
    created_at: toIso(row['created_at'] as Date | string | null) ?? new Date().toISOString(),
  };
}

/* ---------------------------------------------------------- certificates */

export interface PublicCertificateRow {
  readonly id: string;
  readonly kind: string;
  readonly verification_status: string;
  readonly lab_name: string | null;
  readonly field_name: string | null;
  readonly normalized_value: string | null;
  readonly numeric_value: string | null;
  readonly confidence: string | null;
  readonly field_status: string | null;
}

/**
 * The only certificate surface the storefront/AI may read (INV-07): the
 * `certificate_public` view, which already withholds values below 0.50
 * confidence. An unknown reference is null, never a plausible row.
 */
export async function findPublicCertificateForGemRef(
  db: CatalogDatabase,
  identifier: string,
): Promise<PublicCertificateRow | null> {
  const res = await db.execute(sql`
    SELECT
      cp.id,
      cp.kind::text AS kind,
      cp.verification_status::text AS verification_status,
      cp.lab_name,
      cp.field_name,
      cp.normalized_value,
      cp.numeric_value::text AS numeric_value,
      cp.confidence::text AS confidence,
      cp.field_status::text AS field_status
    FROM certificate_public cp
    JOIN gemstones g ON g.id = cp.gemstone_id
    WHERE g.gem_ref = ${identifier}
       OR cp.id::text = ${identifier}
    ORDER BY cp.confidence DESC NULLS LAST
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const row = record(res.rows[0]);
  return {
    id: String(row['id']),
    kind: String(row['kind'] ?? ''),
    verification_status: String(row['verification_status'] ?? ''),
    lab_name: text(row['lab_name']),
    field_name: text(row['field_name']),
    normalized_value: text(row['normalized_value']),
    numeric_value: text(row['numeric_value']),
    confidence: text(row['confidence']),
    field_status: text(row['field_status']),
  };
}
