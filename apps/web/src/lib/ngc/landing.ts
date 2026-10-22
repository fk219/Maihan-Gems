import { NGC_MEDIA } from '../ngc-home.js';
import type { StorefrontCard } from '../storefront-types.js';
import { filterNgc, loadNgcTaxonomy, ngcCards, uniqueGemTypes } from './catalog.js';
import type { NgcListFilter } from './catalog.js';
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

function countOf(filters: NgcListFilter): number {
  return filterNgc(filters).length;
}

function heroFrom(filters: NgcListFilter): string | null {
  const cards = ngcCards({ ...filters, limit: 12 });
  return cards.find((card) => card.hoverImageUrl)?.hoverImageUrl ?? cards[0]?.imageUrl ?? null;
}

function thumbFrom(filters: NgcListFilter): string | null {
  return ngcCards({ ...filters, limit: 1 })[0]?.imageUrl ?? null;
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
  readonly heroImage?: string | null;
}

export function settingsHub(): LandingView {
  const tiles: LandingTile[] = [
    {
      href: '/gemstone-ring-settings',
      label: 'Ring settings',
      image: thumbFrom({ kind: 'setting', settingType: 'ring' }),
      count: countOf({ kind: 'setting', settingType: 'ring' }),
    },
    {
      href: '/mens-gemstone-ring-settings',
      label: "Men's ring settings",
      image: thumbFrom({ kind: 'setting', settingType: 'mens_ring' }),
      count: countOf({ kind: 'setting', settingType: 'mens_ring' }),
    },
    {
      href: '/gemstone-earring-settings',
      label: 'Earring settings',
      image: thumbFrom({ kind: 'setting', settingType: 'earring' }),
      count: countOf({ kind: 'setting', settingType: 'earring' }),
    },
    {
      href: '/gemstone-necklace-pendant-settings',
      label: 'Necklace & pendant settings',
      image: thumbFrom({ kind: 'setting', settingType: 'pendant_necklace' }),
      count: countOf({ kind: 'setting', settingType: 'pendant_necklace' }),
    },
    {
      href: '/gemstone-bracelet-settings',
      label: 'Bracelet settings',
      image: thumbFrom({ kind: 'setting', settingType: 'bracelet' }),
      count: countOf({ kind: 'setting', settingType: 'bracelet' }),
    },
  ];
  return {
    kicker: 'Atelier mountings',
    title: 'Settings',
    lede: 'Master settings in platinum, gold and silver, priced without the centre stone. Choose a seat, then a compatible gem.',
    cta: { href: '/gemstone-ring-settings', label: 'View the settings catalogue' },
    tiles,
    products: ngcCards({ kind: 'setting', limit: 8 }),
    showCatalog: false,
    heroImage: heroFrom({ kind: 'setting' }),
  };
}

export function jewelleryHub(): LandingView {
  const tiles: LandingTile[] = [
    {
      href: '/gemstone-rings',
      label: 'Gemstone rings',
      image: thumbFrom({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'ring' }),
      count: countOf({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'ring' }),
    },
    {
      href: '/gemstone-earrings',
      label: 'Earrings',
      image: thumbFrom({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'earring' }),
      count: countOf({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'earring' }),
    },
    {
      href: '/gemstone-necklaces-pendants',
      label: 'Necklaces & pendants',
      image: thumbFrom({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'pendant' }),
      count: countOf({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'pendant' }),
    },
    {
      href: '/gemstone-bracelets-bangles',
      label: 'Bracelets & bangles',
      image: thumbFrom({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'bracelet' }),
      count: countOf({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'bracelet' }),
    },
    {
      href: '/mens-gemstone-rings',
      label: "Men's gemstone rings",
      image: thumbFrom({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'ring' }),
      count: countOf({ kind: ['jewelry', 'dyo_composite'], jewelryType: 'ring' }),
    },
  ];
  return {
    kicker: 'Finished works',
    title: 'Jewellery',
    lede: 'Ready-to-ship jewels and custom designs built from a setting and a stone. Start with a category, then open the catalogue.',
    cta: { href: '/all-gemstone-rings', label: 'View the jewellery catalogue' },
    tiles,
    products: ngcCards({ kind: ['jewelry', 'dyo_composite'], limit: 8 }),
    showCatalog: false,
    heroImage: heroFrom({ kind: ['jewelry', 'dyo_composite'] }),
  };
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
      lede: 'Every variety we cut and keep: loose stones, matched pairs, and the jewellery they become.',
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
      heroImage: heroFrom({ kind: 'loose_stone' }),
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
      heroImage: heroFrom({ kind: 'loose_stone' }),
    };
  }

  if (parsed.type === 'gem-pairs-landing') {
    return {
      kicker: 'Matched pairs',
      title: 'Gemstone pairs',
      lede: 'Pairs kept together for colour, cut and size, for earrings, and only for earrings.',
      cta: { href: '/all-natural-gemstones', label: 'View all gemstones' },
      tiles: gems.filter((g) => filterNgc({ stoneSlug: g.slug, kind: 'stone_pair' }).length > 0).map((gem) => ({
        href: `/${gem.slug}-pairs`,
        label: gem.name,
        image: stoneThumb(gem.slug),
        count: filterNgc({ stoneSlug: gem.slug, kind: 'stone_pair' }).length,
      })),
      products: ngcCards({ kind: 'stone_pair', limit: 500 }),
      showCatalog: true,
      heroImage: heroFrom({ kind: 'stone_pair' }),
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
        heroImage: heroFrom({ kind: 'stone_pair', stoneSlug: parsed.slug }),
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
        heroImage: heroFrom({ kind: ['jewelry', 'dyo_composite'], stoneSlug: parsed.slug, jewelryType: 'ring' }),
      };
    }
    return {
      kicker: 'Loose stones',
      title: name,
      lede: `Natural ${name.toLowerCase()} from the vault. Origin, treatment and laboratory papers as they stand.`,
      cta: { href: '/all-natural-gemstones', label: 'View all gemstones' },
      tiles: [],
      colours: tax.colors.map((c) => ({ name: c.name, href: `/${c.slug}-gemstones` })),
      products: ngcCards({ kind: 'loose_stone', stoneSlug: parsed.slug, limit: 500 }),
      showCatalog: true,
      heroImage: heroFrom({ kind: 'loose_stone', stoneSlug: parsed.slug }),
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
      heroImage: heroFrom({
        kind: form === 'pairs' ? 'stone_pair' : form === 'rings' ? ['jewelry', 'dyo_composite'] : 'loose_stone',
        colorSlug: parsed.slug,
      }),
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
    const settingType = parsed.seat === 'mens_ring' ? 'ring' : parsed.seat;
    return {
      kicker: 'Atelier mountings',
      title: label,
      lede: 'Priced without the centre stone. Choose a style, then a compatible gem.',
      cta: { href: '/design-your-own', label: 'Design your own' },
      tiles: (group?.styles ?? []).map((style) => ({
        href: `/${slug}?style=${encodeURIComponent(style.name)}`,
        label: style.name,
        image: thumbFrom({ kind: 'setting', settingType, style: style.name }),
        count: countOf({ kind: 'setting', settingType, style: style.name }),
      })),
      products: ngcCards({ kind: 'setting', settingType, limit: 500 }),
      showCatalog: true,
      heroImage: heroFrom({ kind: 'setting', settingType }),
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
    const catalogHref =
      parsed.seat === 'earring'
        ? '/gemstone-earrings'
        : parsed.seat === 'pendant'
          ? '/gemstone-necklaces-pendants'
          : parsed.seat === 'bracelet'
            ? '/gemstone-bracelets-bangles'
            : '/all-gemstone-rings';
    return {
      kicker: 'Finished works',
      title,
      lede: 'Ready-to-ship jewels, and custom designs built from a setting and a stone.',
      cta: { href: catalogHref, label: 'View catalogue' },
      tiles: (group?.styles ?? []).map((style) => ({
        href: `/${slug}?style=${encodeURIComponent(style.name)}`,
        label: style.name,
        image: thumbFrom({
          kind: ['jewelry', 'dyo_composite'],
          jewelryType: seat === 'earring' ? 'earring' : seat,
          style: style.name,
        }),
        count: countOf({
          kind: ['jewelry', 'dyo_composite'],
          jewelryType: seat === 'earring' ? 'earring' : seat,
          style: style.name,
        }),
      })),
      products: ngcCards({ kind: ['jewelry', 'dyo_composite'], jewelryType: seat === 'earring' ? 'earring' : seat, limit: 500 }),
      showCatalog: parsed.type === 'jewellery-all' || parsed.seat !== 'ring',
      heroImage: heroFrom({ kind: ['jewelry', 'dyo_composite'], jewelryType: seat === 'earring' ? 'earring' : seat }),
    };
  }

  return null;
}
