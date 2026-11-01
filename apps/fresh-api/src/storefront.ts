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
  const wmin = q.get('weight_min'); if (wmin) { params.push(wmin); where.push(`g.weight_ct >= $${params.length}::numeric`); }
  const wmax = q.get('weight_max'); if (wmax) { params.push(wmax); where.push(`g.weight_ct <= $${params.length}::numeric`); }
  let orderBy = 'g.ref';
  const text = q.get('q');
  if (text) {
    params.push(`%${text}%`);
    const like = params.length;
    params.push(text);
    const raw = params.length;
    where.push(
      `(g.name ILIKE $${like} OR g.slug ILIKE $${like} OR g.ref ILIKE $${like} OR v.name ILIKE $${like}
        OR fresh.similarity(lower(g.name), lower($${raw})) > 0.2 OR fresh.similarity(lower(v.name), lower($${raw})) > 0.2)`,
    );
    orderBy = `greatest(fresh.similarity(lower(g.name), lower($${raw})), fresh.similarity(lower(v.name), lower($${raw}))) DESC, g.ref`;
  }
  const refs = q.get('refs');
  if (refs) {
    const list = refs.split(',').map((r) => r.trim()).filter(Boolean).slice(0, 100);
    if (list.length) {
      params.push(list);
      where.push(`g.ref = ANY($${params.length}::text[])`);
    }
  }

  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const offset = Number(q.get('offset') ?? 0);
  params.push(limit, offset);

  const { rows } = await client.query(
    `SELECT ${GEM_COLUMNS},
      g.pieces, g.length_mm, g.width_mm, g.depth_mm, g.description,
      (SELECT url FROM fresh.assets a WHERE a.owner_kind='gemstone' AND a.owner_id=g.id ORDER BY position LIMIT 1) AS primary_image,
      (SELECT json_agg(json_build_object('position', st.position, 'weight_ct', st.weight_ct, 'l', st.length_mm, 'w', st.width_mm, 'h', st.depth_mm) ORDER BY st.position)
         FROM fresh.gemstone_stones st WHERE st.gemstone_id = g.id) AS pieces_detail
     ${join} WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
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
     WHERE (g.ref = upper($1) OR g.slug = lower($1)) AND g.status <> 'ARCHIVED'`,
    [ref],
  );
  if (!rows[0]) return null;
  const gem = rows[0];
  const stones = await client.query(
    `SELECT position, weight_ct, length_mm, width_mm, depth_mm FROM fresh.gemstone_stones WHERE gemstone_id = $1 ORDER BY position`,
    [gem.id],
  );
  const treatments = await client.query(
    `SELECT t.name FROM fresh.gemstone_treatments gt JOIN fresh.treatments t ON t.id = gt.treatment_id WHERE gt.gemstone_id = $1`,
    [gem.id],
  );
  const media = await client.query(
    `SELECT role, kind, url, position FROM fresh.assets WHERE owner_kind = 'gemstone' AND owner_id = $1 ORDER BY position`,
    [gem.id],
  );
  const certificates = await client.query(
    `SELECT agency, cert_no, url, issued_at::text AS issued_at
     FROM fresh.certificates
     WHERE owner_kind = 'gemstone' AND owner_id = $1 AND verified = 'VERIFIED'
     ORDER BY issued_at DESC NULLS LAST`,
    [gem.id],
  );
  return {
    ...gem,
    stones: stones.rows,
    treatments: treatments.rows.map((r) => r.name),
    media: media.rows,
    certificates: certificates.rows,
  };
}

export async function listProducts(client: AnyClient, q: URLSearchParams) {
  const where: string[] = [`p.status <> 'ARCHIVED'`];
  const params: unknown[] = [];
  const add = (raw: string | null, sql: string): void => { if (raw) { params.push(raw); where.push(sql.replace('$X', `$${params.length}`)); } };
  add(q.get('jewellery_type'), `p.jewellery_type_id = (SELECT id FROM fresh.jewellery_types WHERE code = '$X')`);
  add(q.get('kind'), `p.kind = '$X'`);
  const status = q.get('status');
  if (status) { params.push(status); where.splice(0, 1, `p.status = $${params.length}`); }
  const text = q.get('q');
  if (text) {
    params.push(`%${text}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.slug ILIKE $${params.length} OR p.ref ILIKE $${params.length})`);
  }
  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const offset = Number(q.get('offset') ?? 0);
  params.push(limit, offset);
  const { rows } = await client.query(
    `SELECT p.ref, p.slug, p.name, p.kind, p.price_amount, p.currency, p.status, jt.code AS jewellery_type,
      g.weight_ct AS gemstone_weight_ct, g.ref AS gemstone_ref, g.kind AS gemstone_kind,
      v.slug AS variety_slug, c.name AS colour,
      (SELECT url FROM fresh.assets a WHERE a.owner_kind='product' AND a.owner_id=p.id ORDER BY position LIMIT 1) AS primary_image
     FROM fresh.products p
     JOIN fresh.jewellery_types jt ON jt.id = p.jewellery_type_id
     LEFT JOIN fresh.gemstones g ON g.id = p.gemstone_id
     LEFT JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
     LEFT JOIN fresh.gemstone_colours c ON c.id = g.colour_id
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
  add(q.get('jewellery_type'), `s.jewellery_type_id = (SELECT id FROM fresh.jewellery_types WHERE code = $X)`);
  add(q.get('metal'), `s.metal_id = (SELECT id FROM fresh.metals WHERE code = $X)`);
  add(q.get('design'), `s.design_code = $X`);
  const status = q.get('status');
  if (status) { params.push(status); where.splice(0, 1, `s.status = $${params.length}`); }
  let orderBy = 's.ref';
  const text = q.get('q');
  if (text) {
    params.push(`%${text}%`);
    const like = params.length;
    params.push(text);
    const raw = params.length;
    where.push(
      `(s.name ILIKE $${like} OR s.slug ILIKE $${like} OR s.ref ILIKE $${like} OR s.design_code ILIKE $${like}
        OR fresh.similarity(lower(s.name), lower($${raw})) > 0.2)`,
    );
    orderBy = `greatest(fresh.similarity(lower(s.name), lower($${raw})), fresh.similarity(lower(s.slug), lower($${raw}))) DESC, s.ref`;
  }
  const refs = q.get('refs');
  if (refs) {
    const list = refs.split(',').map((r) => r.trim()).filter(Boolean).slice(0, 100);
    if (list.length) {
      params.push(list);
      where.push(`s.ref = ANY($${params.length}::text[])`);
    }
  }
  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const offset = Number(q.get('offset') ?? 0);
  params.push(limit, offset);
  const { rows } = await client.query(
    `SELECT s.ref, s.sku, s.slug, s.name, s.design_code, s.price_amount, s.currency, s.status,
      s.min_ct, s.max_ct, s.description,
      jt.code AS jewellery_type, st.name AS style, st.slug AS style_slug, m.code AS metal, m.name AS metal_name,
      (SELECT json_agg(sh.slug) FROM fresh.setting_compatible_shapes cs JOIN fresh.shapes sh ON sh.id = cs.shape_id WHERE cs.setting_id = s.id) AS compatible_shapes,
      (SELECT url FROM fresh.assets a WHERE a.owner_kind='setting' AND a.owner_id=s.id ORDER BY position LIMIT 1) AS primary_image
     FROM fresh.settings s
     JOIN fresh.jewellery_types jt ON jt.id = s.jewellery_type_id
     JOIN fresh.metals m ON m.id = s.metal_id
     LEFT JOIN fresh.setting_styles st ON st.id = s.style_id
     WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { kind: 'settings', count: rows.length, items: rows };
}

export async function listAssets(client: AnyClient, q: URLSearchParams) {
  const params: unknown[] = [];
  const where: string[] = [];
  const kind = q.get('kind');
  if (kind) { params.push(kind); where.push(`a.kind = $${params.length}`); }
  const ownerKind = q.get('owner_kind');
  if (ownerKind) { params.push(ownerKind); where.push(`a.owner_kind = $${params.length}`); }
  const state = q.get('state');
  if (state) { params.push(state); where.push(`a.role = $${params.length}`); }
  const limit = Math.min(Number(q.get('limit') ?? 50), 200);
  const { rows } = await client.query(
    `SELECT a.id, a.owner_kind, a.owner_id, a.role, a.kind, a.vto_ready, a.url, a.position, a.alt
     FROM fresh.assets a ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.position LIMIT ${limit}`,
    params,
  );
  return { count: rows.length, items: rows };
}

export async function listMetals(client: AnyClient) {
  const { rows } = await client.query(`SELECT code, name, purity FROM fresh.metals ORDER BY sort`);
  return { count: rows.length, items: rows };
}

export async function listShapes(client: AnyClient) {
  const { rows } = await client.query(`SELECT slug, name FROM fresh.shapes ORDER BY sort, name`);
  return { count: rows.length, items: rows };
}

export async function listColours(client: AnyClient) {
  const { rows } = await client.query(`SELECT slug, name, hex_preview FROM fresh.gemstone_colours ORDER BY sort, name`);
  return { count: rows.length, items: rows };
}

export async function listOrigins(client: AnyClient) {
  const { rows } = await client.query(`SELECT slug, name FROM fresh.gemstone_origins ORDER BY sort, name`);
  return { count: rows.length, items: rows };
}

export async function settingsByDesign(client: AnyClient, design: string) {
  const { rows } = await client.query(
    `SELECT s.ref, s.sku, s.slug, s.name, s.design_code, s.price_amount, s.currency, s.status, s.min_ct, s.max_ct,
      m.code AS metal, m.name AS metal_name, jt.code AS jewellery_type, st.slug AS style_slug, st.name AS style
     FROM fresh.settings s
     JOIN fresh.metals m ON m.id = s.metal_id
     JOIN fresh.jewellery_types jt ON jt.id = s.jewellery_type_id
     LEFT JOIN fresh.setting_styles st ON st.id = s.style_id
     WHERE s.design_code = $1 AND s.status <> 'ARCHIVED' ORDER BY m.sort`,
    [design.toUpperCase()],
  );
  const shapes = rows[0]
    ? await client.query(
        `SELECT sh.slug FROM fresh.setting_compatible_shapes cs JOIN fresh.shapes sh ON sh.id = cs.shape_id WHERE cs.setting_id = $1`,
        [rows[0].ref ? (await client.query(`SELECT id FROM fresh.settings WHERE ref = $1`, [rows[0].ref])).rows[0]?.id : null],
      )
    : { rows: [] };
  return { count: rows.length, items: rows, compatible_shapes: shapes.rows.map((r) => r.slug) };
}

export async function settingDetailByCode(client: AnyClient, key: string) {
  const head = await client.query(
    `SELECT design_code FROM fresh.settings WHERE lower(ref) = lower($1) OR lower(slug) = lower($1) LIMIT 1`,
    [key.toLowerCase()],
  );
  if (!head.rows[0]) return null;
  const group = await settingsByDesign(client, String(head.rows[0].design_code));
  if (!group.items.length) return null;
  const primary = group.items.find((r) => r.ref.toLowerCase() === key.toLowerCase()) ?? group.items[0]!;
  return { ...primary, variants: group.items, compatible_shapes: group.compatible_shapes };
}

export async function varietiesWithCounts(client: AnyClient) {
  const { rows } = await client.query(
    `SELECT v.code, v.slug, v.name, v.species, f.code AS family, f.name AS family_name,
            count(g.id)::int AS stones
     FROM fresh.gemstone_varieties v
     JOIN fresh.gemstone_families f ON f.id = v.family_id
     LEFT JOIN fresh.gemstones g ON g.variety_id = v.id AND g.status <> 'ARCHIVED'
     GROUP BY v.id, v.code, v.slug, v.name, v.species, f.code, f.name
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


const EXISTS_QUERIES: Record<string, string> = {
  gemstone: `SELECT 1 FROM fresh.gemstones WHERE (slug = $1 OR ref = upper($1)) AND status <> 'ARCHIVED' LIMIT 1`,
  setting: `SELECT 1 FROM fresh.settings WHERE (slug = $1 OR ref = $1) AND status <> 'ARCHIVED' LIMIT 1`,
  product: `SELECT 1 FROM fresh.products WHERE (slug = $1 OR ref = $1) AND status <> 'ARCHIVED' LIMIT 1`,
  variety: `SELECT 1 FROM fresh.gemstone_varieties WHERE slug = $1 OR code = upper($1) LIMIT 1`,
  configuration: `SELECT 1 FROM fresh.configurations WHERE code = $1 LIMIT 1`,
};

/** Cheap existence check used by the edge to return true 404s for unknown slugs. */
export async function catalogueExists(client: AnyClient, kind: string, key: string) {
  const k = key.trim();
  const sql = EXISTS_QUERIES[kind];
  if (!sql || !k || k.length > 200) return { exists: false };
  try {
    const { rows } = await client.query(sql, [k]);
    return { exists: Boolean(rows[0]) };
  } catch {
    return { exists: true };
  }
}


const SITEMAP_KINDS: Record<string, { table: string; column: string; where: string }> = {
  gemstone: { table: 'fresh.gemstones', column: 'slug', where: `status <> 'ARCHIVED' AND kind = 'SINGLE'` },
  setting: { table: 'fresh.settings', column: 'ref', where: `status <> 'ARCHIVED'` },
  product: { table: 'fresh.products', column: 'slug', where: `status <> 'ARCHIVED'` },
  variety: { table: 'fresh.gemstone_varieties', column: 'slug', where: 'true' },
};

/** Sitemap pages: slugs/refs only, up to 5,000 rows per chunk. */
export async function sitemapPage(client: AnyClient, kind: string, offset: number, limit: number) {
  const spec = SITEMAP_KINDS[kind];
  if (!spec) return { total: 0, items: [] };
  const count = await client.query(`SELECT count(*)::int AS n FROM ${spec.table} WHERE ${spec.where}`);
  const rows = await client.query(
    `SELECT ${spec.column} AS key FROM ${spec.table} WHERE ${spec.where}
     ORDER BY ${spec.column} LIMIT $1 OFFSET $2`,
    [Math.min(Math.max(limit, 1), 5000), Math.max(offset, 0)],
  );
  return { total: Number(count.rows[0]?.n ?? 0), items: rows.rows };
}
