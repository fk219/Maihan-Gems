/**
 * Storefront catalogue adapter.
 *
 * This is the ONE seam between develop's storefront components and main's
 * catalogue. Every exported function keeps develop's signature so the copied
 * pages and components stay byte-identical; only the body reads main's
 * `catalogServer()` (the locked-schema CatalogQueryService) instead of
 * develop's fresh-api HTTP surface.
 *
 * Mapping rules (nothing invented; anything the row does not evidence stays
 * null/''/empty so the applet renders its honest "Not evidenced" fallbacks):
 * - id/sku  → the product slug (ProductSummary exposes no gem_ref)
 * - price   → price_amount (never computed from weight); unpriced = 0
 * - shape   → only from GemstoneDetail.shape; lists have no shape → null
 * - clarity → only from GemstoneDetail.clarity.label; lists → null
 * - media   → main's catalogue DTOs carry no media → [] (honest empty)
 * - evidence→ all-null plate; main's DTO carries provenance statuses, not
 *             laboratory values, so no plate field is fabricated
 *
 * Fallback policy: when main's catalogue cannot answer (no DATABASE_URL, an
 * empty table, or a query that yields no rows) the function returns develop's
 * fixture rows so the design renders exactly as it does on develop. Fixture
 * content is demo content and is labelled as such in the UI (see
 * `DEMO_CONTENT` in `lib/mgh/fixtures`).
 */
import 'server-only';

import type {
  EvidencePlate,
  GemstoneItem,
  MatchedPairItem,
  SettingItem,
  SettingMetalOption,
} from '@/lib/mgh/fixtures';
import {
  COLOURS_META,
  DEMO_CONTENT,
  GEMSTONES,
  MATCHED_PAIRS,
  SETTINGS,
  VARIETIES_META,
} from '@/lib/mgh/fixtures';
import type {
  GemstoneDetailReadModel,
  ProductDetailReadModel,
  ProductSummary,
  SettingDesignReadModel,
} from '@maihan/contracts';
import { adaptGemstoneToProductDetail } from '@/lib/gemstone-adapter';

import { catalogServer } from '../../catalog-server.js';

export interface FxRates {
  USD: number;
  AED: number;
  THB: number;
}

const HOME_GEMSTONE_LIMIT = 21;
const HOME_PAIR_LIMIT = 3;
const CATALOG_POOL_LIMIT = 200;
const BROWSE_GEMSTONE_LIMIT = 60;

const GEMSTONE_SHAPES: readonly GemstoneItem['shape'][] = [
  'Round',
  'Cushion',
  'Octagon',
  'Oval',
  'Pear',
  'Asscher',
  'Radiant',
  'Marquise',
];

// standard US ring sizes — presentation constant (owner-approved 2026-10-28;
// the locked catalogue carries no size data by design)
export const STANDARD_RING_SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5'];

type EvidencedGemstone = Omit<GemstoneItem, 'shape' | 'clarity'> & {
  shape: GemstoneItem['shape'] | null;
  clarity: GemstoneItem['clarity'] | null;
};

type EvidencedPair = Omit<MatchedPairItem, 'shape' | 'clarity'> & {
  shape: MatchedPairItem['shape'] | null;
  clarity: MatchedPairItem['clarity'] | null;
};

/** The service type, derived so no second import of the module is needed. */
type CatalogService = ReturnType<typeof catalogServer>;

/**
 * One read against main's catalogue. Any failure (unset DATABASE_URL,
 * connection refused, contract error) becomes `null` so the caller can fall
 * back to demo content instead of throwing a 500 into a storefront page.
 */
async function read<T>(
  fn: (service: CatalogService) => Promise<{ value: T }>,
): Promise<T | null> {
  try {
    const cached = await fn(catalogServer());
    return cached.value;
  } catch {
    return null;
  }
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function num(v: number | null | undefined): number {
  return v == null ? 0 : Number(v);
}

function evidencePlate(): EvidencePlate {
  return {
    laboratory: null,
    reportNumber: null,
    reportDate: null,
    miningDistrict: null,
    refractiveIndex: null,
    pleochroism: null,
    fluorescence: null,
    specificGravity: null,
    dimensionsMm: null,
    cutGrade: null,
  };
}

/* --------------------------------------------------- contract → applet types */

function toGemstoneItem(
  row: ProductSummary,
  detail?: GemstoneDetailReadModel | ProductDetailReadModel | null,
): GemstoneItem {
  const variety = row.variety?.name ?? '';
  const gemDetail = detail !== null && detail !== undefined && 'gem_ref' in detail ? detail : null;
  const shape =
    gemDetail?.shape !== null && gemDetail?.shape !== undefined
      ? GEMSTONE_SHAPES.find((s) => s.toLowerCase() === gemDetail.shape!.toLowerCase()) ?? null
      : null;
  const item: EvidencedGemstone = {
    id: row.slug,
    sku: gemDetail?.gem_ref ?? row.slug,
    slug: row.slug,
    name: row.title,
    variety,
    varietySlug: row.variety?.slug ?? slugify(variety),
    colourHue: row.color?.name ?? '',
    colourSlug: row.color?.slug ?? '',
    carat: num(row.total_weight_ct),
    shape,
    clarity: (gemDetail?.clarity?.label ?? null) as GemstoneItem['clarity'] | null,
    treatmentDisclosed: gemDetail?.treatment?.label ?? '',
    origin: gemDetail?.origin?.name ?? '',
    price: num(row.price_amount),
    currency: 'USD',
    availability: row.availability ? 'IN_VAULT' : 'RESERVED',
    images: [],
    webarAssetId: null,
    lede: detail !== null && detail !== undefined && 'description' in detail ? (detail.description ?? '') : '',
    description:
      detail !== null && detail !== undefined && 'description' in detail ? (detail.description ?? '') : '',
    evidence: evidencePlate(),
  };
  return item as GemstoneItem;
}

function toMatchedPairItem(
  row: ProductSummary,
  detail?: GemstoneDetailReadModel | null,
): MatchedPairItem {
  const variety = row.variety?.name ?? '';
  const totalCarat = num(row.total_weight_ct);
  const stones = detail?.stones ?? [];
  const each: [number, number] =
    stones.length === 2
      ? [num(stones[0]?.weight_ct), num(stones[1]?.weight_ct)]
      : [totalCarat / 2, totalCarat / 2];
  const shape =
    detail?.shape !== null && detail?.shape !== undefined
      ? GEMSTONE_SHAPES.find((s) => s.toLowerCase() === detail.shape!.toLowerCase())
      : null;
  const item: EvidencedPair = {
    id: row.slug,
    sku: detail?.gem_ref ?? row.slug,
    slug: row.slug,
    name: row.title,
    variety,
    varietySlug: row.variety?.slug ?? slugify(variety),
    colourHue: row.color?.name ?? '',
    colourSlug: row.color?.slug ?? '',
    totalCarat,
    eachCarat: each,
    shape: (shape ?? 'Round') as EvidencedPair['shape'],
    clarity: null,
    treatmentDisclosed: detail?.treatment?.label ?? '',
    origin: detail?.origin?.name ?? '',
    symmetryMatchToleranceMm: null,
    price: num(row.price_amount),
    availability: row.availability ? 'IN_VAULT' : 'RESERVED',
    attachmentConstraint: 'EARRINGS_ONLY',
    images: [],
    webarAssetId: null,
    lede: '',
    description: '',
    evidence: evidencePlate(),
  };
  return item as MatchedPairItem;
}

function toGemstoneFromDetail(detail: ProductDetailReadModel, gem?: GemstoneDetailReadModel | null): GemstoneItem {
  return toGemstoneItem(detail as unknown as ProductSummary, gem ?? null);
}

/* --------------------------------------------------------------- products */

interface PoolQuery {
  kind?: string;
  variety?: string;
  colour?: string;
  query?: string;
  limit?: number;
}

async function listProducts(query: PoolQuery): Promise<ProductSummary[]> {
  const filters: Record<string, unknown> = {};
  if (query.kind !== undefined) filters['kind'] = [query.kind];
  if (query.variety !== undefined) filters['variety'] = [query.variety];
  if (query.colour !== undefined) filters['color'] = [query.colour];
  const result = await read((service) =>
    service.listProducts({
      limit: Math.min(query.limit ?? 24, 100),
      sort: 'price',
      direction: 'asc',
      filters: filters as never,
    }),
  );
  return result?.items ?? [];
}

/* ------------------------------------------------------------------ home */

export async function getHomeCatalogGemstones(): Promise<GemstoneItem[]> {
  const rows = await listProducts({ kind: 'LOOSE_STONE', limit: HOME_GEMSTONE_LIMIT });
  if (rows.length === 0) return GEMSTONES.slice(0, HOME_GEMSTONE_LIMIT);
  return rows.map((row) => toGemstoneItem(row));
}

export async function getHomeCatalogMatchedPairs(): Promise<MatchedPairItem[]> {
  const rows = await listProducts({ kind: 'STONE_PAIR', limit: HOME_PAIR_LIMIT });
  if (rows.length === 0) return MATCHED_PAIRS.slice(0, HOME_PAIR_LIMIT);
  return rows.map((row) => toMatchedPairItem(row));
}

/* ------------------------------------------------------- browse / pools */

async function getCatalogStonePool(limit = CATALOG_POOL_LIMIT): Promise<GemstoneItem[]> {
  const rows = await listProducts({ kind: 'LOOSE_STONE', limit: Math.min(limit, 100) });
  if (rows.length === 0) return GEMSTONES;
  return rows.map((row) => toGemstoneItem(row));
}

export async function getBrowseCatalogGemstones(): Promise<GemstoneItem[]> {
  const pool = await getCatalogStonePool();
  return pool.slice(0, BROWSE_GEMSTONE_LIMIT);
}

type VarietyCollection = {
  meta: (typeof VARIETIES_META)[number];
  stones: GemstoneItem[];
  pairs: MatchedPairItem[];
};

type ColourCollection = {
  meta: (typeof COLOURS_META)[number];
  stones: GemstoneItem[];
};

/**
 * Variety collection: the applet ledger meta is used when the slug matches
 * (editorial mineral facts); a live variety outside the ledger gets a minimal
 * meta built from the real taxonomy row.
 */
export async function getCatalogVarietyCollection(slug: string): Promise<VarietyCollection | null> {
  const normalized = slug.trim().toLowerCase();
  const stones = (await listProducts({ variety: normalized, limit: 100 })).map((row) =>
    toGemstoneItem(row),
  );
  const pairs = (await listProducts({ variety: normalized, kind: 'STONE_PAIR', limit: 50 })).map(
    (row) => toMatchedPairItem(row),
  );

  if (!stones.length && !pairs.length) {
    const fixtureStones = GEMSTONES.filter((s) => s.varietySlug === normalized);
    const fixturePairs = MATCHED_PAIRS.filter((p) => p.varietySlug === normalized);
    const ledgerOnly = VARIETIES_META.find((v) => v.slug === normalized);
    if (ledgerOnly) {
      // Demo content keeps the editorial ledger meta AND the ledger's stones;
      // an editorial variety with no stones stays an honest empty listing.
      return { meta: ledgerOnly, stones: fixtureStones, pairs: fixturePairs };
    }
    if (!fixtureStones.length && !fixturePairs.length) return null;
    return {
      meta: minimalVarietyMeta(normalized, fixtureStones[0]?.variety ?? fixturePairs[0]?.variety ?? normalized),
      stones: fixtureStones,
      pairs: fixturePairs,
    };
  }

  const meta = VARIETIES_META.find((v) => v.slug === normalized);
  if (meta) return { meta, stones, pairs };
  const varietyName = stones[0]?.variety ?? pairs[0]?.variety ?? normalized;
  return { meta: minimalVarietyMeta(normalized, varietyName), stones, pairs };
}

function minimalVarietyMeta(slug: string, varietyName: string): (typeof VARIETIES_META)[number] {
  // Real variety outside the editorial ledger: honest empty editorial fields
  // (the page renders 'Not evidenced' markers, never invented mineral facts).
  return {
    slug,
    name: varietyName.charAt(0).toUpperCase() + varietyName.slice(1),
    mineralSpecies: '',
    refractiveIndexRange: '',
    mohsHardness: '',
    lede: '',
  } as unknown as (typeof VARIETIES_META)[number];
}

export async function getCatalogColourCollection(slug: string): Promise<ColourCollection | null> {
  const normalized = slug.trim().toLowerCase();
  const stones = (await listProducts({ colour: normalized, limit: 100 })).map((row) =>
    toGemstoneItem(row),
  );
  if (!stones.length) {
    const fixtureStones = GEMSTONES.filter((s) => s.colourSlug === normalized);
    const ledgerOnly = COLOURS_META.find((c) => c.slug === normalized);
    if (ledgerOnly) return { meta: ledgerOnly, stones: fixtureStones };
    if (!fixtureStones.length) return null;
    const colourName = fixtureStones[0]?.colourHue || normalized;
    return {
      meta: minimalColourMeta(normalized, colourName),
      stones: fixtureStones,
    };
  }
  const meta = COLOURS_META.find((c) => c.slug === normalized);
  if (meta) return { meta, stones };
  const colourName = stones[0]?.colourHue || normalized;
  return { meta: minimalColourMeta(normalized, colourName), stones };
}

function minimalColourMeta(slug: string, colourName: string): (typeof COLOURS_META)[number] {
  return {
    slug,
    name: colourName.charAt(0).toUpperCase() + colourName.slice(1),
    lede: '',
  } as unknown as (typeof COLOURS_META)[number];
}

/**
 * Root catch-all stone lookup: resolves by slug against main's product
 * catalogue. PAIR rows have their own /pairs surface and do not resolve as
 * single stones here (matching the M2b contract).
 */
export async function getCatalogGemstoneBySlugOrId(slugOrId: string): Promise<GemstoneItem | null> {
  const key = slugOrId.trim();
  const detail = await read((service) => service.getProductBySlug(key));
  if (detail !== null && detail.kind !== 'STONE_PAIR') {
    const gem = await read((service) => service.getGemstoneByGemRef(key));
    return toGemstoneFromDetail(detail, gem);
  }
  return GEMSTONES.find((g) => g.slug === key || g.id === key) ?? null;
}

export async function getCatalogRelatedGemstones(
  currentId: string,
  varietySlug: string,
  limit = 4,
): Promise<GemstoneItem[]> {
  const sameVariety = (await listProducts({ variety: varietySlug, limit: limit + 1 }))
    .filter((row) => row.slug !== currentId)
    .map((row) => toGemstoneItem(row));
  if (sameVariety.length >= limit) return sameVariety.slice(0, limit);
  const pool = await getCatalogStonePool();
  const others = pool.filter((g) => g.id !== currentId && g.varietySlug !== varietySlug);
  return [...sameVariety, ...others].slice(0, limit);
}

export async function searchCatalogGemstones(query: string, limit = 12): Promise<GemstoneItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const result = await read((service) =>
    service.search({ q: trimmed, limit: Math.min(limit, 100), filters: {} } as never),
  );
  const items = ((result as { items?: ProductSummary[] } | null)?.items ?? []).map((row) =>
    toGemstoneItem(row),
  );
  if (items.length > 0) return items;
  const lowered = trimmed.toLowerCase();
  return GEMSTONES.filter(
    (g) =>
      g.name.toLowerCase().includes(lowered) ||
      g.variety.toLowerCase().includes(lowered) ||
      g.colourHue.toLowerCase().includes(lowered),
  ).slice(0, limit);
}

export async function getMatchedPairCatalog(limit = 24): Promise<MatchedPairItem[]> {
  const rows = await listProducts({ kind: 'STONE_PAIR', limit: Math.min(limit, 100) });
  if (rows.length === 0) return MATCHED_PAIRS.slice(0, limit);
  return rows.map((row) => toMatchedPairItem(row));
}

/* ------------------------------------------------------------------ PDP */

export interface PdpBreadcrumbVariety {
  name: string;
  slug: string;
}

export interface PdpGemstoneResolution {
  stone: GemstoneItem;
  displayTitle: string;
  productDetail: ProductDetailReadModel | null;
  breadcrumbVariety: PdpBreadcrumbVariety | null;
}

function productDetailFromFixture(stone: GemstoneItem): ProductDetailReadModel {
  const gem = {
    gem_ref: stone.sku,
    kind: 'SINGLE',
    variety: { name: stone.variety, slug: stone.varietySlug },
    color: stone.colourHue ? { name: stone.colourHue, slug: stone.colourSlug } : null,
    total_weight_ct: stone.carat,
    stone_count: 1,
    price_amount: stone.price,
    currency: stone.currency,
    availability: stone.availability !== 'RESERVED' ? 'AVAILABLE' : 'RESERVED',
    provenance: {
      source_url: null,
      source_sku: stone.sku,
      source_sku_derived: null,
      import_batch: null,
      ref_evidence: null,
      price_evidence: null,
    },
    cut_label: null,
  };
  return adaptGemstoneToProductDetail(gem as never, stone.name);
}

export async function getPdpCatalogGemstone(
  slugOrId: string,
  breadcrumbVariety?: PdpBreadcrumbVariety | null,
): Promise<PdpGemstoneResolution | null> {
  const key = slugOrId.trim();

  const detail = await read((service) => service.getProductBySlug(key));
  if (detail !== null && detail.kind !== 'STONE_PAIR') {
    const gem = await read((service) => service.getGemstoneByGemRef(key));
    const stone = toGemstoneFromDetail(detail, gem);
    return {
      stone,
      displayTitle: detail.title,
      productDetail: detail,
      breadcrumbVariety: breadcrumbVariety ?? null,
    };
  }

  const fixtureStone =
    GEMSTONES.find((g) => g.slug === key || g.id === key) ?? null;
  if (fixtureStone === null) return null;
  return {
    stone: fixtureStone,
    displayTitle: fixtureStone.name,
    productDetail: productDetailFromFixture(fixtureStone),
    breadcrumbVariety: breadcrumbVariety ?? null,
  };
}

/* ------------------------------------------------------------- settings */

const JEWELLERY_CATEGORY: Record<string, SettingItem['category']> = {
  RING: 'ring',
  EARRING: 'earrings',
  PENDANT: 'pendant',
  NECKLACE: 'pendant',
  BRACELET: 'pendant',
  NOSE_RING: 'pendant',
};

function toSettingItem(design: SettingDesignReadModel): SettingItem {
  const variants = design.variants ?? [];
  const prices = variants.map((v) => num(v.base_price)).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const metals: SettingMetalOption[] = variants.map((row) => ({
    code: row.metal,
    label: row.metal,
    hallmark: null,
    priceDelta: num(row.base_price) - minPrice,
    variantSku: row.sku,
  }));
  const basePrice =
    num(design.variants.find((v) => num(v.base_price) > 0)?.base_price) || minPrice;
  return {
    sku: design.design_code,
    slug: design.design_code,
    name: design.name,
    category: JEWELLERY_CATEGORY[design.jewellery_type] ?? 'ring',
    style: design.style?.label ?? '',
    basePrice,
    compatibleShapes: [],
    acceptsPairsOnly: design.jewellery_type === 'EARRINGS',
    metals,
    sizes: STANDARD_RING_SIZES,
    bandWidthMm: null,
    galleryHeightMm: null,
    originAtelier: null,
    images: [],
    webarAssetId: null,
    lede: design.description ?? '',
    description: design.description ?? '',
  };
}

async function fetchSettingsGrouped(limit = 100): Promise<SettingItem[]> {
  const result = await read((service) =>
    service.listSettings({ limit: Math.min(limit, 100), filters: {} }),
  );
  return (result?.items ?? []).map(toSettingItem);
}

/**
 * The settings/jewellery surfaces over main's catalogue: one SettingItem per
 * design (metals array = the design's actual variants), sizes = the approved
 * standard ring-size constant.
 */
export async function getFreshSettingsCatalog(): Promise<SettingItem[]> {
  const settings = await fetchSettingsGrouped();
  return settings.length > 0 ? settings : SETTINGS;
}

export async function getFreshEarringSettings(): Promise<SettingItem[]> {
  const settings = await getFreshSettingsCatalog();
  return settings.filter((setting) => setting.category === 'earrings');
}

export async function getFreshSettingBySkuOrSlug(skuOrSlug: string): Promise<SettingItem | null> {
  const key = skuOrSlug.trim();

  const byVariant = await read((service) => service.getSettingVariantBySku(key));
  if (byVariant !== null) return toSettingItem(byVariant.design);

  const byDesign = await read((service) => service.getSettingByDesignCode(key));
  if (byDesign !== null) return toSettingItem(byDesign);

  return (
    SETTINGS.find(
      (setting) =>
        setting.sku === key ||
        setting.slug === key ||
        setting.metals.some((metal) => metal.variantSku === key),
    ) ?? null
  );
}

// Legacy export names kept so the migrated pages stay untouched.
export function getFixtureSettingsCatalog(): Promise<SettingItem[]> {
  return getFreshSettingsCatalog();
}

export function getFixtureEarringSettings(): Promise<SettingItem[]> {
  return getFreshEarringSettings();
}

export function getFixtureSettingBySkuOrSlug(skuOrSlug: string): Promise<SettingItem | null> {
  return getFreshSettingBySkuOrSlug(skuOrSlug);
}

/* ------------------------------------------------- variety/colour links */

export interface FreshVarietyLink {
  code: string;
  slug: string;
  name: string;
  species: string | null;
  family: string;
  familyName: string;
  stones: number;
}

function fixtureVarietyLinks(): FreshVarietyLink[] {
  const counts = new Map<string, number>();
  for (const stone of GEMSTONES) {
    counts.set(stone.varietySlug, (counts.get(stone.varietySlug) ?? 0) + 1);
  }
  return VARIETIES_META.map((v) => ({
    code: slugify(v.name).toUpperCase().slice(0, 6),
    slug: v.slug,
    name: v.name,
    species: v.mineralSpecies || null,
    family: slugify(v.mineralSpecies || 'GEMSTONE'),
    familyName: v.mineralSpecies || 'Gemstone',
    stones: counts.get(v.slug) ?? 0,
  }));
}

/**
 * The homepage editorial rails' variety links over main's taxonomy. The stone
 * count is the number of stones observed in the loaded pool (main's taxonomy
 * exposes no aggregate count); with an empty catalogue the develop fixture
 * ledger is served so the rail renders as designed.
 */
export async function getFreshVarietyLinks(): Promise<FreshVarietyLink[]> {
  const taxonomy = await read((service) => service.getTaxonomy());
  const varieties = (taxonomy?.varieties ?? []).filter((v) => v.state === 'ACTIVE');
  if (varieties.length === 0) return fixtureVarietyLinks();

  const pool = await getCatalogStonePool();
  const counts = new Map<string, number>();
  for (const stone of pool) counts.set(stone.varietySlug, (counts.get(stone.varietySlug) ?? 0) + 1);

  return varieties.map((v) => ({
    code: v.species_code ?? slugify(v.name).toUpperCase().slice(0, 6),
    slug: v.slug,
    name: v.display_name,
    species: v.species_code,
    family: v.species_code ?? 'GEMSTONE',
    familyName: v.species_code ?? 'Gemstone',
    stones: counts.get(v.slug) ?? 0,
  }));
}

export interface FreshColourLink {
  slug: string;
  name: string;
  hex: string | null;
  stones: number;
}

export async function getFreshColourLinks(): Promise<FreshColourLink[]> {
  const taxonomy = await read((service) => service.getTaxonomy());
  const colours = (taxonomy?.colours ?? []).filter((c) => c.state === 'ACTIVE');
  if (colours.length === 0) {
    const counts = new Map<string, number>();
    for (const stone of GEMSTONES) counts.set(stone.colourSlug, (counts.get(stone.colourSlug) ?? 0) + 1);
    return COLOURS_META.map((c) => ({
      slug: c.slug,
      name: c.name,
      hex: c.hex,
      stones: counts.get(c.slug) ?? 0,
    }));
  }

  const pool = await getCatalogStonePool();
  const counts = new Map<string, number>();
  for (const stone of pool) if (stone.colourSlug) counts.set(stone.colourSlug, (counts.get(stone.colourSlug) ?? 0) + 1);

  return colours.map((c) => ({
    slug: c.slug,
    name: c.name,
    hex: c.hue,
    stones: counts.get(c.slug) ?? 0,
  }));
}

/* ------------------------------------------------------- shop-page pool */

/** The /shop kind tabs' full pools (main's catalogue, all non-archived). */
export async function getAllGemstones(): Promise<GemstoneItem[]> {
  return getCatalogStonePool();
}

export async function getAllMatchedPairs(): Promise<MatchedPairItem[]> {
  return getMatchedPairCatalog(100);
}

export async function getAllSettings(): Promise<SettingItem[]> {
  return getFreshSettingsCatalog();
}

/* ------------------------------------------------------------------- FX */

/**
 * Display-rate constants (standard published pegs; live FX lands with the
 * commerce increment). The layout consumes these for the currency switcher.
 */
export const FRESH_FALLBACK_FX: FxRates = { USD: 1, AED: 3.6725, THB: 34.5 };

export function getFreshFxRates(): FxRates {
  return { ...FRESH_FALLBACK_FX };
}

/** Main's catalogue is the database of record; the offline banner never shows. */
export function isFreshCatalogueOffline(): boolean {
  return false;
}

/** The /varieties/[varietySlug] surface: same contract as the fixture fn. */
export async function getVarietyBySlug(slug: string) {
  return getCatalogVarietyCollection(slug);
}

/** Re-exported so pages that need the flag import it from one place. */
export { DEMO_CONTENT };
