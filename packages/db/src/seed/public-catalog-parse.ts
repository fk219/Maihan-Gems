/**
 * Pure parsers for public catalog import.
 * Structured fields come from URLs, JSON-LD and image filenames — never from
 * copied marketing copy. Descriptions are rewritten from those fields.
 */

export type CatalogKind = 'gemstone' | 'jewelry' | 'setting';

export interface ParsedListing {
  kind: CatalogKind;
  sku: string;
  slug: string;
  title: string;
  stoneType: string | null;
  colorHue: string | null;
  shape: string | null;
  originCountry: string | null;
  treatment: string | null;
  caratTotal: number | null;
  quantityType: 'single' | 'pair' | null;
  jewelryType: string | null;
  settingFor: string | null;
  metalType: string | null;
  metalColor: string | null;
  metalPurity: string | null;
  certificateLab: string | null;
}

export interface MoneyOffer {
  amount: number;
  currency: string;
}

const STONE_ALIASES: Array<[RegExp, string]> = [
  [/paraiba[-\s]?tourmaline|paraíba/i, 'paraiba_tourmaline'],
  [/rubellite/i, 'rubellite'],
  [/chrome[-\s]?tourmaline|tourmaline/i, 'tourmaline'],
  [/tsavorite/i, 'tsavorite_garnet'],
  [/demantoid/i, 'demantoid_garnet'],
  [/spessartite|mandarin/i, 'spessartite_garnet'],
  [/sapphire/i, 'sapphire'],
  [/ruby/i, 'ruby'],
  [/emerald/i, 'emerald'],
  [/spinel/i, 'spinel'],
  [/tanzanite/i, 'tanzanite'],
  [/aquamarine/i, 'aquamarine'],
  [/morganite/i, 'morganite'],
  [/alexandrite/i, 'alexandrite'],
  [/diamond/i, 'diamond'],
  [/opal/i, 'opal'],
  [/pearl/i, 'pearl'],
  [/peridot/i, 'peridot'],
  [/garnet/i, 'garnet'],
  [/topaz/i, 'topaz'],
  [/zircon/i, 'zircon'],
];

const SHAPES = [
  'cushion', 'oval', 'round', 'pear', 'emerald-cut', 'emerald_cut', 'princess',
  'marquise', 'heart', 'trillion', 'radiant', 'asscher', 'fancy', 'cushion-cut',
];

const ORIGINS: Array<[RegExp, string]> = [
  [/kashmir/i, 'Kashmir'],
  [/ceylon|sri[\s-]?lankan?|sri[\s-]?lanka/i, 'Sri Lanka'],
  [/burma|myanmar|mogok/i, 'Myanmar'],
  [/mozambique/i, 'Mozambique'],
  [/madagascar/i, 'Madagascar'],
  [/colombia|colombian|muzo/i, 'Colombia'],
  [/zambia|zambian/i, 'Zambia'],
  [/tanzania|tanzanian/i, 'Tanzania'],
  [/brazil|brazilian/i, 'Brazil'],
  [/thailand|thai|chanthaburi/i, 'Thailand'],
  [/cambodia/i, 'Cambodia'],
  [/australia/i, 'Australia'],
  [/russia|russian/i, 'Russia'],
  [/kenya|kenyan/i, 'Kenya'],
  [/afghanistan|afghan/i, 'Afghanistan'],
];

export function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function skuFromUrl(url: string): string | null {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* keep raw */
  }
  const m = path.match(/-((?:js|pr|[jk])\d{3,}[a-z0-9]*)\/?$/i);
  return m ? m[1]!.toUpperCase() : null;
}

export function classifyUrl(url: string): CatalogKind {
  const sku = skuFromUrl(url) ?? '';
  if (/setting/i.test(url) || sku.startsWith('JS')) return 'setting';
  if (sku.startsWith('J')) return 'jewelry';
  return 'gemstone';
}

export function isSkippableUrl(url: string): boolean {
  return /design-your-own|\/account\/|gift-card|\/cart\/|\/checkout/i.test(url)
    || /\.(jpg|jpeg|png|gif|webp|svg|pdf)(\?|$)/i.test(url);
}

function detectStone(text: string): string | null {
  for (const [re, value] of STONE_ALIASES) {
    if (re.test(text)) return value;
  }
  return null;
}

function detectOrigin(text: string): string | null {
  for (const [re, value] of ORIGINS) {
    if (re.test(text)) return value;
  }
  return null;
}

function detectShape(text: string): string | null {
  const blob = text.toLowerCase();
  for (const shape of SHAPES) {
    if (blob.includes(shape.replace('_', '-'))) return shape.replace(/-/g, '_').replace('_cut', '');
  }
  return null;
}

function detectCarat(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:ct|cts|carat)/i) ?? text.match(/(\d+(?:\.\d+)?)ct/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function detectTreatment(text: string): string | null {
  const blob = text.toLowerCase();
  if (/unheated|untreated|no[\s-]?enhancement/.test(blob)) return 'no_enhancement';
  if (/heat/.test(blob)) return 'heated';
  if (/oiled|clarity[\s-]?enhanced/.test(blob)) return 'clarity_enhanced';
  return null;
}

function detectColor(text: string): string | null {
  const blob = text.toLowerCase();
  const colors = [
    'padparadscha', 'pigeon blood', 'royal blue', 'cornflower', 'pink-orange',
    'pink', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'violet',
    'peach', 'white', 'black', 'teal', 'neon',
  ];
  for (const color of colors) {
    if (blob.includes(color)) return color;
  }
  return null;
}

export function detectLab(text: string): string | null {
  const labs = ['GIA', 'GRS', 'SSEF', 'AGL', 'Gübelin', 'Gubelin', 'Lotus', 'GGTL', 'AIGS', 'GIT'];
  for (const lab of labs) {
    const re = new RegExp(`\\b${lab.replace('ü', 'u?')}\\b`, 'i');
    if (re.test(text)) return lab === 'Gubelin' ? 'Gübelin' : lab;
  }
  return null;
}

export function parseMoney(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/,/g, '').replace(/[^0-9.]+/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function walkJsonLd(data: unknown, out: Array<Record<string, unknown>>): void {
  if (Array.isArray(data)) {
    for (const item of data) walkJsonLd(item, out);
    return;
  }
  if (!data || typeof data !== 'object') return;
  const rec = data as Record<string, unknown>;
  const type = rec['@type'];
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? '')];
  if (types.includes('Product') || types.includes('ProductGroup')) out.push(rec);
  if (rec['@graph']) walkJsonLd(rec['@graph'], out);
}

export function extractJsonLdProducts(html: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      walkJsonLd(JSON.parse(raw) as unknown, out);
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return out;
}

export function offerFromJsonLd(product: Record<string, unknown>): { money: MoneyOffer | null; images: string[] } {
  const offersRaw = product['offers'];
  const offers = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
  const rec = offers && typeof offers === 'object' ? offers as Record<string, unknown> : {};
  const amount = parseMoney(rec['price']) ?? parseMoney(rec['lowPrice']) ?? parseMoney(product['price']);
  const currency = typeof rec['priceCurrency'] === 'string' ? rec['priceCurrency'].toUpperCase() : 'USD';
  return { money: amount ? { amount, currency } : null, images: collectImages(product['image']) };
}

function collectImages(image: unknown): string[] {
  if (typeof image === 'string') return [decodeXml(image)];
  if (Array.isArray(image)) {
    return image.flatMap((v) => {
      if (typeof v === 'string') return [decodeXml(v)];
      if (v && typeof v === 'object' && typeof (v as { url?: string }).url === 'string') {
        return [decodeXml((v as { url: string }).url)];
      }
      return [];
    });
  }
  if (image && typeof image === 'object' && typeof (image as { url?: string }).url === 'string') {
    return [decodeXml((image as { url: string }).url)];
  }
  return [];
}

export function fallbackImages(html: string): string[] {
  const out: string[] = [];
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og?.[1]) out.push(decodeXml(og[1]));
  for (const m of html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi)) {
    if (m[1]) out.push(decodeXml(m[1]));
  }
  return out;
}

export function fallbackMoney(html: string): MoneyOffer | null {
  const ogAmount = html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i);
  const ogCur = html.match(/<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i);
  const item = html.match(/itemprop=["']price["'][^>]+content=["']([^"']+)["']/i);
  const jsonPrice = html.match(/"price"\s*:\s*"?(?:USD\s*)?([\d,]+(?:\.\d+)?)"?/i);
  const amount = parseMoney(ogAmount?.[1]) ?? parseMoney(item?.[1]) ?? parseMoney(jsonPrice?.[1]);
  if (!amount) return null;
  return { amount, currency: (ogCur?.[1] ?? 'USD').toUpperCase() };
}

export function pickPrimaryImage(images: string[]): string | null {
  const cleaned = images
    .map((u) => decodeXml(u))
    .filter((u) => /^https?:\/\//i.test(u))
    .filter((u) => !/logo|icon|sprite|placeholder|gift-card/i.test(u));
  const stoneShot = cleaned.find((u) =>
    /\/image\//i.test(u) && !/\/(lifestyleimage|lifestyle|cert|appraisal|sarin)(\/|$)/i.test(u),
  );
  return stoneShot ?? cleaned[0] ?? null;
}

function jewelryTypeFrom(blob: string): string | null {
  if (/earring/i.test(blob)) return 'earrings';
  if (/pendant/i.test(blob)) return 'pendant';
  if (/necklace/i.test(blob)) return 'necklace';
  if (/bracelet/i.test(blob)) return 'bracelet';
  if (/ring/i.test(blob)) return 'ring';
  return null;
}

export function parseListing(input: {
  url: string;
  jsonName?: string | null;
  jsonSku?: string | null;
  imageUrl?: string | null;
  extraText?: string | null;
  productType?: string | null;
}): ParsedListing {
  const url = input.url;
  const sku = (input.jsonSku ?? skuFromUrl(url) ?? 'UNK').toUpperCase().replace(/[^A-Z0-9-]+/g, '-');
  const blob = `${url} ${input.jsonName ?? ''} ${input.productType ?? ''} ${input.imageUrl ?? ''} ${input.extraText ?? ''}`;
  const kind = classifyUrl(url);
  const path = url.toLowerCase();
  const isPair = sku.startsWith('PR') || /pair/.test(path) || /matched[\s-]pair/.test(blob);

  let jewelryType: string | null = null;
  let settingFor: string | null = null;
  if (kind === 'jewelry' || kind === 'setting') {
    jewelryType = jewelryTypeFrom(blob) ?? 'ring';
    settingFor = jewelryType === 'earrings' ? 'earrings'
      : jewelryType === 'pendant' || jewelryType === 'necklace' ? 'pendant'
        : jewelryType === 'bracelet' ? 'bracelet'
          : 'ring';
  }

  const metalPurity = blob.match(/\b(18K|14K|22K|10K|PT950|925)\b/i)?.[1]?.toUpperCase() ?? null;
  let metalColor: string | null = null;
  if (/rose[\s-]?gold/i.test(blob)) metalColor = 'rose';
  else if (/white[\s-]?gold|platinum/i.test(blob)) metalColor = 'white';
  else if (/yellow[\s-]?gold/i.test(blob)) metalColor = 'yellow';
  const metalType = /platinum/i.test(blob) ? 'platinum' : /silver/i.test(blob) ? 'silver' : metalPurity ? 'gold' : null;

  const carat = detectCarat(blob);
  const stoneType = detectStone(blob);
  const origin = detectOrigin(blob);
  const shape = detectShape(blob);
  const color = detectColor(blob);
  const treatment = detectTreatment(blob);
  const lab = detectLab(blob);

  const constructed = [carat ? `${carat} ct` : null, color, shape, stoneType?.replace(/_/g, ' '), origin]
    .filter(Boolean)
    .join(' ');
  const jsonName = (input.jsonName ?? '').replace(/<[^>]+>/g, '').trim();
  const title = kind === 'gemstone'
    ? (constructed || jsonName || sku)
    : (jsonName || constructed || sku);

  return {
    kind,
    sku,
    slug: sku.toLowerCase(),
    title: title || sku,
    stoneType,
    colorHue: color,
    shape,
    originCountry: origin,
    treatment,
    caratTotal: carat,
    quantityType: kind === 'gemstone' ? (isPair ? 'pair' : 'single') : null,
    jewelryType: kind === 'jewelry' ? jewelryType : null,
    settingFor: kind === 'setting' ? settingFor : null,
    metalType,
    metalColor,
    metalPurity,
    certificateLab: lab,
  };
}

export function rewriteDescription(parsed: ParsedListing, vendorName: string): string {
  const stone = (parsed.stoneType ?? 'gemstone').replace(/_/g, ' ');
  const carat = parsed.caratTotal ? `${parsed.caratTotal} ct` : null;
  const color = parsed.colorHue;
  const shape = parsed.shape ? parsed.shape.replace(/_/g, ' ') : null;
  const origin = parsed.originCountry;
  const treatment = parsed.treatment === 'no_enhancement'
    ? 'no recorded enhancement'
    : parsed.treatment
      ? parsed.treatment.replace(/_/g, ' ')
      : null;
  const metal = [parsed.metalPurity, parsed.metalColor, parsed.metalType].filter(Boolean).join(' ');

  if (parsed.kind === 'gemstone') {
    const qty = parsed.quantityType === 'pair' ? 'matched pair' : 'loose stone';
    const head = [
      `A ${[carat, color, shape, stone].filter(Boolean).join(' ')} listed as a ${qty}`,
      origin ? `from ${origin}` : null,
      treatment ? `with ${treatment}` : null,
      `in the ${vendorName} vault.`,
    ].filter(Boolean).join(', ');
    return head.replace('.,', '.') + (parsed.certificateLab ? ` Independent lab noted: ${parsed.certificateLab}.` : '');
  }
  if (parsed.kind === 'setting') {
    return `An empty ${parsed.settingFor ?? 'ring'} mounting${metal ? ` in ${metal}` : ''}, priced without a centre stone, from ${vendorName}.`;
  }
  return [
    `A finished ${parsed.jewelryType ?? 'jewel'}`,
    carat || color || stone ? `set with ${[carat, color, stone].filter(Boolean).join(' ')}` : null,
    metal ? `in ${metal}` : null,
    origin ? `using material associated with ${origin}` : null,
    `from ${vendorName}.`,
  ].filter(Boolean).join(', ').replace('.,', '.');
}

export function toUsd(amount: number, currency: string, fx: { AED: number; THB: number }): number {
  const c = currency.trim().toUpperCase();
  if (c === 'USD') return amount;
  if (c === 'AED' && fx.AED > 0) return amount / fx.AED;
  if (c === 'THB' && fx.THB > 0) return amount / fx.THB;
  return amount;
}

/** Showcase slots: 3–6 live listings per category, no bulk crawl. */
export const SHOWCASE_TARGETS: Record<string, number> = {
  'sapphire-blue': 4,
  'sapphire-pink': 3,
  'sapphire-yellow': 3,
  'sapphire-padparadscha': 3,
  ruby: 4,
  emerald: 3,
  spinel: 3,
  tourmaline: 3,
  paraiba_tourmaline: 3,
  aquamarine: 3,
  morganite: 3,
  tanzanite: 3,
  garnet: 3,
  alexandrite: 3,
  topaz: 3,
  opal: 3,
  diamond: 3,
  pairs: 4,
  'jewelry-ring': 4,
  'jewelry-earrings': 4,
  'jewelry-pendant': 4,
  'jewelry-necklace': 3,
  'jewelry-bracelet': 3,
  'setting-ring': 4,
  'setting-pendant': 3,
  'setting-earrings': 3,
};

const GARNET_TYPES = new Set(['garnet', 'tsavorite_garnet', 'demantoid_garnet', 'spessartite_garnet']);

export function assignShowcaseCategory(input: {
  url: string;
  kind?: CatalogKind;
  stoneType?: string | null;
  colorHue?: string | null;
  variety?: string | null;
  quantityType?: string | null;
  jewelryType?: string | null;
  settingFor?: string | null;
}): string | null {
  const url = input.url.toLowerCase();
  const blob = `${url} ${input.stoneType ?? ''} ${input.colorHue ?? ''} ${input.variety ?? ''} ${input.jewelryType ?? ''} ${input.settingFor ?? ''}`;
  if (isSkippableUrl(input.url)) return null;
  if (input.quantityType === 'pair' || /pair|[-/]pr\d+/.test(blob)) return 'pairs';
  if (input.kind === 'setting' || /setting/.test(url) || /[-/]js\d+/.test(url)) {
    if (/earring/.test(blob)) return 'setting-earrings';
    if (/pendant|necklace/.test(blob)) return 'setting-pendant';
    return 'setting-ring';
  }
  if (input.kind === 'jewelry' || /[-/]j\d+/.test(url) || /\/(products|shop)\//.test(url)) {
    const jt = input.jewelryType ?? jewelryTypeFrom(blob);
    if (jt === 'earrings') return 'jewelry-earrings';
    if (jt === 'pendant') return 'jewelry-pendant';
    if (jt === 'necklace') return 'jewelry-necklace';
    if (jt === 'bracelet') return 'jewelry-bracelet';
    return 'jewelry-ring';
  }
  if (/padparadscha/.test(blob)) return 'sapphire-padparadscha';
  if (/paraiba|paraíba/.test(blob)) return 'paraiba_tourmaline';
  const stone = (input.stoneType ?? detectStone(blob) ?? '').toLowerCase();
  if (stone === 'sapphire' || /sapphire/.test(url)) {
    if (/pink/.test(blob)) return 'sapphire-pink';
    if (/yellow/.test(blob)) return 'sapphire-yellow';
    return 'sapphire-blue';
  }
  if (stone === 'ruby' || /(^|\/)ruby/.test(url)) return 'ruby';
  if (stone === 'emerald' || /emerald/.test(url)) return 'emerald';
  if (stone === 'spinel' || /spinel/.test(url)) return 'spinel';
  if (stone === 'tourmaline' || stone === 'rubellite' || /tourmaline|rubellite/.test(url)) return 'tourmaline';
  if (stone === 'aquamarine' || /aquamarine/.test(url)) return 'aquamarine';
  if (stone === 'morganite' || /morganite/.test(url)) return 'morganite';
  if (stone === 'tanzanite' || /tanzanite/.test(url)) return 'tanzanite';
  if (GARNET_TYPES.has(stone) || /garnet/.test(url)) return 'garnet';
  if (stone === 'alexandrite' || /alexandrite/.test(url)) return 'alexandrite';
  if (stone === 'topaz' || /topaz/.test(url)) return 'topaz';
  if (stone === 'opal' || /opal/.test(url)) return 'opal';
  if (stone === 'diamond' || /diamond/.test(url)) return 'diamond';
  return null;
}
