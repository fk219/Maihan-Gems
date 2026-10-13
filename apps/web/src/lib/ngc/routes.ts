import { uniqueGemTypes } from './catalog.js';
import { loadNgcTaxonomy } from './catalog.js';
import { SISTER_SLUGS } from './storefronts.js';

export const PAGE_SIZE = 60;

export const RESERVED_SLUGS = new Set([
  'account', 'admin', 'api', 'ar', 'blog', 'browse', 'cart', 'checkout', 'colour', 'color',
  'compare', 'contact', 'demo', 'design-your-own', 'education', 'favorites', 'financing',
  'jewellery', 'jewelry', 'pairs', 'policy', 'product', 'products', 'protection-plan',
  'search', 'settings', 'shop', 'showrooms', 'varieties', 'about', 'sapphire', 'ruby', 'emerald',
  'natural-gemstones', 'all-natural-gemstones', 'natural-gemstone-pairs',
  'gemstone-rings', 'all-gemstone-rings', 'gemstone-earrings', 'gemstone-necklaces-pendants',
  'gemstone-bracelets-bangles', 'mens-gemstone-rings',
  'gemstone-ring-settings', 'mens-gemstone-ring-settings', 'gemstone-earring-settings',
  'gemstone-necklace-pendant-settings', 'gemstone-bracelet-settings',
  ...SISTER_SLUGS,
]);

export type LandingKind =
  | { type: 'gem-landing' }
  | { type: 'gem-all' }
  | { type: 'gem-pairs-landing' }
  | { type: 'stone'; slug: string; form: 'loose' | 'pairs' | 'rings' }
  | { type: 'color'; slug: string; form: 'loose' | 'pairs' | 'rings' }
  | { type: 'setting'; seat: 'ring' | 'mens_ring' | 'earring' | 'pendant_necklace' | 'bracelet' }
  | { type: 'jewellery-landing'; seat: 'ring' | 'earring' | 'pendant' | 'bracelet' | 'mens' }
  | { type: 'jewellery-all'; seat: 'ring' | 'earring' | 'pendant' | 'bracelet' };

const SETTING_PATHS: Record<string, LandingKind> = {
  'gemstone-ring-settings': { type: 'setting', seat: 'ring' },
  'mens-gemstone-ring-settings': { type: 'setting', seat: 'mens_ring' },
  'gemstone-earring-settings': { type: 'setting', seat: 'earring' },
  'gemstone-necklace-pendant-settings': { type: 'setting', seat: 'pendant_necklace' },
  'gemstone-bracelet-settings': { type: 'setting', seat: 'bracelet' },
};

const JEWELLERY_PATHS: Record<string, LandingKind> = {
  'gemstone-rings': { type: 'jewellery-landing', seat: 'ring' },
  'all-gemstone-rings': { type: 'jewellery-all', seat: 'ring' },
  'gemstone-earrings': { type: 'jewellery-landing', seat: 'earring' },
  'gemstone-necklaces-pendants': { type: 'jewellery-landing', seat: 'pendant' },
  'gemstone-bracelets-bangles': { type: 'jewellery-landing', seat: 'bracelet' },
  'mens-gemstone-rings': { type: 'jewellery-landing', seat: 'mens' },
};

export function parseLandingSlug(raw: string | undefined | null): LandingKind | null {
  const slug = (raw ?? '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!slug) return null;
  if (slug === 'natural-gemstones') return { type: 'gem-landing' };
  if (slug === 'all-natural-gemstones') return { type: 'gem-all' };
  if (slug === 'natural-gemstone-pairs') return { type: 'gem-pairs-landing' };
  if (SETTING_PATHS[slug]) return SETTING_PATHS[slug]!;
  if (JEWELLERY_PATHS[slug]) return JEWELLERY_PATHS[slug]!;

  const colors = loadNgcTaxonomy().colors;
  for (const color of colors) {
    if (slug === `${color.slug}-gemstones`) return { type: 'color', slug: color.slug, form: 'loose' };
    if (slug === `${color.slug}-gemstone-pairs`) return { type: 'color', slug: color.slug, form: 'pairs' };
    if (slug === `${color.slug}-gemstone-rings`) return { type: 'color', slug: color.slug, form: 'rings' };
  }

  const gems = uniqueGemTypes();
  for (const gem of gems) {
    if (slug === gem.slug) return { type: 'stone', slug: gem.slug, form: 'loose' };
    if (slug === `${gem.slug}-pairs`) return { type: 'stone', slug: gem.slug, form: 'pairs' };
    if (slug === `${gem.slug}-rings`) return { type: 'stone', slug: gem.slug, form: 'rings' };
  }
  return null;
}
