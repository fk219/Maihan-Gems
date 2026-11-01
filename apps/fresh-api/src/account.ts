/**
 * Customer account surface: order history, profile, saved pieces.
 * Guest orders placed with the same verified email are included honestly
 * (they are that customer's orders by the ledger's own identity field).
 */
import type { AnyClient } from './db.js';
import { StateError } from './validation.js';

export async function listCustomerOrders(client: AnyClient, customerId: number, email: string) {
  const { rows } = await client.query(
    `SELECT o.order_number, o.status, o.currency, o.grand_total::text AS grand_total,
            o.placed_at::text AS placed_at, o.paid_at::text AS paid_at,
            (SELECT count(*)::int FROM fresh.order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM fresh.orders o
     WHERE o.customer_id = $1 OR lower(o.email) = lower($2)
     ORDER BY o.placed_at DESC LIMIT 50`,
    [customerId, email],
  );
  return rows;
}

export async function updateCustomerProfile(
  client: AnyClient,
  customerId: number,
  body: { first_name?: string; last_name?: string; phone?: string },
) {
  const clean = (v: string | undefined): string | null | undefined =>
    v === undefined ? undefined : v.trim().slice(0, 80) || null;
  const { rows } = await client.query(
    `UPDATE fresh.customers
     SET first_name = COALESCE($2, first_name),
         last_name  = COALESCE($3, last_name),
         phone      = COALESCE($4, phone),
         updated_at = now()
     WHERE id = $1
     RETURNING id, email, first_name, last_name, phone`,
    [customerId, clean(body.first_name), clean(body.last_name), body.phone === undefined ? undefined : body.phone.trim().slice(0, 40) || null],
  );
  if (!rows[0]) throw new StateError('customer not found');
  return rows[0];
}

export interface SavedPieces {
  gemstones: Array<{ ref: string; slug: string; name: string; variety: string }>;
  settings: Array<{ ref: string; name: string; jewellery_type: string }>;
}

export async function listCustomerFavourites(client: AnyClient, customerId: number): Promise<SavedPieces> {
  const gems = await client.query(
    `SELECT g.ref, g.slug, g.name, v.name AS variety
     FROM fresh.favourites f
     JOIN fresh.gemstones g ON g.id = f.owner_id
     JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
     WHERE f.customer_id = $1 AND f.owner_kind = 'gemstone'
     ORDER BY f.created_at DESC`,
    [customerId],
  );
  const settings = await client.query(
    `SELECT s.ref, s.name, jt.code AS jewellery_type
     FROM fresh.favourites f
     JOIN fresh.settings s ON s.id = f.owner_id
     JOIN fresh.jewellery_types jt ON jt.id = s.jewellery_type_id
     WHERE f.customer_id = $1 AND f.owner_kind = 'setting'
     ORDER BY f.created_at DESC`,
    [customerId],
  );
  return { gemstones: gems.rows, settings: settings.rows };
}

/** Replace the customer's saved tray with the given semantic references. */
export async function replaceCustomerFavourites(
  client: AnyClient,
  customerId: number,
  refs: string[],
): Promise<SavedPieces> {
  const unique = [...new Set(refs.map((r) => r.trim()).filter(Boolean))].slice(0, 200);
  await client.query(`DELETE FROM fresh.favourites WHERE customer_id = $1`, [customerId]);
  if (unique.length) {
    await client.query(
      `INSERT INTO fresh.favourites (customer_id, owner_kind, owner_id)
       SELECT $1, 'gemstone', id FROM fresh.gemstones WHERE ref = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [customerId, unique],
    );
    await client.query(
      `INSERT INTO fresh.favourites (customer_id, owner_kind, owner_id)
       SELECT $1, 'setting', id FROM fresh.settings WHERE ref = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [customerId, unique],
    );
  }
  return listCustomerFavourites(client, customerId);
}
