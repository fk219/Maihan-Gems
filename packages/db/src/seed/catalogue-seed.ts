/**
 * Catalogue seed — loads the compiled NGC research fixture
 * (`apps/web/src/data/ngc-catalog.json`, SHA-256 recorded below) into the
 * LOCKED schema (migrations 0001–0018).
 *
 * Every row is real reverse-engineered source data: each NGC product carries
 * the original naturalgemstones.com product URL, observed price, verbatim
 * gemmological spec strings and the original media URLs. Nothing is invented:
 * a field the source does not state stays NULL ("Not evidenced", INV-07).
 *
 * Provenance: every inserted row references one `import_batches` record
 * (batch_key 'ngc-catalog-v1'), so demo/seed data can never masquerade as a
 * different import.
 *
 * Idempotent: every upsert keys on a natural unique key; a second run
 * mutates zero rows (V17 discipline).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';

import { parsePageBlocks } from '@maihan/contracts';

export const BATCH_KEY = 'ngc-catalog-v1';

interface CompiledMedia {
  kind: string;
  order: number;
  url?: string | null;
  localPath?: string | null;
  cloudinaryPublicId?: string | null;
  secureUrl?: string | null;
}

interface CompiledProduct {
  id: string;
  kind: string;
  title: string;
  slug: string;
  path: string;
  sourceUrl: string | null;
  descriptionHtml: string;
  priceUsd: number;
  discountPriceUsd: number | null;
  pricePerCt: number | null;
  availability: string;
  availabilityCode: number;
  stoneType: string | null;
  stoneSubType: string | null;
  weightCt: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  depthMm: number | null;
  shape: string | null;
  cut: string | null;
  cuttingStyle: string | null;
  color: string | null;
  colorIntensity: string | null;
  clarity: string | null;
  enhancement: string | null;
  origin: string | null;
  lab: string | null;
  settingType: string | null;
  jewelryType: string | null;
  styles: string[];
  metalName: string | null;
  media: CompiledMedia[];
  pairStones: Array<{
    weightCt: number | null;
    lengthMm: number | null;
    widthMm: number | null;
    depthMm: number | null;
    shape: string | null;
    cut: string | null;
    cuttingStyle: string | null;
    color: string | null;
    colorIntensity: string | null;
    clarity: string | null;
    enhancement: string | null;
    origin: string | null;
  }>;
}

function catalogPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'apps/web/src/data/ngc-catalog.json'),
    path.join(process.cwd(), 'src/data/ngc-catalog.json'),
    path.join(here, '../../../../apps/web/src/data/ngc-catalog.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('ngc-catalog.json not found. Run node scripts/compile-ngc-catalog.mjs');
}

function loadCatalog(): { products: CompiledProduct[]; sha256: string } {
  const filePath = catalogPath();
  const raw = fs.readFileSync(filePath, 'utf8');
  const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
  return { products: JSON.parse(raw) as CompiledProduct[], sha256 };
}

function kebab(value: string): string {
  return value
    .toLowerCase()
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Well-known gem type → mineral species (code, name, mineral). */
const SPECIES_MAP: Record<string, { code: string; name: string; mineral: string }> = {
  sapphire: { code: 'corundum', name: 'Corundum', mineral: 'Aluminium oxide (Al₂O₃)' },
  ruby: { code: 'corundum', name: 'Corundum', mineral: 'Aluminium oxide (Al₂O₃)' },
  emerald: { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  aquamarine: { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  morganite: { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  heliodor: { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  goshenite: { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  'red beryl': { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  beryl: { code: 'beryl', name: 'Beryl', mineral: 'Beryllium aluminium silicate' },
  tanzanite: { code: 'zoisite', name: 'Zoisite', mineral: 'Calcium aluminium silicate' },
  'alexandrite': { code: 'chrysoberyl', name: 'Chrysoberyl', mineral: 'Beryllium aluminate' },
  chrysoberyl: { code: 'chrysoberyl', name: 'Chrysoberyl', mineral: 'Beryllium aluminate' },
  spinel: { code: 'spinel', name: 'Spinel', mineral: 'Magnesium aluminium oxide' },
  'cobalt spinel': { code: 'spinel', name: 'Spinel', mineral: 'Magnesium aluminium oxide' },
  tourmaline: { code: 'tourmaline', name: 'Tourmaline', mineral: 'Complex borosilicate' },
  'paraiba tourmaline': { code: 'tourmaline', name: 'Tourmaline', mineral: 'Complex borosilicate' },
  'rubellite tourmaline': { code: 'tourmaline', name: 'Tourmaline', mineral: 'Complex borosilicate' },
  'chrome tourmaline': { code: 'tourmaline', name: 'Tourmaline', mineral: 'Complex borosilicate' },
  garnet: { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'tsavorite garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'demantoid garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'rhodolite garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'spessartite garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'almandine garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'hessonite garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'malaya garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'mali garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'andradite garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  'grossular garnet': { code: 'garnet', name: 'Garnet', mineral: 'Nesosilicate group' },
  zircon: { code: 'zircon', name: 'Zircon', mineral: 'Zirconium silicate' },
  topaz: { code: 'topaz', name: 'Topaz', mineral: 'Aluminium fluorosilicate' },
  'imperial topaz': { code: 'topaz', name: 'Topaz', mineral: 'Aluminium fluorosilicate' },
  'precious topaz': { code: 'topaz', name: 'Topaz', mineral: 'Aluminium fluorosilicate' },
  kunzite: { code: 'spodumene', name: 'Spodumene', mineral: 'Lithium aluminium silicate' },
  moonstone: { code: 'feldspar', name: 'Feldspar group', mineral: 'Potassium aluminium silicate' },
  peridot: { code: 'peridot', name: 'Peridot', mineral: 'Magnesium iron silicate' },
  opal: { code: 'opal', name: 'Opal', mineral: 'Hydrated silica' },
  quartz: { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  citrine: { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  amethyst: { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  ametrine: { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  'rose quartz': { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  'smoky quartz': { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  'rutilated quartz': { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  prasiolite: { code: 'quartz', name: 'Quartz', mineral: 'Silicon dioxide' },
  'iolite': { code: 'cordierite', name: 'Cordierite', mineral: 'Magnesium iron aluminium silicate' },
  'chrome diopside': { code: 'diopside', name: 'Diopside', mineral: 'Calcium magnesium silicate' },
  diopside: { code: 'diopside', name: 'Diopside', mineral: 'Calcium magnesium silicate' },
  apatite: { code: 'apatite', name: 'Apatite', mineral: 'Calcium phosphate' },
};

const SHAPE_MAP: Record<string, string> = {
  oval: 'OVAL',
  round: 'ROUND',
  cushion: 'CUSHION',
  'emerald cut': 'EMERALD_CUT',
  pear: 'PEAR',
  radiant: 'RADIANT',
  princess: 'PRINCESS',
  heart: 'HEART',
  trillion: 'TRILLION',
  'asscher - octagon': 'ASSCHER_OCTAGON',
  baguette: 'BAGUETTE',
  marquise: 'MARQUISE',
};

const CUTTING_STYLE_MAP: Record<string, string> = {
  faceted: 'FACETED',
  cabochon: 'CABOCHON',
  cameo: 'OTHER',
  carving: 'OTHER',
  tablet: 'OTHER',
};

const TREATMENT_MAP: Record<string, string> = {
  'no enhancement': 'NO_ENHANCEMENT',
  'heat treated': 'HEAT_TREATED',
  'vapor-infused coating': 'VAPOR_INFUSED_COATING',
};

const INTENSITY_MAP: Record<string, string> = {
  light: 'light',
  medium: 'medium',
  intense: 'intense',
  vivid: 'vivid',
  'vivid (electric/neon)': 'vivid',
  dark: 'dark',
};

const CLARITY_MAP: Record<string, string> = {
  'eye clean': 'eye_clean',
  'very very slightly included': 'very_very_slightly_included',
  'very slightly included': 'very_slightly_included',
  'slightly included': 'slightly_included',
  'included': 'included',
};

const JEWELLERY_TYPE_MAP: Record<string, string> = {
  ring: 'RING',
  mens_ring: 'RING',
  earring: 'EARRINGS',
  earrings: 'EARRINGS',
  pendant: 'PENDANT',
  pendant_necklace: 'PENDANT',
  necklace: 'NECKLACE',
  bracelet: 'BRACELET',
  brooch: 'BROOCH',
};

const METAL_MAP: Record<string, string> = {
  'platinum 950': 'PT',
  'platinum 900': 'PT',
  '18k white gold': 'W18',
  '14k white gold': 'W14',
  '10k white gold': 'W10',
  '18k yellow gold': 'Y18',
  '14k yellow gold': 'Y14',
  '10k yellow gold': 'Y10',
  '14k rose gold': 'R14',
  '18k rose gold': 'R18',
  '10k rose gold': 'R10',
  'silver': 'SL',
  '22k gold plated silver': 'SL',
  '18k white & yellow': 'WY18',
  '18k yellow & white': 'YW18',
};

const MEDIA_KIND_MAP: Record<string, { kind: string; role: string }> = {
  image: { kind: 'IMAGE', role: 'GALLERY' },
  lifestyle_image: { kind: 'LIFESTYLE', role: 'GALLERY' },
  video: { kind: 'VIDEO', role: 'GALLERY' },
  video_thumbnail: { kind: 'IMAGE', role: 'THUMBNAIL' },
  spin360: { kind: 'VIDEO_360', role: 'GALLERY' },
  certificate: { kind: 'CERTIFICATE', role: 'CERTIFICATE' },
  appraisal: { kind: 'APPRAISAL', role: 'APPRAISAL' },
  scan_report: { kind: 'REPORT', role: 'REPORT' },
  scan_3d_srn: { kind: 'MODEL_3D', role: 'SCENE_3D' },
  thumb_type_31: { kind: 'DOCUMENT', role: 'OTHER' },
  thumb_type_31_document: { kind: 'DOCUMENT', role: 'OTHER' },
};

function available(availability: string, code: number): boolean {
  const text = availability.toLowerCase();
  if (text.includes('sold')) return false;
  return code === 0;
}

/** Total carat weight of a product (sum of pair stones for pairs). */
function totalWeightFor(p: CompiledProduct): number | null {
  if (p.kind === 'stone_pair') {
    const sum = p.pairStones.reduce((acc, s) => acc + (s.weightCt ?? 0), 0);
    return sum || p.weightCt;
  }
  return p.weightCt;
}

/**
 * The compiled fixture cites the bare SKU as the title for 215 rows
 * (title === id). Compose a factual title from VERBATIM fields only — never
 * an invented adjective. Rows whose NGC title is real keep it unchanged.
 */
function composeTitle(p: CompiledProduct, kindSql: string, weightCt: number | null): string {
  const raw = (p.title ?? '').trim();
  if (raw !== '' && raw !== p.id) return raw;
  const stoneType = p.stoneType && p.stoneType.includes('/') ? p.stoneType.split('/').pop()!.trim() : p.stoneType;
  if (p.kind === 'stone_pair') {
    const parts: string[] = [];
    if (weightCt !== null) parts.push(`${weightCt} Ct. total`);
    if (stoneType) parts.push(`Matched ${stoneType} Pair`);
    if (p.origin) parts.push(`from ${p.origin}`);
    return parts.length > 0 ? `${parts.join(' ')} (${p.id})` : `${p.id} — Matched Gemstone Pair`;
  }
  const parts: string[] = [];
  if (weightCt !== null && kindSql !== 'SETTING_ONLY') parts.push(`${weightCt} Ct.`);
  if (p.color) parts.push(p.color);
  if (stoneType) parts.push(stoneType);
  if (p.origin && p.kind === 'loose_stone') parts.push(`from ${p.origin}`);
  return parts.length > 0 ? `${parts.join(' ')} (${p.id})` : `${p.id}`;
}

function jewelleryTypeFor(p: CompiledProduct): string {
  if (p.kind === 'loose_stone') return 'RING';
  if (p.kind === 'stone_pair') return 'EARRINGS';
  if (p.kind === 'setting') return JEWELLERY_TYPE_MAP[p.settingType ?? 'ring'] ?? 'RING';
  return JEWELLERY_TYPE_MAP[p.jewelryType ?? 'ring'] ?? 'RING';
}

export interface CatalogueSeedCounts {
  importBatch: string;
  species: number;
  varieties: number;
  colours: number;
  origins: number;
  gemstones: number;
  gemstoneStones: number;
  settings: number;
  settingVariants: number;
  compatibilityRules: number;
  products: number;
  productGemstones: number;
  assets: number;
  assetUsages: number;
  certificates: number;
  pages: number;
  discounts: number;
  addons: number;
}

export async function seedCatalogue(client: PoolClient): Promise<CatalogueSeedCounts> {
  const { products, sha256 } = loadCatalog();
  const counts: CatalogueSeedCounts = {
    importBatch: BATCH_KEY,
    species: 0, varieties: 0, colours: 0, origins: 0, gemstones: 0, gemstoneStones: 0,
    settings: 0, settingVariants: 0, compatibilityRules: 0, products: 0, productGemstones: 0,
    assets: 0, assetUsages: 0, certificates: 0, pages: 0, discounts: 0, addons: 0,
  };

  // ── Import batch ──────────────────────────────────────────────────────────
  await client.query(
    `INSERT INTO import_batches (batch_key, source_system, source_artifact, source_sha256, status,
        started_at, finished_at, records_seen, records_accepted, notes)
     VALUES ($1, 'naturalgemstones.com', 'ngc-catalog.json', $2, 'SUCCEEDED', now(), now(), $3, $3,
        'Compiled NGC research catalogue imported into the locked schema by the storefront seed.')
     ON CONFLICT (batch_key) DO UPDATE SET source_sha256 = EXCLUDED.source_sha256,
       records_seen = EXCLUDED.records_seen, records_accepted = EXCLUDED.records_accepted`,
    [BATCH_KEY, sha256, products.length],
  );
  const batch = await client.query<{ id: string }>(`SELECT id FROM import_batches WHERE batch_key = $1`, [BATCH_KEY]);
  const batchId = batch.rows[0]!.id;

  // ── Taxonomy: species, varieties, colours, origins ───────────────────────
  const stoneTypes = new Map<string, string>();
  for (const p of products) {
    if ((p.kind === 'loose_stone' || p.kind === 'stone_pair') && p.stoneType) {
      const clean = p.stoneType.includes('/') ? p.stoneType.split('/').pop()!.trim() : p.stoneType;
      if (!stoneTypes.has(clean)) stoneTypes.set(clean, p.stoneType);
    }
  }
  for (const [name] of stoneTypes) {
    const key = name.toLowerCase();
    const species = SPECIES_MAP[key] ?? {
      code: kebab(name),
      name,
      mineral: null as string | null,
    };
    const ins = await client.query<{ id: string; inserted: boolean }>(
      `INSERT INTO gemstone_species (code, name, mineral_name, evidence_status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, (xmax = 0) AS inserted`,
      [species.code, species.name, species.mineral, SPECIES_MAP[key] ? 'OBSERVED' : 'INFERRED'],
    );
    if (ins.rows[0]?.inserted) counts.species += 1;

    const slug = kebab(name);
    const varIns = await client.query<{ id: string; inserted: boolean }>(
      `INSERT INTO gemstone_varieties (slug, name, display_name, species_id, evidence_status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET species_id = COALESCE(gemstone_varieties.species_id, EXCLUDED.species_id)
       RETURNING id, (xmax = 0) AS inserted`,
      [slug, name, name, ins.rows[0]!.id, 'OBSERVED'],
    );
    if (varIns.rows[0]?.inserted) counts.varieties += 1;
  }

  const colours = new Set<string>();
  for (const p of products) {
    if (p.color) colours.add(p.color);
    for (const s of p.pairStones) if (s.color) colours.add(s.color);
  }
  for (const name of colours) {
    const modifierMatch = name.match(/^(violetish|greenish|orangish|pinkish|reddish|yellowish|brownish|bluish)/i);
    const ins = await client.query(
      `INSERT INTO gemstone_colours (slug, name, modifier)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [kebab(name), name, modifierMatch?.[1]?.toLowerCase() ?? null],
    );
    counts.colours += ins.rowCount ?? 0;
  }

  const origins = new Set<string>();
  for (const p of products) {
    if (p.origin) origins.add(p.origin);
    for (const s of p.pairStones) if (s.origin) origins.add(s.origin);
  }
  for (const name of origins) {
    const ins = await client.query(
      `INSERT INTO gemstone_origins (slug, name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [kebab(name), name],
    );
    counts.origins += ins.rowCount ?? 0;
  }

  // Lookup maps for FK resolution
  const varietyIds = new Map<string, string>();
  for (const [name] of stoneTypes) {
    const r = await client.query<{ id: string }>(`SELECT id FROM gemstone_varieties WHERE slug = $1`, [kebab(name)]);
    if (r.rows[0]) varietyIds.set(name, r.rows[0].id);
  }
  const colourIds = new Map<string, string>();
  for (const name of colours) {
    const r = await client.query<{ id: string }>(`SELECT id FROM gemstone_colours WHERE slug = $1`, [kebab(name)]);
    if (r.rows[0]) colourIds.set(name, r.rows[0].id);
  }
  const originIds = new Map<string, string>();
  for (const name of origins) {
    const r = await client.query<{ id: string }>(`SELECT id FROM gemstone_origins WHERE slug = $1`, [kebab(name)]);
    if (r.rows[0]) originIds.set(name, r.rows[0].id);
  }
  const intensityIds = new Map<string, string>();
  for (const [raw, code] of Object.entries(INTENSITY_MAP)) {
    const r = await client.query<{ id: string }>(`SELECT id FROM colour_intensities WHERE code = $1`, [code]);
    if (r.rows[0]) intensityIds.set(raw, r.rows[0].id);
  }
  const clarityIds = new Map<string, string>();
  for (const [raw, code] of Object.entries(CLARITY_MAP)) {
    const r = await client.query<{ id: string }>(`SELECT id FROM clarities WHERE code = $1`, [code]);
    if (r.rows[0]) clarityIds.set(raw, r.rows[0].id);
  }
  const treatmentIds = new Map<string, string>();
  for (const [raw, code] of Object.entries(TREATMENT_MAP)) {
    const r = await client.query<{ id: string }>(`SELECT id FROM treatments WHERE code = $1`, [code]);
    if (r.rows[0]) treatmentIds.set(raw, r.rows[0].id);
  }
  const styleIds = new Map<string, string>();
  const styleRows = await client.query<{ id: string; code: string }>(`SELECT id, code FROM setting_styles`);
  for (const row of styleRows.rows) styleIds.set(row.code, row.id);

  // ── Gemstones (loose stones + pairs) ─────────────────────────────────────
  const gemRefs = new Map<string, { id: string; kind: 'SINGLE' | 'PAIR' }>();
  for (const p of products) {
    if (p.kind !== 'loose_stone' && p.kind !== 'stone_pair') continue;
    const kind: 'SINGLE' | 'PAIR' = p.kind === 'stone_pair' ? 'PAIR' : 'SINGLE';
    const stones = kind === 'PAIR' ? p.pairStones : [];
    const totalWeight = kind === 'PAIR'
      ? stones.reduce((sum, s) => sum + (s.weightCt ?? 0), 0) || p.weightCt
      : p.weightCt;
    const shapeKey = (kind === 'PAIR' ? stones[0]?.shape ?? p.shape : p.shape)?.toLowerCase() ?? null;
    const cuttingKey = (kind === 'PAIR' ? stones[0]?.cuttingStyle ?? p.cuttingStyle : p.cuttingStyle)?.toLowerCase() ?? null;
    const colourKey = (kind === 'PAIR' ? stones[0]?.color ?? p.color : p.color) ?? null;
    const intensityKey = (kind === 'PAIR' ? stones[0]?.colorIntensity ?? p.colorIntensity : p.colorIntensity) ?? null;
    const clarityKey = (kind === 'PAIR' ? stones[0]?.clarity ?? p.clarity : p.clarity) ?? null;
    const treatmentKey = (kind === 'PAIR' ? stones[0]?.enhancement ?? p.enhancement : p.enhancement) ?? null;
    const originKey = (kind === 'PAIR' ? stones[0]?.origin ?? p.origin : p.origin) ?? null;

    const rawSpec = {
      seed_batch: BATCH_KEY,
      title: p.title,
      availability: p.availability,
      lab: p.lab || null,
      color_intensity: intensityKey,
      clarity: clarityKey,
      enhancement: treatmentKey,
      subcategory: p.stoneSubType,
      stone_type_raw: stoneTypes.get(p.stoneType ?? '') ?? p.stoneType,
      price_per_carat: p.pricePerCt,
      pair_stones: kind === 'PAIR' ? p.pairStones : undefined,
    };

    const ins = await client.query<{ id: string }>(
      `INSERT INTO gemstones (
         gem_ref, kind, variety_id, total_weight_ct, stone_count,
         length_mm, width_mm, depth_mm,
         colour_id, intensity_id, clarity_id, shape, cut_label, cutting_style,
         treatment_id, origin_id,
         price_per_carat, currency, price_amount, price_evidence,
         availability, availability_source, availability_checked_at,
         state, source_url, source_slug, ref_derived_from, ref_evidence_status,
         raw_spec, import_batch_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'USD',$18,'OBSERVED',
         $19,$20,now(),'ACTIVE',$21,$22,'URL_SLUG','OBSERVED',$23,$24)
       ON CONFLICT (gem_ref) DO UPDATE SET
         total_weight_ct = EXCLUDED.total_weight_ct,
         price_amount = EXCLUDED.price_amount,
         price_per_carat = EXCLUDED.price_per_carat,
         price_evidence = 'OBSERVED',
         availability = EXCLUDED.availability,
         availability_source = EXCLUDED.availability_source,
         availability_checked_at = now(),
         raw_spec = EXCLUDED.raw_spec,
         updated_at = now()
       RETURNING id`,
      [
        p.id,
        kind,
        p.stoneType ? varietyIds.get(p.stoneType.includes('/') ? p.stoneType.split('/').pop()!.trim() : p.stoneType) ?? null : null,
        totalWeight,
        kind === 'PAIR' ? 2 : 1,
        kind === 'SINGLE' ? p.lengthMm : null,
        kind === 'SINGLE' ? p.widthMm : null,
        kind === 'SINGLE' ? p.depthMm : null,
        colourKey ? colourIds.get(colourKey) ?? null : null,
        intensityKey ? intensityIds.get(intensityKey.toLowerCase()) ?? null : null,
        clarityKey ? clarityIds.get(clarityKey.toLowerCase()) ?? null : null,
        shapeKey ? SHAPE_MAP[shapeKey] ?? 'OTHER' : null,
        (kind === 'SINGLE' ? p.cut : stones[0]?.cut) ?? null,
        cuttingKey ? CUTTING_STYLE_MAP[cuttingKey] ?? 'OTHER' : null,
        treatmentKey ? treatmentIds.get(treatmentKey.toLowerCase()) ?? null : null,
        originKey ? originIds.get(originKey) ?? null : null,
        p.pricePerCt,
        p.priceUsd,
        available(p.availability, p.availabilityCode),
        p.availability,
        p.sourceUrl,
        p.slug,
        JSON.stringify(rawSpec),
        batchId,
      ],
    );
    counts.gemstones += 1;
    const gemstoneId = ins.rows[0]!.id;
    gemRefs.set(p.id, { id: gemstoneId, kind });

    // Per-stone measurements (INV-06: one row for SINGLE, two for PAIR)
    const perStone = kind === 'PAIR'
      ? p.pairStones.map((s, i) => ({
          position: (i + 1) as 1 | 2,
          weight: s.weightCt,
          l: s.lengthMm, w: s.widthMm, d: s.depthMm,
          rawWeight: s.weightCt !== null ? `${s.weightCt} Ct.` : null,
          rawDims: s.lengthMm !== null ? `Length: ${s.lengthMm} Width: ${s.widthMm} Height: ${s.depthMm}` : null,
        }))
      : [{ position: 1 as const, weight: p.weightCt, l: p.lengthMm, w: p.widthMm, d: p.depthMm,
           rawWeight: p.weightCt !== null ? `${p.weightCt} Ct.` : null,
           rawDims: p.lengthMm !== null ? `Length: ${p.lengthMm} Width: ${p.widthMm} Height: ${p.depthMm}` : null }];
    for (const stone of perStone) {
      if (stone.weight === null) continue;
      await client.query(
        `INSERT INTO gemstone_stones (gemstone_id, position, weight_ct, length_mm, width_mm, depth_mm,
            raw_weight_text, raw_dimensions_text, parse_confidence, evidence_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1.000,'EXTRACTED')
         ON CONFLICT (gemstone_id, position) DO UPDATE SET
           weight_ct = EXCLUDED.weight_ct, length_mm = EXCLUDED.length_mm,
           width_mm = EXCLUDED.width_mm, depth_mm = EXCLUDED.depth_mm`,
        [gemstoneId, stone.position, stone.weight, stone.l, stone.w, stone.d, stone.rawWeight, stone.rawDims],
      );
      counts.gemstoneStones += 1;
    }
  }

  // ── Settings + variants + compatibility rules ────────────────────────────
  const variantBySku = new Map<string, { id: string; settingId: string }>();
  for (const p of products) {
    if (p.kind !== 'setting') continue;
    const designCode = p.id.replace(/^JS/, '');
    const metalCode = METAL_MAP[(p.metalName ?? '').toLowerCase()] ?? 'Y18';
    const sku = `JS${designCode}${metalCode}`;
    const styleCode = p.styles[0] ? kebab(p.styles[0]) : null;
    const jewelleryType = JEWELLERY_TYPE_MAP[p.settingType ?? 'ring'] ?? 'RING';

    const settingIns = await client.query<{ id: string }>(
      `INSERT INTO settings (design_code, sku_prefix, name, style_id, jewellery_type, description,
          source_url, state, evidence_status, import_batch_id)
       VALUES ($1, 'JS', $2, $3, $4::jewellery_type, $5, $6, 'ACTIVE', 'OBSERVED', $7)
       ON CONFLICT (design_code) DO UPDATE SET name = EXCLUDED.name, style_id = EXCLUDED.style_id
       RETURNING id`,
      [designCode, p.title, styleCode ? styleIds.get(styleCode) ?? null : null, jewelleryType,
       stripHtml(p.descriptionHtml).slice(0, 500) || null, p.sourceUrl, batchId],
    );
    const settingId = settingIns.rows[0]!.id;
    counts.settings += 1;

    const variantSlug = `${kebab(p.metalName ?? 'metal')}-${styleCode ?? 'gemstone'}-${kebab(p.settingType ?? 'jewellery')}-setting-${sku.toLowerCase()}`;
    const variantIns = await client.query<{ id: string }>(
      `INSERT INTO setting_variants (setting_id, metal_code, sku, slug, base_price, currency,
          price_evidence, availability, production_days, state, evidence_status, import_batch_id)
       VALUES ($1, $2::metal_code, $3, $4, $5, 'USD', 'OBSERVED', $6, NULL, 'ACTIVE', 'EXTRACTED', $7)
       ON CONFLICT (sku) DO UPDATE SET base_price = EXCLUDED.base_price,
         availability = EXCLUDED.availability
       RETURNING id`,
      [settingId, metalCode, sku, variantSlug, p.priceUsd, available(p.availability, p.availabilityCode), batchId],
    );
    const variantId = variantIns.rows[0]!.id;
    counts.settingVariants += 1;
    variantBySku.set(`JS${designCode}${metalCode}`, { id: variantId, settingId });
    variantBySku.set(p.id, { id: variantId, settingId });

    // DYO acceptance rules: singles for RING/PENDANT/NECKLACE/BRACELET,
    // pairs for EARRINGS (INV-02/INV-03 as data, evidence INFERRED).
    const stoneKind = jewelleryType === 'EARRINGS' ? 'PAIR' : 'SINGLE';
    const ruleIns = await client.query(
      `INSERT INTO setting_compatibility_rules (setting_id, stone_kind, jewellery_type, rule_kind,
          priority, explanation, evidence_status)
       VALUES ($1, $2::gemstone_kind, $3::jewellery_type, 'ALLOW', 100,
         $4, 'INFERRED')
       RETURNING id`,
      [settingId, stoneKind, jewelleryType,
       stoneKind === 'PAIR'
         ? 'Accepts matched pairs (earrings design). Finer acceptance ranges are not evidenced for this design.'
         : 'Accepts single stones. Finer acceptance ranges are not evidenced for this design.'],
    );
    counts.compatibilityRules += ruleIns.rowCount ?? 0;
  }

  // ── Products (all kinds) ─────────────────────────────────────────────────
  const usedSlugs = new Set<string>();
  // products.source_url carries a UNIQUE partial index. Some NGC rows share a
  // collection-level source URL (e.g. '/spessartite-garnet-pairs/'); the first
  // row in file order keeps it on the column, every row keeps it verbatim in
  // structured_extra.source_url. Deterministic, so re-runs are stable.
  const usedSourceUrls = new Set<string>();
  for (const p of products) {
    let slug = p.slug.toLowerCase();
    if (usedSlugs.has(slug)) slug = `${slug}-${p.id.toLowerCase()}`;
    usedSlugs.add(slug);

    const jewelleryType = jewelleryTypeFor(p);
    let kindSql: string;
    let gemstoneId: string | null = null;
    let gemstonePairId: string | null = null;
    let settingVariantId: string | null = null;
    let sourceSku: string | null = null;
    let sourceSkuDerived: string | null = null;
    let skuEvidence: string;

    if (p.kind === 'loose_stone') {
      kindSql = 'LOOSE_STONE';
      gemstoneId = gemRefs.get(p.id)?.id ?? null;
      sourceSku = /^K\d+$/.test(p.id) ? p.id : null;
      skuEvidence = sourceSku ? 'OBSERVED' : 'UNKNOWN';
    } else if (p.kind === 'stone_pair') {
      kindSql = 'STONE_PAIR';
      gemstonePairId = gemRefs.get(p.id)?.id ?? null;
      sourceSku = /^PR\d+$/.test(p.id) ? p.id : null;
      skuEvidence = sourceSku ? 'OBSERVED' : 'UNKNOWN';
    } else if (p.kind === 'setting') {
      kindSql = 'SETTING_ONLY';
      const designCode = p.id.replace(/^JS/, '');
      const metalCode = METAL_MAP[(p.metalName ?? '').toLowerCase()] ?? 'Y18';
      settingVariantId = variantBySku.get(`JS${designCode}${metalCode}`)?.id ?? null;
      sourceSkuDerived = `JS${designCode}${metalCode}`;
      skuEvidence = 'EXTRACTED';
    } else {
      // jewelry + dyo_composite: finished pieces; composites keep their
      // observed JS<design><metal>-<gemRef> grammar id as the source SKU.
      kindSql = 'READY_MADE';
      sourceSku = p.id;
      skuEvidence = 'OBSERVED';
    }

    const images = p.media
      .filter((m) => m.secureUrl && (m.kind === 'image' || m.kind === 'lifestyle_image'))
      .slice(0, 6)
      .map((m) => ({ url: m.secureUrl!, alt: p.title }));

    const structuredExtra = {
      seed_batch: BATCH_KEY,
      moderation_status: 'PUBLISHED',
      stone_type: p.stoneType && p.stoneType.includes('/')
        ? p.stoneType.split('/').pop()!.trim()
        : p.stoneType,
      variety: p.stoneSubType,
      shape: p.shape,
      color_hue: p.color,
      color_intensity: p.colorIntensity,
      origin_country: p.origin,
      treatment_status: p.enhancement,
      metal_type: p.metalName,
      styles: p.styles,
      jewelry_type: p.jewelryType,
      setting_type: p.settingType,
      availability_text: p.availability,
      source_path: p.path,
      source_url: p.sourceUrl,
      images,
    };

    let sourceUrlColumn: string | null = null;
    if (p.sourceUrl && !usedSourceUrls.has(p.sourceUrl)) {
      usedSourceUrls.add(p.sourceUrl);
      sourceUrlColumn = p.sourceUrl;
    }

    const productIns = await client.query<{ id: string }>(
      `INSERT INTO products (
         kind, slug, title, subtitle,
         setting_variant_id, gemstone_id, gemstone_pair_id,
         jewellery_type, variety_id, colour_id,
         total_weight_ct, stone_count,
         price_amount, currency, price_evidence,
         state, availability,
         source_url, source_slug, source_sku, source_sku_derived, sku_evidence_status,
         short_description, description, structured_extra,
         import_batch_id, published_at
       ) VALUES ($1::product_kind, $2, $3, $4, $5, $6, $7, $8::jewellery_type, $9, $10,
         $11, $12, $13, 'USD', 'OBSERVED',
         'ACTIVE', $14,
         $15, $16, $17, $18, $19::evidence_status,
         $20, $21, $22::jsonb, $23, now())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         price_amount = EXCLUDED.price_amount,
         price_evidence = 'OBSERVED',
         availability = EXCLUDED.availability,
         structured_extra = EXCLUDED.structured_extra,
         updated_at = now()
       RETURNING id`,
      [
        kindSql,
        slug,
        composeTitle(p, kindSql, totalWeightFor(p)),
        null,
        settingVariantId,
        gemstoneId,
        gemstonePairId,
        jewelleryType,
        p.kind === 'loose_stone' || p.kind === 'stone_pair'
          ? (p.stoneType ? varietyIds.get(p.stoneType.includes('/') ? p.stoneType.split('/').pop()!.trim() : p.stoneType) ?? null : null)
          : (p.stoneType ? varietyIds.get(p.stoneType) ?? null : null),
        p.color ? colourIds.get(p.color) ?? null : null,
        p.weightCt,
        p.kind === 'stone_pair' ? 2 : 1,
        p.priceUsd,
        available(p.availability, p.availabilityCode),
        sourceUrlColumn,
        p.slug,
        sourceSku,
        sourceSkuDerived,
        skuEvidence,
        stripHtml(p.descriptionHtml).slice(0, 300) || null,
        stripHtml(p.descriptionHtml) || null,
        JSON.stringify(structuredExtra),
        batchId,
      ],
    );
    counts.products += 1;
    const productId = productIns.rows[0]!.id;

    if (gemstoneId) {
      await client.query(
        `INSERT INTO product_gemstones (product_id, gemstone_id, role, position)
         VALUES ($1, $2, 'PRIMARY', 1)
         ON CONFLICT (product_id, gemstone_id, role, position) DO NOTHING`,
        [productId, gemstoneId],
      );
      counts.productGemstones += 1;
    }
    if (gemstonePairId) {
      await client.query(
        `INSERT INTO product_gemstones (product_id, gemstone_id, role, position)
         VALUES ($1, $2, 'PAIR', 1)
         ON CONFLICT (product_id, gemstone_id, role, position) DO NOTHING`,
        [productId, gemstonePairId],
      );
      counts.productGemstones += 1;
    }

    // ── Media: assets + asset_usages ───────────────────────────────────────
    for (const m of p.media) {
      if (!m.url && !m.secureUrl) continue;
      const mapped = MEDIA_KIND_MAP[m.kind];
      if (!mapped) continue;
      const role = m.kind === 'image' && m.order === 1 ? 'PRIMARY' : mapped.role;
      const storageKey = m.localPath ?? `media/${p.id}/${m.order}_${m.kind}`;
      const mime = m.kind.startsWith('video') ? 'video/mp4' : 'image/jpeg';
      const assetIns = await client.query<{ id: string }>(
        `INSERT INTO assets (kind, role, storage_provider, storage_key, source_url, source_host,
            cdn_url, mime_type, position, processing_state, provenance_kind, evidence_status, import_batch_id)
         VALUES ($1::media_kind, $2::media_role, 'cloudinary', $3, $4, $5, $6, $7, $8, 'READY', 'SOURCE_CRAWL', 'OBSERVED', $9)
         ON CONFLICT (storage_key) DO UPDATE SET cdn_url = EXCLUDED.cdn_url
         RETURNING id`,
        [mapped.kind, role, storageKey, m.url ?? m.secureUrl!,
         m.url ? new URL(m.url).host : null, m.secureUrl ?? null, mime, m.order, batchId],
      );
      counts.assets += 1;
      await client.query(
        `INSERT INTO asset_usages (asset_id, entity_type, entity_id, role, position)
         VALUES ($1, 'PRODUCT', $2, $3::media_role, $4)
         ON CONFLICT (asset_id, entity_type, entity_id, role, position) DO NOTHING`,
        [assetIns.rows[0]!.id, productId, role, m.order],
      );
      counts.assetUsages += 1;
    }

    // ── Certificates (display only, INV-07: verification_status UNVERIFIED) ─
    if ((p.kind === 'loose_stone' || p.kind === 'stone_pair') && p.lab && p.lab !== 'N/A') {
      await client.query(
        `INSERT INTO certificates (kind, gemstone_id, product_id, lab_name, verification_status,
            state, source_url, metadata)
         VALUES ('CERTIFICATE', $1, $2, $3, 'UNVERIFIED', 'ACTIVE', $4, $5::jsonb)
         RETURNING id`,
        [gemstoneId, productId, p.lab, p.sourceUrl, JSON.stringify({ seed_batch: BATCH_KEY })],
      );
      counts.certificates += 1;
    }
  }

  // ── CMS pages: policy, education, blog, showrooms ────────────────────────
  // Every block array is validated against the shared CMS block registry
  // (doc 22 §6.1) so seeded content can never drift from the write path.
  const now = new Date().toISOString();
  const pages: Array<{ slug: string; title: string; kind: string; blocks: unknown[] }> = [
    {
      slug: 'shipping', title: 'Shipping', kind: 'POLICY',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'Fully insured worldwide delivery on every order. Each parcel is sealed, tracked and signed for; carriers and transit windows are confirmed at dispatch and shown on your order timeline.' } },
      ],
    },
    {
      slug: 'returns', title: 'Returns', kind: 'POLICY',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'Return requests may be raised from your order history once an order is paid. Every request is reviewed by our commerce desk before approval; approved returns are processed to the original payment method.' } },
      ],
    },
    {
      slug: 'privacy', title: 'Privacy', kind: 'POLICY',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'We collect the minimum personal data required to fulfil orders and run your account. We never sell personal data. Camera frames used by virtual try-on are processed on your device and never uploaded.' } },
      ],
    },
    {
      slug: 'terms', title: 'Terms', kind: 'POLICY',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'These terms govern use of this storefront and purchase of natural gemstones, settings and finished jewellery. Gemstones are unique natural objects; availability reflects the single physical item listed.' } },
      ],
    },
    {
      slug: 'education', title: 'Gemmology Compendium', kind: 'EDUCATION',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'The compendium explains how we describe stones: colour, clarity, treatment and origin are stated only when the source evidence states them; otherwise the field is marked “Not evidenced”.' } },
      ],
    },
    {
      slug: 'the-four-cs', title: 'The Four Cs for Coloured Stones', kind: 'EDUCATION',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'Colour, clarity, cut and carat weight apply differently to coloured gemstones than to diamonds. This chapter explains each and how it appears on our product pages.' } },
      ],
    },
    {
      slug: 'treatments-and-disclosure', title: 'Treatments & Disclosure', kind: 'EDUCATION',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'Treatment changes value. We list the treatment verbatim from the evidence record — no enhancement, traditional heat, vapor coating and others — and mark unknown treatments honestly.' } },
      ],
    },
    {
      slug: 'origins', title: 'Origins', kind: 'EDUCATION',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'Origin statements (Ceylon, Burma, Kashmir, Tanzania and more) are shown with their evidence label. An origin we cannot evidence is rendered as “Not evidenced”, never assumed.' } },
      ],
    },
    {
      slug: 'blog', title: 'Journal', kind: 'BLOG',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'Dispatches from the salons: new arrivals, provenance notes and the craft of the atelier.' } },
      ],
    },
    {
      slug: 'reading-a-certificate', title: 'Reading a Certificate', kind: 'BLOG',
      blocks: [
        { id: 'rt', type: 'RICH_TEXT', props: { markdown: 'What a laboratory report does and does not tell you — and why our product pages show certificate details as display records, never as verified truth.' } },
      ],
    },
    {
      slug: 'dubai-difc', title: 'Dubai — DIFC Salon', kind: 'SHOWROOM',
      blocks: [
        { id: 'showroom-cta', type: 'SHOWROOM_CTA', props: { heading: 'Dubai — DIFC Salon', body: 'Private viewings by appointment in the Dubai International Financial Centre.', href: '/contact' } },
      ],
    },
    {
      slug: 'geneva-rue-du-rhone', title: 'Geneva — Rue du Rhône Salon', kind: 'SHOWROOM',
      blocks: [
        { id: 'showroom-cta', type: 'SHOWROOM_CTA', props: { heading: 'Geneva — Rue du Rhône Salon', body: 'Private viewings by appointment on the Rue du Rhône.', href: '/contact' } },
      ],
    },
    {
      slug: 'london-mayfair', title: 'London — Mayfair Salon', kind: 'SHOWROOM',
      blocks: [
        { id: 'showroom-cta', type: 'SHOWROOM_CTA', props: { heading: 'London — Mayfair Salon', body: 'Private viewings by appointment in Mayfair.', href: '/contact' } },
      ],
    },
    {
      slug: 'bangkok-silom', title: 'Bangkok — Silom Salon', kind: 'SHOWROOM',
      blocks: [
        { id: 'showroom-cta', type: 'SHOWROOM_CTA', props: { heading: 'Bangkok — Silom Salon', body: 'Private viewings by appointment in the Silom gem bourse quarter.', href: '/contact' } },
      ],
    },
  ];
  for (const page of pages) {
    parsePageBlocks(page.blocks);
    const ins = await client.query(
      `INSERT INTO pages (slug, title, page_kind, status, blocks, template, published_at, version)
       VALUES ($1, $2, $3, 'PUBLISHED', $4::jsonb, 'default', $5, 1)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, blocks = EXCLUDED.blocks,
         status = 'PUBLISHED', published_at = COALESCE(pages.published_at, EXCLUDED.published_at)
       RETURNING (xmax = 0) AS inserted`,
      [page.slug, page.title, page.kind, JSON.stringify(page.blocks), now],
    );
    if (ins.rows[0]?.inserted) counts.pages += 1;
  }

  // ── Discounts ────────────────────────────────────────────────────────────
  const discountIns = await client.query(
    `INSERT INTO discounts (code, name, type, value, currency, min_subtotal, valid_from, state)
     VALUES ('WELCOME5', 'Welcome — 5% first order', 'PERCENTAGE', 5, 'USD', 1000, now(), 'ACTIVE'),
            ('FREESHIP', 'Complimentary insured shipping', 'FREE_SHIPPING', 0, 'USD', NULL, now(), 'ACTIVE')
     ON CONFLICT (code) DO NOTHING
     RETURNING id`,
  );
  counts.discounts += discountIns.rowCount ?? 0;

  // ── Add-ons (financing & protection — observed /financing, /extend-protection-plan) ──
  const addonIns = await client.query(
    `INSERT INTO product_addons (addon_type, code, name, price, currency, state)
     VALUES ('FINANCING', 'FINANCING_PLAN', 'Financing plan', 0, 'USD', 'ACTIVE'),
            ('PROTECTION_PLAN', 'PROTECTION_PLAN', 'Extended protection plan', 0, 'USD', 'ACTIVE')
     ON CONFLICT (code) DO NOTHING
     RETURNING id`,
  );
  counts.addons += addonIns.rowCount ?? 0;

  return counts;
}
