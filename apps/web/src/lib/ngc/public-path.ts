/**
 * Edge-safe check for a single URL segment the storefront actually serves.
 *
 * The catalogue catch-all (`[varietySlug]`) calls `notFound()` for unknown
 * slugs, but a `loading.tsx` above that page flushes HTTP 200 before the
 * status can change. The proxy uses this list to answer those URLs with 404
 * before any loading boundary runs. It mirrors `parseLandingSlug` without
 * reading the filesystem, so the proxy bundle stays edge-safe.
 */
import taxonomy from '../../data/ngc-taxonomy.json' with { type: 'json' };

interface NamedSlug {
  readonly slug: string;
}

interface TaxonomyFile {
  readonly gemstones: readonly NamedSlug[];
  readonly colors: readonly NamedSlug[];
}

const file = taxonomy as TaxonomyFile;

const APP_SEGMENTS = new Set([
  'about',
  'account',
  'admin',
  'api',
  'ar',
  'blog',
  'browse',
  'cart',
  'checkout',
  'colour',
  'color',
  'compare',
  'contact',
  'demo',
  'design-your-own',
  'education',
  'favorites',
  'financing',
  'jewellery',
  'jewelry',
  'pairs',
  'policy',
  'product',
  'products',
  'protection-plan',
  'search',
  'settings',
  'shop',
  'showrooms',
  'varieties',
  'vendor',
]);

const FIXED_LANDINGS = new Set([
  'natural-gemstones',
  'all-natural-gemstones',
  'natural-gemstone-pairs',
  'gemstone-ring-settings',
  'mens-gemstone-ring-settings',
  'gemstone-earring-settings',
  'gemstone-necklace-pendant-settings',
  'gemstone-bracelet-settings',
  'gemstone-rings',
  'all-gemstone-rings',
  'gemstone-earrings',
  'gemstone-necklaces-pendants',
  'gemstone-bracelets-bangles',
  'mens-gemstone-rings',
  'sapphire',
  'ruby',
  'emerald',
]);

/** True when a one-segment path is a real route or a catalogue landing. */
export function isServedSingleSegment(raw: string): boolean {
  const slug = raw.trim().toLowerCase();
  if (slug.length === 0 || slug.includes('.')) return true;
  if (APP_SEGMENTS.has(slug) || FIXED_LANDINGS.has(slug)) return true;
  // Collection suffixes are resolved by the page (and 404 in-app when empty).
  if (/-(?:pairs|earrings|pendants|bracelets|necklaces|rings|settings)$/.test(slug)) return true;
  for (const color of file.colors) {
    if (
      slug === `${color.slug}-gemstones` ||
      slug === `${color.slug}-gemstone-pairs` ||
      slug === `${color.slug}-gemstone-rings`
    ) {
      return true;
    }
  }
  const seen = new Set<string>();
  for (const gem of file.gemstones) {
    if (seen.has(gem.slug)) continue;
    seen.add(gem.slug);
    if (slug === gem.slug || slug === `${gem.slug}-pairs` || slug === `${gem.slug}-rings`) return true;
  }
  return false;
}
