/**
 * Customer address book. Country is ISO-2 (uppercase); one default per
 * customer is enforced by the application (the DB keeps the rows).
 */
import type { AnyClient } from './db.js';
import { StateError } from './validation.js';

export interface AddressInput {
  label?: string;
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default?: boolean;
}

function clean(input: AddressInput): AddressInput {
  const country = (input.country ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new StateError('country must be an ISO-2 code');
  if (!input.recipient?.trim() || !input.line1?.trim() || !input.city?.trim() || !input.postal_code?.trim()) {
    throw new StateError('recipient, line1, city and postal_code are required');
  }
  return {
    label: input.label?.trim().slice(0, 40) || 'Address',
    recipient: input.recipient.trim().slice(0, 120),
    line1: input.line1.trim().slice(0, 200),
    line2: input.line2?.trim().slice(0, 200) || undefined,
    city: input.city.trim().slice(0, 100),
    region: input.region?.trim().slice(0, 100) || undefined,
    postal_code: input.postal_code.trim().slice(0, 20),
    country,
    phone: input.phone?.trim().slice(0, 40) || undefined,
    is_default: Boolean(input.is_default),
  };
}

export async function listAddresses(client: AnyClient, customerId: number) {
  const { rows } = await client.query(
    `SELECT id, label, kind, recipient, line1, line2, city, region, postal_code, country, phone, is_default, created_at::text AS created_at
     FROM fresh.customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [customerId],
  );
  return rows;
}

export async function createAddress(client: AnyClient, customerId: number, input: AddressInput) {
  const p = clean(input);
  if (p.is_default) {
    await client.query(`UPDATE fresh.customer_addresses SET is_default = false WHERE customer_id = $1`, [customerId]);
  }
  const { rows } = await client.query(
    `INSERT INTO fresh.customer_addresses (customer_id, label, kind, recipient, line1, line2, city, region, postal_code, country, phone, is_default)
     VALUES ($1,$2,'SHIPPING',$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, label, recipient, line1, line2, city, region, postal_code, country, phone, is_default`,
    [customerId, p.label, p.recipient, p.line1, p.line2 ?? null, p.city, p.region ?? null, p.postal_code, p.country, p.phone ?? null, p.is_default ?? false],
  );
  return rows[0];
}

export async function updateAddress(client: AnyClient, customerId: number, id: number, input: Partial<AddressInput>) {
  const existing = await client.query(`SELECT * FROM fresh.customer_addresses WHERE id = $1 AND customer_id = $2`, [id, customerId]);
  if (!existing.rows[0]) throw new StateError(`address ${id} not found`);
  const merged = clean({
    recipient: input.recipient ?? existing.rows[0].recipient,
    line1: input.line1 ?? existing.rows[0].line1,
    line2: input.line2 ?? existing.rows[0].line2 ?? undefined,
    city: input.city ?? existing.rows[0].city,
    region: input.region ?? existing.rows[0].region ?? undefined,
    postal_code: input.postal_code ?? existing.rows[0].postal_code,
    country: input.country ?? existing.rows[0].country,
    phone: input.phone ?? existing.rows[0].phone ?? undefined,
    label: input.label ?? existing.rows[0].label,
    is_default: input.is_default ?? existing.rows[0].is_default,
  });
  if (merged.is_default) {
    await client.query(`UPDATE fresh.customer_addresses SET is_default = false WHERE customer_id = $1 AND id <> $2`, [customerId, id]);
  }
  const { rows } = await client.query(
    `UPDATE fresh.customer_addresses
     SET label=$3, recipient=$4, line1=$5, line2=$6, city=$7, region=$8, postal_code=$9, country=$10, phone=$11, is_default=$12
     WHERE id = $1 AND customer_id = $2
     RETURNING id, label, recipient, line1, line2, city, region, postal_code, country, phone, is_default`,
    [id, customerId, merged.label, merged.recipient, merged.line1, merged.line2 ?? null, merged.city, merged.region ?? null, merged.postal_code, merged.country, merged.phone ?? null, merged.is_default ?? false],
  );
  return rows[0];
}

export async function deleteAddress(client: AnyClient, customerId: number, id: number) {
  const { rowCount } = await client.query(`DELETE FROM fresh.customer_addresses WHERE id = $1 AND customer_id = $2`, [id, customerId]);
  if (!rowCount) throw new StateError(`address ${id} not found`);
  return { removed: true };
}

export async function setDefaultAddress(client: AnyClient, customerId: number, id: number) {
  const found = await client.query(`SELECT 1 FROM fresh.customer_addresses WHERE id = $1 AND customer_id = $2`, [id, customerId]);
  if (!found.rowCount) throw new StateError(`address ${id} not found`);
  await client.query(`UPDATE fresh.customer_addresses SET is_default = (id = $2) WHERE customer_id = $1`, [customerId, id]);
  return { id, is_default: true };
}
