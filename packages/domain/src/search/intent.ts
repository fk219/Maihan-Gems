/**
 * packages/domain/src/search/intent.ts
 *
 * Task 1 — Deterministic query intent detection.
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 1: "Implement deterministic
 *     intent detection by rule, not by model, on the request path."
 *   - PROJECT_SOURCE_OF_TRUTH.md section 11.3 & 14.2 (Query flow step 2).
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §22-37.
 *
 * Requirements:
 *   1. Rule-based, zero-model, deterministic intent detection.
 *   2. Normalizes input safely (lowercase, trim, punctuation normalization).
 *   3. Classifies query intent:
 *      - IDENTIFIER_LOOKUP: exact match for gem reference (K#####), pair (PR#),
 *        ready-made (J#), or setting SKU (e.g. SOL-RD-14KW).
 *      - NAVIGATIONAL: exact canonical variety or jewellery type query.
 *      - DESCRIPTIVE: query with multiple descriptive/style adjectives.
 *      - PRODUCT_SEARCH: general search query.
 *   4. Extracts structured filters:
 *      - Price range ("under 5000", "between 2000 and 5000", "over 1000")
 *      - Carat weight ("2ct", "over 1.5 carats", "between 1 and 3ct")
 *      - Jewellery type ("ring", "earrings", "pendant", "bracelet")
 *      - Variety, Colour, Shape, Treatment, Metal, Certified.
 *   5. Preserves residual query text for full-text search without fabricating terms.
 *   6. Rejects malformed / oversized input safely.
 *   7. Pure domain function with no network, DB, or async I/O.
 */

export type SearchIntentType =
  | 'IDENTIFIER_LOOKUP'
  | 'NAVIGATIONAL'
  | 'DESCRIPTIVE'
  | 'PRODUCT_SEARCH';

export interface ExtractedFilters {
  readonly kind?: readonly string[];
  readonly jewelleryType?: readonly string[];
  readonly variety?: readonly string[];
  readonly color?: readonly string[];
  readonly shape?: readonly string[];
  readonly treatment?: readonly string[];
  readonly metal?: readonly string[];
  readonly certified?: boolean;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minWeightCt?: number;
  readonly maxWeightCt?: number;
}

export interface DetectedIntent {
  readonly type: SearchIntentType;
  readonly confidence: number;
  readonly normalizedQuery: string;
  readonly residualQuery: string;
  readonly extractedFilters: ExtractedFilters;
  readonly detectedIdentifier?: string;
}

// ---------------------------------------------------------------------------
// Dictionaries for deterministic extraction
// ---------------------------------------------------------------------------

const IDENTIFIER_PATTERNS = [
  /^[Kk]\d{1,6}$/,               // Single stone (e.g. K1551, K27053)
  /^[Pp][Rr]\d{1,6}$/,           // Stone pair (e.g. PR5681)
  /^[Jj]\d{1,6}$/,               // Ready-made product (e.g. J1383)
  /^[Ss]\d{1,6}$/,               // Setting design / S-sku
  /^[A-Z0-9]{2,10}(?:-[A-Z0-9]{2,8}){2,4}$/i, // Setting SKU (e.g. SOL-RD-14KW, JS1383-RD-18KY)
];

const JEWELLERY_TYPES: Record<string, string> = {
  ring: 'RING',
  rings: 'RING',
  earring: 'EARRINGS',
  earrings: 'EARRINGS',
  pendant: 'PENDANT',
  pendants: 'PENDANT',
  necklace: 'NECKLACE',
  necklaces: 'NECKLACE',
  bracelet: 'BRACELET',
  bracelets: 'BRACELET',
};

const VARIETIES: Record<string, string> = {
  sapphire: 'sapphire',
  sapphires: 'sapphire',
  ruby: 'ruby',
  rubies: 'ruby',
  emerald: 'emerald',
  emeralds: 'emerald',
  tanzanite: 'tanzanite',
  tanzanites: 'tanzanite',
  tourmaline: 'tourmaline',
  tourmalines: 'tourmaline',
  tsavorite: 'tsavorite',
  garnet: 'garnet',
  garnets: 'garnet',
  spinel: 'spinel',
  spinels: 'spinel',
  alexandrite: 'alexandrite',
  aquamarine: 'aquamarine',
  aquamarines: 'aquamarine',
  zircon: 'zircon',
  zircons: 'zircon',
  topaz: 'topaz',
  peridot: 'peridot',
  chrysoberyl: 'chrysoberyl',
  sphene: 'sphene',
  amethyst: 'amethyst',
  citrine: 'citrine',
  morganite: 'morganite',
  opal: 'opal',
  opals: 'opal',
};

const COLOURS: Record<string, string> = {
  blue: 'blue',
  pink: 'pink',
  yellow: 'yellow',
  green: 'green',
  red: 'red',
  purple: 'purple',
  padparadscha: 'padparadscha',
  white: 'white',
  orange: 'orange',
  teal: 'teal',
  violet: 'violet',
  peach: 'peach',
  colorless: 'colourless',
  colourless: 'colourless',
  bicolor: 'bi-colour',
  'bi-colour': 'bi-colour',
};

const SHAPES: Record<string, string> = {
  round: 'ROUND',
  oval: 'OVAL',
  cushion: 'CUSHION',
  emerald: 'EMERALD',
  pear: 'PEAR',
  marquise: 'MARQUISE',
  princess: 'PRINCESS',
  heart: 'HEART',
  radiant: 'RADIANT',
  asscher: 'ASSCHER',
  trilliant: 'TRILLIANT',
  baguette: 'BAGUETTE',
};

const TREATMENTS: Record<string, string> = {
  untreated: 'NO_ENHANCEMENT',
  unheated: 'NO_ENHANCEMENT',
  'no heat': 'NO_ENHANCEMENT',
  'no enhancement': 'NO_ENHANCEMENT',
  heated: 'HEAT_TREATED',
  'heat treated': 'HEAT_TREATED',
  treated: 'HEAT_TREATED',
};

const METALS: Record<string, string> = {
  platinum: 'PLATINUM',
  'white gold': '14KW',
  '14k white gold': '14KW',
  '18k white gold': '18KW',
  'yellow gold': '14KY',
  '14k yellow gold': '14KY',
  '18k yellow gold': '18KY',
  'rose gold': '14KR',
  '14k rose gold': '14KR',
  '18k rose gold': '18KR',
  silver: 'SILVER',
};

// ---------------------------------------------------------------------------
// Normalization & extraction helpers
// ---------------------------------------------------------------------------

/** Clean, lowercase, and normalize raw query text without losing semantic tokens. */
export function normalizeQueryText(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/['"]+/g, '') // remove straight quotes
    .replace(/\s{2,}/g, ' ');
}

/** Check if token matches a known SKU/identity pattern. */
export function isIdentifierToken(token: string): boolean {
  const clean = token.trim();
  return IDENTIFIER_PATTERNS.some((pat) => pat.test(clean));
}

// ---------------------------------------------------------------------------
// Pure intent detector
// ---------------------------------------------------------------------------

export function detectSearchIntent(queryText: string): DetectedIntent {
  const normalized = normalizeQueryText(queryText);
  if (normalized.length === 0) {
    return Object.freeze({
      type: 'PRODUCT_SEARCH',
      confidence: 1.0,
      normalizedQuery: '',
      residualQuery: '',
      extractedFilters: Object.freeze({}),
    });
  }

  // 1. Check for single exact identifier lookup
  if (isIdentifierToken(normalized)) {
    const upperId = normalized.toUpperCase();
    return Object.freeze({
      type: 'IDENTIFIER_LOOKUP',
      confidence: 1.0,
      normalizedQuery: normalized,
      residualQuery: normalized,
      detectedIdentifier: upperId,
      extractedFilters: Object.freeze({}),
    });
  }

  // 2. Extract price filters
  let workingText = normalized;
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  // between $X and $Y
  const betweenPriceMatch = /\b(?:between)\s+\$?(\d[\d,]*)\s+(?:and|to)\s+\$?(\d[\d,]*)\b/i.exec(workingText);
  if (betweenPriceMatch) {
    const p1 = Number(betweenPriceMatch[1]!.replace(/,/g, ''));
    const p2 = Number(betweenPriceMatch[2]!.replace(/,/g, ''));
    if (!Number.isNaN(p1) && !Number.isNaN(p2)) {
      minPrice = Math.min(p1, p2);
      maxPrice = Math.max(p1, p2);
      workingText = workingText.replace(betweenPriceMatch[0], ' ');
    }
  } else {
    // under / less than / below $X
    const maxPriceMatch = /\b(?:under|less than|below)\s+\$?(\d[\d,]*)\b/i.exec(workingText);
    if (maxPriceMatch) {
      const p = Number(maxPriceMatch[1]!.replace(/,/g, ''));
      if (!Number.isNaN(p)) {
        maxPrice = p;
        workingText = workingText.replace(maxPriceMatch[0], ' ');
      }
    }
    // over / more than / above $X
    const minPriceMatch = /\b(?:over|more than|above)\s+\$?(\d[\d,]*)\b/i.exec(workingText);
    if (minPriceMatch) {
      const p = Number(minPriceMatch[1]!.replace(/,/g, ''));
      if (!Number.isNaN(p)) {
        minPrice = p;
        workingText = workingText.replace(minPriceMatch[0], ' ');
      }
    }
  }

  // 3. Extract carat weight filters
  let minWeightCt: number | undefined;
  let maxWeightCt: number | undefined;

  const betweenWeightMatch = /\b(?:between)\s+(\d+(?:\.\d+)?)\s*(?:ct|carat|carats)?\s+(?:and|to)\s+(\d+(?:\.\d+)?)\s*(?:ct|carats?)\b/i.exec(workingText);
  if (betweenWeightMatch) {
    const w1 = Number(betweenWeightMatch[1]);
    const w2 = Number(betweenWeightMatch[2]);
    if (!Number.isNaN(w1) && !Number.isNaN(w2)) {
      minWeightCt = Math.min(w1, w2);
      maxWeightCt = Math.max(w1, w2);
      workingText = workingText.replace(betweenWeightMatch[0], ' ');
    }
  } else {
    const maxWeightMatch = /\b(?:under|less than|below)\s+(\d+(?:\.\d+)?)\s*(?:ct|carats?)\b/i.exec(workingText);
    if (maxWeightMatch) {
      const w = Number(maxWeightMatch[1]);
      if (!Number.isNaN(w)) {
        maxWeightCt = w;
        workingText = workingText.replace(maxWeightMatch[0], ' ');
      }
    }
    const minWeightMatch = /\b(?:over|more than|above)\s+(\d+(?:\.\d+)?)\s*(?:ct|carats?)\b/i.exec(workingText);
    if (minWeightMatch) {
      const w = Number(minWeightMatch[1]);
      if (!Number.isNaN(w)) {
        minWeightCt = w;
        workingText = workingText.replace(minWeightMatch[0], ' ');
      }
    }
    // exact weight token: e.g. "2ct", "2.5 carat"
    if (minWeightCt === undefined && maxWeightCt === undefined) {
      const exactWeightMatch = /\b(\d+(?:\.\d+)?)\s*(?:ct|carats?)\b/i.exec(workingText);
      if (exactWeightMatch) {
        const w = Number(exactWeightMatch[1]);
        if (!Number.isNaN(w)) {
          // Range tolerance around exact weight: +- 0.25ct
          minWeightCt = Math.max(0, w - 0.25);
          maxWeightCt = w + 0.25;
          workingText = workingText.replace(exactWeightMatch[0], ' ');
        }
      }
    }
  }

  // 4. Extract certified flag
  let certified: boolean | undefined;
  if (/\b(?:certified|gia|igi|gubelin|ssef|with certificate)\b/i.test(workingText)) {
    certified = true;
    workingText = workingText.replace(/\b(?:certified|gia|igi|gubelin|ssef|with certificate)\b/gi, ' ');
  }

  // 5. Extract treatment
  const extractedTreatments: string[] = [];
  for (const [key, val] of Object.entries(TREATMENTS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(workingText)) {
      if (!extractedTreatments.includes(val)) extractedTreatments.push(val);
      workingText = workingText.replace(regex, ' ');
    }
  }

  // 6. Extract metals (multi-word first)
  const extractedMetals: string[] = [];
  const metalEntries = Object.entries(METALS).sort((a, b) => b[0].length - a[0].length);
  for (const [key, val] of metalEntries) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(workingText)) {
      if (!extractedMetals.includes(val)) extractedMetals.push(val);
      workingText = workingText.replace(regex, ' ');
    }
  }

  // 7. Extract shapes
  const extractedShapes: string[] = [];
  for (const [key, val] of Object.entries(SHAPES)) {
    const pattern = key === 'emerald'
      ? `\\b${key}\\s+cut\\b`
      : `\\b${key}(?:\\s+cut)?\\b`;
    const regex = new RegExp(pattern, 'i');
    if (regex.test(workingText)) {
      if (!extractedShapes.includes(val)) extractedShapes.push(val);
      workingText = workingText.replace(regex, ' ');
    }
  }

  // 8. Extract colours
  const extractedColours: string[] = [];
  for (const [key, val] of Object.entries(COLOURS)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(workingText)) {
      if (!extractedColours.includes(val)) extractedColours.push(val);
      workingText = workingText.replace(regex, ' ');
    }
  }

  // 9. Extract varieties
  const extractedVarieties: string[] = [];
  for (const [key, val] of Object.entries(VARIETIES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(workingText)) {
      if (!extractedVarieties.includes(val)) extractedVarieties.push(val);
      workingText = workingText.replace(regex, ' ');
    }
  }

  // 10. Extract jewellery types
  const extractedJewelleryTypes: string[] = [];
  for (const [key, val] of Object.entries(JEWELLERY_TYPES)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(workingText)) {
      if (!extractedJewelleryTypes.includes(val)) extractedJewelleryTypes.push(val);
      workingText = workingText.replace(regex, ' ');
    }
  }

  // Clean residual text
  const residual = workingText
    .replace(/\b(?:for|an|a|in|with|of|the|and)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const extracted: ExtractedFilters = {
    ...(extractedJewelleryTypes.length > 0 ? { jewelleryType: Object.freeze(extractedJewelleryTypes) } : {}),
    ...(extractedVarieties.length > 0 ? { variety: Object.freeze(extractedVarieties) } : {}),
    ...(extractedColours.length > 0 ? { color: Object.freeze(extractedColours) } : {}),
    ...(extractedShapes.length > 0 ? { shape: Object.freeze(extractedShapes) } : {}),
    ...(extractedTreatments.length > 0 ? { treatment: Object.freeze(extractedTreatments) } : {}),
    ...(extractedMetals.length > 0 ? { metal: Object.freeze(extractedMetals) } : {}),
    ...(certified !== undefined ? { certified } : {}),
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    ...(minWeightCt !== undefined ? { minWeightCt } : {}),
    ...(maxWeightCt !== undefined ? { maxWeightCt } : {}),
  };

  // Classify intent type
  const filterCount = Object.keys(extracted).length;
  let type: SearchIntentType = 'PRODUCT_SEARCH';
  let confidence = 0.85;

  if (filterCount === 1 && residual.length === 0 && (extracted.variety || extracted.jewelleryType)) {
    type = 'NAVIGATIONAL';
    confidence = 0.95;
  } else if (filterCount >= 2 || (filterCount >= 1 && residual.length > 0)) {
    type = 'DESCRIPTIVE';
    confidence = 0.90;
  } else if (filterCount === 0 && residual.length > 0) {
    type = 'PRODUCT_SEARCH';
    confidence = 0.80;
  }

  return Object.freeze({
    type,
    confidence,
    normalizedQuery: normalized,
    residualQuery: residual,
    extractedFilters: Object.freeze(extracted),
  });
}
