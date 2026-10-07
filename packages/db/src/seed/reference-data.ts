/**
 * packages/db — reference-data seed definitions (Phase 1 Task 9).
 *
 * Plan task 9: "Seed reference data: 15 metals, 8 jewellery types, setting
 * styles, treatments, intensities, clarities." The plan note (IMPLEMENTATION
 * STATE) fixes the semantics: "15 metals, 8 jewellery types" are ENUM MEMBER
 * counts — observed source counts differ. `metal_code` holds 15 members and
 * `jewellery_type` 8; the observed evidence carries 14 metal codes and 5
 * jewellery types. The FULL enum is inserted, never described as observed.
 *
 * Every value below is provenance-traced. Evidence hierarchy (AGENTS.md 4):
 * OBSERVED  — directly present in a source artefact;
 * EXTRACTED — derived by deterministic parsing from an artefact (SoT §4
 *             tags the jewellery type and setting style lists EXTRACTED);
 * INFERRED  — enum-only members with no source observation (R10,
 *             BROOCH, CUFFLINKS, CHARM). Attribute values that are not
 *             evidenced are never invented: they stay null/default and the
 *             row is marked INFERRED.
 *
 * The metal display labels are the SoT §4 table verbatim (`[VERIFIED]
 * [OBSERVED] metals — 14 codes, 1:1 with slug phrases`). The slug phrases
 * are the observed slug tokens, deterministically extracted from
 * `urls.jsonl` (MANIFEST entry 2) as the token run between the weight token
 * and the SKU token: 1:1 per code, zero conflicts, per metal aggregate per
 * code matching the SoT URL counts exactly; `reference-corpus.spec.ts`
 * re-verifies this against the real archive every run.
 *
 * `R10` is enum-only: `[VERIFIED] No R10 rose-gold-10K exists anywhere in the
 * evidence` (SoT §4). Its row completes the authoritative enum with the
 * pattern-consistent pair ('Rose Gold 10K' / '10k-rose-gold') and is marked
 * INFERRED — never presented as observed (plan note; INV-07 honesty).
 *
 * Intensity and clarity VALUES are observed (taxonomy.json, MANIFEST entry
 * 7); their `rank` ordering is a merchandising decision we make — recorded in
 * DECISIONS.md — while the value rows stay OBSERVED.
 *
 * Treatments: doc 11 "Only the three observed values are seeded"; the
 * schema enum keeps all 8 members (IRRADIATION, FRACTURE_FILL, OIL, OTHER,
 * UNKNOWN exist so the model can say 'not recorded' without lying, and get
 * no rows yet).
 */
import type { JewelleryType, MetalCode } from '@maihan/domain';

// ---------------------------------------------------------------------------
// METALS — 15 rows = the full metal_code enum.
// ---------------------------------------------------------------------------

export interface MetalSeedRow {
  readonly code: MetalCode;
  readonly label: string;
  readonly purityLabel: string;
  readonly purityValue: string; // NUMERIC(5,2) as decimal string; never a float
  readonly colour: 'yellow' | 'white' | 'rose' | 'platinum' | 'silver';
  readonly isTwoTone: boolean;
  readonly secondaryColour: 'yellow' | 'white' | null;
  readonly slugPhrase: string;
  readonly sortOrder: number;
  readonly evidenceStatus: 'OBSERVED' | 'INFERRED';
}

/**
 * All 14 observed rows: labels from the SoT §4 metals table (verbatim
 * display text), slug phrases from the observed URL tokens (1:1, verified),
 * purity from the displayed metal (10K/14K/18K/950/925). Two-tone codes
 * carry the observed 'Yellow/White' order — the first token is the primary
 * colour. `sort_order` ranks by the observed URL counts descending (SoT §4),
 * R10 (enum-only, 0 URLs) last.
 */
export const METAL_SEED: readonly MetalSeedRow[] = Object.freeze([
  { code: 'Y18',  label: 'Yellow Gold 18K',   purityLabel: '18K', purityValue: '18.00',    colour: 'yellow',   isTwoTone: false, secondaryColour: null,    slugPhrase: '18k-yellow-gold',  sortOrder: 1,  evidenceStatus: 'OBSERVED' },
  { code: 'Y14',  label: 'Yellow Gold 14K',   purityLabel: '14K', purityValue: '14.00',    colour: 'yellow',   isTwoTone: false, secondaryColour: null,    slugPhrase: '14k-yellow-gold',  sortOrder: 2,  evidenceStatus: 'OBSERVED' },
  { code: 'W18',  label: 'White Gold 18K',    purityLabel: '18K', purityValue: '18.00',    colour: 'white',    isTwoTone: false, secondaryColour: null,    slugPhrase: '18k-white-gold',   sortOrder: 3,  evidenceStatus: 'OBSERVED' },
  { code: 'W14',  label: 'White Gold 14K',    purityLabel: '14K', purityValue: '14.00',    colour: 'white',    isTwoTone: false, secondaryColour: null,    slugPhrase: '14k-white-gold',   sortOrder: 4,  evidenceStatus: 'OBSERVED' },
  { code: 'PT',   label: 'Platinum 950',      purityLabel: '950', purityValue: '950.00',   colour: 'platinum', isTwoTone: false, secondaryColour: null,    slugPhrase: 'platinum-950',     sortOrder: 5,  evidenceStatus: 'OBSERVED' },
  { code: 'R14',  label: 'Rose Gold 14K',     purityLabel: '14K', purityValue: '14.00',    colour: 'rose',     isTwoTone: false, secondaryColour: null,    slugPhrase: '14k-rose-gold',    sortOrder: 6,  evidenceStatus: 'OBSERVED' },
  { code: 'W10',  label: 'White Gold 10K',    purityLabel: '10K', purityValue: '10.00',    colour: 'white',    isTwoTone: false, secondaryColour: null,    slugPhrase: '10k-white-gold',   sortOrder: 7,  evidenceStatus: 'OBSERVED' },
  { code: 'Y10',  label: 'Yellow Gold 10K',   purityLabel: '10K', purityValue: '10.00',    colour: 'yellow',   isTwoTone: false, secondaryColour: null,    slugPhrase: '10k-yellow-gold',  sortOrder: 8,  evidenceStatus: 'OBSERVED' },
  { code: 'R18',  label: 'Rose Gold 18K',     purityLabel: '18K', purityValue: '18.00',    colour: 'rose',     isTwoTone: false, secondaryColour: null,    slugPhrase: '18k-rose-gold',    sortOrder: 9,  evidenceStatus: 'OBSERVED' },
  { code: 'SL',   label: 'Sterling Silver',   purityLabel: '925', purityValue: '925.00',   colour: 'silver',   isTwoTone: false, secondaryColour: null,    slugPhrase: 'silver',           sortOrder: 10, evidenceStatus: 'OBSERVED' },
  { code: 'YW14', label: 'Yellow/White 14K',  purityLabel: '14K', purityValue: '14.00',    colour: 'yellow',   isTwoTone: true,  secondaryColour: 'white', slugPhrase: '14k-yellow-white', sortOrder: 11, evidenceStatus: 'OBSERVED' },
  { code: 'YW18', label: 'Yellow/White 18K',  purityLabel: '18K', purityValue: '18.00',    colour: 'yellow',   isTwoTone: true,  secondaryColour: 'white', slugPhrase: '18k-yellow-white', sortOrder: 12, evidenceStatus: 'OBSERVED' },
  { code: 'WY18', label: 'White/Yellow 18K',  purityLabel: '18K', purityValue: '18.00',    colour: 'white',    isTwoTone: true,  secondaryColour: 'yellow', slugPhrase: '18k-white-yellow', sortOrder: 13, evidenceStatus: 'OBSERVED' },
  { code: 'WY14', label: 'White/Yellow 14K',  purityLabel: '14K', purityValue: '14.00',    colour: 'white',    isTwoTone: true,  secondaryColour: 'yellow', slugPhrase: '14k-white-yellow', sortOrder: 14, evidenceStatus: 'OBSERVED' },
  // Enum-only member (SoT §4: no R10 exists anywhere in the evidence).
  // Completes the authoritative enum; INFERRED, never presented as observed.
  { code: 'R10',  label: 'Rose Gold 10K',     purityLabel: '10K', purityValue: '10.00',    colour: 'rose',     isTwoTone: false, secondaryColour: null,    slugPhrase: '10k-rose-gold',    sortOrder: 15, evidenceStatus: 'INFERRED' },
]);

// ---------------------------------------------------------------------------
// JEWELLERY TYPES — 8 rows = the full jewellery_type enum.
// ---------------------------------------------------------------------------

export interface JewelleryTypeSeedRow {
  readonly code: JewelleryType;
  readonly label: string;
  readonly slug: string;
  /** INV-02: a pair may attach only to EARRINGS. */
  readonly usesPair: boolean;
  /** INV-03 evidence scope: a single stone attaches to RING, PENDANT, NECKLACE, BRACELET. */
  readonly usesSingle: boolean;
  readonly evidenceStatus: 'OBSERVED' | 'EXTRACTED' | 'INFERRED';
}

/**
 * SoT §8.5 seed comment verbatim: "Seed from evidence: EARRINGS.uses_pair =
 * true; RING, PENDANT, NECKLACE, BRACELET.uses_single = true". BROOCH,
 * CUFFLINKS and CHARM are enum members with no observed category (the same
 * status R10 has among metals): inserted, INFERRED, both flags false.
 */
export const JEWELLERY_TYPE_SEED: readonly JewelleryTypeSeedRow[] = Object.freeze([
  { code: 'RING',      label: 'Ring',      slug: 'ring',      usesPair: false, usesSingle: true,  evidenceStatus: 'EXTRACTED' },
  { code: 'EARRINGS',  label: 'Earrings',  slug: 'earrings',  usesPair: true,  usesSingle: false, evidenceStatus: 'EXTRACTED' },
  { code: 'PENDANT',   label: 'Pendant',   slug: 'pendant',   usesPair: false, usesSingle: true,  evidenceStatus: 'EXTRACTED' },
  { code: 'NECKLACE',  label: 'Necklace',  slug: 'necklace',  usesPair: false, usesSingle: true,  evidenceStatus: 'EXTRACTED' },
  { code: 'BRACELET',  label: 'Bracelet',  slug: 'bracelet',  usesPair: false, usesSingle: true,  evidenceStatus: 'OBSERVED' },
  { code: 'BROOCH',    label: 'Brooch',    slug: 'brooch',    usesPair: false, usesSingle: false, evidenceStatus: 'INFERRED' },
  { code: 'CUFFLINKS', label: 'Cufflinks', slug: 'cufflinks', usesPair: false, usesSingle: false, evidenceStatus: 'INFERRED' },
  { code: 'CHARM',     label: 'Charm',     slug: 'charm',     usesPair: false, usesSingle: false, evidenceStatus: 'INFERRED' },
]);

// ---------------------------------------------------------------------------
// SETTING STYLES — 22 observed slugs (SoT §4 "22 slugs, 18 conceptual
// families"). Counts reconciled exactly during Task 9 preparation: the 15
// base styles sum to 9,500 settings routes and the 7 pendant-setting
// variants to 1,272; 9,500 + 1,272 = 10,772 = every
// `/gemstone-*-settings/` URL. The style slug is the design token of the
// settings slug; the pendant variants are distinct slugs of the same
// conceptual family ('pave' vs 'pave-pendant').
// ---------------------------------------------------------------------------

export interface SettingStyleSeedRow {
  readonly code: string; // snake_case, e.g. 'three_stone' (schema comment example)
  readonly label: string;
  readonly slug: string;
  /** Observed settings routes carrying this style token (extraction, MANIFEST entry 2). */
  readonly observedRoutes: number;
  readonly evidenceStatus: 'EXTRACTED';
}

export const SETTING_STYLE_SEED: readonly SettingStyleSeedRow[] = Object.freeze([
  { code: 'pave',                 label: 'Pave',                 slug: 'pave',                 observedRoutes: 2593, evidenceStatus: 'EXTRACTED' },
  { code: 'three_stone',          label: 'Three Stone',          slug: 'three-stone',          observedRoutes: 2628, evidenceStatus: 'EXTRACTED' },
  { code: 'accent_stones',        label: 'Accent Stones',        slug: 'accent-stones',        observedRoutes: 1488, evidenceStatus: 'EXTRACTED' },
  { code: 'vedic',                label: 'Vedic',                slug: 'vedic',                observedRoutes: 860,  evidenceStatus: 'EXTRACTED' },
  { code: 'solitaire',            label: 'Solitaire',            slug: 'solitaire',            observedRoutes: 542,  evidenceStatus: 'EXTRACTED' },
  { code: 'halo',                 label: 'Halo',                 slug: 'halo',                 observedRoutes: 472,  evidenceStatus: 'EXTRACTED' },
  { code: 'wedding_set',          label: 'Wedding Set',          slug: 'wedding-set',          observedRoutes: 196,  evidenceStatus: 'EXTRACTED' },
  { code: 'antique',              label: 'Antique',              slug: 'antique',              observedRoutes: 161,  evidenceStatus: 'EXTRACTED' },
  { code: 'bezel',                label: 'Bezel',                slug: 'bezel',                observedRoutes: 149,  evidenceStatus: 'EXTRACTED' },
  { code: 'studs',                label: 'Studs',                slug: 'studs',                observedRoutes: 146,  evidenceStatus: 'EXTRACTED' },
  { code: 'mens',                 label: 'Mens',                 slug: 'mens',                 observedRoutes: 112,  evidenceStatus: 'EXTRACTED' },
  { code: 'floral',               label: 'Floral',               slug: 'floral',               observedRoutes: 65,   evidenceStatus: 'EXTRACTED' },
  { code: 'celtic',               label: 'Celtic',               slug: 'celtic',               observedRoutes: 52,   evidenceStatus: 'EXTRACTED' },
  { code: 'drops',                label: 'Drops',                slug: 'drops',                observedRoutes: 22,   evidenceStatus: 'EXTRACTED' },
  { code: 'flush_set',            label: 'Flush Set',            slug: 'flush-set',            observedRoutes: 14,   evidenceStatus: 'EXTRACTED' },
  { code: 'pave_pendant',         label: 'Pave Pendant',         slug: 'pave-pendant',         observedRoutes: 434,  evidenceStatus: 'EXTRACTED' },
  { code: 'accent_stones_pendant', label: 'Accent Stones Pendant', slug: 'accent-stones-pendant', observedRoutes: 292, evidenceStatus: 'EXTRACTED' },
  { code: 'solitaire_pendant',    label: 'Solitaire Pendant',    slug: 'solitaire-pendant',    observedRoutes: 206,  evidenceStatus: 'EXTRACTED' },
  { code: 'halo_pendant',         label: 'Halo Pendant',         slug: 'halo-pendant',         observedRoutes: 143,  evidenceStatus: 'EXTRACTED' },
  { code: 'vedic_pendant',        label: 'Vedic Pendant',        slug: 'vedic-pendant',        observedRoutes: 106,  evidenceStatus: 'EXTRACTED' },
  { code: 'bezel_pendant',        label: 'Bezel Pendant',        slug: 'bezel-pendant',        observedRoutes: 55,   evidenceStatus: 'EXTRACTED' },
  { code: 'antique_pendant',      label: 'Antique Pendant',      slug: 'antique-pendant',      observedRoutes: 36,   evidenceStatus: 'EXTRACTED' },
]);

// ---------------------------------------------------------------------------
// TREATMENTS — the 3 observed values only (doc 11). requires_disclosure=true
// for all three (doc 11 verbatim). price_impact stays the schema default 0:
// no per-treatment merchandising hint is evidenced, and inventing one is
// out of scope.
// ---------------------------------------------------------------------------

export interface TreatmentSeedRow {
  readonly code: string; // treatment_code enum member
  readonly label: string;
  readonly observedCount: number;
}

export const TREATMENT_SEED: readonly TreatmentSeedRow[] = Object.freeze([
  { code: 'NO_ENHANCEMENT',        label: 'No Enhancement',        observedCount: 560 },  // 510 + 50 doubled (D9)
  { code: 'HEAT_TREATED',          label: 'Heat Treated',          observedCount: 423 },  // 401 + 22 doubled (D9)
  { code: 'VAPOR_INFUSED_COATING', label: 'Vapor-Infused Coating', observedCount: 41 },   // doubled form only
]);

/** Every verbatim source string, including the doubled D9 forms (doc 11). */
export const TREATMENT_LABEL_SEED: readonly { readonly treatmentCode: string; readonly rawLabel: string; readonly tokenCount: number }[] = Object.freeze([
  { treatmentCode: 'NO_ENHANCEMENT',        rawLabel: 'No Enhancement',                                             tokenCount: 1 },
  { treatmentCode: 'NO_ENHANCEMENT',        rawLabel: 'No Enhancement No Enhancement',                              tokenCount: 2 },
  { treatmentCode: 'HEAT_TREATED',          rawLabel: 'Heat Treated',                                               tokenCount: 1 },
  { treatmentCode: 'HEAT_TREATED',          rawLabel: 'Heat Treated Heat Treated',                                  tokenCount: 2 },
  { treatmentCode: 'VAPOR_INFUSED_COATING', rawLabel: 'Vapor-Infused Coating Vapor-Infused Coating',                 tokenCount: 2 },
]);

// ---------------------------------------------------------------------------
// COLOUR INTENSITIES — 5 observed values (taxonomy.json color_intensity_help;
// doubled D9 forms 'Medium Medium' 67, 'Vivid Vivid' 28, 'Light Light' 18
// normalise away). Doc 11's inline list ("Medium, Pale, Vivid, Deep, Light")
// contradicts its own cited artifact; the artifact wins. The `rank` ordering
// is our merchandising decision (GIA-style saturation ascent), recorded in
// DECISIONS.md; the rows stay OBSERVED.
// ---------------------------------------------------------------------------

export interface ColourIntensitySeedRow {
  readonly code: string;
  readonly name: string;
  readonly rank: number;
  readonly observedCount: number;
}

export const COLOUR_INTENSITY_SEED: readonly ColourIntensitySeedRow[] = Object.freeze([
  { code: 'light',   name: 'Light',   rank: 1, observedCount: 103 }, // 85 + 18 doubled (D9)
  { code: 'medium',  name: 'Medium',  rank: 2, observedCount: 446 }, // 379 + 67 doubled (D9)
  { code: 'intense', name: 'Intense', rank: 3, observedCount: 380 },
  { code: 'vivid',   name: 'Vivid',   rank: 4, observedCount: 92 },  // 64 + 28 doubled (D9)
  { code: 'dark',    name: 'Dark',    rank: 5, observedCount: 3 },
]);

// ---------------------------------------------------------------------------
// CLARITIES — 5 observed values + the 7 verbatim labels (clearly_label D9
// detection lives in clarity_labels: token_count drives is_doubled).
// rank 1 = cleanest (our ordering, recorded in DECISIONS.md); is_eye_clean
// carries only the 'Eye Clean' trade term, verbatim.
// ---------------------------------------------------------------------------

export interface ClaritySeedRow {
  readonly code: string;
  readonly label: string;
  readonly rank: number;
  readonly isEyeClean: boolean;
  readonly observedCount: number;
}

export const CLARITY_SEED: readonly ClaritySeedRow[] = Object.freeze([
  { code: 'eye_clean',                    label: 'Eye Clean',                    rank: 1, isEyeClean: true,  observedCount: 182 }, // 154 + 28 doubled (D9)
  { code: 'very_very_slightly_included',  label: 'Very Very Slightly Included',  rank: 2, isEyeClean: false, observedCount: 53 },
  { code: 'very_slightly_included',       label: 'Very Slightly Included',       rank: 3, isEyeClean: false, observedCount: 662 }, // 577 + 85 doubled (D9)
  { code: 'slightly_included',            label: 'Slightly Included',            rank: 4, isEyeClean: false, observedCount: 101 },
  { code: 'included',                     label: 'Included',                     rank: 5, isEyeClean: false, observedCount: 26 },
]);

export const CLARITY_LABEL_SEED: readonly { readonly clarityCode: string; readonly rawLabel: string; readonly isDoubled: boolean; readonly tokenCount: number }[] = Object.freeze([
  { clarityCode: 'eye_clean',                   rawLabel: 'Eye Clean',                                   isDoubled: false, tokenCount: 1 },
  { clarityCode: 'very_very_slightly_included', rawLabel: 'Very Very Slightly Included',                 isDoubled: false, tokenCount: 1 },
  { clarityCode: 'very_slightly_included',      rawLabel: 'Very Slightly Included',                      isDoubled: false, tokenCount: 1 },
  { clarityCode: 'slightly_included',           rawLabel: 'Slightly Included',                           isDoubled: false, tokenCount: 1 },
  { clarityCode: 'included',                    rawLabel: 'Included',                                    isDoubled: false, tokenCount: 1 },
  { clarityCode: 'eye_clean',                   rawLabel: 'Eye Clean Eye Clean',                         isDoubled: true,  tokenCount: 2 },
  { clarityCode: 'very_slightly_included',      rawLabel: 'Very Slightly Included Very Slightly Included', isDoubled: true,  tokenCount: 2 },
]);

// ---------------------------------------------------------------------------

/** The expected logical row counts after a seed run (plan task 9 assertion). */
export const EXPECTED_REFERENCE_COUNTS = Object.freeze({
  metals: 15,
  jewelleryTypes: 8,
  settingStyles: 22,
  treatments: 3,
  treatmentLabels: 5,
  colourIntensities: 5,
  clarities: 5,
  clarityLabels: 7,
} as const);
