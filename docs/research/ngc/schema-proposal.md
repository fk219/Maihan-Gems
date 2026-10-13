# Maihan-Gems product schema proposal (Postgres / Drizzle)

This is derived from the naturalgemstones.com data model (see `field-matrix.md` and `features.md`), generalised so that **any vendor** can map its own fields. Design rules:

1. **Thin shared core plus a typed attribute registry (EAV with typed columns).** No per-vendor tables.
2. **Gemstone specs live in a reusable `stone_specs` table.** That covers a loose stone, each stone of a pair, and every centre or side stone inside a jewellery piece (their `centerStones[]`/`sideStones[]` pattern).
3. **Settings have explicit compatibility rows** (shape × mm range × carat range × stone count). This replaces their opaque server-side `/setting/match`.
4. **Media is one ordered table** with a `kind` enum covering photos (up to 10), lifestyle shots, video, 360 frames, 3D/AR models, certificates and appraisals.
5. **Prices are stored per region and currency** (AED, THB, USD), with USD as the base.

## Enums (from observed values)
```ts
product_kind: 'loose_stone' | 'stone_pair' | 'setting' | 'jewelry' | 'custom_design'
jewelry_type: 'ring' | 'earring' | 'pendant' | 'necklace' | 'bracelet' | 'bangle' | 'brooch' | 'cufflink'
setting_type: 'ring' | 'mens_ring' | 'earring' | 'pendant_necklace' | 'bracelet'
stone_shape: Round, Oval, Cushion, Emerald Cut, Radiant, Asscher - Octagon, Pear, Heart, Marquise, Princess, Trillion,
  Baguette (Straight), Baguette (Tapered), Bullet (Tapered), Bead, Drop, Fancy, Freeform, Kite, Rough, Slice, Baroque, Various
cutting_style: Faceted, Cabochon, Briolette, Tablet, Carving, Cameo, Bead, Polished, Crystal, Rough, Tumbled, N/A
clarity: Eye Clean, Very Very Slightly Included, Very Slightly Included, Slightly Included, Included, Flawless - IF,
  VS1 - Very Slightly Included (diamond grades), Moderately/Lightly Blemished, Not Applicable
color_intensity: Dark, Vivid, Vivid (Electric/Neon), Vivid (Santa Maria), Intense, Medium Intense, Medium, Light, Faint, Near Colorless, Colorless, N/A
enhancement: No Enhancement, Heat Treated, Dye Treated, Irradiated, Oil/Resin Treated, Smoke Treated, Sugar Treated,
  Vapor-Infused Coating, Doublets, Triplets, Polishing
color_category (15): Bi Color, Black, Blue, Brown, Color Change, Green, Grey, Multi Color, Orange, Peach, Pink, Purple, Red, White, Yellow
special_feature: Cat's Eye, Star, Adularescence, Opalescence
lab: GIA, GRS, AGL, AIGS, AIG, GUBELIN, IGI, Lotus, Bellerophon, C.Dunaigre, GAL, GIC, ICA, In-house, Other
availability: available | ready_to_ship | made_to_order | on_hold | sold | out_of_stock | ships_2_4_weeks
media_kind: image | lifestyle_image | video | video_thumbnail | spin360 | model_3d_glb | model_3d_usdz | scan_3d_srn |
  certificate | appraisal | scan_report | past_creation_image | ai_render
currency: USD | AED | THB
```
Enums that vendors extend (shapes, colours, treatments, origins, metals, styles) are **lookup tables, not Postgres enums**, so admins can add values without a migration.

## Tables

```ts
// ---------- vendors ----------
vendors           { id uuid pk, slug text uniq, name, legal_name, country, default_currency currency,
                    status ('pending'|'active'|'suspended'), commission_pct numeric(5,2), contact jsonb, created_at, updated_at }
vendor_users      { vendor_id fk, user_id fk, role ('owner'|'staff'), pk(vendor_id,user_id) }

// ---------- taxonomy ----------
categories        { id pk, parent_id fk null, kind product_kind,          // Gemstones / Settings / Jewelry (root) → subcategory
                    slug uniq, name, description, hero_image, sort, is_active,
                    legacy_source_url text }                              // e.g. https://www.naturalgemstones.com/amethyst/
// root rows: gemstones, settings, jewelry. Children: 82 stone types (with their own parent_id for varieties,
// e.g. Garnet → Tsavorite), setting types, jewelry types. "Pairs" is a facet of gemstones (kind=stone_pair).
styles            { id pk, slug, name, applies_to ('setting'|'jewelry'|'both') }   // Halo, Pave, Solitaire, … (21 + Tennis/Bead)
gem_types         { id pk, category_id fk, name, parent_gem_type_id null, mohs, family }   // stone-type dictionary used by stone_specs
lookup_values     { id pk, domain text, value text, label, sort, uniq(domain,value) } // shapes, cuts, clarity, intensity, enhancement, origin, metal, color, lab

// ---------- product core ----------
products          { id uuid pk, vendor_id fk, kind product_kind, category_id fk (subcategory), sku text,  // vendor SKU
                    public_code text uniq,                // our ID shown as "Item ID", e.g. MG-K11082
                    title, slug uniq, subtitle, description_html, seo_title, seo_description,
                    availability availability, ship_days_min int, ship_days_max int, rush_available bool,
                    is_made_to_order bool, dyo_enabled bool,   // "Create jewelry with this stone/setting"
                    gemologist_suggestions bool, interest_count int default 0,
                    status ('draft'|'pending_review'|'published'|'archived'), published_at,
                    source_system text, source_ref text, source_url text, source_payload jsonb,  // raw vendor/import JSON kept verbatim
                    created_at, updated_at,
                    uniq(vendor_id, sku) }
product_styles    { product_id fk, style_id fk, pk }
product_color_categories { product_id fk, color_category text, pk }
product_badges    { product_id fk, badge ('on_sale'|'new'|'untreated'|'certified'|'ready_to_ship'|...), label, pk }

// ---------- gemstone specs (reused everywhere) ----------
stone_specs       { id uuid pk, product_id fk,
                    role ('primary'|'pair_member'|'center'|'side'|'accent'),
                    position int, quantity int default 1,
                    gem_type_id fk, gem_subtype_id fk null,
                    weight_ct numeric(8,3), total_weight_ct numeric(8,3),     // jewellery groups: totalWeight
                    length_mm numeric(6,2), width_mm numeric(6,2), depth_mm numeric(6,2),
                    shape text, cut text, cutting_style text, color text,       // fine colour e.g. "Violetish Blue"
                    color_intensity text, color_grade text,                     // diamonds: D–Z / "F"
                    clarity text, enhancement text, origin text,
                    is_star bool, star_appearance text, special_features text[],
                    lab text, lab_color text, lab_report_no text,
                    price_per_ct_usd numeric(12,2) }
-- loose stone: 1 row role=primary. Pair: 2 rows role=pair_member (+ product_attributes total weight). Jewelry: n rows center/side/accent.

// ---------- settings ----------
setting_specs     { product_id pk fk, setting_type setting_type, base_design_code text,   // JS31
                    production_days_min, production_days_max, engraving_max_chars int,
                    supports_vedic bool, ring_size_min numeric(4,2), ring_size_max numeric(4,2), ring_size_step numeric(3,2),
                    finishes text[], prong_options jsonb, side_stone_options jsonb }
setting_metal_variants { id pk, product_id fk, metal_code text,   // PT, W18, W14, W10, SL, Y18, Y14, Y10, R18, R14, WY18, WY14, YW18, YW14 …
                    metal_name text, metal_weight_g numeric(6,2), sku_suffix text, is_default bool,
                    uniq(product_id, metal_code) }               // price lives in product_prices with variant_id
setting_compatibility { id pk, product_id fk (setting), seat ('center'|'side'), stone_count int default 1,  // 2 = earrings need a pair
                    shape text,                                 // one row per accepted shape
                    min_length_mm, max_length_mm, min_width_mm, max_width_mm, min_depth_mm, max_depth_mm,
                    min_ct, max_ct,
                    ratio_min numeric, ratio_max numeric,       // L/W for oval/pear/marquise
                    tolerance_mm numeric default 0.3,           // "jeweller adjusts prongs"; outside range → manual review
                    allowed_cutting_styles text[] default '{Faceted}',
                    notes }
-- fit(stone, setting) := EXISTS row WHERE shape=stone.shape AND stone_count = (kind=stone_pair?2:1)
--   AND stone.length BETWEEN min_length-tol AND max_length+tol AND width likewise AND (ct range if set)
-- exact → 'fits'; within tolerance → 'needs_review'; else hidden. This mirrors their stoneId/settingId listing filters.

// ---------- finished jewelry ----------
jewelry_specs     { product_id pk fk, jewelry_type jewelry_type, metal_code, metal_name,
                    ring_size numeric(4,2) null, resizable bool, sizes_available numeric[],
                    chain_length_in numeric(4,1), chain_included bool, total_length_mm numeric(6,2),
                    total_carat numeric(8,3), based_on_setting_id fk null }   // finished pieces built from a setting

// ---------- attribute registry (vendor-flexible) ----------
attribute_defs    { id pk, code text uniq,                 // 'carat', 'length_mm', 'treatment', 'lab_report_no', 'metal_purity', …
                    label, data_type ('text'|'number'|'bool'|'enum'|'multi_enum'|'range'|'json'),
                    unit text null, lookup_domain text null, is_filterable bool, is_comparable bool, is_required bool,
                    help_url text, display_group ('details'|'stone'|'metal'|'shipping'), sort }
category_attributes { category_id fk, attribute_def_id fk, is_required bool, sort, inherit bool default true, pk }
product_attributes { product_id fk, attribute_def_id fk, stone_spec_id fk null,
                    value_text, value_num numeric, value_bool, value_json jsonb, unit,
                    pk(product_id, attribute_def_id, coalesce(stone_spec_id)) }
vendor_field_mappings { id pk, vendor_id fk, source_field text, target ('core'|'stone_spec'|'attribute'),
                    target_column text null, attribute_def_id fk null,
                    transform jsonb,                        // {"type":"map","values":{"VS":"Very Slightly Included"}} | {"type":"unit","from":"in","to":"mm"} | regex
                    uniq(vendor_id, source_field) }
import_jobs       { id pk, vendor_id fk, source ('csv'|'xlsx'|'json'|'api'|'shopify'), file_url, status, stats jsonb, errors jsonb, created_at }
-- core and stone_specs columns are the indexed, filterable "canonical" fields. product_attributes holds everything else.
-- Filters read from canonical columns. product_attributes rows with is_filterable add more filters.

// ---------- media ----------
product_media     { id uuid pk, product_id fk, stone_spec_id fk null, variant_id fk null (metal variant),
                    kind media_kind, sort int, title, description, alt,
                    url text, storage_key text, mime, bytes int, width int, height int, duration_s numeric,
                    variants jsonb,                         // {"small":url,"medium":url,"full":url} or image sizes
                    frames_count int, frame_url_pattern text,   // spin360: ".../{NNN}.jpg"
                    is_primary bool, is_past_creation bool,
                    source_url text, source_type_code int,  // NGC thumbnails[].type (1,3,4,10,11)
                    generated_by ('vendor'|'ai_image_to_3d'|'procedural'|'admin') null, approved_by fk null, approved_at,
                    created_at }
-- Constraint (trigger): ≤ 10 rows kind IN ('image','lifestyle_image') per product (per variant).
-- AR: model_3d_glb (web/Android Scene Viewer + our MediaPipe try-on) and model_3d_usdz (iOS Quick Look), each 0..1 per product/variant.
certificates      { id pk, product_id fk, stone_spec_id fk null, lab text, report_no text, issued_on date,
                    image_media_id fk null, pdf_media_id fk null, verify_url text, conclusions jsonb }

// ---------- pricing ----------
regions           { code pk ('AE','TH','GLOBAL'), name, currency currency, vat_pct numeric, price_rounding ('none'|'99'|'nearest_5') }
product_prices    { id pk, product_id fk, variant_id fk null, region_code fk, currency currency,
                    list_price numeric(12,2), sale_price numeric(12,2) null, bank_wire_price numeric(12,2) null,
                    price_per_ct numeric(12,2) null, is_manual bool,      // manual override vs FX-derived
                    sale_name text, valid_from, valid_to, uniq(product_id, variant_id, region_code) }
fx_rates          { base 'USD', quote currency, rate numeric(14,6), fetched_at }
-- Base USD price → AED/THB via fx_rates and regions.price_rounding unless is_manual. The display region comes from geo-IP or a user choice (their localCurrency).

// ---------- engagement ----------
wishlists / wishlist_items   { owner: user_id | anon_session_id, product_id, variant_id, custom_design_id, added_at, share_hash }
compare_lists / compare_items { same shape; one list per product kind (stones vs settings vs jewelry) }
inquiries         { id, product_id, type ('question'|'hold_notify'|'custom_design'|'showroom'), name, email, phone, payload jsonb, status }
holds             { product_id, customer/user, until, reason }   // drives availability=on_hold

// ---------- design-your-own ----------
custom_designs    { id uuid pk, user_id|anon_session_id, setting_product_id fk, setting_variant_id fk,
                    stone_product_id fk,                 // loose stone or pair
                    fit_status ('fits'|'needs_review'|'incompatible'),
                    options jsonb,                       // ring size, engraving, finish, prong, side stones
                    price_usd numeric, ai_render_media_id fk null, model_3d_media_id fk null, share_hash, created_at }
```

### Indexes
- `products(kind, category_id, status)` and `products(vendor_id)`
- `stone_specs(gem_type_id, shape, weight_ct)` and `stone_specs(length_mm, width_mm)`
- `product_prices(region_code, list_price)`
- `setting_compatibility(shape, stone_count, min_length_mm, max_length_mm)`
- GIN on `products.source_payload` and `product_color_categories`

### How the NGC fields map
| NGC field | Maihan column |
|---|---|
| id (K11082), itemRealId | products.public_code / source_ref (itemRealId → source_payload) |
| stoneType / stoneSubType | stone_specs.gem_type_id / gem_subtype_id and products.category_id |
| weight, length, width, height | stone_specs.weight_ct, length_mm, width_mm, depth_mm |
| shape, cut, cuttingStyle, color, colorIntensity, clarity, enhancement, origin | stone_specs.* |
| colorCategories[] | product_color_categories |
| isStar, starAppearance, specialFeatures | stone_specs.is_star, star_appearance, special_features |
| labType, labColor | stone_specs.lab, lab_color, plus a certificates row |
| price, discountPrice, bankWirePrice, pricePerCt, saleName | product_prices (USD, region GLOBAL) plus derived AED and THB rows |
| itemStatus.description / status | products.availability |
| estimatedShipDate, productionTimeFrom/To | products.ship_days_min/max |
| dyoProcess, customDesigns, gemologistSuggestions, interestCount | products.dyo_enabled, …, interest_count |
| productDescription | products.description_html |
| thumbnails[type 1/11/3/10/4] | product_media image / lifestyle_image / certificate / appraisal / scan_report |
| phoneVideos[] | product_media kind=video (variants small, medium, full) plus video_thumbnail |
| containsVideo360, framesCount | product_media kind=spin360 (frames_count, frame_url_pattern) |
| containsSarin, sarinPath | product_media kind=scan_3d_srn |
| pair stones[], totalWeight, maxWeightStone | 2 stone_specs (pair_member) plus attribute total_weight_ct |
| setting metalTypes[], metalTypeCode, metalName | setting_metal_variants |
| setting sizes[], finish[], engravingLength, vedicSetting, prongs, pavesWeight | setting_specs.* |
| setting styleNames[] / jewelry styleNames[] | product_styles |
| jewelry centerStones[], sideStones[] (incl. diamonds) | stone_specs role center/side (quantity, total_weight_ct, color_grade) |
| jewelry metal, chainLength, chainIncluded, length, ring sizes | jewelry_specs.* |
| extendReferenceId, extendPlan | products.source_payload (warranty integration later) |


## Example: 2 scraped products mapped

### Loose stone K11733
```json
{
 "products": {
  "kind": "loose_stone",
  "vendor": "ngc-demo",
  "public_code": "MG-K11733",
  "sku": "K11733",
  "category": "Tanzanite",
  "title": "1.31 Ct. Violetish Blue Tanzanite from Tanzania",
  "description_html": "<p>In the enchanting embrace of twilight, where the sky dances between hues of violet and blue, lies a gemstone that cap…",
  "availability": "available",
  "dyo_enabled": true,
  "source_url": "https://www.naturalgemstones.com/tanzanite/",
  "source_payload": "<verbatim NGC JSON>"
 },
 "stone_specs": [
  {
   "role": "primary",
   "gem_type": "Tanzanite",
   "gem_subtype": null,
   "weight_ct": 1.31,
   "length_mm": 6.44,
   "width_mm": 6.44,
   "depth_mm": 4.79,
   "shape": "Round",
   "cut": "Mixed Brilliant Cut",
   "cutting_style": "Faceted",
   "color": "Violetish Blue",
   "color_intensity": "Medium",
   "clarity": "Very Slightly Included",
   "enhancement": "Heat Treated",
   "origin": "Tanzania",
   "is_star": false,
   "lab": "In-house",
   "lab_color": "N/A",
   "price_per_ct_usd": 239.69
  }
 ],
 "product_color_categories": [],
 "product_prices": [
  {
   "region": "GLOBAL",
   "currency": "USD",
   "list_price": 314,
   "sale_price": null
  },
  {
   "region": "AE",
   "currency": "AED",
   "list_price": 1153.0,
   "is_manual": false
  },
  {
   "region": "TH",
   "currency": "THB",
   "list_price": "= USD × fx_rates(THB)",
   "is_manual": false
  }
 ],
 "product_media": [
  {
   "kind": "image",
   "sort": 1,
   "title": null,
   "source_type_code": 1,
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/image/certified-natural-untreated-tanzania-round-violetishblue-tanzanite-1.3100-cts-k11733-1.jpg"
  },
  {
   "kind": "certificate",
   "sort": 2,
   "title": "Gemstone Report",
   "source_type_code": 3,
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/cert/k11733_nsc_web.jpg?v=20260505231610"
  },
  {
   "kind": "appraisal",
   "sort": 3,
   "title": "Gemstone Appraisal",
   "source_type_code": 10,
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/appraisal/k11733_nsc_web.jpg?v=20260227015248"
  },
  {
   "kind": "scan_report",
   "sort": 4,
   "title": "3D Scan Report",
   "source_type_code": 4,
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/sarin/k11733_low_rep.jpg?v=20251123231257"
  },
  {
   "kind": "lifestyle_image",
   "sort": 5,
   "title": "Gemstone LifeStyle",
   "source_type_code": 11,
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/lifestyleimage/certified-natural-tanzania-round-violetishblue-tanzanite-1.3100-cts-k11733-lifestyleimage-1.jpg"
  },
  {
   "kind": "lifestyle_image",
   "sort": 6,
   "title": "Gemstone LifeStyle",
   "source_type_code": 11,
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/lifestyleimage/certified-natural-tanzania-round-violetishblue-tanzanite-1.3100-cts-k11733-lifestyleimage-2.jpg"
  },
  {
   "kind": "video",
   "title": "1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite White Glove Close Up Video",
   "description": "Watch a White Glove Close Up Video of this 1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite to get a better view of this gemstone from different angles",
   "variants": {
    "small": "https://phone-video.naturalgemstones.com/gemstone/k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156/mp4/k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156-small.mp4",
    "full": "https://phone-video.naturalgemstones.com/gemstone/k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156/mp4/k11733-652ba46e-cf30-4cf7-b4e0-5663840e6156-full.mp4"
   }
  },
  {
   "kind": "video",
   "title": "1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite White Glove Video Demonstrating Actual Size",
   "description": "Watch a White Glove Video Demonstrating Actual Size of this 1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite to get a better view of this gemstone from different angles",
   "variants": {
    "small": "https://phone-video.naturalgemstones.com/gemstone/k11733-790c0728-0d48-450b-b176-7e30d728581b/mp4/k11733-790c0728-0d48-450b-b176-7e30d728581b-small.mp4",
    "full": "https://phone-video.naturalgemstones.com/gemstone/k11733-790c0728-0d48-450b-b176-7e30d728581b/mp4/k11733-790c0728-0d48-450b-b176-7e30d728581b-full.mp4"
   }
  },
  {
   "kind": "video",
   "title": "1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite Hand Model Video Demonstrating Actual Size",
   "description": "Watch a Hand Model Video Demonstrating Actual Size of this 1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite to get a better view of this gemstone from different angles",
   "variants": {
    "small": "https://phone-video.naturalgemstones.com/gemstone/k11733-3162e11d-ad96-42b3-a57f-eaab74f2f9af/mp4/k11733-3162e11d-ad96-42b3-a57f-eaab74f2f9af-small.mp4",
    "full": "https://phone-video.naturalgemstones.com/gemstone/k11733-3162e11d-ad96-42b3-a57f-eaab74f2f9af/mp4/k11733-3162e11d-ad96-42b3-a57f-eaab74f2f9af-full.mp4"
   }
  },
  {
   "kind": "video",
   "title": "1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite Hand Model Video Demonstrating Actual Size 2",
   "description": "Watch a Hand Model Video Demonstrating Actual Size of this 1.31 Ct. Tanzania Heat Treated Violetish Blue Tanzanite to get a better view of this gemstone from different angles",
   "variants": {
    "small": "https://phone-video.naturalgemstones.com/gemstone/k11733-405db9bd-98b4-4866-9272-c42330efcc2e/mp4/k11733-405db9bd-98b4-4866-9272-c42330efcc2e-small.mp4",
    "full": "https://phone-video.naturalgemstones.com/gemstone/k11733-405db9bd-98b4-4866-9272-c42330efcc2e/mp4/k11733-405db9bd-98b4-4866-9272-c42330efcc2e-full.mp4"
   }
  },
  {
   "kind": "spin360",
   "frames_count": 260,
   "frame_url_pattern": "https://360images.thenaturalsapphirecompany.com/stone/k11733/video360/k11733-video360-{NNN}.jpg"
  },
  {
   "kind": "scan_3d_srn",
   "url": "https://images.thenaturalsapphirecompany.com/stone/k11733/sarin/k11733_srn.srn"
  },
  {
   "kind": "model_3d_glb",
   "url": null,
   "generated_by": "procedural",
   "note": "generated from shape+mm+colour (not on NGC)"
  }
 ],
 "certificates": [
  {
   "lab": "In-house (NGC Gemstone Report)",
   "image": "https://images.thenaturalsapphirecompany.com/stone/k11733/cert/k11733_nsc_web.jpg?v=20260505231610"
  }
 ]
}
```

### Setting JS31
```json
{
 "products": {
  "kind": "setting",
  "public_code": "MG-JS31",
  "sku": "JS31",
  "category": "Ring Settings",
  "title": "Platinum 950 Solitaire Ring Setting",
  "availability": "made_to_order",
  "is_made_to_order": true,
  "ship_days_min": 21,
  "ship_days_max": 28,
  "dyo_enabled": true
 },
 "product_styles": [
  "Solitaire"
 ],
 "setting_specs": {
  "setting_type": "ring",
  "base_design_code": "JS31",
  "engraving_max_chars": 15,
  "supports_vedic": false,
  "ring_size_min": 3.0,
  "ring_size_max": 13.0,
  "ring_size_step": 0.25,
  "finishes": [
   "High Polish"
  ]
 },
 "setting_metal_variants": [
  {
   "metal_code": "PT",
   "metal_name": "Platinum 950",
   "is_default": true
  },
  {
   "metal_code": "W18",
   "metal_name": "18K White Gold",
   "is_default": false
  },
  {
   "metal_code": "W14",
   "metal_name": "14K White Gold",
   "is_default": false
  },
  {
   "metal_code": "W10",
   "metal_name": "10K White Gold",
   "is_default": false
  },
  {
   "metal_code": "SL",
   "metal_name": "Silver",
   "is_default": false
  },
  {
   "metal_code": "Y18",
   "metal_name": "18K Yellow Gold",
   "is_default": false
  },
  {
   "metal_code": "Y14",
   "metal_name": "14K Yellow Gold",
   "is_default": false
  },
  {
   "metal_code": "Y10",
   "metal_name": "10K Yellow Gold",
   "is_default": false
  },
  {
   "metal_code": "R18",
   "metal_name": "18K Rose Gold",
   "is_default": false
  },
  {
   "metal_code": "R14",
   "metal_name": "14K Rose Gold",
   "is_default": false
  },
  {
   "metal_code": "WY18",
   "metal_name": "18K White & Yellow",
   "is_default": false
  },
  {
   "metal_code": "WY14",
   "metal_name": "14K White & Yellow",
   "is_default": false
  },
  {
   "metal_code": "YW18",
   "metal_name": "18K Yellow & White",
   "is_default": false
  },
  {
   "metal_code": "YW14",
   "metal_name": "14K Yellow & White",
   "is_default": false
  }
 ],
 "setting_compatibility": [
  {
   "seat": "center",
   "stone_count": 1,
   "shape": "Round",
   "min_length_mm": 4.0,
   "max_length_mm": 12.0,
   "min_width_mm": 4.0,
   "max_width_mm": 12.0,
   "tolerance_mm": 0.3,
   "note": "NOT published by NGC — values must be entered by vendor/admin; NGC computes this server-side (/setting/match)"
  }
 ],
 "product_prices": [
  {
   "region": "GLOBAL",
   "currency": "USD",
   "variant": "PT",
   "list_price": 1157.0,
   "note": "base setting price; final DYO price computed with stone"
  }
 ],
 "product_media": [
  {
   "kind": "image",
   "sort": 1,
   "url": "https://images.thenaturalsapphirecompany.com/setting/js31/image/js31pt-ring-natural-gemstone-companies-platinum-950-view-01.jpg"
  },
  {
   "kind": "image",
   "sort": 2,
   "url": "https://images.thenaturalsapphirecompany.com/setting/js31/image/js31pt-ring-natural-gemstone-companies-platinum-950-view-02.jpg"
  },
  {
   "kind": "image",
   "sort": 3,
   "url": "https://images.thenaturalsapphirecompany.com/setting/js31/image/js31pt-ring-natural-gemstone-companies-platinum-950-view-03.jpg"
  },
  {
   "kind": "image",
   "sort": 4,
   "url": "https://images.thenaturalsapphirecompany.com/setting/js31/image/js31pt-ring-natural-gemstone-companies-platinum-950-view-04.jpg"
  },
  {
   "kind": "image",
   "sort": 5,
   "url": "https://images.thenaturalsapphirecompany.com/preview/82347/lifestyleimage/memo82347-1.jpg"
  },
  {
   "kind": "image",
   "sort": 6,
   "url": "https://images.thenaturalsapphirecompany.com/preview/87873/lifestyleimage/memo87873-1.jpg"
  },
  {
   "kind": "image",
   "sort": 7,
   "url": "https://images.thenaturalsapphirecompany.com/preview/68721/lifestyleimage/memo68721-1.jpg"
  },
  {
   "kind": "image",
   "sort": 8,
   "url": "https://images.thenaturalsapphirecompany.com/preview/78060/lifestyleimage/memo78060-1.jpg"
  },
  {
   "kind": "image",
   "sort": 9,
   "url": "https://images.thenaturalsapphirecompany.com/preview/68721/lifestyleimage/memo68721-2.jpg"
  },
  {
   "kind": "image",
   "sort": 10,
   "url": "https://images.thenaturalsapphirecompany.com/preview/82347/lifestyleimage/memo82347-2.jpg"
  },
  {
   "kind": "image",
   "sort": 11,
   "url": "https://images.thenaturalsapphirecompany.com/preview/87873/lifestyleimage/memo87873-2.jpg"
  },
  {
   "kind": "image",
   "sort": 12,
   "url": "https://images.thenaturalsapphirecompany.com/preview/82347/lifestyleimage/memo82347-3.jpg"
  },
  {
   "kind": "image",
   "sort": 13,
   "url": "https://images.thenaturalsapphirecompany.com/preview/87873/lifestyleimage/memo87873-3.jpg"
  },
  {
   "kind": "image",
   "sort": 14,
   "url": "https://images.thenaturalsapphirecompany.com/preview/82347/lifestyleimage/memo82347-4.jpg"
  },
  {
   "kind": "spin360",
   "frames_count": 600,
   "frame_url_pattern": "https://360images.thenaturalsapphirecompany.com/setting/js31/video360/js31pt-video360-{NNN}.jpg"
  },
  {
   "kind": "video",
   "title": "6.76ct Brazil Natural Bi Color Diamond",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": " Emerald",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": " Corals Ring",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "6.76ct Brazil Natural Bi Color Diamond",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": " Emerald",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "1.46ct Madagascar Natural Yellowish Green Chrysoberyl Ring",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "1.46ct Madagascar Natural Yellowish Green Chrysoberyl Ring",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "5.47ct Brazil Natural Lemon 308 Ring",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "5.47ct Brazil Natural Lemon 308 Ring",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "1.59ct Ceylon Natural Purple Spinel Ring",
   "is_past_creation": true
  },
  {
   "kind": "video",
   "title": "1.59ct Ceylon Natural Purple Spinel Ring",
   "is_past_creation": true
  },
  {
   "kind": "model_3d_glb",
   "generated_by": "procedural",
   "note": "setting template; NGC has contains3D=false"
  }
 ]
}
```
