import type { StorefrontBrand } from './types.js';

export const STOREFRONTS: readonly StorefrontBrand[] = [
  {
    slug: 'maihan',
    name: 'Maihan Gems',
    pathPrefix: '',
    defaultStone: null,
    wordmark: 'MAIHAN',
    kicker: 'GEMS · Atelier',
    lede: 'Natural gemstones, matched pairs, master settings and fine jewellery.',
  },
  {
    slug: 'sapphire',
    name: 'Maihan Sapphire',
    pathPrefix: '/sapphire',
    defaultStone: 'sapphire',
    wordmark: 'MAIHAN',
    kicker: 'SAPPHIRE',
    lede: 'The sapphire house — royal blues, padparadscha and fancy colours.',
  },
  {
    slug: 'ruby',
    name: 'Maihan Ruby',
    pathPrefix: '/ruby',
    defaultStone: 'ruby',
    wordmark: 'MAIHAN',
    kicker: 'RUBY',
    lede: 'The ruby house — pigeon blood, Burmese and Mozambique origin stones.',
  },
  {
    slug: 'emerald',
    name: 'Maihan Emerald',
    pathPrefix: '/emerald',
    defaultStone: 'emerald',
    wordmark: 'MAIHAN',
    kicker: 'EMERALD',
    lede: 'The emerald house — Colombian, Zambian and Brazilian crystals.',
  },
] as const;

export const SISTER_SLUGS = ['sapphire', 'ruby', 'emerald'] as const;

export function storefrontBySlug(slug: string | null | undefined): StorefrontBrand {
  return STOREFRONTS.find((s) => s.slug === slug) ?? STOREFRONTS[0]!;
}

export function withPrefix(href: string, prefix: string): string {
  if (!prefix) return href;
  if (href.startsWith(prefix + '/') || href === prefix) return href;
  if (href === '/') return prefix;
  return `${prefix}${href}`;
}

export function cardMatchesBrand(
  card: { stoneType?: string | null; variety?: string | null; title?: string | null },
  stone: string | null,
): boolean {
  if (!stone) return true;
  const text = `${card.stoneType ?? ''} ${card.variety ?? ''} ${card.title ?? ''}`.toLowerCase();
  return text.includes(stone.toLowerCase());
}
