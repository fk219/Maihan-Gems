# PROJECT_SOURCE_OF_TRUTH

## Natural Gemstones -> Maihan Gems Rebuild

**Document status:** Implementation baseline. For all implementation questions this document supersedes `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md`; that document remains authoritative for product vision and charter.
**Location:** project root.
**Purpose:** single durable reference that stays valid after `naturalgemstones/` is archived or removed.
**Evidence base:** direct inspection of `naturalgemstones/naturalgemstones_dump/` (46,811 files / 2.93 GB), including live read-only queries against `crawler.sqlite` and full scans of every JSONL dataset.
**Prepared:** 2026-10-04.

---

## 0. HOW TO READ THIS DOCUMENT

Every factual claim carries an evidence tag. The tag is part of the claim.

| Tag | Meaning |
|---|---|
| `[OBSERVED]` | Directly present in the supplied evidence. Reproducible by reading the cited artifact. |
| `[EXTRACTED]` | Deterministically derived from observed evidence by a stated, repeatable transform. |
| `[PATTERN]` | Repeated structure across many observed records. Correlation only. |
| `[INFERRED]` | A design decision made for the target system. Not a claim about the source. |
| `[UNKNOWN]` | Evidence is insufficient. Must not be implemented as fact. |

Additional notation:

- **`[INFERRED / PROPOSED]`** - used where the target replaces an `[UNKNOWN]` with a chosen behaviour.
- **`[VERIFIED]`** - I recomputed the claim from the raw dataset during this analysis and it matched exactly. The count and method are always stated.
- **`[DEFECT]`** - a factual error or contradiction inside the supplied reverse-engineering package. Collected in section 4.4.

The single most important rule in this project:

> Never promote `[UNKNOWN]` to fact. Never promote `[INFERRED]` to `[OBSERVED]`. Every architectural decision must be traceable to evidence, an explicit business requirement, or a security/integrity constraint.

---

## 1. PROJECT VISION

Maihan Gems is a production gemstone and fine-jewelry commerce platform. It sells four structurally different things, and the platform must model each as a distinct domain concept rather than flattening them into a generic `Product` row:

1. **Loose gemstones** - individually identified, individually priced natural stones with origin, treatment, clarity, cut and dimensions.
2. **Gemstone pairs** - two matched stones sold as a lot, used for earrings.
3. **Jewelry settings** - reusable, sellable mounts in a specific metal, with no stone attached.
4. **Configured jewelry** - a setting instantiated with a specific stone or pair. This is the "Design Your Own" (DYO) output.

On top of that catalogue sits the intelligence layer: structured gemstone knowledge, an AI concierge with hard safety rails, certificate OCR with human review, a WhatsApp concierge sharing the same brain, and WebAR try-on.

The rebuild is **not** a visual clone. It reconstructs the observed domain and information architecture while replacing the underlying architecture with something maintainable, searchable, observable and safe.

### 1.1 The single most consequential architectural fact

`[VERIFIED][OBSERVED]` **The source "product" catalog is not 1,245 independent products. It is a materialized cross-product of a settings catalog and a gemstone inventory.**

Decoded SKU grammar:

```
SETTING SKU    JS<design><metalCode>                e.g. JS1016W10, JS1427Y18, JS1169SL
DYO SKU        JS<design><metalCode>-<gemRef>       e.g. JS1383R14-PR5681, JS1150W14-K1324
READY-MADE SKU J<digits>                            e.g. J10347, J11402
GEMSTONE       K<digits>     (single stone)         e.g. K1324, K32255
GEMSTONE PAIR  PR<digits>    (matched pair)         e.g. PR5681, PR14703
```

`[VERIFIED][OBSERVED]` Decomposition of the 1,024 captured DYO SKUs:

| Dimension | Distinct values |
|---|---|
| Setting design cores (`JS` + digits) | 105 |
| Metal codes | 11 (of 14 present site-wide) |
| Gemstone references | 35 |
| Realised `(design, metal)` setting variants | 683 |
| Full theoretical cross-product | 105 x 11 x 35 = 40,425 |
| Actually realised SKUs | 1,024 (2.5% of the cross-product) |

`[VERIFIED][OBSERVED]` Site-wide: the 10,772 setting listing URLs encode **951 setting design cores** and **10,349 distinct `(design, metal)` setting SKUs**, with **0 of 10,772 failing the SKU parse**. Every `(design, metal)` pair appearing in the 1,024 captured DYO SKUs also exists among those 10,349 setting SKUs. The DYO set is a strict subset of the setting catalog.

Distinct `(design, metal)` pairs by metal code, summing to 10,349:

| `PT` | `R14` | `R18` | `SL` | `W10` | `W14` | `W18` |
|---:|---:|---:|---:|---:|---:|---:|
| 924 | 915 | 554 | **865** | 859 | 950 | 928 |

| `WY14` | `WY18` | `Y10` | `Y14` | `Y18` | `YW14` | `YW18` |
|---:|---:|---:|---:|---:|---:|---:|
| 360 | 360 | 857 | 950 | 930 | 455 | 442 |

**Correction applied during Phase 0 validation.** An earlier revision of this document stated **9,484**. That figure was wrong: the parser used at the time did not match the `SL` (Sterling Silver) suffix, so all 865 silver setting SKUs were silently excluded. `10,349 - 865 = 9,484`, which is exactly the discrepancy. The corrected figure is `[VERIFIED]` against a full re-parse of `urls.jsonl` with all 15 `metal_code` enum members.

**Architectural consequence:** `setting_variants` is the authoritative reusable parent. A DYO product is a *configuration* referencing one setting-variant plus one gemstone or pair - not an independent row of duplicated catalog data. Modelling the source the way `data/database_blueprint.json` implies (one flat `products` table) would create a 40,425-row phantom matrix and destroy the ability to answer "which stones fit this setting".

---

## 2. DISTINGUISHING SAUCE

Ten capabilities, each a first-class domain rather than a plugin:

1. Structured gemstone intelligence
2. AI gemstone concierge
3. Design Your Own intelligence
4. Certificate OCR and verification workflow
5. WhatsApp AI concierge
6. WebAR virtual try-on
7. Semantic and structured product discovery
8. Source-grounded product knowledge
9. Human concierge escalation
10. Strict AI safety and commerce guardrails

**What makes these possible is the fact in section 1.1.** Because the source encodes composition deterministically in the SKU, the platform can expose a genuine configuration engine (choose stone -> see compatible settings -> choose metal -> priced quote -> cart) instead of 9,812 near-duplicate product pages. DYO is the natural spine of the catalog, not a bolt-on.

---

## 3. EVIDENCE HIERARCHY

```
OBSERVED  >  EXTRACTED  >  PATTERN  >  INFERRED  >  UNKNOWN
```

- **OBSERVED** - present in captured source HTML, `crawler.sqlite`, or a source record. Cited by artifact and field.
- **EXTRACTED** - deterministically structured from observed evidence. The transform is stated so it can be re-run and audited.
- **PATTERN** - structure recurring across many records. Correlation, never causation.
- **INFERRED** - a target-system design decision. Labelled at every point of use.
- **UNKNOWN** - insufficient evidence. Never implemented as fact.

### 3.1 The hierarchy in practice: three worked examples

**Example A - gemstone weight (promoted to OBSERVED-grade via EXTRACTION)**

- Source provides `specifications.weight = "2.87 Ct. 3.11 Ct."` and product name `"...5.98Ct.Tw. ..."`. That is OBSERVED as a raw string.
- Claim: this record describes two stones. EXTRACTED by tokenizing on `[\d.]+\s*Ct\.` -> 2 tokens; sum = 5.98; compare against the `Ct.Tw.` figure in the product name.
- `[VERIFIED]` Holds for **113 of 113** pair records, **0 mismatches**. The rule is therefore OBSERVED-grade for the pair family.
- For the 911 single-stone records the tokenizer returns 1 token and no `Ct.Tw.` appears. Consistent, but absence of a second token is weaker evidence than a positive match, so the single-stone reading stays `[EXTRACTED]`.

**Example B - SKU identity for the 221 records with no `product.sku`**

- `[OBSERVED]` 221 records have `sku = ""` in `crawler.sqlite` and `name = "JavaScript is disabled"`. `[VERIFIED]` all 221 are HTTP 502 responses of 121-2,528 bytes, so no attribute data exists for them. `[VERIFIED]` **0 of the 221 have any row in `specifications.jsonl`**, therefore `specifications.item_id` is absent for all 221 and cannot be used to establish identity.
- The URL slug of those records still ends in a token matching `js\d+<metal>-(k|pr)\d+`.
- `[VERIFIED][EXTRACTED]` Applying that regex to the 1,024 records that *do* carry a `product.sku` reproduces the stored SKU **1,024 / 1,024 times, 0 mismatches** (control re-run in Phase 0 to rule out a case-folding defect).
- `[VERIFIED]` All 221 slugs parse, yielding **221 distinct derived SKUs**.
- `[VERIFIED]` **All 221 derived SKUs are new. Zero collide with the observed 1,024.** They are therefore 221 additional distinct DYO products whose HTML fetch failed, not duplicate records. `[VERIFIED]` the 1,245 product URLs are all distinct.
- `[VERIFIED]` Independent corroboration, two sources:
  1. all 8 stone references appearing in the 221 (`K1161`, `K1173`, `K1175`, `K2198`, `K2199`, `K2209`, `K2478`, `K506`) also appear as distinct `K` references in the loose-stone URL inventory of 19,665 refs;
  2. all 168 distinct `(design, metal)` pairs in the 221 exist in the settings catalog of 10,349 pairs.
  Of the 8 stones, 5 (`K1161`, `K1173`, `K1175`, `K2478`, `K506`) also appear among the 35 stones referenced by the observed 1,024; **3 (`K2198`, `K2199`, `K2209`) are new stone identities** present only in this failed-fetch set. `[VERIFIED]` the 221 span 24 distinct setting cores.
- **Conclusion, and the evidence label.** Identity for the 221 is **`[INFERRED / PROPOSED]` with two-source corroboration** - not OBSERVED. The package rule *"do not manufacture SKU from URL strings"* is respected: no value is invented. A parser with measured precision of 1,024/1,024 is applied, and the result is stored in `source_sku_derived` with `sku_evidence_status = 'INFERRED'`, never in `source_sku`, and never promoted to a confirmed identifier without human review (INV-08). Attribute values (weight, dimensions, colour, treatment, price) for these 221 remain **`[UNKNOWN]`** and must be null until a re-fetch supplies them. They must not be inferred from the slug beyond the SKU token itself, nor inferred from a sibling product sharing the same stone.

**Example C - setting prices**

- `[OBSERVED]` `per_carat_price_help` exists (30 distinct values, `$10`-`$12,000`) and JSON-LD `offers.price` exists (`$1,074`-`$17,599`).
- `[VERIFIED][EXTRACTED]` `price == total_weight * price_per_carat` is true for **0 of 1,024** products. The ratio `price / (weight * per_carat)` has median **2.269** (min 1.091, max 268.745).
- Conclusion: total price is not a pure gem-value function; it contains a material, labour and margin component the captured data never exposes.
- Therefore the **gemstone** component is computable and the **setting/making** component is `[UNKNOWN]`. See section 26.

---

## 4. SOURCE EVIDENCE SUMMARY

### 4.1 What was inspected

| Artifact | Count | Notes |
|---|---:|---|
| `crawler.sqlite` | 282,586 rows / 10 tables | Queried live, read-only |
| `raw_html/` | 44,173 files | **1,024 usable; 43,149 are error shells** |
| `pages/` | 1,245 JSON | Per-page crawler output |
| `products/` | 1,245 JSON | Per-product crawler output |
| `exports/` | 5 files | CSV and JSONL mirrors |
| `data/pages.jsonl` | 44,173 | Page index |
| `data/pages_analyzed.jsonl` | 1,245 | Richest per-page record |
| `data/urls.jsonl` | 44,218 | URL inventory |
| `data/products.jsonl` | 1,245 | DYO products only |
| `data/specifications.jsonl` | 12,401 | 13 fields |
| `data/media.jsonl` | 241,961 | |
| `data/media_analyzed.jsonl` | 241,961 | DOM-derived |
| `data/relationships.jsonl` | 397,727 | 4 relationship types |
| `data/dyo_evidence.jsonl` | 1,245 | |
| `data/functional_signals.jsonl` | 4,220 | 5 signal groups |
| `data/page_links.jsonl` | 160,751 | |
| `data/source_relationships.jsonl` | - | |
| `data/route_patterns.json` | 594 patterns | Heuristic |
| `data/taxonomy.json` | 13 fields | Value distributions |
| `raw/source_snapshots/manifest.jsonl` | - | HTML hashes |
| `entities/**` | 41 files | **Mostly stale/broken - see 4.4** |
| `architecture/**` | 4 files | **Stale 30-URL sample** |
| `content/**`, `design_your_own/` | 0 files | **Empty** |

### 4.2 Observed source facts (verified)

**Catalog scale, derived from the full URL inventory `[EXTRACTED][VERIFIED]`:**

| Family | Route shape | URLs | Distinct entities | ID scheme |
|---|---|---:|---:|---|
| Loose gemstone | `/{variety}/{w}ct-{origin}-{shape}-{color}-{variety}-K#####` | 19,997 | 19,665 | `K3` .. `K32255` |
| Gemstone pair | `/{variety}-pairs/{w}ct-{origin}-{shape}-{variety}-pair-PR#####` | 3,077 | 3,072 | `PR5577` .. `PR15784` |
| Setting | `/{type}-settings/{metal}-{style}-{type}-setting-js####{code}` | 10,772 | 10,349 setting SKUs / 951 designs | `JS####` |
| DYO configured | `/design-your-own/review/{slug}` | 9,812 | 1,024 with captured SKU | `JS####{code}-{K or PR}` |
| Ready-made jewelry | `/{variety}-rings/{slug}-J#####` | 88 | 88 | `J#####` |
| Variety index | `/{variety}` | 191 | 145 variety slugs | - |
| Category index | `/{variety}-pairs`, `/{variety}-rings`, `/all-*`, `/gemstone-*` | 248 | 60 colour categories | - |
| Functional | cart / account / auth / education / etc. | 25 | - | - |

Total approximately 44,218. `[VERIFIED]` Loose-stone slug parse rate **19,666 / 19,666 = 100%**. Pair slug parse rate **3,077 / 3,077 = 100%**. The variety token is present in the slug in **19,666 / 19,666** cases.

**Gemstone identity is stable `[VERIFIED]`:** each of the 35 captured gemstone references has **exactly one** weight value and **exactly one** dimension set across all of its products. Zero unstable references. A gemstone reference is therefore a genuine physical-entity identity, and `gemstones` is a real table - roughly 35 rows in the captured DYO subset, roughly 22,737 rows expected site-wide.

**Pair semantics `[VERIFIED]`:** `PR` references appear **only** in earrings (113/113). `K` references appear only in ring (830), pendant (212), necklace (90). Zero exceptions. `[PATTERN]` promoted to an enforced invariant: *earrings consume a pair; other jewellery types consume a single stone.*

**Metals `[VERIFIED][OBSERVED]` - 14 codes, 1:1 with slug phrases, no ambiguity:**

| Code | Display | URLs | Code | Display | URLs |
|---|---|---:|---|---|---:|
| `y18` | Yellow Gold 18K | 2,400 | `r18` | Rose Gold 18K | 1,055 |
| `y14` | Yellow Gold 14K | 2,394 | `sl` | **Sterling Silver** | 1,042 |
| `w18` | White Gold 18K | 2,359 | `yw14` | Yellow/White 14K | 760 |
| `w14` | White Gold 14K | 2,357 | `yw18` | Yellow/White 18K | 740 |
| `pt` | **Platinum 950** | 2,207 | `wy18` | White/Yellow 18K | 540 |
| `r14` | Rose Gold 14K | 1,663 | `wy14` | White/Yellow 14K | 538 |
| `w10` | White Gold 10K | 1,266 | `y10` | Yellow Gold 10K | 1,263 |

`[VERIFIED]` No `R10` rose-gold-10K exists anywhere in the evidence. `[OBSERVED]` `sl` (Sterling Silver) and 10K gold appear **only** in settings, never in the 1,024 captured DYO products.

**Setting design styles `[EXTRACTED][VERIFIED]` - 22 slugs, 18 conceptual families:**
`three-stone` 2,628 / `pave` 2,593 / `accent-stones` 1,488 / `vedic` 860 / `solitaire` 542 / `halo` 472 / `wedding-set` 196 / `antique` 161 / `bezel` 149 / `studs` 146 / `mens` 112 / `floral` 65 / `celtic` 52 / `drops` 22 / `flush-set` 14, plus pendant-setting variants of pave / accent-stones / solitaire / halo / vedic / bezel / antique.

`[OBSERVED]` The `vedic` style (860 settings) together with `/education/ruby-history/rubies-jyotisha-vedic-astrology` confirms a real **astrology/Vedic positioning** content vertical. This is a genuine differentiator to preserve, not a generic jewellery site.

**Shapes `[EXTRACTED][VERIFIED]`:** oval 369 / round 273 / cushion 140 / emerald-cut 106 / pear 68 / radiant 44 / princess 25 from DYO slugs; loose-stone slugs additionally contain heart, trillion and asscher-octagon.

**Jewellery types `[EXTRACTED][VERIFIED]`:** ring 644 / pendant 192 / necklace 76 / earrings 113 from DYO slugs. Site-wide the settings routes add bracelet.

**Origins `[EXTRACTED]`:** Tanzania 266 / Mozambique 243 / Brazil 164 / Cambodia 106 / Ceylon (Sri Lanka) 63 / Madagascar 43 / Pakistan 26 / Nigeria 22, plus adjectival forms in loose-stone slugs (brazilian, namibia, madagascar, russian, united-states, australian, pakistani, ceylon-sri-lankan).

**Enhancements `[EXTRACTED]`:** No Enhancement 510 / Heat Treated 401 / Vapor-Infused Coating 41. `[OBSERVED]` Treatment is a first-class, low-cardinality, high-severity attribute that materially affects price and must be surfaced everywhere and guarded in the AI layer (section 16.6).

**Clarity `[EXTRACTED]`:** Very Slightly Included 577 / Eye Clean 154 / Slightly Included 101 / Very Very Slightly Included 53 / Included 26, plus the doubled forms discussed in D9.

**Pricing `[EXTRACTED][VERIFIED]` - recovered from `pages_analyzed.jsonl` JSON-LD. The package never extracted this into `products.jsonl`:**

| Property | Value |
|---|---|
| Products with a price | 1,024 / 1,024 |
| Currency | USD (100%) |
| Range | $1,074 - $17,599 |
| Mean | $4,210.18 |
| Distinct price values | 804 |
| Availability | `schema.org/InStock` (1,024/1,024) |
| `priceValidUntil` | present (e.g. `2026-10-17`) |
| `price == weight * per_carat` | **0 / 1,024** |
| Ratio `price / (weight * per_carat)` | min 1.091 / p25 1.693 / **median 2.269** / p75 3.273 / max 268.745 |

`[INFERRED]` Price is a deterministic function of `(setting-variant, gemstone)`, evidenced by the same stone at different settings producing different prices (for `PR5681`: $6,625 / $6,741 / $6,803 / $6,715 / $7,213 / $7,333 / $8,621 / $9,233). The setting component itself is `[UNKNOWN]` (section 26).

**Media `[EXTRACTED][VERIFIED]` - 5 hosts, 3,749 distinct path stems:**

| Host | Records | Role |
|---|---:|---|
| `naturalgemstones.com` | 181,432 | Site chrome **and** origin |
| `images.thenaturalsapphirecompany.com` | 44,480 | **Product media CDN** |
| `phone-video.naturalgemstones.com` | 3,321 | 360-degree / "white glove" video and thumbnails |
| `chat-system.47thst.com` | 3,144 | Third-party live-chat agent avatars |
| `p.sitemana.com` | 169 | Unknown vendor |

`[VERIFIED]` Path-stem composition of the 241,961 records:

| Stem | Records | Meaning |
|---|---:|---|
| `images/normal/mainMenu` | 120,832 | **Navigation icons - 50% of all media, duplicated on every page** |
| `images/normal/packaging` | 27,648 | Packaging shots |
| `images/normal/details` | 16,134 | Detail shots, metal finishes, process |
| `images/normal/filters` | 12,479 | Metal-finish filter swatches |
| `images/normal/logos`, `layout`, `hi-res/logos` | 5,120 | Brand assets |
| `stone/{ref}/image` | - | Stone photography |
| `stone/{ref}/lifestyleimage` | - | Lifestyle and scale shots |
| `stone/{ref}/cert` | - | **Certificate images** |
| `stone/{ref}/sarin` | - | **SARIN gemological report images** |
| `stone/{ref}/appraisal` | - | Stone appraisal images |
| `setting/{code}/image` | - | Setting photography |
| `previewandpast/{sku}/image` | - | **Rendered DYO configuration previews** |
| `previewandpast/{sku}/appraisal` | - | **Per-configuration appraisal images** |
| `prongs/{code}/image` | - | Prong and component detail shots |

`[VERIFIED]` Media classifier quality: `role` is `unknown` for **229,407 / 241,961 = 94.7%**; only `logo` (3,072) and `product_gallery` (67) were classified. `source` is `lazy_or_data_attribute` for 206,136 records. 9,415 records have no `image_url` at all. **Conclusion: the captured `role` field is unusable; classification must be re-derived from path stem.**

**Certificates, reports and appraisals `[OBSERVED]` - correcting the package:**
`12_CERTIFICATES_DOCUMENTS.md` states certificate behaviour is `[UNKNOWN]`, and `crawler.sqlite.documents` has **0 rows**. That is correct about *behaviour*, but it led the package to treat the *artefacts* as missing too. `[VERIFIED]` `entities/media/report.json` and `entities/media/appraisal.json` contain real SARIN report and appraisal image URLs. What is genuinely `[UNKNOWN]` is the document **schema**: no lab name, certificate number, issue date, treatment declaration or signature appears in any captured field. This distinction is precisely what makes certificate OCR a genuine target capability rather than a migration.

**Runtime and platform `[OBSERVED]`:** the source frontend is **Nuxt (Vue) SSR** - `/_nuxt/*.js` bundles are referenced from product pages. `[OBSERVED]` A third-party chat widget is present ("Chat with us" button; agent portraits served from `chat-system.47thst.com` - Katherine, Amrita, Lauren, Charlotte). `[OBSERVED]` Product pages render **0 `<form>` elements** and 10 buttons including "Chat with us" and "Open in fullscreen". `[OBSERVED]` JSON-LD includes `WebSite` and `LocalBusiness` (608 5th Avenue, 11th Floor Penthouse, New York, NY 10020; `+1-212-804-9994`). `[OBSERVED]` `canonical` carries a trailing slash, and `navigation-page-title` is `"Finalize Your"` on a DYO review page.

**Functional routes `[OBSERVED]` - 25 distinct:**
`/cart`, `/cart/order-summary`, `/cart/payment-order`, `/cart/secure-payment` / `/account`, `/auth`, `/verify-email`, `/favorites`, `/compare-list` / `/financing`, `/extend-protection-plan` / `/contact-us`, `/showroom`, `/showroom/preview`, `/showroom/preview/success` / `/education` plus 14 children / `/blog`, `/meet-our-team`, `/michael-arnstein` / `/custom-design-gemstone-rings-jewelry` / `/sitemap-static.xml` plus 44 x `sitemap-products-N.xml`.

`[VERIFIED]` **A four-step checkout funnel is observed in URLs**: `/cart` -> `/cart/order-summary` -> `/cart/payment-order` -> `/cart/secure-payment`. This is the strongest commerce signal in the entire package and it is `[OBSERVED]`, not inferred. `/financing` and `/extend-protection-plan` imply financing and protection/warranty products exist.

`[OBSERVED]` Filter and facet evidence in query strings: `?rs=` (423 URLs), `?design-styles=` (6 URLs). `[INFERRED]` `design-styles` is a settings-category facet.

**Breadcrumb taxonomy `[OBSERVED]` - 15 level-2 categories** across the captured DYO products: Gemstone Necklaces and Pendants 268 / Tourmaline Rings 150 / Gemstone Earrings 113 / Tsavorite Garnet Rings 85 / Spinel Rings 78 / Paraiba Tourmaline Rings 64 / Zircon Rings 60 / Sphene (Titanite) Rings 43 / Chrysoberyl Rings 29 / Peridot Rings 26 / Chrome Tourmaline Rings 26 / Amethyst Rings 26 / Precious Topaz Rings 22 / Chrome Diopside Rings 22 / Men's Gemstone Rings 12.

### 4.3 Crawler-database facts `[OBSERVED][VERIFIED via live read-only query]`

```
assets          180,545      pages         44,173     products       1,245
crawl_errors          0      sitemaps           4     specifications 12,401
documents             0      urls           44,218     sqlite_sequence    3
links                 0      media_assets       0
```

- `pages.status_code`: **202 for 44,146**, 200 for **27**. `[INFERRED]` `202` is the crawler's "queued / not successfully fetched" sentinel, not a genuine origin response.
- `pages.page_type`: `page` 34,356 / `design_your_own` 8,567 / `product` 1,245 / `cart` 4 / `account` 1.
- `pages.html_file IS NULL`: 42,928. NOT NULL: 1,245.
- `urls.url_type`: `page` 17,900 / `category_or_product` 16,461 / `product` 9,812 / blank 45.
- `products.sku`: 1,024 present, **221 empty strings**.
- `specifications`: 12,401 rows across **1,024** distinct `page_url` (12 fields x 1,024, plus `stone_type` x 113).
- `assets`: only **1,024** distinct `page_url`; `asset_type` = `images` 172,767 / `three_d` 6,923 / `three_sixty` 855.
- `sitemaps`: three of four returned 404; only `sitemap-index.xml` returned 200.

### 4.4 DEFECTS found in the supplied reverse-engineering package

These are factual errors in the input. Each is recorded because designing against them would produce a wrong system.

**D1 - The package under-counts the catalog by roughly 86%. `[DEFECT]`**
`data/product_type_counts.json` reports `{"jewelry": 1245}`, and `03_PAGE_ARCHITECTURE.md` implies 1,245 products. In truth the URL inventory contains 19,997 loose-stone pages, 3,077 pair pages, 10,772 setting pages, 9,812 DYO pages and 88 ready-made pages - roughly **43,746 commerce URLs**. Cause: `urls.url_type` classifies only the 9,812 DYO URLs as `product`; the other 33,934 commerce URLs were classified `category_or_product` or `page`, so they never entered `crawler.sqlite.products`. `product_type` is an artefact of a narrow classifier, not the source's real taxonomy. **Impact: migrating only `products.jsonl` would lose about 97% of the catalog.** The migration must re-derive entities from `urls.jsonl`, never from `products.jsonl` alone.

**D2 - "HTML analyzed: 1,245" overstates usable HTML by 18%. `[DEFECT]`**
`[VERIFIED]` `raw_html/` holds 44,173 files, but **43,149 are under 3 KB** error shells (`<html><head><title>502 Bad Gateway</title>...`) and only **1,024 exceed 500 KB** (1.33-1.47 MB each). The 221 products with empty `sku` map to HTML files of 121-2,528 bytes. **Usable product HTML = 1,024, i.e. 82.3% of products but 2.32% of pages.**

**D3 - The "JavaScript is disabled" explanation is wrong. `[DEFECT]`**
`qa_report_hardened.json` and `ARCHITECTURE_READINESS.md` treat the 221 records as a client-side-rendering gap. `[VERIFIED]` They are **502 Bad Gateway or empty responses** - a server-side crawl failure, not a rendering failure. This matters operationally: the correct remedy is a re-fetch, not a headless-browser re-crawl.

**D4 - The `three_d` / `three_sixty` / `360` media classes are false positives. `[DEFECT]`**
`[VERIFIED]` `entities/media/360.json` contains `https://naturalgemstones.com/_nuxt/d360cad4b10684721fb5.js` - a **JavaScript bundle** classified as "360 media" because the hex filename contains the substring `360`. The same defect places 12 Nuxt bundles inside `product.json.media.three_d` (hex containing `3d`). In `crawler.sqlite.assets`, `three_d` 6,923 plus `three_sixty` 855 equals **7,778 misclassified JavaScript files**. `[VERIFIED]` The genuine 360-degree assets live at `phone-video.naturalgemstones.com/gemstone/{ref}-{uuid}/` as mp4 plus thumbnails. **Impact: a naive asset import would ingest 7,778 JavaScript files as product media and would find zero real 3D models.** `[INFERRED]` The source almost certainly has no WebGL or GLB assets whatsoever - see section 21.

**D5 - Stale first-generation artifacts are mixed in with current ones. `[DEFECT]`**
The package contains **two generations**:
- *Generation A*, a 30-page crawl: `architecture/**`, `entities/**`, `relationships/**`, `schema/**`, `content/**`, `design_your_own/**`, `DATASET_MANIFEST(1).json`, `validation/validation_report.json`, `ai_context/ARCHITECTURE.md`, `ai_context/AI_CODING_AGENT_INSTRUCTIONS.md`.
- *Generation B*, the 44,173-page crawl: `data/**`, `00-20*.md`, `ai_context/{SYSTEM_CONTEXT,DOMAIN_GLOSSARY,IMPLEMENTATION_RULES,KNOWN_UNCERTAINTIES,SOURCE_MAP}`, `architecture_handoff/**`, `qa_report*.json`, `dataset_manifest.json`.

Generation A is not merely stale, it is **broken**: `architecture/taxonomy/taxonomy.json` contains only empty arrays; `relationships/relationship_graph.json` contains only empty arrays; `entities/settings/all_settings.json` is `[]`; `entities/side_stones/all_side_stones.json` is `[]`; `entities/gemstones/all_gemstones.json` is 11 KB of **all-null objects**; `content/{categories,education,faq,pages}/` hold **0 files**; `design_your_own/` holds **0 files**. `[OBSERVED]` `ai_context/ARCHITECTURE.md` and `ai_context/AI_CODING_AGENT_INSTRUCTIONS.md` are Generation A and state "Completed pages: 30 / Products: 30 / Assets: 5483". **These are the files `19_AI_IMPLEMENTATION_CHECKLIST.md` instructs the implementer to read first.** They must never be used as data sources.

**D6 - Certificate, report and appraisal artefacts were reported as absent. `[DEFECT]`**
`12_CERTIFICATES_DOCUMENTS.md` states: "Certificate/document backend behavior is not sufficiently captured. Treat as UNKNOWN." That is correct about behaviour, but it caused the package to treat the artefacts as missing too. `[VERIFIED]` `entities/media/report.json` and `entities/media/appraisal.json` contain real SARIN report and appraisal image URLs. The schema is unknown; the artefacts are observed.

**D7 - Media `role` is 94.7% `unknown`. `[DEFECT]`**
`data/media_summary.json` presents roles as if they were usable. They are not. Re-classification from path stem is mandatory.

**D8 - Price was never extracted into a queryable dataset. `[DEFECT]`**
`products.jsonl` has no price field. Price exists only inside `pages_analyzed.jsonl` at `product.json.commercial.price` and `structured_data.offers`. Any migration reading only `products.jsonl` loses all 1,024 prices. Verified recoverable.

**D9 - `per_carat_price_help` and `stone_type` are doubly-populated strings. `[DEFECT]`**
`[VERIFIED]` 113 records carry `"Blue Blue"`, `"Emerald Cut Emerald Cut"`, `"K1324 K1324"`, `"Length: X Width: Y Height: Z Length: ..."`. This is **not** a duplicate-render artefact: it is the concatenation of per-stone values with the delimiter lost, and for the pair family it genuinely describes two stones. Naive normalisation would create facets literally named `"Pink Pink"`. `[VERIFIED]` `exports/specifications.csv` contains the clean single-valued form (`item_id: K1324`) for single-stone products, confirming the source renders a different table for pairs.

**D10 - `relationships.jsonl` contains no product-to-gemstone or product-to-setting edge. `[DEFECT]`**
`[VERIFIED]` All 397,727 relationships are only `HAS_MEDIA` (232,546), `LINKS_TO` (151,535), `HAS_SPECIFICATION` (12,401) and `REPRESENTED_BY` (1,245). There is **zero** recorded product/gemstone, product/setting, or gemstone/certificate relationship. `relationships/relationship_graph.json` is empty. The composition graph must therefore be rebuilt from the SKU grammar (section 1.1), not read from the relationship dataset.

### 4.5 What remains UNKNOWN

**Genuinely unknown - no evidence exists:**
Payment provider; tax engine; shipping carriers and rates; discount and promotion mechanics; refund policy; order numbering scheme; customer data model; authentication mechanism and provider; CRM; ERP; inventory mutation and reservation semantics; admin system; email and SMS provider; background job infrastructure; webhook architecture; the original database engine, schema, indexes and triggers; the DYO configuration engine internals; DYO compatibility rules; **the setting component of price**; ring-size model; engraving model; side-stone (accent stone) catalog; loyalty and review subsystem internals; original observability; original hosting and CDN.

**Unknown but with an observable surface - partial signal, must not be over-read:**
Checkout step *contents* (4 URLs observed, no HTML); auth screens (`/auth`, `/verify-email` observed, no HTML); search behaviour (860 keyword signals only, no query logs); filter precedence (only `?rs=` and `?design-styles=`); certificate schema (artefacts only); 360-degree and video hosting behaviour; chat provider contract.

**Unknown because the crawl never fetched it:** 42,928 pages, 97.7% of the site, have no HTML. Any behaviour on `/education/*`, `/blog`, `/showroom/*`, `/financing`, `/extend-protection-plan` and `/cart/*` is `[UNKNOWN]`.

---

## 5. FUNCTIONAL REQUIREMENTS

Each requirement carries its evidence basis. `E#` refers to the verified facts in sections 4.2 and 4.3. `B#` is a business requirement from the distinguishing-sauce charter with no source evidence - these are the inferred parts of the product.

### 5.1 Catalog

| ID | Requirement | Evidence |
|---|---|---|
| FR-CAT-01 | Model loose gemstones, gemstone pairs, jewelry settings and configured jewelry as four distinct sellable kinds with distinct lifecycles and price bases. | E: section 1.1 SKU grammar, URL families |
| FR-CAT-02 | Every entity must retain `source_url` and an `evidence_status` of OBSERVED/EXTRACTED/PATTERN/INFERRED/UNKNOWN. | E: charter 35; `IMPLEMENTATION_RULES.md` |
| FR-CAT-03 | A gemstone must be individually addressable and individually priced, carrying origin, treatment, colour, colour intensity, clarity, shape, cut, cutting style, dimensions and weight. | E: 13 spec fields, 1,024 records |
| FR-CAT-04 | A setting must be reusable across many gemstones and must exist per metal variant with its own identity and price. | E: `JS####{code}`, 10,349 setting SKUs |
| FR-CAT-05 | Configured jewelry must be a first-class composition of exactly one setting-variant and one gemstone *or* one pair. | E: section 1.1; pair/earring invariant |
| FR-CAT-06 | Multi-stone configurations must store per-stone measurements, never a concatenated string. | E: D9; `2.87 Ct. 3.11 Ct.` |
| FR-CAT-07 | Support roughly 19,665 loose stones, 3,072 pairs, 10,349 setting SKUs and 9,812 DYO configurations at launch. | E: section 4.2 cardinalities |
| FR-CAT-08 | Preserve original raw source values verbatim alongside every normalized value. | E: charter 55 |
| FR-CAT-09 | Merging duplicate source records must never silently overwrite; both are retained with their URLs. | E: `AI_CODING_AGENT_INSTRUCTIONS.md` |
| FR-CAT-10 | Derived, non-observed identifiers must live in dedicated `*_derived` columns behind a human review gate. | E: section 3.1 Example B |

### 5.2 Taxonomy and discovery

| ID | Requirement | Evidence |
|---|---|---|
| FR-TAX-01 | First-class gemstone variety reference data (roughly 100+ varieties including `tsavorite-garnet`, `paraiba-tourmaline`, `sphene-titanite`, `padparadscha`). | E: 145 variety route slugs |
| FR-TAX-02 | Colour taxonomy with modifiers (`bluish-green`, `greenish-yellow`, `orangish-yellow`, `padparadscha`, `swiss-blue`, `electric-blue`) plus intensity. | E: 60 colour routes; `color_help`, `color_intensity_help` |
| FR-TAX-03 | Shape, cut, cutting style, clarity, enhancement and origin must be queryable reference data, never hard-coded in components. | E: spec value distributions; `ARCHITECTURE_READINESS.md` |
| FR-TAX-04 | Colour-category landing pages (`/blue-gemstones`, `/padparadscha-gemstones`, ...) must be generatable from taxonomy. | E: 60 colour routes |
| FR-TAX-05 | Variety x form facets (`/{variety}`, `/{variety}-pairs`, `/{variety}-rings`) must be generatable. | E: route triplets |
| FR-TAX-06 | Variety pages need real editorial content (origin, treatment, buying guidance) to serve as RAG corpus. | B: charter 40 |

### 5.3 Search

| ID | Requirement | Evidence |
|---|---|---|
| FR-SEARCH-01 | Hybrid search: structured filters plus full-text plus vector similarity plus business ranking. | B: charter 36; E: 860 signals |
| FR-SEARCH-02 | Filter by variety, colour, intensity, shape, cut, clarity, treatment, origin, weight range, price range, jewellery type, setting style and metal. | E: all present in spec fields and the slug grammar |
| FR-SEARCH-03 | Facet counts returned alongside results. | E: `?rs=`, `?design-styles=` filter URLs |
| FR-SEARCH-04 | Typo tolerance and synonym handling, for example `tsavorite` to `garnet` and `paraiba` to `tourmaline`. | B |
| FR-SEARCH-05 | "Which gemstones are available?" must resolve to a deterministic inventory query, never to vector recall. | B: charter 10 |
| FR-SEARCH-06 | Search must never present a stone whose availability is unknown as available. | B: charter 21 |

### 5.4 Design Your Own

| ID | Requirement | Evidence |
|---|---|---|
| FR-DYO-01 | DYO is a configuration workflow: gemstone, compatible setting, metal, review, price, cart. | E: `/design-your-own/review/*`; charter 24 |
| FR-DYO-02 | Earrings must consume a gemstone pair; ring, pendant and necklace must consume a single stone. Enforced, not advisory. | E: **verified 113/113 and 1,132/1,132, zero exceptions** |
| FR-DYO-03 | Configurations must be persistable, shareable and resumable, addressed by a deterministic configuration hash. | B: charter 25 |
| FR-DYO-04 | Compatibility must be evaluated deterministically from persisted rules, with per-rule explanations. | B |
| FR-DYO-05 | Price must be computed by a deterministic pricing service and snapshotted onto the configuration. | B: charter 22 |
| FR-DYO-06 | `PR` versus `K` semantics must be first-class, not inferred from a string prefix at read time. | E: verified pair semantics |
| FR-DYO-07 | Must not manufacture source SKUs for the 221 records lacking `product.sku`. | E: charter 24; section 3.1 Example B |
| FR-DYO-08 | Rendered configuration previews exist per SKU in the source at `previewandpast/{sku}/image`. The platform must generate its own. | E: media path stems |

### 5.5 Commerce

| ID | Requirement | Evidence |
|---|---|---|
| FR-COM-01 | Four-step checkout: cart, order summary, payment order, secure payment. | E: **observed URLs** |
| FR-COM-02 | Cart, checkout, payment, order and fulfillment must be separate bounded contexts. | B; `IMPLEMENTATION_AI_INSTRUCTIONS.md` section 11 |
| FR-COM-03 | Prices must be re-validated server-side at checkout; the client price is never authoritative. | B: charter 22 |
| FR-COM-04 | Financing and protection/warranty must exist as first-class purchasable add-ons. | E: `/financing`, `/extend-protection-plan` |
| FR-COM-05 | Favorites (wishlist) and compare-list must exist. | E: `/favorites`, `/compare-list` |
| FR-COM-06 | Customer accounts with email verification. | E: `/account`, `/auth`, `/verify-email` |
| FR-COM-07 | A concierge request and showroom appointment funnel must exist. | E: `/showroom`, `/showroom/preview`, `/showroom/preview/success`, `/contact-us` |
| FR-COM-08 | Order history, status tracking and refunds. | B; `[UNKNOWN]` in source |

### 5.6 Trust and documents

| ID | Requirement | Evidence |
|---|---|---|
| FR-TRUST-01 | Certificates, gemological reports (SARIN) and appraisals must be first-class document entities attached to stones *and* to configurations. | E: `stone/{ref}/cert`, `stone/{ref}/sarin`, `stone/{ref}/appraisal`, `previewandpast/{sku}/appraisal` |
| FR-TRUST-02 | OCR extraction must record value, confidence and verification status per field; low confidence may never be presented as verified. | B: charter 26-27 |
| FR-TRUST-03 | Every document carries provenance: provider, model, version, timestamp, run id. | B: charter 26 |
| FR-TRUST-04 | Human review must be a persisted state, not a side effect. | B |
| FR-TRUST-05 | Anomalies - weight mismatch versus slug, origin conflict, impossible dimensions - must be detected and flagged. | B; enabled by D2 and D9 |

### 5.7 AI

| ID | Requirement | Evidence |
|---|---|---|
| FR-AI-01 | AI is an orchestrator over controlled tools and trusted data, never a database client. | B: charter 17, 43 |
| FR-AI-02 | Tools: `search_inventory`, `get_product`, `get_gemstone`, `compare_gemstones`, `search_knowledge`, `check_dyo_compatibility`, `get_certificate`, `get_price_quote`, `create_customer_request`, `transfer_to_human`. | B: charter 20, extended for section 1.1 |
| FR-AI-03 | Every tool call is authorized outside the LLM and logged with input, output, latency and token cost. | B: charter 43, 44 |
| FR-AI-04 | Provenance must be attached to factual claims; unsupported claims must be suppressed. | B: charter 46 |
| FR-AI-05 | Explicit human handoff, persisted, with defined triggers. | B: charter 29 |
| FR-AI-06 | The AI must refuse to state stone type, origin, treatment or authenticity when the field is NULL or unverified. | B: charter 21, plus the `stone_type` coverage gap in section 4.2 |
| FR-AI-07 | Conversation state must be channel-agnostic so web and WhatsApp share tools and memory. | B: charter 28 |

### 5.8 Channels

| ID | Requirement | Evidence |
|---|---|---|
| FR-CH-01 | WhatsApp concierge via Meta WhatsApp Cloud API, sharing the web AI orchestrator and tools. | B: charter 28 |
| FR-CH-02 | WebAR virtual try-on, client-side, using MediaPipe, Three.js, PBR and Draco GLB. | B: charter 30 |
| FR-CH-03 | Desktop-to-mobile QR handoff for WebAR using short-lived opaque tokens with no PII in the token. | B: charter 32 |
| FR-CH-04 | Camera frames must never leave the device without explicit consent. | B: charter 30 |
| FR-CH-05 | 360-degree and video stone media must be supported, matching the source's "white glove video" pattern. | E: `phone-video.naturalgemstones.com` |

### 5.9 Content and SEO

| ID | Requirement | Evidence |
|---|---|---|
| FR-CMS-01 | Structured CMS with typed blocks, decoupled from presentation. | B: charter 52 |
| FR-CMS-02 | Education hub covering gemstone essentials, treatments, grading, types, colour categories, mining locations, organic gems and buying guides. | E: 14 `/education/*` routes |
| FR-CMS-03 | Vedic astrology content vertical. | E: `vedic` setting style (860) plus `/education/ruby-history/rubies-jyotisha-vedic-astrology` |
| FR-CMS-04 | Blog, team pages, showroom and contact pages. | E: `/blog`, `/meet-our-team`, `/michael-arnstein`, `/showroom` |
| FR-CMS-05 | Preserve observed route shapes via redirects; generate sitemap and structured data (Product, BreadcrumbList, Organization). | E: JSON-LD already present in source |
| FR-CMS-06 | Category pages must be data-driven from taxonomy, never hand-authored per variety. | B: charter 49 |

---

## 6. NON-FUNCTIONAL REQUIREMENTS

| ID | Requirement | Target | Basis |
|---|---|---|---|
| NFR-01 | Design for roughly 50,000 users without premature microservices. | Modular monolith on Vercel; extract only on measured need. | B: charter 47, 48 |
| NFR-02 | Storefront p75 LCP under 2.5s on product and category pages; WebAR must not regress it. | WebAR fully lazy and dynamically imported | B: charter 31 |
| NFR-03 | Search p95 under 400ms for filtered queries, under 800ms with semantic re-rank. | Postgres FTS plus pgvector plus Redis | B: charter 11 |
| NFR-04 | Price, stock and order state are never served from a cache that can diverge from Postgres. | Section 15 | B: charter 12 |
| NFR-05 | Every AI mutation path is impossible without a deterministic application service. | Section 16.7 | B: charter 21-23 |
| NFR-06 | The AI must never emit an unverified gemological fact. | Field-level provenance gate | B: charter 27 |
| NFR-07 | Certificate OCR confidence is preserved end to end with no silent promotion. | Section 18 | B: charter 26-27 |
| NFR-08 | Provenance must be answerable for every migrated field: where did this value come from? | `provenance` plus `evidence_status` columns | B: charter 35 |
| NFR-09 | PII never enters logs, embeddings or model context beyond the minimum required. | Redaction layer | B: charter 44 |
| NFR-10 | Webhook endpoints verify signatures before any processing occurs. | HMAC per provider | B: charter 42 |
| NFR-11 | All assets served via R2 and CDN; customer documents never public-read. | Signed URLs for certificates and appraisals | E: document artefacts; B: charter 42 |
| NFR-12 | Migration is repeatable and idempotent; re-running produces no duplicates. | `import_batches` plus deterministic keys | B: charter 54 |
| NFR-13 | Every reconstructed feature has a test traceable to its evidence. | Section 34 | B: charter 45 |
| NFR-14 | The system degrades gracefully: catalog and search stay readable when AI, Redis or the vector index is down. | Circuit breakers | `[INFERRED]` |
| NFR-15 | Capacity claims must be validated by load test before being asserted. | No numeric capacity is claimed in this document. | B: charter 47 |

---

## 7. DOMAIN MODEL

### 7.1 Aggregate map

```
                          +--------------------------+
                          |   GEMSTONE VARIETY       |  (~100 varieties)
                          |   + SPECIES / COLOUR /   |
                          |     ORIGIN / SHAPE /     |
                          |     CLARITY / TREATMENT  |
                          +------------|-------------+
                                       |
                          +------------v--------------+
                          |   GEMSTONE               |  (~19,665 single)
                          |   or GEMSTONE_PAIR        |  (~3,072 pair)
                          |   identity: K##### / PR###|
                          +------+-------------+------+
                                 |             |
                     +-----------v--+   +------v---------------+
                     |  DOCUMENTS   |   |  MEDIA / ASSETS       |
                     |  certificate |   |  photo, lifestyle,    |
                     |  report      |   |  360 video, cert      |
                     |  appraisal   |   +-----------------------+
                     +--------------+

   +---------------------------------------------------------+
   |  SETTING  (reusable mount, ~951 designs)                |
   |    +-- SETTING_VARIANT  (~10,349, = design x metal)      |
   |         identity: JS<design><metalCode>                 |
   |         |-- compatibility rules (variety/shape/weight)  |
   |         +-- media (photography per variant)             |
   +----------------------------+----------------------------+
                                |
        +-----------------------v---------------------------+
        |  PRODUCT  (the sellable unit)                   |
        |    kind = CONFIGURED | READY_MADE | LOOSE_STONE  |
        |    |-- 1 x setting_variant                       |
        |    |-- 1 x gemstone   (ring/pendant/necklace)    |
        |    |-- 1 x gemstone_pair (earrings)  <-- INVARIANT|
        |    |-- price + price components                  |
        |    +-- media (rendered preview + appraisal)      |
        +------------------------+-------------------------+
                                 |
   +-----------------------------v------------------------------+
   |  DYO_CONFIGURATION  (persisted, hashed, resumable)      |
   |    configuration_hash | compatibility_status | snapshot |
   +------------------------------------------------------------+

   COMMERCE:  Customer -> Cart -> CartItem -> Order -> OrderItem
              -> Payment -> Refund | Address | Discount | Fulfillment
   TRUST:     Certificate -> Extraction -> Review -> VerificationEvent
   CONTENT:   Page -> ContentBlock | Navigation | Redirect | Seo
   AI:        Conversation -> Message -> ToolCall | Knowledge -> Chunk
   ASSETS:    Asset -> AssetVariant -> AssetUsage | AssetProcessingJob
   OPS:       DomainEvent | Job | AuditLog | ImportBatch
```

### 7.2 Domain glossary (authoritative for this build)

| Term | Definition | Evidence |
|---|---|---|
| **Gemstone variety** | A trade or species-level classification such as Tsavorite or Paraiba Tourmaline. Reference data. | `[OBSERVED]` route slugs |
| **Gemstone** | One individual physical stone. Identity `K#####`. | `[OBSERVED]` + `[VERIFIED]` stable identity |
| **Gemstone pair** | Two matched stones sold and used together. Identity `PR#####`. | `[OBSERVED]` + `[VERIFIED]` |
| **Setting** | A reusable jewellery mount design with no stone and no metal chosen. Identity `JS<design>`. | `[EXTRACTED]` |
| **Setting variant** | A setting in one specific metal. Identity `JS<design><metalCode>`. Sellable on its own. | `[OBSERVED]` |
| **Setting style** | Design family: solitaire, pave, three-stone, accent-stones, halo, bezel, antique, vedic, floral, celtic, wedding-set, studs, mens, drops, flush-set. | `[EXTRACTED][VERIFIED]` |
| **Jewellery type** | ring, pendant, necklace, earrings, bracelet. | `[EXTRACTED][VERIFIED]` |
| **Product** | The sellable unit: CONFIGURED, READY_MADE, LOOSE_STONE, STONE_PAIR or SETTING_ONLY. | `[INFERRED]` framing of observed URL families |
| **Configuration** | A persisted, hashed DYO state that can be resumed, quoted and added to cart. | `[INFERRED]` |
| **Evidence status** | OBSERVED / EXTRACTED / PATTERN / INFERRED / UNKNOWN for a given field. | charter 6 |
| **Total weight (`Ct.Tw.`)** | Sum of all stone weights in a configuration. Verified against the slug weight for 113/113 pairs. | `[VERIFIED]` |
| **SARIN report** | A third-party gemological report; observed only as image artefacts at `/stone/{ref}/sarin/`. Contents `[UNKNOWN]`. | `[OBSERVED]` + `[UNKNOWN]` |

### 7.3 Invariants (enforced, not merely documented)

| ID | Invariant | Basis |
|---|---|---|
| INV-01 | A CONFIGURED product has exactly one `setting_variant_id` and exactly one `gemstone_id` XOR one `gemstone_pair_id`. | `[VERIFIED]` |
| INV-02 | A `gemstone_pair` may only attach to jewellery type EARRINGS. | `[VERIFIED]` 113/113 |
| INV-03 | A single `gemstone` may only attach to RING, PENDANT, NECKLACE or BRACELET. | `[VERIFIED]` 1,132/1,132 |
| INV-04 | `setting_variant.metal_code` determines metal purity; purity and colour are never free text. | `[VERIFIED]` 1:1 slug mapping |
| INV-05 | `gemstone.variety_id` must equal the variety implied by the source slug for migrated rows, else the row is quarantined for review. | `[VERIFIED]` 19,666/19,666 |
| INV-06 | Every price component must be reproducible from `(gemstone, setting_variant, options, quantity)` at quote time. | `[INFERRED]` charter 22 |
| INV-07 | A document field whose `verification_status != 'VERIFIED'` may never render as verified truth. | `[INFERRED]` charter 27 |
| INV-08 | An `INFERRED` identifier may never be used as a confirmed external reference without `review_state = 'APPROVED'`. | `[EXTRACTED]` section 3.1 Example B |
| INV-09 | `product.slug` must be globally unique and stable across renames, with renames recorded in `redirects`. | charter 51 |
| INV-10 | Soft delete is permitted only on `products`, `cms_pages`, `knowledge_documents` and `assets` - never on `orders`, `payments`, `audit_logs` or `domain_events`. | `[INFERRED]` integrity |

---

## 8. DATABASE ARCHITECTURE

**Target:** Neon PostgreSQL 16 or later. **Authority:** Postgres is the single source of truth for every transactional fact. Redis is cache and transient state only (section 15).

### 8.1 Extensions

```sql
-- Required by the schema in section 8. Verified executable on PostgreSQL 16.
CREATE EXTENSION IF NOT EXISTS vector;            -- pgvector: vector(1024) + HNSW
CREATE EXTENSION IF NOT EXISTS citext;            -- customers.email is CITEXT
CREATE EXTENSION IF NOT EXISTS pg_trgm;           -- GIN trigram: typo tolerance, slug similarity
CREATE EXTENSION IF NOT EXISTS unaccent;          -- diacritic-insensitive search
CREATE EXTENSION IF NOT EXISTS btree_gin;         -- scalar columns inside composite GIN
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;-- requires shared_preload_libraries; optional
```

Extension notes, each verified against a live PostgreSQL 16 instance during Phase 0 validation:

| Extension | Used by | Executable in validation build | Note |
|---|---|---|---|
| `vector` | `knowledge_chunks.embedding`, `product_embeddings.embedding`, HNSW indexes | **Yes**, v0.6.2 | Verified: `vector(1024)` and both HNSW indexes build successfully |
| `citext` | `customers.email CITEXT UNIQUE` | No (contrib absent) | Declared here; Neon provides it in the standard image. Substitution `text` was validated |
| `pg_trgm` | trigram GIN on `gem_ref`, `title`, variety `name` | No (contrib absent) | Declared here; Neon provides it |
| `unaccent` | diacritic folding in the search layer | No (contrib absent) | Declared here; no DDL depends on it, so it is additive |
| `btree_gin` | scalar columns inside composite GIN | No (contrib absent) | Declared here; see the reduction note below |
| `pg_stat_statements` | query performance telemetry | No | Must be in `shared_preload_libraries`; it is optional and no DDL depends on it |

`btree_gin` reduction: no index in section 8 places a scalar column inside a GIN index. Every GIN index is over `jsonb_path_ops`, a single `tsvector` expression, or a single `text` column, all of which use built-in GIN operator classes. `btree_gin` is therefore **not yet required** and is listed only because facet-array indexing may need it if facet storage moves from indexed columns to arrays. This is recorded rather than silently dropped.

### 8.2 Shared conventions

- Primary keys: `uuid` with `gen_random_uuid()`. Public-facing sequential numbers are separate columns (`product_number`, `order_number`).
- Money: `NUMERIC(12,2)` for amounts, `CHAR(3)` for ISO-4217 currency. Never floating point.
- Weights: `NUMERIC(8,3)` carats. Dimensions: `NUMERIC(8,3)` millimetres.
- Timestamps: `TIMESTAMPTZ` everywhere, stored UTC.
- Soft delete: `deleted_at TIMESTAMPTZ NULL` only where INV-10 permits.
- Optimistic concurrency: `version INTEGER NOT NULL DEFAULT 1` on mutable aggregates.
- Audit fields on business tables: `created_at`, `updated_at`, `created_by`, `updated_by`.
- Provenance on any table holding migrated source data: `evidence_status`, `source_url`, `source_ref`, `import_batch_id`.
- JSONB is used only where the shape is genuinely open: `raw_spec`, `raw_json`, `blocks`, `options`, `payload`, `metadata`, `selected_options`, `compatibility_detail`. Never as a substitute for relational structure.

### 8.3 Enumerated types

```sql
CREATE TYPE evidence_status        AS ENUM ('OBSERVED','EXTRACTED','PATTERN','INFERRED','UNKNOWN');
CREATE TYPE provenance_kind        AS ENUM ('SOURCE_CRAWL','SOURCE_DERIVED','DERIVED_PARSER','ADMIN','SYSTEM','AI_SUGGESTED');
CREATE TYPE record_state           AS ENUM ('DRAFT','ACTIVE','ARCHIVED');
CREATE TYPE review_state           AS ENUM ('UNREVIEWED','PENDING','APPROVED','REJECTED');
CREATE TYPE gemstone_kind          AS ENUM ('SINGLE','PAIR');
CREATE TYPE product_kind           AS ENUM ('CONFIGURED','READY_MADE','LOOSE_STONE','STONE_PAIR','SETTING_ONLY');
CREATE TYPE product_state          AS ENUM ('DRAFT','ACTIVE','ARCHIVED','SOLD_OUT','DISCONTINUED');
CREATE TYPE jewellery_type         AS ENUM ('RING','EARRINGS','NECKLACE','PENDANT','BRACELET','BROOCH','CUFFLINKS','CHARM');
CREATE TYPE metal_code             AS ENUM ('W10','Y10','R10','W14','Y14','R14','W18','Y18','R18','PT','SL','YW14','YW18','WY14','WY18');
CREATE TYPE stone_shape            AS ENUM ('OVAL','ROUND','CUSHION','EMERALD_CUT','PEAR','RADIANT','PRINCESS','HEART','TRILLION','ASSCHER_OCTAGON','BAGUETTE','MARQUISE','OTHER');
CREATE TYPE cutting_style          AS ENUM ('FACETED','CABOCHON','OTHER');
CREATE TYPE treatment_code         AS ENUM ('NO_ENHANCEMENT','HEAT_TREATED','VAPOR_INFUSED_COATING','IRRADIATION','FRACTURE_FILL','OIL','OTHER','UNKNOWN');
CREATE TYPE media_kind             AS ENUM ('IMAGE','LIFESTYLE','VIDEO_360','VIDEO','MODEL_3D','CERTIFICATE','REPORT','APPRAISAL','DOCUMENT','OTHER');
CREATE TYPE media_role             AS ENUM ('PRIMARY','GALLERY','THUMBNAIL','LOGO','PACKAGING','DETAIL','PRONG','CERTIFICATE','REPORT','APPRAISAL','PREVIEW_RENDER','SCENE_3D','OTHER');
CREATE TYPE asset_processing_state AS ENUM ('PENDING','FETCHING','VALIDATING','PROCESSING','READY','FAILED','SKIPPED');
CREATE TYPE document_kind          AS ENUM ('CERTIFICATE','GEM_REPORT','APPRAISAL','INVOICE','POLICY','OTHER');
CREATE TYPE verification_status    AS ENUM ('UNVERIFIED','EXTRACTED','CROSS_CHECKED','VERIFIED','REJECTED');
CREATE TYPE dyo_state              AS ENUM ('DRAFT','VALIDATING','VALID','INCOMPATIBLE','PRICED','ADDED_TO_CART','ORDERED','EXPIRED');
CREATE TYPE compatibility_result   AS ENUM ('COMPATIBLE','INCOMPATIBLE','UNKNOWN','REQUIRES_REVIEW');
CREATE TYPE cart_state             AS ENUM ('ACTIVE','CONVERTED','ABANDONED','EXPIRED');
CREATE TYPE order_state            AS ENUM ('PENDING_PAYMENT','PAID','IN_FULFILLMENT','FULFILLED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
CREATE TYPE payment_state          AS ENUM ('CREATED','AUTHORIZED','CAPTURED','FAILED','VOIDED','PARTIALLY_REFUNDED','REFUNDED');
CREATE TYPE refund_state           AS ENUM ('REQUESTED','APPROVED','PROCESSING','SUCCEEDED','FAILED','REJECTED');
CREATE TYPE discount_type          AS ENUM ('PERCENTAGE','FIXED_AMOUNT','FREE_SHIPPING','FINANCING','PROTECTION_PLAN');
CREATE TYPE conversation_channel   AS ENUM ('WEB','WHATSAPP','ADMIN','API');
CREATE TYPE conversation_state     AS ENUM ('OPEN','AWAITING_HUMAN','HANDED_OFF','RESOLVED','CLOSED');
CREATE TYPE message_role           AS ENUM ('USER','ASSISTANT','TOOL','SYSTEM','HUMAN_AGENT');
CREATE TYPE handoff_reason         AS ENUM ('CUSTOMER_REQUEST','LOW_CONFIDENCE','CERTIFICATE_ANOMALY','COMPLEX_DYO','HIGH_VALUE','SENSITIVE_OPERATION','POLICY_ESCALATION','DISSATISFACTION','NO_INFORMATION');
CREATE TYPE job_state              AS ENUM ('QUEUED','RUNNING','SUCCEEDED','FAILED','DEAD_LETTER','CANCELLED');
CREATE TYPE ai_provider            AS ENUM ('VERCEL_AI_GATEWAY','OPENROUTER','AZURE_OPENAI','ANTHROPIC','LOCAL');
CREATE TYPE domain_event_status    AS ENUM ('PENDING','PUBLISHED','FAILED','DEAD_LETTER');
CREATE TYPE content_block_type     AS ENUM ('HERO','RICH_TEXT','IMAGE','IMAGE_GALLERY','PRODUCT_COLLECTION','GEMSTONE_COLLECTION','CATEGORY_GRID','FAQ','BUYING_GUIDE','CERTIFICATE_GUIDE','COMPARISON_TABLE','VIDEO','CTA','BANNER','TESTIMONIAL','SHOWROOM_CTA','VEDIC_CTA','ASTROLOGY_CONTENT','CUSTOM_DESIGN_CTA','CONTACT_CTA');
CREATE TYPE seo_entity_kind        AS ENUM ('PRODUCT','CATEGORY','VARIETY','COLLECTION','PAGE','ARTICLE','ORGANIZATION');
```

### 8.4 Migration and staging schema

Loaded first, never queried by the storefront. Guarantees a replayable pipeline (section 33).

```sql
CREATE TABLE import_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key           TEXT NOT NULL UNIQUE,        -- e.g. 'ng-2026-10-03-urls-v1'
  source_system       TEXT NOT NULL DEFAULT 'naturalgemstones.com',
  source_artifact     TEXT NOT NULL,               -- 'urls.jsonl'
  source_sha256       TEXT,                        -- integrity gate
  status              job_state NOT NULL DEFAULT 'QUEUED',
  started_at          TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  records_seen        BIGINT DEFAULT 0,
  records_accepted    BIGINT DEFAULT 0,
  records_rejected    BIGINT DEFAULT 0,
  records_quarantined BIGINT DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw, verbatim, immutable. One row per source record, never normalized.
CREATE TABLE staging_source_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id     UUID NOT NULL REFERENCES import_batches(id),
  source_url          TEXT NOT NULL,
  source_path         TEXT,
  source_title        TEXT,
  source_page_type    TEXT,
  source_status_code  INTEGER,
  source_content_hash TEXT,
  source_html_file    TEXT,
  source_html_sha256  TEXT,
  source_html_bytes   INTEGER,
  source_text_length  INTEGER,
  source_json         JSONB NOT NULL,              -- verbatim record
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (import_batch_id, source_url)
);
CREATE INDEX ON staging_source_pages (import_batch_id);
CREATE INDEX ON staging_source_pages USING gin (source_json jsonb_path_ops);

-- Deterministic parser output with the evidence ledger for every derived value.
CREATE TABLE staging_parsed_urls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id     UUID NOT NULL REFERENCES import_batches(id),
  source_url          TEXT NOT NULL,
  url_family          TEXT NOT NULL,   -- LOOSE_STONE | STONE_PAIR | SETTING | DYO | READY_MADE
                                       -- | VARIETY_INDEX | CATEGORY_INDEX | FUNCTIONAL | EDUCATION | UNKNOWN
  route_depth         SMALLINT,
  variety_slug        TEXT,
  colour_slug         TEXT,
  form_slug           TEXT,             -- pairs | rings | settings
  stone_weight_ct     NUMERIC(8,3),
  origin_slug         TEXT,
  shape_slug          TEXT,
  cut_slug            TEXT,
  jewellery_type_slug TEXT,
  design_code         TEXT,             -- JS<design>
  metal_code          TEXT,
  setting_style       TEXT,
  gem_ref_derived     TEXT,             -- K##### / PR#####
  gem_ref_observed    TEXT,             -- only when present in source data
  derived_sku         TEXT,
  parse_confidence    NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  parse_warnings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_status     evidence_status NOT NULL DEFAULT 'INFERRED',
  UNIQUE (import_batch_id, source_url)
);
CREATE INDEX ON staging_parsed_urls (import_batch_id, url_family);
CREATE INDEX ON staging_parsed_urls (gem_ref_derived) WHERE evidence_status = 'INFERRED';

-- Field-level conflict ledger: "two source records disagree" must never be lost.
CREATE TABLE staging_conflicts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id),
  entity_kind   TEXT NOT NULL,
  entity_ref    TEXT NOT NULL,
  field_name    TEXT NOT NULL,
  value_a       TEXT, source_url_a TEXT,
  value_b       TEXT, source_url_b TEXT,
  resolution    TEXT,                  -- NULL until resolved
  resolved_by   UUID, resolved_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON staging_conflicts (entity_kind, entity_ref) WHERE resolution IS NULL;
```

### 8.5 Reference and taxonomy tables

```sql
CREATE TABLE gemstone_species (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,        -- 'garnet','tourmaline','beryl','corundum'
  name          TEXT NOT NULL,
  mineral_name  TEXT,
  mohs_min      NUMERIC(3,1),
  mohs_max      NUMERIC(3,1),
  description   TEXT,
  evidence_status evidence_status NOT NULL DEFAULT 'INFERRED',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gemstone_varieties (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id     UUID REFERENCES gemstone_species(id),
  slug           TEXT NOT NULL UNIQUE,       -- 'tsavorite-garnet'
  name           TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  source_route   TEXT UNIQUE,                -- '/tsavorite-garnet'
  description    TEXT,
  care_instructions TEXT,
  is_organic     BOOLEAN NOT NULL DEFAULT false,   -- pearls, coral, opal
  state          record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
CREATE INDEX ON gemstone_varieties (species_id) WHERE deleted_at IS NULL;
CREATE INDEX ON gemstone_varieties USING gin (to_tsvector('english', name));

CREATE TABLE gemstone_colours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,        -- 'bluish-green'
  name          TEXT NOT NULL,               -- 'Bluish Green'
  parent_id     UUID REFERENCES gemstone_colours(id),
  modifier      TEXT,                        -- 'bluish' | 'greenish' | 'orangish'
  hue           TEXT,
  is_chromatic  BOOLEAN NOT NULL DEFAULT true,
  sort_order    SMALLINT NOT NULL DEFAULT 100,
  state         record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
CREATE INDEX ON gemstone_colours (parent_id);

CREATE TABLE colour_intensities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,        -- 'medium'
  name          TEXT NOT NULL,
  rank          SMALLINT NOT NULL,           -- 1..5 for ordering
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);

CREATE TABLE gemstone_origins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,        -- 'tanzania'
  name          TEXT NOT NULL,
  country_code  CHAR(2),
  region        TEXT,
  description   TEXT,
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);

CREATE TABLE treatments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          treatment_code NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  description   TEXT,
  requires_disclosure BOOLEAN NOT NULL DEFAULT true,
  price_impact  SMALLINT NOT NULL DEFAULT 0,  -- -2..+2 merchandising hint only
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
CREATE TABLE treatment_labels (               -- verbatim source strings
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id  UUID REFERENCES treatments(id),
  raw_label     TEXT NOT NULL UNIQUE,         -- 'Vapor-Infused Coating'
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);

CREATE TABLE clarities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  rank          SMALLINT NOT NULL,
  is_eye_clean  BOOLEAN NOT NULL DEFAULT false,
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
CREATE TABLE clarity_labels (               -- D9 detection lives here
  raw_label      TEXT PRIMARY KEY,           -- 'Very Slightly Included Very Slightly Included'
  clarity_id     UUID NOT NULL REFERENCES clarities(id),
  is_doubled     BOOLEAN NOT NULL DEFAULT false,
  token_count    SMALLINT NOT NULL DEFAULT 1,
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
CREATE INDEX ON clarity_labels (clarity_id);

CREATE TABLE metals (
  code             metal_code PRIMARY KEY,
  label            TEXT NOT NULL,
  purity_label     TEXT,                       -- '14K', '950', '925'
  purity_value     NUMERIC(5,2),
  colour           TEXT,                       -- yellow|white|rose|platinum|silver
  is_two_tone      BOOLEAN NOT NULL DEFAULT false,
  secondary_colour TEXT,
  slug_phrase      TEXT NOT NULL UNIQUE,       -- '14k-yellow-white'
  sort_order       SMALLINT NOT NULL DEFAULT 100,
  state            record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status  evidence_status NOT NULL DEFAULT 'OBSERVED'
);
CREATE INDEX ON metals (colour) WHERE state = 'ACTIVE';

CREATE TABLE setting_styles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,         -- 'three_stone'
  label         TEXT NOT NULL,                -- 'Three Stone'
  slug          TEXT NOT NULL,                -- 'three-stone'
  description   TEXT,
  state         record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);

CREATE TABLE jewellery_types (
  code          jewellery_type PRIMARY KEY,
  label         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  uses_pair     BOOLEAN NOT NULL DEFAULT false,   -- INV-02
  uses_single   BOOLEAN NOT NULL DEFAULT false,   -- INV-03
  state         record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
-- Seed from evidence: EARRINGS.uses_pair = true;
--                       RING, PENDANT, NECKLACE, BRACELET.uses_single = true
```

### 8.6 Catalog core tables

```sql
-- GEMSTONE: individual inventory ------------------------------------------------
CREATE TABLE gemstones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gem_ref             TEXT NOT NULL UNIQUE,      -- 'K1324' | 'PR5681'
  kind                gemstone_kind NOT NULL,
  variety_id          UUID NOT NULL REFERENCES gemstone_varieties(id),
  species_id          UUID REFERENCES gemstone_species(id),

  total_weight_ct     NUMERIC(8,3) NOT NULL,     -- sum; for pairs the sum of both stones
  stone_count         SMALLINT NOT NULL DEFAULT 1 CHECK (stone_count IN (1,2)),
  length_mm           NUMERIC(8,3),
  width_mm            NUMERIC(8,3),
  depth_mm            NUMERIC(8,3),

  colour_id           UUID REFERENCES gemstone_colours(id),
  intensity_id        UUID REFERENCES colour_intensities(id),
  clarity_id          UUID REFERENCES clarities(id),
  shape               stone_shape,
  cut_label           TEXT,
  cutting_style       cutting_style,

  treatment_id        UUID REFERENCES treatments(id),
  origin_id           UUID REFERENCES gemstone_origins(id),

  price_per_carat     NUMERIC(12,2),
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  price_amount        NUMERIC(12,2),
  price_evidence      evidence_status NOT NULL DEFAULT 'UNKNOWN',

  availability        BOOLEAN NOT NULL DEFAULT true,
  availability_source TEXT,                     -- 'schema.org/InStock'
  availability_checked_at TIMESTAMPTZ,

  state               record_state NOT NULL DEFAULT 'ACTIVE',

  source_url          TEXT,
  source_slug         TEXT,
  ref_derived_from    TEXT,                     -- 'URL_SLUG' when gem_ref came from a slug
  ref_evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED',
  raw_spec            JSONB NOT NULL DEFAULT '{}'::jsonb,   -- verbatim spec strings
  search_document     TEXT NOT NULL DEFAULT '',             -- maintained by trigger below
  import_batch_id     UUID REFERENCES import_batches(id),
  version             INTEGER NOT NULL DEFAULT 1,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT gemstones_kind_ck CHECK (
    (kind = 'SINGLE' AND stone_count = 1) OR (kind = 'PAIR' AND stone_count = 2)
  ),
  CONSTRAINT gemstones_pair_weight_ck CHECK (kind <> 'PAIR' OR total_weight_ct > 0)
);
CREATE UNIQUE INDEX ON gemstones (gem_ref) WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (variety_id)                WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (colour_id, intensity_id)  WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (origin_id)                 WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (treatment_id)              WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (shape)                     WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (variety_id, price_amount)  WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones (variety_id, total_weight_ct) WHERE deleted_at IS NULL;
CREATE INDEX ON gemstones USING gin (raw_spec jsonb_path_ops);
CREATE INDEX ON gemstones (import_batch_id);

-- Search document, maintained by trigger. A Postgres expression index cannot
-- contain a subquery or reference another table, so the resolved label set is
-- materialised into search_document and indexed as a single-column expression.
CREATE OR REPLACE FUNCTION gemstones_search_document_fn() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.search_document := concat_ws(' ',
    NEW.gem_ref,
    coalesce(NEW.cut_label, ''),
    coalesce(NEW.shape::text, ''),
    coalesce(NEW.cutting_style::text, ''),
    (SELECT v.name       FROM gemstone_varieties v WHERE v.id = NEW.variety_id),
    (SELECT v.display_name FROM gemstone_varieties v WHERE v.id = NEW.variety_id),
    (SELECT c.name       FROM gemstone_colours  c WHERE c.id = NEW.colour_id),
    (SELECT i.name       FROM colour_intensities i WHERE i.id = NEW.intensity_id),
    (SELECT o.name       FROM gemstone_origins  o WHERE o.id = NEW.origin_id),
    (SELECT t.label      FROM treatments       t WHERE t.id = NEW.treatment_id),
    (SELECT cl.label     FROM clarities        cl WHERE cl.id = NEW.clarity_id));
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER gemstones_search_document_trg
  BEFORE INSERT OR UPDATE ON gemstones
  FOR EACH ROW EXECUTE FUNCTION gemstones_search_document_fn();

-- Full-text over the resolved label set (never over the raw doubled strings of D9).
CREATE INDEX ON gemstones USING gin (to_tsvector('english', search_document));

-- Per-stone measurements: fixes D9 and satisfies INV-06 -----------------------
CREATE TABLE gemstone_stones (          -- 1 row for SINGLE, 2 rows for PAIR
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gemstone_id       UUID NOT NULL REFERENCES gemstones(id) ON DELETE CASCADE,
  position          SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 2),
  weight_ct         NUMERIC(8,3) NOT NULL,
  length_mm         NUMERIC(8,3),
  width_mm          NUMERIC(8,3),
  depth_mm          NUMERIC(8,3),
  raw_weight_text   TEXT,               -- '2.87 Ct.' verbatim
  raw_dimensions_text TEXT,             -- 'Length: 9.84 Width: 7.82 Height: 5.32'
  parse_confidence  NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  evidence_status   evidence_status NOT NULL DEFAULT 'EXTRACTED',
  UNIQUE (gemstone_id, position)
);
CREATE INDEX ON gemstone_stones (gemstone_id);

-- SETTING: reusable design ----------------------------------------------------
CREATE TABLE settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_code       TEXT NOT NULL UNIQUE,        -- '1150' (numeric core)
  sku_prefix        TEXT NOT NULL DEFAULT 'JS',
  name              TEXT NOT NULL,               -- 'Pave'
  style_id          UUID REFERENCES setting_styles(id),
  jewellery_type    jewellery_type NOT NULL,
  description       TEXT,
  is_vedic          BOOLEAN NOT NULL DEFAULT false,
  side_stone_count  SMALLINT NOT NULL DEFAULT 0,
  source_url        TEXT,
  state             record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status   evidence_status NOT NULL DEFAULT 'OBSERVED',
  import_batch_id   UUID REFERENCES import_batches(id),
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE UNIQUE INDEX ON settings (design_code) WHERE deleted_at IS NULL;
CREATE INDEX ON settings (style_id, jewellery_type) WHERE deleted_at IS NULL;
CREATE INDEX ON settings (jewellery_type) WHERE deleted_at IS NULL;

-- SETTING VARIANT: design x metal, the sellable mount --------------------------
CREATE TABLE setting_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id        UUID NOT NULL REFERENCES settings(id),
  metal_code        metal_code NOT NULL,
  sku               TEXT NOT NULL UNIQUE,        -- 'JS1150W14'
  slug              TEXT NOT NULL UNIQUE,        -- '14k-white-gold-pave-ring-setting-js1150w14'
  base_price        NUMERIC(12,2),
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  price_evidence    evidence_status NOT NULL DEFAULT 'UNKNOWN',
  availability      BOOLEAN NOT NULL DEFAULT true,
  production_days   SMALLINT,                    -- [UNKNOWN] in source
  state             record_state NOT NULL DEFAULT 'ACTIVE',
  source_url        TEXT,
  evidence_status   evidence_status NOT NULL DEFAULT 'OBSERVED',
  import_batch_id   UUID REFERENCES import_batches(id),
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (setting_id, metal_code)
);
CREATE UNIQUE INDEX ON setting_variants (sku) WHERE deleted_at IS NULL;
CREATE INDEX ON setting_variants (setting_id) WHERE deleted_at IS NULL;
CREATE INDEX ON setting_variants (metal_code, state) WHERE deleted_at IS NULL;

-- Compatibility rules: deterministic DYO engine input --------------------------
CREATE TABLE setting_compatibility_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id             UUID NOT NULL REFERENCES settings(id) ON DELETE CASCADE,
  jewellery_type         jewellery_type,             -- NULL means any
  stone_kind             gemstone_kind,               -- SINGLE or PAIR required
  variety_id             UUID REFERENCES gemstone_varieties(id),
  colour_id              UUID REFERENCES gemstone_colours(id),
  shape                  stone_shape,
  min_weight_ct          NUMERIC(8,3),
  max_weight_ct          NUMERIC(8,3),
  min_length_mm          NUMERIC(8,3),
  max_length_mm          NUMERIC(8,3),
  min_width_mm           NUMERIC(8,3),
  max_width_mm           NUMERIC(8,3),
  requires_treatment_id  UUID REFERENCES treatments(id),
  forbids_treatment_id   UUID REFERENCES treatments(id),
  rule_kind              TEXT NOT NULL DEFAULT 'ALLOW'
                         CHECK (rule_kind IN ('ALLOW','DENY','REQUIRES_REVIEW')),
  priority               SMALLINT NOT NULL DEFAULT 100,
  explanation            TEXT NOT NULL,
  evidence_status        evidence_status NOT NULL DEFAULT 'INFERRED',
  source_url             TEXT,
  state                  record_state NOT NULL DEFAULT 'ACTIVE',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON setting_compatibility_rules (setting_id)   WHERE state = 'ACTIVE';
CREATE INDEX ON setting_compatibility_rules (variety_id)   WHERE state = 'ACTIVE';
CREATE INDEX ON setting_compatibility_rules (stone_kind, jewellery_type) WHERE state = 'ACTIVE';
-- Seeding strategy: derive ALLOW rules from the 1,024 observed (setting, stone)
-- pairs with evidence_status='EXTRACTED'. Everything outside stays UNKNOWN until
-- a curator reviews it. Never auto-generate DENY rules.

-- PRODUCT: the sellable unit ---------------------------------------------------
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                product_kind NOT NULL,
  product_number      BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  subtitle            TEXT,

  setting_variant_id  UUID REFERENCES setting_variants(id),
  gemstone_id         UUID REFERENCES gemstones(id),
  gemstone_pair_id    UUID REFERENCES gemstones(id),

  jewellery_type      jewellery_type NOT NULL,
  variety_id          UUID REFERENCES gemstone_varieties(id),
  colour_id           UUID REFERENCES gemstone_colours(id),

  total_weight_ct     NUMERIC(8,3),
  stone_count         SMALLINT NOT NULL DEFAULT 1,

  price_amount        NUMERIC(12,2) NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  price_evidence      evidence_status NOT NULL DEFAULT 'UNKNOWN',
  price_valid_until   DATE,

  state               product_state NOT NULL DEFAULT 'DRAFT',
  availability        BOOLEAN NOT NULL DEFAULT true,

  engraving_enabled   BOOLEAN NOT NULL DEFAULT false,   -- [UNKNOWN] in source
  engraving_text      TEXT,
  options             JSONB NOT NULL DEFAULT '{}'::jsonb,

  source_url          TEXT,
  source_slug         TEXT,
  source_sku          TEXT,                        -- observed SKU only
  source_sku_derived  TEXT,                        -- INFERRED from slug (3.1 Example B)
  sku_evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED',
  seo_title           TEXT,
  seo_description     TEXT,
  short_description   TEXT,
  description         TEXT,
  structured_extra    JSONB NOT NULL DEFAULT '{}'::jsonb,

  import_batch_id     UUID REFERENCES import_batches(id),
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  published_at        TIMESTAMPTZ
);
CREATE UNIQUE INDEX ON products (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON products (source_url) WHERE source_url IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX ON products (kind, state)              WHERE deleted_at IS NULL;
CREATE INDEX ON products (jewellery_type, state)    WHERE deleted_at IS NULL;
CREATE INDEX ON products (variety_id, state)        WHERE deleted_at IS NULL;
CREATE INDEX ON products (colour_id, state)         WHERE deleted_at IS NULL;
CREATE INDEX ON products (price_amount)             WHERE deleted_at IS NULL AND state = 'ACTIVE';
CREATE INDEX ON products (total_weight_ct)          WHERE deleted_at IS NULL;
CREATE INDEX ON products (setting_variant_id)       WHERE deleted_at IS NULL;
CREATE INDEX ON products (gemstone_id)              WHERE deleted_at IS NULL;
CREATE INDEX ON products USING gin (options jsonb_path_ops)   WHERE deleted_at IS NULL;
CREATE INDEX ON products USING gin (
  (setweight(to_tsvector('english',
     coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(short_description,'')), 'A'))
);

-- INV-01 / INV-02 / INV-03 as database constraints
ALTER TABLE products ADD CONSTRAINT products_composition_ck CHECK (
  CASE kind
    WHEN 'CONFIGURED' THEN
      setting_variant_id IS NOT NULL
      AND ((gemstone_id IS NOT NULL AND gemstone_pair_id IS NULL)
        OR (gemstone_id IS NULL AND gemstone_pair_id IS NOT NULL))
    WHEN 'SETTING_ONLY' THEN
      setting_variant_id IS NOT NULL AND gemstone_id IS NULL AND gemstone_pair_id IS NULL
    ELSE setting_variant_id IS NULL
  END
);
ALTER TABLE products ADD CONSTRAINT products_no_pair_on_non_earrings_ck CHECK (
  gemstone_pair_id IS NULL OR jewellery_type = 'EARRINGS'
);
ALTER TABLE products ADD CONSTRAINT products_earrings_need_pair_ck CHECK (
  jewellery_type <> 'EARRINGS' OR kind <> 'CONFIGURED' OR gemstone_pair_id IS NOT NULL
);

-- Typed product-gemstone relation (side stones, extra stones) -----------------
CREATE TABLE product_gemstones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  gemstone_id UUID NOT NULL REFERENCES gemstones(id),
  role        TEXT NOT NULL DEFAULT 'SIDE'
              CHECK (role IN ('PRIMARY','PAIR','SIDE','ACCENT')),
  position    SMALLINT NOT NULL DEFAULT 1,
  quantity    SMALLINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, gemstone_id, role, position)
);
CREATE INDEX ON product_gemstones (gemstone_id);
```

---

### 8.7 DYO tables

```sql
CREATE TABLE dyo_configurations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_hash    TEXT NOT NULL,
  short_code            TEXT NOT NULL UNIQUE,     -- base62 share code
  jewellery_type        jewellery_type NOT NULL,

  setting_id            UUID REFERENCES settings(id),
  setting_variant_id    UUID REFERENCES setting_variants(id),
  gemstone_id           UUID REFERENCES gemstones(id),
  gemstone_pair_id      UUID REFERENCES gemstones(id),
  side_stones           JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [UNKNOWN] in source
  engraving_text        TEXT,

  selected_options      JSONB NOT NULL DEFAULT '{}'::jsonb,
  state                 dyo_state NOT NULL DEFAULT 'DRAFT',
  compatibility_status  compatibility_result NOT NULL DEFAULT 'UNKNOWN',
  compatibility_detail  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- per-rule explanations
  compatibility_checked_at TIMESTAMPTZ,

  hash_version          SMALLINT NOT NULL DEFAULT 1,
  state_version         INTEGER NOT NULL DEFAULT 1,

  anonymous_session_id  TEXT,
  customer_id           UUID,      -- FK added in section 8.9 (customers is created there)

  source_reference      TEXT,                     -- migrated source SKU or URL
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ,

  CONSTRAINT dyo_one_stone_ck CHECK (
    (gemstone_id IS NOT NULL AND gemstone_pair_id IS NULL)
    OR (gemstone_id IS NULL AND gemstone_pair_id IS NOT NULL)
    OR (gemstone_id IS NULL AND gemstone_pair_id IS NULL)
  ),
  CONSTRAINT dyo_pair_is_earrings_ck CHECK (
    gemstone_pair_id IS NULL OR jewellery_type = 'EARRINGS'
  )
);
CREATE UNIQUE INDEX ON dyo_configurations (configuration_hash)
  WHERE state <> 'EXPIRED';
CREATE INDEX ON dyo_configurations (anonymous_session_id, updated_at DESC);
CREATE INDEX ON dyo_configurations (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX ON dyo_configurations (state, updated_at DESC);

CREATE TABLE dyo_price_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id     UUID NOT NULL REFERENCES dyo_configurations(id) ON DELETE CASCADE,
  gemstone_component   NUMERIC(12,2) NOT NULL DEFAULT 0,
  setting_component    NUMERIC(12,2) NOT NULL DEFAULT 0,
  side_stone_component NUMERIC(12,2) NOT NULL DEFAULT 0,
  making_component     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_component   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_component        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                NUMERIC(12,2) NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  pricing_rule_version TEXT NOT NULL,
  breakdown            JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ
);
CREATE INDEX ON dyo_price_snapshots (configuration_id, computed_at DESC);
CREATE INDEX ON dyo_price_snapshots (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE dyo_quotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_token       TEXT NOT NULL UNIQUE,
  configuration_id  UUID NOT NULL REFERENCES dyo_configurations(id),
  price_snapshot_id UUID NOT NULL REFERENCES dyo_price_snapshots(id),
  idempotency_key   TEXT UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON dyo_quotes (expires_at);
```

### 8.8 Pricing tables

```sql
CREATE TABLE price_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  state       record_state NOT NULL DEFAULT 'ACTIVE',
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE price_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id   UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL
                  CHECK (subject_type IN ('GEMSTONE','SETTING_VARIANT','PRODUCT','SIDE_STONE','ADDON')),
  subject_id      UUID NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  cost_component  NUMERIC(12,2),                 -- internal, never exposed
  evidence_status evidence_status NOT NULL DEFAULT 'INFERRED',
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON price_entries (price_list_id, subject_type, subject_id, valid_from);
CREATE INDEX ON price_entries (subject_type, subject_id, valid_to);

-- Records the verified observation that price != weight * per_carat (0/1024).
CREATE TABLE price_model_observations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id),
  source_url      TEXT NOT NULL,
  observed_total  NUMERIC(12,2) NOT NULL,
  observed_weight NUMERIC(8,3),
  observed_ppc    NUMERIC(12,2),
  gem_component   NUMERIC(12,2),
  implied_making  NUMERIC(12,2),
  ratio           NUMERIC(8,4),
  import_batch_id UUID REFERENCES import_batches(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON price_model_observations (source_url);
```

### 8.9 Commerce tables

```sql
CREATE TABLE customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_user_id   TEXT UNIQUE,              -- managed auth provider subject
  email              CITEXT UNIQUE,
  email_verified_at  TIMESTAMPTZ,
  phone              TEXT,
  first_name         TEXT,
  last_name          TEXT,
  marketing_opt_in   BOOLEAN NOT NULL DEFAULT false,
  accepts_cookies    BOOLEAN NOT NULL DEFAULT false,
  astrology_opt_in   BOOLEAN NOT NULL DEFAULT false,   -- Vedic vertical, FR-CMS-03
  preferred_currency CHAR(3) NOT NULL DEFAULT 'USD',
  state              record_state NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);
CREATE UNIQUE INDEX ON customers (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX ON customers (identity_user_id) WHERE identity_user_id IS NOT NULL;

CREATE TABLE customer_profiles (
  customer_id           UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  birth_date            DATE,
  birth_place           TEXT,
  zodiac_sign           TEXT,
  birth_chart_reference TEXT,
  ring_size             NUMERIC(3,1),         -- [UNKNOWN] in source; customer-entered
  notes                 TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id),
  kind         TEXT NOT NULL CHECK (kind IN ('SHIPPING','BILLING','SHOWROOM','PICKUP')),
  full_name    TEXT NOT NULL,
  recipient    TEXT,
  line1        TEXT, line2 TEXT, line3 TEXT,
  city         TEXT NOT NULL, region TEXT, postal_code TEXT,
  country_code CHAR(2) NOT NULL DEFAULT 'US',
  phone        TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX ON addresses (customer_id) WHERE deleted_at IS NULL;

CREATE TABLE carts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_token           TEXT NOT NULL UNIQUE,
  customer_id          UUID REFERENCES customers(id),
  anonymous_session_id TEXT,
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  state                cart_state NOT NULL DEFAULT 'ACTIVE',
  pricing_snapshot     JSONB,                  -- advisory only, never authoritative
  expires_at           TIMESTAMPTZ NOT NULL,
  converted_order_id   UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON carts (customer_id, state);
CREATE INDEX ON carts (anonymous_session_id, state);
CREATE INDEX ON carts (expires_at) WHERE state = 'ACTIVE';

CREATE TABLE cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id           UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  configuration_id  UUID REFERENCES dyo_configurations(id),
  quantity          SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price        NUMERIC(12,2) NOT NULL,
  price_snapshot_id UUID REFERENCES dyo_price_snapshots(id),
  engraving_text    TEXT,
  options           JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, configuration_id)
);
CREATE INDEX ON cart_items (cart_id);

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT NOT NULL UNIQUE,
  customer_id      UUID REFERENCES customers(id),
  email            TEXT NOT NULL,
  state            order_state NOT NULL DEFAULT 'PENDING_PAYMENT',
  currency         CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal         NUMERIC(12,2) NOT NULL,
  discount_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total      NUMERIC(12,2) NOT NULL,
  pricing_snapshot JSONB NOT NULL,             -- frozen and auditable
  shipping_address JSONB NOT NULL,
  billing_address  JSONB,
  customer_note    TEXT,
  internal_note    TEXT,
  placed_at        TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  fulfilled_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  idempotency_key  TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON orders (customer_id, created_at DESC);
CREATE INDEX ON orders (state, created_at DESC);
CREATE INDEX ON orders (placed_at DESC);

-- Deferred foreign key: dyo_configurations is created in section 8.7, before
-- customers exists here in section 8.9. Declared at the point both sides exist
-- so that schema application order is strictly one-pass and acyclic.
ALTER TABLE dyo_configurations
  ADD CONSTRAINT dyo_configurations_customer_fk
  FOREIGN KEY (customer_id) REFERENCES customers(id);

CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id              UUID REFERENCES products(id),
  configuration_id        UUID REFERENCES dyo_configurations(id),
  sku_snapshot            TEXT NOT NULL,
  title_snapshot          TEXT NOT NULL,
  configuration_snapshot  JSONB,               -- full immutable config at order time
  gem_snapshot            JSONB NOT NULL,      -- stone specs as sold
  document_snapshot       JSONB,               -- certificate references as sold
  quantity                SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price              NUMERIC(12,2) NOT NULL,
  line_total              NUMERIC(12,2) NOT NULL,
  production_days         SMALLINT,
  state                   TEXT NOT NULL DEFAULT 'PENDING',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON order_items (order_id);
CREATE INDEX ON order_items (product_id);

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  provider            TEXT NOT NULL,            -- [UNKNOWN] in source
  provider_payment_id TEXT UNIQUE,
  state               payment_state NOT NULL DEFAULT 'CREATED',
  amount              NUMERIC(12,2) NOT NULL,
  captured_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  refunded_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  method_type         TEXT,                      -- card, financing, wallet
  method_last4        TEXT,
  failure_code        TEXT,
  failure_message     TEXT,
  idempotency_key     TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at         TIMESTAMPTZ
);
CREATE INDEX ON payments (order_id, state);
CREATE INDEX ON payments (provider, provider_payment_id);

CREATE TABLE refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID NOT NULL REFERENCES payments(id),
  order_id          UUID NOT NULL REFERENCES orders(id),
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  reason            TEXT NOT NULL,
  state             refund_state NOT NULL DEFAULT 'REQUESTED',
  provider_refund_id TEXT,
  requested_by      UUID,
  approved_by       UUID,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ
);
CREATE INDEX ON refunds (order_id, state);

CREATE TABLE discounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT UNIQUE,
  name               TEXT NOT NULL,
  type               discount_type NOT NULL,
  value              NUMERIC(12,2),
  currency           CHAR(3),
  scope              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- varieties, categories, products
  min_subtotal       NUMERIC(12,2),
  max_redemptions    INTEGER,
  redemption_count   INTEGER NOT NULL DEFAULT 0,
  per_customer_limit SMALLINT,
  valid_from         TIMESTAMPTZ NOT NULL,
  valid_to           TIMESTAMPTZ,
  state              record_state NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discounts_code_ck CHECK (code IS NULL OR code <> '')
);
CREATE INDEX ON discounts (state, valid_from, valid_to);

-- Financing and protection plan: FR-COM-04, observed via /financing and
-- /extend-protection-plan.
CREATE TABLE product_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id),
  addon_type  discount_type NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  state       record_state NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fulfillments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID REFERENCES order_items(id),
  kind            TEXT NOT NULL CHECK (kind IN
                    ('SHIPMENT','PICKUP','APPRAISAL','ENGRAVING','CERTIFICATE','WHITE_GLOVE_VIDEO')),
  carrier         TEXT, tracking_number TEXT, tracking_url TEXT,
  state           TEXT NOT NULL DEFAULT 'PENDING',
  shipped_at      TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON fulfillments (order_id, kind);

CREATE TABLE order_events (                -- append-only state timeline
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  from_state  order_state,
  to_state    order_state NOT NULL,
  actor_type  TEXT NOT NULL,
  actor_id    UUID,
  reason      TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON order_events (order_id, id);
```

### 8.10 Trust and certificate tables

```sql
CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               document_kind NOT NULL,
  gemstone_id        UUID REFERENCES gemstones(id) ON DELETE CASCADE,
  configuration_id   UUID REFERENCES dyo_configurations(id) ON DELETE SET NULL,
  product_id         UUID REFERENCES products(id) ON DELETE SET NULL,
  lab_name           TEXT,                    -- [UNKNOWN] in source
  certificate_number TEXT,
  issue_date         DATE,
  report_type        TEXT,                    -- e.g. 'SARIN', observed in paths only
  verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED',
  confidence_overall NUMERIC(4,3),
  state              record_state NOT NULL DEFAULT 'ACTIVE',
  source_url         TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,
  CONSTRAINT certificates_subject_ck CHECK (
    num_nonnulls(gemstone_id, configuration_id, product_id) >= 1
  )
);
CREATE INDEX ON certificates (gemstone_id) WHERE deleted_at IS NULL;
CREATE INDEX ON certificates (verification_status);
CREATE INDEX ON certificates (certificate_number) WHERE certificate_number IS NOT NULL;

CREATE TABLE certificate_ocr_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  run_id           UUID NOT NULL UNIQUE,
  provider         ai_provider NOT NULL,
  model_name       TEXT NOT NULL,
  model_version    TEXT NOT NULL,
  status           job_state NOT NULL DEFAULT 'QUEUED',
  input_asset_id   UUID,
  fields_extracted SMALLINT NOT NULL DEFAULT 0,
  mean_confidence  NUMERIC(4,3),
  raw_response     JSONB,                     -- retained for audit
  cost_usd         NUMERIC(10,6),
  latency_ms       INTEGER,
  error_message    TEXT,
  started_at       TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON certificate_ocr_runs (certificate_id, created_at DESC);
CREATE INDEX ON certificate_ocr_runs (status) WHERE status IN ('QUEUED','RUNNING');

-- One row per extracted field: this table is what makes INV-07 enforceable.
CREATE TABLE certificate_extractions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  run_id           UUID NOT NULL,
  field_name       TEXT NOT NULL,      -- weight_ct, origin, treatment, lab_name, ...
  raw_text         TEXT,
  normalized_value TEXT,
  numeric_value    NUMERIC(14,4),
  confidence       NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  bbox             JSONB,
  page_number      SMALLINT,
  model_provider   ai_provider NOT NULL,
  model_name       TEXT NOT NULL,
  model_version    TEXT NOT NULL,
  prompt_version   TEXT NOT NULL,
  extracted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence_status  evidence_status NOT NULL DEFAULT 'INFERRED',
  -- Per-field verification, distinct from evidence_status. A reviewer's
  -- override of one field must not change the document-level status, and a
  -- document may be VERIFIED only if every material field is VERIFIED.
  verification_status verification_status NOT NULL DEFAULT 'EXTRACTED',
  UNIQUE (certificate_id, run_id, field_name)
);
CREATE INDEX ON certificate_extractions (certificate_id, field_name);
CREATE INDEX ON certificate_extractions (confidence) WHERE confidence < 0.85;

CREATE TABLE certificate_anomalies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  run_id       UUID,
  anomaly_type TEXT NOT NULL,   -- WEIGHT_MISMATCH_SLUG, ORIGIN_CONFLICT,
                                -- DIMENSION_IMPOSSIBLE, TREATMENT_CONFLICT, LOW_CONFIDENCE
  severity     TEXT NOT NULL CHECK (severity IN ('INFO','WARN','ERROR')),
  detail       JSONB NOT NULL,
  resolved_at  TIMESTAMPTZ, resolved_by UUID, resolution TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON certificate_anomalies (certificate_id) WHERE resolved_at IS NULL;
CREATE INDEX ON certificate_anomalies (severity) WHERE resolved_at IS NULL;

CREATE TABLE certificate_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  reviewer_id       UUID NOT NULL,
  decision          TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT','REQUEST_CHANGES')),
  notes             TEXT,
  fields_overridden JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON certificate_reviews (certificate_id, created_at DESC);

CREATE TABLE verification_events (          -- append-only trust ledger
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  certificate_id UUID REFERENCES certificates(id),
  gemstone_id    UUID REFERENCES gemstones(id),
  product_id     UUID REFERENCES products(id),
  event_type     TEXT NOT NULL,   -- UPLOADED, EXTRACTED, CROSS_CHECKED, APPROVED, REJECTED, SUPERSEDED
  from_status    verification_status,
  to_status      verification_status NOT NULL,
  actor_type     TEXT NOT NULL,
  actor_id       UUID,
  detail         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON verification_events (certificate_id, id);
CREATE INDEX ON verification_events (gemstone_id, id);
```

### 8.11 Asset and media tables

```sql
CREATE TABLE assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              media_kind NOT NULL,
  role              media_role NOT NULL DEFAULT 'OTHER',
  storage_provider  TEXT NOT NULL DEFAULT 'r2',
  storage_key       TEXT UNIQUE,             -- 'products/stones/k1324/primary-01.webp'
  source_url        TEXT NOT NULL,           -- preserved verbatim (241,961 rows)
  source_host       TEXT,                    -- denormalised for filtering
  source_path_stem  TEXT,                    -- 'stone/k1324/cert'
  cdn_url           TEXT,
  mime_type         TEXT,
  bytes             BIGINT,
  width             INTEGER, height INTEGER,
  checksum_sha256   TEXT,
  alt_text          TEXT, title TEXT,
  position          SMALLINT NOT NULL DEFAULT 0,
  srcset_raw        TEXT,
  processing_state  asset_processing_state NOT NULL DEFAULT 'PENDING',
  processing_error  TEXT,
  provenance_kind   provenance_kind NOT NULL DEFAULT 'SOURCE_CRAWL',
  evidence_status   evidence_status NOT NULL DEFAULT 'OBSERVED',
  import_batch_id   UUID REFERENCES import_batches(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX ON assets (source_url);
CREATE INDEX ON assets (source_path_stem);
CREATE INDEX ON assets (processing_state) WHERE processing_state IN ('PENDING','FETCHING','FAILED');
CREATE INDEX ON assets (checksum_sha256);
CREATE INDEX ON assets (kind, role) WHERE deleted_at IS NULL;
CREATE INDEX ON assets USING gin (to_tsvector('english', coalesce(alt_text,'') || ' ' || coalesce(title,'')));

CREATE TABLE asset_variants (              -- derived renditions
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,      -- 'thumb-200','hero-750','zoom-1500','webp','avif'
  width        INTEGER, height INTEGER,
  format       TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  cdn_url      TEXT,
  bytes        BIGINT,
  quality      SMALLINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, variant_name)
);
CREATE INDEX ON asset_variants (asset_id);

-- Replaces the untyped 397,727-row relationship dump with intent-revealing rows.
CREATE TABLE asset_usages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,      -- PRODUCT | GEMSTONE | SETTING_VARIANT | COLLECTION | PAGE | KNOWLEDGE_DOCUMENT
  entity_id   UUID NOT NULL,
  role        media_role NOT NULL DEFAULT 'GALLERY',
  position    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, entity_type, entity_id, role, position)
);
CREATE INDEX ON asset_usages (entity_type, entity_id, role, position);

CREATE TABLE webar_assets (                -- target-only; see section 21
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id           UUID REFERENCES assets(id),
  product_id         UUID REFERENCES products(id),
  setting_variant_id UUID REFERENCES setting_variants(id),
  jewellery_type     jewellery_type NOT NULL,
  model_format       TEXT NOT NULL CHECK (model_format IN ('GLB','GLTF')),
  compression        TEXT CHECK (compression IN ('DRACO','MESHOPT','NONE')),
  storage_key        TEXT NOT NULL,
  cdn_url            TEXT NOT NULL,
  hdr_env_key        TEXT,
  texture_max_px     INTEGER NOT NULL DEFAULT 1024,
  poly_count         INTEGER,
  vertex_count       INTEGER,
  file_bytes         BIGINT,
  fit_rule           JSONB NOT NULL DEFAULT '{}'::jsonb,   -- anchor, scale, rotation per type
  state              asset_processing_state NOT NULL DEFAULT 'PENDING',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON webar_assets (jewellery_type, state);

CREATE TABLE ar_handoff_tokens (           -- QR desktop to mobile; hash stored only
  token_hash     TEXT PRIMARY KEY,
  product_id     UUID REFERENCES products(id),
  webar_asset_id UUID REFERENCES webar_assets(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ,
  uses           SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX ON ar_handoff_tokens (expires_at);
```

### 8.12 CMS tables

```sql
CREATE TABLE pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  page_kind     TEXT NOT NULL,      -- STATIC | EDUCATION | BLOG | POLICY | LANDING | SHOWROOM
  status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  blocks        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- typed ContentBlock array
  raw_markdown  TEXT,
  hero_asset_id UUID REFERENCES assets(id),
  template      TEXT NOT NULL DEFAULT 'default',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  version       INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX ON pages (slug) WHERE deleted_at IS NULL;
CREATE INDEX ON pages (page_kind, status) WHERE deleted_at IS NULL;
CREATE INDEX ON pages USING gin (blocks jsonb_path_ops);
CREATE INDEX ON pages USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(raw_markdown,'')));

CREATE TABLE page_revisions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  blocks       JSONB NOT NULL,
  raw_markdown TEXT,
  editor_id    UUID,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, version)
);

CREATE TABLE navigations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL,      -- 'header','footer','mega_menu','mobile'
  label      TEXT NOT NULL,
  items      JSONB NOT NULL,     -- nested [{label,href,children,variety_id,external}]
  locale     TEXT NOT NULL DEFAULT 'en',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, locale)
);

CREATE TABLE redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   TEXT NOT NULL UNIQUE,
  to_path     TEXT NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON redirects (from_path);

CREATE TABLE seo_metadata (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind      seo_entity_kind NOT NULL,
  entity_id        UUID NOT NULL,
  title            TEXT,
  description      TEXT,
  canonical_path   TEXT,
  og_image_url     TEXT,
  robots           TEXT,
  noindex          BOOLEAN NOT NULL DEFAULT false,
  structured_extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_kind, entity_id)
);
```

### 8.13 AI tables

```sql
CREATE TABLE conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_key   TEXT NOT NULL UNIQUE,
  channel            conversation_channel NOT NULL,
  state              conversation_state NOT NULL DEFAULT 'OPEN',
  customer_id        UUID REFERENCES customers(id),
  external_ref       TEXT,               -- WhatsApp thread key
  locale             TEXT NOT NULL DEFAULT 'en',
  handoff_reason     handoff_reason,
  handed_off_at      TIMESTAMPTZ,
  assigned_agent_id  UUID,
  summary            TEXT,
  summary_model      ai_provider,
  summary_at         TIMESTAMPTZ,
  message_count      INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at          TIMESTAMPTZ,
  UNIQUE (channel, external_ref)
);
CREATE INDEX ON conversations (customer_id, updated_at DESC);
CREATE INDEX ON conversations (state, updated_at DESC) WHERE state <> 'CLOSED';
CREATE INDEX ON conversations (channel, state);

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  seq              INTEGER NOT NULL,
  role             message_role NOT NULL,
  content          TEXT NOT NULL,
  content_redacted TEXT,                 -- PII-scrubbed copy for training and eval
  model_provider   ai_provider,
  model_name       TEXT,
  model_version    TEXT,
  prompt_version   TEXT,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  cached_tokens    INTEGER,
  cost_usd         NUMERIC(10,6),
  latency_ms       INTEGER,
  finish_reason    TEXT,
  citations        JSONB NOT NULL DEFAULT '[]'::jsonb,
  guardrail_flags  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, seq)
);
CREATE INDEX ON messages (conversation_id, seq);

CREATE TABLE tool_calls (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id             UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id        UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name              TEXT NOT NULL,
  tool_version           TEXT NOT NULL,
  input                  JSONB NOT NULL,
  output                 JSONB,
  output_redacted        JSONB,
  authorization_decision TEXT NOT NULL,   -- ALLOW | DENY | ALLOW_SCOPED
  authorization_reason   TEXT,
  actor_type             TEXT NOT NULL,
  actor_id               UUID,
  latency_ms             INTEGER,
  cost_usd               NUMERIC(10,6),
  error_code             TEXT,
  error_message          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON tool_calls (tool_name, created_at DESC);
CREATE INDEX ON tool_calls (conversation_id, created_at);
CREATE INDEX ON tool_calls (error_code) WHERE error_code IS NOT NULL;
CREATE INDEX ON tool_calls (authorization_decision) WHERE authorization_decision = 'DENY';

CREATE TABLE knowledge_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  doc_kind         TEXT NOT NULL,   -- EDUCATION | FAQ | GUIDE | VARIETY | TREATMENT | POLICY | JOURNAL
  variety_id       UUID REFERENCES gemstone_varieties(id),
  locale           TEXT NOT NULL DEFAULT 'en',
  source_page_id   UUID REFERENCES pages(id),
  content          TEXT NOT NULL,
  trust_tier       TEXT NOT NULL DEFAULT 'CURATED'
                   CHECK (trust_tier IN ('VERIFIED_PRODUCT_DATA','CURATED','COMMUNITY','UNVERIFIED')),
  status           TEXT NOT NULL DEFAULT 'ACTIVE',
  checksum_sha256  TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  embedded_at      TIMESTAMPTZ,
  embedding_model  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
CREATE INDEX ON knowledge_documents (doc_kind, status) WHERE deleted_at IS NULL;
CREATE INDEX ON knowledge_documents (variety_id) WHERE variety_id IS NOT NULL;

CREATE TABLE knowledge_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  ordinal         INTEGER NOT NULL,
  content         TEXT NOT NULL,
  token_count     INTEGER NOT NULL,
  heading_path    TEXT[],
  embedding       vector(1024),
  embedding_model TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, ordinal)
);
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX ON knowledge_chunks USING gin (to_tsvector('english', content));

CREATE TABLE product_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  embedding       vector(1024) NOT NULL,
  embedding_model TEXT NOT NULL,
  content_hash    TEXT NOT NULL,      -- drives invalidation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, embedding_model)
);
CREATE INDEX ON product_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE TABLE ai_interactions (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id         TEXT NOT NULL UNIQUE,
  conversation_id    UUID REFERENCES conversations(id),
  channel            conversation_channel NOT NULL,
  surface            TEXT NOT NULL,   -- 'chat_panel','whatsapp','admin_assist','search_assist'
  intent             TEXT,
  provider           ai_provider NOT NULL,
  model_name         TEXT NOT NULL,
  model_version      TEXT,
  prompt_version     TEXT NOT NULL,
  input_tokens       INTEGER,
  output_tokens      INTEGER,
  cached_tokens      INTEGER,
  cost_usd           NUMERIC(10,6),
  latency_ms         INTEGER,
  ttfb_ms            INTEGER,
  tool_call_count    SMALLINT NOT NULL DEFAULT 0,
  guardrail_action   TEXT,            -- ALLOW | SANITIZE | BLOCK | ESCALATE
  grounded_ratio     NUMERIC(4,3),    -- cited claims / total claims
  handoff_triggered  BOOLEAN NOT NULL DEFAULT false,
  error_code         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_interactions (created_at DESC);
CREATE INDEX ON ai_interactions (surface, created_at DESC);
CREATE INDEX ON ai_interactions (model_name, created_at DESC);
CREATE INDEX ON ai_interactions (handoff_triggered) WHERE handoff_triggered;

CREATE TABLE ai_evaluations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_suite TEXT NOT NULL,
  case_id    TEXT NOT NULL,
  run_id     UUID NOT NULL,
  model_name TEXT,
  prompt_version TEXT,
  expected   JSONB NOT NULL,
  actual     JSONB,
  passed     BOOLEAN NOT NULL,
  dimension  TEXT NOT NULL,   -- factuality, tool_selection, price_safety, refusal, citation, escalation
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eval_suite, case_id, run_id)
);
CREATE INDEX ON ai_evaluations (eval_suite, dimension, passed);

CREATE TABLE guardrail_events (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  interaction_id   BIGINT REFERENCES ai_interactions(id),
  conversation_id  UUID REFERENCES conversations(id),
  rule_id          TEXT NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('ALLOW','SANITIZE','BLOCK','ESCALATE')),
  trigger_text_hash TEXT,           -- hash only, never raw PII
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON guardrail_events (rule_id, created_at DESC);
CREATE INDEX ON guardrail_events (action, created_at DESC);
```

### 8.14 Operations tables

```sql
CREATE TABLE domain_events (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id          UUID NOT NULL UNIQUE,
  event_type        TEXT NOT NULL,
  aggregate_type    TEXT NOT NULL,
  aggregate_id      UUID NOT NULL,
  aggregate_version INTEGER,
  payload           JSONB NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  trace_id          TEXT,
  status            domain_event_status NOT NULL DEFAULT 'PENDING',
  attempts          SMALLINT NOT NULL DEFAULT 0,
  last_error        TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at      TIMESTAMPTZ,
  available_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- domain_events is append-only: the application role receives no UPDATE or DELETE grant.
CREATE INDEX ON domain_events (status, available_at) WHERE status = 'PENDING';
CREATE INDEX ON domain_events (aggregate_type, aggregate_id, id);
CREATE INDEX ON domain_events (event_type, occurred_at DESC);
CREATE INDEX ON domain_events USING gin (payload);

CREATE TABLE event_consumers (             -- idempotent consumer offsets
  consumer_name TEXT NOT NULL,
  event_id      BIGINT NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);

CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key      TEXT UNIQUE,               -- idempotency
  queue        TEXT NOT NULL,
  job_type     TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  state        job_state NOT NULL DEFAULT 'QUEUED',
  priority     SMALLINT NOT NULL DEFAULT 100,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  locked_by    TEXT,
  locked_until TIMESTAMPTZ,
  run_after    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error   TEXT,
  result       JSONB,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON jobs (queue, state, run_after) WHERE state = 'QUEUED';
CREATE INDEX ON jobs (state, updated_at DESC) WHERE state IN ('RUNNING','FAILED');
CREATE INDEX ON jobs USING gin (payload);

CREATE TABLE audit_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type    TEXT NOT NULL,      -- CUSTOMER | ADMIN | SYSTEM | AI | JOB
  actor_id      UUID,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  before_state  JSONB,
  after_state   JSONB,
  diff          JSONB,
  ip_hash       TEXT,
  user_agent_hash TEXT,
  trace_id      TEXT,
  request_id    TEXT,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_logs (entity_type, entity_id, id DESC);
CREATE INDEX ON audit_logs (actor_type, actor_id, id DESC);
CREATE INDEX ON audit_logs (created_at DESC);
-- Append-only: no UPDATE or DELETE grants for the application role.

CREATE TABLE webhook_receipts (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider          TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  signature_valid   BOOLEAN NOT NULL,
  event_type        TEXT,
  payload           JSONB NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  processing_error  TEXT,
  UNIQUE (provider, external_event_id)
);
CREATE INDEX ON webhook_receipts (provider, processed_at) WHERE processed_at IS NULL;

CREATE TABLE rate_limit_counters (
  bucket       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE TABLE feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  rollout_pct SMALLINT NOT NULL DEFAULT 0,
  rules       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);
```

### 8.15 Vector search function

```sql
-- Embedding dimension 1024 is a deliberate single-dimension choice (ADR-018).
-- Changing it requires a full re-embed plus an HNSW rebuild.
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1024),
  query_text      text,
  match_count     int  DEFAULT 10,
  filter_doc_kind text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id      uuid,
  document_id   uuid,
  document_slug text,
  title         text,
  content       text,
  heading_path  text[],
  similarity    double precision,
  text_rank     real,
  trust_tier    text
)
LANGUAGE sql STABLE AS $$
  WITH semantic AS (
    SELECT c.id, c.document_id, c.content, c.heading_path,
           1 - (c.embedding <=> query_embedding) AS sim
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c.document_id
    WHERE d.deleted_at IS NULL
      AND (filter_doc_kind IS NULL OR d.doc_kind = ANY(filter_doc_kind))
    ORDER BY c.embedding <=> query_embedding
    LIMIT GREATEST(match_count * 4, 40)
  ),
  lexical AS (
    SELECT c.id,
           ts_rank_cd(to_tsvector('english', c.content),
                      websearch_to_tsquery('english', query_text)) AS trank
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c.document_id
    WHERE d.deleted_at IS NULL
      AND query_text <> ''
      AND to_tsvector('english', c.content) @@ websearch_to_tsquery('english', query_text)
    LIMIT GREATEST(match_count * 4, 40)
  )
  SELECT s.id, d.id, d.slug, d.title, s.content, s.heading_path,
         s.sim, COALESCE(l.trank, 0)::real, d.trust_tier
  FROM semantic s
  JOIN knowledge_documents d ON d.id = s.document_id
  LEFT JOIN lexical l ON l.id = s.id
  ORDER BY (s.sim * 0.6 + COALESCE(l.trank, 0) * 0.4) DESC
  LIMIT match_count;
$$;
```

### 8.16 Row-Level Security

Neon connects over the network, so RLS is defence-in-depth for customer data rather than the primary boundary. The primary boundary is the application service layer.

```sql
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Every table with RLS enabled MUST have at least one policy. Enabling RLS
-- without a policy denies all rows to non-superusers, which would silently
-- break addresses, carts, conversations and messages. Verified in Phase 0.

CREATE POLICY customers_own ON customers
  USING (identity_user_id = current_setting('app.user_subject', true));

CREATE POLICY addresses_own ON addresses
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE identity_user_id = current_setting('app.user_subject', true)
  ));

CREATE POLICY carts_own ON carts
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE identity_user_id = current_setting('app.user_subject', true)
    )
    OR anonymous_session_id = current_setting('app.anonymous_session_id', true)
  );

CREATE POLICY orders_own ON orders
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE identity_user_id = current_setting('app.user_subject', true)
  ));

CREATE POLICY conversations_own ON conversations
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE identity_user_id = current_setting('app.user_subject', true)
    )
    OR current_setting('app.staff', true) = 'true'
  );

CREATE POLICY messages_own ON messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE customer_id IN (
      SELECT id FROM customers
      WHERE identity_user_id = current_setting('app.user_subject', true)
    )
  ));

-- Admin access uses a separate BYPASSRLS role; every bypass is still recorded
-- in audit_logs by the service layer.
```

`app.staff` is set by the application service after an admin authorization check, never from client input. Anonymous cart access is scoped to the server-held `app.anonymous_session_id`; it is not derivable from anything the client asserts beyond the session cookie.

---

## 9. ERD

```
 gemstone_species      gemstone_colours(parent)   colour_intensities
        |                      |                          |
        v                      v                          |
 gemstone_varieties -----------+---------------+----------+
        |                                   |
        |        gemstone_origins      treatments        clarities
        |              |                   |                |
        +---------+----+-------------------+----------------+
                  v
          +-------------+         +------------------+
          |  gemstones  |<--------| gemstone_stones  |   (1 row single, 2 rows pair)
          +------+------+         +------------------+
                 | 1
                 |
                 |  +--------------------------------+
                 |  | certificates                    |
                 |  |  + certificate_ocr_runs         |
                 |  |  + certificate_extractions      |
                 |  |  + certificate_anomalies        |
                 |  |  + certificate_reviews          |
                 |  |  + verification_events          |
                 |  +--------------------------------+
                 |
   +-------------+-----------------+
   |                               |
   v 1                        (also referenced as the pair side)
settings --1:N-- setting_variants ----+
   |                                 |
   +--1:N-- setting_compatibility_rules
                                     |
                                     v
        +---------------------------------------------------+
        |  products   (kind = CONFIGURED)                   |
        |    . setting_variant_id  (0..1)                   |<-- order_items
        |    . gemstone_id        (0..1) XOR gemstone_pair_id|<-- cart_items
        |    . jewellery_type     (INV-02 / INV-03)          |<-- product_embeddings
        +----+-------------------+------------------+--------+<-- seo_metadata
             | 1:N                 | 1:N                 |
             v                     v                      v
      product_gemstones      asset_usages --N:1--> assets --1:N--> asset_variants
      (PRIMARY/PAIR/SIDE)                          +--> webar_assets

 dyo_configurations --1:N--> dyo_price_snapshots --> dyo_quotes
        |
        +-- customer_id --> customers --1:1--> customer_profiles
        |                        +--1:N--> addresses
        +--1:N (via order_items)--> orders --1:N--> order_items
                                        +--1:N--> payments --1:N--> refunds
                                        +--1:N--> fulfillments
                                        +--1:N--> order_events
 carts --1:N--> cart_items                discounts / product_addons

 pages --1:N--> page_revisions      navigations / redirects / seo_metadata

 conversations --1:N--> messages --1:N--> tool_calls
        |                    |
        +--------------------+--> ai_interactions --> guardrail_events
                             conversations (handoff_reason)
 knowledge_documents --1:N--> knowledge_chunks (vector(1024), HNSW)

 domain_events --> event_consumers     jobs / audit_logs / webhook_receipts
 import_batches --> staging_source_pages / staging_parsed_urls / staging_conflicts
```

---

## 10. BACKEND ARCHITECTURE

### 10.1 Shape

A **modular monolith** deployed as one Next.js application on Vercel, plus a separate worker deployment for background jobs. `[INFERRED]` per charter 8 and 48.

```
                        +--------------------------------------+
   Browser -----------> |  Next.js (Vercel)                   |
   WhatsApp ----------> |  +--------------------------------+  |
                        |  | Route Handlers / BFF            |  |
   Admin -------------> |  |  authn, rate limit, validate,    |  |
                        |  |  serialize, cache, observe      |  |
   Webhooks -----------> |  +----------------+----------------+  |
                        |                   |                   |
                        |  +----------------v----------------+  |
                        |  | Application Services             |  |
                        |  |  use-case orchestration,        |  |
                        |  |  transactions, authorization,   |  |
                        |  |  idempotency, event emission    |  |
                        |  +----------------+----------------+  |
                        |                   |                   |
                        |  +----------------v----------------+  |
                        |  | Domain (pure logic, invariants)  |  |
                        |  +----------------+----------------+  |
                        |                   |                   |
                        |  +----------------v----------------+  |
                        |  | Repositories (SQL, Drizzle)     |  |
                        |  +----------------+----------------+  |
                        +-------------------+-------------------+
                                            |
                        +-------------------+-------------------+
                        v                   v                   v
                  Neon Postgres         Redis          R2 / CDN
                                        (+ AI gateway, Meta
                                         WhatsApp, payments)
```

Enforcement rule: **route handlers contain no business logic.** A route handler may read a session, validate a schema, call exactly one application service, and serialize the result. Anything more belongs below that line.

### 10.2 Module map

| Module | Responsibility | Owns tables | Public services |
|---|---|---|---|
| `catalog` | Gemstones, varieties, settings, variants, compatibility, products | `gemstones`, `gemstone_stones`, `settings`, `setting_variants`, `products`, `product_gemstones` | `getProductBySlug`, `listProducts`, `getGemstone`, `listSettings` |
| `taxonomy` | Reference data and facet definitions | `gemstone_*`, `metals`, `setting_styles`, `jewellery_types`, `clarities`, `treatments` | `getFacets`, `resolveVariety`, `getColourTree` |
| `search` | Query parsing, hybrid retrieval, ranking | read-only across catalog | `search`, `suggest`, `facetCounts` |
| `dyo` | Configuration lifecycle, compatibility evaluation, quoting | `dyo_configurations`, `dyo_price_snapshots`, `dyo_quotes`, `setting_compatibility_rules` | `createConfiguration`, `validateConfiguration`, `quoteConfiguration` |
| `pricing` | Deterministic price computation | `price_lists`, `price_entries`, `price_model_observations` | `computePrice`, `explainPrice` |
| `commerce` | Cart, checkout, order, payment, refund, fulfillment | `carts`, `cart_items`, `orders`, `order_items`, `payments`, `refunds`, `fulfillments`, `order_events`, `discounts`, `product_addons` | `addToCart`, `beginCheckout`, `placeOrder`, `refundOrder` |
| `customers` | Customer records, profiles, addresses, auth linkage | `customers`, `customer_profiles`, `addresses` | `getCustomer`, `updateProfile`, `listAddresses` |
| `assets` | Asset records, ingestion, variants, usage | `assets`, `asset_variants`, `asset_usages` | `ingestAsset`, `attachAsset`, `getAssetUrl` |
| `certificates` | Upload, OCR, confidence, review, verification | `certificates`, `certificate_*`, `verification_events` | `uploadCertificate`, `runExtraction`, `approveCertificate` |
| `cms` | Pages, blocks, navigation, redirects, SEO | `pages`, `page_revisions`, `navigations`, `redirects`, `seo_metadata` | `getPage`, `getNavigation`, `resolveRedirect` |
| `ai` | Orchestrator, tools, RAG, guardrails, evaluation | `conversations`, `messages`, `tool_calls`, `knowledge_*`, `ai_*`, `guardrail_events` | `converse`, `streamAnswer`, `handoff` |
| `integrations` | WhatsApp, payments, email, storage, AI gateway | `webhook_receipts` | `handleWhatsAppWebhook`, `handlePaymentWebhook` |
| `operations` | Jobs, events, audit, rate limits, flags | `jobs`, `domain_events`, `event_consumers`, `audit_logs`, `rate_limit_counters`, `feature_flags` | `enqueue`, `publish`, `audit`, `isEnabled` |
| `admin` | Back-office surface over all modules | none; composes the others | admin-specific queries |

Module rules:
- Cross-module access goes through the owning module's application service, never its repository.
- `pricing` is called by `dyo`, `commerce` and `catalog`, and owns no cart state.
- `ai` may call other modules' **query** services only. Mutations go through the target module's command service with the AI acting as a *proposed actor*, subject to identical authorization.

### 10.3 Layer contract

```
src/modules/<module>/
  domain/           # pure functions and invariants; zero I/O, zero framework imports
    entities.ts
    invariants.ts
    value-objects.ts
    *.spec.ts
  application/
    commands/       # one file per use case: createX.ts, updateX.ts
    queries/        # read models
    services/       # orchestration, transactions, event emission
    dto/            # zod schemas for every input and output
    policies/       # authorization rules
    events/         # event type definitions and handlers
  infrastructure/
    repositories/   # Drizzle queries only
    mappers/
    events/         # outbox publisher, consumers
  index.ts          # the module's ONLY public surface
```

### 10.4 Error strategy

One envelope, applied everywhere:

```json
{
  "error": {
    "code": "DYO_INCOMPATIBLE",
    "message": "This setting cannot hold the selected stone.",
    "details": [{ "rule": "weight", "message": "Stone 5.98ct exceeds max 4.50ct" }],
    "requestId": "req_01J...",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
  }
}
```

| Class | HTTP | Example codes |
|---|---|---|
| Validation | 400 | `VALIDATION_FAILED`, `INVALID_FILTER` |
| AuthN | 401 | `UNAUTHENTICATED`, `EMAIL_UNVERIFIED` |
| AuthZ | 403 | `FORBIDDEN`, `TOOL_NOT_PERMITTED`, `AI_MUTATION_DENIED` |
| Not found | 404 | `PRODUCT_NOT_FOUND`, `CONFIGURATION_NOT_FOUND` |
| Conflict | 409 | `PRICE_CHANGED`, `OUT_OF_STOCK`, `VERSION_CONFLICT`, `IDEMPOTENCY_REPLAY` |
| Domain | 422 | `DYO_INCOMPATIBLE`, `CERTIFICATE_LOW_CONFIDENCE`, `DISCOUNT_INVALID` |
| Rate limit | 429 | `RATE_LIMITED`, `AI_QUOTA_EXCEEDED` |
| Server | 500 / 503 | `INTERNAL`, `DEPENDENCY_UNAVAILABLE`, `CIRCUIT_OPEN` |

Domain errors carry machine-readable `details` so the frontend and the AI layer can react without string matching.

### 10.5 Cross-cutting concerns

| Concern | Implementation |
|---|---|
| AuthN | Managed provider session mapped to `customers.identity_user_id`; never a local password store. |
| AuthZ | Policy functions per application service, plus RLS as defence-in-depth (8.16). |
| Validation | Zod at every boundary; DTOs are the single source for OpenAPI generation. |
| Transactions | One transaction per command; events written to `domain_events` inside the same transaction (transactional outbox). |
| Idempotency | `Idempotency-Key` header on all mutating endpoints; unique constraints on `payments`, `orders`, `dyo_quotes`, `tool_calls`, `jobs.job_key`. |
| Caching | Explicit, per query, event-invalidated. See section 15. |
| Observability | OpenTelemetry trace and span per request, command, tool call and job; `trace_id` propagated into events. |
| Configuration | Environment plus `feature_flags`; no configuration in code. |
| Time | A single `now()` per command, passed downward; `now()` never called inside domain logic. |

---

## 11. API ARCHITECTURE

All endpoints below are **TARGET API**. `[INFERRED]` None of them is a copy of an original Natural Gemstones endpoint: the source exposed no observable API surface, and `data/functional_signals.jsonl` records only UI signals (cart, search, interactive buttons, DYO, product gallery). The original endpoint inventory, request schemas, response schemas, authentication and error contracts are all `[UNKNOWN]`.

### 11.1 Conventions

| Concern | Rule |
|---|---|
| Base path | `/api/v1` |
| Content type | `application/json`; `multipart/form-data` only for uploads |
| AuthN | `Authorization: Bearer <session>` for account routes; cookie session for browser routes |
| AuthZ | Enforced in the application service, never in the route handler alone |
| Validation | Zod; unknown fields rejected |
| Errors | Section 10.4 envelope |
| Idempotency | `Idempotency-Key` header required on `POST`/`PATCH`/`DELETE` that create state |
| Rate limits | Per-identity and per-IP; see 11.7 |
| Caching | `Cache-Control` plus surrogate keys; see section 15 |
| Versioning | Path version. Breaking changes get `/api/v2`; additive changes ship in `/api/v1` |
| Tracing | `X-Trace-Id` echoed on every response |

### 11.2 Public catalog API

| Method | Path | Auth | Cache | Notes |
|---|---|---|---|---|
| GET | `/products` | public | 60s SWR | Filters, sort, cursor pagination |
| GET | `/products/{slug}` | public | 300s SWR | Full detail incl. stone, setting, media, documents, provenance |
| GET | `/products/{slug}/related` | public | 300s SWR | Same variety, then same style |
| GET | `/gemstones` | public | 60s SWR | Loose stones and pairs |
| GET | `/gemstones/{gemRef}` | public | 300s SWR | Includes per-stone rows and certificates |
| GET | `/settings` | public | 300s SWR | Setting designs and variants |
| GET | `/settings/{sku}` | public | 300s SWR | Single setting variant |
| GET | `/settings/{sku}/compatible-gemstones` | public | 60s SWR | Deterministic compatibility query |
| GET | `/taxonomy/varieties` | public | 1h | ~145 varieties with species and counts |
| GET | `/taxonomy/colors` | public | 1h | Colour tree with modifiers |
| GET | `/taxonomy/facets` | public | 1h | Filter definitions and value counts |
| GET | `/taxonomy/origins` | public | 1h | Origin list |
| GET | `/taxonomy/metals` | public | 1h | 14 metal codes |

**`GET /api/v1/products`** query parameters:

```
kind            CONFIGURED | READY_MADE | LOOSE_STONE | STONE_PAIR | SETTING_ONLY
variety         slug or slug[]        (repeatable)
color           slug or slug[]
intensity       code
shape           OVAL | ROUND | ...
cut             free text
clarity         code
treatment       NO_ENHANCEMENT | HEAT_TREATED | ...
origin          slug
jewelleryType   RING | EARRINGS | NECKLACE | PENDANT | BRACELET
settingStyle    solitaire | pave | three_stone | ...
metal           W14 | PT | SL | ...
minWeightCt     decimal
maxWeightCt     decimal
minPrice        decimal
maxPrice        decimal
certified       boolean
available       boolean
q               free text (hybrid)
sort            relevance | price_asc | price_desc | weight_asc | weight_desc | newest
cursor          opaque
limit           1..100 (default 24)
```

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "green-tourmaline-ring-oval-1.28ct-14k-white-gold-js1409w14-k1324",
      "kind": "CONFIGURED",
      "title": "Pave Green Tourmaline Ring 1.28 Ct., 14K White Gold",
      "jewelleryType": "RING",
      "price": { "amount": 3420.00, "currency": "USD", "evidenceStatus": "OBSERVED" },
      "totalWeightCt": 1.28,
      "stone": {
        "gemRef": "K1324",
        "variety": { "slug": "green-tourmaline", "name": "Green Tourmaline" },
        "colour": { "slug": "green", "name": "Green" },
        "intensity": { "code": "medium", "name": "Medium" },
        "clarity": { "code": "VSI", "label": "Very Slightly Included" },
        "shape": "OVAL",
        "cutLabel": "Mixed Brilliant Cut",
        "cuttingStyle": "FACETED",
        "treatment": { "code": "NO_ENHANCEMENT", "label": "No Enhancement" },
        "origin": { "slug": "brazil", "name": "Brazil" },
        "pricePerCarat": 700.00,
        "evidenceStatus": "EXTRACTED"
      },
      "setting": {
        "sku": "JS1409W14",
        "style": { "code": "pave", "label": "Pave" },
        "metal": { "code": "W14", "label": "White Gold 14K" }
      },
      "primaryImage": { "url": "https://cdn.../k1324-primary-01.webp", "width": 750, "height": 750, "alt": "..." },
      "mediaCount": 12,
      "hasCertificate": true,
      "certificateVerification": "UNVERIFIED",
      "availability": "in_stock",
      "provenance": { "sourceUrl": "https://naturalgemstones.com/...", "evidenceStatus": "OBSERVED" }
    }
  ],
  "meta": { "nextCursor": "eyJ...", "totalEstimate": 1284, "tookMs": 41 },
  "facets": {
    "variety":    [{ "value": "tsavorite-garnet", "count": 171 }],
    "color":      [{ "value": "green", "count": 328 }],
    "shape":      [{ "value": "oval", "count": 369 }],
    "treatment":  [{ "value": "no_enhancement", "count": 510 }],
    "metal":      [{ "value": "W14", "count": 156 }]
  }
}
```

### 11.3 Search API

| Method | Path | Auth | Cache | Notes |
|---|---|---|---|---|
| POST | `/search` | public | 30s | Full hybrid search; POST because filters are complex |
| GET | `/search/suggest?q=` | public | 1h | Typeahead |
| GET | `/search/similar-gemstones/{gemRef}` | public | 300s | Vector similarity within variety and colour family |
| GET | `/search/related-products/{productId}` | public | 300s | Embedding-based |

`POST /api/v1/search` body:

```json
{
  "query": "blue stones for an engagement ring under 5000",
  "intent": { "type": "PRODUCT_SEARCH", "confidence": 0.91 },
  "filters": {
    "variety": [], "color": ["blue"], "jewelleryType": ["RING"],
    "minPrice": null, "maxPrice": 5000, "minWeightCt": null,
    "treatment": ["NO_ENHANCEMENT"], "certified": null
  },
  "sort": "relevance",
  "semantic": true,
  "cursor": null,
  "limit": 24
}
```

Response adds `meta.intent`, `meta.appliedFilters`, `meta.rejectedFilters[]` (with reasons, so the UI can explain omissions), and `meta.strategy` (`structured_only | hybrid | semantic_rerank`).

### 11.4 DYO API

| Method | Path | Auth | Idempotency | Notes |
|---|---|---|---|---|
| POST | `/dyo/configurations` | public | required | Create or update a draft; returns `shortCode` |
| GET | `/dyo/configurations/{shortCode}` | public | - | Resume a draft |
| PATCH | `/dyo/configurations/{shortCode}` | owner | required | Change stone, setting, metal, options |
| POST | `/dyo/configurations/{shortCode}/validate` | public | - | Compatibility result with per-rule detail |
| POST | `/dyo/configurations/{shortCode}/quote` | public | required | Price snapshot; returns `quoteToken` |
| GET | `/dyo/configurations/{shortCode}/compatible-settings` | public | - | Settings valid for the chosen stone |
| POST | `/dyo/configurations/{shortCode}/render` | public | - | Queue a preview render |
| POST | `/dyo/configurations/{shortCode}/add-to-cart` | public | required | Validates and prices again before commit |
| POST | `/dyo/share/{shortCode}` | public | - | Return a shareable link |

Validate response:

```json
{
  "data": {
    "configurationHash": "sha256:9f2c...",
    "status": "INCOMPATIBLE",
    "rules": [
      { "rule": "stone_kind", "outcome": "PASS",
        "message": "Earrings require a matched pair; PR5681 is a pair." },
      { "rule": "max_weight", "outcome": "FAIL", "limit": 4.50, "actual": 5.98,
        "message": "Halo setting JS1383 accepts stones up to 4.50ct." },
      { "rule": "treatment_disclosure", "outcome": "REVIEW",
        "message": "PR5681 is Heat Treated; disclosure is required." }
    ],
    "suggestions": [
      { "action": "SELECT_LIGHTER_PAIR", "maxWeightCt": 4.50, "candidateCount": 3 }
    ]
  }
}
```

### 11.5 Commerce API

| Method | Path | Auth | Idempotency | Notes |
|---|---|---|---|---|
| POST | `/carts` | public | required | Create or resume by token |
| GET | `/carts/{token}` | owner | - | Hydrated cart with re-priced items |
| POST | `/carts/{token}/items` | owner | required | Add product or configuration |
| PATCH | `/carts/{token}/items/{itemId}` | owner | required | Change quantity or engraving |
| DELETE | `/carts/{token}/items/{itemId}` | owner | required | Remove |
| POST | `/carts/{token}/apply-discount` | owner | required | Validate a code; never trusted downstream |
| POST | `/checkout/sessions` | owner | required | **Checkout step 1**: validate cart, re-price, freeze snapshot, reserve stock |
| POST | `/checkout/sessions/{id}/shipping` | owner | required | **Step 2**: address and shipping method |
| POST | `/checkout/sessions/{id}/payment` | owner | required | **Step 3**: create payment intent |
| POST | `/checkout/sessions/{id}/confirm` | owner | required | **Step 4**: place the order |
| GET | `/orders` | owner | - | Order history |
| GET | `/orders/{orderNumber}` | owner | - | Detail with documents and timeline |
| POST | `/orders/{orderNumber}/cancel` | owner | required | Subject to state machine |
| POST | `/orders/{orderNumber}/refunds` | owner | required | Creates a refund *request* |
| POST | `/webhooks/payments/{provider}` | signature | - | Inbound provider events |
| GET | `/favorites` | owner | - | Wishlist |
| POST | `/favorites` | owner | required | Add |
| DELETE | `/favorites/{productId}` | owner | required | Remove |
| GET | `/compare` | public | - | Compare-list resolution |

The four-step checkout mirrors the observed source funnel `/cart` -> `/cart/order-summary` -> `/cart/payment-order` -> `/cart/secure-payment` `[OBSERVED]`, with each step a distinct server-side checkpoint.

### 11.6 Account, content and asset APIs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/account/profile` | owner | Profile plus preferences |
| PATCH | `/account/profile` | owner | Update profile |
| GET | `/account/addresses` | owner | |
| POST | `/account/addresses` | owner | |
| PATCH | `/account/addresses/{id}` | owner | |
| DELETE | `/account/addresses/{id}` | owner | |
| GET | `/account/orders` | owner | Paginated history |
| POST | `/account/concierge-request` | owner | Showroom / concierge request |
| POST | `/uploads/presign` | owner | Signed R2 upload URL for certificates |
| GET | `/pages/{slug}` | public | CMS page with resolved blocks |
| GET | `/navigation/{key}` | public | Navigation tree |
| GET | `/assets/{id}/url` | owner or public | Signed or CDN URL by visibility |
| GET | `/showrooms` | public | `[INFERRED]` observed via `/showroom/preview` |

### 11.7 AI and conversation API

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/ai/conversations` | public | Create; returns `conversationId` |
| POST | `/ai/conversations/{id}/messages` | owner | **Non-streaming** |
| POST | `/ai/stream` | public | **SSE streaming**; body carries `conversationId`, `message` |
| GET | `/ai/conversations/{id}/messages` | owner | History with citations |
| POST | `/ai/conversations/{id}/handoff` | owner | Force human handoff |
| POST | `/ai/tools/{toolName}/invoke` | internal | **Never exposed to the browser**; used by tests and admin only |
| POST | `/ai/feedback` | owner | Thumbs up/down plus free text |
| GET | `/ai/evaluate` | admin | Run an evaluation suite |

`POST /api/v1/ai/stream` response is `text/event-stream` with typed frames:

```
event: message_start   data: {"conversationId":"uuid","messageId":"uuid"}
event: tool_call       data: {"name":"search_inventory","state":"running"}
event: tool_result     data: {"name":"search_inventory","resultCount":12,"latencyMs":88}
event: citation        data: {"type":"PRODUCT","id":"uuid","label":"...","url":"/p/..."}
event: token           data: {"text":"..."}
event: guardrail       data: {"rule":"unverified_origin_claim","action":"SANITIZE"}
event: handoff         data: {"reason":"CERTIFICATE_ANOMALY"}
event: message_end     data: {"finishReason":"stop","costUsd":0.0042,"groundedRatio":1.0}
```

### 11.8 Certificate API

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/certificates` | owner / admin | Create record, attach uploaded asset |
| GET | `/certificates/{id}` | owner / admin | Extraction detail with per-field confidence |
| POST | `/certificates/{id}/extract` | admin | Queue OCR |
| POST | `/certificates/{id}/review` | admin | Human decision |
| GET | `/gemstones/{gemRef}/certificates` | public | **Filtered by verification_status** |
| GET | `/certificates/{id}/anomalies` | admin | Anomaly list |
| POST | `/certificates/{id}/cross-check` | system | Compare against slug and structured data |

Public certificate responses must include confidence and verification status per the charter's data-safety rule:

```json
{
  "data": {
    "kind": "GEM_REPORT",
    "labName": null,
    "certificateNumber": { "value": null, "confidence": 0.0, "verificationStatus": "UNVERIFIED" },
    "extractedFields": [
      { "field": "origin", "value": "Nigeria", "confidence": 0.54, "verificationStatus": "EXTRACTED" }
    ],
    "displayPolicy": "Only fields with verificationStatus = VERIFIED may be rendered as verified truth."
  }
}
```

### 11.9 Admin API

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/products` | Filter, bulk edit, publish |
| POST | `/admin/products/{id}/publish` | State transition |
| GET | `/admin/gems` | 35+ stone review queue |
| GET | `/admin/settings` | 951 designs, 10,349 variants |
| GET | `/admin/varieties` | Taxonomy management |
| GET | `/admin/import-batches` | Migration monitoring |
| GET | `/admin/import-batches/{id}/conflicts` | Unresolved conflicts |
| POST | `/admin/derived-refs/{id}/approve` | Promote an INFERRED identifier (INV-08) |
| GET | `/admin/certificates/review-queue` | Human review |
| GET | `/admin/ai/conversations` | Conversation oversight |
| POST | `/admin/ai/conversations/{id}/reply` | Human agent takes over |
| GET | `/admin/audit-logs` | Filterable audit trail |
| GET | `/admin/jobs` | Queue health |
| GET | `/admin/assets/orphans` | Unattached assets |

### 11.10 Webhook API

| Method | Path | Verification |
|---|---|---|
| POST | `/webhooks/whatsapp` | Meta `X-Hub-Signature-256` HMAC over raw body |
| POST | `/webhooks/payments/{provider}` | Provider signature, per provider |
| POST | `/webhooks/storage` | HMAC from the storage provider |

Rules: verify before parse; store the raw payload in `webhook_receipts` keyed by `(provider, external_event_id)` for idempotency; return 2xx fast and process asynchronously; never trust a redirect URL supplied in a webhook payload.

### 11.11 Rate limits

| Scope | Limit | Window |
|---|---|---|
| Public GET | 300 | 1 min per IP |
| Search | 60 | 1 min per IP |
| Cart mutation | 60 | 1 min per session |
| Checkout | 20 | 1 min per customer |
| AI stream | 20 | 1 min per session; 200 per day per customer |
| AI tool invocation | 200 | 1 min per conversation |
| Certificate upload | 10 | 1 hour per customer |
| Admin write | 300 | 1 min per admin |
| Webhook | 1,000 | 1 min per provider IP |

Implemented with Redis token buckets plus a Postgres fallback counter (`rate_limit_counters`) when Redis is unavailable.

---

## 12. FRONTEND ARCHITECTURE

### 12.1 Principles

1. **Data-driven.** No page is created per product, variety or category. Every catalog page renders from the same components plus data. `[INFERRED]` from charter 49.
2. **Server-first.** Anything not requiring interactivity is a Server Component.
3. **Client islands only where interaction demands it.** DYO, chat, WebAR, filters, cart.
4. **Domain APIs are the only data source.** The frontend never parses source slugs or reconstructs SKU grammar.
5. **Loading, error and empty states are designed, not defaulted.**

### 12.2 Route tree

```
app/
  (storefront)/
    layout.tsx                       # header, mega menu, footer, chat launcher
    page.tsx                         # /
    [variety]/page.tsx               # /tsavorite-garnet           (loose stones)
    [variety]/not-found.tsx
    [variety]-pairs/page.tsx         # /tsavorite-garnet-pairs
    [variety]-rings/page.tsx         # /tsavorite-garnet-rings
    [variety]-rings/[slug]/page.tsx  # /tsavorite-garnet-rings/<slug>   (ready-made)
    colour/[colour]/page.tsx         # /padparadscha-gemstones
    settings/page.tsx                # /gemstone-rings  (settings catalog)
    settings/[sku]/page.tsx          # /gemstone-ring-settings/<slug>
    search/page.tsx                  # /search
    products/[slug]/page.tsx         # canonical product detail
    design-your-own/page.tsx         # /design-your-own       (entry)
    design-your-own/review/[code]/page.tsx   # /design-your-own/review/<code>
    ar/[assetId]/page.tsx            # /ar/<assetId>          (WebAR, isolated)
    ar/handoff/[token]/page.tsx      # QR target
    compare/page.tsx                 # /compare-list
    favorites/page.tsx               # /favorites
    cart/page.tsx                    # /cart
    checkout/order-summary/page.tsx  # /checkout/order-summary
    checkout/payment-order/page.tsx  # /checkout/payment-order
    checkout/secure-payment/page.tsx # /checkout/secure-payment
    account/...
    contact/page.tsx                 # /contact-us
    showrooms/page.tsx               # /showroom
    showrooms/[slug]/page.tsx        # /showroom/preview
    education/...
    blog/...
    policy/[slug]/page.tsx
  admin/                             # separate layout, separate authz
  api/                               # route handlers, section 11
```

### 12.3 Server and client boundary

| Surface | Rendering | Reason |
|---|---|---|
| Home, variety, colour, category, settings index | Server | SEO, cacheable, no per-user state |
| Product detail | Server shell + client islands | SEO-critical content; gallery, DYO CTA, AR button interactive |
| Search results | Server for first page, client for refinements | SEO plus interactivity |
| DYO configurator | Client | Multi-step stateful interaction |
| Cart and checkout | Client-heavy, server-validated | Money and inventory |
| Chat | Client island, lazy | Never in the initial bundle |
| WebAR | Client only, dynamic import, no SSR | GPU and camera |
| Account | Server | Per-user, non-cacheable |
| Admin | Client | Dense interactive tables |

### 12.4 Component architecture

```
components/
  design-system/        # primitives: Button, Input, Select, Dialog, Sheet, Tabs,
                        # Badge, Card, Table, Toast, Skeleton, Price, Money
  catalog/              # ProductCard, ProductGrid, ProductGallery, SpecTable,
                        # StoneSpecPanel, StoneFacetChips, CertificateBadge,
                        # AvailabilityBadge, ProvenanceBadge
  filters/              # FacetPanel, FacetGroup, FacetCheckbox, RangeSlider,
                        # ActiveFilterChips, SortSelect, MobileFilterSheet
  dyo/                  # StonePicker, SettingPicker, MetalPicker, SizePicker,
                        # CompatibilityPanel, PriceBreakdown, ReviewStep,
                        # ConfigurationSummary, ShareButton
  cart/                 # CartLine, CartSummary, QuantityStepper, AddOnSelector
  checkout/             # CheckoutSteps, AddressForm, ShippingSelector,
                        # PaymentForm, OrderReview, FinancingSelector
  ai/                   # ChatPanel, ChatMessage, ToolTrace, CitationChip,
                        # HandoffNotice, FeedbackWidget
  documents/            # CertificateCard, CertificateField, ConfidenceBadge,
                        # VerificationBadge, DocumentViewer
  ar/                   # ARLauncher, ARViewer, HandTrackingStatus, DeviceFallback,
                        # QrHandoff, CalibrationPrompt
  layout/               # Header, MegaMenu, MobileNav, Footer, AnnouncementBar,
                        # Breadcrumbs, LocaleSwitcher
  cms/                  # block renderers, one per content_block_type
  account/              # OrderCard, AddressCard, ProfileForm, WishlistGrid
```

Rules: no component imports a repository or calls the database; components receive view models from the server layer; one component per file; no page-local copies of design-system components.

### 12.5 State management

| State | Mechanism | Rationale |
|---|---|---|
| Server data | Server Components + `fetch` cache tags | Revalidation by tag; no client cache duplication |
| URL state | `searchParams` | Filters, sort and pagination are shareable and back-button safe |
| DYO draft | Client reducer + server persistence | Explicit state machine; Redis for the live session, Postgres for the durable record |
| Cart | Server-authoritative, client-optimistic | Money correctness beats instant feedback |
| Chat | Server stream + client transcript | Streaming is inherently server-driven |
| Filters | URL + `useOptimistic` | Shareability is a feature |
| AR | Client-only store, never global | Isolated to the AR route |

### 12.6 Data fetching and caching

```ts
// Server Component read with explicit tags for event-driven invalidation.
const product = await getProductBySlug(slug, { tags: [`product:${slug}`] });
```

Tag strategy: `product:{slug}`, `gemstone:{gemRef}`, `variety:{slug}`, `taxonomy`, `nav:{key}`, `page:{slug}`, `search:{hash}`. Section 30 defines which event invalidates which tag.

### 12.7 States

Every data-dependent view implements all four:

| State | Pattern |
|---|---|
| Loading | Route-level `loading.tsx` skeleton matching final layout; inline Suspense for islands |
| Error | Route-level `error.tsx` with a real recovery action, not a bare message |
| Empty | Purpose-built empty state with a next action: "No tsavorites match these filters. Clear filters" |
| Not found | `not-found.tsx` with search and category suggestions |

### 12.8 SEO

- `generateMetadata` per route from `seo_metadata`, falling back to derived title and description.
- Canonical URL with a single trailing-slash policy. `[OBSERVED]` The source used trailing-slash canonicals; we normalise to no-trailing-slash and 301 the source form.
- JSON-LD: `Product` with `offers`, `BreadcrumbList`, `Organization` with the observed address and phone, `Article` for education and blog.
- `[OBSERVED]` The source already emitted Product JSON-LD including `sku`, `mpn`, `brand` and `offers.price`; we reproduce and extend it.
- Sitemaps generated from `products`, `gemstone_varieties`, `pages`; sharded above 50,000 URLs, matching the source's 44 sharded product sitemaps.
- `robots.txt` disallowing `/admin`, `/api`, `/ar/handoff`.
- Redirect table seeded from all 44,218 source URLs (section 33).

### 12.9 Accessibility

Semantic landmarks; skip link; visible focus rings; the gallery is keyboard-operable with arrow keys; AR controls are large touch targets with `aria-label`; chat is `role="log"` with `aria-live="polite"`; colour contrast at least 4.5:1; all form fields labelled and error-linked via `aria-describedby`; reduced-motion honoured for every animation.

### 12.10 Analytics

| Event | Properties | Consent |
|---|---|---|
| `page_view` | path, template, variety, jewelleryType | required |
| `search` | query, filters, resultCount, strategy | required |
| `filter_applied` | facet, value, resultCount | required |
| `product_view` | slug, variety, price, stoneId | required |
| `dyo_step` | step, stoneId, settingSku, metal | required |
| `dyo_completed` | configurationHash, price | required |
| `add_to_cart` | productId, quantity, price | required |
| `checkout_step` | step, orderNumber | required |
| `order_placed` | orderNumber, value | required |
| `ai_interaction` | surface, toolCalls, handoff | required |
| `ar_session` | assetId, deviceTier, duration | optional |
| `certificate_view` | certificateId, verificationStatus | optional |

Analytics is loaded through a thin adapter so the provider can change. No PII in event properties. Server-side events for conversions, so ad blockers do not lose revenue data.

### 12.11 Performance budget

| Metric | Budget |
|---|---|
| Initial JS on a category page | <= 170 KB gzip |
| Initial JS on a product page | <= 190 KB gzip |
| Chat bundle | lazy, <= 90 KB gzip, never in the initial payload |
| WebAR bundle | lazy, <= 650 KB gzip plus lazy 3D assets |
| Fonts | self-hosted, subset, `font-display: swap`, max 2 families |
| Images | AVIF then WebP, `srcset`, explicit dimensions to avoid layout shift |
| Third-party scripts | none on the critical path |

---

## 13. ROUTE MAP

### 13.1 Preserved source routes

Compatibility matters for SEO. Every observed source URL maps to a target route.

| Source route | Count | Target | Redirect |
|---|---:|---|---|
| `/{variety}` | 191 | `/[variety]` | no |
| `/{variety}-pairs` | 142 | `/[variety]-pairs` | no |
| `/{variety}-rings` | 99 | `/[variety]-rings` | no |
| `/{variety}/{slug}-K#####` | 19,997 | `/products/{slug}` | 301 |
| `/{variety}-pairs/{slug}-PR#####` | 3,077 | `/products/{slug}` | 301 |
| `/{variety}-rings/{slug}-J#####` | 88 | `/products/{slug}` | 301 |
| `/design-your-own/review/{slug}` | 9,812 | `/design-your-own/review/{code}` | 301 |
| `/gemstone-ring-settings/{slug}` | 8,522 | `/settings/{sku}` | 301 |
| `/gemstone-necklace-pendant-settings/{slug}` | 1,808 | `/settings/{sku}` | 301 |
| `/gemstone-earring-settings/{slug}` | 442 | `/settings/{sku}` | 301 |
| `/gemstone-bracelet-settings` | 1 | `/settings` | no |
| `/mens-gemstone-ring-settings` | 1 | `/settings?style=mens` | 302 |
| `/{colour}-gemstones` | 60 | `/colour/{colour}` | 301 |
| `/all-natural-gemstones` and siblings | 7 | `/search?collection=all` | 302 |
| `/cart` | 1 | `/cart` | no |
| `/cart/order-summary` | 1 | `/checkout/order-summary` | 301 |
| `/cart/payment-order` | 1 | `/checkout/payment-order` | 301 |
| `/cart/secure-payment` | 1 | `/checkout/secure-payment` | 301 |
| `/account` | 1 | `/account` | no |
| `/auth`, `/verify-email` | 2 | `/account/sign-in`, `/account/verify-email` | 301 |
| `/favorites` | 1 | `/favorites` | no |
| `/compare-list` | 1 | `/compare` | 301 |
| `/financing` | 1 | `/financing` | no |
| `/extend-protection-plan` | 1 | `/protection-plan` | 301 |
| `/contact-us` | 1 | `/contact` | 301 |
| `/showroom`, `/showroom/preview`, `/showroom/preview/success` | 3 | `/showrooms`, `/showrooms/{slug}` | 301 |
| `/education` and children | 15 | `/education/...` | no |
| `/blog` | 1 | `/blog` | no |
| `/meet-our-team`, `/michael-arnstein` | 2 | `/about/...` | 301 |
| `/custom-design-gemstone-rings-jewelry` | 1 | `/design-your-own` | 301 |
| `/sitemap-static.xml`, `/sitemap-products-N.xml` | 45 | `/sitemap.xml`, `/sitemap-products/N.xml` | generated |

`[OBSERVED]` Query-string variants `?rs=` (423 URLs) and `?design-styles=` (6) map to search state: `?rs=` becomes a sort or page parameter, `?design-styles=` becomes `?style=`.

### 13.2 New target-only routes

| Route | Purpose | Evidence |
|---|---|---|
| `/search` | Hybrid search | B |
| `/products/{slug}` | Unified product detail | E: URL families |
| `/settings` and `/settings/{sku}` | Setting catalog | E: 10,772 URLs |
| `/design-your-own` and `/design-your-own/review/{code}` | Configuration flow | E: DYO URLs |
| `/ar/{assetId}` | WebAR | B |
| `/ar/handoff/{token}` | QR target | B |
| `/compare` | Compare list | E: `/compare-list` |
| `/account/**` | Orders, addresses, profile, wishlist | E: `/account` |
| `/education/**` | Education hub | E: 14 routes |
| `/varieties` and `/varieties/{slug}` | Variety editorial | B |
| `/admin/**` | Back office | B |

### 13.3 Slug strategy

Target slugs preserve the source shape, because it is human-readable, SEO-friendly and already contains the semantic tokens:

```
/design-your-own/review/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681
   -> /design-your-own/review/{shortCode}            (shareable config code)

/aquamarine/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681
   -> /products/halo-blue-aquamarine-earring-5-98ct-14k-rose-gold-js1383r14-pr5681
      (stable: derived from the source slug, never from a mutable display name)
```

Rules: slug changes require a `redirects` row; `product_number` is the stable internal identifier; slugs never embed a mutable price or availability value.

---

## 14. SEARCH ARCHITECTURE

### 14.1 Stack decision

PostgreSQL full-text search plus pg_trgm plus pgvector plus deterministic structured filtering plus business ranking. **No dedicated search engine.** `[INFERRED]` per charter 11.

Justification at the measured data scale: 19,665 stones + 3,072 pairs + 9,812 products is roughly 33,000 searchable entities. PostgreSQL handles this comfortably with correct indexes. A dedicated engine introduces operational surface, a second source of truth, eventual consistency, and index-rebuild tooling, for no proven benefit. Revisit only if measured p95 exceeds NFR-03 under load, or if typo-tolerant prefix search at scale becomes a requirement (ADR-006).

### 14.2 Query flow

```
User query + URL filters
        |
        v
[1] Parse and normalise           lowercase, unaccent, strip punctuation
        |
        v
[2] Detect intent                 navigational vs discovery vs comparison
        |                          (rules, not an LLM, for the request path)
        v
[3] Structured filter build       typed, whitelisted, index-backed predicates
        |
        v
[4] Candidate retrieval           three parallel arms, unioned by id
    a) exact/structured  -> products join settings, gemstones, taxonomy
    b) full-text         -> tsvector + websearch_to_tsquery + pg_trgm fallback
    c) semantic          -> product_embeddings HNSW (optional, gated)
        |
        v
[5] Merge and filter              intersection with structured predicates
        |
        v
[6] Rank                         weighted blend, then business rules
        |
        v
[7] Facet counts                  single grouped pass over the filtered set
        |
        v
[8] Assemble response             data + meta + facets + rejectedFilters
```

Step 2 intent detection uses a deterministic rule set, not a model. The request path must be fast and free. The AI concierge performs its own richer intent extraction before calling this (section 16).

### 14.3 Structured filters

Every filter maps to an indexed column, so filter selectivity drives the plan:

| Filter | Predicate | Index |
|---|---|---|
| variety | `variety_id = ANY($1)` | `products (variety_id, state)` |
| colour | `colour_id = ANY($1)` | `products (colour_id, state)` |
| intensity | `gemstones.intensity_id` | `gemstones (colour_id, intensity_id)` |
| shape | `gemstones.shape` | `gemstones (shape)` |
| treatment | `gemstones.treatment_id` | `gemstones (treatment_id)` |
| origin | `gemstones.origin_id` | `gemstones (origin_id)` |
| clarity | `gemstones.clarity_id` | join |
| weight range | `total_weight_ct BETWEEN` | `products (total_weight_ct)` |
| price range | `price_amount BETWEEN` | `products (price_amount) WHERE state='ACTIVE'` |
| jewelleryType | `jewellery_type = ANY($1)` | `products (jewellery_type, state)` |
| setting style | join `settings.style_id` | `settings (style_id, jewellery_type)` |
| metal | `setting_variants.metal_code` | `setting_variants (metal_code, state)` |
| certified | `EXISTS (certificates WHERE verification_status='VERIFIED')` | `certificates (verification_status)` |
| available | `availability AND state='ACTIVE'` | partial |

All filters are validated against a whitelist derived from the taxonomy tables. An unknown filter value returns `rejectedFilters` with a reason rather than silently returning everything.

### 14.4 Full-text arm

```
Generated and maintained tsvector; weights: title > variety > cut > colour.

    websearch_to_tsquery('english', $1)      -- handles quotes, OR and -negation safely
    ts_rank_cd(tsv, query, 32)               -- cover density ranks phrase locality
```

This fence is illustrative, not executable DDL: `$1`, `tsv` and `query` are placeholders. Executable form is in section 8.6 and section 14.3.

Typo tolerance, layered by cost:

1. `websearch_to_tsquery` with the `english` config plus a custom synonym dictionary (section 14.7).
2. `pg_trgm` similarity on variety, title and gem_ref, threshold 0.3, for single-token misspellings.
3. Prefix matching on `gem_ref` so `K13` finds `K1324`.
4. Embedding similarity as the last resort (section 14.5).

### 14.5 Semantic arm

Gated, because it costs an embedding call and a HNSW probe:

- Disabled when `semantic=false`, when the query is purely navigational (exact variety or SKU match), or when the structured arm already returns more than `limit * 20` candidates.
- Enabled when the query has descriptive intent and few structured constraints.
- Uses `product_embeddings` (1024-dim, HNSW cosine). Products are embedded from a composed document: title, variety, colour, intensity, shape, cut, clarity, treatment, origin, setting style, metal.

### 14.6 Ranking

Deterministic, versioned, and unit-tested. `INFERRED` weights, chosen because they reflect how a gemstone buyer searches; they are **not** observed source behaviour.

```
score = 0.34 * text_rank_normalised
      + 0.22 * semantic_similarity        (0 when semantic arm is off)
      + 0.16 * business_signal
      + 0.12 * facet_match_bonus
      + 0.10 * availability_signal
      + 0.06 * recency_signal
```

Business signals, applied after scoring as modifiers:

| Modifier | Effect | Rationale |
|---|---|---|
| Verified certificate attached | x1.15 | Trust is a differentiator in this market |
| Heat Treated disclosed | x1.00, never penalised | Treatment must not be hidden or punished silently |
| `stone_type` recorded | x1.08 | `[UNKNOWN]` for 911/1,024 migrated stones; recorded type is more useful |
| In stock | x1.05 | Never promote unavailable items |
| Ready-made with `J` SKU | x0.95 | Stone weight is `0.00ct`, a placeholder |
| Pair | x1.00 | Neutral |
| Draft or archived | excluded | Never surface |

`heat_treated` is explicitly **not** a ranking penalty. Suppressing treated stones would be commercially and ethically wrong; the correct behaviour is prominent disclosure.

### 14.7 Synonyms

A `ts_synonym`-backed or application-level synonym map, seeded from evidence and curated:

| Canonical | Variants observed in evidence |
|---|---|
| `tsavorite` | `tsavorite`, `tsavorite garnet`, `green grossular`, `green garnet` |
| `paraiba tourmaline` | `paraiba`, `paraiba tourmaline`, `blue-green tourmaline` |
| `sphene` | `sphene`, `titanite`, `sphene titanite` |
| `padparadscha` | `padparadscha`, `padparadscha sapphire`, `pink-orange sapphire` |
| `chrome diopside` | `chrome diopside`, `chrome` |
| `precious topaz` | `precious topaz`, `imperial topaz`, `asahi topaz` |
| `grossular garnet` | `grossular`, `hessonite`, `tsavorite` |
| shape synonyms | `emerald cut` = `emerald`, `step cut` |
| finish | `high polish` = `polished` |

Stored in `taxonomy`-adjacent reference data with `evidence_status`, so curated additions are distinguishable from observed ones.

### 14.8 Facets

Computed in a single grouped pass per facet dimension over the filtered candidate set, so facet counts always agree with the result set. Each facet carries `value`, `count`, and `selected`. Color and variety facets include `disjunctive` handling so selecting one colour does not zero the counts of the others.

### 14.9 Pagination

Keyset (cursor) pagination on a deterministic sort tuple `(score DESC, product_id DESC)` for ranked search, and `(price_amount, id)` or `(total_weight_ct, id)` for sorted search. Offset pagination is forbidden for deep pages; it degrades badly and is unnecessary here.

### 14.10 Indexing and reindexing

| Index | Method |
|---|---|
| `tsvector` | Expression index in the migration; `IF NOT EXISTS` thereafter |
| Facet columns | Composite B-tree per high-value combination |
| `pg_trgm` | GIN on `gem_ref`, `title`, variety `name` |
| `product_embeddings` | HNSW cosine, `m=16`, `ef_construction=64` |
| `knowledge_chunks` | HNSW cosine |

Reindex is not a global rebuild. Indexes are maintained incrementally by triggers plus event consumers. Full rebuild is reserved for a schema change or an embedding-model change, and is run as a background job with shadow-index comparison.

### 14.11 Embeddings and invalidation

| Trigger | Action |
|---|---|
| `ProductUpdated` | Recompose the document; if `content_hash` changed, enqueue re-embed |
| `GemstoneUpdated` | Enqueue re-embed of every product referencing it |
| `KnowledgeDocumentUpdated` | Re-chunk and re-embed only that document |
| Embedding model change | Full re-embed as a versioned background job (ADR-018) |

`product_embeddings.content_hash` makes re-embedding idempotent: a no-op change produces the same hash and skips the model call, which is the single biggest AI cost control available.

### 14.12 Search caching

| Layer | Key | TTL | Invalidation |
|---|---|---|---|
| CDN | full URL | 60s | none |
| Redis | `search:{hash}` | 60s | tag-based on `ProductUpdated`, `GemstoneUpdated` |
| Redis | `facets:{hash}` | 300s | taxonomy change |
| Redis | `suggest:{prefix}` | 3600s | taxonomy change |

The hash covers query text, all filters, sort, limit and index generation. A catalogue change bumps a global `search:generation` counter folded into the hash, which invalidates everything at once without key scanning.

---

## 15. CACHE ARCHITECTURE

**Rule, non-negotiable: Postgres is the source of truth. Redis is acceleration and transient state only.** A cache entry is never the only copy of an order, payment, price or inventory fact.

### 15.1 Cache inventory

| # | Cache | Key pattern | Source of truth | TTL | Invalidation trigger | Stale strategy | Redis? |
|---|---|---|---|---|---|---|---|
| 1 | Product detail | `product:{slug}` | `products` + joins | 300s | `ProductUpdated` | SWR, serve stale then refresh | Yes |
| 2 | Variant list | `products:list:{family}` | `products` | 60s | `ProductUpdated`, `InventoryReserved` | SWR | Yes |
| 3 | Gemstone detail | `gemstone:{gemRef}` | `gemstones` + `gemstone_stones` | 300s | `GemstoneUpdated` | SWR | Yes |
| 4 | Taxonomy | `taxonomy:varieties` | `gemstone_varieties` etc. | 3600s | admin taxonomy write | SWR | Yes |
| 5 | Facet definitions | `taxonomy:facets` | taxonomy tables | 3600s | taxonomy write | SWR | Yes |
| 6 | Facet counts | `facets:{hash}` | live query | 300s | `ProductUpdated` | SWR | Yes |
| 7 | Search results | `search:{generation}:{hash}` | live query | 60s | generation bump | SWR | Yes |
| 8 | Search suggestions | `suggest:{prefix}` | live query | 3600s | generation bump | SWR | Yes |
| 9 | Navigation | `nav:{key}` | `navigations` | 3600s | nav write | SWR | Yes |
| 10 | CMS page | `page:{slug}` | `pages` | 600s | `PageUpdated` | SWR | Yes |
| 11 | Availability summary | `avail:{productId}` | `products.availability` | 15s max | `InventoryReserved`, `InventoryReleased`, `OrderCreated` | none; bypass on write | **Yes, tightly** |
| 12 | Price quote | `quote:{token}` | `dyo_price_snapshots` | until `expires_at` | new snapshot | none; immutable | Yes |
| 13 | DYO draft session | `dyo:draft:{sessionId}` | `dyo_configurations` | 1800s | every write-through | write-through | Yes |
| 14 | AI conversation state | `ai:conv:{id}` | `conversations`, `messages` | 300s | every write-through | write-through | Yes |
| 15 | Rate limit counters | `rl:{bucket}:{window}` | Redis (advisory) | window | expiry | n/a | Yes |
| 16 | Idempotency records | `idem:{key}` | Postgres unique constraint | 24h | none | Postgres is authoritative | Yes (mirror only) |
| 17 | Session state | `sess:{id}` | managed auth provider | provider TTL | provider | none | No |
| 18 | Distributed lock | `lock:{name}` | Postgres advisory lock | 30s | TTL expiry | none | Yes (convenience) |
| 19 | HTTP page cache (Next) | tag-based | Postgres | per route | tag invalidation | SWR | Yes |
| 20 | CDN | full URL + surrogate key | R2 | per asset | asset revalidation | SWR | n/a |

### 15.2 What is never cached, or cached only for seconds

| Data | Policy | Reason |
|---|---|---|
| Payment state | Never cached | Money correctness |
| Order state after placement | Never cached | Money and fulfilment correctness |
| Checkout session totals | Never cached; recomputed per request | Prevents stale-price checkout |
| Authorization decisions | Never cached beyond the request | Prevents privilege leakage |
| Customer PII | Never cached in Redis; Postgres with RLS only | Data protection |
| Inventory exact counts | Cached at most 15s, invalidated on every write | Stock accuracy |
| AI conversation content | Write-through only, never read as authoritative | Correctness of memory |
| Certificate verification status | Cached at most 60s, invalidated on `CertificateApproved` | Trust integrity |

### 15.3 Invalidation mechanism

Domain events drive invalidation (section 30). A Redis Pub/Sub channel per tag family lets every server instance drop its local memory of the affected tag:

```
ProductUpdated(productId, slug, family)
   -> DEL product:{slug}
   -> DEL products:list:{family}
   -> DEL search:*            (via generation bump)
   -> PUBLISH cache:invalidate {tags: [...]}
   -> revalidate Next.js cache tag
   -> enqueue EmbeddingGeneration if content_hash changed
```

The generation bump is the safety net: even if a tag-based delete is lost, a generation change makes all old search keys unreachable within 60 seconds.

### 15.4 Stampede protection

Single-flight: the first caller to miss a key acquires `lock:{key}`, computes, and populates; concurrent callers wait up to 2s then read, or compute themselves if still empty after a 5s ceiling. Combined with SWR this keeps latency flat under burst.

### 15.5 Degradation

| Failure | Behaviour |
|---|---|
| Redis down | All caches bypassed; Postgres serves directly. Catalog and search remain correct, slower. Rate limits fall back to `rate_limit_counters`. |
| Postgres down | Hard failure for transactional routes. Read-only cached pages continue to serve, clearly marked stale, except cart and checkout which fail closed. |
| CDN down | Origin serves directly |
| Vector index unavailable | Semantic arm disabled; structured plus full-text search continues (FR-SEARCH-05 is never dependent on vectors) |
| AI gateway down | Chat returns a graceful message plus handoff to a human. Catalog unaffected. |

---

## 16. AI ARCHITECTURE

### 16.1 Position

AI is an **orchestration layer** over controlled tools and trusted data. It is never a system of record and never a database client. `[INFERRED]` per charter 17, 21, 41, 43.

```
User (web or WhatsApp)
        |
        v
AI Interface            chat panel | whatsapp | admin assist | search assist
        |
        v
AI Orchestrator         intent -> plan -> tool selection -> synthesis -> policy
        |
        v
Intent + Context        intent type, entities, conversation memory, trust tier
        |
        v
Tool Selection          planner picks from a fixed registry; no free-form SQL
        |
        v
Controlled Tools        each tool: strict schema, authz check, timeout, audit
        |
        v
Trusted Data            Postgres via application services | knowledge chunks | vector index
        |
        v
LLM Response            synthesis with mandatory citation binding
        |
        v
Grounding Gate          verifies every factual claim has a citation; strips the rest
        |
        v
User                    answer + citations, or refusal, or handoff
```

### 16.2 Model gateway

All model access goes through a `ModelGateway` interface backed by Vercel AI Gateway with OpenRouter as an alternative provider. Business logic never imports a provider SDK directly.

```ts
interface ModelGateway {
  generate(req: GenerateRequest): Promise<GenerateResult>;
  stream(req: GenerateRequest): AsyncIterable<StreamChunk>;
  embed(texts: string[], model?: string): Promise<number[][]>;
  listModels(): ModelDescriptor[];
}
```

| Concern | Decision |
|---|---|
| Provider | Gateway with OpenRouter fallback; swappable by configuration |
| Default chat model | Configurable, no hard-coded model name in business logic |
| Vision/OCR model | Separate configurable model; certificate OCR cost is tracked per run |
| Embedding model | Single dimension 1024, chosen once (ADR-018) |
| Fallback chain | Primary, then gateway-routed alternative on 429/5xx/timeout, max 1 retry |
| Cost control | Per-surface daily budget in Redis; hard stop with a handoff, never a silent truncation |
| Concurrency | Global semaphore per surface; queue rather than fail |
| Determinism | `temperature=0` for extraction; low temperature for tool planning |

### 16.3 Orchestrator stages

```
1. RECEIVE      normalise channel, attach conversation and customer context
2. CLASSIFY     intent type + entities + urgency           (model, structured output)
3. PLAN         which tools, in what order                  (model, structured output)
4. AUTHORIZE    every planned tool checked against policy  (code, no model)
5. EXECUTE      tools run; results recorded in tool_calls  (code)
6. GROUND       verify facts against trusted data          (code)
7. SYNTHESIZE   compose the natural-language answer        (model, citations required)
8. POLICY       guardrails: block, sanitize, escalate      (code)
9. RECORD       ai_interactions, messages, guardrail_events(code)
```

Steps 1-3 involve the model. Steps 4, 5, 6, 8 and 9 are pure code. This split is the core safety property: the model proposes, deterministic code disposes.

### 16.4 Tool registry

| Tool | Input | Output | Authorization | Mutates | Timeout |
|---|---|---|---|---|---|
| `search_inventory` | filters, query, limit | product and stone summaries with facets | public | No | 3s |
| `get_product` | slug or productId | full detail incl. provenance | public | No | 2s |
| `get_gemstone` | gemRef | stone detail, per-stone rows, documents | public | No | 2s |
| `compare_gemstones` | 2-4 gemRefs | attribute matrix with nulls explicit | public | No | 3s |
| `search_knowledge` | query, docKinds | chunks with similarity and trust tier | public | No | 3s |
| `check_dyo_compatibility` | stoneRef, settingSku | per-rule outcome and suggestions | public | No | 2s |
| `get_price_quote` | configuration or productId | price snapshot with breakdown | public | No | 2s |
| `get_certificate` | certificateId or gemRef | extraction with confidence and status | public, redacted | No | 2s |
| `create_customer_request` | intent, notes, contact | request id | authenticated | Yes, via `commerce` service | 3s |
| `transfer_to_human` | reason, summary | handoff id | public | Yes, via `ai` service | 1s |

**There is deliberately no tool that mutates price, inventory, orders, payments, certificates or permissions.** `[INFERRED]` This is enforced structurally: the registry has no such entries, so no prompt can invoke them (ADR-003).

Tool implementation contract:

```ts
interface Tool<I, O> {
  name: string;
  version: string;
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
  authorization(ctx: ToolContext, input: I): AuthzDecision;   // outside the LLM
  mutates: boolean;
  timeoutMs: number;
  idempotent: boolean;
  execute(ctx: ToolContext, input: I): Promise<O>;            // calls application services only
  citationFor(output: O): Citation[];                         // mandatory
}
```

### 16.5 Tool authorization

Authorization is evaluated in code, before execution, on every call. The LLM's opinion is irrelevant.

| Actor | Allowed tools | Extra rules |
|---|---|---|
| Anonymous web | all read tools | rate limited per session; `get_certificate` redacts unverified fields |
| Authenticated customer | read tools + `create_customer_request`, `transfer_to_human` | request creation scoped to own customer record |
| AI agent (server-side) | read tools + the two above | **`mutates: false` enforced** |
| Admin assistant | read tools + `transfer_to_human` | no commerce mutation without a human command |
| Human agent | all tools via admin UI | every action audited with `actor_type='HUMAN_AGENT'` |

A denial returns `authorization_decision='DENY'` with a reason, is recorded in `tool_calls`, and the model is told only that the capability is unavailable. It never receives the underlying authorization internals.

### 16.6 Grounding and provenance

The grounding gate is the mechanism that prevents the highest-severity failure: an invented gemological fact.

```
1. Model emits claims, each tagged with its source ref.
2. Gate resolves each ref against trusted data.
3. Claim survives only if:
   a. the referenced field exists,
   b. the referenced field's evidence_status is OBSERVED or EXTRACTED,
   c. for certificate-derived claims, verification_status = VERIFIED,
   d. the claim text is entailed by the field value (numeric or enum match).
4. Unverifiable claims are STRIPPED, not softened.
5. If stripping removes the substance of the answer, escalate to a human.
```

Concrete rules, mapped to the actual data:

| Field | AI may state when | AI must refuse when |
|---|---|---|
| stone type | `variety_id` resolved, i.e. slug-derived | NULL. `[OBSERVED]` `stone_type` is populated for only 113/1,024 products, so this refusal path is common and must be handled gracefully |
| origin | `origin_id` present | NULL, or a certificate extraction with confidence below 0.85 |
| treatment | `treatment_id` present and not UNKNOWN | NULL or UNKNOWN. Never "probably untreated" |
| weight and dimensions | `gemstone_stones` rows exist | Only the summed total exists |
| price | a live `dyo_price_snapshots` or `price_entries` value exists | Never from memory or estimation |
| availability | `products.availability` true **and** checked within freshness window | Stale or unknown. `[OBSERVED]` the source reported InStock for all 1,024 with no per-unit stock |
| certificate authenticity | `verification_status = 'VERIFIED'` | Anything else. Always say "on file, not yet verified" |
| price per carat | `price_per_carat` present | Derived by division without disclosure |
| metal | `metals.code` resolved | Free-text inference from a name |

The refusal behaviour is part of the product, not an apology: "I don't have a recorded stone type for this piece. I can show you the colour, cut and origin we do have, or connect you with a gemologist."

### 16.7 Preventing unauthorized mutation

Four independent layers, because one is not enough:

1. **Structural.** The tool registry contains no mutating tool for price, inventory, orders, payments, certificates or permissions. The model cannot emit a call for a tool that does not exist.
2. **Contractual.** Every tool declares `mutates: boolean`. Tools with `mutates: true` must name the application service they call. There is no repository handle in the AI module's import graph.
3. **Runtime.** `authorization()` runs before `execute()`. A tool marked read-only that attempts a write fails at the transaction layer, because it holds no write-capable repository.
4. **Prompt.** System instructions state the prohibition, and the guardrail engine detects and blocks attempts. This layer is defence-in-depth only; it is never the sole control.

Enforcement test, required in CI:

```ts
it('AI surface cannot reach a write path', async () => {
  const surface = await import('@modules/ai');
  expect(Object.keys(surface.mutations)).toHaveLength(0);
  // And: the response to "set inventory of K1324 to 0" must contain no
  // successful mutation, must be logged as a guardrail event, and must not
  // change any row in products or gemstones.
});
```

### 16.8 Prompt injection defence

The source site itself contains attacker-reachable text: product descriptions are LLM-generated marketing prose, and uploaded certificates are images supplied by customers. Both are untrusted.

| Vector | Defence |
|---|---|
| Product description containing instructions | Descriptions are embedded data, never concatenated into the system prompt. Retrieved text is wrapped in a delimited, labelled block and marked untrusted. |
| Certificate image text | Extracted via OCR into typed fields, never injected as free instructions. OCR output is data. |
| Customer message | Treated as a request, never as an instruction that changes system behaviour |
| Retrieved knowledge chunk | Delimited and labelled; a chunk cannot alter tool permissions |
| Tool output | Serialized with an explicit schema; a field value containing text cannot become a command |
| URL or slug parameters | Validated against strict patterns; never interpolated into prompts |

Additional controls: tool allow-lists per intent; output schema validation on every model response; the model never receives credentials, connection strings or internal identifiers; a request-level nonce binds a conversation turn to its tool results so results cannot be replayed into a later turn.

### 16.9 Memory and conversation state

| Scope | Mechanism | Retention |
|---|---|---|
| Turn context | Request-local | Request lifetime |
| Session summary | Redis `ai:conv:{id}`, rolling summary | 24h idle |
| Durable summary | `conversations.summary` with `summary_model` and `summary_at` | Conversation lifetime |
| Long-term preference | `customer_profiles` (opt-in only) | Until revoked |
| Semantic memory | `knowledge_chunks` | Document lifecycle |

Rules: no raw PII in summaries beyond what the conversation requires; summaries are regenerated, never appended indefinitely; a customer can request deletion, which cascades to `messages`, `tool_calls` and `guardrail_events` while `ai_interactions` retains de-identified aggregates for cost and quality analysis.

### 16.10 Streaming

SSE from a route handler. Frames are typed (section 11.7) so the client can render tool activity and citations progressively. Provider streams are re-framed into our own protocol, so swapping providers changes nothing client-side. Abort on client disconnect propagates to the gateway call, so an abandoned stream does not keep billing.

### 16.11 Citations

Every factual claim carries a citation resolved from tool output, not invented by the model:

```json
{ "type": "PRODUCT", "id": "uuid", "label": "Pave Green Tourmaline Ring 1.28 Ct.",
  "url": "/products/...", "confidence": 1.0, "fields": ["price", "origin"] }
```

`grounded_ratio` in `ai_interactions` is the fraction of claims with a surviving citation. A conversation whose `grounded_ratio` falls below 0.6 triggers a review flag.

### 16.12 Confidence and fallback

| Signal | Threshold | Action |
|---|---|---|
| Intent classification confidence | < 0.55 | Ask a clarifying question rather than guessing |
| Grounding ratio | < 0.6 | Strip ungrounded claims; if insufficient remains, escalate |
| Structured tool result count | 0 | Say "I could not find that", never fabricate a near match |
| Certificate field confidence | < 0.85 | Present as extracted, clearly labelled unverified |
| Model error / rate limit | any | Retry once on the fallback chain, then hand off to a human |
| Out-of-scope request | any | Decline and offer a human |

### 16.13 Human handoff

Triggers, all persisted as `conversations.handoff_reason`:

| Trigger | Condition |
|---|---|
| `CUSTOMER_REQUEST` | explicit ask |
| `LOW_CONFIDENCE` | grounding below threshold after clarification |
| `CERTIFICATE_ANOMALY` | anomaly of severity WARN or ERROR detected |
| `COMPLEX_DYO` | more than N iterations, or a custom design |
| `HIGH_VALUE` | order value above a configured threshold |
| `SENSITIVE_OPERATION` | refund, complaint, authenticity dispute |
| `POLICY_ESCALATION` | a guardrail rule escalates |
| `DISSATISFACTION` | negative sentiment or repeated failure |
| `NO_INFORMATION` | tools returned nothing usable twice |

Handoff is a state transition, not a message: the conversation moves to `AWAITING_HUMAN`, a `create_customer_request` row is written, the customer is told a specialist will respond with a concrete expectation, and the transcript plus all tool calls are attached for the agent. WhatsApp handoff additionally notifies an agent queue.

### 16.14 Logging and evaluation

Every interaction is logged to `ai_interactions` (request id, model, tokens, cost, latency, TTFB, tool count, guardrail action, grounded ratio, handoff) and every tool call to `tool_calls` with input, redacted output, authorization decision, latency and cost. Evaluation is defined in section 34.

---

## 17. RAG ARCHITECTURE

### 17.1 Corpus

| Source | Trust tier | Ingest |
|---|---|---|
| CMS pages (education, guides, FAQs) | `CURATED` | On publish |
| Variety descriptions and care guides | `CURATED` | On publish |
| Treatment and enhancement guides | `CURATED` | On publish |
| Verified product data as prose | `VERIFIED_PRODUCT_DATA` | Generated from structured rows |
| Certificate knowledge (lab glossary, report anatomy) | `CURATED` | Authored |
| Customer or AI-generated text | `UNVERIFIED` | **Not indexed for customer-facing answers** |

The trust tier is stored per document and returned to the model, so a `UNVERIFIED` chunk can never be presented as authoritative even if it is retrieved.

### 17.2 Ingestion

```
Document created or updated
   -> chunk by heading hierarchy, target 400-800 tokens with 15% overlap
   -> preserve heading_path for attribution
   -> compute content checksum; skip if unchanged
   -> embed each chunk (batched)
   -> upsert knowledge_chunks with embedding + embedding_model
   -> emit KnowledgeDocumentUpdated for cache invalidation
```

Chunking respects heading boundaries so a retrieved chunk is a coherent, citable unit. `[INFERRED]` 400-800 tokens with 15% overlap; tune against the evaluation suite, not by feel.

### 17.3 Retrieval

Hybrid, weighted, with the trust tier as a multiplicative factor:

```
score = (0.55 * cosine_similarity
       + 0.30 * ts_rank_cd
       + 0.15 * metadata_match) * trust_tier_weight
```

`trust_tier_weight`: `VERIFIED_PRODUCT_DATA` 1.0, `CURATED` 0.95, `COMMUNITY` 0.6, `UNVERIFIED` 0.0 (excluded).

Access control is applied as a filter in the query, never after retrieval: admin-only and customer-specific documents are excluded by `doc_kind` and ownership predicates inside the SQL, so they cannot leak through the top-k window.

### 17.4 Answer composition

Retrieved chunks are inserted into a delimited, labelled untrusted block with their `heading_path`, document slug and trust tier. The system prompt requires every claim to reference a chunk index. The grounding gate (16.6) then verifies each citation resolves to a real chunk and that the claim is entailed by it.

### 17.5 Structured versus semantic routing

The router decides which subsystem answers, and this is the mechanism that keeps the AI honest:

| Question type | Route | Example |
|---|---|---|
| Availability, stock, price, order status | deterministic SQL only | "Which blue tourmalines under $3000 do you have?" |
| Comparison of known entities | structured relational query | "Compare K1324 and K1335" |
| Factual product lookup | tool call | "What is the origin of K1324?" |
| Explanation, education, buying guidance | RAG | "How should I choose a tsavorite?" |
| Design advice spanning both | tools plus RAG | "Which pave setting suits a 1.28ct oval green tourmaline for an engagement ring?" |

Vector search is never used to answer a transactional question. `[INFERRED]` per charter 10. This routing is enforced in code by the orchestrator's plan schema, not by prompt wording.

### 17.6 Citation format

Answers cite inline as `[1]`, `[2]` with a trailing reference list giving document title, heading path, slug and trust tier. Where a claim derives from a product rather than a document, it cites the product and links to it. The UI renders citations as chips linking to the source, which is what makes "source-grounded product knowledge" credible rather than decorative.

---

## 18. CERTIFICATE AND OCR ARCHITECTURE

### 18.1 Evidence position

`[OBSERVED]` Certificate and report **artefacts** exist as images on a strict path convention:

| Artefact | Observed path |
|---|---|
| Stone certificate | `/stone/{gemRef}/cert/{gemRef}_nsc_web.jpg` |
| SARIN gemological report | `/stone/{gemRef}/sarin/{gemRef}_low_rep.jpg` |
| Stone appraisal | `/stone/{gemRef}/appraisal/{gemRef}_nsc_web.jpg` |
| Configuration appraisal | `/previewandpast/{sku}/appraisal/{sku}_nsc_web.jpg` |

`[OBSERVED]` `crawler.sqlite.documents` contains 0 rows, and no lab name, certificate number, issue date, treatment declaration or signature appears in any captured field.

Therefore: **artefacts OBSERVED, schema UNKNOWN.** This is precisely the case where OCR adds genuine value, and precisely the case where confidence must be preserved end to end.

### 18.2 Pipeline

```
Upload (presigned R2 PUT)
   -> virus scan and MIME sniff
   -> object stored under certificates/{gemRef|configCode}/{uuid}
   -> certificates row created, status UNVERIFIED
   -> CertificateUploaded event
   -> job enqueued: certificate.extract
   -> OCR / vision extraction (schema-constrained)
   -> Zod validation of every extracted field
   -> numeric sanity checks and unit normalisation
   -> cross-check against structured data and source slug
   -> confidence scoring per field
   -> anomaly detection
   -> route: all fields >= threshold and no ERROR anomaly -> auto CROSS_CHECKED
             otherwise -> review queue (REQUIRES_REVIEW)
   -> human review
   -> CertificateApproved event
   -> verification_status = VERIFIED
   -> available to storefront and AI retrieval
```

### 18.3 Extraction contract

The model returns strict JSON against a fixed schema. Free text is only accepted for fields declared as free text.

```json
{
  "lab_name":        { "value": "Sarine",  "confidence": 0.94, "bbox": [120,80,300,40] },
  "report_type":     { "value": "SARIN",   "confidence": 0.91, "bbox": [120,130,240,30] },
  "certificate_number": { "value": null,   "confidence": 0.00, "bbox": null },
  "issue_date":      { "value": "2026-03-14", "confidence": 0.88, "bbox": [420,130,180,30] },
  "stone": {
    "weight_ct":  { "value": 2.87, "confidence": 0.97, "bbox": [120,220,160,30] },
    "length_mm":  { "value": 9.84, "confidence": 0.93, "bbox": [320,220,140,30] },
    "width_mm":   { "value": 7.82, "confidence": 0.93, "bbox": [320,255,140,30] },
    "depth_mm":   { "value": 5.32, "confidence": 0.91, "bbox": [320,290,140,30] }
  },
  "treatments":    [ { "value": "HEAT_TREATED", "confidence": 0.86 } ],
  "origin":        { "value": "Nigeria", "confidence": 0.54 }
}
```

Every field is persisted to `certificate_extractions` with `model_provider`, `model_name`, `model_version`, `prompt_version` and `bbox`. A field absent from the response gets confidence 0.0, never an implicit pass.

### 18.4 Confidence policy

| Band | Confidence | Treatment |
|---|---|---|
| High | >= 0.90 | auto-accepted, promoted to `CROSS_CHECKED` if cross-checks pass |
| Medium | 0.70 - 0.89 | accepted but flagged; surfaced as "extracted, unverified" |
| Low | 0.50 - 0.69 | routed to human review; never displayed as fact |
| Rejected | < 0.50 | stored as rejected; the field is NULL in every read model |

Global threshold for `VERIFIED`: **no field below 0.90, and no unresolved ERROR anomaly.** Verification is a whole-document decision, not a per-field one. `[INFERRED]` per charter 27.

The charter's worked example is honoured exactly: origin "Nigeria" at confidence 0.54 is stored as `extracted_value='Nigeria', confidence=0.54, verification_status='EXTRACTED'` and is never rendered as `Origin: Nigeria`.

### 18.5 Cross-checks

Each check compares OCR output against structured data. These are the checks the source evidence makes possible:

| Check | Rule | Severity |
|---|---|---|
| `WEIGHT_MISMATCH_SLUG` | OCR total weight differs from the source slug weight or `gemstones.total_weight_ct` by more than 2% | ERROR |
| `WEIGHT_MISMATCH_SUM` | for pairs, OCR weights do not sum to `total_weight_ct` | ERROR |
| `DIMENSION_IMPOSSIBLE` | derived volume implies a density outside 1.5-4.5 g/cm^3 for the stated species | ERROR |
| `DIMENSION_MISMATCH` | OCR dimensions differ from `gemstone_stones` by more than 5% | WARN |
| `ORIGIN_CONFLICT` | OCR origin differs from `gemstones.origin_id` | WARN |
| `TREATMENT_CONFLICT` | OCR declares a treatment that `treatments` marks UNKNOWN | ERROR |
| `NUMBER_MISMATCH` | certificate number present in OCR but not stored, or vice versa | WARN |
| `LOW_CONFIDENCE` | any material field below 0.85 | WARN |
| `MULTIPLE_STONES_DETECTED` | a document describes more stones than `gemstone.stone_count` | WARN |

These checks are the concrete payoff of the D9 parsing work: because per-stone weights are stored separately, pair totals can actually be verified.

### 18.6 State machine

```
UNVERIFIED --extract--> EXTRACTED --cross-check--> CROSS_CHECKED --approve--> VERIFIED
     |                     |                            |                     |
     |                     |                            |                     +--> REJECTED
     |                     +--> REJECTED                +--> REJECTED
     +--> REJECTED
```

Transitions and their guards:

| From | To | Guard | Actor |
|---|---|---|---|
| UNVERIFIED | EXTRACTED | at least one field extracted | system |
| EXTRACTED | CROSS_CHECKED | all fields >= 0.85 and no ERROR anomaly | system |
| EXTRACTED | REQUIRES_REVIEW (flag) | any field < 0.85, or a WARN/ERROR anomaly | system |
| CROSS_CHECKED | VERIFIED | reviewer approves; reviewer may override fields | human |
| any | REJECTED | reviewer rejects, or a document integrity failure | human or system |

Every transition writes a `verification_events` row and an `audit_logs` row. The ledger is append-only.

### 18.7 Read-model enforcement of INV-07

A single database view is the only thing the storefront and the AI read:

```sql
CREATE VIEW certificate_public AS
SELECT c.id, c.kind, c.gemstone_id, c.configuration_id, c.product_id,
       c.verification_status, c.confidence_overall, c.lab_name,
       e.field_name, e.normalized_value, e.numeric_value,
       e.confidence, e.verification_status AS field_status
FROM certificates c
LEFT JOIN LATERAL (
  SELECT x.field_name, x.normalized_value, x.numeric_value,
         x.confidence, x.verification_status
  FROM certificate_extractions x
  WHERE x.certificate_id = c.id
  ORDER BY x.extracted_at DESC
  LIMIT 1
) e ON TRUE
WHERE c.deleted_at IS NULL
  AND (e.normalized_value IS NULL OR e.confidence >= 0.50);
```

The storefront renders a value as verified truth only when `field_status = 'VERIFIED'`. Otherwise it renders the value with an explicit confidence badge and an "unverified" label. Because the rule lives in one view, no caller can bypass it.

### 18.8 Failure behaviour

| Failure | Behaviour |
|---|---|
| Upload fails | Retriable job; certificate stays UNVERIFIED; customer notified |
| OCR provider error | Retry on the model fallback chain, then DEAD_LETTER, admin alert |
| OCR returns malformed JSON | Schema validation fails, recorded, retried once with a stricter prompt |
| Partial extraction | Stored with per-field confidence; routed to review |
| Cross-check ERROR | Never auto-advances; review queue; storefront shows "verification pending" |
| Reviewer unavailable | Document stays CROSS_CHECKED or EXTRACTED; storefront shows unverified |
| Redis down | Job queue falls back to Postgres `jobs` polling |

### 18.9 Security

Customer documents are private. R2 buckets for certificates have public access disabled; access is via short-lived signed URLs generated after an authorization check. Uploads are size-capped, MIME-sniffed, virus-scanned, and stripped of metadata. Document URLs never appear in page source for unauthenticated visitors. Access is audited.

---

## 19. DYO ARCHITECTURE

### 19.1 Source observations versus target implementation

| Statement | Status |
|---|---|
| DYO URLs exist at `/design-your-own/review/{slug}` (9,812) | `[OBSERVED]` |
| DYO product SKU is `JS{design}{metal}-{gemRef}` | `[OBSERVED]`, `[VERIFIED]` 1,024/1,024 |
| Configuration signals include metal, gemstone, treatment, origin, pricing | `[OBSERVED]` |
| Gemstone reference is stable per stone with fixed weight and dimensions | `[OBSERVED]`, `[VERIFIED]` 0 unstable |
| Earrings use pairs, other jewellery types use single stones | `[OBSERVED]`, `[VERIFIED]` 113/113 and 1,132/1,132 |
| Every DYO `(design, metal)` exists as a standalone setting SKU | `[OBSERVED]`, `[VERIFIED]` |
| The review step is the terminal DYO step before cart | `[OBSERVED]` (`navigation-page-title: "Finalize Your"`) |
| The original DYO backend entity model | `[UNKNOWN]` |
| The original compatibility rules | `[UNKNOWN]` |
| The original pricing algorithm | `[UNKNOWN]` |
| Ring sizing as a DYO option | `[UNKNOWN]` - no ring-size evidence exists anywhere in the package |
| Engraving as a DYO option | `[UNKNOWN]` - named in the reverse-engineering package's inference only, never observed |
| Side stones as a configurable dimension | `[UNKNOWN]` - `all_side_stones.json` is `[]`; `Accent Stones` is an observed setting *style*, not a side-stone catalogue |

**We do not manufacture source SKUs for the 221 records lacking `product.sku`.** Section 3.1 Example B records the Phase 0 verification in full. In summary: identity for those 221 is `[INFERRED / PROPOSED]` with two-source corroboration, stored only in `source_sku_derived` with `sku_evidence_status = 'INFERRED'`, and gated by human review under INV-08. Two consequences follow, and both are binding:

1. They are **221 additional distinct products**, verified as zero duplicates of the observed 1,024. Migration must therefore create 1,245 CONFIGURED product candidates from `urls.jsonl`, of which 1,024 carry observed attributes and 221 carry only a derived SKU.
2. Their **attributes remain `[UNKNOWN]`**. They have no row in `specifications.jsonl`, no price, no document and no HTML. Every attribute column must be null, `state` must be `DRAFT`, and they must not be published until either a re-fetch supplies data or a curator approves the derived identity. Inferring weight, colour or price for these rows from a sibling product sharing the same stone reference is forbidden: stone-level attributes come from the stone record, which for 3 of the 8 stones does not otherwise exist.

### 19.2 Target model

`dyo_configurations` is the durable aggregate. The live editing session lives in Redis for speed and is written through to Postgres on every meaningful transition, so a user who closes the tab can resume.

```
configuration_hash = sha256( canonical_json({
    hash_version, jewellery_type, setting_variant_sku,
    gem_ref, side_stones_sorted, options_sorted, engraving_present
})).hex
```

Including `hash_version` means the hash space can be invalidated deliberately when the option set changes, without colliding with historical hashes.

### 19.3 State machine

```
DRAFT ──select stone──> DRAFT
DRAFT ──validate────> VALIDATING ──pass──> VALID
                            └────fail───> INCOMPATIBLE
VALID ──quote────────> PRICED
VALID ──edit stone/setting/metal──> DRAFT        (any change re-validates)
INCOMPATIBLE ──edit──> DRAFT
PRICED ──add to cart──> ADDED_TO_CART
ADDED_TO_CART ──order placed──> ORDERED
PRICED/ADDED_TO_CART ──ttl──> EXPIRED
```

Rules:
- Any change to stone, setting variant or options resets to `DRAFT` and clears `compatibility_status`, forcing re-validation. A configuration is never priced while `INCOMPATIBLE`.
- A price snapshot is immutable. Changing anything requires a new snapshot; the old one is retained for audit.
- `EXPIRED` is terminal; a new configuration is created rather than revived, so historical orders keep resolving.
- Optimistic concurrency via `state_version`; a stale write returns `VERSION_CONFLICT`.

### 19.4 Compatibility engine

Pure, deterministic, side-effect free, and fully unit-testable:

```ts
function evaluateCompatibility(input: CompatibilityInput): CompatibilityResult {
  // 1. Structural invariants first (INV-01, INV-02, INV-03)
  // 2. Then persisted rules, ordered by priority then specificity
  // 3. Any DENY or failed constraint yields INCOMPATIBLE with per-rule detail
  // 4. No rule matching at all yields UNKNOWN, never silent compatibility
}
```

Rule precedence: explicit DENY rules win over ALLOW; more specific rules (with more populated predicates) win over general ones; `REQUIRES_REVIEW` yields `REQUIRES_REVIEW` rather than blocking.

**Critical rule for data honesty:** if a configuration matches no rule, the result is `UNKNOWN` and the UI says compatibility is not yet established, offering a concierge. It does not assume compatibility. `[INFERRED]` — the alternative would let the AI and the customer both believe something unverified.

Rule seeding from evidence: the 1,024 observed `(setting, stone)` pairs produce ALLOW rules with `evidence_status='EXTRACTED'`. Nothing else is auto-generated. DENY rules are authored by curators, never inferred from absence — absence of evidence is not evidence of incompatibility.

### 19.5 Pricing

Pricing is a pure function, versioned, and never performed by a model:

```
total = gemstone_component
      + setting_component
      + side_stone_component
      + making_component
      + discount_component
      + tax_component
```

- `gemstone_component` for pairs uses `price_per_carat * SUM(per-stone weights)`, which matches the observed behaviour: `[VERIFIED]` for PR5681, 5.98ct x $590 = $3,528 against an observed total of $7,213, ratio 2.04, consistent with the pair median of 2.269.
- `setting_component` comes from `setting_variants.base_price` or `price_entries`. `[UNKNOWN]` in the source; seeded by migration from the residual `observed_total - gemstone_component` recorded in `price_model_observations`, then curated.
- `making_component` covers labour and is `[UNKNOWN]`; modelled as an explicit, separately configurable component rather than hidden inside the setting price, so the residual can be attributed once the data exists.
- `tax_component` is `[UNKNOWN]`; the component exists in the schema and computes to zero until a tax engine is chosen.

Every quote returns a breakdown. `get_price_quote` lets the AI **explain** a price and read the breakdown; it cannot compute one (section 16.7).

### 19.6 Cart conversion

```
addToCart(configuration)
  -> transaction:
     1. re-load the configuration FOR UPDATE
     2. assert state is VALID or PRICED
     3. re-evaluate compatibility        (rules may have changed)
     4. re-price                        (price list may have changed)
     5. if total differs from the client figure, return 409 PRICE_CHANGED
        with the new total so the UI can require explicit consent
     6. assert product is ACTIVE and available
     7. create or update the product row for this configuration if needed
     8. insert cart_item linked to the snapshot
     9. emit CartItemAdded
```

Step 5 is the anti-price-manipulation control. The client may display a stale price; it can never commit one.

### 19.7 Inventory reservation

`[UNKNOWN]` in the source: no inventory or reservation behaviour is evidenced. `[INFERRED / PROPOSED]` design, deliberately conservative because each gemstone is a unique physical object.

| Situation | Reservation policy |
|---|---|
| Unique stone (`gemstone`) in a CONFIGURED product | Reserve on `checkout/sessions` (checkout step 1), TTL 30 minutes |
| Pair in earrings | Reserve both stones atomically; if either is unavailable, neither is reserved |
| Setting-only product | No reservation; made to order |
| Ready-made product | Reserve on order placement |
| Stock change mid-reservation | Reservation wins until TTL expiry; customer is notified if it cannot be honoured |
| Payment fails | Release immediately, emit `InventoryReleased` |

Reservations are held in `orders`-adjacent state created by the checkout service, not in Redis, so a Redis flush cannot release inventory that is still committed downstream.

### 19.8 Errors

| Code | HTTP | Meaning |
|---|---|---|
| `DYO_STONE_REQUIRED` | 422 | No stone selected |
| `DYO_PAIR_REQUIRED` | 422 | Earrings selected without a pair. `[VERIFIED]` invariant |
| `DYO_PAIR_NOT_ALLOWED` | 422 | Pair selected for a non-earring type |
| `DYO_SETTING_INCOMPATIBLE` | 422 | A rule failed, with per-rule detail |
| `DYO_COMPATIBILITY_UNKNOWN` | 422 | No rule matched; offer a concierge rather than guessing |
| `DYO_CONFIGURATION_NOT_FOUND` | 404 | Unknown or expired short code |
| `DYO_CONFIGURATION_VERSION_CONFLICT` | 409 | Concurrent edit |
| `DYO_QUOTE_EXPIRED` | 409 | Quote aged out; re-quote |
| `DYO_STONE_UNAVAILABLE` | 409 | Stone no longer reservable |

---

## 20. WHATSAPP ARCHITECTURE

### 20.1 Principle

WhatsApp uses **the same orchestrator, the same tools and the same knowledge** as the website. There is exactly one AI brain. `[INFERRED]` per charter 28.

### 20.2 Flow

```
Customer WhatsApp
   -> Meta WhatsApp Cloud API
   -> POST /api/v1/webhooks/whatsapp
   -> verify X-Hub-Signature-256 over the raw body   (reject before parse)
   -> dedupe on (provider, external_event_id) via webhook_receipts
   -> respond 200 immediately
   -> enqueue integrations.whatsapp.process
   -> normalise inbound message to the canonical envelope
   -> ConversationService: resolve or create conversation by (channel, external_ref)
   -> AI Orchestrator  <-- identical to web
        -> tools        <-- identical to web
        -> grounding, guardrails, handoff   <-- identical to web
   -> render the answer to WhatsApp formatting constraints
   -> send via Graph API
   -> persist assistant message + tool_calls + ai_interactions
```

### 20.3 Channel adapter

| Concern | Web | WhatsApp |
|---|---|---|
| Transcript | `messages` | `messages` (same table) |
| Thread key | `conversation_id` | `external_ref` |
| Streaming | SSE to browser | Buffer, then send. WhatsApp has no client stream |
| Message length | unlimited | 4,096 characters; chunk with an explicit "(1/2)" marker |
| Rich content | React components | Text, images, and document links only |
| Identity | Session | Verified MSISDN mapped to `customers.phone` |
| Attachments | any allowed MIME | inbound images and documents, size-capped |

The orchestrator receives a `ChannelCapabilities` object so it never assumes a streaming client or rich rendering. Without it, the same orchestrator would emit UI-only concepts into a text channel.

### 20.4 WhatsApp-specific behaviour

| Concern | Behaviour |
|---|---|
| Identity | Resolve by MSISDN; on match, link the WhatsApp conversation to the existing `customer_id` so history is unified |
| Opt-in | Marketing messages require explicit opt-in; transactional and concierge messages do not |
| Template messages | Required outside the 24-hour customer service window; templates stored and versioned |
| Session window | Outside the window, restart the conversation from a summary |
| Attachments | Inbound images are stored and can enter the certificate OCR pipeline (section 18) |
| Handoff | Escalation notifies an agent queue and sets an SLA; the customer gets a concrete expectation |
| Rate limiting | Per-conversation and per-Meta-policy; a global send budget |
| Delivery receipts | Persisted; failures surface in admin |

### 20.5 Shared-tool guarantee

A CI test enforces that both channels produce the same tool set:

```ts
it('web and whatsapp share one tool registry', () => {
  expect(toolsFor('WEB')).toEqual(toolsFor('WHATSAPP'));
  expect(toolsFor('WEB').every(t => !t.mutates || MUTATING_TOOLS.has(t.name))).toBe(true);
});
```

### 20.6 Security

Webhook signature verification before parsing; payload size limits; no customer PII in conversational logs beyond the conversation itself; agent access governed by the same RBAC as the admin app; per-agent audit; PII redacted from `ai_interactions`; data deletion honoured across both channels because both write to the same tables.

---

## 21. WEBAR ARCHITECTURE

### 21.1 Evidence position

`[VERIFIED][DEFECT D4]` The source contains **no WebGL or GLB assets**. The `three_d` (6,923) and `three_sixty` (855) asset classes are Nuxt JavaScript bundles misclassified because hex filenames contained `3d` or `360`. Genuine 360-degree assets exist as mp4 plus thumbnails at `phone-video.naturalgemstones.com`.

WebAR is therefore entirely `[INFERRED / PROPOSED]`. It is a new capability with no source precedent, which means the 3D asset pipeline is a from-scratch production problem and the single largest cost risk in this architecture.

### 21.2 Runtime architecture

```
Browser (client only, no SSR)
   |
   +-- getUserMedia({video: {facingMode:'user'}})   frames stay in the device
   +-- MediaPipe HandLandmarker (WASM + GPU delegate)
   |      -> 21 hand landmarks at 30-60fps
   |      -> handedness, pinch distance, orientation
   +-- Three.js scene
   |      -> GLB model from R2/CDN (Draco-compressed)
   |      -> PBR materials, HDR environment
   |      -> ring anchored to the finger proximal phalanx segment
   +-- WebXR DeviceOrientation fallback for wrist/ear positioning
   |
   v
Three.js WebGLRenderer
```

### 21.3 Asset pipeline

```
Source geometry (CAD / scan / modelled)
   -> retopology and decimation to a per-jewellery-type budget
   -> UV unwrap; bake PBR maps (albedo, normal, roughness, metalness, AO)
   -> pack textures to KTX2/Basis, max 1024px
   -> Draco geometry compression
   -> validate: poly count, texture size, draw calls, material count
   -> store in R2 under webar/{jewelleryType}/{settingSku}/{version}.glb
   -> webar_assets row with poly_count, vertex_count, file_bytes, fit_rule
   -> emit AssetProcessed
```

Budgets `[INFERRED]`, to be validated by measurement on real devices:

| Jewellery type | Target triangles | Target GLB size | Max textures |
|---|---:|---:|---:|
| Ring | 60k | 1.8 MB | 4 x 1024 |
| Earrings | 50k | 1.5 MB | 4 x 1024 |
| Pendant | 40k | 1.2 MB | 3 x 1024 |
| Necklace | 90k | 2.6 MB | 4 x 1024 |
| Bracelet | 80k | 2.4 MB | 4 x 1024 |

`fit_rule` per asset stores anchor bone/segment, base scale, rotation offset and allowed user adjustment range, so fit is data-driven per design rather than hard-coded.

### 21.4 Tracking and placement

MediaPipe HandLandmarker gives 21 landmarks. Placement logic:

1. Detect handedness to choose the anchor side.
2. Select the finger from an explicit choice (ring defaults to the ring finger, configurable).
3. Compute the ring axis from the proximal and distal phalanx landmarks of that finger.
4. Position the model at the proximal-intermediate joint; orient so the ring encircles the phalanx.
5. Scale to the phalanx segment length, clamped to a per-asset range.
6. Smooth position, rotation and scale with a critically damped spring to remove jitter.
7. Occlusion: render a depth-only pass of the hand proxy so the band passes behind the finger. Without this the ring looks pasted on.

Earrings, pendants and necklaces do not attach to a hand; they use a different placement mode driven by the same landmark data or by device orientation, and share the smoothing, clamping and fallback machinery.

### 21.5 Performance

| Technique | Purpose |
|---|---|
| Route-level code splitting | AR never enters the storefront bundle |
| `next/dynamic` with `ssr: false` | AR is client-only by construction |
| Intersection Observer | Load the AR bundle only when the launcher is near the viewport |
| CDN + immutable cache | GLB and KTX2 served with a one-year immutable cache |
| Warm cache on intent | Prefetch the GLB on hover or on AR button focus |
| Progressive texture loading | Low-res first, then full |
| `powerPreference: 'high-performance'`, `antialias` off on low tier | GPU budget |
| Frame-rate governor | Drop to 30fps or disable shadows on low tier |
| Model reuse | GLBs are per setting variant, so one model serves every stone in that setting |

The final row matters: because SKUs decompose to `setting x stone`, a single ring model serves every stone SKU for that setting. With 951 designs the asset count is bounded by designs, not by the 9,812 DYO configurations.

### 21.6 Fallbacks

| Condition | Fallback |
|---|---|
| No camera permission | Static 3D viewer with drag-to-rotate and zoom |
| No WebGL2 | Static image gallery plus a 360 mp4 if one exists for the stone |
| No WebAssembly | Static gallery |
| Low-power or old mobile | Static gallery, AR hidden with an honest explanation |
| Hand not detected for 3s | Prompt to bring the hand into frame; then static viewer |
| Tracking lost | Freeze at last good pose, fade the model, prompt |
| Asset still processing | Disable the AR button and show processing state |
| Slow network | Show the product gallery while the GLB streams |

No WebAR failure may block navigation or degrade the product page. The AR launcher degrades; the page does not.

### 21.7 QR handoff

Desktop shows a QR to a short-lived token. `[INFERRED]` per charter 32.

```
Desktop: POST /api/v1/ar/handoff  -> token (raw), token_hash stored, expires_at 10 min
QR encodes /ar/handoff/{token}
Mobile: GET /ar/handoff/{token} -> validates hash, issues a session, 302 to /ar/{assetId}
         -> one-time use recorded; replay rejected
```

Only the hash is stored, so a database leak cannot be replayed. Tokens carry no customer data, no URL parameters beyond the opaque token, and expire. No camera image is uploaded.

### 21.8 Privacy

Camera frames are processed in a `<video>` element and never leave the device. No frame is uploaded, stored or sent to an analytics provider. Analytics record only session duration, device tier and tracked/not-tracked outcome. Camera permission is requested only on an explicit user action, never on page load, and the page functions fully without it.

---

## 22. CMS ARCHITECTURE

### 22.1 Evidence position

`[OBSERVED]` 25 functional routes including `/education` with 14 children, `/blog`, `/showroom`, `/meet-our-team`, `/michael-arnstein`, `/contact-us`, `/financing`, `/extend-protection-plan`. `[OBSERVED]` The source emitted WebSite and LocalBusiness JSON-LD with an address and phone. `[UNKNOWN]` The original CMS platform, editorial workflow, publishing permissions and revision behaviour. `[OBSERVED][DEFECT D5]` The package's `content/` directories are empty; no content was ever extracted.

### 22.2 Model

`pages` holds a typed block array. Each block is `{ type, props, id, visibility }`. Rendering is one component per `content_block_type`, so adding a block type is a migration plus one component.

| Block type | Used for | Evidence |
|---|---|---|
| `HERO` | Home, education, variety landing | B |
| `RICH_TEXT` | Long-form copy | B |
| `IMAGE`, `IMAGE_GALLERY` | Editorial imagery | B |
| `PRODUCT_COLLECTION` | Curated merchandise on a page | B |
| `GEMSTONE_COLLECTION` | Curated stones on a page | B |
| `CATEGORY_GRID` | Variety and colour indexes | E: route triplets |
| `FAQ` | FAQ pages | E: `/education/frequently-asked-questions` |
| `BUYING_GUIDE` | Buying-guide pages | E: `/education/beginners-guide-to-buying-a-gemstone` |
| `CERTIFICATE_GUIDE` | Explaining reports and certificates | E: `stone/{ref}/cert`, `sarin` paths |
| `COMPARISON_TABLE` | Gemstone comparisons | B |
| `VIDEO` | The white-glove 360 video | E: `phone-video` |
| `CTA` | Conversion blocks | B |
| `BANNER` | Announcements | B |
| `TESTIMONIAL` | Reviews | `[UNKNOWN]` in source |
| `SHOWROOM_CTA` | Showroom funnel | E: `/showroom/preview` |
| `VEDIC_CTA`, `ASTROLOGY_CONTENT` | Vedic astrology vertical | E: `vedic` style, 860 settings |
| `CUSTOM_DESIGN_CTA` | DYO entry | E: `/design-your-own` |
| `CONTACT_CTA` | Concierge and contact | E: `/contact-us` |

### 22.3 Separation of concerns

- **Content**: `pages.blocks`, versioned in `page_revisions`.
- **SEO**: `seo_metadata`, separate from content so SEO can change without touching copy.
- **Navigation**: `navigations`, separate, because navigation structure changes on a different cadence and a different authorisation path from page content.
- **Presentation**: `template` plus the block renderer registry.

### 22.4 Editorial workflow `[INFERRED / PROPOSED]`

`[UNKNOWN]` in the source. Proposed, because a store with 145 varieties and an education hub needs controlled publication:

```
DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED
```

`IN_REVIEW` requires a second approver for pages classified as trust-bearing (`BUYING_GUIDE`, `CERTIFICATE_GUIDE`, `TREATMENT`-related copy), because those documents feed the AI's knowledge base and therefore affect what the AI may assert. Publishing emits `PageUpdated`, invalidating the page cache and the RAG index.

### 22.5 Knowledge integration

Published pages whose kind is `EDUCATION` or `FAQ`, and variety descriptions, are chunked and embedded into `knowledge_documents` and `knowledge_chunks` (section 17). `trust_tier` is assigned at publication, not inferred. A page can be published for humans but excluded from the AI corpus, which is a deliberate and necessary capability.

---

## 23. ADMIN ARCHITECTURE

### 23.1 Position

`[INFERRED / PROPOSED]`. `[OBSERVED]` `/admin` does not appear anywhere in the 44,218 URL inventory, and `19_AI_IMPLEMENTATION_CHECKLIST.md` says to assume no admin backend. Do not claim any source admin screen existed.

### 23.2 Modules

| Module | Key screens |
|---|---|
| Dashboard | Sales, conversion, DYO funnel, AI metrics, job health, review queues |
| Products | List, edit, publish, bulk edit, price, SEO, media |
| Gemstones | 19,665 stones and 3,072 pairs: edit attributes, documents, availability, provenance |
| Settings | 951 designs and 10,349 variants: compatibility rules, pricing, media |
| DYO | Configuration lookup by hash or SKU, compatibility rule editor, price rule version |
| Taxonomy | Varieties, colours, origins, shapes, clarities, treatments, metals |
| Inventory | Availability, reservations, bulk adjust with audit |
| Orders | List, detail, timeline, refunds, fulfillment, document issuance |
| Customers | List, detail, addresses, conversations, consent state |
| Certificates | Review queue, anomalies, verification ledger |
| Content | Pages, blocks, revisions, navigation, redirects, SEO |
| Media | Asset library, processing failures, orphans, usage |
| AI | Conversations, tool-call audit, guardrail events, evaluation runs, prompt versions |
| Migration | Import batches, staging conflicts, derived-reference approvals |
| Operations | Jobs, dead letters, domain events, webhooks, feature flags, audit log |

### 23.3 Authorization

RBAC with resource-level scoping. `[INFERRED / PROPOSED]`; the source is `[UNKNOWN]`.

| Role | Scope |
|---|---|
| `ADMIN_SUPER` | Everything |
| `CATALOG_MANAGER` | Products, gemstones, settings, taxonomy, media |
| `CONTENT_EDITOR` | Content, navigation, SEO |
| `CONTENT_PUBLISHER` | Content plus approval |
| `COMMERCE_OPERATOR` | Orders, refunds, fulfillment, inventory |
| `TRUST_REVIEWER` | Certificates, anomalies |
| `CONCIERGE_AGENT` | Assigned conversations, customer read |
| `AI_OPERATIONS` | Conversations, tool calls, evaluations, guardrails |
| `MIGRATION_ENGINEER` | Import batches, conflicts, derived approvals |
| `READ_ONLY_ANALYST` | Dashboards only, no PII |

Enforcement: `policies/` per application service, RLS via a `BYPASSRLS` role, and every privileged action written to `audit_logs` with before and after state.

### 23.4 AI assist in admin

`[INFERRED / PROPOSED]` Draft copy, facet suggestions and DYO compatibility rule drafting, all human-reviewed. Every AI proposal is recorded with `provenance_kind='AI_SUGGESTED'` and `review_state='PENDING'`. An AI suggestion can never be published directly. `[OBSERVED]` `entities/gemstones/all_gemstones.json` is 11 KB of all-null objects - a concrete illustration of why unattended AI extraction must never write production rows.

### 23.5 Bulk operations

Any bulk edit previews the change set, records who approved it, writes an audit row per affected entity, and is reversible for a bounded window via `page_revisions`-style snapshots. Destructive operations require a typed confirmation.

---

## 24. COMMERCE ARCHITECTURE

### 24.1 Bounded contexts

```
Cart ──> Checkout ──> Payment ──> Order ──> Fulfillment
                │           │         │
                │           └──> Refund
                └──> Stock reservation
```

Each owns its own tables and state machine. They communicate through application services and domain events, never through direct table writes.

### 24.2 Observed versus unknown

| Aspect | Status |
|---|---|
| Four-step checkout funnel | `[OBSERVED]` `/cart`, `/cart/order-summary`, `/cart/payment-order`, `/cart/secure-payment` |
| Payment provider | `[UNKNOWN]` |
| Tax calculation | `[UNKNOWN]` |
| Shipping carriers and rates | `[UNKNOWN]` |
| Discount mechanics | `[UNKNOWN]` |
| Refund policy | `[UNKNOWN]` |
| Order numbering | `[UNKNOWN]` |
| Financing product | `[OBSERVED]` as a route; `[UNKNOWN]` as a mechanism |
| Protection plan product | `[OBSERVED]` as a route; `[UNKNOWN]` as a mechanism |

`[INFERRED / PROPOSED]`: order numbers `MG-YYYY-NNNNNN`; free shipping above a configured threshold; refunds as a request plus approval workflow; financing and protection as `product_addons`.

### 24.3 Commerce and payment boundary

`[INFERRED]` Shopify or any PSP sits strictly behind `integrations`. The `commerce` module depends on a `PaymentProvider` interface with `authorize`, `capture`, `refund` and `verifyWebhook`. No provider SDK appears in domain or application code. If Shopify is later chosen, only the adapter changes; orders, prices, inventory and DYO remain ours. This satisfies charter 16: the domain model must not become Shopify-shaped.

### 24.4 Order immutability

Once placed, an order's money and configuration data are frozen in snapshots: `pricing_snapshot`, `shipping_address`, and per-item `configuration_snapshot`, `gem_snapshot`, `document_snapshot`. Later catalog edits never alter a placed order. Cancellation and refund are state transitions on the order plus new rows, never edits to the original totals.

### 24.5 Add-ons

Financing and protection plan are `product_addons` attached at checkout (`FR-COM-04`). They are separate order-item lines so that refunds can target the merchandise independently of the plan.

---

## 25. INVENTORY ARCHITECTURE

### 25.1 Evidence position

`[OBSERVED]` The source reported `schema.org/InStock` for all 1,024 products with no per-unit stock, no quantity and no reservation evidence. `[UNKNOWN]` Inventory mutation, reservation, backorder and fulfilment semantics.

### 25.2 Model `[INFERRED / PROPOSED]`

The domain is small-batch and made-to-order. Therefore:

| Rule | Rationale |
|---|---|
| A loose stone or pair is a single unit; `gemstones.availability` is the authoritative flag | Each stone is one physical object |
| A setting is made to order; `setting_variants.availability` is a catalogue flag, not stock | Observed: settings sell without a stone |
| No numeric stock column | A stone is unique; a count would be either 0 or 1 and adds nothing |
| Reservations are created at checkout, held 30 minutes | Standard practice; prevents overselling during payment |
| Pair reservation is atomic | Earrings need both stones |
| Bulk availability adjustments are audited | Admin action, must be attributable |

Reservations live in Postgres, created inside the checkout transaction, with `expires_at`. A sweeper job releases expired reservations and emits `InventoryReleased`. Redis holds only a short-lived read cache, capped at 15 seconds and invalidated on every write.

### 25.3 Availability semantics in search and AI

`availability` is a single boolean with three states expressed honestly:

| State | Source | Search | AI | UI |
|---|---|---|---|---|
| Available | `true`, checked recently | Eligible, x1.05 boost | May state "available" | In stock |
| Unavailable | `false` | Eligible, demoted | Must not promise | Sold out |
| Unknown | `true` but `availability_checked_at` older than the freshness window | Eligible, no boost | Must say availability is unconfirmed | "Check availability" |

The AI must never convert Unknown into Available (`FR-SEARCH-06`).

---

## 26. PRICING ARCHITECTURE

### 26.1 Evidence position

`[OBSERVED][VERIFIED]`

| Fact | Value |
|---|---|
| `price == weight x per_carat` | false for 0 of 1,024 |
| Ratio `price / (weight x per_carat)` | median 2.269, p25 1.693, p75 3.273 |
| Price range | $1,074 to $17,599 |
| Price deterministic per SKU | yes; the same stone at different settings yields different prices |
| Per-carat range | $10 to $12,000 |

Therefore the gemstone component is computable and the setting, making and margin components are `[UNKNOWN]`.

### 26.2 Model

```
total = gemstone_component
      + setting_component
      + side_stone_component
      + making_component
      + discount_component
      + tax_component
```

| Component | Source of value | Evidence |
|---|---|---|
| `gemstone_component` | `gemstones.price_per_carat * total_weight_ct` | `[EXTRACTED]`, validated against 1,024 observations |
| `setting_component` | `setting_variants.base_price` or `price_entries` | `[UNKNOWN]`; migrated residual |
| `side_stone_component` | `price_entries` for `SIDE_STONE` | `[UNKNOWN]`; zero until defined |
| `making_component` | pricing configuration | `[UNKNOWN]`; explicit and separately configurable |
| `discount_component` | `discounts` | `[UNKNOWN]` |
| `tax_component` | tax engine | `[UNKNOWN]`; zero until chosen |

### 26.3 Migrating the setting component

Every observed `(source_url, observed_total, observed_weight, observed_ppc)` is written to `price_model_observations` during migration (1,024 rows). Grouping by `gem_ref` gives the observed price for a stone across settings:

```
gemstone_component(stone) = price_per_carat x total_weight_ct
setting_component(observed) = observed_total - gemstone_component(stone)
```

For PR5681: 7,213 - 3,528 = 3,685. This yields a **derived, clearly labelled** setting price estimate per `(design, metal)`. Because it is derived rather than observed, it is stored with `evidence_status='INFERRED'` and never rendered as a source fact in admin without a visible marker. Curators confirm and promote. This is the only honest way to bootstrap setting prices from the evidence available.

### 26.4 Price safety

- Prices are computed server-side only. No client computes a price.
- `dyo_price_snapshots` are immutable and versioned by `pricing_rule_version`.
- Cart and checkout re-price on every request; a mismatch returns `409 PRICE_CHANGED` with the new total.
- The AI may read and explain a price. It cannot compute one, and no pricing tool exists (`ADR-003`).
- Discounts are validated server-side: scope, window, minimum, per-customer limit and redemption count.
- Price changes emit `ProductUpdated`, which invalidates caches and triggers re-ranking.

---

## 27. ASSET AND MEDIA ARCHITECTURE

### 27.1 Evidence position

`[OBSERVED][VERIFIED]` 241,961 media records across 5 hosts and 3,749 path stems. `[DEFECT D7]` 94.7% carry `role='unknown'`, so the captured classification is unusable. `[DEFECT D4]` 7,778 records are JavaScript bundles misfiled as 3D or 360 media.

### 27.2 Re-classification rules

Path stem becomes the classifier. This is deterministic, complete, and replaces the unusable `role` field:

| Path stem | `kind` | `role` | Fetch priority |
|---|---|---|---|
| `stone/{ref}/image` | IMAGE | PRIMARY or GALLERY | P0 |
| `stone/{ref}/lifestyleimage` | LIFESTYLE | GALLERY | P1 |
| `stone/{ref}/cert` | CERTIFICATE | CERTIFICATE | P1, private |
| `stone/{ref}/sarin` | REPORT | REPORT | P1, private |
| `stone/{ref}/appraisal` | APPRAISAL | APPRAISAL | P1, private |
| `setting/{code}/image` | IMAGE | GALLERY | P0 |
| `previewandpast/{sku}/image` | IMAGE | PREVIEW_RENDER | P1, regenerable |
| `previewandpast/{sku}/appraisal` | APPRAISAL | APPRAISAL | P1, private |
| `prongs/{code}/image` | IMAGE | DETAIL | P2 |
| `images/normal/mainMenu` | IMAGE | LOGO | Skip: site chrome |
| `images/normal/packaging` | IMAGE | PACKAGING | P2, global |
| `images/normal/filters` | IMAGE | OTHER | Skip: UI swatches |
| `images/normal/details` | IMAGE | DETAIL | P2, global |
| `images/normal/logos`, `layout`, `hi-res` | IMAGE | LOGO | Skip |
| `phone-video.../thumbnails/` | IMAGE | THUMBNAIL | P2 |
| `phone-video.../mp4/` | VIDEO_360 | GALLERY | P2, lazy |
| `static/images/*.jpg` (47thst) | IMAGE | OTHER | Skip: chat vendor |
| `/_nuxt/*.js` | OTHER | OTHER | **Skip: JavaScript, per D4** |

Two consequences:

1. **Roughly 174,000 of 241,961 records are site chrome** and should be recorded as global assets, not attached to products. Importing them per-product would multiply the asset table by an order of magnitude for no benefit.
2. **Roughly 44,480 records are genuine product media**, concentrated on a few thousand distinct source URLs after deduplication by `checksum_sha256`.

### 27.3 Ingestion pipeline

```
Source URL (from media_analyzed, preserved verbatim)
   -> classify by host and path stem                (deterministic, section 27.2)
   -> skip chrome, JavaScript and vendor assets
   -> deduplicate by checksum_sha256
   -> HEAD request: content-type, bytes, last-modified
   -> fetch to a temporary R2 prefix
   -> validate: is actually an image or video, dimensions sane, not an error page
   -> strip EXIF, especially GPS
   -> generate variants: thumb-200, card-400, hero-750, zoom-1500, webp, avif
   -> write asset + asset_variants rows
   -> attach via asset_usages to the owning entity
   -> emit AssetProcessed
```

`source_url` is always retained, so the provenance chain back to the evidence package is never broken. `role='unknown'` from the source is discarded in favour of the stem-derived classification, with the original preserved in `metadata`.

### 27.4 Storage and delivery

| Layer | Technology | Purpose |
|---|---|---|
| Durable object store | Cloudflare R2 | Originals and derived renditions |
| Image CDN | ImageKit | Format negotiation, resizing, quality, focal points |
| Private documents | R2 private bucket + signed URLs | Certificates, reports, appraisals |
| Video | R2 + CDN, HLS where needed | 360-degree and white-glove video |

Vendoring: assets whose source host is no longer reachable must be re-hosted. `assets.processing_state` tracks `PENDING`, `FETCHING`, `VALIDATING`, `PROCESSING`, `READY`, `FAILED`, `SKIPPED`. `SKIPPED` with a reason is a first-class terminal state for chrome and JavaScript, so 50% of the dataset is explicitly dispositioned rather than silently dropped.

### 27.5 WebAR assets

Modelled in `webar_assets` (section 21). No source assets exist; the pipeline produces them from CAD or scans.

---

## 28. SECURITY ARCHITECTURE

### 28.1 Controls exist outside the LLM

Every control below is enforced by code, database constraints or infrastructure. None depends on a prompt. `[INFERRED]` per charter 43.

### 28.2 Authentication and authorization

| Layer | Control |
|---|---|
| Identity | Managed provider. No local password storage, no password hashing code, no credential tables |
| Session | HttpOnly, Secure, SameSite=Lax cookies; short max-age with refresh rotation; session state never in Redis as the only copy |
| Authorization | Policy functions per application service; every command declares its required permission |
| Row scoping | RLS as defence-in-depth (section 8.16) |
| Admin | Separate role with `BYPASSRLS`; MFA required; every bypass audited |
| AI tool calls | `authorization()` evaluated in code before `execute()` (section 16.5) |
| Least privilege | The application role cannot `UPDATE` or `DELETE` `audit_logs` or `domain_events` |

### 28.3 Input validation

Zod at every boundary. Reject unknown fields. Specific controls: UUID format validation on all path parameters; length and charset limits on slugs; `NUMERIC` bounds on money and weight; enum membership on every enum input; image dimension limits on upload; URL validation on outbound fetches to prevent SSRF; file-type verification by content sniffing rather than by extension.

### 28.4 Injection

| Vector | Control |
|---|---|
| SQL | Parameterised queries or a query builder exclusively. No string concatenation. Identifiers validated against a whitelist |
| Command | No shell invocation anywhere in request handling |
| Template | No server-side template evaluation of user input |
| LDAP, XPath, NoSQL | Not applicable; no such store |
| SSRF | Outbound fetch allow-lists hosts; block private IP ranges; no user-supplied URLs in fetch paths |
| XSS | React escaping; no `dangerouslySetInnerHTML` with unsanitised input; sanitiser used for CMS rich text with an explicit allow-list |
| CSRF | SameSite cookies plus a double-submit token on state-changing routes |
| Clickjacking | `frame-ancestors` CSP |
| CSP | Strict default-src; per-route nonce; no `unsafe-eval` in production |

### 28.5 Rate limiting and abuse

Per section 11.11. Additionally: CAPTCHA on checkout for anomalous sessions; anomaly scoring on rapid SKU enumeration; a hard per-session cap on certificate uploads; and AI quota enforcement with a hard stop and handoff rather than silent degradation.

### 28.6 File and storage security

| Control | Detail |
|---|---|
| Upload | Presigned URLs only; the application never proxies customer bytes |
| Validation | Content sniffing, size cap, dimension cap, animated-image rejection |
| Scanning | Virus scan before processing |
| Storage | Private buckets for all customer documents; public bucket only for catalogue imagery |
| Delivery | Short-lived signed URLs for documents; CDN URLs for catalogue assets |
| EXIF | Stripped on ingest |
| Path traversal | Storage keys are generated server-side, never derived from user input |

### 28.7 Webhook verification

Signature verified over the raw body **before** parsing, using a constant-time comparison. Timestamp tolerance of 5 minutes to block replay. Dedupe on `(provider, external_event_id)`. No redirect URL from a payload is ever followed. Payload size capped.

### 28.8 Secrets

Platform secret manager only. No secrets in code, no secrets in the database, no secrets in `feature_flags`. Rotation without redeploy. Webhook secrets per provider and per environment. `[OBSERVED]` No source secrets exist in the evidence package.

### 28.9 Audit logging

Every privileged mutation writes `audit_logs` with actor, action, entity, before state, after state, reason, `trace_id`. Append-only, no update or delete grant. PII is hashed in `ip_hash` and `user_agent_hash`. Retention is policy-driven, not indefinite.

### 28.10 AI-specific security

| Threat | Control |
|---|---|
| Prompt injection via product copy | Retrieved text is delimited, labelled untrusted, and never placed in the system prompt |
| Prompt injection via certificates | OCR output is typed data, never instructions |
| Tool abuse | Fixed registry; per-intent allow-lists; `authorization()` outside the LLM |
| Tool replay | Per-turn nonce binds tool results to their turn |
| Data exfiltration via tools | Tools return only fields the schema declares; no bulk export tool exists |
| Model output injection into the DOM | Output validated against a schema and rendered as text |
| Cost abuse | Per-surface budgets, concurrency semaphores, `max_tokens` caps, abort propagation |
| Sensitive PII in prompts | Redaction before send; `content_redacted` retained for eval only |
| Certificate data leakage | Unverified fields withheld from public responses (section 18.7) |

### 28.11 Customer data protection

Data minimisation; explicit consent flags for marketing and astrology; purpose limitation; right to export and right to erase, cascading across `messages`, `tool_calls`, `conversations` and `assets`; PII excluded from logs, embeddings and analytics; retention schedules per table; RLS for defence in depth.

### 28.12 Payment boundaries

Card data never touches our servers; the provider handles it through hosted fields or a redirect. Webhooks are the only trusted channel for payment state, verified by signature and reconciled against `payments`. Amounts are re-derived server-side from `order_items`, never trusted from the client. Refunds require dual authorisation above a configurable threshold.

### 28.13 Infrastructure

TLS everywhere; HSTS; secrets in the platform manager; database IP-restricted where Neon permits; separate preview, staging and production databases; `neon` branches for migration testing; dependency scanning in CI; least-privilege service accounts per worker.

---

## 29. DEPLOYMENT ARCHITECTURE

### 29.1 Topology `[INFERRED]` per charter 7, 8 and 14

| Component | Platform | Trigger |
|---|---|---|
| Storefront and API | Vercel | Commits to main |
| Background worker | Vercel cron plus a long-running worker | Scheduled and queue-driven |
| Primary database | Neon PostgreSQL, pooled connection | Always on |
| Cache | Redis, managed | Always on |
| Object storage | Cloudflare R2 | Always on |
| Image CDN | ImageKit | Always on |
| AI gateway | Vercel AI Gateway with OpenRouter fallback | Always on |
| WhatsApp | Meta WhatsApp Cloud API | Always on |
| Observability | OpenTelemetry collector plus a metrics backend | Always on |
| Secrets | Vercel environment secrets | Always on |
| Email | Provider TBD `[UNKNOWN]` | Transactional |

### 29.2 Portability

Business and domain logic must not depend on Vercel-specific behaviour. Rules: no direct use of Vercel-only APIs in domain or application code; a `QueuePort` interface with a Vercel implementation and a Postgres-polling fallback; storage behind an `ObjectStorePort`; the same repository code runs against any Postgres. `[INFERRED]` per charter 14.

### 29.3 Environments

| Environment | Database | Data | Purpose |
|---|---|---|---|
| local | Local or Neon dev branch | Seeded subset | Development |
| preview | Neon branch per PR | Synthetic | PR validation, migration verification |
| staging | Neon staging | Anonymised production-shaped | Load test, AI evaluation, migration rehearsal |
| production | Neon primary with a read replica | Real | Live |

Never point production code at a non-production database. Enforced by an environment guard at startup.

### 29.4 Connection management

Neon pooled connections for serverless; a small direct-connection pool for the worker and migrations. Transaction pooling is unsafe with interactive transactions, so the application uses explicit transactions over a dedicated connection. Migrations run as a single serialised job; concurrent migration attempts are blocked by an advisory lock. Retries use exponential backoff with jitter. `statement_timeout` is set per role, not globally.

### 29.5 Release strategy

Trunk-based with feature flags. Migrations are forward-only and expand-then-contract: add nullable columns, backfill in batches, dual-write if needed, then drop the old column in a later release. Never a destructive migration in the same release as the code that stops using the column. Every migration has a tested rollback or an explicit documented irreversibility note.

### 29.6 Environments and secrets

`DATABASE_URL`, `REDIS_URL`, `R2_*`, `IMAGEKIT_*`, `AI_GATEWAY_*`, `OPENROUTER_API_KEY`, `WHATSAPP_*`, `PAYMENT_*`, `OTEL_*`. No secret ever enters the repository, the database, a `feature_flags` row or a log line.

---

## 30. EVENT ARCHITECTURE

### 30.1 Principles

Events exist only where they create real value. Introduced through a transactional outbox: events are written in the same transaction as the state change, then published asynchronously by a dispatcher. Consumers are idempotent via `event_consumers`. Ordering is guaranteed per aggregate, not globally.

### 30.2 Event catalogue and consumers

| Event | Producer | Consumers |
|---|---|---|
| `ProductCreated` | catalog | search reindex, embed, sitemap, cache invalidate |
| `ProductUpdated` | catalog | cache invalidate, search generation bump, embed if hash changed, sitemap |
| `ProductStateChanged` | catalog | search, sitemap, cache |
| `GemstoneCreated` / `GemstoneUpdated` | catalog | cache invalidate, re-embed dependent products, price recompute |
| `SettingVariantUpdated` | catalog | cache invalidate, compatibility re-check of affected DYO drafts |
| `CompatibilityRulesChanged` | dyo | re-validate live configurations, flag affected drafts |
| `DYOConfigurationCreated` | dyo | analytics |
| `DYOConfigurationValidated` | dyo | analytics, embed |
| `DYOConfigurationPriced` | dyo | analytics |
| `CertificateUploaded` | certificates | enqueue extraction, notify customer |
| `CertificateProcessed` | certificates | route to review or auto-cross-check |
| `CertificateApproved` | certificates | cache invalidate, publish to search and AI, notify customer |
| `CertificateRejected` | certificates | notify customer, audit |
| `AssetProcessed` | assets | attach to entities, cache invalidate |
| `AssetIngestFailed` | assets | alert, dead letter |
| `EmbeddingGenerated` | assets / ai | search generation bump |
| `InventoryReserved` | commerce | cache invalidate availability |
| `InventoryReleased` | commerce | cache invalidate availability |
| `OrderCreated` | commerce | confirmation job, analytics, search de-publish if made-to-order |
| `PaymentCaptured` | commerce | receipt, fulfillment, analytics, points |
| `PaymentFailed` | commerce | notification, retry, analytics |
| `RefundCreated` | commerce | refund job, notification, analytics |
| `OrderFulfilled` | commerce | notification, analytics |
| `ConversationStarted` | ai | analytics |
| `HumanHandoffRequested` | ai | agent queue notify, SLA start, alert |
| `ConversationClosed` | ai | summary generation, analytics, PII retention sweep |
| `KnowledgeDocumentUpdated` | cms | chunk and embed, cache invalidate |
| `PagePublished` | cms | sitemap, cache invalidate, knowledge ingest |
| `ImportBatchCompleted` | operations | migration report, alert |
| `DerivedReferenceApproved` | operations | publish affected product |

### 30.3 Naming and payload

Past tense, `Aggregate` + action. Payloads carry `event_id`, `aggregate_id`, `aggregate_version`, `occurred_at`, `trace_id` and only the fields consumers need. No PII in payloads. Schema evolution is additive; breaking changes mean a new event type and a dual-publish window.

### 30.4 Why not a full event-sourcing model

`[INFERRED]` The audit and trust requirements need an immutable history, which `audit_logs`, `order_events` and `verification_events` provide. Full event sourcing would add projection complexity, eventual-consistency surprises in pricing and inventory, and a rebuild burden, for no requirement the evidence or the vision demands. Commands remain the source of truth; events are a consequence.

---

## 31. BACKGROUND JOBS

### 31.1 Queues

| Queue | Work | Concurrency | Retry |
|---|---|---|---|
| `critical` | payment reconciliation, order placement side effects | low, ordered | 8, exponential |
| `default` | emails, notifications, webhooks | medium | 5, exponential |
| `assets` | fetch, validate, process, upload | high, IO-bound | 5, exponential |
| `ai` | embeddings, extraction, evaluation | low, cost-bound | 3 |
| `certificates` | OCR runs, anomaly detection | low | 3 |
| `search` | reindex, generation bumps, sitemap | medium | 5 |
| `migration` | import batches, backfills | serialised | 0, resumable |
| `maintenance` | reservation expiry, retention sweeps, orphan detection | low | 3 |

### 31.2 Execution

Worker claims jobs with `SELECT ... FOR UPDATE SKIP LOCKED` and a lease (`locked_until`). A job exceeding its lease is reclaimable, which makes the queue crash-safe. Every job type declares `max_attempts`; exhaustion moves it to `DEAD_LETTER` with the last error retained and raises an alert. `job_key` gives idempotency, so a retried job is a no-op if it already succeeded.

### 31.3 Long-running work

Backfills, re-embedding and reindexing run in batches with explicit cursor state and a rate limit, so they never saturate the primary. Each is resumable and reports progress into `jobs.result`.

### 31.4 Scheduling

Nightly: reservation expiry, expired-quote cleanup, expired-configuration cleanup, sitemap rebuild, daily aggregate rollups, dead-letter alert. Weekly: orphan asset detection, dependency audit, index health check, evaluation suite run. Monthly: retention enforcement, PII audit.

---

## 32. OBSERVABILITY

### 32.1 Stack `[INFERRED]`

OpenTelemetry traces and metrics, a Prometheus-compatible metrics backend, structured JSON logs with `trace_id` correlation, and Sentry for frontend and server errors. No specific vendor is mandated; the instrumentation is standard OTel so the backend is swappable.

### 32.2 Signals by layer

| Layer | Traces | Metrics | Logs | Alerts |
|---|---|---|---|---|
| Frontend | route transitions, Web Vitals | LCP, INP, CLS, TTFB by route | client errors, WebAR failures | LCP regression, WebAR error rate |
| API | per request, per command | rate, error rate, duration p50/p95/p99 | request logs with `trace_id` | error budget burn, p95 breach |
| Database | per query | connections, pool wait, slow query count, cache hit | slow query log | pool exhaustion, slow query |
| Redis | - | hit rate, memory, evictions, latency | - | hit rate drop, memory pressure |
| Search | per search | latency, zero-result rate, strategy mix, facet time | - | zero-result spike, latency |
| AI | per interaction | tokens, cost, latency, TTFB, tool count, grounded ratio, handoff rate | interaction logs | cost anomaly, grounded ratio drop |
| Tools | per call | latency, error rate, denial rate | tool call log | denial spike, error spike |
| Certificate OCR | per run | runs, mean confidence, review rate, cost | run logs | failure rate, confidence drop |
| WhatsApp | per message | messages, delivery, response time, template failures | message logs | webhook failures, delivery failures |
| Payments | per payment | success rate, capture latency, webhook lag | payment logs | failure rate spike |
| WebAR | per session | load time, fps, tracking loss rate, device tier | session logs | load failure, fps drop |
| Jobs | per job | queue depth, age, success, failure, dead letters | job logs | queue backlog, dead letters |
| Integrations | per webhook | in, out, signature failures, processing lag | webhook logs | signature failure spike |

### 32.3 Key business metrics

```
catalog.gemstones.available            gauge
catalog.settings.active                gauge
dyo.configurations.created             counter
dyo.compatibility.rejected            counter by rule_id
dyo.quote.total.value                  histogram
commerce.cart.abandonment_rate         gauge
commerce.checkout.step_completion      funnel
commerce.order.conversion_rate        gauge
commerce.order.aov                     gauge
commerce.refund.rate                   gauge
search.zero_result_rate               gauge
search.semantic_usage_rate             gauge
ai.handoff_rate                        gauge by reason
ai.grounded_ratio                      histogram
ai.cost_per_conversation               gauge
ai.tool_denial_rate                    counter
trust.certificate.auto_verify_rate     gauge
trust.certificate.mean_confidence      gauge
trust.review_queue_depth               gauge
migration.records_quarantined          gauge
migration.conflicts.unresolved         gauge
ops.cache.hit_rate                     gauge by cache id
```

### 32.4 Instrumentation rules

Every request gets a `trace_id`; it propagates into commands, tool calls, jobs and events. Domain operations are spans, not just logs. Cardinality is controlled: no user id, email, SKU or URL in metric labels. Logs are structured and PII-safe; `content_redacted` is the only text retained for AI content. Alerts route to a channel with an owner and a runbook. Alert thresholds derive from SLOs, not from arbitrary numbers.

---

## 33. MIGRATION STRATEGY

### 33.1 Pipeline

```
SOURCE EVIDENCE (read-only)
   |
   v
[1] EXTRACT      read crawler.sqlite and every JSONL; hash each artifact
   |
   v
[2] STAGE        load verbatim into staging_source_pages; never normalize here
   |
   v
[3] PARSE        deterministic slug/SKU parsers -> staging_parsed_urls
   |              with per-field confidence and evidence status
   v
[4] VALIDATE     parse assertions, referential checks, cardinality checks
   |
   v
[5] CANONICAL    upsert taxonomy, gemstones, settings, variants, products
   |              in dependency order; conflicts -> staging_conflicts
   v
[6] SEARCH       build tsvector, trigram and facet indexes; initial reindex
   |
   v
[7] EMBED        chunk and embed knowledge documents and products
   |
   v
[8] PRODUCTION   flip traffic; run verification suite
```

Every stage is resumable and idempotent. Stages 1 through 5 are fully deterministic given the same input hashes.

### 33.2 Source-to-target entity derivation

| Target entity | Derived from | Method | Expected count |
|---|---|---|---|
| `gemstone_varieties` | `urls.jsonl` first path segment across stone URLs; `taxonomy.json` `stone_type` | Distinct base slugs, cross-checked against spec values | ~100-145 |
| `gemstone_species` | Variety slug suffix | INFERRED grouping | ~25 |
| `gemstone_colours` | Loose-stone slug colour token; `color_help` values | Token extraction plus the 60 colour routes | ~60+ |
| `gemstone_origins` | `origin_help`; loose-stone slug origin token | Value extraction | ~20 |
| `shapes` | `shape_help`; slug shape token | Value extraction | ~13 |
| `clarities` | `clarity_help` | Value extraction plus `is_doubled` detection (D9) | ~7 |
| `treatments` | `enhancements_help` | Value extraction | ~5 |
| `metals` | SKU metal codes and slug phrases | 1:1 mapping, verified across all families | 14 |
| `setting_styles` | Settings slug design token | Value extraction | 18 families |
| `settings` | Settings URL `js{digits}` | Distinct design cores | 951 |
| `setting_variants` | Settings URL `js{digits}{code}` | Distinct (design, metal) | 10,349 |
| `gemstones` | Loose-stone URL `K#####`; pair URL `PR#####` | Distinct refs; attributes from slug plus `specifications` where available | 19,665 + 3,072 |
| `gemstone_stones` | `specifications.weight` and `dimensions_mm_help` | Tokenizer; 1 row single, 2 rows pair | per D9 |
| `products` (CONFIGURED) | DYO URLs | SKU grammar decomposition | 9,812 |
| `products` (READY_MADE) | `/{variety}-rings/{slug}-J#####` | Direct | 88 |
| `settings_compatibility_rules` | The 1,024 observed (setting, stone) pairs | ALLOW with `EXTRACTED` | ~1,024 candidate |
| `price_entries` / `price_model_observations` | `pages_analyzed` JSON-LD offers | Residual computation, section 26.3 | 1,024 |
| `assets` | `media_analyzed.jsonl` | Path-stem classification, dedupe | ~44,480 product-media records before dedupe |
| `certificates` | `stone/{ref}/cert`, `/sarin`, `/appraisal` paths | Path convention | ~per distinct ref |
| `pages` | Functional route list | Manual authoring plus CMS | ~25 |
| `redirects` | All 44,218 source URLs | Route mapping, section 13.1 | 44,218 |

### 33.3 The critical migration rule

`[DEFECT D1]` **Do not migrate from `products.jsonl`.** It contains only the 1,024 DYO products the crawler's classifier recognised, roughly 2.4% of commerce URLs. Migrate from `urls.jsonl` as the spine, joining `specifications.jsonl` and `pages_analyzed.jsonl` for attributes and prices.

### 33.4 Validation gates

| Gate | Assertion | On failure |
|---|---|---|
| V1 | Loose-stone slug parse rate = 100% (verified baseline 19,666/19,666) | Halt; parser regression |
| V2 | Pair slug parse rate = 100% (3,077/3,077) | Halt |
| V3 | Every DYO slug yields a SKU matching its `product.sku` where present (baseline 1,024/1,024) | Halt |
| V4 | Variety token in slug equals assigned `variety_id` (19,666/19,666) | Quarantine the row |
| V5 | Every product satisfies INV-01 | Quarantine |
| V6 | Zero products with a pair and non-earring type | Halt |
| V7 | Zero products with a single stone and earrings type | Halt |
| V8 | For every pair, per-stone weights sum to `total_weight_ct` (baseline 113/113) | Quarantine |
| V9 | For every pair, `Ct.Tw.` in the source name equals the summed weight | Quarantine |
| V10 | `gem_ref` uniqueness across the union of stones and pairs | Halt |
| V11 | Every product's `source_url` is unique | Halt |
| V12 | Every setting variant SKU is unique | Halt |
| V13 | Metal code always resolves in `metals` | Halt |
| V14 | Count reconciliation per family against section 4.2 | Halt |
| V15 | No product priced from an `UNKNOWN` price_evidence is published | Warn and hold |
| V16 | No asset has `kind` derived from a JavaScript URL | Halt |
| V17 | Re-running the import produces zero new or updated rows | Halt |
| V18 | All 221 failed-fetch DYO rows land with `sku_evidence_status='INFERRED'`, `source_sku IS NULL`, `state='DRAFT'`, and every attribute column null | Halt |
| V19 | Derived SKU parser reproduces all 1,024 observed SKUs exactly (regression guard for section 3.1 Example B) | Halt |
| V20 | Derived SKUs never collide with observed SKUs; collisions, if any, are quarantined rather than merged | Halt |
| V21 | Every `(design, metal)` pair encountered in any URL family resolves in `setting_variants` | Warn and hold |
| V22 | Every stone reference encountered resolves in `gemstones`, or is created with `ref_evidence_status` set correctly | Warn and hold |

Gates V1-V14 are blocking. V15-V17 hold publication. V18-V20 are blocking. V21-V22 hold publication.

### 33.5 Provenance strategy

Every migrated row carries `evidence_status`, `source_url`, and where relevant `source_sku`, `source_sku_derived`, `sku_evidence_status`, `raw_spec`, `import_batch_id`. This makes the charter's question answerable: *where did this value come from?*

### 33.6 Conflicts

Where two source records disagree, both are stored in `staging_conflicts` with their URLs and no automatic resolution. Known expected conflicts:

| Conflict | Expected count | Handling |
|---|---|---|
| 5 pair URLs sharing a PR id | 5 | Manual review |
| 314 stone URLs ending `-J#####` | 314 | Likely misfiled; quarantine |
| `stone_type` populated on only 113 records, and doubled | 113 | Normalize to single value with `token_count` recorded |
| Doubled spec strings across the pair family | 113 x 12 | D9 tokenizer |
| DYO SKUs absent from the settings catalog | expected 0 | Halt if non-zero |

### 33.7 Phasing

| Phase | Content | Gate |
|---|---|---|
| M1 | Taxonomy, stones, pairs | V1, V2, V4, V10 |
| M2 | Settings and variants | V12, V13 |
| M3 | Products and compatibility seeds | V3, V5-V9, V11 |
| M4 | Prices and observations | V15 |
| M5 | Assets, classified and dispositioned | V16 |
| M6 | Certificates from path convention | none blocking |
| M7 | CMS pages, navigation, 44,218 redirects | none blocking |
| M8 | Knowledge documents and embeddings | none blocking |
| M9 | Full verification and load test | V17 |

Each phase is independently revertible. Phases M1-M3 must complete before the storefront can serve a single product page.

### 33.8 Migration safety

Migrations run on a Neon branch first and are verified against the gates. Backfills run in batches of 1,000 with a rate limit. No destructive change ships alongside the code that stops using the column. Every phase records `records_seen`, `records_accepted`, `records_rejected` and `records_quarantined` so the outcome is auditable.

---

## 34. TESTING STRATEGY

### 34.1 Layers

```
Unit        pure domain functions, invariants, parsers, pricing
Domain      aggregate behaviour and state machines
Integration repositories against a real Postgres, outbox, RLS
API         every endpoint: schema, authz, errors, idempotency, rate limits
E2E         critical user journeys in a real browser
Contract    AI tool schemas, provider adapters, storage and queue ports
Performance load tests against NFR targets
Security    authorisation matrix, injection, file upload, webhook forgery
AI          evaluation suites across the dimensions in 34.5
Migration   every gate in 33.4 as an automated assertion
```

### 34.2 Evidence-linked test matrix

Every reconstructed capability must be validated against its evidence:

| Feature | Evidence | Test |
|---|---|---|
| SKU grammar | `[VERIFIED]` 1,024/1,024 | Parser test over all 1,024 source SKUs; expects 100% match, 0 mismatches |
| Pair weight rule | `[VERIFIED]` 113/113 | Sum check over all 113 pair records against the `Ct.Tw.` slug value |
| Single-stone weight | `[VERIFIED]` 911 single-token | Tokenizer returns exactly 1 token for all 911 |
| Stone identity stability | `[VERIFIED]` 0 unstable | Attribute consistency across all products sharing a `gem_ref` |
| Metal mapping | `[VERIFIED]` 1:1 across 14 codes | Every slug phrase maps to its code; no code maps to two phrases |
| Earrings use pairs | `[VERIFIED]` 113/113 | Assert INV-02 across the migrated set |
| Variety in slug | `[VERIFIED]` 19,666/19,666 | Assigned variety equals slug variety for every stone |
| Slug parse rates | `[VERIFIED]` 100% | V1 and V2 as CI gates |
| Derived SKUs | §3.1 Example B | Derived SKU never equals observed without approval; 221 rows quarantined |
| Doubled spec strings | `[DEFECT D9]` | `token_count = 2` for all 113 pair records; `is_doubled` set on clarity labels |
| Price recovery | `[DEFECT D8]` | All 1,024 prices recovered from `pages_analyzed` |
| Price model | `[VERIFIED]` 0/1,024 exact | Regression test asserting the residual is non-zero for every row |
| Media classification | `[DEFECT D4]` | Zero assets classified from a `.js` URL |
| Media volume | `[VERIFIED]` | Nav-icon records dispositioned `SKIPPED`, not attached to products |
| Checkout funnel | `[OBSERVED]` 4 URLs | Four-step E2E with server checkpoints |
| Route preservation | `[OBSERVED]` 44,218 URLs | Every source URL resolves or 301s to a target route |
| Certificate artefacts | `[OBSERVED]` path convention | Every `/cert`, `/sarin`, `/appraisal` URL becomes a certificate record |
| DYO invariants | `[VERIFIED]` | INV-01, INV-02, INV-03 as constraint tests |

### 34.3 Security test matrix

| Test | Expectation |
|---|---|
| Authorisation matrix | Every role x endpoint pair is exercised; anything not explicitly allowed returns 403 |
| Cross-customer access | Customer A cannot read customer B's order, cart, address or conversation |
| RLS verification | Direct SQL as the application role cannot bypass row scoping |
| IDOR on every `:id` and `:slug` | Randomised ownership checks |
| Price tampering | Modified client price rejected with 409; server total wins |
| Idempotency replay | Repeated `Idempotency-Key` returns the original result, not a duplicate |
| SQL injection | Fuzzed parameters across every endpoint; no query-shape change |
| XSS | Stored and reflected payloads across CMS, search, chat and product fields |
| Prompt injection | Injected instructions in product copy and certificate text produce no tool escalation |
| AI mutation attempt | "Set inventory to 0" produces a guardrail event and zero row changes |
| File upload | Executable, oversized, malformed and MIME-mismatched uploads all rejected |
| Webhook forgery | Invalid signature rejected before parsing; replayed event deduplicated |
| SSRF | Metadata endpoint and private ranges blocked on outbound fetch |
| Rate limits | Per-scope limits enforced; burst behaviour verified |
| Audit completeness | Every privileged mutation produces an `audit_logs` row |

### 34.4 Performance tests

| Scenario | Target | Basis |
|---|---|---|
| Category page LCP p75 | < 2.5s | NFR-02 |
| Product page LCP p75 | < 2.5s | NFR-02 |
| Filtered search p95 | < 400ms | NFR-03 |
| Semantic search p95 | < 800ms | NFR-03 |
| Add to cart p95 | < 500ms | `[INFERRED]` |
| Checkout session p95 | < 800ms | `[INFERRED]` |
| DYO quote p95 | < 300ms | `[INFERRED]` |
| AI first token p95 | < 2s | `[INFERRED]` |
| Concurrent users | 50,000 registered; load-test the concurrent profile | NFR-01, NFR-15 |

No capacity claim is asserted here. Per NFR-15 and charter 47, capacity is established by measurement.

### 34.5 AI evaluation

| Dimension | What is measured | Failing example |
|---|---|---|
| `factuality` | Every gemological claim has a citation resolving to a real field | Invents an origin |
| `no_invention_null` | Refuses to state a NULL stone type, origin or treatment | Guesses "probably untreated" |
| `tool_selection` | Correct tool for the intent | Answers availability from memory instead of `search_inventory` |
| `price_safety` | Quotes only a live snapshot; explains rather than computes | Invents a price |
| `inventory_safety` | Never promises availability | "Yes, we have it in stock" from memory |
| `certificate_safety` | Never claims authenticity below VERIFIED | "This is certified" at EXTRACTED |
| `treatment_disclosure` | Always surfaces treatment when present | Omits heat treatment |
| `dyo_quality` | Configuration advice respects compatibility | Recommends an incompatible setting |
| `refusal` | Declines when evidence is insufficient | Confabulates to avoid saying "I don't know" |
| `citation` | Citations resolve and match the claim | Citation points at an unrelated document |
| `escalation` | Hands off on every defined trigger | Answers a refund question directly |
| `injection_resistance` | Injected instructions in retrieved content change nothing | Executes an instruction embedded in a description |
| `grounded_ratio` | Mean above the configured threshold | Below 0.6 on the suite |
| `cost` | Cost per conversation within budget | Regression after a prompt change |

Evaluation runs in CI on every prompt or model change, and nightly against production traffic samples. Results land in `ai_evaluations` and gate release.

---

## 35. ARCHITECTURE DECISION RECORDS

Format: decision, context, alternatives, reason, consequences, evidence, status.

---

**ADR-001 - PostgreSQL is the transactional source of truth**
- **Context:** The platform needs relational commerce, full-text search and vector search with transactional consistency.
- **Alternatives:** (a) MySQL plus a separate vector store; (b) a document store; (c) Postgres plus a dedicated search engine.
- **Decision:** Neon PostgreSQL is the single source of truth for every transactional fact, including search and vectors.
- **Reason:** One engine, one transaction, no eventual consistency between a product row and its search index. Measured scale (roughly 33,000 searchable entities) is far within Postgres capability.
- **Consequences:** Search tuning is a Postgres tuning problem. Vector storage is coupled to transactional storage. Revisit only on measured failure.
- **Evidence:** charter 9, 10, 11; measured catalogue size in section 4.2.
- **Status:** Accepted.

**ADR-002 - Redis is cache and transient state only**
- **Context:** Caching is required for performance but commerce correctness is paramount.
- **Alternatives:** Redis as a write-through cache for orders; an in-memory cache; none.
- **Decision:** Postgres is authoritative. Redis holds only reconstructible cache, session, rate-limit and coordination state.
- **Reason:** A cache must never be the only copy of an order, payment or inventory fact. Divergence becomes a financial incident.
- **Consequences:** Cache entries always carry a source of truth and an invalidation trigger (section 15.1). Availability and checkout deliberately bypass or barely cache.
- **Evidence:** charter 12.
- **Status:** Accepted.

**ADR-003 - The AI cannot mutate transactional state**
- **Context:** The concierge must create value without risking commerce integrity.
- **Alternatives:** (a) allow the model read-write SQL; (b) allow mutation tools with confirmation; (c) no mutating tools at all for the AI.
- **Decision:** The AI tool registry contains no tool that mutates price, inventory, orders, payments, certificates or permissions. Two mutating tools exist (`create_customer_request`, `transfer_to_human`), and both route through a normal application service with the AI as a proposed actor.
- **Reason:** Four independent layers (structural, contractual, runtime, prompt) mean no prompt can reach a write. Safety must not depend on model behaviour.
- **Consequences:** Some desirable automations are manual for now. That is the correct trade for a gemological commerce platform.
- **Evidence:** charter 21, 22, 23, 43; sections 16.4 and 16.7.
- **Status:** Accepted.

**ADR-004 - WebAR is client-side only**
- **Context:** Virtual try-on needs camera and GPU access with low latency and strong privacy.
- **Alternatives:** server-side rendering of camera frames; hybrid; client-only.
- **Decision:** MediaPipe and Three.js run entirely in the browser. Camera frames never leave the device without explicit consent.
- **Reason:** Latency, bandwidth, privacy and cost all favour the client. A server round trip per frame is unusable.
- **Consequences:** Client-side performance discipline is mandatory: route-level splitting, lazy loading, model budgets and graceful fallback. Models must be Draco-compressed and CDN-hosted.
- **Evidence:** charter 30, 31.
- **Status:** Accepted.

**ADR-005 - DYO is a configuration domain, not a product table**
- **Context:** The source presents 9,812 near-duplicate product pages that decompose deterministically.
- **Alternatives:** (a) import all 9,812 as products; (b) generate the full 40,425 cross-product; (c) model settings and stones as reusable entities with configurations referencing them.
- **Decision:** `settings` and `setting_variants` are reusable parents; `products` are realisations; `dyo_configurations` are persisted, hashed user states.
- **Reason:** The SKU grammar proves composition. Option (b) fabricates 39,000 rows the source never had. Option (a) duplicates stone data 9,812 times.
- **Consequences:** The catalog page, search and DYO all read the same entities. Adding a new stone or setting automatically widens the reachable matrix. Prices remain SKU-level realisations because the source proved price varies per combination.
- **Evidence:** section 1.1, `[VERIFIED]` 1,024/1,024 SKU parses and the settings superset property.
- **Status:** Accepted.

**ADR-006 - No dedicated search engine at launch**
- **Context:** Hybrid search is a headline capability.
- **Alternatives:** Postgres FTS plus pgvector; Meilisearch; Algolia; Typesense; Elasticsearch.
- **Decision:** Postgres FTS plus pg_trgm plus pgvector plus structured filters plus deterministic ranking.
- **Reason:** At roughly 33,000 entities Postgres meets the latency target with zero operational overhead and no second source of truth. A dedicated engine adds index lifecycle, reindex tooling and eventual consistency for unproven benefit.
- **Consequences:** Ranking logic lives in SQL and must be versioned and unit-tested. If measured p95 breaches NFR-03, extract behind the `SearchPort` interface.
- **Evidence:** charter 11; measured catalogue size.
- **Status:** Accepted. Revisit trigger recorded in section 14.1.

**ADR-007 - Migrate from the URL inventory, not from `products.jsonl`**
- **Context:** The reverse-engineering package presents 1,245 products as the catalog.
- **Alternatives:** (a) migrate `products.jsonl`; (b) migrate `urls.jsonl` as the spine and join the other datasets; (c) re-crawl.
- **Decision:** `urls.jsonl` is the spine. `specifications.jsonl` and `pages_analyzed.jsonl` are joined for attributes and prices.
- **Reason:** `products.jsonl` holds 2.4% of commerce URLs because the crawler classifier only recognised DYO pages. Migrating it alone would discard 97% of the catalog.
- **Consequences:** The migration requires a deterministic slug parser, which is validated at 100% parse rate. Corrects the single largest error in the supplied package.
- **Evidence:** `[DEFECT D1]`; section 33.3.
- **Status:** Accepted.

**ADR-008 - Derived identifiers are stored separately and gated**
- **Context:** 221 DYO records have no `product.sku`, but their slugs embed a parseable SKU.
- **Alternatives:** (a) leave them null; (b) write derived values into the observed column; (c) store derived values separately with an evidence status and a review gate.
- **Decision:** Option (c). `source_sku` holds only observed values; `source_sku_derived` holds parsed values with `sku_evidence_status='INFERRED'`; publication requires approval.
- **Reason:** The parser is validated at 1,024/1,024 precision, so the value is highly reliable, but reliability is not observation. Option (a) discards recoverable data; option (b) corrupts the evidence model.
- **Consequences:** An admin review queue exists. Derived rows remain non-canonical until approved. The audit trail distinguishes the two.
- **Evidence:** section 3.1 Example B; charter 24.
- **Status:** Accepted.

**ADR-009 - Per-stone measurements are modelled, not concatenated**
- **Context:** Source spec strings concatenate per-stone values without delimiters, producing values like `"Blue Blue"`.
- **Alternatives:** (a) store the raw string; (b) split into a single string with the first token; (c) model per-stone rows.
- **Decision:** Option (c), with the raw string preserved verbatim in `gemstone_stones.raw_weight_text` and `raw_dimensions_text`.
- **Reason:** Pairs are genuinely two stones; weights sum to the `Ct.Tw.` value, verified 113/113. Storing a single value would silently discard one stone and make certificate cross-checks impossible.
- **Consequences:** `gemstones.total_weight_ct` is a maintained sum, verified by a constraint. Enables the certificate weight-mismatch checks in section 18.5.
- **Evidence:** `[DEFECT D9]`; `[VERIFIED]` 113/113.
- **Status:** Accepted.

**ADR-010 - The setting component of price is modelled explicitly as unknown**
- **Context:** Price is not weight times per-carat for any of 1,024 products; the median ratio is 2.269.
- **Alternatives:** (a) derive price from weight and per-carat; (b) store one opaque final price; (c) decompose into components with the unknown one named.
- **Decision:** Option (c). `gemstone_component` is computed; `setting_component`, `making_component`, `tax_component` are explicit columns, seeded from the observed residual where possible and marked `INFERRED`.
- **Reason:** Only the gemstone component is evidenced. A single opaque price would hide a 2x factor we cannot explain and would make pricing impossible to reason about. Naming the unknown makes the gap visible and closable.
- **Consequences:** Admin can see exactly how much of each price is observed versus derived. The residual bootstrap gives usable setting prices immediately, clearly labelled.
- **Evidence:** `[VERIFIED]` 0/1,024 exact; median ratio 2.269; section 26.3.
- **Status:** Accepted.

**ADR-011 - Certificate artefacts are ingested from path convention; schema is treated as unknown**
- **Context:** `documents` is empty and the package calls certificates UNKNOWN, yet certificate, SARIN and appraisal image URLs exist on a strict path convention.
- **Alternatives:** (a) treat certificates as absent; (b) invent a schema; (c) ingest artefacts and mark every field unverified pending OCR.
- **Decision:** Option (c). Artefacts become `certificates` rows with `verification_status='UNVERIFIED'` and no populated fields until OCR plus review.
- **Reason:** Inventing a schema would fabricate lab names and certificate numbers. Ignoring artefacts would discard real trust data. This is the exact case where OCR adds value.
- **Consequences:** The storefront can display "certificate on file, pending verification" from day one and never overstate. The review queue is the bottleneck, by design.
- **Evidence:** `[DEFECT D6]`; section 18.1.
- **Status:** Accepted.

**ADR-012 - Low-confidence OCR never becomes verified truth**
- **Context:** The charter's worked example is origin "Nigeria" at confidence 0.54.
- **Alternatives:** (a) publish above 0.5; (b) publish only above a high bar; (c) require human verification with no automatic path at all.
- **Decision:** A single view enforces it. Fields below 0.50 are withheld; verification requires every material field at 0.90 or above with no unresolved ERROR anomaly plus human approval.
- **Reason:** Automated promotion of OCR into gemological fact is the highest-severity failure mode in this domain.
- **Consequences:** Verification is deliberately slow. The view means no caller can bypass the rule.
- **Evidence:** charter 26, 27; section 18.7.
- **Status:** Accepted.

**ADR-013 - Web and WhatsApp share one AI brain**
- **Context:** A WhatsApp concierge could plausibly be built separately.
- **Alternatives:** (a) separate orchestrator per channel; (b) one orchestrator with a channel adapter; (c) relay WhatsApp into the web UI.
- **Decision:** Option (b). Same registry, same tools, same guardrails, same knowledge, same `messages` table; a `ChannelCapabilities` object tells the orchestrator what the channel can render.
- **Reason:** Two brains means two sets of safety bugs and divergent answers. One brain with an adapter keeps safety logic in one place.
- **Consequences:** Streaming and rich rendering become channel capabilities, not orchestrator branches. A CI test asserts tool-registry equality.
- **Evidence:** charter 28; section 20.5.
- **Status:** Accepted.

**ADR-014 - The source product-type taxonomy is rejected as a target model**
- **Context:** `product_type_counts.json` says everything is `jewelry`.
- **Alternatives:** (a) copy it; (b) derive a five-kind taxonomy from the URL families.
- **Decision:** `product_kind` is `CONFIGURED`, `READY_MADE`, `LOOSE_STONE`, `STONE_PAIR` or `SETTING_ONLY`, derived from URL structure.
- **Reason:** `jewelry: 1245` is an artefact of a classifier that only recognised DYO pages. Copying it would make a stone and a setting the same thing.
- **Consequences:** Filters, facets and analytics can distinguish forms. Search gains the three-way split the source site actually has.
- **Evidence:** `[DEFECT D1]`; section 4.2.
- **Status:** Accepted.

**ADR-015 - Observed source routes are preserved through redirects, not by copying the route structure**
- **Context:** 44,218 source URLs carry SEO value.
- **Alternatives:** (a) mirror the source hierarchy exactly; (b) design clean routes and 301 everything; (c) preserve where sensible, redirect where the structure was poor.
- **Decision:** Option (c), with the full mapping in section 13.1. Product detail consolidates four source families under `/products/{slug}`; DYO review keeps its shape; settings get a clean path.
- **Reason:** Preserving SEO is necessary; preserving every structural quirk is not. Four different product-detail paths for one entity is a poor target architecture.
- **Consequences:** 44,218 redirect rows. Sitemap preserved as 44 shards to match the source's observed scale. Redirect correctness is an E2E test.
- **Evidence:** charter 50, 51; `[OBSERVED]` route inventory.
- **Status:** Accepted.

**ADR-016 - Media classification is re-derived from path stem**
- **Context:** 94.7% of media records have `role='unknown'`, and 7,778 are JavaScript bundles.
- **Alternatives:** (a) trust the captured role; (b) classify by machine learning; (c) classify deterministically by host and path stem.
- **Decision:** Option (c), with an explicit table (section 27.2) including an explicit rule to skip `/_nuxt/*.js`.
- **Reason:** Path stems are complete, deterministic and auditable. A learning classifier would be unauditable and would still ingest JavaScript unless separately guarded.
- **Consequences:** Roughly 174,000 chrome records are dispositioned `SKIPPED` rather than attached to products, keeping the asset table proportionate. Roughly 44,480 product-media records remain.
- **Evidence:** `[DEFECT D4]`, `[DEFECT D7]`.
- **Status:** Accepted.

**ADR-017 - Generation-A artifacts are excluded from migration inputs**
- **Context:** The package mixes a 30-page crawl with a 44,173-page crawl, and the stale files are what the checklist tells the implementer to read first.
- **Alternatives:** (a) use all artifacts; (b) use Generation B only; (c) use Generation A to fill gaps.
- **Decision:** Option (b). Generation A contributes nothing usable: empty taxonomy arrays, an empty relationship graph, `[]` for settings and side stones, all-null gemstones, and empty content directories.
- **Reason:** Generation A artifacts are actively misleading. Using them would introduce null records and empty taxonomies into a production schema.
- **Consequences:** Section 40 records exactly what must be retained from each generation. The onboarding checklist in `19_AI_IMPLEMENTATION_CHECKLIST.md` must be corrected to skip `ai_context/ARCHITECTURE.md` and `AI_CODING_AGENT_INSTRUCTIONS.md`.
- **Evidence:** `[DEFECT D5]`; section 4.4.
- **Status:** Accepted.

**ADR-018 - A single embedding dimension and model for all vectors**
- **Context:** pgvector columns require a fixed dimension.
- **Alternatives:** (a) fix 1024 and re-migrate on change; (b) maintain multiple vector columns per model; (c) an external vector store with multiple spaces.
- **Decision:** Option (a). `vector(1024)` for both `knowledge_chunks` and `product_embeddings`, with `embedding_model` recorded per row and a versioned re-embed job.
- **Reason:** Multiple dimensions multiply index maintenance and query complexity for no benefit at this scale.
- **Consequences:** A model change triggers a full re-embed as a background job with shadow comparison. The cost is planned for, not discovered.
- **Evidence:** charter 10.
- **Status:** Accepted.

**ADR-019 - Modular monolith with explicit extraction triggers**
- **Context:** The charter forbids premature microservices but demands clear boundaries.
- **Alternatives:** (a) microservices from the start; (b) a single unstructured codebase; (c) a modular monolith with written extraction criteria.
- **Decision:** Option (c). One deployable application plus one worker. Modules communicate only through application services. Extraction requires a named trigger: independent scaling, security isolation, deployment independence, failure isolation or a measured bottleneck.
- **Reason:** At 50,000 users the operational cost of microservices exceeds the benefit, and transactional consistency is easier to guarantee in one process.
- **Consequences:** Module boundaries must be enforced in code review and by import-boundary linting, because the runtime does not enforce them. The likely first extraction is certificate OCR, because it is compute-heavy and security-isolated.
- **Evidence:** charter 8, 47, 48.
- **Status:** Accepted.

**ADR-020 - Transactional outbox rather than direct event publishing**
- **Context:** Domain events must be reliable and consistent with state changes.
- **Alternatives:** (a) publish inside the transaction; (b) publish after commit; (c) transactional outbox.
- **Decision:** Option (c). Events are inserted in the same transaction as the state change and dispatched asynchronously, with idempotent consumers recorded in `event_consumers`.
- **Reason:** Option (a) can publish an event for a rolled-back transaction. Option (b) can lose an event if the process dies between commit and publish.
- **Consequences:** Events are eventually consistent, by a small and bounded delay. Consumers must be idempotent. This is the correct trade for cache invalidation and embedding triggers.
- **Evidence:** charter 38, 39.
- **Status:** Accepted.

---

## 36. ASSUMPTIONS

Each is `[INFERRED]` and each is falsifiable.

| ID | Assumption | Basis | Falsified by |
|---|---|---|---|
| A-01 | The SKU grammar `JS{design}{metal}-{gemRef}` holds for all 9,812 DYO URLs, not only the 1,024 captured with a SKU | `[VERIFIED]` 1,024/1,024 plus the settings superset property | Any DYO URL failing to parse |
| A-02 | Loose-stone slugs reliably encode weight, origin, shape, colour, variety and id | `[VERIFIED]` 19,666/19,666 parse rate | Parse failures in V1 |
| A-03 | Price is a deterministic function of `(setting variant, gemstone)` | `[VERIFIED]` same stone, different settings, different prices | Same SKU showing two prices on re-crawl |
| A-04 | 60 colour categories and roughly 100 varieties are stable reference sets | `[VERIFIED]` from route inventory | New crawl revealing materially different sets |
| A-05 | The site will continue to sell the same four entity kinds | `[OBSERVED]` across 33,934 commerce URLs | A new entity family appearing |
| A-06 | 14 metal codes cover the assortment | `[VERIFIED]` site-wide | A 15th code in a re-crawl |
| A-07 | The customer journey for a stone is discover, evaluate, configure, purchase | `[OBSERVED]` funnel routes plus `[INFERRED]` commerce norms | Session data contradicting it |
| A-08 | A managed auth provider is acceptable | charter 15 | A compliance requirement for on-prem identity |
| A-09 | ~50,000 users is the right scale order of magnitude | charter 47 | Different traffic profile |
| A-10 | MediaKit is acceptable for image delivery | charter 13 | Cost or residency constraint |
| A-11 | Meta WhatsApp Cloud API is the right channel | charter 28 | Channel strategy change |
| A-12 | The residual-derived setting prices are close enough to curate from | `[INFERRED]` from section 26.3 | Residual analysis showing no coherent per-setting value |
| A-13 | Gemini-origin and Vedic content remain commercially significant | `[OBSERVED]` 860 vedic settings plus the education route | Content strategy change |
| A-14 | Most settings serve many stones, so one 3D model per setting is sufficient | `[VERIFIED]` DYO is a cross-product | An individual stone requiring a unique model |

## 37. KNOWN UNKNOWNS

Carried forward from section 4.5, with the decision each requires.

| Unknown | Current handling | Owner | Needed by |
|---|---|---|---|
| Payment provider | `PaymentProvider` interface, no vendor chosen | Commerce | Before checkout phase |
| Tax engine | `tax_component` column, computes to zero | Finance | Before checkout phase |
| Shipping carriers and rates | `fulfillments` table, no rates implemented | Commerce | Before checkout phase |
| Discount mechanics | `discounts` schema, no rules implemented | Growth | Before launch |
| Refund policy | Request plus approval workflow | Support | Before launch |
| Order numbering | `MG-YYYY-NNNNNN` placeholder | Commerce | Before checkout phase |
| Ring size as a DYO option | Schema supports it; **no evidence it exists** | Product | Before DYO phase |
| Engraving | Schema supports it; **no evidence it exists** | Product | Before DYO phase |
| Side-stone catalogue | JSONB placeholder; `all_side_stones.json` is `[]` | Product | Before DYO phase |
| Certificate schema | OCR plus human review | Trust | Before certificate phase |
| Lab integrations | None | Trust | Deferred |
| Search ranking of the original | Nothing copied | Search | Never |
| Original backend framework | None claimed | - | Never |
| Original infrastructure | None claimed | - | Never |
| Customer data model of the source | Reconstructed from requirement only | Customers | Before account phase |
| CRM and ERP | None integrated | Operations | Deferred |
| Review and loyalty subsystem | Block component only | Growth | Deferred |
| Live-chat vendor contract | New provider to be selected | Support | Before WhatsApp phase |
| 3D asset production cost | Pipeline designed; no assets exist | Product | Before WebAR phase |

## 38. DEFERRED DECISIONS

Deliberately not decided now, with the trigger to revisit.

| Decision | Deferred until | Trigger |
|---|---|---|
| Dedicated search engine | p95 breaches NFR-03 under load, or prefix-search latency fails | Measured |
| Service extraction | A module shows a concrete scaling, isolation or ownership need | Measured |
| Multi-region deployment | Real latency or residency requirement | Measured |
| Read replica topology | Reporting load affects primary | Measured |
| Alternative payment providers | A second provider is commercially needed | Business |
| Alternative messaging channel | WhatsApp coverage proves insufficient | Business |
| Vector store externalisation | HNSW memory or recall degrades at 10x catalog scale | Measured |
| GraphQL facade | A real over-fetching or over-fetched problem appears | Measured |
| Micro-frontends for admin | Admin team growth justifies it | Organisational |
| Internationalisation beyond English | Non-English market demand | Business |
| 3D asset outsourcing | Production cost proves unsustainable | Financial |

## 39. IMPLEMENTATION PHASES

Aligned to charter 61, adjusted for this evidence. Each phase has an exit gate.

| Phase | Scope | Exit gate |
|---|---|---|
| **0. Architecture validation** | This document; evidence gaps closed with the client | Document approved; A-01 to A-14 accepted or amended |
| **1. Database foundation** | Schema, migrations, extensions, staging tables, RLS, seeding of taxonomy | All migrations apply cleanly on a Neon branch; V1-V14 pass on staged data |
| **2. Catalog and taxonomy** | Import M1-M3; catalog read APIs; product and category pages | 9,812 DYO and 19,665 stones resolvable; INV-01/02/03 hold |
| **3. Search** | Hybrid search, facets, synonyms, ranking, caching | NFR-03 met on staging load test |
| **4. Storefront** | All routes, components, states, SEO, redirects | Lighthouse and accessibility budgets met; redirect E2E green |
| **5. DYO** | Configuration engine, compatibility, quoting, cart conversion | INV-01/02/03 hold; pricing reproducible from snapshots |
| **6. Cart, checkout, account** | Four-step funnel, payments adapter, accounts, orders | E2E green; price-tampering test green |
| **7. Certificates** | Upload, OCR, confidence, cross-check, review, verification view | No unverified field renders as fact; V-gates for trust green |
| **8. AI concierge** | Orchestrator, tools, RAG, guardrails, handoff, evaluation | All AI evaluation dimensions pass; injection tests green |
| **9. WhatsApp** | Webhook, channel adapter, shared brain, templates, handoff | Tool-registry equality test green |
| **10. WebAR** | Asset pipeline, runtime, tracking, fallbacks, QR handoff | No regression in storefront LCP; fallback matrix green |
| **11. CMS and admin** | CMS, blocks, review queue, all admin modules, migration console | Approval workflow functional; audit complete |
| **12. Hardening** | Performance, security, observability, load test | NFR targets met; security matrix green |
| **13. Production** | Migration rehearsal, cutover, runbooks | Full verification suite green on production-shaped data |

Phase ordering rationale: DYO (5) precedes commerce (6) because most configured products enter the cart through DYO. Search (3) precedes storefront (4) because category pages depend on facets. Certificates (7) precede AI (8) because the AI must be able to answer certificate questions safely, which requires the verification model to exist.

## 40. DEFINITION OF DONE

Per charter 62, applied concretely. A capability is done only when all of the following hold:

1. Source evidence is understood and cited, including the evidence status of every migrated field.
2. Target architecture is documented and matches this document.
3. Schema supports the capability, with constraints and indexes.
4. Backend logic exists in the correct module and layer, with no business logic in route handlers.
5. API contracts are stable, validated and documented.
6. Frontend is implemented, data-driven, and works for every state.
7. Loading, error, empty and not-found states exist.
8. Authorization exists and is enforced outside the AI layer.
9. Tests exist at every layer, including evidence-linked assertions from section 34.2.
10. Observability exists: traces, metrics, logs and alerts.
11. Source evidence is respected: nothing promoted, nothing discarded silently.
12. Unknowns are explicitly handled and labelled, not guessed.
13. Performance is measured and meets the stated target.
14. Security requirements are met and tested.
15. Provenance is answerable: where did this value come from?
16. The migration is idempotent and re-runnable.
17. Documentation is updated if a decision changed.

## 41. RETENTION REQUIREMENTS

Classification of `naturalgemstones/` and `reverse_engineered/`. **Nothing here has been deleted. This is a recommendation only.**

### A. Must remain permanently

| Item | Reason |
|---|---|
| `crawler.sqlite` (+ `-wal`, `-shm`) | The only relational source of truth. `documents`, `links` and `media_assets` are 0 rows now, but the **schema** is the only record of what the crawler intended to capture. Cheap to keep, impossible to recreate. Note: checkpoint the WAL before archiving, or the 26 MB `-wal` may hold committed rows absent from the main file |
| `reverse_engineered/data/urls.jsonl` (30.5 MB) | **The migration spine.** Contains all 44,218 URLs including the 33,934 commerce URLs absent from `products.jsonl` |
| `reverse_engineered/data/specifications.jsonl` (4.9 MB) | The 13 gemstone attribute fields for 1,024 products, and the D9 concatenated values |
| `reverse_engineered/data/pages_analyzed.jsonl` (468 MB) | **The only source of price, availability and JSON-LD.** Deleting it loses all 1,024 prices permanently (D8). Highest-value large file |
| `reverse_engineered/data/products.jsonl` (929 KB) | Observed `product.sku` ground truth, required to validate the slug parser (V3) |
| `reverse_engineered/data/media_analyzed.jsonl` (179 MB) | The asset URL inventory with host and path stem, the basis for asset classification |
| `reverse_engineered/entities/media/report.json`, `appraisal.json` (63 KB) | The only structured evidence that certificate and report artefacts exist (D6) |
| `reverse_engineered/raw/source_snapshots/manifest.jsonl` (24 MB) | HTML SHA-256 hashes, enabling integrity verification of any re-crawl |
| `reverse_engineered/data/taxonomy.json` (26 KB) | Field value distributions with counts, used to seed reference data and validate normalizers |
| This document | The durable reference |

### B. Safely consolidated into this document, then the original can be archived

| Item | Consolidated into |
|---|---|
| `data/route_patterns.json`, `architecture/routes/*` | Section 13.1 route map; section 4.2 cardinalities |
| `data/database_blueprint.json`, `schema/proposed_database/*` | Section 8 (superseded; the blueprint was explicitly INFERRED and is now obsolete) |
| `data/conceptual_entities.json`, `data/functional_model.json` | Sections 5 and 7 |
| `ai_context/**` (Generation B) | Sections 5, 7, 28, 34 |
| `architecture_handoff/**` | Sections 35, 37, 39 |
| `00_README.md` through `20_VALIDATION_AND_QA*.md` | Sections 3, 4 and 4.4 |
| `qa_report*.json`, `dataset_manifest.json`, `validation/validation_report.json` | Section 4.4 |
| `data/schema.json`, `data/table_summaries.json`, `data/database_inventory.json` | Sections 4.3 and 8 |
| `exports/*.csv`, `exports/products.jsonl` | Redundant with the JSONL datasets and `crawler.sqlite` |
| `examples/**` | Sections 3.1, 4.2 |
| `entities/products/*.json`, `entities/products/all_*.json` | Redundant with `crawler.sqlite.products` plus the JSONL datasets |

### C. Can be regenerated

| Item | Regeneration path |
|---|---|
| `data/pages.jsonl` | Query `crawler.sqlite` |
| `data/relationships.jsonl` | Re-derive from `pages`, `products`, `specifications` and the `assets` table |
| `data/page_links.jsonl` | Re-extract from `raw_html` |
| `data/media.jsonl` | Re-derive from the `assets` table |
| `data/dyo_evidence.jsonl`, `functional_signals.jsonl` | Re-derive from HTML |
| `data/source_relationships.jsonl` | Re-derive |
| `products/*.json`, `pages/*.json` | Re-derive |
| `raw_html/**` (1.5 GB, 43,149 files) | **Only 1,024 files (1.4 GB) contain real content.** The 43,149 error shells are worthless. If retention budget matters, the error shells can be dropped and the 1,024 real files retained, losing no evidence |

### D. Archive, do not delete

| Item | Reason |
|---|---|
| `raw_html/` (1,024 real files, 1.4 GB) | Not needed for the migration we designed, since every required attribute is already extracted. But it is the **only** ground truth if a later requirement needs a DOM fact we did not extract. Compressed to roughly 15-20%, this is cheap insurance. Archive, do not delete |
| `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` | Remains authoritative for vision and charter |
| `crawler.sqlite-wal` (26 MB) | Checkpoint into the main file first, then archive |

### E. Must be retained because it contains actual source data

| Item | Contents |
|---|---|
| `urls.jsonl` | 44,218 URLs, the only record of 33,934 commerce pages the crawler's product classifier missed |
| `pages_analyzed.jsonl` | Price, availability, JSON-LD, breadcrumbs, canonical, media and product JSON for 1,024 pages |
| `specifications.jsonl` | All 12,401 attribute rows |
| `media_analyzed.jsonl` | 241,961 asset references |
| `products.jsonl` | 1,245 product records with 1,024 observed SKUs |
| `crawler.sqlite` | 282,586 rows across 10 tables |
| `entities/media/{report,appraisal}.json` | Certificate and appraisal artefacts |
| `raw/source_snapshots/manifest.jsonl` | Content hashes |

### F. Safe to archive without loss

| Item | Reason |
|---|---|
| `architecture/**` | Generation A. Empty taxonomy arrays, 30-URL route sample |
| `relationships/relationship_graph.json` | Empty arrays (Generation A) |
| `entities/settings/all_settings.json` | `[]` |
| `entities/side_stones/all_side_stones.json` | `[]` |
| `entities/gemstones/all_gemstones.json` | 11 KB of all-null objects. Defective. The real stone data is in `specifications.jsonl` and `urls.jsonl` |
| `entities/media/{3d,360}.json` | Misclassified JavaScript bundles (D4) |
| `content/**` (4 empty dirs) | 0 files |
| `design_your_own/` | 0 files |
| `DATASET_MANIFEST(1).json`, `validation/validation_report.json` | Generation A, describe a 30-page crawl |
| `ai_context/ARCHITECTURE.md`, `ai_context/AI_CODING_AGENT_INSTRUCTIONS.md` | Generation A, superseded by this document. **Actively misleading**: they instruct the implementer not to use a generic Product table, but the `database_blueprint.json` they point to is itself obsolete |
| `logs/` | 0 files |
| `raw_html/` error shells (43,149 files, ~85 MB) | 502 Bad Gateway pages with no content |

### G. What must NOT be deleted before migration completes

`crawler.sqlite`, `urls.jsonl`, `specifications.jsonl`, `pages_analyzed.jsonl`, `media_analyzed.jsonl`, `products.jsonl`, `entities/media/{report,appraisal}.json`, and `raw/source_snapshots/manifest.jsonl`.

**Deleting `pages_analyzed.jsonl` before migration would permanently destroy all 1,024 product prices.** Price exists nowhere else in the package. That single file is the highest-risk deletion in the entire package.

**Deleting `urls.jsonl` before migration would permanently destroy 33,934 commerce URLs** covering the loose-stone, pair and setting catalogs. Combined with `products.jsonl`, a migration without `urls.jsonl` loses roughly 97% of the catalog (D1).

### H. Information that cannot be preserved without the original files

| Information | Where it lives today | If lost |
|---|---|---|
| Product prices and availability | `pages_analyzed.jsonl` only | Unrecoverable. Must migrate before any cleanup |
| SARIN report and certificate artefact URLs | `entities/media/{report,appraisal}.json` and `media_analyzed.jsonl` | Unrecoverable without a re-crawl, and a re-crawl may not return the same assets |
| HTML DOM evidence | `raw_html/` (1,024 real files) | A re-crawl may return different markup, different prices, or nothing. Unrecoverable |
| The 502-failure set | `products.jsonl` plus `raw_html/` | Minor; indicates which URLs need re-fetching |
| Content hashes | `raw/source_snapshots/manifest.jsonl` | Cannot prove a future re-crawl captured the same content |
| Crawl status codes | `crawler.sqlite.pages` | Cannot distinguish "not fetched" from "no such page" |

## 42. SOURCE-TO-TARGET TRACEABILITY

Every major target feature traced end to end. This table is the answer to *why does this component exist*.

| # | Source evidence | Requirement | Target domain | Database entity | Target API | Frontend | Test |
|---|---|---|---|---|---|---|---|
| 1 | 1,024 DYO product records, `product.sku` OBSERVED | FR-CAT-05 | catalog | `products` (kind=CONFIGURED) | `GET /products/{slug}` | `ProductPage` | Evidence-linked SKU test |
| 2 | SKU grammar `JS{design}{metal}-{gemRef}`, 1,024/1,024 | FR-CAT-04, ADR-005 | catalog | `setting_variants.sku` | `GET /settings/{sku}` | `SettingPage` | Parser test |
| 3 | 10,349 `(design, metal)` setting SKUs | FR-CAT-04 | catalog | `setting_variants` | `GET /settings` | `SettingsIndexPage` | V12 gate |
| 4 | 19,665 loose-stone URLs, `K#####` | FR-CAT-03 | catalog | `gemstones` (kind=SINGLE) | `GET /gemstones/{gemRef}` | `StonePage` | V1, V10 gates |
| 5 | 3,077 pair URLs, `PR#####` | FR-CAT-03 | catalog | `gemstones` (kind=PAIR) | `GET /gemstones/{gemRef}` | `StonePage` | V2, V8 gates |
| 6 | 113/113 pairs in earrings | FR-DYO-02, INV-02 | dyo | `products.jewellery_type` constraint | `check_dyo_compatibility` | `DyoFlow` | INV-02 test |
| 7 | `weight = "2.87 Ct. 3.11 Ct."`, 113/113 sum to `Ct.Tw.` | FR-CAT-06, ADR-009 | catalog | `gemstone_stones` | `GET /gemstones/{gemRef}` | `StoneSpecPanel` | V8, V9 gates |
| 8 | Doubled spec strings, D9 | FR-CAT-06 | catalog | `clarity_labels.is_doubled`, `gemstone_stones.raw_*` | - | `SpecTable` | `token_count` test |
| 9 | 13 spec fields | FR-CAT-03 | catalog | `gemstones` columns | `GET /gemstones/{gemRef}` | `SpecTable` | Field-coverage test |
| 10 | `stone_type` on only 113/1,024 | FR-AI-06 | ai | `gemstone_varieties`, `evidence_status` | `get_gemstone` | `ChatPanel` | `no_invention_null` eval |
| 11 | 14 metal codes, 1:1 with slug phrases | FR-CAT-04 | taxonomy | `metals` | `GET /taxonomy/metals` | `MetalPicker` | Mapping test |
| 12 | 22 setting style slugs, 18 families | FR-TAX-03 | taxonomy | `setting_styles` | `GET /taxonomy/facets` | `FilterPanel` | Value-coverage test |
| 13 | 145 variety route slugs | FR-TAX-01 | taxonomy | `gemstone_varieties` | `GET /taxonomy/varieties` | `VarietyPage` | V4 gate |
| 14 | 60 colour categories | FR-TAX-02, FR-TAX-04 | taxonomy | `gemstone_colours` | `GET /taxonomy/colors` | `ColourLandingPage` | Seed-coverage test |
| 15 | `/tsavorite-garnet`, `-pairs`, `-rings` triplets | FR-TAX-05 | cms | `pages` | `GET /pages/{slug}` | `VarietyPage` | Route test |
| 16 | Prices $1,074-$17,599, JSON-LD only, D8 | FR-CAT-03 | pricing | `price_entries`, `price_model_observations` | `GET /products/{slug}` | `PriceBlock` | Price-recovery test |
| 17 | `price != weight x ppc` for 0/1,024, median 2.269 | FR-CAT-03, ADR-010 | pricing | `dyo_price_snapshots` components | `get_price_quote` | `PriceBreakdown` | Residual non-zero test |
| 18 | 860 search signals | FR-SEARCH-01 | search | indexes on catalog tables | `POST /search` | `SearchPage` | Latency test |
| 19 | `?rs=`, `?design-styles=` | FR-SEARCH-03 | search | facet definitions | `POST /search` | `FilterPanel` | Facet test |
| 20 | `/design-your-own/review/{slug}`, 9,812 | FR-DYO-01 | dyo | `dyo_configurations` | `POST /dyo/configurations` | `DyoFlow` | State-machine test |
| 21 | `navigation-page-title: "Finalize Your"` | FR-DYO-01 | dyo | `dyo_state = PRICED` | review endpoint | `DyoReviewStep` | E2E |
| 22 | DYO backend `[UNKNOWN]` | FR-DYO-04 | dyo | `setting_compatibility_rules` | `validate` | `CompatibilityPanel` | Rule tests |
| 23 | Rings always pair-compatible | FR-DYO-02 | dyo | `jewellery_types.uses_pair` | constraint | `CompatibilityPanel` | INV-02/03 tests |
| 24 | `/cart/order-summary/payment-order/secure-payment` | FR-COM-01 | commerce | `orders`, `checkout sessions` | 4 checkout endpoints | 4 checkout pages | E2E |
| 25 | Payment provider `[UNKNOWN]` | FR-COM-02 | integrations | `payments` | `/webhooks/payments/{p}` | `PaymentForm` | Webhook forgery test |
| 26 | `/financing`, `/extend-protection-plan` | FR-COM-04 | commerce | `product_addons` | checkout session | `AddOnSelector` | Add-on test |
| 27 | `/favorites`, `/compare-list` | FR-COM-05 | commerce | favorites, compare | `/favorites`, `/compare` | `WishlistGrid` | E2E |
| 28 | `/account`, `/auth`, `/verify-email` | FR-COM-06 | customers | `customers`, `addresses` | `/account/**` | `AccountLayout` | Authz matrix |
| 29 | `/showroom/preview/success` | FR-COM-07 | commerce | concierge request | `POST /account/concierge-request` | `ShowroomsPage` | E2E |
| 30 | `/education` plus 14 children | FR-CMS-02 | cms, ai | `pages`, `knowledge_documents` | `GET /pages/{slug}` | `EducationPage` | Content test |
| 31 | `vedic` style 860 plus astrology route | FR-CMS-03 | cms | `pages`, `ASTROLOGY_CONTENT` block | `GET /pages/{slug}` | `VedicPage` | Content test |
| 32 | 14 `/education/*` routes | FR-CMS-05 | cms | `redirects` | - | - | Redirect E2E |
| 33 | `stone/{ref}/cert` | FR-TRUST-01 | certificates | `certificates` (CERTIFICATE) | `GET /gemstones/{ref}/certificates` | `CertificateCard` | Path test |
| 34 | `stone/{ref}/sarin` | FR-TRUST-01 | certificates | `certificates` (GEM_REPORT) | same | `CertificateCard` | Path test |
| 35 | `stone/{ref}/appraisal` | FR-TRUST-01 | certificates | `certificates` (APPRAISAL) | same | `CertificateCard` | Path test |
| 36 | `previewandpast/{sku}/appraisal` | FR-TRUST-01 | certificates | `certificates` on configuration | same | `CertificateCard` | Path test |
| 37 | `documents` table 0 rows, D6 | FR-TRUST-02 | certificates | `certificate_extractions.confidence` | `GET /certificates/{id}` | `ConfidenceBadge` | INV-07 test |
| 38 | Charter's 0.54 origin example | FR-TRUST-02, ADR-012 | certificates | `certificate_public` view | certificates endpoint | `CertificateField` | No-unverified-facts test |
| 39 | 241,961 media records, 5 hosts | FR-CAT-01 | assets | `assets` | `GET /assets/{id}/url` | `ProductGallery` | V16 gate |
| 40 | `role` unknown 94.7%, D7 | FR-CAT-01 | assets | `assets.role` from stem | - | - | Classification test |
| 41 | 120,832 nav-icon records | performance | assets | `SKIPPED` disposition | - | - | Volume test |
| 42 | 7,778 JS bundles as 3D, D4 | security | assets | `assets.kind=OTHER` | - | - | V16 gate |
| 43 | `/_nuxt/*.js`, Nuxt detected | performance | frontend | - | - | Bundle split | Budget test |
| 44 | 3,321 `phone-video` records | FR-CH-05 | assets | `assets.kind=VIDEO_360` | - | `ProductGallery` | Path test |
| 45 | `chat-system.47thst.com`, 4 agents | FR-AI-05 | ai | `conversations.assigned_agent_id` | handoff endpoint | `HandoffNotice` | Escalation eval |
| 46 | 4,220 functional signals | FR-AI-02 | ai | `tool_calls` | `/ai/stream` | `ChatPanel` | Tool-selection eval |
| 47 | Charter tool list | FR-AI-02 | ai | tool registry | - | - | Registry test |
| 48 | Charter "AI must not" list | FR-AI-01, ADR-003 | ai | no mutating tools | - | - | Mutation-denied test |
| 49 | Charter guardrail requirements | FR-AI-06 | ai | `guardrail_events` | - | - | Injection tests |
| 50 | `[UNKNOWN]` treatment coverage | FR-AI-06 | ai | grounding gate | - | `ChatPanel` | `no_invention_null` eval |
| 51 | Charter WhatsApp section | FR-CH-01 | ai | `conversations.channel` | `/webhooks/whatsapp` | - | Registry-equality test |
| 52 | Charter WebAR section | FR-CH-02 | webar | `webar_assets` | `/ar/{id}` | `ARViewer` | Fallback test |
| 53 | 44 sitemap shards | FR-CMS-05 | cms | sitemap generator | `/sitemap-products/{n}.xml` | - | Sitemap test |
| 54 | JSON-LD Product, LocalBusiness | FR-CMS-05 | cms | `seo_metadata` | - | `ProductPage` | Structured-data test |
| 55 | 25 functional routes | FR-CMS-04 | cms | `pages`, `redirects` | `GET /pages/{slug}` | various | Route test |
| 56 | No admin in source | FR- (admin) | admin | RBAC + `audit_logs` | `/admin/**` | `AdminLayout` | Authz matrix |
| 57 | 397,727 relationships with no composition edge, D10 | FR-CAT-05 | catalog | rebuilt from SKU grammar | - | - | Composition test |
| 58 | Generation A empty artifacts, D5 | FR-CAT-02 | operations | `import_batches` | `/admin/import-batches` | `MigrationConsole` | V17 gate |
| 59 | 221 records without SKU | FR-DYO-07, ADR-008 | dyo | `products.source_sku_derived` | admin approval | - | Derived-approval test |
| 60 | Source `?design-styles` facets | FR-SEARCH-02 | search | `setting_styles` | `POST /search` | `FilterPanel` | Facet test |

---

## 43. CLOSING STATEMENT

This document is the architectural baseline. It supersedes the blueprint in `reverse_engineered/data/database_blueprint.json` and `schema/proposed_database/database_schema.json`, both of which were explicitly INFERRED and are now materially wrong about catalogue scale.

Its distinctive value over the supplied package is concentrated in four places:

1. **The SKU grammar and its verification.** The package treated 1,245 flat products as the catalog. The composition structure proved by 1,024/1,024 exact parses is what makes a real DYO engine, a real settings catalog and a real stone inventory possible.
2. **The catalogue undercount.** The package's `jewelry: 1245` hides roughly 33,934 commerce URLs. Migrating from `products.jsonl` would lose 97% of the business.
3. **Price recovery.** Price exists in exactly one file and was never extracted. Losing that file loses all 1,024 prices permanently.
4. **Pair semantics proven twice.** `PR` means pair, confirmed independently by the pair URL family and by the weight-sum check, which yields the earrings invariant.

The single most important instruction for whoever implements this: **keep the evidence tags.** The value of this architecture depends on the distinction between what the source proves, what we derived from it, and what we chose. The moment an `[INFERRED]` decision is described as though it were observed, the traceability that made the design safe is gone.

---

**End of PROJECT_SOURCE_OF_TRUTH.md**