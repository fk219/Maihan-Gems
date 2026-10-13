import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SettingForDyo, StorefrontCard } from '../storefront-types.js';
import { catalogImageSrc } from './media.js';
import type { NgcKind, NgcProduct, NgcTaxonomy } from './types.js';

function dataPath(file: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'src/data', file),
    path.join(process.cwd(), 'apps/web/src/data', file),
    path.join(here, '../../data', file),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`NGC data file missing: ${file}`);
}

let catalogCache: NgcProduct[] | null = null;
let taxonomyCache: NgcTaxonomy | null = null;

export function loadNgcCatalog(): NgcProduct[] {
  if (catalogCache) return catalogCache;
  catalogCache = JSON.parse(fs.readFileSync(dataPath('ngc-catalog.json'), 'utf8')) as NgcProduct[];
  return catalogCache;
}

export function loadNgcTaxonomy(): NgcTaxonomy {
  if (taxonomyCache) return taxonomyCache;
  taxonomyCache = JSON.parse(fs.readFileSync(dataPath('ngc-taxonomy.json'), 'utf8')) as NgcTaxonomy;
  return taxonomyCache;
}

export function uniqueGemTypes(): NgcTaxonomy['gemstones'] {
  const seen = new Set<string>();
  const out: NgcTaxonomy['gemstones'][number][] = [];
  for (const gem of loadNgcTaxonomy().gemstones) {
    if (seen.has(gem.slug)) continue;
    seen.add(gem.slug);
    out.push(gem);
  }
  return out;
}

function cardKind(kind: NgcKind): StorefrontCard['kind'] {
  if (kind === 'setting') return 'setting';
  if (kind === 'jewelry' || kind === 'dyo_composite') return 'jewelry';
  return 'gemstone';
}

function productCardSlug(product: NgcProduct): string {
  const id = product.id.toLowerCase();
  if (product.slug.toLowerCase().includes(id) || product.path.toLowerCase().includes(id)) {
    return product.slug;
  }
  return id;
}

export function toStorefrontCard(product: NgcProduct): StorefrontCard {
  const pair = product.kind === 'stone_pair';
  return {
    id: product.id,
    sku: product.id,
    slug: productCardSlug(product),
    title: product.title,
    kind: cardKind(product.kind),
    description: product.descriptionHtml.replace(/<[^>]+>/g, ' ').slice(0, 400) || null,
    priceUsd: product.priceUsd ?? 0,
    stoneType: product.stoneType,
    variety: product.stoneSubType ?? product.subcategory,
    caratTotal: product.weightCt,
    shape: product.shape,
    colorHue: product.color,
    originCountry: product.origin,
    treatment: product.enhancement,
    quantityType: pair ? 'pair' : product.kind === 'loose_stone' ? 'single' : null,
    jewelryType: product.jewelryType,
    settingFor: product.settingType === 'earring' ? 'earrings' : product.settingType === 'pendant_necklace' ? 'pendant' : product.settingType === 'mens_ring' ? 'ring' : product.settingType,
    style: product.styles.length ? [...product.styles] : null,
    metalType: product.metalName,
    metalColor: product.metalName,
    imageUrl: catalogImageSrc(product) || null,
    hoverImageUrl:
      catalogImageSrc(
        product,
        product.media.find((m) => m.kind === 'lifestyle_image') ??
          product.media.find((m) => m.kind === 'image' && m.order > 1),
      ) || null,
    vendorName: 'Maihan Gems',
    certificateLab: product.lab,
    colorIntensity: product.colorIntensity,
    clarity: product.clarity,
    cut: product.cut,
    cuttingStyle: product.cuttingStyle,
    lengthMm: product.lengthMm,
    widthMm: product.widthMm,
    availability: product.availability,
  };
}

export function productHref(product: NgcProduct): string {
  const id = product.id.toLowerCase();
  if (product.path && product.path !== '/' && product.path.toLowerCase().includes(id)) {
    return product.path.startsWith('/') ? product.path : `/${product.path}`;
  }
  return `/product/${productCardSlug(product)}`;
}

function idFromSlug(slug: string): string | null {
  const match = slug.toLowerCase().match(/(?:^|-)((?:k|pr|j|js)\d+[a-z0-9]*)$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function findNgcProduct(key: string): NgcProduct | null {
  const needle = key.trim().replace(/^\/+|\/+$/g, '');
  const upper = needle.toUpperCase();
  const catalog = loadNgcCatalog();
  const byId = catalog.find((p) => p.id.toUpperCase() === upper);
  if (byId) return byId;
  const bySlug = catalog.find((p) => p.slug === needle || p.slug.toLowerCase() === needle.toLowerCase());
  if (bySlug) return bySlug;
  const trailing = idFromSlug(needle.split('/').pop() ?? needle);
  if (trailing) {
    const found = catalog.find((p) => p.id.toUpperCase() === trailing || p.id.toUpperCase().startsWith(trailing));
    if (found) return found;
  }
  const byPath = catalog.find((p) => p.path.replace(/^\/+|\/+$/g, '') === needle);
  return byPath ?? null;
}

export interface NgcListFilter {
  kind?: NgcKind | NgcKind[];
  stoneSlug?: string;
  colorSlug?: string;
  style?: string;
  settingType?: string;
  jewelryType?: string;
  pairs?: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}

function stoneSlugOf(product: NgcProduct): string {
  return (product.stoneType ?? product.subcategory ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function filterNgc(filters: NgcListFilter = {}): NgcProduct[] {
  const kinds = filters.kind ? (Array.isArray(filters.kind) ? filters.kind : [filters.kind]) : null;
  let rows = loadNgcCatalog();
  if (kinds) rows = rows.filter((p) => kinds.includes(p.kind));
  if (filters.pairs) rows = rows.filter((p) => p.kind === 'stone_pair');
  if (filters.stoneSlug) {
    const slug = filters.stoneSlug.toLowerCase();
    rows = rows.filter((p) => {
      const own = stoneSlugOf(p);
      const sub = (p.subcategory ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return own === slug || own.startsWith(slug) || sub.includes(slug) || (p.parentSubcategory ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(slug);
    });
  }
  if (filters.colorSlug) {
    const name = filters.colorSlug.replace(/-/g, ' ');
    rows = rows.filter((p) => p.colorCategories.some((c) => c.toLowerCase() === name) || (p.color ?? '').toLowerCase().includes(name));
  }
  if (filters.style) {
    const style = filters.style.toLowerCase();
    rows = rows.filter((p) => p.styles.some((s) => s.toLowerCase() === style));
  }
  if (filters.settingType) {
    const seat = filters.settingType;
    rows = rows.filter((p) => p.settingType === seat || (p.subcategory ?? '').toLowerCase().includes(seat.replace('_', ' ')));
  }
  if (filters.jewelryType) {
    const jt = filters.jewelryType;
    rows = rows.filter((p) => p.jewelryType === jt || (p.subcategory ?? '').toLowerCase().includes(jt));
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    rows = rows.filter((p) => `${p.title} ${p.id} ${p.stoneType ?? ''} ${p.origin ?? ''}`.toLowerCase().includes(q));
  }
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? rows.length;
  return rows.slice(offset, offset + limit);
}

export function ngcCards(filters: NgcListFilter = {}): StorefrontCard[] {
  return filterNgc(filters).map(toStorefrontCard);
}

export function ngcStoneTypeRows(): { stoneType: string; count: number; pairCount: number }[] {
  const gems = uniqueGemTypes();
  const catalog = loadNgcCatalog();
  return gems.map((gem) => {
    const rows = catalog.filter((p) => stoneSlugOf(p) === gem.slug || (p.subcategory ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === gem.slug);
    return {
      stoneType: gem.name,
      count: rows.filter((p) => p.kind === 'loose_stone').length,
      pairCount: rows.filter((p) => p.kind === 'stone_pair').length,
    };
  }).filter((row) => row.count + row.pairCount > 0);
}

export function settingsForDyo(limit = 24): SettingForDyo[] {
  return filterNgc({ kind: 'setting', limit }).map((product) => {
    const card = toStorefrontCard(product);
    const shapes = new Set<string>();
    if (product.shape) shapes.add(product.shape);
    ['Round', 'Oval', 'Cushion', 'Emerald Cut', 'Pear', 'Heart', 'Marquise', 'Princess', 'Radiant'].forEach((s) => shapes.add(s));
    const bracelet = product.settingType === 'bracelet';
    return {
      ...card,
      accepts: [...shapes].map((shape) => ({
        shape,
        minCarat: bracelet ? 0.2 : 0.3,
        maxCarat: bracelet ? 5 : 30,
      })),
    };
  });
}
