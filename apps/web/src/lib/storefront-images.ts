/**
 * Royalty-free product imagery for the storefront.
 * Photos are Unsplash jewellery/gem stills — never giant icons.
 */

const U = (id: string, w = 1200): string =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const STONE_IMAGES: Record<string, string> = {
  sapphire: U('photo-1611955167811-4711904bb9f8'),
  ruby: U('photo-1611591437281-460bfbe1220a'),
  emerald: U('photo-1515562141207-7a88fb7ce338'),
  paraiba_tourmaline: U('photo-1573408301185-9146fe634ad0'),
  alexandrite: U('photo-1603561596117-0b2f2d1762b7'),
  spinel: U('photo-1601121141461-9d6647bca1ed'),
  tanzanite: U('photo-1535632066927-ab7c9ab60908'),
  aquamarine: U('photo-1599643478518-a784e5dc4c8f'),
  morganite: U('photo-1515562141207-7a88fb7ce338'),
  demantoid_garnet: U('photo-1605100804763-247f67b3557e'),
  tsavorite_garnet: U('photo-1603561591411-07134e71a2a9'),
  spessartite_garnet: U('photo-1617038260897-41a1f70c2b31'),
  rubellite: U('photo-1611591437281-460bfbe1220a'),
  diamond: U('photo-1605100804763-247f67b3557e'),
  opal: U('photo-1617038260897-41a1f70c2b31'),
  pearl: U('photo-1535632066927-ab7c9ab60908'),
  moissanite: U('photo-1605100804763-247f67b3557e'),
};

const JEWELRY_IMAGES: Record<string, string> = {
  ring: U('photo-1605100804763-247f67b3557e'),
  earrings: U('photo-1535632066927-ab7c9ab60908'),
  pendant: U('photo-1599643478518-a784e5dc4c8f'),
  necklace: U('photo-1599643478518-a784e5dc4c8f'),
  bracelet: U('photo-1611591437281-460bfbe1220a'),
};

const SETTING_IMAGES: Record<string, string> = {
  earrings: U('photo-1535632066927-ab7c9ab60908'),
  pendant: U('photo-1599643478518-a784e5dc4c8f'),
  bracelet: U('photo-1611591437281-460bfbe1220a'),
  halo: U('photo-1605100804763-247f67b3557e'),
  three_stone: U('photo-1515562141207-7a88fb7ce338'),
  default: U('photo-1603561591411-07134e71a2a9'),
};

export const HERO_IMAGE = U('photo-1515562141207-7a88fb7ce338', 2400);
export const HERO_IMAGE_MOBILE = U('photo-1515562141207-7a88fb7ce338', 1200);

export function productImage(input: {
  kind: string;
  stoneType?: string | null;
  jewelryType?: string | null;
  settingFor?: string | null;
  style?: string[] | string | null;
  title?: string | null;
}): string {
  if (input.kind === 'gemstone') {
    return STONE_IMAGES[input.stoneType ?? ''] ?? STONE_IMAGES.sapphire!;
  }
  if (input.kind === 'jewelry') {
    const fromTitle = inferJewelryType(input.title ?? '');
    return JEWELRY_IMAGES[input.jewelryType ?? fromTitle ?? ''] ?? JEWELRY_IMAGES.ring!;
  }
  const style = Array.isArray(input.style) ? input.style.join(' ') : (input.style ?? '');
  if (/halo/i.test(style)) return SETTING_IMAGES.halo!;
  if (/three/i.test(style)) return SETTING_IMAGES.three_stone!;
  return SETTING_IMAGES[input.settingFor ?? ''] ?? SETTING_IMAGES.default!;
}

function inferJewelryType(title: string): string | undefined {
  const t = title.toLowerCase();
  if (t.includes('earring')) return 'earrings';
  if (t.includes('pendant')) return 'pendant';
  if (t.includes('necklace')) return 'necklace';
  if (t.includes('bracelet')) return 'bracelet';
  if (t.includes('ring') || t.includes('band')) return 'ring';
  return undefined;
}
