# naturalgemstones.com — how the features work

How I got this: SSR HTML + the embedded `window.__NUXT__` state on listing and product pages, the site's JS bundles (`/_nuxt/*.js`, saved in `js/`), and its public JSON API at `https://nxc-api.47thst.com/public/gemstone/…`. That's the same backend the site calls from the browser. No login was used. UI strings come from the embedded i18n bundle (`ui-strings-en.json`). Live probe results: `compat_study.json`, `api/*.json`.

## 0. Stack and URL patterns
- **Stack:** Nuxt 2 (Vue) SSR behind CloudFront and an AWS WAF challenge. Backend is a .NET API on `nxc-api.47thst.com`. Images are on `images.thenaturalsapphirecompany.com`, 360 frames on `360images.thenaturalsapphirecompany.com`, and videos on `phone-video.naturalgemstones.com`. It's the same platform as their sister sites (sapphires, emeralds, rubies), which is why ruby, sapphire and emerald aren't sold here.
- **Listing:**
  - `/<stone-slug>/` for loose stones, `/<stone-slug>-pairs/` for pairs, `/<stone-slug>-rings/` for rings with that stone.
  - `/<color>-gemstones/`, `/<color>-gemstone-pairs/` and `/<color>-gemstone-rings/` for the 15 colour categories.
  - Settings: `/gemstone-ring-settings/`, `/mens-gemstone-ring-settings/`, `/gemstone-earring-settings/`, `/gemstone-necklace-pendant-settings/`, `/gemstone-bracelet-settings/`.
  - Jewellery: `/gemstone-rings/` (a landing page) → `/all-gemstone-rings/` (the catalogue), plus `/gemstone-earrings/`, `/gemstone-necklaces-pendants/`, `/gemstone-bracelets-bangles/` and `/mens-gemstone-rings/`.
  - Paging is `?page=N`, 60 items per page.
  - Filters go in the query string, e.g. `?design-styles=109`. The SSR listing is pre-filtered by the slug (the "preset").
- **Product:**
  - Stones: `/<stone-slug>/<carat>ct-<origin-adj>-<shape>-<color>-<stone>-<id>/`, e.g. `/amethyst/1.00ct-african-heart-purple-amethyst-k11082/`.
  - Pairs: `/<stone>-pairs/<…>-pr<id>/`.
  - Settings: `/<settings-type>/<metal>-<style>-<type>-setting-<id><metalcode>/`, e.g. `/gemstone-ring-settings/platinum-950-solitaire-ring-setting-js31pt/`.
  - Jewellery: `/<jewelry-type>/<desc>-<shape>-<ct>ct-<metal>-j<id>/`.
  - Only the trailing ID matters. Any slug 301-redirects to the canonical URL (settings need the `-setting-<id><metal>` tail).
- **ID prefixes:** `K#####` loose stone, `PR#####` pair, `JS####` setting (one record per metal: id + metal code such as PT, W18, Y14, R14, SL), `J#####` finished stock jewellery, and `JS####<metal>-K#####` a pre-built design-your-own combo shown inside jewellery listings.
- **Breadcrumbs:** Home / Gemstones (`/natural-gemstones/`) / Loose Amethyst on listings, and Home / Ring Settings / <title> on products. Stored per product in `products.json → page.breadcrumbs`.
- **Category landing pages exist**, e.g. `/gemstone-rings/` and `/natural-gemstones/`. They carry a hero plus a grid of sub-categories by stone type and colour, then link into the catalogue. This is exactly the flow Furqan described.

## 1. Filters (left panel)
Each filter's values come from `POST /<type>/filters` with the current query, so only values that exist are shown and they narrow as you filter. Full raw value lists are in `api/gemstone_filters.json`, `api/gemstone_pairs_filters.json`, `api/setting_filters.json` and `api/jewelry_filters.json`, and per listing in `taxonomy_raw.json`.

| Listing | Filter (API key) | Type | Values |
|---|---|---|---|
| Loose stones and pairs | stoneCategories → stoneTypes / stoneSubType | multi-checkbox (tree) | 42 stone categories (pairs: 29) with sub-types |
| | caratRange (`weight`) | range slider + preset buckets | ≤1, 1–3, 3–5, 5–10, 10–30, 30–50, 50–100, 100+ ct (min/max 0.04–458.5) |
| | lengthRange / widthRange (mm) (`length`, `width`) | range sliders | 0.8–70.9 mm length |
| | stoneShapes (`shapes`) | icon checkboxes | Round, Oval, Cushion, Emerald Cut, Radiant, Asscher-Octagon, Pear, Bead, Drop, Fancy, Freeform, Heart, Marquise, Princess, Rough, Slice, Trillion, Various |
| | colorCategories (+ sub-filter colors) | swatches | 15 colour categories, each with fine colours |
| | intensity | checkbox | Dark, Vivid, Vivid (Electric/Neon), Vivid (Santa Maria), Intense, Medium, Light, Faint, Near Colorless, Colorless, N/A |
| | clarity | checkbox | Eye Clean, VVS, VS, SI, Included, Not Applicable |
| | cuttingStyles | checkbox | Faceted, Cabochon, Tablet, Carving, Cameo, Bead, Rough, Briolette, Tumbled, N/A |
| | enhancements | checkbox | No Enhancement, Heat Treated, Doublets, Dye Treated, Irradiated, Oil/Resin Treated, Smoke Treated, Vapor-Infused Coating |
| | stoneOrigins (`origins`) | checkbox | 43 countries/regions |
| | specialFeatures | checkbox (key id) | Cat's Eye (1), Star (3), Adularescence (4), Opalescence (6) |
| | labTypes | checkbox | AGL, AIG, AIGS, Bellerophon, C.Dunaigre, GAL, GIA, GIC, GRS, ICA, IGI, Lotus, Other |
| | priceRange (`price`) | range | $4–$460,390 |
| | availability | checkbox (key) | Ready to Ship (1), Ships in 2-4 Weeks (2) |
| | onSaleOnly | toggle | |
| Settings (ring/earring/pendant/bracelet) | metalTypes (`metals`) | checkbox (key) | Platinum 11, 18K W 5, 14K W 4, 10K W 6, Silver 12, 18K Y 8, 14K Y 7, 10K Y 3, 18K R 2, 14K R 1, 18K W&Y 16, 14K W&Y 13, 18K Y&W 24, 14K Y&W 21 |
| | centerStoneShapes | checkbox (key) | Round 21, Oval 14, Cushion 4, Emerald 5, Radiant 17, Asscher 1, Pear 15, Baguette (Tapered) 2, Bullet (Tapered) 3, Fancy 6, Heart 9, Marquise 12, Princess 16, Trillion 18 |
| | designStyles (`styles`, + sub-filter sideStoneShapes) | checkbox (key) | Accent Stones 31, Antique 32, Bezel 84, Celtic 105, Drops 89, Earring Jacket 121, Floral 90, Flush Set 113, Halo 30, Hidden Halo 122, Hoops 87, Lady Diana 86, Men's 83, Multi Stone 112, Pave 29, Solitaire 109, Studs 27, Three Stone 28, Two Stone (toi et moi) 119, Vedic 82, Wedding Set 33 |
| Jewellery | stoneCategories, caratRange, centerStoneShapes, colorCategories, metalTypes, styles (24 names incl. Tennis/Line, Tennis/Riviere, Bead), intensity, clarity (+ Flawless-IF, MB/LB blemish grades), cuttingStyles, enhancements (+ Sugar Treated, Polishing, Triplets), stoneOrigins, specialFeatures, labTypes, priceRange, availability | as above | see `api/jewelry_filters.json` |

The listing request is `POST /gemstone`, `/gemstone/pairs`, `/setting` or `/jewelry`, with a body of `{pageNumber, pageSize:60, calculateCount, previousPages, query:{preset, id, settingId|stoneId, shapes[], clarity[], intensity[], labColors[], labTypes[], colorCategories[], origins[], enhancements[], price[{min,max}], weight[{min,max}], width[], length[], cuttingStyles[], stoneTypes[], colors[], webCategory, onSaleOnly, sortBy, sortOrder}}`. Settings use `{category:'ring'|'earring'|'pendant'|'bracelet', stoneId, metals[], centerStoneShapes[], sideStoneShapes[], styles[keys]}`. Jewellery uses `{dataType, availability[], metals[], categories['Ring'|'Earring'|'Pendant'|'Necklace'|'Bracelet'|'Brooch'], styles[names], …}`.

## 2. Sorting
- **Options:** Featured First (default), New First, Price (Low→High / High→Low), Carat or Weight (Low→High / High→Low), and On Sale First.
- On Sale First is hidden on settings and band listings.
- The API sends these as `sortBy` plus `sortOrder`.

## 3. Listing card and quick view
- **Card:**
  - Thumbnail (`imagePath ?d=200x200`). On hover it plays the 360 spin (`behavior:'mouseover'`, with frames loaded progressively).
  - Shown fields: title, carat, shape, origin, price, and an on-sale badge with `saleName` and discount.
  - Shortcuts for favourite and compare.
- **Quick view:** a modal ("Quick view") with a gallery, key specs and add-to-cart, reachable from best-seller carousels and listings.
- **List and grid toggle:** `listView`.
- Infinite scroll plus paged URLs.

## 4. Product page, top to bottom (stone, from the rendered HTML)
1. Design-your-own stepper: 1 Choose your gemstone → 2 Choose your setting → 3 Review your design.
2. **Gallery tabs.**
   - Tabs: "Stone N" (photos, lifestyle shots, videos, 360) and "Reports N" (certificate/report, appraisal, 3D scan report).
   - "Open in fullscreen", with a counter like "1 of 14".
   - Gallery item types (`thumbnails[].type`): 1 = photo, 11 = lifestyle photo, 3 = "Gemstone Report" (in-house certificate image), 10 = "Gemstone Appraisal", 4 = "3D Scan Report" (Sarin). Lab reports such as GIA/GRS appear here when `labType` is set, sometimes with a `documentUrl` PDF.
   - `phoneVideos[]` are titled videos: "White Glove Close Up", "White Glove Video Demonstrating Actual Size" and "Hand Model Video Demonstrating Actual Size 1/2/3". Each has its own description, date and thumbnail, and comes in small, medium and full MP4.
   - 360 spin: 192–600 JPEG frames at `360images…/<folder>/<id>/video360/<id>-video360-NNN.jpg`. Settings use `<id><metal>`. Desktop requests `?d=600x600`, mobile `?d=365x365`. The viewer is canvas-based with drag, swing and auto-play.
   - `containsSarin` stones have a Sarin `.srn` 3D scan file. It's a real 3D scan in Sarin's proprietary format, not glTF.
   - Settings have `contains3D`/`threeDFilePath`, but it's empty on every captured setting.
3. **Status badge**, e.g. "check_circle This item is available", "…made to order", "…on hold", "…available to ship now". It comes from `itemStatus {status, color, description}`.
4. **Title**, e.g. "1.00 Ct. Purple Amethyst from Africa", then "Item ID: K11082".
5. **Ship info.**
   - "This loose stone is available to ship now / can ship within 1-3 business days…", or for settings "Est. Ship Date: November 3 - November 10" (computed from `productionTimeFrom/To` days).
   - Plus "Rush service may be available upon request".
6. **Policy badges:** 14 Day No Hassle Return Policy (with a tooltip) and Free shipping.
7. **Price.**
   - Stones and jewellery show a USD price (`price`, `discountPrice`, `bankWirePrice`), plus `localCurrency` for geo-IP currency display (symbol, rate, symbolFront).
   - Settings show "Price Calculated During Next Step / Where's the Price?", because the final price depends on the stone.
   - Pairs and stones also show "Per carat price".
8. **Options.**
   - Settings: Ring size (3.00–13.00 in 0.25 steps), Metal (14 options; each switches the setting's ID suffix, images and price), Finish (High Polish), Engraving (max `engravingLength` characters), side-stone options, prong type, Vedic toggle.
   - Jewellery: ring size and chain (`chainLength`, `chainIncluded`, e.g. "18" Chain Included").
9. **Calls to action.**
   - "Create Jewelry With This Stone" (when `dyoProcess` is true) or "Create Jewelry With This Setting".
   - "Add loose stone to cart" or "Add Pendant to cart".
   - "Take me back to compatible gemstones" (inside the design-your-own flow).
   - Add to favorites, Add to compare list, Share (email form or copy link), Ask a question.
   - Sold or held items get "Inquire About Item on Hold" and "Notify me".
10. **Trust block "Quality, Value & Heart":** 100% Natural Gemstones, Free Shipping Worldwide, 14 Day Return, Supports Local Charities, each with long text.
11. **"Product Details" spec table.** Every label with a "help" link is a tooltip to an education page.
    - Stone: Item ID, Dimensions (MM) L/W/H, Weight, Color, Color intensity, Clarity, Shape, Cut, Cutting style, Enhancements, Origin, Per carat price.
    - Jewellery: one column per stone group (center, side, diamonds), with Stone type, Quantity, Dimensions, Total weight, Color, Color intensity, Color grade, Clarity, Shape, Cut, Cutting style, Enhancements and Origin.
12. **"Product description":** long AI-style HTML copy, three to five paragraphs (`productDescription`).
13. "Watch our process" video, "Our Packaging — Beauty is in the details" (packaging tiers by price), and Education links.
14. **Mining partner highlight**, matched by origin (e.g. Mozambique / Fura Gems).
15. **"Custom Designs Created With This Setting/Stone".** This is a gallery of past customer creations (`pastCreation:true` media), with filters, from `customDesigns` and `/preview/dmto/*`.
16. **"Other Rings You May Like"** related items, "Our Customers Love Us" reviews (Google plus Verified Reviews widgets, third-party JS), and the footer.

There are no on-site star reviews per product. Reviews are site-level third-party widgets.

## 5. Compare
- No login needed. The list is kept in a Vuex store, with an anonymous `sessionId` (in `__NUXT__` state) and local storage.
- When logged in it syncs to `/account/comparelist`, and `/account/comparelist/merge` runs at login.
- One compare list per product type (stones, pairs, rings, earrings, pendants, settings, custom items…), so like is compared with like.
- **Share:** "Share my compare list" saves the list to Redis through `/account/anonymous-data`, which returns a hash, so the link opens the same list. There's also a "Copy link to this compare list" option.
- Prices refresh when opened (`comparePricesUpdated`).
- Setting prices show "Each piece of custom jewelry is uniquely crafted to match the stone you have selected…", because they can't be priced alone.

## 6. Favorites (wishlist)
Same mechanics as compare:
- Anonymous first, with server sync on login (`/account/wishlist`, `/merge`).
- Per-type buckets, including `customItems` (saved design-your-own designs: "Save this design to favorites").
- Shareable through "Share my wishlist" or a copy-link hash.
- The header shows a count of "Favorites N" and "Compare N".

## 7. Design Your Own and stone–setting compatibility
- **Flow:** start from a stone ("Create Jewelry With This Stone") or a setting ("Create Jewelry With This Setting").
  1. Choose gemstone
  2. Choose setting
  3. Review (rendered preview, final price from `/setting/price`, options)
  4. Cart
- The URL carries both IDs. The review page calls `POST /setting/match {settingId, metalCode, stoneId}`, which returns `true` or `false`.
- On `false` it shows "We're sorry, but the items you've selected are likely incompatible", with a "Custom Design Inquiry" form (name, email, phone, ring size, comments), or "Choose New Gemstone / Choose New Setting".
- **Filtering:** compatible lists are filtered server-side.
  - With a stone selected, `POST /setting {query:{category, stoneId}}` returns only settings that fit.
  - With a setting selected, `POST /gemstone {query:{settingId}}` filters stones.
- **The rules are not exposed.** No setting record carries an accepted shape or mm range in the public JSON; `/setting/metadata` has no size fields. My probe results (`compat_study.json`, 40 stones × 4 setting types) point to these rules:
  - **Shape-specific.** Fit is keyed on stone shape: a round stone matches about 2.7–3.5k ring rows and a heart about 0.5–0.8k.
  - **Size-banded.**
    - 0.4–5 ct stones match the most settings.
    - 10–30 ct stones drop to a few hundred (big solitaire, Men's, Celtic, Bezel, Two Stone).
    - 100 ct+ stones still match some rings (Solitaire, Bezel, Men's, Celtic, toi et moi) but no bracelets.
    - A 172 ct emerald cut matched 0 rings.
    - Bracelets only take small stones, under about 5 ct or 10 mm.
  - **Count-aware.** A single stone (K) matches 0 earring settings. Pairs (PR) match only earrings (90 for PR10171) and 0 rings or pendants. So earrings need a matched pair, and pairs are sold specifically for earrings.
  - **Inferred internal model:** each setting design has a centre-stone seat defined by shape plus a mm range (L×W). Their workshop resizes the head to the exact stone, which is why every setting says "made to order" and "Price Calculated During Next Step". A stone fits if its shape is in the setting's shape list and its L/W falls within the min/max range for that setting and category.
  - The `centerStoneShapes` filter and `/preview/filters/setting/<stoneId>` (it returns shapes, origins, designStyles, metalTypes and caratRange) confirm the shape and carat dimensions.
- **Matching pairs:** a pair record holds `stones[2]`, each with full specs, plus `totalWeight`, `maxWeightStone` and `pricePerCt`. The listing shows the combined weight.
- **Gemologist suggestions** (`gemologistSuggestions`) and "Ask a designer" (`/cart/ask-designer`), plus a wax-model fee option ("Should you choose to purchase from us within 30 days…").

## 8. Price display and money
- Base price is USD. There's an optional bank-wire discount price (`bankWirePrice`) and a sale price (`discountPrice`, `saleName`, `noDiscount`).
- Geo-IP local currency comes through `localCurrency` (countryCode, symbol, usdRate, localRate, currencyCode, symbolFront) and the `/account/currency` endpoint. Prices are converted for display only.
- **Extras:** financing through Affirm, Extend protection plans (`extendReferenceId`, `extendPlan`), US tax by `/cart/taxes`, and document fees above a price threshold (`documentPriceConfig`).

## 9. Hold, inquiry and showroom
- `itemStatus.status` values: 0 available, 4 on hold ("This item is on hold"), plus sold and out of stock.
- On hold, the page shows "Important Note: This item is currently On Hold…" and "Notify me" ("Please let me know when this item will be available").
- "Ask a question" opens a contact form. "Book showroom APPT" opens `/showroom/` with a form that lets the user pick items (stones, jewellery, pairs, bands, settings) to view in person.
- `interestCount` is shown as a social-proof count.

## 10. Quick search
`GET /search/<q>` returns grouped results: stones, jewellery, pairs, bands and settings.

## 11. What I couldn't get
- `/setting/match` rules are server-side only, so compatibility above is inferred from the probes.
- Google and Verified Reviews widgets, live chat ("consult47this"), and the Affirm and Extend widgets are third-party JS and weren't captured.
- "Custom Designs Created With This Setting" galleries load client-side through `/preview/dmto/*`. Only items marked `pastCreation` inside the product gallery were captured.
- "Other … You May Like" carousels are loaded client-side. The SSR HTML only has the heading.
