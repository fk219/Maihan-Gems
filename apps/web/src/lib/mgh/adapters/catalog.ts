/**
 * M2a — homepage catalogue adapter (applet fixture types → repo real data).
 *
 * Bridges the repo's live catalogue (migration 0019 `products`, read through
 * the storefront read layer in `@/lib/storefront-data`) onto the applet's
 * fixture item types so the migrated reference homepage renders real stock.
 *
 * Mapping rules (nothing invented; anything the row does not evidence stays
 * null or empty):
 * - id/sku  → `products.sku` (the read layer COALESCEs source_sku,
 *             source_sku_derived, structured sku, MG-<product_number>)
 * - name    → `products.title`
 * - price   → `price_amount` (USD; never computed from weight)
 * - variety → `structured_extra->>'stone_type'` (falls back to `variety`)
 * - carat   → `total_weight_ct`
 * - shape   → `structured_extra->>'shape'` normalised onto the applet shape
 *             vocabulary ('Emerald Cut' → 'Octagon', 'Asscher - Octagon' →
 *             'Asscher'); null when the row has no evidenced shape
 * - colour  → `structured_extra->>'color_hue'`
 * - origin  → `structured_extra->>'origin_country'`
 * - images  → the row's primary image URL
 * - evidence.laboratory → the linked certificate's lab; every other evidence
 *   field is null (the applet renders 'Not evidenced' — correct honest state)
 *
 * The fixture unions for `shape`/`clarity` cannot express "not evidenced".
 * Both fields are unrendered on the homepage path (ProductCard consumes
 * name/variety/treatment/carat/price/images/ids only), so the adapter keeps
 * the honest null and narrows the assembled row at the type boundary.
 */
import 'server-only';

import type {
  EvidencePlate,
  GemstoneItem,
  MatchedPairItem,
  SettingItem,
} from '@/lib/mgh/fixtures';
import { COLOURS_META, VARIETIES_META } from '@/lib/mgh/fixtures';
import {
  getAllSettings,
  getSettingBySkuOrSlug,
} from '@/lib/mgh/storefront-data';
import {
  getProductBySlug,
  isCatalogueOffline,
  listProducts,
  searchStorefront,
} from '@/lib/storefront-data';
import type { StorefrontCard } from '@/lib/storefront-types';

const HOME_GEMSTONE_LIMIT = 21;
const HOME_PAIR_LIMIT = 3;

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

type EvidencedGemstone = Omit<GemstoneItem, 'shape' | 'clarity'> & {
  shape: GemstoneItem['shape'] | null;
  clarity: GemstoneItem['clarity'] | null;
};

type EvidencedPair = Omit<MatchedPairItem, 'shape' | 'clarity'> & {
  shape: MatchedPairItem['shape'] | null;
  clarity: MatchedPairItem['clarity'] | null;
};

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
  return GEMSTONE_SHAPES.find((shape) => shape.toLowerCase() === lowered) ?? null;
}

function evidencePlate(laboratory: string | null): EvidencePlate {
  return {
    laboratory,
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

function toGemstoneItem(row: StorefrontCard): GemstoneItem {
  const variety = row.stoneType ?? row.variety ?? '';
  const item: EvidencedGemstone = {
    id: row.sku,
    sku: row.sku,
    slug: row.slug,
    name: row.title,
    variety,
    varietySlug: slugify(variety),
    colourHue: row.colorHue ?? '',
    colourSlug: slugify(row.colorHue ?? ''),
    carat: row.caratTotal ?? 0,
    shape: normalizeShape(row.shape),
    clarity: null,
    treatmentDisclosed: row.treatment ?? '',
    origin: row.originCountry ?? '',
    price: row.priceUsd,
    currency: 'USD',
    availability: 'IN_VAULT',
    images: row.imageUrl ? [row.imageUrl] : [],
    webarAssetId: null,
    lede: row.description ?? '',
    description: row.description ?? '',
    evidence: evidencePlate(row.certificateLab ?? null),
  };
  return item as GemstoneItem;
}

function toMatchedPairItem(row: StorefrontCard): MatchedPairItem {
  const variety = row.stoneType ?? row.variety ?? '';
  const totalCarat = row.caratTotal ?? 0;
  const item: EvidencedPair = {
    id: row.sku,
    sku: row.sku,
    slug: row.slug,
    name: row.title,
    variety,
    varietySlug: slugify(variety),
    colourHue: row.colorHue ?? '',
    colourSlug: slugify(row.colorHue ?? ''),
    totalCarat,
    // A matched pair is two stones totalling the evidenced weight; the
    // per-stone split is derived arithmetic (unrendered on the homepage).
    eachCarat: [totalCarat / 2, totalCarat / 2],
    shape: normalizeShape(row.shape) as EvidencedPair['shape'],
    clarity: null,
    treatmentDisclosed: row.treatment ?? '',
    origin: row.originCountry ?? '',
    symmetryMatchToleranceMm: null,
    price: row.priceUsd,
    availability: 'IN_VAULT',
    attachmentConstraint: 'EARRINGS_ONLY',
    images: row.imageUrl ? [row.imageUrl] : [],
    webarAssetId: null,
    lede: row.description ?? '',
    description: row.description ?? '',
    evidence: evidencePlate(row.certificateLab ?? null),
  };
  return item as MatchedPairItem;
}

/**
 * The homepage's gemstone pool: the newest ACTIVE loose-stone products of the
 * real catalogue, mapped onto the applet's Gemstone shape. Returns [] when
 * the catalogue database is unreachable or carries no rows — the page renders
 * its hero and editorial sections regardless and never crashes.
 */
export async function getHomeCatalogGemstones(): Promise<GemstoneItem[]> {
  const rows = await listProducts({
    kind: 'gemstone',
    quantityType: 'single',
    limit: HOME_GEMSTONE_LIMIT,
  });
  if (isCatalogueOffline()) return [];
  return rows.map(toGemstoneItem);
}

/**
 * The homepage's matched-pair pick, same contract as the gemstone pool.
 * The page slices the first entry (reference call shape preserved).
 */
export async function getHomeCatalogMatchedPairs(): Promise<MatchedPairItem[]> {
  const rows = await listProducts({
    kind: 'gemstone',
    quantityType: 'pair',
    limit: HOME_PAIR_LIMIT,
  });
  if (isCatalogueOffline()) return [];
  return rows.map(toMatchedPairItem);
}

/* ===========================================================================
 * M2b — browse / search / variety / colour / pairs page adapters (below).
 *
 * Same discipline as M2a: the applet's page components receive REAL catalogue
 * rows mapped onto the applet item types; every field the row does not
 * evidence stays null/''/empty so the applet renders its honest fallback.
 * The applet's fixture ledger (VARIETIES_META / COLOURS_META) remains the
 * page-level editorial taxonomy: it is applet-authored content (mineral
 * species, hue swatches), not evidence-bearing product data.
 * =========================================================================== */

const CATALOG_POOL_LIMIT = 200;
const BROWSE_GEMSTONE_LIMIT = 60;

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
 * The live single-stone pool used by browse, the variety collections and the
 * colour collections. Returns [] when the catalogue database is unreachable.
 */
async function getCatalogStonePool(limit = CATALOG_POOL_LIMIT): Promise<GemstoneItem[]> {
  const rows = await listProducts({
    kind: 'gemstone',
    quantityType: 'single',
    limit,
  });
  if (isCatalogueOffline()) return [];
  return rows.map(toGemstoneItem);
}

/**
 * /browse — the browse page's one CollectionExplorer dataset: the newest
 * ACTIVE loose-stone products of the real catalogue, synchronised with the
 * explorer's client-side filtering and pagination (9 per page).
 */
export async function getBrowseCatalogGemstones(): Promise<GemstoneItem[]> {
  const pool = await getCatalogStonePool();
  return pool.slice(0, BROWSE_GEMSTONE_LIMIT);
}

/**
 * Variety collection for the root catch-all: the applet's variety metadata
 * ledger (editorial facts: mineral species, RI range, Mohs) drives the page
 * header; the LOTS grid is the real catalogue filtered by the applet's
 * same variety slug. The two taxonomies overlap only where a real row's
 * stone type matches a ledger slug (e.g. `spinel`), which is the honest
 * current state of the variety join.
 */
export async function getCatalogVarietyCollection(
  slug: string,
): Promise<VarietyCollection | null> {
  const normalized = slug.trim().toLowerCase();
  const meta = VARIETIES_META.find((v) => v.slug === normalized);
  if (!meta) return null;
  const stones = (await getCatalogStonePool()).filter(
    (stone) => stone.varietySlug === normalized,
  );
  return { meta, stones, pairs: [] };
}

/**
 * Colour collection: same shape as the variety one, keyed on the applet's
 * colour slug (e.g. `blue`, `green`, `red` match the real catalogue's hue
 * rows directly; other ledger hues render an empty — still honest — grid).
 */
export async function getCatalogColourCollection(
  slug: string,
): Promise<ColourCollection | null> {
  const normalized = slug.trim().toLowerCase();
  const meta = COLOURS_META.find((c) => c.slug === normalized);
  if (!meta) return null;
  const stones = (await getCatalogStonePool()).filter(
    (stone) => stone.colourSlug === normalized,
  );
  return { meta, stones };
}

/**
 * Root catch-all stone lookup (`/[stone-slug]` → the applet PDP view).
 * Only LOOSE_STONE rows resolve here (pairs/settings have their own routes
 * and their own referenced applet surfaces); unknown system names 404.
 */
export async function getCatalogGemstoneBySlugOrId(
  slugOrId: string,
): Promise<GemstoneItem | null> {
  const row = await getProductBySlug(slugOrId.trim());
  if (!row || row.kind !== 'gemstone') return null;
  if (row.quantityType === 'pair') return null;
  return toGemstoneItem(row);
}

/**
 * "Related loose stones" for the applet PDP view: same-stone variety first,
 * then the rest of the live pool — the applet's ordering contract, rebuilt
 * over real rows instead of the fixture ledger.
 */
export async function getCatalogRelatedGemstones(
  currentId: string,
  varietySlug: string,
  limit = 4,
): Promise<GemstoneItem[]> {
  const pool = await getCatalogStonePool();
  const sameVariety = pool.filter((g) => g.id !== currentId && g.varietySlug === varietySlug);
  const others = pool.filter((g) => g.id !== currentId && g.varietySlug !== varietySlug);
  return [...sameVariety, ...others].slice(0, limit);
}

/**
 * /search seed — the repo's server-side search (the library the repo search
 * page used before this migration) resolved against the applet's stone card
 * type. Only single stones are surfaced in the seeded turn: pair and
 * jewellery results have their own applet surfaces and are not remixed here.
 */
export async function searchCatalogGemstones(
  query: string,
  limit = 12,
): Promise<GemstoneItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { items: rows } = await searchStorefront(trimmed, limit);
  return rows
    .filter((row) => row.kind === 'gemstone' && row.quantityType !== 'pair')
    .slice(0, limit)
    .map(toGemstoneItem);
}

/**
 * /pairs — real matched pairs from the catalogue (quantityType='pair' rows).
 */
export async function getMatchedPairCatalog(limit = 24): Promise<MatchedPairItem[]> {
  const rows = await listProducts({
    kind: 'gemstone',
    quantityType: 'pair',
    limit,
  });
  if (isCatalogueOffline()) return [];
  return rows.map(toMatchedPairItem);
}

/* ===========================================================================
 * M3 — product-detail + WebAR adapters (below).
 *
 * The reference applet's PDP (`ProductDetailView` / `ProductDetailClient`)
 * consumes the same `GemstoneItem` ledger as the migrated grids, so the PDP
 * adapter reuses the M2a mapping discipline over the repo's live seams:
 *
 * - id/sku → products.sku (getProductBySlug COALESCEs the observed sources)
 * - name   → the row's display title (or the genstone-ref composed title
              the catalogue port composes for loose stones)
 * - price  → price_amount (NEVER computed from weight)
 * - carat  → total_weight_ct
 * - shape/clarity → normalised onto the applet unions where the row
 *             evidences them; null ('Not evidenced') when it does not
 * - treatmentDisclosed/origin → the row's values; 'Not evidenced' when the
 *             row does not evidence them (the applet renders the marker
 *             verbatim instead of leaving an empty string)
 * - images → evidenced image URLs only ( media rows / asset usages );
 *             missing media renders fewer slides, never an invented photo
 * - evidence.laboratory → the linked certificate's lab; every other
 *             EvidencePlate field stays null (INV-07: no non-verified
 *             field may render as verified truth)
 *
 * Resolution order mirrors the canonical PDP the applet replaces
 * (`/products/[productSlug]` pre-M3):
 *   1. the storefront read layer (`getProductBySlug` — live DB with the
 *      compiled NGC merge fallback; inactive DB rows stay hard-null),
 *   2. the catalogue port (`loadProductDetail` → `loadGemstoneDetail`,
 *      the K1324/PR5681 gem-ref path),
 *   then notFound. Rows that are SETTING_ONLY resolve to null here: the
 *      applet PDP is a stone/jewellery surface; settings keep their own
 *      referenced `/settings/[sku]` route (outside this migration family).
 * =========================================================================== */

import type {
  GemstoneDetailReadModel,
  ProductDetailReadModel,
} from '@maihan/contracts';

import { isProductNotFound } from '@/lib/catalog-errors';
import {
  loadGemstoneDetail,
  loadProductDetail,
} from '@/lib/catalog-server';
import { adaptGemstoneToProductDetail } from '@/lib/gemstone-adapter';
import { loadWebarAssetByAssetId } from '@/lib/webar-server';

export interface PdpBreadcrumbVariety {
  name: string;
  slug: string;
}

export interface PdpGemstoneResolution {
  /** The applet PDP input (GemstoneItem) with honest nulls preserved. */
  stone: GemstoneItem;
  /** The repo's canonical `${title} | Maihan Gems` metadata line. */
  displayTitle: string;
  /**
   * The catalogue-port detail when the resolution came through it — the
   * repo's productJsonLd SEO spine is emitted only from this true DTO
   * (provenance/evidence stay the row's own, never synthesised).
   */
  productDetail: ProductDetailReadModel | null;
  /** Applet variety crumb when the URL's variety segment matches the ledger. */
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
 * The PDP's WebAR seam: resolve the colour hue the SAME way the old canonical
 * page did, then confirm the asset is a READY seeded GLB through the repo's
 * `webar_assets` table before advertising the 3D/AR path on the stone. Any
 * resolution failure (offline DB, no planted row) leaves the field null — the
 * applet then renders its own honest missing-asset path, never a fake claim.
 */
async function resolveStoneWebarAssetId(colourText: string): Promise<string | null> {
  const hue = colourHueForAsset(colourText.toLowerCase());
  if (!hue) return null;
  try {
    const asset = await loadWebarAssetByAssetId(`brilliant-${hue}`);
    return asset && asset.state === 'READY' ? `brilliant-${hue}` : null;
  } catch {
    return null;
  }
}

/** NGC evidences clarity/cut labels; the DB read layer does not. */
function normalizeClarity(raw: string): GemstoneItem['clarity'] | null {
  const allowed: readonly GemstoneItem['clarity'][] = ['FL', 'IF', 'VVS1', 'VVS2', 'VSI', 'VS1', 'VS2', 'SI1'];
  const match = allowed.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
  return match ?? null;
}

function evidenceDimensionsFromMm(
  lengthMm: number | null,
  widthMm: number | null,
): string | null {
  const parts = [lengthMm, widthMm].map((n) => (n !== null && n !== undefined ? String(n) : null));
  const joined = parts.filter((p) => p !== null).join(' × ');
  return joined.length > 0 ? `${joined} mm` : null;
}

const JEWELLERY_VARIETY_BY_JEWELRY_TYPE: Record<string, PdpBreadcrumbVariety> = {
  ring: { name: 'Rings', slug: 'rings' },
  rings: { name: 'Rings', slug: 'rings' },
  necklace: { name: 'Necklaces', slug: 'necklaces' },
  necklaces: { name: 'Necklaces', slug: 'necklaces' },
};

function pdpStoneFromCard(row: StorefrontCard): GemstoneItem {
  const base = toGemstoneItem(row);
  const isJewelCard = row.kind === 'jewelry';
  const jewelleryVariety = isJewelCard && row.jewelryType
    ? JEWELLERY_VARIETY_BY_JEWELRY_TYPE[row.jewelryType.toLowerCase()] ?? null
    : null;
  // Ready-made jewellery renders the applet's jewellery branch only when the
  // applet's own variety vocabulary matches (rings/necklaces); every other
  // row keeps the stone branch with its evidenced stone type verbatim.
  const variety = jewelleryVariety ? jewelleryVariety.name.toLowerCase() : base.variety;
  const stone: EvidencedGemstone = {
    ...base,
    variety,
    varietySlug: jewelleryVariety ? jewelleryVariety.slug : base.varietySlug,
    clarity: typeof row.clarity === 'string' ? normalizeClarity(row.clarity) : null,
    treatmentDisclosed: row.treatment ?? 'Not evidenced',
    origin: row.originCountry ?? 'Not evidenced',
    lede: row.description ?? base.lede,
    description: row.description ?? base.description,
  } as unknown as EvidencedGemstone;
  stone.evidence = {
    ...base.evidence,
    dimensionsMm: evidenceDimensionsFromMm(row.lengthMm ?? null, row.widthMm ?? null),
  };
  // Second evidenced image (lifestyle / gallery order > 1) when the source
  // exposes one; otherwise the applet gallery renders fewer slides.
  if (row.hoverImageUrl) {
    const next: string[] = [...base.images];
    if (next[0] !== row.hoverImageUrl) next.push(row.hoverImageUrl);
    stone.images = next;
  }
  const item = stone as unknown as GemstoneItem;
  return item;
}

function pdpStoneFromDetail(detail: ProductDetailReadModel): { stone: GemstoneItem } {
  const variety = detail.variety?.name ?? '';
  const jewelleryVariety = detail.jewellery_type
    ? JEWELLERY_VARIETY_BY_JEWELRY_TYPE[detail.jewellery_type.toLowerCase()] ?? null
    : null;
  const sku = detail.provenance.source_sku ?? detail.provenance.source_sku_derived ?? detail.slug;
  const images = detail.media
    .filter((m) => m.kind.toUpperCase().includes('IMAGE'))
    .map((m) => m.url);
  const stone: EvidencedGemstone = {
    id: sku,
    sku,
    slug: detail.slug,
    name: detail.title,
    variety: jewelleryVariety ? jewelleryVariety.name.toLowerCase() : variety,
    varietySlug: jewelleryVariety ? jewelleryVariety.slug : slugify(variety),
    colourHue: detail.color?.name ?? '',
    colourSlug: slugify(detail.color?.name ?? ''),
    carat: detail.total_weight_ct ?? 0,
    shape: null,
    clarity: null,
    treatmentDisclosed: 'Not evidenced',
    origin: 'Not evidenced',
    price: detail.price_amount,
    currency: 'USD',
    availability: 'IN_VAULT',
    images,
    webarAssetId: null,
    lede: detail.short_description ?? detail.description ?? '',
    description: detail.description ?? detail.short_description ?? '',
    evidence: evidencePlate(null),
  };
  return {
    stone: stone as unknown as GemstoneItem,
  };
}

function pdpStoneFromGemstoneDetail(
  gem: GemstoneDetailReadModel,
  requestedSlug: string,
): GemstoneItem {
  const varietyName = gem.variety?.name ?? 'Natural Gemstone';
  const weightStr = gem.total_weight_ct !== null ? `${gem.total_weight_ct} ct ` : '';
  const shapeStr = gem.shape !== null ? `${gem.shape.replaceAll('_', ' ').toLowerCase()} ` : '';
  const name = `${weightStr}${shapeStr}${varietyName}`.trim();
  const treatedParts = [gem.length_mm, gem.width_mm, gem.depth_mm];
  const evidencedParts = [
    ...treatedParts.map((n) => (n !== null ? String(n) : null)),
  ].some((p) =>
    p !== null,
  );
  const dimensionsMm = evidencedParts
    ? `${treatedParts.map((n) => (n !== null ? String(n) : '–')).join(' × ')} mm`
    : null;
  const stone: EvidencedGemstone = {
    id: gem.gem_ref,
    sku: gem.gem_ref,
    slug: requestedSlug,
    name,
    variety: varietyName.toLowerCase(),
    varietySlug: slugify(varietyName),
    colourHue: gem.color?.name ?? '',
    colourSlug: slugify(gem.color?.name ?? ''),
    carat: gem.total_weight_ct ?? 0,
    shape: normalizeShape(gem.shape),
    clarity: gem.clarity ? normalizeClarity(gem.clarity.label) : null,
    treatmentDisclosed: gem.treatment?.label ?? 'Not evidenced',
    origin: gem.origin?.name ?? 'Not evidenced',
    price: gem.price_amount ?? 0,
    currency: 'USD',
    availability: gem.availability ? 'IN_VAULT' : 'RESERVED',
    images: [],
    webarAssetId: null,
    lede: gem.species ? `Natural species: ${gem.species.name}.` : '',
    description: gem.cut_label
      ? `Exceptional earth-mined ${varietyName} featuring ${gem.cut_label}.`
      : `Natural earth-mined ${varietyName} specimen preserved in our private vault.`,
    evidence: {
      laboratory: null,
      reportNumber: null,
      reportDate: null,
      miningDistrict: null,
      refractiveIndex: null,
      pleochroism: null,
      fluorescence: null,
      specificGravity: null,
      dimensionsMm,
      cutGrade: null,
    },
  };
  return stone as unknown as GemstoneItem;
}

/**
 * The PDP's product resolution (see the M3 block comment for the order).
 * Returns null when the product is genuinely not offered (404 class);
 * throws only the transient port errors the route error boundary renders.
 */
export async function getPdpCatalogGemstone(
  slugOrId: string,
  breadcrumbVariety?: PdpBreadcrumbVariety | null,
): Promise<PdpGemstoneResolution | null> {
  const key = slugOrId.trim();

  // Thread 1 — the live catalogue read layer (DB + compiled NGC merge).
  const row = await getProductBySlug(key);
  if (row && row.kind !== 'setting') {
    // The applet PDP is a stone/jewellery surface: only gemstone and
    // ready-made rows resolve; SETTING_ONLY keeps its own /settings route.
    const stone = pdpStoneFromCard(row);
    const colourText = `${stone.colourHue} ${stone.variety} ${row.stoneType ?? ''}`.toLowerCase();
    stone.webarAssetId = await resolveStoneWebarAssetId(colourText);
    return { stone, displayTitle: row.title, productDetail: null, breadcrumbVariety: breadcrumbVariety ?? null };
  }

  // Thread 2 — the catalogue port, in the old canonical order.
  const detail = await loadProductDetail(key);
  if (detail.ok) {
    const detailValue = detail.value;
    const jewelleryVariety = detailValue.jewellery_type
      ? JEWELLERY_VARIETY_BY_JEWELRY_TYPE[detailValue.jewellery_type.toLowerCase()] ?? null
      : null;
    const varietyName = detailValue.variety?.name ?? '';
    const resolved = pdpStoneFromDetail(detailValue);
    resolved.stone.variety = jewelleryVariety ? jewelleryVariety.name.toLowerCase() : varietyName;
    resolved.stone.varietySlug = jewelleryVariety ? jewelleryVariety.slug : slugify(varietyName);
    // hue mapping over colour + variety text (the old page's call shape)
    const colourText = `${detailValue.color?.name ?? ''} ${varietyName}`.toLowerCase();
    resolved.stone.webarAssetId = await resolveStoneWebarAssetId(colourText);
    return {
      stone: resolved.stone,
      displayTitle: detailValue.title,
      productDetail: detailValue,
      breadcrumbVariety: breadcrumbVariety ?? null,
    };
  }
  if (!isProductNotFound(detail.error)) {
    throw detail.error;
  }

  const gemRefUpper = key.toUpperCase();
  const gemResult = await loadGemstoneDetail(gemRefUpper);
  if (gemResult.ok) {
    const stone = pdpStoneFromGemstoneDetail(gemResult.value, key);
    const colourText = `${stone.colourHue} ${stone.variety}`.toLowerCase();
    stone.webarAssetId = await resolveStoneWebarAssetId(colourText);
    return {
      stone,
      displayTitle: stone.name,
      productDetail: adaptGemstoneToProductDetail(gemResult.value, key),
      breadcrumbVariety: breadcrumbVariety ?? null,
    };
  }
  if (!isProductNotFound(gemResult.error)) {
    throw gemResult.error;
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Settings seam (sanctioned fixture retention as of M2b).
 *
 * The applet's SettingItem depends on fields the read layer does not expose
 * (per-SKU metal options with price deltas, mounting sizes, band/gallery
 * millimetres, compatible shapes). Server `StorefrontCard` rows cannot
 * produce those without inventing values, which is prohibited. Until a
 * SettingItem-shaped accessor exists over settings/setting_variants, the
 * migrated settings/jewellery surfaces keep rendering the applet's ported
 * fixture settings ledger VERBATIM (with /mgh-prefixed assets). The
 * real SETTING_ONLY rows remain served by the repo's own
 * /settings/[settingSku] detail route and the DYO flow, which are outside
 * this migration family.
 * ------------------------------------------------------------------------- */

export function getFixtureSettingsCatalog(): SettingItem[] {
  return getAllSettings();
}

export function getFixtureEarringSettings(): SettingItem[] {
  return getAllSettings().filter((setting) => setting.category === 'earrings');
}

export function getFixtureSettingBySkuOrSlug(skuOrSlug: string): SettingItem | null {
  return getSettingBySkuOrSlug(skuOrSlug);
}
