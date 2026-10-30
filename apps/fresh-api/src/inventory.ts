/**
 * F4 — vendor inventory management (fresh-api).
 * Vendors control their own approved items: mark sold out, hide (draft), delete (archive).
 */
import type { AnyClient } from './db.js';
import { StateError } from './validation.js';

const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

function err(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

export interface InventoryItem {
  ref: string;
  slug: string;
  name: string;
  kind: 'SINGLE' | 'PAIR' | 'READY_MADE' | 'CONFIGURED';
  weight_ct: number | null;
  price_amount: number | null;
  currency: string;
  status: string;
  origin_type: string;
  variety: string;
  colour: string | null;
  shape: string | null;
  origin: string | null;
  primary_image: string | null;
  created_at: string;
  owner_kind: 'gemstone' | 'product';
}

export interface InventoryStats {
  total_items: number;
  live_items: number;
  sold_items: number;
  hidden_items: number;
  total_value: number;
  currency: string;
}

export async function vendorInventory(client: AnyClient, vendorId: number): Promise<{ items: InventoryItem[]; stats: InventoryStats }> {
  const { rows } = await client.query(
    `SELECT g.ref, g.slug, g.name, g.kind::text, g.weight_ct::text AS weight_ct,
            g.price_amount::text AS price_amount, g.currency, g.status, g.origin_type::text AS origin_type,
            v.name AS variety, c.name AS colour, sh.name AS shape, o.name AS origin, g.created_at::text AS created_at,
            'gemstone' AS owner_kind,
            (SELECT url FROM fresh.assets a WHERE a.owner_kind='gemstone' AND a.owner_id=g.id ORDER BY position LIMIT 1) AS primary_image
     FROM fresh.gemstones g
     JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
     LEFT JOIN fresh.gemstone_colours c ON c.id = g.colour_id
     LEFT JOIN fresh.shapes sh ON sh.id = g.shape_id
     LEFT JOIN fresh.gemstone_origins o ON o.id = g.origin_id
     WHERE g.vendor_id = $1 AND g.status <> 'ARCHIVED'
     UNION ALL
     SELECT p.ref, p.slug, p.name, p.kind::text AS kind, NULL AS weight_ct,
            p.price_amount::text AS price_amount, p.currency, p.status, 'NATURAL' AS origin_type,
            jt.name AS variety, NULL AS colour, NULL AS shape, NULL AS origin, p.created_at::text AS created_at,
            'product' AS owner_kind,
            (SELECT url FROM fresh.assets a WHERE a.owner_kind='product' AND a.owner_id=p.id ORDER BY position LIMIT 1) AS primary_image
     FROM fresh.products p
     JOIN fresh.jewellery_types jt ON jt.id = p.jewellery_type_id
     WHERE p.vendor_id = $1 AND p.status <> 'ARCHIVED'
     ORDER BY created_at DESC`,
    [vendorId],
  );

  const items: InventoryItem[] = rows.map((r) => ({
    ref: String(r.ref),
    slug: String(r.slug),
    name: String(r.name),
    kind: r.kind,
    weight_ct: r.weight_ct == null ? null : num(r.weight_ct),
    price_amount: r.price_amount == null ? null : num(r.price_amount),
    currency: String(r.currency ?? 'USD'),
    status: String(r.status),
    origin_type: String(r.origin_type ?? 'NATURAL'),
    variety: String(r.variety ?? ''),
    colour: r.colour == null ? null : String(r.colour),
    shape: r.shape == null ? null : String(r.shape),
    origin: r.origin == null ? null : String(r.origin),
    primary_image: r.primary_image == null ? null : String(r.primary_image),
    created_at: String(r.created_at ?? ''),
    owner_kind: r.owner_kind,
  }));

  const live = items.filter((i) => i.status === 'ACTIVE');
  const stats: InventoryStats = {
    total_items: items.length,
    live_items: live.length,
    sold_items: items.filter((i) => i.status === 'SOLD').length,
    hidden_items: items.filter((i) => i.status === 'DRAFT').length,
    total_value: Math.round(live.reduce((a, i) => a + (i.price_amount ?? 0), 0) * 100) / 100,
    currency: items[0]?.currency ?? 'USD',
  };

  return { items, stats };
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['DRAFT', 'SOLD', 'ARCHIVED'],
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  SOLD: ['ACTIVE'], // restock
};

export async function updateItemStatus(client: AnyClient, vendorId: number, ref: string, newStatus: string): Promise<void> {
  // try gemstone first, then product
  const gem = await client.query(`SELECT id, status FROM fresh.gemstones WHERE ref = $1 AND vendor_id = $2`, [ref, vendorId]);
  if (gem.rows[0]) {
    const current = String(gem.rows[0].status);
    if (!ALLOWED_TRANSITIONS[current]?.includes(newStatus)) {
      throw err(`cannot transition from ${current} to ${newStatus}`, 422);
    }
    await client.query(`UPDATE fresh.gemstones SET status = $2 WHERE ref = $1 AND vendor_id = $3`, [ref, newStatus, vendorId]);
    return;
  }
  const prod = await client.query(`SELECT id, status FROM fresh.products WHERE ref = $1 AND vendor_id = $2`, [ref, vendorId]);
  if (prod.rows[0]) {
    const current = String(prod.rows[0].status);
    if (!ALLOWED_TRANSITIONS[current]?.includes(newStatus)) {
      throw err(`cannot transition from ${current} to ${newStatus}`, 422);
    }
    await client.query(`UPDATE fresh.products SET status = $2 WHERE ref = $1 AND vendor_id = $3`, [ref, newStatus, vendorId]);
    return;
  }
  throw err(`item '${ref}' not found in your inventory`, 404);
}
