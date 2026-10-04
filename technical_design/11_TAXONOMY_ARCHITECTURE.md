# 11 TAXONOMY ARCHITECTURE

**Package:** `technical_design/` doc 11 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 4.2, 8.5, 13.1, 14.3, 33.2.
**Evidence status:** `[OBSERVED]`/`[VERIFIED]` for reference values; `[INFERRED]` for structure.

---

## Purpose

Define the reference data that drives facets, landing pages, navigation and search, and the rules that keep it data-driven rather than hard-coded.

## Reference entities

| Table | Rows (observed) | Tag | Derivation |
|---|---:|---|---|
| `gemstone_species` | ~25 `[INFERRED]` | - | Variety slug suffix; no source table exists |
| `gemstone_varieties` | **145** | `[VERIFIED]` | 1st path segment across stone URLs |
| `gemstone_colours` | **60+** | `[VERIFIED]` | 60 colour routes plus slug colour tokens |
| `colour_intensities` | ~5 | `[OBSERVED]` | `color_intensity_help` values |
| `gemstone_origins` | ~20 | `[EXTRACTED]` | `origin_help` plus adjectival slug tokens |
| `treatments` | 3 structured + 1 unknown | `[OBSERVED]` | `enhancements_help` |
| `clarities` | 5 | `[OBSERVED]` | `clarity_help` |
| `metals` | **15** | `[VERIFIED]` | SKU metal codes, 1:1 with slug phrases |
| `setting_styles` | 18 families (22 slugs) | `[VERIFIED]` | Settings slug design token |
| `jewellery_types` | 8 | `[VERIFIED]` | slug and product-name tokens |

## Varieties

`[VERIFIED]` 145 distinct variety route slugs. Observed families include `tsavorite-garnet` (171 products), `green-tourmaline` (137), `purple-spinel` (129), `blue-aquamarine` (63), `blue-zircon` (63), `purple-amethyst` (58), `pink-topaz` (41), `chrome-diopside` (22), `paraiba-tourmaline`, `sphene-titanite`, `padparadscha`, `chrysoberyl`, `peridot`, `grossular-garnet`, plus organic varieties (`akoya-pearl`, `south-sea-pearl`, `tahitian-pearl`, `coral`, `cortex`).

`[OBSERVED]` Compound slugs encode variety plus synonym: `tsavorite-garnet` (Tsavorite is a green grossular garnet), `paraiba-tourmaline`, `sphene-titanite` (titanite is a synonym), `black-opal-dark-opal`, `fire-opal-flame-opal`, `boulder-opal-ironstone-opal`, `crystal-opal-jelly-opal`, `white-opal-light-opal`, `bloodstone-heliotrope`.

Synonyms are **not** modelled as separate varieties. They are rows in the synonym map used by search (doc 12) with `variety_id` pointing at the canonical variety. This prevents facet inflation.

`is_organic` distinguishes pearls, coral and opal `[OBSERVED]` from mineral varieties; it affects care guidance and search grouping.

## Colours

`[VERIFIED]` 60 colour categories, including compound and trade modifiers:

```
bi-color, black, blue, bluish-green, bluish-grey, bluish-purple, brown,
brownish-green, brownish-orange, brownish-red, brownish-yellow,
color-change, electric-blue, golden, golden-brown, golden-brownish-green,
golden-orange, golden-yellow, green, greenish-blue, greenish-brown,
greenish-yellow, grey, greyish-blue, multi-color, olive-green, orange,
orangish-brown, orangish-pink, orangish-red, orangish-yellow, padparadscha,
peach, pink, pinkish-brown, pinkish-orange, pinkish-purple, pinkish-red,
purplish-blue, purplish-pink, purplish-red, rainbow, red, reddish-brown,
reddish-orange, reddish-pink, reddish-purple, salmon-and-white, sky-blue,
swiss-blue, violet, watermelon, white, yellow, yellowish-brown,
yellowish-green, yellowish-orange
```

`[OBSERVED]` Modifier prefixes are systematic: `bluish-`, `greenish-`, `brownish-`, `orangish-`, `pinkish-`, `purplish-`, `reddish-`, `yellowish-`, `greyish-`. Stored in `gemstone_colours.modifier` with `parent_id` self-reference, so `bluish-green` rolls up to `green` for disjunctive faceting.

`padparadscha`, `swiss-blue`, `electric-blue` are trade names, not modifiers. They are rows with `modifier = NULL`.

Intensity is a separate ordered dimension (`colour_intensities.rank` 1-5): `[OBSERVED]` `Medium`, `Pale`, `Vivid`, `Deep`, `Light`. Rank enables a sensible default sort rather than alphabetical.

## Origins

`[OBSERVED]` Structured values: Tanzania 266, Mozambique 243, Brazil 164, Cambodia 106, Ceylon (Sri Lanka) 63, Madagascar 43, Pakistan 26, Nigeria 22.
`[EXTRACTED]` Adjectival forms in loose-stone slugs: `brazilian`, `namibia`, `madagascar`, `russian`, `united-states`, `australian`, `pakistani`, `ceylon-sri-lankan`, `madagascar`.

Rule: adjectives map to a country with `country_code`; the raw adjectival slug is preserved in the staging record. `Ceylon (Sri Lanka)` and `ceylon-sri-lankan` are the same origin; the synonym map unifies them for search.

## Treatments

`[OBSERVED]` `No Enhancement` 510, `Heat Treated` 401, `Vapor-Infused Coating` 41.

`requires_disclosure = true` for all three. `price_impact` is a merchandising hint in the range -2..+2 and is **never** used to rank or filter a treatment out; see doc 12. `treatment_labels` stores every verbatim source string, including the doubled D9 forms.

`[INFERRED]` Additional enum members (`IRRADIATION`, `FRACTURE_FILL`, `OIL`, `UNKNOWN`) exist in the schema to accommodate future data and to give the model a way to say "not recorded" without lying. Only the three observed values are seeded.

## Metals

`[VERIFIED]` 15 codes. `purity_label` (`14K`, `18K`, `10K`, `950`, `925`), `colour`, `is_two_tone`, `secondary_colour`, and `slug_phrase` for URL generation. `R10` is defined in the enum for completeness but has no observed data and is not seeded.

## Setting styles

`[VERIFIED]` 18 conceptual families from 22 slug variants (pendant variants are the same family with a different jewellery type):

```
three-stone 2,628 | pave 2,593 | accent-stones 1,488 | vedic 860 |
solitaire 542 | halo 472 | wedding-set 196 | antique 161 | bezel 149 |
studs 146 | mens 112 | floral 65 | celtic 52 | drops 22 | flush-set 14
```

`[OBSERVED]` `vedic` (860 settings) is a genuine commercial vertical alongside `/education/ruby-history/rubies-jyotisha-vedic-astrology`. It is modelled as a first-class style plus a content vertical, not as a special case.

`side_stone_count` on `settings` is populated only where the style implies it (`accent-stones`, `three-stone`). The source contains **no** side-stone catalogue; `entities/side_stones/all_side_stones.json` is `[]`.

## Jewellery types

8 enum members. `uses_pair` and `uses_single` are the machine-readable form of INV-02 and INV-03, seeded from the verified evidence:

```
EARRINGS      uses_pair = true
RING, PENDANT, NECKLACE, BRACELET   uses_single = true
```

## Landing pages

Generated, not authored. `/{variety}`, `/{variety}-pairs`, `/{variety}-rings` and `/{colour}-gemstones` all resolve through the taxonomy, from one template each. `[VERIFIED]` The source has 145 variety triplets plus 60 colour routes; 400+ hand-authored pages would be unmaintainable and would violate the data-driven principle.

Each landing page carries `seo_metadata` (own entity) separate from content (`pages` with blocks), because SEO changes on a different cadence and a different authorisation path than editorial content.

## Caching

`taxonomy:varieties`, `taxonomy:facets`, `taxonomy:colors` at 1 hour with stale-while-revalidate, invalidated by an admin taxonomy write. Facet **definitions** are cached; facet **counts** are per-query and cached 300s with a generation bump (doc 25).

## Validation rules

1. Every `variety_id`, `colour_id`, `origin_id`, `treatment_id`, `clarity_id`, `metal_code`, `style_id` on a canonical row must resolve.
2. `colour_intensities.rank` must be unique per intensity.
3. A variety slug must be unique and must match `^[a-z0-9]+(-[a-z0-9]+)*$`.
4. `settings.style_id` must resolve; `jewellery_type` must resolve.
5. A colour with a `modifier` must have a `parent_id`.
6. Unresolvable references quarantine the row; they never create a placeholder reference row silently.

## Error handling

| Code | Meaning |
|---|---|
| `VARIETY_NOT_FOUND` | Unknown slug |
| `COLOUR_NOT_FOUND` | Unknown colour slug |
| `TAXONOMY_REFERENCE_UNRESOLVED` | A catalogue row points at a missing reference; quarantined |
| `TAXONOMY_SLUG_CONFLICT` | Duplicate slug on import |

## Security boundaries

Taxonomy is public reference data with no PII. Admin taxonomy writes require `CATALOG_MANAGER` or `CONTENT_PUBLISHER` and are audited. Deletion is soft (`deleted_at`) so existing catalogue rows keep resolving; a hard delete that would orphan a catalogue row is refused.

## Observability

Metrics: unresolved reference count by type, quarantine count by reason, taxonomy cache hit rate, facet computation duration. No slug in metric labels.

## Testing requirements

| Test | Proves |
|---|---|
| Variety seed coverage | All 145 observed slugs present |
| Colour seed coverage | All 60 observed colour routes present |
| Metal mapping | 15 codes, 1:1 with slug phrases |
| Reference resolution | Every catalogue FK resolves after import |
| Modifier roll-up | `bluish-green` rolls up to `green` |
| Landing-page render | Every variety and colour route renders from one template |
| No hard-coded taxonomy | Lint forbids variety slugs in `components/` |

## Failure modes

| Failure | Response |
|---|---|
| Unresolvable reference | Row quarantined, counted, surfaced in the migration console |
| Facet count drift from result set | Facet-consistency test fails |
| Missing variety | Catalogue-completeness test fails |
| Duplicate slug | Import halts; `staging_conflicts` records it |

## Implementation constraints

1. Taxonomy is data. No component or query may branch on a variety, colour or origin name.
2. Synonyms never become separate varieties.
3. Treatment is never filtered out or demoted for ranking.
4. Landing pages are generated from one template per family.

## Evidence status

`[OBSERVED]`/`[VERIFIED]` for every value and count. `gemstone_species` is `[INFERRED]` because the source contains no species data; grouping is derived from variety suffixes and must be curated. `treatment_code` members beyond the three observed are `[INFERRED / PROPOSED]`.