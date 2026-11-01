import type { GemstoneItem } from '@/lib/mgh/fixtures/types';

export interface FreshGemRow {
  id?: number | string;
  ref: string;
  slug: string;
  name: string;
  variety: string;
  colour: string | null;
  colour_slug: string | null;
  weight_ct: string | number | null;
  shape: string | null;
  origin: string | null;
  price_amount: string | number | null;
  status: string;
  description: string | null;
  primary_image: string | null;
}

const SHAPES = new Set(['Round', 'Cushion', 'Octagon', 'Oval', 'Pear', 'Asscher', 'Radiant', 'Marquise']);

const shapeOf = (raw: string | null): GemstoneItem['shape'] | null => {
  if (!raw) return null;
  const lowered = raw.trim().toLowerCase();
  if (lowered.includes('emerald')) return 'Octagon';
  if (lowered.includes('asscher')) return 'Asscher';
  return (SHAPES.has(raw.trim()) ? raw.trim() : null) as GemstoneItem['shape'] | null;
};

const num = (v: string | number | null): number => (v == null ? 0 : Number(v));

export function mapFreshGemRow(row: FreshGemRow): GemstoneItem {
  const variety = row.variety ?? '';
  return {
    id: row.ref,
    sku: row.ref,
    slug: row.slug,
    name: row.name,
    variety,
    varietySlug: variety.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    colourHue: row.colour ?? '',
    colourSlug: row.colour_slug ?? '',
    carat: num(row.weight_ct),
    shape: shapeOf(row.shape) as GemstoneItem['shape'],
    clarity: null as unknown as GemstoneItem['clarity'],
    treatmentDisclosed: '',
    origin: row.origin ?? '',
    price: num(row.price_amount),
    currency: 'USD',
    availability: row.status === 'RESERVED' || row.status === 'SOLD' ? 'RESERVED' : 'IN_VAULT',
    images: row.primary_image ? [row.primary_image] : [],
    webarAssetId: null,
    lede: row.description ?? '',
    description: row.description ?? '',
    evidence: {
      laboratory: null, reportNumber: null, reportDate: null, miningDistrict: null,
      refractiveIndex: null, pleochroism: null, fluorescence: null, specificGravity: null,
      dimensionsMm: null, cutGrade: null,
    },
  } as GemstoneItem;
}

export const PAGE_SIZE = 60;

export async function fetchStonePage(offset: number, limit = PAGE_SIZE): Promise<GemstoneItem[]> {
  const res = await fetch(`/api/fresh/catalogue/gemstones?limit=${limit}&offset=${offset}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { items?: FreshGemRow[] };
  return (data.items ?? []).map(mapFreshGemRow);
}
