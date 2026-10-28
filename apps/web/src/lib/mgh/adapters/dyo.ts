/**
 * M5 — Design Your Own adapter (applet DYOJ pages → the repo's REAL DYO seam).
 *
 * The migrated DYOJ surfaces (applet landing page + applet 4-step
 * configurator markup + applet review dossier) keep the reference applet's
 * EXACT classes and flow. This adapter is their only source of truth:
 *
 * - stones  → REAL ACTIVE single loose stones (`listProducts`, LOOSE_STONE
 *              rows; gem_ref/source_sku equals products.sku, which is what
 *              the DYO create API resolves against `gemstones.gem_ref`).
 * - settings→ REAL setting VARIANTS (`listSettingsForDyo` — one row per
 *              design × metal, acceptance rules verbatim from
 *              `setting_compatibility_rules`), grouped into applet
 *              `SettingItem`s per design; per-metal price deltas are real
 *              arithmetic between the variants of the same design
 *              (min-variant price = base; never invented).
 * - metals  → the real variants' metal code/label (`metals` seed
 *              vocabulary) with the caller's `variantSku` so the DYO create
 *              API receives the REAL setting-variant SKU.
 * - sizes   → the repo's evidenced ring-size keyword list (the constant the
 *              replaced DyoStudio page shipped); no size value is invented.
 * - costs   → component prices are the rows' real `price_amount`; the
 *              configurator's total is an INDICATIVE sum of components —
 *              the applet's own copy stays "Commission Total" and the page
 *              carries the repo's server-quote note. The AUTHORITATIVE
 *              number remains the server quote on the review page and the
 *              quote issued at bag conversion (INV-01/02/03 preserved).
 *
 * Honesty rules retained: unknown design/style/meta stays null (rendered as
 * "Not evidenced"); earring mounts are excluded from the single-stone
 * configurator because INV-03 forbids single-stone attachments there; rows
 * without an evidenced primary image are dropped rather than faked.
 */
import 'server-only';
import type { GemstoneItem, SettingItem, SettingMetalOption } from '@/lib/mgh/fixtures';
import {
  listDyoRecentlyCommissioned,
  listProducts,
  listSettingsForDyo,
  type SettingForDyo,
} from '@/lib/storefront-data';

/** Evidenced ring/mounting size ladder (the replaced DyoStudio page's own list). */
export const DYO_SIZES: string[] = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];

const STONE_LIMIT = 24;

const APPLET_SHAPES: readonly GemstoneItem['shape'][] = [
  'Round',
  'Cushion',
  'Octagon',
  'Oval',
  'Pear',
  'Asscher',
  'Radiant',
  'Marquise',
];

const APPLET_CLARITIES: readonly NonNullable<GemstoneItem['clarity']>[] = [
  'FL',
  'IF',
  'VVS1',
  'VVS2',
  'VSI',
  'VS1',
  'VS2',
  'SI1',
];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeShape(raw: string | null): GemstoneItem['shape'] | null {
  if (!raw) return null;
  const lowered = raw.trim().toLowerCase();
  if (lowered.includes('emerald')) return 'Octagon';
  if (lowered.includes('asscher')) return 'Asscher';
  return APPLET_SHAPES.find((shape) => shape.toLowerCase() === lowered) ?? null;
}

function normalizeClarity(raw: string): NonNullable<GemstoneItem['clarity']> | null {
  const lowered = raw.trim().toLowerCase();
  return APPLET_CLARITIES.find((clarity) => clarity.toLowerCase() === lowered) ?? null;
}

function plainTreatment(raw: string | null): string {
  if (!raw) return 'Not evidenced';
  return raw.trim().length > 0 ? raw : 'Not evidenced';
}

function stoneLede(title: string): string {
  return title.trim().length > 0 ? title : 'Vault loose gemstone';
}

function toGemstoneItem(
  row: Awaited<ReturnType<typeof listProducts>>[number],
): GemstoneItem | null {
  const image = row.imageUrl ?? '';
  if (image.trim().length === 0) return null;
  const variety = row.stoneType ?? row.variety ?? '';
  const shape = normalizeShape(row.shape);
  const clarity = row.clarity ? normalizeClarity(row.clarity) : null;
  const treatment = plainTreatment(row.treatment);
  return {
    id: row.sku,
    sku: row.sku,
    slug: row.slug,
    name: row.title,
    variety,
    varietySlug: slugify(variety),
    colourHue: row.colorHue ?? '',
    colourSlug: slugify(row.colorHue ?? ''),
    carat: row.caratTotal ?? 0,
    shape,
    clarity,
    treatmentDisclosed: treatment,
    origin: row.originCountry ?? 'Not evidenced',
    price: row.priceUsd,
    currency: 'USD',
    availability: 'IN_VAULT',
    images: [image],
    webarAssetId: null,
    lede: row.description ?? stoneLede(row.title),
    description: row.description ?? stoneLede(row.title),
    evidence: {
      laboratory: row.certificateLab ?? null,
      reportNumber: null,
      reportDate: null,
      miningDistrict: null,
      refractiveIndex: null,
      pleochroism: null,
      fluorescence: null,
      specificGravity: null,
      dimensionsMm: null,
      cutGrade: null,
    },
  } as unknown as GemstoneItem;
}

/**
 * The applet configurator's stone pool: the newest ACTIVE single loose
 * stones with an evidenced primary image. Empty when the catalogue is
 * offline — the applet renders its honest empty state, never invented stock.
 */
export async function getDyoConfiguratorStones(): Promise<GemstoneItem[]> {
  const rows = await listProducts({
    kind: 'gemstone',
    quantityType: 'single',
    limit: STONE_LIMIT,
  });
  return rows
    .map(toGemstoneItem)
    .filter((stone): stone is GemstoneItem => stone !== null);
}

/* -----------------------------------------------------------------------
 * Settings — group REAL variants (design × metal) into applet designs.
 * ----------------------------------------------------------------------- */

interface VariantRow {
  designKey: string;
  SettingForDyo: SettingForDyo;
}

function designKeyOf(row: SettingForDyo): string {
  if (row.designCode && row.designCode.trim().length > 0) return row.designCode.trim();
  return row.slug;
}

function metalOption(
  row: SettingForDyo,
  basePrice: number,
): SettingMetalOption | null {
  const code = row.metalCode ?? '';
  if (code.trim().length === 0) return null;
  const label = row.metalLabel && row.metalLabel.trim().length > 0 ? row.metalLabel : code;
  const delta = Math.round((row.priceUsd - basePrice) * 100) / 100;
  return {
    // A metal code outside the documented vocabularies is honestly passed
    // through with the row's own label; nothing is remapped.
    code: code as SettingMetalOption['code'],
    label,
    // The alloy hallmarks are not evidenced in the read layer — the review
    // dossier renders "Not evidenced" instead of an invented stamp.
    hallmark: null,
    priceDelta: delta,
    variantSku: row.variantSku ?? row.sku,
  };
}

function groupSettings(rows: SettingForDyo[]): SettingItem[] {
  const byDesign = new Map<string, VariantRow[]>();
  for (const row of rows) {
    const key = designKeyOf(row);
    const bucket = byDesign.get(key) ?? [];
    bucket.push({ designKey: key, SettingForDyo: row });
    byDesign.set(key, bucket);
  }

  const designs: SettingItem[] = [];
  for (const [key, bucket] of byDesign) {
    bucket.sort((a, b) => a.SettingForDyo.priceUsd - b.SettingForDyo.priceUsd);
    const primaryRow = bucket[0];
    if (!primaryRow) continue;
    const primary = primaryRow.SettingForDyo;
    const category = primary.settingFor ?? '';
    // The applet configurator is a single-stone studio — INV-03 forbids a
    // single stone attaching to earrings, so earring mounts are NOT wired
    // into the 4-step studio (they would only ever fail server validation).
    if (!(category === 'ring' || category === 'pendant')) continue;

    const metalSeen = new Set<string>();
    const metals: SettingMetalOption[] = [];
    for (const variant of bucket) {
      const option = metalOption(variant.SettingForDyo, primary.priceUsd);
      if (!option) continue;
      const seenKey = String(option.code);
      if (metalSeen.has(seenKey)) continue;
      metalSeen.add(seenKey);
      metals.push(option);
    }
    if (metals.length === 0) continue;

    const card = primary;
    const accepts = card.accepts;
    const compatibleShapes = accepts
      .map((rule) => rule.shape)
      .filter((shape): shape is string => shape !== null && shape.trim().length > 0);
    const styleLabel =
      card.styleLabel && card.styleLabel.trim().length > 0
        ? card.styleLabel
        : card.styleCode && card.styleCode.trim().length > 0
          ? card.styleCode
          : key;
    const image = card.imageUrl ?? '';
    if (image.trim().length === 0) continue;

    designs.push({
      // The design's default variant is its cheapest evidenced metal row.
      sku: metals[0]?.variantSku ?? card.sku,
      slug: card.slug,
      name: card.title,
      category: category as SettingItem['category'],
      style: styleLabel,
      basePrice: Math.round(card.priceUsd * 100) / 100,
      compatibleShapes,
      acceptsPairsOnly: false,
      metals,
      sizes: DYO_SIZES,
      bandWidthMm: null,
      galleryHeightMm: null,
      originAtelier: null,
      images: [image],
      webarAssetId: null,
      lede: card.description ?? '',
      description: card.description ?? '',
      // Acceptance rules verbatim from setting_compatibility_rules (the
      // compatibility seam the client filters on; empty = any shape).
      accepts: card.accepts.map((rule) => ({
        shape: rule.shape,
        minCarat: rule.minCarat,
        maxCarat: rule.maxCarat,
      })),
    } satisfies SettingItem);
  }
  return designs;
}

/** The applet configurator's setting pool, grouped per real design. */
export async function getDyoConfiguratorSettings(limit = 48): Promise<SettingItem[]> {
  const variantRows = await listSettingsForDyo(limit);
  return groupSettings(variantRows);
}

export interface DyoCatalogPool {
  stones: GemstoneItem[];
  settings: SettingItem[];
}

/** One round-trip pool for the DYOJ page (stones + grouped settings). */
export async function getDyoConfiguratorPool(limit = 48): Promise<DyoCatalogPool> {
  const [stones, settings] = await Promise.all([
    getDyoConfiguratorStones(),
    getDyoConfiguratorSettings(limit),
  ]);
  return { stones, settings };
}

/* -----------------------------------------------------------------------
 * The public commission ledger (short codes really written by the server).
 * ----------------------------------------------------------------------- */

/** The two most recent REAL commission codes, newest first. */
export async function getDyoRecentCodes(limit = 2): Promise<string[]> {
  return listDyoRecentlyCommissioned(limit);
}

/** The newest REAL commission code (or null when the ledger is empty). */
export async function getDyoLedgerSample(): Promise<string | null> {
  const [first] = await getDyoRecentCodes(1);
  return first ?? null;
}
