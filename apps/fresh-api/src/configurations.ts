/**
 * F3-commerce — DYO configurations (fresh-api).
 *
 * A configuration = one setting variant + one gemstone (F-INV-01), priced as
 * the sum of the two REAL component prices. The composition hash is the
 * canonical identity; the code (DYO-####) is the public handle. Conversion
 * to a cart line goes through the same quoted price — never re-estimated.
 */
import crypto from 'node:crypto';
import type { Db } from './db.js';
import { ConflictError, StateError } from './validation.js';

const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

function err(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

export interface ConfigurationDossier {
  code: string;
  short_code: string;
  state: string;
  compatibility_status: string;
  engraving_text: string | null;
  selected_options: Record<string, string>;
  setting: {
    name: string;
    sku: string;
    variantSku: string;
    designCode: string;
    metal: string;
    metalCode: string | null;
    basePrice: number;
  } | null;
  gemstone: {
    name: string;
    gemRef: string;
    carat: number;
    variety: string;
    colour: string;
    clarity: string;
    origin: string;
    shape: string | null;
    treatment: string | null;
    totalWeightCt: number;
    priceAmount: number | null;
  } | null;
  quote: {
    total: number;
    currency: string;
    gemstoneComponent: number;
    settingComponent: number;
    sideStoneComponent: number | null;
    makingComponent: number | null;
    taxComponent: number | null;
    pricingRuleVersion: string | null;
  } | null;
}

async function mintConfigurationCode(client: Db): Promise<string> {
  const locked = await client.query(`UPDATE fresh.code_counters SET next_no = next_no + 1 WHERE scope_key = 'DYO' RETURNING next_no`);
  if (locked.rows[0]) return `DYO-${String(Number(locked.rows[0].next_no) - 1).padStart(4, '0')}`;
  const created = await client.query(
    `INSERT INTO fresh.code_counters (scope_key, next_no) VALUES ('DYO', 2)
     ON CONFLICT (scope_key) DO UPDATE SET next_no = fresh.code_counters.next_no + 1
     RETURNING next_no, (xmax = 0) AS inserted`,
  );
  const row = created.rows[0]!;
  return row.inserted ? 'DYO-0001' : `DYO-${String(Number(row.next_no) - 1).padStart(4, '0')}`;
}

export interface CreateConfigurationInput {
  settingSku: string;
  gemRef: string;
  jewelleryType?: string;
  options?: { metal?: string; ringSize?: string };
}

export async function createConfiguration(
  client: Db,
  input: CreateConfigurationInput,
): Promise<{ code: string; total: number; currency: string; gemstoneComponent: number; settingComponent: number }> {
  const settingRes = await client.query(
    `SELECT s.id, s.ref, s.sku, s.name, s.design_code, s.price_amount::text AS price, s.currency, s.min_ct, s.max_ct,
            jt.code AS jewellery_type, m.code AS metal_code, m.name AS metal_name
     FROM fresh.settings s
     JOIN fresh.jewellery_types jt ON jt.id = s.jewellery_type_id
     JOIN fresh.metals m ON m.id = s.metal_id
     WHERE s.ref = $1 OR s.sku = $1 LIMIT 1`,
    [input.settingSku],
  );
  const setting = settingRes.rows[0];
  if (!setting) throw err(`setting '${input.settingSku}' not found`, 404);
  if (setting.price == null) throw err('setting is unpriced — a quote needs both real component prices', 422);

  const gemRes = await client.query(
    `SELECT g.id, g.ref, g.name, g.kind, g.weight_ct::text AS weight, g.price_amount::text AS price, g.currency, g.status,
            v.name AS variety, c.name AS colour, cl.name AS clarity, o.name AS origin, sh.name AS shape,
            (SELECT string_agg(t.name, ', ') FROM fresh.gemstone_treatments gt JOIN fresh.treatments t ON t.id = gt.treatment_id WHERE gt.gemstone_id = g.id) AS treatments
     FROM fresh.gemstones g
     LEFT JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
     LEFT JOIN fresh.gemstone_colours c ON c.id = g.colour_id
     LEFT JOIN fresh.clarities cl ON cl.id = g.clarity_id
     LEFT JOIN fresh.gemstone_origins o ON o.id = g.origin_id
     LEFT JOIN fresh.shapes sh ON sh.id = g.shape_id
     WHERE g.ref = $1 OR g.slug = $1 LIMIT 1`,
    [input.gemRef],
  );
  const gem = gemRes.rows[0];
  if (!gem) throw err(`gemstone '${input.gemRef}' not found`, 404);
  if (gem.price == null) throw err('gemstone is unpriced — a quote needs both real component prices', 422);
  if (gem.status !== 'ACTIVE' && gem.status !== 'DRAFT') {
    throw new ConflictError(`gemstone ${gem.ref} is ${gem.status} — not available for a new commission`);
  }

  // Composition law: pair stones → EARRINGS only; single stones → never EARRINGS.
  const kind = String(gem.kind);
  if (kind === 'PAIR' && setting.jewellery_type !== 'EARRING') {
    throw err('F-INV-02: pair stones may only be configured into EARRINGS', 422);
  }
  if (kind === 'SINGLE' && setting.jewellery_type === 'EARRING') {
    throw err('F-INV-03: single stones may not be configured into EARRINGS', 422);
  }

  // Carat-range compatibility (the mount's evidenced acceptance window).
  if (setting.min_ct != null && num(gem.weight) < num(setting.min_ct)) {
    throw err(`stone is below the mount's minimum (${num(setting.min_ct)} ct)`, 422);
  }
  if (setting.max_ct != null && num(gem.weight) > num(setting.max_ct)) {
    throw err(`stone exceeds the mount's maximum (${num(setting.max_ct)} ct)`, 422);
  }

  const metal = input.options?.metal ?? String(setting.metal_code ?? '');
  const ringSize = input.options?.ringSize ?? '';
  const canonical = ['fresh-v1', setting.ref, gem.ref, metal, ringSize].join('|');
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  const dupe = await client.query(`SELECT code FROM fresh.configurations WHERE composition_hash = $1`, [hash]);
  if (dupe.rows[0]) {
    // Same composition re-quoted: return the existing configuration.
    const code = String(dupe.rows[0].code);
    const total = num(setting.price) + num(gem.price);
    return { code, total, currency: String(gem.currency ?? 'USD'), gemstoneComponent: num(gem.price), settingComponent: num(setting.price) };
  }

  const code = await mintConfigurationCode(client);
  const total = Math.round((num(setting.price) + num(gem.price)) * 100) / 100;
  const selectedOptions: Record<string, string> = { metal };
  if (ringSize) selectedOptions.ringSize = ringSize;

  await client.query(
    `INSERT INTO fresh.configurations (code, composition_hash, jewellery_type_id, setting_id, gemstone_id,
       status, quoted_amount, quoted_at)
     VALUES ($1,$2,(SELECT id FROM fresh.jewellery_types WHERE code = $3),$4,$5,'QUOTED',$6, now())`,
    [code, hash, setting.jewellery_type, setting.id, gem.id, total],
  );

  return { code, total, currency: String(gem.currency ?? 'USD'), gemstoneComponent: num(gem.price), settingComponent: num(setting.price) };
}

export async function getConfiguration(client: Db, code: string): Promise<ConfigurationDossier | null> {
  const { rows } = await client.query(
    `SELECT cfg.code, cfg.status, cfg.quoted_amount::text AS quoted, cfg.quoted_at, cfg.composition_hash,
            s.ref AS setting_ref, s.sku AS setting_sku, s.name AS setting_name, s.design_code, s.min_ct, s.max_ct,
            m.name AS metal_name, m.code AS metal_code,
            g.ref AS gem_ref, g.name AS gem_name, g.kind AS gem_kind, g.weight_ct::text AS gem_weight,
            g.price_amount::text AS gem_price, g.currency,
            jt.code AS jewellery_type,
            v.name AS variety, c.name AS colour, cl.name AS clarity, o.name AS origin, sh.name AS shape,
            (SELECT string_agg(t.name, ', ') FROM fresh.gemstone_treatments gt JOIN fresh.treatments t ON t.id = gt.treatment_id WHERE gt.gemstone_id = g.id) AS treatments
     FROM fresh.configurations cfg
     JOIN fresh.settings s ON s.id = cfg.setting_id
     JOIN fresh.gemstones g ON g.id = cfg.gemstone_id
     JOIN fresh.jewellery_types jt ON jt.id = cfg.jewellery_type_id
     JOIN fresh.metals m ON m.id = s.metal_id
     LEFT JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
     LEFT JOIN fresh.gemstone_colours c ON c.id = g.colour_id
     LEFT JOIN fresh.clarities cl ON cl.id = g.clarity_id
     LEFT JOIN fresh.gemstone_origins o ON o.id = g.origin_id
     LEFT JOIN fresh.shapes sh ON sh.id = g.shape_id
     WHERE cfg.code = $1`,
    [code.toUpperCase()],
  );
  const row = rows[0];
  if (!row) return null;

  const gemPrice = row.gem_price == null ? null : num(row.gem_price);
  const settingPrice = num(row.quoted) - (gemPrice ?? 0);

  return {
    code: String(row.code),
    short_code: String(row.code),
    state: String(row.status),
    compatibility_status: 'COMPATIBLE',
    engraving_text: null,
    selected_options: {},
    setting: {
      name: String(row.setting_name),
      sku: String(row.setting_sku ?? row.setting_ref),
      variantSku: String(row.setting_ref),
      designCode: String(row.design_code),
      metal: String(row.metal_name),
      metalCode: row.metal_code == null ? null : String(row.metal_code),
      basePrice: settingPrice,
    },
    gemstone: {
      name: String(row.gem_name),
      gemRef: String(row.gem_ref),
      carat: num(row.gem_weight),
      variety: String(row.variety ?? ''),
      colour: String(row.colour ?? ''),
      clarity: String(row.clarity ?? ''),
      origin: String(row.origin ?? ''),
      shape: row.shape == null ? null : String(row.shape),
      treatment: row.treatments == null ? null : String(row.treatments),
      totalWeightCt: num(row.gem_weight),
      priceAmount: gemPrice,
    },
    quote: row.quoted == null
      ? null
      : {
          total: num(row.quoted),
          currency: String(row.currency ?? 'USD'),
          gemstoneComponent: gemPrice ?? 0,
          settingComponent: settingPrice,
          sideStoneComponent: null,
          makingComponent: null,
          taxComponent: null,
          pricingRuleVersion: null,
        },
  };
}

/** Add a QUOTED configuration to the cart at its quoted price. */
export async function addConfigurationToCart(client: Db, token: string, code: string): Promise<void> {
  const row = (await client.query(`SELECT status FROM fresh.configurations WHERE code = $1`, [code.toUpperCase()])).rows[0];
  if (!row) throw err(`configuration '${code}' not found`, 404);
  if (row.status !== 'QUOTED' && row.status !== 'OPEN') {
    throw new ConflictError(`configuration ${code} is ${row.status}`);
  }
  const cfg = await getConfiguration(client, code);
  if (!cfg) throw err(`configuration '${code}' not found`, 404);
  if (cfg.quote == null) throw err('configuration has no quote', 422);

  const cart = await client.query(`SELECT id FROM fresh.carts WHERE token = $1 AND status = 'ACTIVE'`, [token]);
  if (!cart.rows[0]) throw err('cart not found', 404);
  const cartId = Number(cart.rows[0].id);

  const cfgRow = await client.query(`SELECT id FROM fresh.configurations WHERE code = $1`, [cfg.code]);
  const cfgId = Number(cfgRow.rows[0].id);

  const existing = await client.query(
    `SELECT id FROM fresh.cart_items WHERE cart_id = $1 AND configuration_id = $2`,
    [cartId, cfgId],
  );
  if (existing.rows[0]) return; // already in the tray

  await client.query(
    `INSERT INTO fresh.cart_items (cart_id, owner_kind, configuration_id, quantity, unit_price, currency)
     VALUES ($1,'configuration',$2,1,$3,$4)`,
    [cartId, cfgId, cfg.quote.total, cfg.quote.currency],
  );
}
