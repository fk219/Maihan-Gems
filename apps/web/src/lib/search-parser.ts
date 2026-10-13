/**
 * Rule-based natural-language parser for catalogue search.
 * Works without an LLM. Extracts structured filters, then leftover text
 * is used for pg_trgm / ILIKE matching.
 */

export type StorefrontCurrency = 'USD' | 'AED' | 'THB';

export interface ParsedSearch {
  raw: string;
  remainder: string;
  stoneType?: string;
  quantityType?: 'single' | 'pair';
  shape?: string;
  minCarat?: number;
  maxCarat?: number;
  origin?: string;
  treatment?: string;
  minPriceUsd?: number;
  maxPriceUsd?: number;
  kind?: 'gemstone' | 'jewelry' | 'setting';
  jewelryType?: string;
}

const STONE_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bpara[ií]ba(?:\s+tourmaline)?s?\b/i, 'paraiba_tourmaline'],
  [/\btsavorites?(?:\s+garnets?)?\b/i, 'tsavorite_garnet'],
  [/\bdemantoids?(?:\s+garnets?)?\b/i, 'demantoid_garnet'],
  [/\bspessartites?(?:\s+garnets?)?\b/i, 'spessartite_garnet'],
  [/\brubellites?(?:\s+tourmalines?)?\b/i, 'rubellite'],
  [/\btourmalines?\b/i, 'paraiba_tourmaline'],
  [/\bsapphires?\b/i, 'sapphire'],
  [/\brubies\b|\bruby\b/i, 'ruby'],
  [/\bemeralds?\b/i, 'emerald'],
  [/\bspinels?\b/i, 'spinel'],
  [/\btanzanites?\b/i, 'tanzanite'],
  [/\baquamarines?\b/i, 'aquamarine'],
  [/\bmorganites?\b/i, 'morganite'],
  [/\balexandrites?\b/i, 'alexandrite'],
  [/\bdiamonds?\b/i, 'diamond'],
  [/\bopals?\b/i, 'opal'],
  [/\bpearls?\b/i, 'pearl'],
  [/\bmoissanites?\b/i, 'moissanite'],
  [/\bgarnets?\b/i, 'tsavorite_garnet'],
];

const SHAPE_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bemerald[-\s]?cuts?\b/i, 'emerald_cut'],
  [/\bcushions?\b/i, 'cushion'],
  [/\bovals?\b/i, 'oval'],
  [/\brounds?\b|\bbrilliant\b/i, 'round'],
  [/\bpears?\b/i, 'pear'],
  [/\bmarquises?\b/i, 'marquise'],
  [/\bprincess(?:\s+cuts?)?\b/i, 'princess'],
];

const ORIGIN_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bceylon\b|\bsri\s+lanka\b/i, 'Sri Lanka'],
  [/\bkashmir\b/i, 'Kashmir'],
  [/\bburma\b|\bmyanmar\b|\bmogok\b/i, 'Myanmar'],
  [/\bmozambique\b/i, 'Mozambique'],
  [/\bcolombia(?:n)?\b|\bmuzo\b/i, 'Colombia'],
  [/\bmadagascar\b/i, 'Madagascar'],
  [/\bbrazil(?:ian)?\b/i, 'Brazil'],
  [/\bzambia(?:n)?\b/i, 'Zambia'],
  [/\brussia(?:n)?\b/i, 'Russia'],
];

const TREATMENT_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bunheated\b|\buntreated\b|\bno[-\s]?enhancement\b|\bnatural\s+unheated\b/i, 'no_enhancement'],
  [/\bheated\b/i, 'heated'],
  [/\boil(?:ed)?\b|\btraditional\b/i, 'traditional'],
];

function takeFirst(text: string, table: ReadonlyArray<readonly [RegExp, string]>): { value?: string; next: string } {
  for (const [re, value] of table) {
    if (re.test(text)) {
      return { value, next: text.replace(re, ' ') };
    }
  }
  return { next: text };
}

function toUsd(amount: number, currency: StorefrontCurrency): number {
  if (currency === 'AED') return amount / 3.6725;
  if (currency === 'THB') return amount / 34.5;
  return amount;
}

function detectAmountCurrency(blob: string): StorefrontCurrency {
  if (/\baed\b|د\.إ/i.test(blob)) return 'AED';
  if (/\bthb\b|\bbaht\b/i.test(blob)) return 'THB';
  return 'USD';
}

export function parseSearchQuery(input: string): ParsedSearch {
  const raw = input.trim();
  if (raw.length === 0) {
    return { raw, remainder: '' };
  }

  let text = raw;
  const parsed: ParsedSearch = { raw, remainder: '' };

  if (/\bpairs?\b|\bmatched\b/i.test(text)) {
    parsed.quantityType = 'pair';
    text = text.replace(/\bmatched\s+pairs?\b|\bpairs?\b|\bmatched\b/gi, ' ');
  }

  if (/\bsettings?\b|\bmountings?\b/i.test(text)) {
    parsed.kind = 'setting';
    text = text.replace(/\bsettings?\b|\bmountings?\b/gi, ' ');
  } else if (/\bjewell?ery\b|\brings?\b|\bearrings?\b|\bpendants?\b|\bbracelets?\b|\bnecklaces?\b/i.test(text)) {
    parsed.kind = 'jewelry';
    if (/\bearrings?\b/i.test(text)) parsed.jewelryType = 'earrings';
    else if (/\bpendants?\b/i.test(text)) parsed.jewelryType = 'pendant';
    else if (/\bbracelets?\b/i.test(text)) parsed.jewelryType = 'bracelet';
    else if (/\bnecklaces?\b/i.test(text)) parsed.jewelryType = 'necklace';
    else if (/\brings?\b/i.test(text)) parsed.jewelryType = 'ring';
    text = text.replace(/\bjewell?ery\b|\brings?\b|\bearrings?\b|\bpendants?\b|\bbracelets?\b|\bnecklaces?\b/gi, ' ');
  }

  const stone = takeFirst(text, STONE_ALIASES);
  if (stone.value) {
    parsed.stoneType = stone.value;
    text = stone.next;
    parsed.kind = parsed.kind ?? 'gemstone';
  }

  const shape = takeFirst(text, SHAPE_ALIASES);
  if (shape.value) {
    parsed.shape = shape.value;
    text = shape.next;
  }

  const origin = takeFirst(text, ORIGIN_ALIASES);
  if (origin.value) {
    parsed.origin = origin.value;
    text = origin.next;
  }

  const treatment = takeFirst(text, TREATMENT_ALIASES);
  if (treatment.value) {
    parsed.treatment = treatment.value;
    text = treatment.next;
  }

  const caratRange = text.match(/(\d+(?:\.\d+)?)\s*[-to]+\s*(\d+(?:\.\d+)?)\s*(?:ct|carats?)/i);
  const caratExact = text.match(/(\d+(?:\.\d+)?)\s*(?:ct|carats?)/i);
  const caratOver = text.match(/(?:over|above|more than)\s+(\d+(?:\.\d+)?)\s*(?:ct|carats?)?/i);
  if (caratRange) {
    parsed.minCarat = Number(caratRange[1]);
    parsed.maxCarat = Number(caratRange[2]);
    text = text.replace(caratRange[0], ' ');
  } else if (caratOver) {
    parsed.minCarat = Number(caratOver[1]);
    text = text.replace(caratOver[0], ' ');
  } else if (caratExact) {
    const ct = Number(caratExact[1]);
    parsed.minCarat = Math.max(0, ct - 0.25);
    parsed.maxCarat = ct + 0.5;
    text = text.replace(caratExact[0], ' ');
  }

  const under = text.match(/(?:under|below|less than|<)\s*(usd|aed|thb|\$)?\s*([\d,]+)/i);
  const over = text.match(/(?:over|above|more than|>)\s*(usd|aed|thb|\$)?\s*([\d,]+)/i);
  if (under) {
    const currency = detectAmountCurrency(`${under[1] ?? ''} ${raw}`);
    parsed.maxPriceUsd = toUsd(Number(under[2]!.replace(/,/g, '')), currency);
    text = text.replace(under[0], ' ');
  }
  if (over) {
    const currency = detectAmountCurrency(`${over[1] ?? ''} ${raw}`);
    parsed.minPriceUsd = toUsd(Number(over[2]!.replace(/,/g, '')), currency);
    text = text.replace(over[0], ' ');
  }

  parsed.remainder = text
    .replace(/\b(?:show|find|looking for|i want|please|the|a|an|of|for|with|and|or)\b/gi, ' ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return parsed;
}

export function stoneTypeToSlug(stoneType: string): string {
  return (stoneType ?? '').replace(/_/g, '-');
}

export function slugToStoneType(slug: string): string {
  return (slug ?? '').replace(/-/g, '_');
}

export const COLLECTION_FORM_SUFFIXES = [
  'pairs',
  'earrings',
  'pendants',
  'bracelets',
  'necklaces',
  'rings',
  'settings',
] as const;

export type CollectionFormSuffix = (typeof COLLECTION_FORM_SUFFIXES)[number];

export type ParsedCollectionSlug =
  | {
      readonly mode: 'stone';
      readonly slug: string;
      readonly stoneSlug: string;
      readonly stoneType: string;
    }
  | {
      readonly mode: 'pairs';
      readonly slug: string;
      readonly stoneSlug: string;
      readonly stoneType: string;
    }
  | {
      readonly mode: 'jewelry';
      readonly slug: string;
      readonly stoneSlug: string;
      readonly stoneType: string;
      readonly jewelryType: 'ring' | 'earrings' | 'pendant' | 'bracelet' | 'necklace';
      readonly formLabel: string;
    }
  | {
      readonly mode: 'settings';
      readonly slug: string;
      readonly stoneSlug: string;
      readonly stoneType: string;
    };

const JEWELRY_FORMS: Record<
  Exclude<CollectionFormSuffix, 'pairs' | 'settings'>,
  { jewelryType: 'ring' | 'earrings' | 'pendant' | 'bracelet' | 'necklace'; formLabel: string }
> = {
  earrings: { jewelryType: 'earrings', formLabel: 'earrings' },
  pendants: { jewelryType: 'pendant', formLabel: 'pendants' },
  bracelets: { jewelryType: 'bracelet', formLabel: 'bracelets' },
  necklaces: { jewelryType: 'necklace', formLabel: 'necklaces' },
  rings: { jewelryType: 'ring', formLabel: 'rings' },
};

export function parseCollectionSlug(raw: string | undefined | null): ParsedCollectionSlug | null {
  const slug = (raw ?? '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!slug) return null;

  for (const suffix of COLLECTION_FORM_SUFFIXES) {
    const token = `-${suffix}`;
    if (slug.endsWith(token) && slug.length > token.length) {
      const stoneSlug = slug.slice(0, -token.length);
      const stoneType = slugToStoneType(stoneSlug);
      if (suffix === 'pairs') {
        return { mode: 'pairs', slug, stoneSlug, stoneType };
      }
      if (suffix === 'settings') {
        return { mode: 'settings', slug, stoneSlug, stoneType };
      }
      const form = JEWELRY_FORMS[suffix];
      return { mode: 'jewelry', slug, stoneSlug, stoneType, ...form };
    }
  }

  return { mode: 'stone', slug, stoneSlug: slug, stoneType: slugToStoneType(slug) };
}

export function displayStoneName(stoneType: string): string {
  return stoneType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Paraiba', 'Paraíba');
}
