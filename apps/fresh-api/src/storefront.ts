import type { AnyClient } from './db.js';

// Public storefront read APIs — no auth. Only non-ARCHIVED rows are listable;
// sensitive columns (vendor_id, vendor_ref, cost-ish fields) are never exposed.

const GEM_COLUMNS = `g.ref, g.slug, g.name, g.kind, g.weight_ct, g.price_amount, g.currency, g.status,
  g.origin_type, v.name AS variety, v.code AS variety_code, f.code AS family_code,
  c.name AS colour, o.name AS origin, s.name AS shape, cl.name AS clarity`;

export async function listGemstones(client: AnyClient, q: URLSearchParams) {
  const where: string[] = [`g.status <> 'ARCHIVED'`];
  const params: unknown[] = [];
  const add = (col: string, key: string, cast = ''): void => {
    const v = q.get(key);
    if (v) { params.push(v); where.push(`g.${col} = $${params.length}${cast}`); }
  };
  const join = `FROM fresh.gemstones g
    JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
    JOIN fresh.gemstone_families f ON f.id = v.family_id
    LEFT JOIN fresh.gemstone_colours c ON c.id = g.colour_id
    LEFT JOIN fresh.gemstone_origins o ON o.id = g.origin_id
    LEFT JOIN fresh.shapes s ON s.id = g.shape_id
    LEFT JOIN fresh.clarities cl ON cl.id = g.clarity_id`;

  add('kind', 'kind');
  if (q.get('variety')) { params.push(q.get('variety')!.toLowerCase()); where.push(`(v.slug = $${params.length} OR v.code = upper($${params.length}))`); }
  if (q.get('family')) { params.push(q.get('family')!.toUpperCase()); where.push(`f.code = $${params.length}`); }
  if (q.get('colour')) { params.push(q.get('colour')!.toLowerCase()); where.push(`c.slug = $${params.length}`); }
  if (q.get('origin')) { params.push(q.get('origin')!.toLowerCase()); where.push(`o.slug = $${params.length}`); }
  if (q.get('shape')) { params.push(q.get('shape')!.toLowerCase()); where.push(`s.slug = $${params.length}`); }
  const status = q.get('status');
  if (status) { params.push(status); where.splice(0, 1, `g.status = $${params.length}`); }
  const min = q.get('price_min'); if (min) { params.push(min); where.push(`g.price_amount >= $${params.length}::numeric`); }
  const max = q.get('price_max'); if (max) { params.push(max); where.push(`g.price_amount <= $${params.length}::numeric`); }

  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const offset = Number(q.get('offset') ?? 0);
  params.push(limit, offset);

  const { rows } = await client.query(
    `SELECT ${GEM_COLUMNS} ${join} WHERE ${where.join(' AND ')} ORDER BY g.ref LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { kind: 'gemstones', count: rows.length, items: rows };
}

export async function gemstoneDetail(client: AnyClient, ref: string) {
  const { rows } = await client.query(
    `SELECT ${GEM_COLUMNS}, g.pieces, g.description, g.updated_at,
      v.family_id IS NOT NULL AS has_family
     FROM fresh.gemstones g
     JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
     JOIN fresh.gemstone_families f ON f.id = v.family_id
     LEFT JOIN fresh.gemstone_colours c ON c.id = g.colour_id
     LEFT JOIN fresh.gemstone_origins o ON o.id = g.origin_id
     LEFT JOIN fresh.shapes s ON s.id = g.shape_id
     LEFT JOIN fresh.clarities cl ON cl.id = g.clarity_id
     WHERE g.ref = $1 AND g.status <> 'ARCHIVED'`,
    [ref.toUpperCase()],
  );
  if (!rows[0]) return null;
  const gem = rows[0];
  const stones = await client.query(
    `SELECT position, weight_ct, length_mm, width_mm, depth_mm FROM fresh.gemstone_stones WHERE gemstone_id = (SELECT id FROM fresh.gemstones WHERE ref = $1) ORDER BY position`,
    [ref.toUpperCase()],
  );
  const treatments = await client.query(
    `SELECT t.name FROM fresh.gemstone_treatments gt JOIN fresh.treatments t ON t.id = gt.treatment_id
     WHERE gt.gemstone_id = (SELECT id FROM fresh.gemstones WHERE ref = $1)`,
    [ref.toUpperCase()],
  );
  const media = await client.query(
    `SELECT role, kind, url, position FROM fresh.assets WHERE owner_kind = 'gemstone' AND owner_id = (SELECT id FROM fresh.gemstones WHERE ref = $1) ORDER BY position`,
    [ref.toUpperCase()],
  );
  return { ...gem, stones: stones.rows, treatments: treatments.rows.map((r) => r.name), media: media.rows };
}

export async function listProducts(client: AnyClient, q: URLSearchParams) {
  const where: string[] = [`p.status <> 'ARCHIVED'`];
  const params: unknown[] = [];
  const add = (raw: string | null, sql: string): void => { if (raw) { params.push(raw); where.push(sql.replace('$X', `$${params.length}`)); } };
  add(q.get('jewellery_type'), `p.jewellery_type_id = (SELECT id FROM fresh.jewellery_types WHERE code = '$X')`);
  add(q.get('kind'), `p.kind = '$X'`);
  const status = q.get('status');
  if (status) { params.push(status); where.splice(0, 1, `p.status = $${params.length}`); }
  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const offset = Number(q.get('offset') ?? 0);
  params.push(limit, offset);
  const { rows } = await client.query(
    `SELECT p.ref, p.slug, p.name, p.kind, p.price_amount, p.currency, p.status, jt.code AS jewellery_type
     FROM fresh.products p JOIN fresh.jewellery_types jt ON jt.id = p.jewellery_type_id
     WHERE ${where.join(' AND ')} ORDER BY p.ref LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { kind: 'products', count: rows.length, items: rows };
}

export async function productDetail(client: AnyClient, ref: string) {
  const { rows } = await client.query(
    `SELECT p.ref, p.slug, p.name, p.kind, p.description, p.price_amount, p.making_fee_amount, p.currency, p.status,
      jt.code AS jewellery_type,
      s.ref AS setting_ref, s.name AS setting_name, s.sku AS setting_sku,
      g.ref AS gemstone_ref, g.name AS gemstone_name, g.weight_ct AS gemstone_weight_ct
     FROM fresh.products p
     JOIN fresh.jewellery_types jt ON jt.id = p.jewellery_type_id
     LEFT JOIN fresh.settings s ON s.id = p.setting_id
     LEFT JOIN fresh.gemstones g ON g.id = p.gemstone_id
     WHERE p.ref = $1 AND p.status <> 'ARCHIVED'`,
    [ref.toUpperCase()],
  );
  if (!rows[0]) return null;
  const p = rows[0];
  const media = await client.query(
    `SELECT role, kind, url, position FROM fresh.assets WHERE owner_kind = 'product' AND owner_id = (SELECT id FROM fresh.products WHERE ref = $1) ORDER BY position`,
    [ref.toUpperCase()],
  );
  return { ...p, media: media.rows };
}

export async function listSettings(client: AnyClient, q: URLSearchParams) {
  const where: string[] = [`s.status <> 'ARCHIVED'`];
  const params: unknown[] = [];
  const add = (raw: string | null, sql: string): void => { if (raw) { params.push(raw); where.push(sql.replace('$X', `$${params.length}`)); } };
  add(q.get('jewellery_type'), `s.jewellery_type_id = (SELECT id FROM fresh.jewellery_types WHERE code = '$X')`);
  add(q.get('metal'), `s.metal_id = (SELECT id FROM fresh.metals WHERE code = '$X')`);
  add(q.get('design'), `s.design_code = '$X'`);
  const status = q.get('status');
  if (status) { params.push(status); where.splice(0, 1, `s.status = $${params.length}`); }
  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const offset = Number(q.get('offset') ?? 0);
  params.push(limit, offset);
  const { rows } = await client.query(
    `SELECT s.ref, s.sku, s.slug, s.name, s.design_code, s.price_amount, s.currency, s.status,
      jt.code AS jewellery_type, st.name AS style, m.code AS metal
     FROM fresh.settings s
     JOIN fresh.jewellery_types jt ON jt.id = s.jewellery_type_id
     JOIN fresh.metals m ON m.id = s.metal_id
     LEFT JOIN fresh.setting_styles st ON st.id = s.style_id
     WHERE ${where.join(' AND ')} ORDER BY s.ref LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { kind: 'settings', count: rows.length, items: rows };
}

export async function varietiesWithCounts(client: AnyClient) {
  const { rows } = await client.query(
    `SELECT v.code, v.slug, v.name, f.code AS family, f.name AS family_name,
            count(g.id)::int AS stones
     FROM fresh.gemstone_varieties v
     JOIN fresh.gemstone_families f ON f.id = v.family_id
     LEFT JOIN fresh.gemstones g ON g.variety_id = v.id AND g.status <> 'ARCHIVED'
     GROUP BY v.id, v.code, v.slug, v.name, f.code, f.name
     ORDER BY stones DESC, v.name`,
  );
  return { count: rows.length, items: rows };
}

export async function familiesWithCounts(client: AnyClient) {
  const { rows } = await client.query(
    `SELECT f.code, f.name, f.description, count(DISTINCT v.id)::int AS varieties,
            count(g.id)::int AS stones
     FROM fresh.gemstone_families f
     JOIN fresh.gemstone_varieties v ON v.family_id = f.id
     LEFT JOIN fresh.gemstones g ON g.variety_id = v.id AND g.status <> 'ARCHIVED'
     GROUP BY f.id, f.code, f.name, f.description ORDER BY f.sort`,
  );
  return { count: rows.length, items: rows };
}
