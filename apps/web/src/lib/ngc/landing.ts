import { NGC_MEDIA } from '../ngc-home.js';
import type { StorefrontCard } from '../storefront-types.js';
import { filterNgc, loadNgcTaxonomy, ngcCards, uniqueGemTypes } from './catalog.js';
import { parseLandingSlug } from './routes.js';

export interface LandingTile {
  readonly href: string;
  readonly label: string;
  readonly image?: string | null;
  readonly count?: number;
}

function stoneThumb(slug: string): string {
  return `${NGC_MEDIA}/images/normal/common/shopType/stone/${slug}.png`;
}

export interface LandingView {
  readonly kicker: string;
  readonly title: string;
  readonly lede: string;
  readonly cta: { href: string; label: string };
  readonly tiles: LandingTile[];
  readonly colours?: { name: string; href: string }[];
  readonly products: StorefrontCard[];
  readonly showCatalog: boolean;
}

export function landingView(slug: string | undefined): LandingView | null {
  const parsed = parseLandingSlug(slug);
  if (!parsed) return null;
  const tax = loadNgcTaxonomy();
  const gems = uniqueGemTypes();

  if (parsed.type === 'gem-landing') {
    return {
      kicker: 'The vault',
      title: 'Gemstones',
      lede: 'Every variety we cut and keep — loose stones, matched pairs, and the jewellery they become.',
      cta: { href: '/all-natural-gemstones', label: 'View all gemstones' },
      tiles: gems.map((gem) => ({
        href: `/${gem.slug}`,
        label: gem.name,
        image: stoneThumb(gem.slug),
        count: filterNgc({ stoneSlug: gem.slug }).length,
      })),
      colours: tax.colors.map((c) => ({ name: c.name, href: `/${c.slug}-gemstones` })),
      products: [],
      showCatalog: false,
    };
  }

  if (parsed.type === 'gem-all') {
    return {
      kicker: 'Loose stones',
      title: 'All natural gemstones',
      lede: 'The full vault, sixty pieces to a page, filtered as you wish.',
      cta: { href: '/natural-gemstones', label: 'Shop by variety' },
      tiles: [],
      products: ngcCards({ kind: ['loose_stone', 'stone_pair'], limit: 500 }),
      showCatalog: true,
    };
  }

  if (parsed.type === 'gem-pairs-landing') {
    return {
      kicker: 'Matched pairs',
      title: 'Gemstone pairs',
      lede: 'Pairs kept together for colour, cut and size — for earrings, and only for earrings.',
      cta: { href: '/all-natural-gemstones', label: 'View all gemstones' },
      tiles: gems.filter((g) => filterNgc({ stoneSlug: g.slug, kind: 'stone_pair' }).length > 0).map((gem) => ({
        href: `/${gem.slug}-pairs`,
        label: gem.name,
        image: stoneThumb(gem.slug),
      })),
      products: ngcCards({ kind: 'stone_pair', limit: 500 }),
      showCatalog: true,
    };
  }

  if (parsed.type === 'stone') {
    const gem = gems.find((g) => g.slug === parsed.slug);
    const name = gem?.name ?? parsed.slug;
    if (parsed.form === 'pairs') {
      return {
        kicker: 'Matched pairs',
        title: `${name} pairs`,
        lede: `Pairs of ${name.toLowerCase()} kept together for earrings.`,
        cta: { href: `/${parsed.slug}`, label: `Loose ${name}` },
        tiles: [],
        products: ngcCards({ kind: 'stone_pair', stoneSlug: parsed.slug, limit: 500 }),
        showCatalog: true,
      };
    }
    if (parsed.form === 'rings') {
      return {
        kicker: 'Finished jewels',
        title: `${name} rings`,
        lede: `Rings set with ${name.toLowerCase()}.`,
        cta: { href: '/all-gemstone-rings', label: 'All rings' },
        tiles: [],
        products: ngcCards({ kind: ['jewelry', 'dyo_composite'], stoneSlug: parsed.slug, jewelryType: 'ring', limit: 500 }),
        showCatalog: true,
      };
    }
    return {
      kicker: 'Loose stones',
      title: name,
      lede: `Natural ${name.toLowerCase()} from the vault.`,
      cta: { href: `/${parsed.slug}-pairs`, label: `${name} pairs` },
      tiles: [],
      colours: tax.colors.map((c) => ({ name: c.name, href: `/${c.slug}-gemstones` })),
      products: ngcCards({ kind: 'loose_stone', stoneSlug: parsed.slug, limit: 500 }),
      showCatalog: true,
    };
  }

  if (parsed.type === 'color') {
    const color = tax.colors.find((c) => c.slug === parsed.slug);
    const name = color?.name ?? parsed.slug;
    const form = parsed.form;
    return {
      kicker: 'By colour',
      title: form === 'pairs' ? `${name} pairs` : form === 'rings' ? `${name} rings` : `${name} gemstones`,
      lede: `The vault, filtered to ${name.toLowerCase()}.`,
      cta: { href: '/natural-gemstones', label: 'All varieties' },
      tiles: [],
      products: ngcCards({
        kind: form === 'pairs' ? 'stone_pair' : form === 'rings' ? ['jewelry', 'dyo_composite'] : 'loose_stone',
        colorSlug: parsed.slug,
        limit: 500,
      }),
      showCatalog: true,
    };
  }

  if (parsed.type === 'setting') {
    const label =
      parsed.seat === 'earring'
        ? 'Earring settings'
        : parsed.seat === 'bracelet'
          ? 'Bracelet settings'
          : parsed.seat === 'pendant_necklace'
            ? 'Necklace & pendant settings'
            : parsed.seat === 'mens_ring'
              ? "Men's ring settings"
              : 'Ring settings';
    const group = tax.settings.find((s) => s.name.toLowerCase().includes(label.split(' ')[0]!.toLowerCase())) ?? tax.settings[0];
    return {
      kicker: 'Atelier mountings',
      title: label,
      lede: 'Priced without the centre stone. Choose a style, then a compatible gem.',
      cta: { href: '/design-your-own', label: 'Design your own' },
      tiles: (group?.styles ?? []).map((style) => ({
        href: `/${slug}?style=${encodeURIComponent(style.name)}`,
        label: style.name,
      })),
      products: ngcCards({ kind: 'setting', settingType: parsed.seat === 'mens_ring' ? 'ring' : parsed.seat, limit: 500 }),
      showCatalog: true,
    };
  }

  if (parsed.type === 'jewellery-landing' || parsed.type === 'jewellery-all') {
    const seat = parsed.seat === 'mens' ? 'ring' : parsed.seat;
    const title =
      parsed.seat === 'earring'
        ? 'Gemstone earrings'
        : parsed.seat === 'pendant'
          ? 'Necklaces & pendants'
          : parsed.seat === 'bracelet'
            ? 'Bracelets & bangles'
            : parsed.seat === 'mens'
              ? "Men's gemstone rings"
              : 'Gemstone rings';
    const group = tax.jewellery.find((j) => j.name.toLowerCase().includes(title.split(' ')[1]?.toLowerCase() ?? 'ring'));
    return {
      kicker: 'Finished works',
      title,
      lede: 'Ready-to-ship jewels, and custom designs built from a setting and a stone.',
      cta: { href: parsed.type === 'jewellery-landing' && parsed.seat === 'ring' ? '/all-gemstone-rings' : '/jewellery', label: 'View catalogue' },
      tiles: (group?.styles ?? []).map((style) => ({
        href: `/${slug}?style=${encodeURIComponent(style.name)}`,
        label: style.name,
      })),
      products: ngcCards({ kind: ['jewelry', 'dyo_composite'], jewelryType: seat === 'earring' ? 'earring' : seat, limit: 500 }),
      showCatalog: parsed.type === 'jewellery-all' || true,
    };
  }

  return null;
}
