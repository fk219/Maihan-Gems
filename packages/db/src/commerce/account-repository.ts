/**
 * packages/db/src/commerce/account-repository.ts
 *
 * Phase 6 Task 7 — Customer accounts, profiles, addresses, and order history repository.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §140-155.
 * - technical_design/04 DATABASE IMPLEMENTATION.
 * - Invariant: Strict customer authorization boundary — cross-customer access is forbidden.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type CreateCustomerAddressInput,
  type CustomerAddressDto,
  type CustomerProfileDto,
  type OrderDto,
  type OrderItemDto,
  type UpdateCustomerAddressInput,
  type UpdateCustomerProfileInput,
} from '@maihan/contracts';

interface CustomerRow {
  id: string;
  identity_user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  preferred_currency: string;
  birth_date: string | null;
  birth_place: string | null;
  zodiac_sign: string | null;
  ring_size: string | null;
  notes: string | null;
}

interface AddressRow {
  id: string;
  customer_id: string;
  kind: 'SHIPPING' | 'BILLING' | 'SHOWROOM' | 'PICKUP';
  full_name: string;
  recipient: string | null;
  line1: string;
  line2: string | null;
  line3: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country_code: string;
  phone: string | null;
  is_default: boolean;
}

export async function getOrCreateCustomer(
  db: CatalogDatabase,
  input: {
    identity_user_id?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  },
): Promise<{ id: string; identity_user_id: string | null; email: string }> {
  // Check existing customer
  const checkRes = await db.execute(sql`
    SELECT id, identity_user_id, email::text AS email
    FROM customers
    WHERE (identity_user_id IS NOT NULL AND identity_user_id = ${input.identity_user_id ?? ''})
       OR email = ${input.email}
    LIMIT 1
  `);

  if (checkRes.rows.length > 0) {
    return checkRes.rows[0] as { id: string; identity_user_id: string | null; email: string };
  }

  const insertRes = await db.execute(sql`
    INSERT INTO customers (
      identity_user_id,
      email,
      first_name,
      last_name,
      phone
    ) VALUES (
      ${input.identity_user_id ?? null},
      ${input.email},
      ${input.first_name ?? null},
      ${input.last_name ?? null},
      ${input.phone ?? null}
    )
    RETURNING id, identity_user_id, email::text AS email
  `);

  const created = insertRes.rows[0] as { id: string; identity_user_id: string | null; email: string };

  // Create empty profile
  await db.execute(sql`
    INSERT INTO customer_profiles (customer_id)
    VALUES (${created.id})
    ON CONFLICT (customer_id) DO NOTHING
  `);

  return created;
}

export async function getCustomerProfile(
  db: CatalogDatabase,
  customerId: string,
): Promise<CustomerProfileDto> {
  const res = await db.execute(sql`
    SELECT
      c.id,
      c.email::text AS email,
      c.first_name,
      c.last_name,
      c.phone,
      c.preferred_currency,
      cp.birth_date::text AS birth_date,
      cp.birth_place,
      cp.zodiac_sign,
      cp.ring_size::text AS ring_size,
      cp.notes
    FROM customers c
    LEFT JOIN customer_profiles cp ON cp.customer_id = c.id
    WHERE c.id = ${customerId}
      AND c.deleted_at IS NULL
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    throw new ContractError('UNAUTHORIZED', 'Customer account not found.');
  }

  const row = res.rows[0] as unknown as CustomerRow;
  return {
    customer_id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    preferred_currency: row.preferred_currency ?? 'USD',
    birth_date: row.birth_date,
    birth_place: row.birth_place,
    zodiac_sign: row.zodiac_sign,
    ring_size: row.ring_size,
    notes: row.notes,
  };
}

export async function updateCustomerProfile(
  db: CatalogDatabase,
  customerId: string,
  input: UpdateCustomerProfileInput,
): Promise<CustomerProfileDto> {
  await db.execute(sql`
    UPDATE customers
    SET first_name = COALESCE(${input.first_name ?? null}, first_name),
        last_name = COALESCE(${input.last_name ?? null}, last_name),
        phone = COALESCE(${input.phone ?? null}, phone),
        preferred_currency = COALESCE(${input.preferred_currency ?? null}, preferred_currency),
        updated_at = now()
    WHERE id = ${customerId}
      AND deleted_at IS NULL
  `);

  await db.execute(sql`
    INSERT INTO customer_profiles (
      customer_id,
      birth_date,
      birth_place,
      zodiac_sign,
      ring_size,
      updated_at
    ) VALUES (
      ${customerId},
      ${input.birth_date ?? null},
      ${input.birth_place ?? null},
      ${input.zodiac_sign ?? null},
      ${input.ring_size ?? null},
      now()
    )
    ON CONFLICT (customer_id)
    DO UPDATE SET
      birth_date = COALESCE(EXCLUDED.birth_date, customer_profiles.birth_date),
      birth_place = COALESCE(EXCLUDED.birth_place, customer_profiles.birth_place),
      zodiac_sign = COALESCE(EXCLUDED.zodiac_sign, customer_profiles.zodiac_sign),
      ring_size = COALESCE(EXCLUDED.ring_size, customer_profiles.ring_size),
      updated_at = now()
  `);

  return getCustomerProfile(db, customerId);
}

export async function getCustomerAddresses(
  db: CatalogDatabase,
  customerId: string,
): Promise<CustomerAddressDto[]> {
  const res = await db.execute(sql`
    SELECT
      id,
      customer_id,
      kind,
      full_name,
      recipient,
      line1,
      line2,
      line3,
      city,
      region,
      postal_code,
      country_code,
      phone,
      is_default
    FROM addresses
    WHERE customer_id = ${customerId}
      AND deleted_at IS NULL
    ORDER BY is_default DESC, created_at DESC
  `);

  return (res.rows as unknown as AddressRow[]).map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    kind: row.kind,
    full_name: row.full_name,
    recipient: row.recipient,
    line1: row.line1,
    line2: row.line2,
    line3: row.line3,
    city: row.city,
    region: row.region,
    postal_code: row.postal_code,
    country_code: row.country_code,
    phone: row.phone,
    is_default: row.is_default,
  }));
}

export async function createCustomerAddress(
  db: CatalogDatabase,
  customerId: string,
  input: CreateCustomerAddressInput,
): Promise<CustomerAddressDto> {
  if (input.is_default) {
    await db.execute(sql`
      UPDATE addresses
      SET is_default = false, updated_at = now()
      WHERE customer_id = ${customerId}
        AND kind = ${input.kind}
        AND deleted_at IS NULL
    `);
  }

  const res = await db.execute(sql`
    INSERT INTO addresses (
      customer_id,
      kind,
      full_name,
      recipient,
      line1,
      line2,
      line3,
      city,
      region,
      postal_code,
      country_code,
      phone,
      is_default
    ) VALUES (
      ${customerId},
      ${input.kind},
      ${input.full_name},
      ${input.recipient ?? null},
      ${input.line1},
      ${input.line2 ?? null},
      ${input.line3 ?? null},
      ${input.city},
      ${input.region ?? null},
      ${input.postal_code},
      ${input.country_code ?? 'US'},
      ${input.phone ?? null},
      ${input.is_default ?? false}
    )
    RETURNING
      id,
      customer_id,
      kind,
      full_name,
      recipient,
      line1,
      line2,
      line3,
      city,
      region,
      postal_code,
      country_code,
      phone,
      is_default
  `);

  const row = res.rows[0] as unknown as AddressRow;
  return {
    id: row.id,
    customer_id: row.customer_id,
    kind: row.kind,
    full_name: row.full_name,
    recipient: row.recipient,
    line1: row.line1,
    line2: row.line2,
    line3: row.line3,
    city: row.city,
    region: row.region,
    postal_code: row.postal_code,
    country_code: row.country_code,
    phone: row.phone,
    is_default: row.is_default,
  };
}

export async function updateCustomerAddress(
  db: CatalogDatabase,
  customerId: string,
  addressId: string,
  input: UpdateCustomerAddressInput,
): Promise<CustomerAddressDto> {
  const check = await db.execute(sql`
    SELECT id, customer_id, kind FROM addresses
    WHERE id = ${addressId}
      AND deleted_at IS NULL
    LIMIT 1
  `);

  if (check.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Address not found.');
  }

  const existing = check.rows[0] as { id: string; customer_id: string; kind: string };
  if (existing.customer_id !== customerId) {
    throw new ContractError('FORBIDDEN', 'Access to address forbidden.');
  }

  const existingKind = existing.kind;
  const targetKind = input.kind ?? existingKind;

  if (input.is_default) {
    await db.execute(sql`
      UPDATE addresses
      SET is_default = false, updated_at = now()
      WHERE customer_id = ${customerId}
        AND kind = ${targetKind}
        AND deleted_at IS NULL
    `);
  }

  const res = await db.execute(sql`
    UPDATE addresses
    SET kind = COALESCE(${input.kind ?? null}, kind),
        full_name = COALESCE(${input.full_name ?? null}, full_name),
        recipient = COALESCE(${input.recipient ?? null}, recipient),
        line1 = COALESCE(${input.line1 ?? null}, line1),
        line2 = COALESCE(${input.line2 ?? null}, line2),
        line3 = COALESCE(${input.line3 ?? null}, line3),
        city = COALESCE(${input.city ?? null}, city),
        region = COALESCE(${input.region ?? null}, region),
        postal_code = COALESCE(${input.postal_code ?? null}, postal_code),
        country_code = COALESCE(${input.country_code ?? null}, country_code),
        phone = COALESCE(${input.phone ?? null}, phone),
        is_default = COALESCE(${input.is_default ?? null}, is_default),
        updated_at = now()
    WHERE id = ${addressId}
      AND customer_id = ${customerId}
      AND deleted_at IS NULL
    RETURNING
      id,
      customer_id,
      kind,
      full_name,
      recipient,
      line1,
      line2,
      line3,
      city,
      region,
      postal_code,
      country_code,
      phone,
      is_default
  `);

  const row = res.rows[0] as unknown as AddressRow;
  return {
    id: row.id,
    customer_id: row.customer_id,
    kind: row.kind,
    full_name: row.full_name,
    recipient: row.recipient,
    line1: row.line1,
    line2: row.line2,
    line3: row.line3,
    city: row.city,
    region: row.region,
    postal_code: row.postal_code,
    country_code: row.country_code,
    phone: row.phone,
    is_default: row.is_default,
  };
}

export async function deleteCustomerAddress(
  db: CatalogDatabase,
  customerId: string,
  addressId: string,
): Promise<void> {
  const check = await db.execute(sql`
    SELECT id, customer_id FROM addresses
    WHERE id = ${addressId}
      AND deleted_at IS NULL
    LIMIT 1
  `);

  if (check.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Address not found.');
  }

  const existing = check.rows[0] as { id: string; customer_id: string };
  if (existing.customer_id !== customerId) {
    throw new ContractError('FORBIDDEN', 'Access to address forbidden.');
  }

  await db.execute(sql`
    UPDATE addresses
    SET deleted_at = now(), updated_at = now()
    WHERE id = ${addressId}
  `);
}

export async function getCustomerOrders(
  db: CatalogDatabase,
  customerId: string,
): Promise<OrderDto[]> {
  const ordersRes = await db.execute(sql`
    SELECT
      id,
      order_number,
      customer_id,
      email,
      state::text AS state,
      currency,
      subtotal::text AS subtotal,
      discount_total::text AS discount_total,
      shipping_total::text AS shipping_total,
      tax_total::text AS tax_total,
      grand_total::text AS grand_total,
      pricing_snapshot,
      shipping_address,
      billing_address,
      customer_note,
      placed_at,
      idempotency_key,
      version,
      created_at
    FROM orders
    WHERE customer_id = ${customerId}
    ORDER BY created_at DESC
  `);

  const orders: OrderDto[] = [];
  for (const rawOrder of ordersRes.rows as unknown as any[]) {
    const itemsRes = await db.execute(sql`
      SELECT
        id,
        order_id,
        product_id,
        configuration_id,
        sku_snapshot,
        title_snapshot,
        configuration_snapshot,
        gem_snapshot,
        document_snapshot,
        quantity,
        unit_price::text AS unit_price,
        line_total::text AS line_total,
        production_days,
        state
      FROM order_items
      WHERE order_id = ${rawOrder.id}
      ORDER BY created_at ASC
    `);

    const items: OrderItemDto[] = (itemsRes.rows as unknown as any[]).map((i) => ({
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id,
      configuration_id: i.configuration_id,
      sku_snapshot: i.sku_snapshot,
      title_snapshot: i.title_snapshot,
      configuration_snapshot: i.configuration_snapshot,
      gem_snapshot: i.gem_snapshot ?? {},
      document_snapshot: i.document_snapshot,
      quantity: i.quantity,
      unit_price: Number(i.unit_price).toFixed(2),
      line_total: Number(i.line_total).toFixed(2),
      production_days: i.production_days,
      state: i.state,
    }));

    orders.push({
      id: rawOrder.id,
      order_number: rawOrder.order_number,
      customer_id: rawOrder.customer_id,
      email: rawOrder.email,
      state: rawOrder.state,
      currency: rawOrder.currency,
      subtotal: Number(rawOrder.subtotal).toFixed(2),
      discount_total: Number(rawOrder.discount_total).toFixed(2),
      shipping_total: Number(rawOrder.shipping_total).toFixed(2),
      tax_total: Number(rawOrder.tax_total).toFixed(2),
      grand_total: Number(rawOrder.grand_total).toFixed(2),
      pricing_snapshot: rawOrder.pricing_snapshot,
      shipping_address: rawOrder.shipping_address,
      billing_address: rawOrder.billing_address,
      customer_note: rawOrder.customer_note,
      placed_at: rawOrder.placed_at ? new Date(rawOrder.placed_at).toISOString() : null,
      idempotency_key: rawOrder.idempotency_key,
      version: rawOrder.version,
      created_at: new Date(rawOrder.created_at).toISOString(),
      items,
    });
  }

  return orders;
}

export async function getCustomerOrder(
  db: CatalogDatabase,
  customerId: string,
  orderId: string,
): Promise<OrderDto> {
  const ownCheck = await db.execute(sql`
    SELECT id, customer_id
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `);

  if (ownCheck.rows.length === 0) {
    throw new ContractError('ORDER_NOT_FOUND', `Order "${orderId}" not found.`);
  }

  const row = ownCheck.rows[0] as { id: string; customer_id: string | null };
  if (row.customer_id !== customerId) {
    throw new ContractError('FORBIDDEN', 'Access denied to this order.');
  }

  const orders = await getCustomerOrders(db, customerId);
  const found = orders.find((o) => o.id === orderId);
  if (!found) {
    throw new ContractError('ORDER_NOT_FOUND', `Order "${orderId}" not found.`);
  }
  return found;
}
