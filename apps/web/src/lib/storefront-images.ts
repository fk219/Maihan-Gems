/**
 * Catalog imagery for the luxury storefront.
 *
 * Loose stones: Wikimedia Commons studio photos (sapphire pair, ruby,
 * aquamarine) plus photoreal catalog renders for every other colour.
 * Settings: empty ring / pendant / earring mountings — never a finished piece.
 * Jewellery: a finished piece that matches the type and the stone in the title.
 */

const M = (file: string): string => `/media/${file}`;

const STONE: Record<string, string> = {
  'sapphire-blue': M('stone-sapphire.jpg'),
  'sapphire-pair': M('stone-sapphire-pair.jpg'),
  'sapphire-pink': M('stone-sapphire-pink.jpg'),
  padparadscha: M('stone-padparadscha.jpg'),
  ruby: M('stone-ruby.jpg'),
  emerald: M('stone-emerald.jpg'),
  paraiba: M('stone-paraiba.jpg'),
  alexandrite: M('stone-alexandrite.jpg'),
  'spinel-blue': M('stone-spinel-blue.jpg'),
  'spinel-pink': M('stone-spinel-pink.jpg'),
  tanzanite: M('stone-tanzanite.jpg'),
  aquamarine: M('stone-aquamarine.jpg'),
  morganite: M('stone-morganite.jpg'),
  tsavorite: M('stone-tsavorite.jpg'),
  spessartite: M('stone-spessartite.jpg'),
  rubellite: M('stone-rubellite.jpg'),
  diamond: M('stone-diamond.jpg'),
  'diamond-yellow': M('stone-diamond-yellow.jpg'),
  opal: M('stone-opal.jpg'),
  pearl: M('stone-pearl.jpg'),
};

const SETTING: Record<string, string> = {
  ring: M('setting-ring.jpg'),
  pendant: M('setting-pendant.jpg'),
  earrings: M('setting-earrings.jpg'),
};

const JEWELRY: Record<string, string> = {
  'ring-sapphire': M('jew-sapphire-ring.jpg'),
  'ring-ruby': M('jew-ruby-ring.jpg'),
  'ring-morganite': M('jew-morganite-ring.jpg'),
  'ring-tanzanite': M('jew-tanzanite-ring.jpg'),
  'ring-aquamarine': M('jew-aquamarine-ring.jpg'),
  'ring-opal': M('jew-opal-ring.jpg'),
  'ring-tourmaline': M('jew-pink-tourmaline-ring.jpg'),
  'band-ruby': M('jew-ruby-band.jpg'),
  'earrings-emerald': M('jew-emerald-earrings.jpg'),
  'earrings-pearl': M('jew-pearl-earrings.jpg'),
  'earrings-sapphire': M('jew-sapphire-studs.jpg'),
  'earrings-diamond': M('jew-diamond-hoops.jpg'),
  'earrings-alexandrite': M('jew-alexandrite-earrings.jpg'),
  'pendant-sapphire': M('jew-sapphire-pendant.jpg'),
  'pendant-diamond': M('jew-diamond-pendant.jpg'),
  'pendant-paraiba': M('jew-paraiba-pendant.jpg'),
  'necklace-emerald': M('jew-emerald-necklace.jpg'),
  'bracelet-diamond': M('jew-tennis-bracelet.jpg'),
};

export const HERO_IMAGE = M('jew-sapphire-ring.jpg');
export const HERO_IMAGE_MOBILE = M('jew-sapphire-ring.jpg');

export const COLLECTION_TILES = {
  gemstones: M('stone-sapphire.jpg'),
  pairs: M('stone-sapphire-pair.jpg'),
  jewellery: M('jew-sapphire-ring.jpg'),
  dyo: M('setting-ring.jpg'),
} as const;

export interface ProductImageInput {
  kind: string;
  stoneType?: string | null;
  jewelryType?: string | null;
  settingFor?: string | null;
  style?: string[] | string | null;
  title?: string | null;
  colorHue?: string | null;
  variety?: string | null;
  quantityType?: string | null;
  imageUrl?: string | null;
}

function blob(input: ProductImageInput): string {
  return [
    input.stoneType,
    input.colorHue,
    input.variety,
    input.title,
    input.jewelryType,
    input.settingFor,
    Array.isArray(input.style) ? input.style.join(' ') : input.style,
    input.quantityType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function stoneKey(input: ProductImageInput): string {
  const text = blob(input);
  const type = (input.stoneType ?? '').toLowerCase();

  if (type === 'sapphire' || /\bsapphire\b/.test(text)) {
    if (/padparadscha|pink-orange|salmon/.test(text)) return 'padparadscha';
    if (/\bpink\b/.test(text)) return 'sapphire-pink';
    if (input.quantityType === 'pair' || /matched pair/.test(text)) return 'sapphire-pair';
    return 'sapphire-blue';
  }
  if (type === 'ruby' || /\bruby\b/.test(text)) return 'ruby';
  if (type === 'emerald' || /\bemerald\b/.test(text)) return 'emerald';
  if (type === 'paraiba_tourmaline' || /para[ií]ba/.test(text)) return 'paraiba';
  if (type === 'alexandrite' || /alexandrite/.test(text)) return 'alexandrite';
  if (type === 'spinel' || /\bspinel\b/.test(text)) {
    return /pink|hot pink|magenta/.test(text) ? 'spinel-pink' : 'spinel-blue';
  }
  if (type === 'tanzanite' || /tanzanite/.test(text)) return 'tanzanite';
  if (type === 'aquamarine' || /aquamarine/.test(text)) return 'aquamarine';
  if (type === 'morganite' || /morganite/.test(text)) return 'morganite';
  if (type === 'demantoid_garnet' || type === 'tsavorite_garnet' || /demantoid|tsavorite/.test(text)) {
    return 'tsavorite';
  }
  if (type === 'spessartite_garnet' || /spessartite|mandarin/.test(text)) return 'spessartite';
  if (type === 'rubellite' || /rubellite/.test(text)) return 'rubellite';
  if (type === 'diamond' || /\bdiamond\b/.test(text)) {
    return /yellow|fancy vivid/.test(text) ? 'diamond-yellow' : 'diamond';
  }
  if (type === 'opal' || /\bopal\b/.test(text)) return 'opal';
  if (type === 'pearl' || /\bpearl\b/.test(text)) return 'pearl';
  if (type === 'moissanite' || /moissanite/.test(text)) return 'diamond';
  return 'sapphire-blue';
}

function settingKey(input: ProductImageInput): 'ring' | 'pendant' | 'earrings' {
  const forWhat = (input.settingFor ?? '').toLowerCase();
  if (forWhat === 'pendant' || forWhat === 'necklace') return 'pendant';
  if (forWhat === 'earrings' || forWhat === 'earring') return 'earrings';
  const text = blob(input);
  if (/pendant|necklace/.test(text)) return 'pendant';
  if (/earring/.test(text)) return 'earrings';
  return 'ring';
}

function jewelryKey(input: ProductImageInput): string {
  const text = blob(input);
  const type = (input.jewelryType ?? inferJewelryType(input.title ?? '') ?? '').toLowerCase();

  if (type === 'bracelet' || /bracelet|tennis/.test(text)) return 'bracelet-diamond';
  if (type === 'necklace' || (/\bnecklace\b/.test(text) && !/pendant/.test(text))) return 'necklace-emerald';

  if (type === 'earrings' || /earring/.test(text)) {
    if (/pearl/.test(text)) return 'earrings-pearl';
    if (/emerald/.test(text)) return 'earrings-emerald';
    if (/alexandrite/.test(text)) return 'earrings-alexandrite';
    if (/sapphire/.test(text)) return 'earrings-sapphire';
    return 'earrings-diamond';
  }

  if (type === 'pendant' || /pendant/.test(text)) {
    if (/para[ií]ba/.test(text)) return 'pendant-paraiba';
    if (/sapphire/.test(text)) return 'pendant-sapphire';
    return 'pendant-diamond';
  }

  if (/eternity|band/.test(text) && /ruby/.test(text)) return 'band-ruby';
  if (/ruby/.test(text)) return 'ring-ruby';
  if (/sapphire/.test(text)) return 'ring-sapphire';
  if (/morganite/.test(text)) return 'ring-morganite';
  if (/tanzanite/.test(text)) return 'ring-tanzanite';
  if (/aquamarine/.test(text)) return 'ring-aquamarine';
  if (/opal/.test(text)) return 'ring-opal';
  if (/tourmaline|rubellite/.test(text)) return 'ring-tourmaline';
  return 'ring-sapphire';
}

/**
 * P1-29 honesty: distinguishes a product's OWN media from the keyword-matched
 * representative photo. Product cards may keep the representative imagery for
 * layout stability but consumers (card footers, PDP galleries) can use this
 * flag to append a visible "representative image" note instead of presenting
 * a generic photo as the piece's own record.
 */
export function isRepresentativeImage(input: ProductImageInput): boolean {
  return !(input.imageUrl && /^https?:\/\//i.test(input.imageUrl));
}

export function productImage(input: ProductImageInput): string {
  if (input.imageUrl && /^https?:\/\//i.test(input.imageUrl)) return input.imageUrl;
  if (input.kind === 'gemstone') {
    return STONE[stoneKey(input)] ?? STONE['sapphire-blue']!;
  }
  if (input.kind === 'jewelry') {
    return JEWELRY[jewelryKey(input)] ?? JEWELRY['ring-sapphire']!;
  }
  return SETTING[settingKey(input)] ?? SETTING['ring']!;
}

export function inferJewelryType(title: string): string | undefined {
  const t = title.toLowerCase();
  if (t.includes('earring')) return 'earrings';
  if (t.includes('pendant')) return 'pendant';
  if (t.includes('necklace')) return 'necklace';
  if (t.includes('bracelet')) return 'bracelet';
  if (t.includes('ring') || t.includes('band')) return 'ring';
  return undefined;
}
