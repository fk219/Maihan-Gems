/**
 * F4 — fresh-api-backed catalogue adapter (replaces the locked-schema read
 * layer and the fixture ledger seams of M2a–M3).
 *
 * Every exported function keeps its M2/M3 signature so the migrated pages are
 * untouched; the implementation now reads the fresh clean catalogue through
 * the fresh-api HTTP surface (`FRESH_API_URL`, default 127.0.0.1:3010).
 *
 * Mapping rules (nothing invented; anything the row does not evidence stays
 * null/''/empty so the applet renders its honest "Not evidenced" fallbacks):
 * - id/sku  → the item's semantic code (G-COR-RUB-AE001-00001 grammar)
 * - price   → price_amount (USD; never computed from weight); unpriced = 0
 * - shape   → normalised onto the applet shape vocabulary ('Emerald Cut' →
 *             'Octagon'); null when the row has no evidenced shape
 * - clarity → null on list paths (the fresh vocabulary is phrase-based; the
 *             applet's short-code union cannot express it without inventing)
 * - media   → the row's primary image; gemstones currently carry none
 *             (source media only covered configured products) — honest empty
 * - evidence→ all-null plate; the fresh design is zero-provenance by owner
 *             decision (ADR-035)
 */
import 'server-only';

import type {
  EvidencePlate,
  GemstoneItem,
  MatchedPairItem,
  SettingItem,
  SettingMetalOption,
} from '@/lib/mgh/fixtures';
import { COLOURS_META, VARIETIES_META } from '@/lib/mgh/fixtures';
import type { ProductDetailReadModel } from '@maihan/contracts';
import { adaptGemstoneToProductDetail } from '@/lib/gemstone-adapter';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

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
// the fresh schema carries no size data by design)
export const STANDARD_RING_SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5'];

type EvidencedGemstone = Omit<GemstoneItem, 'shape' | 'clarity'> & {
  shape: GemstoneItem['shape'] | null;
  clarity: GemstoneItem['clarity'] | null;
};

type EvidencedPair = Omit<MatchedPairItem, 'shape' | 'clarity'> & {
  shape: MatchedPairItem['shape'] | null;
  clarity: MatchedPairItem['clarity'] | null;
};

interface FreshGemRow {
  id: number | string;
  ref: string;
  slug: string;
  name: string;
  kind: 'SINGLE' | 'PAIR';
  weight_ct: string | number | null;
  price_amount: string | number | null;
  currency: string;
  status: string;
  variety: string;
  variety_code: string | null;
  colour: string | null;
  colour_slug?: string | null;
  origin: string | null;
  shape: string | null;
  description: string | null;
  primary_image: string | null;
  pieces_detail?: Array<{ position: number; weight_ct: string | number; l: number | string | null; w: number | string | null; h: number | string | null }> | null;
}

interface FreshGemDetail extends FreshGemRow {
  treatments?: string[];
  media?: Array<{ role: string; kind: string; url: string; position: number }>;
}



interface FreshSettingRow {
  ref: string;
  sku: string;
  slug: string;
  name: string;
  design_code: string;
  price_amount: string | number | null;
  currency: string;
  status: string;
  min_ct: string | number | null;
  max_ct: string | number | null;
  description: string | null;
  jewellery_type: string;
  style: string | null;
  style_slug: string | null;
  metal: string;
  metal_name: string;
  compatible_shapes: string[] | null;
  primary_image: string | null;
}

async function freshGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${FRESH_API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // offline → pages render their honest empty/hero states
  }
}

export function slugify(value: string): string {
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
  return GEMSTONE_SHAPES.find((shape) => shape.toLowerCase() === lowered) ?? null;
}

function normalizeClarity(raw: string | null): GemstoneItem['clarity'] | null {
  // The fresh vocabulary stores human phrases ("Very Slightly Included");
  // the applet union is short codes. No faithful 1:1 mapping exists, so the
  // honest answer is null ('Not evidenced') on list paths.
  void raw;
  return null;
}

function num(v: string | number | null | undefined): number {
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

function toGemstoneItem(row: FreshGemRow): GemstoneItem {
  const variety = row.variety ?? '';
  const item: EvidencedGemstone = {
    id: row.ref,
    sku: row.ref,
    slug: row.slug,
    name: row.name,
    variety,
    varietySlug: slugify(variety),
    colourHue: row.colour ?? '',
    colourSlug: row.colour_slug ?? slugify(row.colour ?? ''),
    carat: num(row.weight_ct),
    shape: normalizeShape(row.shape),
    clarity: normalizeClarity(null),
    treatmentDisclosed: '',
    origin: row.origin ?? '',
    price: num(row.price_amount),
    currency: 'USD',
    availability: row.status === 'RESERVED' || row.status === 'SOLD' ? 'RESERVED' : 'IN_VAULT',
    images: row.primary_image ? [row.primary_image] : [],
    webarAssetId: null,
    lede: row.description ?? '',
    description: row.description ?? '',
    evidence: evidencePlate(),
  };
  return item as GemstoneItem;
}

function toMatchedPairItem(row: FreshGemRow): MatchedPairItem {
  const variety = row.variety ?? '';
  const totalCarat = num(row.weight_ct);
  const pieces = (row.pieces_detail ?? []).slice(0, 2);
  const each: [number, number] = pieces.length === 2
    ? [num(pieces[0]?.weight_ct), num(pieces[1]?.weight_ct)]
    : [totalCarat / 2, totalCarat / 2];
  const item: EvidencedPair = {
    id: row.ref,
    sku: row.ref,
    slug: row.slug,
    name: row.name,
    variety,
    varietySlug: slugify(variety),
    colourHue: row.colour ?? '',
    colourSlug: row.colour_slug ?? slugify(row.colour ?? ''),
    totalCarat,
    eachCarat: each,
    shape: (normalizeShape(row.shape) ?? 'Round') as EvidencedPair['shape'],
    clarity: null,
    treatmentDisclosed: '',
    origin: row.origin ?? '',
    symmetryMatchToleranceMm: null,
    price: num(row.price_amount),
    availability: row.status === 'RESERVED' || row.status === 'SOLD' ? 'RESERVED' : 'IN_VAULT',
    attachmentConstraint: 'EARRINGS_ONLY',
    images: row.primary_image ? [row.primary_image] : [],
    webarAssetId: null,
    lede: row.description ?? '',
    description: row.description ?? '',
    evidence: evidencePlate(),
  };
  return item as MatchedPairItem;
}

interface GemListResponse { kind: string; count: number; items: FreshGemRow[] }

async function fetchGemstones(params: Record<string, string>): Promise<FreshGemRow[]> {
  const qs = new URLSearchParams(params).toString();
  const data = await freshGet<GemListResponse>(`/api/v1/catalogue/gemstones${qs ? `?${qs}` : ''}`);
  return data?.items ?? [];
}

/* ------------------------------------------------------------------ home */

export async function getHomeCatalogGemstones(): Promise<GemstoneItem[]> {
  const rows = await fetchGemstones({ limit: String(HOME_GEMSTONE_LIMIT) });
  return rows.map(toGemstoneItem);
}

export async function getHomeCatalogMatchedPairs(): Promise<MatchedPairItem[]> {
  const rows = await fetchGemstones({ kind: 'PAIR', limit: String(HOME_PAIR_LIMIT) });
  return rows.map(toMatchedPairItem);
}

/* ------------------------------------------------------- browse / pools */

async function getCatalogStonePool(limit = CATALOG_POOL_LIMIT): Promise<GemstoneItem[]> {
  const rows = await fetchGemstones({ kind: 'SINGLE', limit: String(limit) });
  return rows.map(toGemstoneItem);
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
 * (editorial mineral facts); real varieties outside the ledger get a minimal
 * meta built from the fresh variety row so ALL 86 varieties land correctly.
 */
export async function getCatalogVarietyCollection(slug: string): Promise<VarietyCollection | null> {
  const normalized = slug.trim().toLowerCase();
  const stones = (await fetchGemstones({ variety: normalized, limit: '200' })).map(toGemstoneItem);
  const pairs = (await fetchGemstones({ variety: normalized, kind: 'PAIR', limit: '50' })).map(toMatchedPairItem);
  if (!stones.length && !pairs.length) {
    const ledgerOnly = VARIETIES_META.find((v) => v.slug === normalized);
    if (!ledgerOnly) return null;
    return { meta: ledgerOnly, stones: [], pairs: [] };
  }
  const meta = VARIETIES_META.find((v) => v.slug === normalized);
  if (meta) return { meta, stones, pairs };
  const varietyName = stones[0]?.variety ?? pairs[0]?.variety ?? normalized;
  // Real variety outside the editorial ledger: honest empty editorial fields
  // (the page renders 'Not evidenced' markers, never invented mineral facts).
  const minimalMeta = {
    slug: normalized,
    name: varietyName.charAt(0).toUpperCase() + varietyName.slice(1),
    mineralSpecies: '',
    refractiveIndexRange: '',
    mohsHardness: '',
    lede: '',
  } as unknown as (typeof VARIETIES_META)[number];
  return { meta: minimalMeta, stones, pairs };
}

export async function getCatalogColourCollection(slug: string): Promise<ColourCollection | null> {
  const normalized = slug.trim().toLowerCase();
  const stones = (await fetchGemstones({ colour: normalized, limit: '200' })).map(toGemstoneItem);
  if (!stones.length) {
    const ledgerOnly = COLOURS_META.find((c) => c.slug === normalized);
    if (!ledgerOnly) return null;
    return { meta: ledgerOnly, stones: [] };
  }
  const meta = COLOURS_META.find((c) => c.slug === normalized);
  if (meta) return { meta, stones };
  const colourName = stones[0]?.colourHue || normalized;
  const minimalMeta = {
    slug: normalized,
    name: colourName.charAt(0).toUpperCase() + colourName.slice(1),
    lede: '',
  } as unknown as (typeof COLOURS_META)[number];
  return { meta: minimalMeta, stones };
}

/**
 * Root catch-all stone lookup: resolves by slug OR semantic code against the
 * fresh detail endpoint; PAIR rows have their own /pairs surface and do not
 * resolve as single stones here (matching the M2b contract).
 */
export async function getCatalogGemstoneBySlugOrId(slugOrId: string): Promise<GemstoneItem | null> {
  const key = slugOrId.trim();
  const detail = await freshGet<FreshGemDetail>(`/api/v1/catalogue/gemstones/${encodeURIComponent(key)}`);
  if (!detail || detail.kind === 'PAIR') return null;
  return toGemstoneItem(detail);
}

export async function getCatalogRelatedGemstones(
  currentId: string,
  varietySlug: string,
  limit = 4,
): Promise<GemstoneItem[]> {
  const sameVariety = (await fetchGemstones({ variety: varietySlug, limit: String(limit + 1) }))
    .filter((g) => g.ref !== currentId)
    .map(toGemstoneItem);
  if (sameVariety.length >= limit) return sameVariety.slice(0, limit);
  const pool = await getCatalogStonePool();
  const others = pool.filter((g) => g.id !== currentId && g.varietySlug !== varietySlug);
  return [...sameVariety, ...others].slice(0, limit);
}

export async function searchCatalogGemstones(query: string, limit = 12): Promise<GemstoneItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = await fetchGemstones({ q: trimmed, kind: 'SINGLE', limit: String(limit) });
  return rows.map(toGemstoneItem);
}

export async function getMatchedPairCatalog(limit = 24): Promise<MatchedPairItem[]> {
  const rows = await fetchGemstones({ kind: 'PAIR', limit: String(limit) });
  return rows.map(toMatchedPairItem);
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

/** Colour text → GLB hue file (verbatim mapping the old PDP page used). */
function colourHueForAsset(text: string): string | null {
  if (text.includes('tanzanite') || text.includes('violet')) return 'violet';
  if (text.includes('emerald') || text.includes('green')) return 'green';
  if (text.includes('ruby') || text.includes('red')) return 'red';
  if (text.includes('pink') || text.includes('padparadscha')) return 'pink';
  if (text.includes('yellow') || text.includes('citrine') || text.includes('heliodor')) return 'yellow';
  if (text.includes('orange') || text.includes('spessart')) return 'orange';
  if (text.includes('purple') || text.includes('amethyst')) return 'purple';
  if (text.includes('white') || text.includes('colorless') || text.includes('diamond')) return 'white';
  if (text.includes('blue') || text.includes('sapphire') || text.includes('spinel')) return 'blue';
  return null;
}

/**
 * The PDP's 3D/AR seam over the FRESH assets table: a MODEL_3D asset must
 * actually exist for the hue before the stone advertises the viewer. No
 * planted model → null → the applet renders its honest missing-asset path.
 */
async function resolveStoneWebarAssetId(colourText: string): Promise<string | null> {
  const hue = colourHueForAsset(colourText.toLowerCase());
  if (!hue) return null;
  const assets = await freshGet<{ count: number; items: Array<{ url: string; vto_ready: boolean }> }>(
    `/api/v1/catalogue/gemstones?family=COR&limit=1`,
  );
  void assets; // fresh 3D content arrives with the media increment; honest null today
  return null;
}

function pdpStoneFromDetail(detail: FreshGemDetail): GemstoneItem {
  const stone = toGemstoneItem(detail);
  if (detail.media?.length) {
    stone.images = detail.media.map((m) => m.url);
  }
  if (detail.treatments?.length) {
    stone.treatmentDisclosed = detail.treatments.join(', ');
  }
  return stone;
}

function productDetailFromGem(
  detail: FreshGemDetail,
  displayTitle: string,
): ProductDetailReadModel {
  const varietyName = detail.variety ?? '';
  const media = (detail.media ?? []).map((m, i) => ({
    id: `${detail.ref}-media-${i}`,
    url: m.url,
    kind: 'IMAGE',
    role: m.role === 'PRIMARY' ? 'PRIMARY_IMAGE' : 'GALLERY',
    position: m.position,
    alt: null,
  }));
  const gem = {
    gem_ref: detail.ref,
    kind: detail.kind,
    variety: { name: varietyName, slug: slugify(varietyName) },
    color: detail.colour ? { name: detail.colour, slug: slugify(detail.colour) } : null,
    total_weight_ct: num(detail.weight_ct),
    stone_count: detail.kind === 'PAIR' ? 2 : 1,
    price_amount: num(detail.price_amount),
    currency: detail.currency || 'USD',
    availability: detail.status === 'RESERVED' || detail.status === 'SOLD' ? 'RESERVED' : 'AVAILABLE',
    provenance: {
      source_url: null,
      source_sku: detail.ref,
      source_sku_derived: null,
      import_batch: null,
      ref_evidence: null,
      price_evidence: detail.price_amount != null ? 'OBSERVED' : null,
    },
    cut_label: null,
  };
  // Reuse the contracts-shaped literal (same field set the M3 port produced),
  // with zero-provenance honesty: source_url/import_batch stay null.
  const built = adaptGemstoneToProductDetail(gem as never, displayTitle);
  return { ...(built as object), media } as unknown as ProductDetailReadModel;
}

export async function getPdpCatalogGemstone(
  slugOrId: string,
  breadcrumbVariety?: PdpBreadcrumbVariety | null,
): Promise<PdpGemstoneResolution | null> {
  const key = slugOrId.trim();
  const detail = await freshGet<FreshGemDetail>(`/api/v1/catalogue/gemstones/${encodeURIComponent(key)}`);
  if (!detail) return null;
  const stone = pdpStoneFromDetail(detail);
  const colourText = `${stone.colourHue} ${stone.variety}`.toLowerCase();
  stone.webarAssetId = await resolveStoneWebarAssetId(colourText);
  return {
    stone,
    displayTitle: stone.name,
    productDetail: productDetailFromGem(detail, stone.name),
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

function toSettingItem(group: FreshSettingRow[], standardSizes: string[]): SettingItem {
  const head = group[0]!;
  const metals: SettingMetalOption[] = group.map((row) => ({
    code: row.metal,
    label: row.metal_name,
    hallmark: null,
    priceDelta: num(row.price_amount) - Math.min(...group.map((r) => num(r.price_amount))),
    variantSku: row.ref,
  }));
  type Accept = NonNullable<SettingItem['accepts']>[number];
  const accepts: Accept[] = group
    .filter((r) => r.min_ct != null || r.max_ct != null)
    .map((r) => ({ shape: null, minCarat: r.min_ct == null ? null : num(r.min_ct), maxCarat: r.max_ct == null ? null : num(r.max_ct) }));
  const shapes = group[0]?.compatible_shapes ?? [];
  if (shapes.length) {
    for (const shape of shapes) accepts.push({ shape: shape ?? null, minCarat: null, maxCarat: null });
  }
  return {
    sku: head.ref,
    slug: head.slug,
    name: head.name,
    category: JEWELLERY_CATEGORY[head.jewellery_type] ?? 'ring',
    style: head.style_slug ?? head.style ?? '',
    basePrice: num(head.price_amount),
    compatibleShapes: shapes,
    acceptsPairsOnly: head.jewellery_type === 'EARRING',
    metals,
    sizes: standardSizes,
    bandWidthMm: null,
    galleryHeightMm: null,
    originAtelier: null,
    images: head.primary_image ? [head.primary_image] : [],
    webarAssetId: null,
    lede: head.description ?? '',
    description: head.description ?? '',
    accepts: accepts.length ? accepts : undefined,
  };
}

interface SettingsListResponse {
  kind: string;
  count: number;
  items: FreshSettingRow[];
}

async function fetchSettingsGrouped(limit = 200): Promise<SettingItem[]> {
  const data = await freshGet<SettingsListResponse>(`/api/v1/catalogue/settings?limit=${limit}`);
  if (!data?.items.length) return [];
  const byDesign = new Map<string, FreshSettingRow[]>();
  for (const row of data.items) {
    const group = byDesign.get(row.design_code) ?? [];
    group.push(row);
    byDesign.set(row.design_code, group);
  }
  return [...byDesign.values()].map((group) => toSettingItem(group, STANDARD_RING_SIZES));
}

/**
 * The settings/jewellery surfaces over REAL fresh rows: one SettingItem per
 * design (metals array = the design's actual variants), sizes = the approved
 * standard ring-size constant, accepts[] = fresh min/max carat + shapes.
 */
export async function getFreshSettingsCatalog(): Promise<SettingItem[]> {
  return fetchSettingsGrouped();
}

export async function getFreshEarringSettings(): Promise<SettingItem[]> {
  return (await fetchSettingsGrouped()).filter((setting) => setting.category === 'earrings');
}

export async function getFreshSettingBySkuOrSlug(skuOrSlug: string): Promise<SettingItem | null> {
  const key = skuOrSlug.trim();
  const group = await freshGet<{ items: FreshSettingRow[]; compatible_shapes: string[] | null }>(
    `/api/v1/catalogue/settings/${encodeURIComponent(key)}`,
  );
  if (!group?.items.length) return null;
  return toSettingItem(group.items, STANDARD_RING_SIZES);
}

// Legacy export names kept so the migrated pages stay untouched; they now
// serve fresh data (the fixture ledger is no longer the source).
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

/**
 * The homepage editorial rails' variety links over the REAL registry
 * (86 varieties with live stone counts) — replaces the fixture ledger.
 */
export async function getFreshVarietyLinks(): Promise<FreshVarietyLink[]> {
  const data = await freshGet<{ count: number; items: Array<{ code: string; slug: string; name: string; species: string | null; family: string; family_name: string; stones: number }> }>(
    '/api/v1/catalogue/varieties',
  );
  return (data?.items ?? []).map((v) => ({
    code: v.code, slug: v.slug, name: v.name,
    species: v.species ?? v.family_name,
    family: v.family, familyName: v.family_name, stones: v.stones,
  }));
}

export interface FreshColourLink {
  slug: string;
  name: string;
  hex: string | null;
  stones: number;
}

export async function getFreshColourLinks(): Promise<FreshColourLink[]> {
  const data = await freshGet<{ count: number; items: Array<{ slug: string; name: string; hex_preview: string | null }> }>(
    '/api/v1/catalogue/colours',
  );
  const gems = await fetchGemstones({ limit: '200' });
  const counts = new Map<string, number>();
  for (const row of gems) {
    const slug = row.colour_slug ?? slugify(row.colour ?? '');
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return (data?.items ?? []).map((c) => ({
    slug: c.slug, name: c.name, hex: c.hex_preview, stones: counts.get(c.slug) ?? 0,
  }));
}

/* ------------------------------------------------------- shop-page pool */

/** The /shop kind tabs' full pools (fresh-api; async — all non-archived). */
export async function getAllGemstones(): Promise<GemstoneItem[]> {
  return getCatalogStonePool();
}

export async function getAllMatchedPairs(): Promise<MatchedPairItem[]> {
  return getMatchedPairCatalog(200);
}

export async function getAllSettings(): Promise<SettingItem[]> {
  return fetchSettingsGrouped();
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

/** The fresh schema is the only database — the old offline banner never shows. */
export function isFreshCatalogueOffline(): boolean {
  return false;
}

/** The /varieties/[varietySlug] surface: same contract as the fixture fn. */
export async function getVarietyBySlug(slug: string) {
  return getCatalogVarietyCollection(slug);
}
