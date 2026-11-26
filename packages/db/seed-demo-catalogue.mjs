#!/usr/bin/env node
/**
 * packages/db/seed-demo-catalogue.mjs
 *
 * Demo-only catalogue rows so no storefront page has to be judged against an
 * empty database. This is NOT migration data and it is not a substitute for
 * it. Every row it writes is marked in-band:
 *
 *   products.options        = { "demo": true, "demoBatch": "storefront-v2" }
 *   products.source_url     = NULL
 *   products.source_sku     = NULL
 *   products.sku_evidence_status = 'INFERRED'
 *   products.price_evidence = 'INFERRED'
 *   settings.evidence_status / setting_variants.evidence_status = 'INFERRED'
 *   gemstones.ref_evidence_status / price_evidence = 'INFERRED'
 *
 * No treatment, clarity, origin or certificate is invented: those columns
 * stay NULL. No price-per-carat is derived. The titles, weights and prices
 * are illustrative demo values, and the product subtitle says so on the page.
 *
 * Idempotent by construction: every row uses a fixed UUID or a natural key
 * and `ON CONFLICT DO NOTHING`. A second run inserts zero rows and reports
 * the same totals.
 *
 * Usage:
 *   node --env-file=../../.env packages/db/seed-demo-catalogue.mjs
 *   node --env-file=../../.env packages/db/seed-demo-catalogue.mjs --dry-run
 *
 * Optional parameters (environment):
 *   DEMO_PRICE_MULTIPLIER  default 1, scales every demo price
 *   DEMO_CURRENCY          default USD, must be a 3-letter code
 *
 * Safety: refuses to run unless current_database() starts with `maihan_dev`,
 * matching the migration and reference-seed guards. It never touches a
 * non-demo row (all writes are keyed to demo identities).
 */
import { Client } from 'pg';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const multiplierRaw = Number(process.env.DEMO_PRICE_MULTIPLIER ?? '1');
const multiplier = Number.isFinite(multiplierRaw) && multiplierRaw > 0 ? multiplierRaw : 1;
const currency = (process.env.DEMO_CURRENCY ?? 'USD').toUpperCase();
if (!/^[A-Z]{3}$/.test(currency)) {
  console.error('seed-demo-catalogue: DEMO_CURRENCY must be a 3-letter code');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('seed-demo-catalogue: DATABASE_URL is not set (the single sanctioned database variable)');
  process.exit(1);
}

const local = /(?:^|@)(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/)/.test(url);
const client = new Client({
  connectionString: url,
  ...(local ? {} : { ssl: { rejectUnauthorized: false } }),
});

const money = (amount) => Number((amount * multiplier).toFixed(2));

const ID = {
  speciesBeryl: 'd0000000-0000-4000-8000-000000000001',
  speciesCorundum: 'd0000000-0000-4000-8000-000000000002',
  varietyEmerald: 'd0000000-0000-4000-8000-000000000011',
  varietySapphire: 'd0000000-0000-4000-8000-000000000012',
  colourGreen: 'd0000000-0000-4000-8000-000000000021',
  colourBlue: 'd0000000-0000-4000-8000-000000000022',
  settingHalo: 'd0000000-0000-4000-8000-000000000031',
  settingStud: 'd0000000-0000-4000-8000-000000000032',
  variantHaloY18: 'd0000000-0000-4000-8000-000000000041',
  variantHaloW18: 'd0000000-0000-4000-8000-000000000042',
  variantStudY18: 'd0000000-0000-4000-8000-000000000043',
  variantStudPT: 'd0000000-0000-4000-8000-000000000044',
  gemEmeraldLoose: 'd0000000-0000-4000-8000-000000000051',
  gemSapphireLoose: 'd0000000-0000-4000-8000-000000000052',
  gemEmeraldPair: 'd0000000-0000-4000-8000-000000000053',
  gemSapphirePair: 'd0000000-0000-4000-8000-000000000054',
  gemEmeraldReady: 'd0000000-0000-4000-8000-000000000055',
  gemSapphireReady: 'd0000000-0000-4000-8000-000000000056',
  gemEmeraldConfigured: 'd0000000-0000-4000-8000-000000000057',
  gemSapphireConfiguredPair: 'd0000000-0000-4000-8000-000000000058',
};

const counts = {};
function bump(table, n) {
  counts[table] = (counts[table] ?? 0) + (n ?? 0);
}

async function insert(sql, params) {
  const result = await client.query(sql, params);
  return result;
}

async function main() {
  await client.connect();
  const who = await client.query('SELECT current_database() AS db, version() AS version');
  const db = who.rows[0]?.db ?? '';
  if (!db.startsWith('maihan_dev')) {
    throw new Error(`refusing to seed: current_database() is "${db}"; the dev contract is maihan_dev`);
  }
  console.log(`seed-demo-catalogue: target ${db}${dryRun ? ' (dry run)' : ''}`);

  await client.query('BEGIN');

  /* ── Reference vocabulary the catalogue needs ───────────────────────────── */
  const refs = [
    ['gemstone_species', 'INSERT INTO gemstone_species (id, code, name, evidence_status) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING RETURNING id', [ID.speciesBeryl, 'BERYL', 'Beryl', 'INFERRED']],
    ['gemstone_species', 'INSERT INTO gemstone_species (id, code, name, evidence_status) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING RETURNING id', [ID.speciesCorundum, 'CORUNDUM', 'Corundum', 'INFERRED']],
    ['metals', `INSERT INTO metals (code, label, purity_label, purity_value, colour, slug_phrase, sort_order, state, evidence_status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, ['Y18', '18K Yellow Gold', '18K', 75.0, 'yellow', '18k-yellow', 10]],
    ['metals', `INSERT INTO metals (code, label, purity_label, purity_value, colour, slug_phrase, sort_order, state, evidence_status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, ['W18', '18K White Gold', '18K', 75.0, 'white', '18k-white', 20]],
    ['metals', `INSERT INTO metals (code, label, purity_label, purity_value, colour, slug_phrase, sort_order, state, evidence_status)
                VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, ['PT', 'Platinum 950', '950', 95.0, 'platinum', 'platinum-950', 30]],
    ['jewellery_types', `INSERT INTO jewellery_types (code, label, slug, uses_pair, uses_single, state, evidence_status)
                         VALUES ('RING','Ring','ring',FALSE,TRUE,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
    ['jewellery_types', `INSERT INTO jewellery_types (code, label, slug, uses_pair, uses_single, state, evidence_status)
                         VALUES ('EARRINGS','Earrings','earrings',TRUE,FALSE,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
    ['jewellery_types', `INSERT INTO jewellery_types (code, label, slug, uses_pair, uses_single, state, evidence_status)
                         VALUES ('PENDANT','Pendant','pendant',FALSE,TRUE,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
    ['jewellery_types', `INSERT INTO jewellery_types (code, label, slug, uses_pair, uses_single, state, evidence_status)
                         VALUES ('NECKLACE','Necklace','necklace',FALSE,TRUE,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
    ['jewellery_types', `INSERT INTO jewellery_types (code, label, slug, uses_pair, uses_single, state, evidence_status)
                         VALUES ('BRACELET','Bracelet','bracelet',FALSE,TRUE,'ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
    ['setting_styles', `INSERT INTO setting_styles (code, label, slug, state, evidence_status)
                        VALUES ('halo','Halo','halo','ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
    ['setting_styles', `INSERT INTO setting_styles (code, label, slug, state, evidence_status)
                        VALUES ('stud','Stud','stud','ACTIVE','INFERRED') ON CONFLICT (code) DO NOTHING RETURNING code`, []],
  ];
  for (const [table, sql, params] of refs) {
    const result = await insert(sql, params);
    bump(table, result.rowCount);
  }

  const species = await client.query('SELECT id, code FROM gemstone_species WHERE code = ANY($1)', [['BERYL', 'CORUNDUM']]);
  const speciesId = Object.fromEntries(species.rows.map((r) => [r.code, r.id]));

  /* ── Two ACTIVE varieties and two ACTIVE colours ────────────────────────── */
  const varieties = [
    [ID.varietyEmerald, speciesId.BERYL, 'emerald', 'Emerald', 'Emerald'],
    [ID.varietySapphire, speciesId.CORUNDUM, 'sapphire', 'Sapphire', 'Sapphire'],
  ];
  for (const [id, species_id, slug, name, display_name] of varieties) {
    const result = await insert(
      `INSERT INTO gemstone_varieties
         (id, species_id, slug, name, display_name, source_route, description, is_organic, state, evidence_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,'ACTIVE','INFERRED')
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [id, species_id, slug, name, display_name, `/${slug}`,
       `Demo variety created for storefront interface review. It is not migrated source data.`],
    );
    bump('gemstone_varieties', result.rowCount);
  }

  const colours = [
    [ID.colourGreen, 'green', 'Green', 10],
    [ID.colourBlue, 'blue', 'Blue', 20],
  ];
  for (const [id, slug, name, sort_order] of colours) {
    const result = await insert(
      `INSERT INTO gemstone_colours (id, slug, name, is_chromatic, sort_order, state, evidence_status)
       VALUES ($1,$2,$3,TRUE,$4,'ACTIVE','INFERRED')
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [id, slug, name, sort_order],
    );
    bump('gemstone_colours', result.rowCount);
  }

  const varietyRows = await client.query('SELECT id, slug FROM gemstone_varieties WHERE slug = ANY($1)', [['emerald', 'sapphire']]);
  const varietyId = Object.fromEntries(varietyRows.rows.map((r) => [r.slug, r.id]));
  const colourRows = await client.query('SELECT id, slug FROM gemstone_colours WHERE slug = ANY($1)', [['green', 'blue']]);
  const colourId = Object.fromEntries(colourRows.rows.map((r) => [r.slug, r.id]));

  /* ── Two setting designs, four metal variants ───────────────────────────── */
  const settings = [
    [ID.settingHalo, '9801', 'Halo Ring Setting', 'halo', 'RING', 12],
    [ID.settingStud, '9802', 'Four-Prong Stud Setting', 'stud', 'EARRINGS', 0],
  ];
  for (const [id, design_code, name, style, jewellery_type, side_stone_count] of settings) {
    const result = await insert(
      `INSERT INTO settings
         (id, design_code, sku_prefix, name, style_id, jewellery_type, description,
          is_vedic, side_stone_count, source_url, state, evidence_status)
       VALUES ($1,$2,'JS',$3,(SELECT id FROM setting_styles WHERE code=$4),$5,$6,
          FALSE,$7,NULL,'ACTIVE','INFERRED')
       ON CONFLICT (design_code) DO NOTHING RETURNING id`,
      [id, design_code, name, style, jewellery_type,
       `Demo setting design created for storefront interface review. It is not migrated source data.`,
       side_stone_count],
    );
    bump('settings', result.rowCount);
  }

  const variants = [
    [ID.variantHaloY18, ID.settingHalo, 'Y18', 'JS9801Y18', 'demo-halo-ring-setting-js9801y18', 1650],
    [ID.variantHaloW18, ID.settingHalo, 'W18', 'JS9801W18', 'demo-halo-ring-setting-js9801w18', 1720],
    [ID.variantStudY18, ID.settingStud, 'Y18', 'JS9802Y18', 'demo-stud-earring-setting-js9802y18', 1250],
    [ID.variantStudPT, ID.settingStud, 'PT', 'JS9802PT', 'demo-stud-earring-setting-js9802pt', 1480],
  ];
  for (const [id, setting_id, metal_code, sku, slug, base_price] of variants) {
    const result = await insert(
      `INSERT INTO setting_variants
         (id, setting_id, metal_code, sku, slug, base_price, currency, price_evidence,
          availability, state, source_url, evidence_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'INFERRED',TRUE,'ACTIVE',NULL,'INFERRED')
       ON CONFLICT (sku) DO NOTHING RETURNING id`,
      [id, setting_id, metal_code, sku, slug, money(base_price), currency],
    );
    bump('setting_variants', result.rowCount);
  }

  const variantRows = await client.query('SELECT id, sku FROM setting_variants WHERE sku = ANY($1)', [['JS9801Y18', 'JS9801W18', 'JS9802Y18', 'JS9802PT']]);
  const variantId = Object.fromEntries(variantRows.rows.map((r) => [r.sku, r.id]));

  /* ── Eight stones: four singles, three pairs, one configured pair ───────── */
  const demoRawSpec = { demo: true, demoBatch: 'storefront-v2', note: 'Illustrative demo record, not migrated source data.' };
  const stones = [
    // id, gem_ref, kind, variety, colour, weight, shape, price
    [ID.gemEmeraldLoose, 'K-DEMO-001', 'SINGLE', 'emerald', 'green', 1.02, 'OVAL', 4850],
    [ID.gemSapphireLoose, 'K-DEMO-002', 'SINGLE', 'sapphire', 'blue', 2.35, 'CUSHION', 9200],
    [ID.gemEmeraldPair, 'PR-DEMO-001', 'PAIR', 'emerald', 'green', 1.64, 'ROUND', 6900],
    [ID.gemSapphirePair, 'PR-DEMO-002', 'PAIR', 'sapphire', 'blue', 2.12, 'OVAL', 12400],
    [ID.gemEmeraldReady, 'K-DEMO-003', 'SINGLE', 'emerald', 'green', 1.05, 'OVAL', 5100],
    [ID.gemSapphireReady, 'K-DEMO-004', 'SINGLE', 'sapphire', 'blue', 2.4, 'CUSHION', 9600],
    [ID.gemEmeraldConfigured, 'K-DEMO-005', 'SINGLE', 'emerald', 'green', 1.08, 'OVAL', 5250],
    [ID.gemSapphireConfiguredPair, 'PR-DEMO-003', 'PAIR', 'sapphire', 'blue', 1.7, 'ROUND', 7100],
  ];
  for (const [id, gem_ref, kind, variety, colour, weight, shape, price] of stones) {
    const result = await insert(
      `INSERT INTO gemstones
         (id, gem_ref, kind, variety_id, species_id, total_weight_ct, stone_count,
          colour_id, shape, cut_label, cutting_style, price_amount, currency, price_evidence,
          availability, availability_source, availability_checked_at, state,
          source_url, source_slug, ref_derived_from, ref_evidence_status, raw_spec)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'FACETED',$11,$12,'INFERRED',
          TRUE,'DEMO',now(),'ACTIVE',NULL,NULL,NULL,'INFERRED',$13)
       ON CONFLICT (gem_ref) DO NOTHING RETURNING id`,
      [id, gem_ref, kind, varietyId[variety], speciesId[variety === 'emerald' ? 'BERYL' : 'CORUNDUM'],
       weight, kind === 'PAIR' ? 2 : 1, colourId[colour], shape,
       kind === 'PAIR' ? 'Matched pair' : 'Faceted stone',
       money(price), currency, JSON.stringify(demoRawSpec)],
    );
    bump('gemstones', result.rowCount);
  }

  const stoneRows = await client.query('SELECT id, gem_ref, total_weight_ct, kind FROM gemstones WHERE gem_ref LIKE $1', ['%DEMO%']);
  const stoneByRef = Object.fromEntries(stoneRows.rows.map((r) => [r.gem_ref, r]));
  for (const stone of stoneRows.rows) {
    const total = Number(stone.total_weight_ct);
    const positions = stone.kind === 'PAIR' ? [1, 2] : [1];
    for (const position of positions) {
      const weight = stone.kind === 'PAIR' ? Number((total / 2).toFixed(3)) : total;
      const result = await insert(
        `INSERT INTO gemstone_stones
           (gemstone_id, position, weight_ct, raw_weight_text, parse_confidence, evidence_status)
         VALUES ($1,$2,$3,$4,1.000,'INFERRED')
         ON CONFLICT (gemstone_id, position) DO NOTHING RETURNING id`,
        [stone.id, position, weight, `${weight} ct (demo)`],
      );
      bump('gemstone_stones', result.rowCount);
    }
  }

  /* ── Ten products: two per kind, CONFIGURED satisfying INV-01 ───────────── */
  const productRows = [
    {
      kind: 'LOOSE_STONE', slug: 'demo-emerald-oval-1-02-ct', title: 'Emerald Oval, 1.02 ct',
      variety: 'emerald', colour: 'green', jewellery_type: 'RING', weight: 1.02, stones: 1,
      price: 4850, gemstone_id: stoneByRef['K-DEMO-001'].id,
    },
    {
      kind: 'LOOSE_STONE', slug: 'demo-sapphire-cushion-2-35-ct', title: 'Sapphire Cushion, 2.35 ct',
      variety: 'sapphire', colour: 'blue', jewellery_type: 'RING', weight: 2.35, stones: 1,
      price: 9200, gemstone_id: stoneByRef['K-DEMO-002'].id,
    },
    {
      kind: 'STONE_PAIR', slug: 'demo-emerald-round-pair-1-64-ct', title: 'Emerald Round Pair, 1.64 ct total',
      variety: 'emerald', colour: 'green', jewellery_type: 'EARRINGS', weight: 1.64, stones: 2,
      price: 6900, gemstone_pair_id: stoneByRef['PR-DEMO-001'].id,
    },
    {
      kind: 'STONE_PAIR', slug: 'demo-sapphire-oval-pair-2-12-ct', title: 'Sapphire Oval Pair, 2.12 ct total',
      variety: 'sapphire', colour: 'blue', jewellery_type: 'EARRINGS', weight: 2.12, stones: 2,
      price: 12400, gemstone_pair_id: stoneByRef['PR-DEMO-002'].id,
    },
    {
      kind: 'READY_MADE', slug: 'demo-emerald-halo-ring', title: 'Emerald Halo Ring, 1.05 ct',
      variety: 'emerald', colour: 'green', jewellery_type: 'RING', weight: 1.05, stones: 1,
      price: 7950, gemstone_id: stoneByRef['K-DEMO-003'].id,
    },
    {
      kind: 'READY_MADE', slug: 'demo-sapphire-solitaire-ring', title: 'Sapphire Solitaire Ring, 2.40 ct',
      variety: 'sapphire', colour: 'blue', jewellery_type: 'RING', weight: 2.4, stones: 1,
      price: 13600, gemstone_id: stoneByRef['K-DEMO-004'].id,
    },
    {
      kind: 'SETTING_ONLY', slug: 'demo-halo-ring-setting-18k-yellow', title: 'Halo Ring Setting, 18K Yellow Gold',
      variety: null, colour: null, jewellery_type: 'RING', weight: null, stones: 1,
      price: 1650, setting_variant_id: variantId['JS9801Y18'],
    },
    {
      kind: 'SETTING_ONLY', slug: 'demo-stud-earring-setting-platinum', title: 'Four-Prong Stud Setting, Platinum 950',
      variety: null, colour: null, jewellery_type: 'EARRINGS', weight: null, stones: 1,
      price: 1480, setting_variant_id: variantId['JS9802PT'],
    },
    {
      kind: 'CONFIGURED', slug: 'demo-configured-emerald-halo-ring', title: 'Emerald Halo Ring, 1.08 ct, 18K Yellow Gold',
      variety: 'emerald', colour: 'green', jewellery_type: 'RING', weight: 1.08, stones: 1,
      price: 6900, setting_variant_id: variantId['JS9801Y18'], gemstone_id: stoneByRef['K-DEMO-005'].id,
    },
    {
      kind: 'CONFIGURED', slug: 'demo-configured-sapphire-stud-earrings', title: 'Sapphire Stud Earrings, 1.70 ct total, Platinum 950',
      variety: 'sapphire', colour: 'blue', jewellery_type: 'EARRINGS', weight: 1.7, stones: 2,
      price: 8580, setting_variant_id: variantId['JS9802PT'], gemstone_pair_id: stoneByRef['PR-DEMO-003'].id,
    },
  ];

  for (const p of productRows) {
    const result = await insert(
      `INSERT INTO products
         (kind, slug, title, subtitle, setting_variant_id, gemstone_id, gemstone_pair_id,
          jewellery_type, variety_id, colour_id, total_weight_ct, stone_count,
          price_amount, currency, price_evidence, state, availability,
          engraving_enabled, options, source_url, source_slug, source_sku, source_sku_derived,
          sku_evidence_status, seo_title, seo_description, short_description, description,
          structured_extra, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,'INFERRED','ACTIVE',TRUE,
          FALSE,$15,NULL,NULL,NULL,NULL,
          'INFERRED',$16,$17,$18,$19,$20,now())
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [
        p.kind, p.slug, p.title, 'Demo record · not a source catalogue entry',
        p.setting_variant_id ?? null, p.gemstone_id ?? null, p.gemstone_pair_id ?? null,
        p.jewellery_type, p.variety === null ? null : varietyId[p.variety],
        p.colour === null ? null : colourId[p.colour], p.weight, p.stones,
        money(p.price), currency,
        JSON.stringify({ demo: true, demoBatch: 'storefront-v2' }),
        `${p.title} (demo) | Maihan Gems`,
        'Demo record created for storefront interface review.',
        'Illustrative demo record. Attributes, prices and availability are not migrated source data.',
        'This row exists so that the storefront can be reviewed with content. It is clearly marked as a demo record in the catalogue options and is not part of the migrated source catalogue.',
        JSON.stringify({ demo: true, demoBatch: 'storefront-v2' }),
      ],
    );
    bump('products', result.rowCount);
  }

  /* ── One demo DYO configuration for the review surface ──────────────────── */
  const dyoResult = await insert(
    `INSERT INTO dyo_configurations
       (id, configuration_hash, short_code, jewellery_type, setting_id, setting_variant_id,
        gemstone_id, gemstone_pair_id, engraving_text, selected_options, state,
        compatibility_status, compatibility_detail, compatibility_checked_at, hash_version, state_version)
     VALUES ($1,$2,$3,'RING',$4,$5,$6,NULL,$7,$8,'VALID','COMPATIBLE',$9,now(),1,1)
     ON CONFLICT (short_code) DO NOTHING RETURNING id`,
    [
      'd0000000-0000-4000-8000-000000000061',
      'demo-review-hash-v2',
      'DEMO-REVIEW',
      ID.settingHalo,
      ID.variantHaloY18,
      ID.gemEmeraldConfigured,
      'AETERNUM',
      JSON.stringify({
        demo: true,
        demoBatch: 'storefront-v2',
        metal: 'Y18',
        metalLabel: '18K Yellow Gold',
        settingDesignCode: '9801',
        settingLabel: 'Halo Ring Setting',
        gemRef: 'K-DEMO-005',
        gemLabel: 'Emerald Oval, 1.05 ct',
        ringSize: '7.0',
      }),
      JSON.stringify([
        { invariant: 'INV-01', result: 'PASS', note: 'One setting variant and one gemstone.' },
        { invariant: 'INV-02', result: 'PASS', note: 'No pair attached to a non-earring type.' },
        { invariant: 'INV-03', result: 'PASS', note: 'A single stone is attached to a ring.' },
      ]),
    ],
  );
  bump('dyo_configurations', dyoResult.rowCount);

  const totals = await client.query(`
    SELECT
      (SELECT count(*)::int FROM gemstone_species)  AS gemstone_species,
      (SELECT count(*)::int FROM gemstone_varieties) AS gemstone_varieties,
      (SELECT count(*)::int FROM gemstone_colours)   AS gemstone_colours,
      (SELECT count(*)::int FROM metals)             AS metals,
      (SELECT count(*)::int FROM jewellery_types)    AS jewellery_types,
      (SELECT count(*)::int FROM setting_styles)     AS setting_styles,
      (SELECT count(*)::int FROM settings)           AS settings,
      (SELECT count(*)::int FROM setting_variants)   AS setting_variants,
      (SELECT count(*)::int FROM gemstones)          AS gemstones,
      (SELECT count(*)::int FROM gemstone_stones)    AS gemstone_stones,
      (SELECT count(*)::int FROM products)           AS products,
      (SELECT count(*)::int FROM dyo_configurations WHERE short_code = 'DEMO-REVIEW') AS demo_dyo_configurations
  `);

  if (dryRun) {
    await client.query('ROLLBACK');
  } else {
    await client.query('COMMIT');
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    currency,
    priceMultiplier: multiplier,
    insertedThisRun: counts,
    totals: totals.rows[0],
  }, null, 2));
}

main()
  .catch(async (error) => {
    try { await client.query('ROLLBACK'); } catch { /* no transaction open */ }
    console.error(`seed-demo-catalogue: FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
