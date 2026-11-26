/**
 * F4 — Design Your Own adapter over the FRESH clean catalogue (replaces the
 * locked-schema read layer). The applet's 4-step configurator markup, classes
 * and flow are unchanged; the data now comes from fresh-api.
 *
 * - stones   → fresh single loose stones (kind=SINGLE). The pool is EMPTY
 *              today: source-derived stones carry no photography yet (source
 *              media only covered configured products), and the applet
 *              configurator honestly requires an evidenced primary image —
 *              vendor submissions with photos fill this pool.
 * - settings → fresh settings grouped per design (design_code); per-metal
 *              price deltas are real arithmetic between the design's actual
 *              variants (min = base; never invented); earring mounts are
 *              excluded because F-INV-03 forbids single-stone attachments
 *              there.
 * - sizes    → the evidenced ring-size ladder constant (presentation data).
 * - ledger   → the fresh `configurations` table is empty (runtime feature) —
 *              the commission-ledger surfaces render their honest empty state.
 */
import 'server-only';
import type { GemstoneItem, SettingItem, SettingMetalOption } from '@/lib/mgh/fixtures';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/** Evidenced ring/mounting size ladder (presentation constant). */
export const DYO_SIZES: string[] = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];

const STONE_LIMIT = 24;

interface FreshGemRow {
  ref: string;
  slug: string;
  name: string;
  kind: 'SINGLE' | 'PAIR';
  weight_ct: string | number | null;
  price_amount: string | number | null;
  status: string;
  variety: string;
  colour: string | null;
  shape: string | null;
  description: string | null;
  primary_image: string | null;
}

interface FreshSettingRow {
  ref: string;
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
  primary_image: string | null;
}

async function freshGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${FRESH_API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // offline → honest empty states
  }
}

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
  const applet: readonly GemstoneItem['shape'][] = ['Round', 'Cushion', 'Octagon', 'Oval', 'Pear', 'Asscher', 'Radiant', 'Marquise'];
  return applet.find((shape) => shape.toLowerCase() === lowered) ?? null;
}

function toGemstoneItem(row: FreshGemRow): GemstoneItem | null {
  const image = row.primary_image ?? '';
  if (image.trim().length === 0) return null; // the configurator requires an evidenced image
  const variety = row.variety ?? '';
  return {
    id: row.ref,
    sku: row.ref,
    slug: row.slug,
    name: row.name,
    variety,
    varietySlug: slugify(variety),
    colourHue: row.colour ?? '',
    colourSlug: slugify(row.colour ?? ''),
    carat: row.weight_ct == null ? 0 : Number(row.weight_ct),
    shape: normalizeShape(row.shape),
    clarity: null,
    treatmentDisclosed: 'Not evidenced',
    origin: 'Not evidenced',
    price: row.price_amount == null ? 0 : Number(row.price_amount),
    currency: 'USD',
    availability: 'IN_VAULT',
    images: [image],
    webarAssetId: null,
    lede: row.description ?? row.name,
    description: row.description ?? row.name,
    evidence: {
      laboratory: null, reportNumber: null, reportDate: null, miningDistrict: null,
      refractiveIndex: null, pleochroism: null, fluorescence: null,
      specificGravity: null, dimensionsMm: null, cutGrade: null,
    },
  } as unknown as GemstoneItem;
}

/** The applet configurator's stone pool: single stones with an evidenced image. */
export async function getDyoConfiguratorStones(): Promise<GemstoneItem[]> {
  const data = await freshGet<{ items: FreshGemRow[] }>(`/api/v1/catalogue/gemstones?kind=SINGLE&limit=${STONE_LIMIT}`);
  return (data?.items ?? [])
    .map(toGemstoneItem)
    .filter((stone): stone is GemstoneItem => stone !== null);
}

function toSettingItem(group: FreshSettingRow[]): SettingItem | null {
  const head = group[0]!;
  const category = head.jewellery_type === 'RING' ? 'ring' : head.jewellery_type === 'PENDANT' ? 'pendant' : '';
  // The applet configurator is a single-stone studio — F-INV-03 forbids a
  // single stone attaching to earrings, so earring mounts are NOT wired in.
  if (!(category === 'ring' || category === 'pendant')) return null;

  const basePrice = Math.min(...group.map((r) => (r.price_amount == null ? Infinity : Number(r.price_amount))));
  if (!Number.isFinite(basePrice)) return null;
  const sorted = [...group].sort((a, b) => Number(a.price_amount ?? Infinity) - Number(b.price_amount ?? Infinity));

  const metalSeen = new Set<string>();
  const metals: SettingMetalOption[] = [];
  for (const variant of sorted) {
    if (!variant.metal) continue;
    if (metalSeen.has(variant.metal)) continue;
    metalSeen.add(variant.metal);
    metals.push({
      code: variant.metal as SettingMetalOption['code'],
      label: variant.metal_name ?? variant.metal,
      hallmark: null,
      priceDelta: Math.round((Number(variant.price_amount ?? basePrice) - basePrice) * 100) / 100,
      variantSku: variant.ref,
    });
  }
  if (metals.length === 0) return null;

  const image = head.primary_image ?? '';
  const accepts: NonNullable<SettingItem['accepts']> = [];
  for (const row of group) {
    if (row.min_ct != null || row.max_ct != null) {
      accepts.push({
        shape: null,
        minCarat: row.min_ct == null ? null : Number(row.min_ct),
        maxCarat: row.max_ct == null ? null : Number(row.max_ct),
      });
    }
  }
  const styleLabel = head.style_slug ?? head.style ?? head.design_code;

  return {
    sku: metals[0]!.variantSku ?? head.ref,
    slug: head.slug,
    name: head.name,
    category: category as SettingItem['category'],
    style: styleLabel,
    basePrice: Math.round(basePrice * 100) / 100,
    compatibleShapes: [],
    acceptsPairsOnly: false,
    metals,
    sizes: DYO_SIZES,
    bandWidthMm: null,
    galleryHeightMm: null,
    originAtelier: null,
    images: image ? [image] : [],
    webarAssetId: null,
    lede: head.description ?? '',
    description: head.description ?? '',
    accepts,
  } satisfies SettingItem;
}

/** The applet configurator's setting pool, grouped per real fresh design. */
export async function getDyoConfiguratorSettings(limit = 48): Promise<SettingItem[]> {
  const data = await freshGet<{ items: FreshSettingRow[] }>(`/api/v1/catalogue/settings?limit=${limit}`);
  if (!data?.items.length) return [];
  const byDesign = new Map<string, FreshSettingRow[]>();
  for (const row of data.items) {
    const bucket = byDesign.get(row.design_code) ?? [];
    bucket.push(row);
    byDesign.set(row.design_code, bucket);
  }
  const designs: SettingItem[] = [];
  for (const group of byDesign.values()) {
    const item = toSettingItem(group);
    if (item) designs.push(item);
    if (designs.length >= limit) break;
  }
  return designs;
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

/** The fresh `configurations` ledger is a runtime feature — honest empty today. */
export async function getDyoRecentCodes(limit = 2): Promise<string[]> {
  void limit;
  return [];
}

export async function getDyoLedgerSample(): Promise<string | null> {
  return null;
}
