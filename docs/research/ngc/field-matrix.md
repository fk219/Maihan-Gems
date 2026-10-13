# Field matrix — naturalgemstones.com product data

Built from the live product API JSON (the exact data the Nuxt page renders server-side) for every captured product, plus the rendered "Product Details" table labels from the product pages.

Fill = share of captured products in that kind where the field is non-empty. Enums list every distinct value seen (capped at 40).

## stone (149 products)

Rendered "Product Details" labels on page: Item ID; Dimensions (MM): Length / Width / Height; Weight (x.xx Ct.); Color; Color intensity; Clarity; Shape; Cut; Cutting style; Enhancements; Origin; Per carat price; (+ Lab / Lab color / Star appearance when present)

| Field | Fill | Formats | Enum / examples |
|---|---|---|---|
| `bankWirePrice` | 1/149 | null:148, number:1 | 88218 |
| `category` | 149/149 | string:149 | Stone |
| `clarity` | 149/149 | string:149 | Very Slightly Included, Eye Clean, Very Very Slightly Included, Not Applicable, Slightly Included, Included |
| `color` | 149/149 | string:149 | e.g. Violetish Blue, Bi Color, Green, Purplish Red |
| `colorCategories` | 136/149 | list:149 | ["Green"], ["Blue"], ["Multi Color"], ["Red"], ["Pink"], ["Yellow"], ["White"], ["Yellow", "Green"], ["Red", "Orange"], ["Orange"], ["Blue", "Green"], ["Purple"], ["Green", "Brown"], ["Bi Color", "Multi Color"], ["Red", "Purple"], ["Yellow", "Brown"], ["Pink", "Purple"], ["Brown"], ["Pink", "Red"], ["Black"], ["Orange", "Brown"], ["Yellow", "Orange"], ["Grey"], ["Blue", "Purple"], ["Pink", "Orange"] |
| `colorIntensity` | 149/149 | string:149 | Intense, Medium, Vivid, Light, N/A, Faint, Near Colorless, Dark, Colorless, Vivid (Electric/Neon) |
| `containsSarin` | 149/149 | bool:149 | true, false |
| `containsVideo360` | 149/149 | bool:149 | true, false |
| `customDesigns` | 149/149 | bool:149 | false, true |
| `cut` | 149/149 | string:149 | Mixed Brilliant Cut, Cabochon, Emerald Cut, Radiant Cut, Asscher Cut, Trillion Cut, Sugar Loaf, Polished, Tablet, Princess Cut, Double Cabochon, Checkerboard Cut, Carving, Buff top, Fancy Cut |
| `cuttingStyle` | 149/149 | string:149 | Faceted, Cabochon, Tablet, Cameo, Carving |
| `discountPrice` | 0/149 | null:149 |  |
| `dyoProcess` | 149/149 | bool:149 | true, false |
| `enhancement` | 149/149 | string:149 | No Enhancement, Heat Treated, Dye Treated, Vapor-Infused Coating, Oil/Resin Treated, Smoke Treated |
| `estimatedShipDate` | 62/149 | string:62, null:87 | 2026-10-31 00:00:00 |
| `framesCount` | 149/149 | number:149 | 261, 260, 0, 222, 263, 262, 228, 250, 249, 254, 256, 268, 264, 255, 279, 259, 282, 267, 312, 233, 234, 283, 311, 211, 210, 299, 227, 308, 238, 539, 253, 265, 300, 269, 230, 241, 214, 277 |
| `gemologistSuggestions` | 149/149 | bool:149 | true, false |
| `height` | 149/149 | number:149 | e.g. 4.79, 4.96, 6.54, 4.11 |
| `id` | 149/149 | string:149 | e.g. K11733, K11736, K11304, K11321 |
| `interestCount` | 149/149 | number:149 | 0, 1, 2, 3, 4, 6, 5, 7, 12, 10 |
| `isFix` | 149/149 | bool:149 | false, true |
| `isStar` | 149/149 | bool:149 | false, true |
| `itemName` | 0/149 | empty-string:149 |  |
| `itemRealId` | 149/149 | string:149 | e.g. 253406, 253410, 251998, 252015 |
| `itemStatus` | 149/149 | dict:149 | e.g. {"status": 0, "color": 0, "description": "This item is available"}, {"status": 4, "color": 4, "description": "This item is on hold"} |
| `itemTypeId` | 149/149 | number:149 | 1 |
| `labColor` | 149/149 | string:149 | N/A |
| `labType` | 9/149 | null:140, string:9 | GIA, Other, GIA,GIA |
| `length` | 149/149 | number:149 | e.g. 6.44, 11.66, 7.89, 6.79 |
| `localCurrency` | 149/149 | dict:149 | (see media / description sections) |
| `noDiscount` | 149/149 | bool:149 | false, true |
| `origin` | 149/149 | string:149 | Brazil, Madagascar, Ceylon (Sri Lanka), Tanzania, Russia, Mozambique, Burma (Myanmar), Australia, Africa, Afghanistan, United States, West Africa, Malawi, Italy, USA, Nepal, India, South Africa, Ethiopia, Mexico, East Africa, Nigeria, Namibia |
| `phoneVideos` | 149/149 | list:149 | (see media / description sections) |
| `price` | 149/149 | number:149 | e.g. 314, 590, 200, 100 |
| `pricePerCt` | 149/149 | number:149 | e.g. 239.69, 239.84, 62.7, 64.52 |
| `productDescription` | 149/149 | string:149 | (see media / description sections) |
| `saleName` | 0/149 | empty-string:149 |  |
| `sarinPath` | 133/149 | string:133, empty-string:16 | e.g. https://images.thenaturalsapphirecompany.com/stone/k11733/sarin/k11733_srn.srn, https://images.thenaturalsapphirecompany.com/stone/k11736/sarin/k11736_srn.srn, https://images.thenaturalsapphirecompany |
| `shape` | 149/149 | string:149 | Oval, Cushion, Round, Pear, Emerald Cut, Radiant, Heart, Asscher - Octagon, Trillion, Freeform, Princess, Marquise |
| `starAppearance` | 1/149 | empty-string:148, string:1 | Strong2Ray |
| `stoneSubType` | 0/149 | null:149 |  |
| `stoneType` | 149/149 | string:149 | e.g. Tanzanite, Tourmaline, Chrome Tourmaline, Rubellite Tourmaline |
| `thumbnails` | 149/149 | list:149 | (see media / description sections) |
| `videoFileName` | 0/149 | empty-string:149 |  |
| `webCategory` | 149/149 | number:149 | 0 |
| `weight` | 149/149 | number:149 | e.g. 1.31, 2.46, 3.19, 1.55 |
| `width` | 149/149 | number:149 | e.g. 6.44, 7.17, 7.83, 6.76 |

Gallery item types seen (`thumbnails[].type`, title): 11 "Gemstone LifeStyle"×361, 3 "Gemstone Report"×159, 1 "None"×149, 10 "Gemstone Appraisal"×149, 4 "3D Scan Report"×132

Videos per product: {1: 1, 2: 3, 3: 24, 4: 29, 5: 69, 6: 19, 7: 1, 8: 3}
Main photos (type 1) per product: {1: 149}
360 spin frames: [210, 211, 214, 222, 227, 228, 230, 233, 234, 238, 241, 249, 250, 253, 254, 255, 256, 259, 260, 261, 262, 263, 264, 265, 267, 268, 269, 277, 279, 282]
Sarin 3D scan (.srn): 133/149; contains3D (settings): 0

### Per-subcategory differences

Fields present (non-empty) only in some subcategories of this kind:

- **Agate**: colorCategories, sarinPath
- **Alexandrite**: estimatedShipDate, sarinPath
- **Almandine Garnet**: colorCategories, labType, sarinPath
- **Amethyst**: colorCategories
- **Ametrine**: colorCategories, sarinPath
- **Andalusite**: colorCategories, estimatedShipDate, sarinPath
- **Andesine**: colorCategories, estimatedShipDate, sarinPath
- **Andradite Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Apatite**: colorCategories, sarinPath
- **Aquamarine**: colorCategories, sarinPath
- **Beryl**: colorCategories, sarinPath
- **Black Opal (Dark Opal)**: colorCategories, estimatedShipDate, labType, sarinPath
- **Bloodstone (Heliotrope)**: sarinPath
- **Boulder Opal (Ironstone Opal)**: colorCategories
- **Carnelian**: colorCategories, sarinPath
- **Chrome Diopside**: colorCategories, estimatedShipDate, sarinPath
- **Chrome Tourmaline**: colorCategories, sarinPath
- **Chrysoberyl**: colorCategories, sarinPath
- **Citrine**: colorCategories, sarinPath
- **Cobalt Spinel**: colorCategories, estimatedShipDate, sarinPath
- **Coral**: sarinPath
- **Crystal Opal (Jelly Opal)**: colorCategories, estimatedShipDate, sarinPath
- **Demantoid Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Diopside**: colorCategories, estimatedShipDate, sarinPath, starAppearance
- **Fire Opal (Flame Opal)**: colorCategories, estimatedShipDate, sarinPath
- **Fluorite**: colorCategories, estimatedShipDate, sarinPath
- **Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Goshenite**: colorCategories, estimatedShipDate, sarinPath
- **Grandidierite**: colorCategories, estimatedShipDate, sarinPath
- **Grossular Garnet**: colorCategories, sarinPath
- **Hauyne**: colorCategories, estimatedShipDate, sarinPath
- **Heliodor**: colorCategories, sarinPath
- **Hessonite Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Imperial Topaz**: colorCategories, estimatedShipDate, labType, sarinPath
- **Iolite**: colorCategories, estimatedShipDate, sarinPath
- **Jade**: colorCategories, sarinPath
- **Jeremejevite**: colorCategories, estimatedShipDate, labType, sarinPath
- **Kornerupine**: colorCategories, estimatedShipDate, sarinPath
- **Kunzite**: colorCategories, sarinPath
- **Kyanite**: colorCategories, sarinPath
- **Lapis**: colorCategories, sarinPath
- **Malachite**: colorCategories, sarinPath
- **Malaya Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Mali Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Moonstone**: colorCategories, estimatedShipDate, sarinPath
- **Morganite**: colorCategories, sarinPath
- **Onyx**: colorCategories, sarinPath
- **Paraiba Tourmaline**: bankWirePrice, colorCategories, labType, sarinPath
- **Peridot**: sarinPath
- **Phenakite**: colorCategories, estimatedShipDate, sarinPath
- **Prasiolite**: colorCategories, sarinPath
- **Precious Topaz**: colorCategories, sarinPath
- **Quartz**: sarinPath
- **Red Beryl**: colorCategories, estimatedShipDate, labType, sarinPath
- **Rhodochrosite**: colorCategories
- **Rhodolite Garnet**: colorCategories, sarinPath
- **Rhodonite**: colorCategories, estimatedShipDate, sarinPath
- **Rose Quartz**: colorCategories, estimatedShipDate
- **Rubellite Tourmaline**: colorCategories, sarinPath
- **Rutilated Quartz**: estimatedShipDate, sarinPath
- **Scapolite**: colorCategories, estimatedShipDate, sarinPath
- **Sinhalite**: colorCategories, estimatedShipDate, sarinPath
- **Smoky Quartz**: colorCategories, estimatedShipDate, sarinPath
- **Spessartite Garnet**: colorCategories, estimatedShipDate, sarinPath
- **Sphene (Titanite)**: colorCategories, estimatedShipDate, sarinPath
- **Spinel**: colorCategories, estimatedShipDate, sarinPath
- **Taaffeite**: colorCategories, estimatedShipDate, sarinPath
- **Tanzanite**: colorCategories, estimatedShipDate, sarinPath
- **Tiger's Eye**: colorCategories, sarinPath
- **Topaz**: colorCategories, sarinPath
- **Tourmaline**: colorCategories, estimatedShipDate, sarinPath
- **Tsavorite Garnet**: colorCategories, labType, sarinPath
- **Turquoise**: colorCategories, sarinPath
- **White Opal (Light Opal)**: colorCategories, sarinPath
- **Zircon**: colorCategories, sarinPath

Always present in every subcategory (36): category, clarity, color, colorIntensity, containsSarin, containsVideo360, customDesigns, cut, cuttingStyle, dyoProcess, enhancement, framesCount, gemologistSuggestions, height, id, interestCount, isFix, isStar, itemRealId, itemStatus, itemTypeId, labColor, length, localCurrency, noDiscount, origin, phoneVideos, price, pricePerCt, productDescription, shape, stoneType, thumbnails, webCategory, weight, width

## pair (106 products)

Rendered "Product Details" labels on page: Item ID; Per stone: Dimensions (MM), Weight, Color, Color intensity, Clarity, Shape, Cut, Cutting style, Enhancements, Origin; Total weight; Per carat price

| Field | Fill | Formats | Enum / examples |
|---|---|---|---|
| `bankWirePrice` | 1/106 | null:105, number:1 | 90766 |
| `category` | 106/106 | string:106 | Pair |
| `containsSarin` | 106/106 | bool:106 | true, false |
| `containsVideo360` | 106/106 | bool:106 | true, false |
| `customDesigns` | 106/106 | bool:106 | false, true |
| `discountPrice` | 106/106 | number:106 | e.g. 200.0, 140.0, 1778.0, 1008.0 |
| `dyoProcess` | 106/106 | bool:106 | true, false |
| `estimatedShipDate` | 23/106 | string:23, null:83 | 2026-10-31 00:00:00 |
| `framesCount` | 106/106 | number:106 | 260, 261, 0, 262, 259, 222, 243, 235, 239, 356, 250, 234, 263, 205, 245, 258, 224, 241, 227, 228 |
| `gemologistSuggestions` | 106/106 | bool:106 | true, false |
| `id` | 106/106 | string:106 | e.g. PR10171, PR10173, PR10795, PR10797 |
| `interestCount` | 106/106 | number:106 | 0, 1, 2, 3, 5, 4 |
| `isFix` | 106/106 | bool:106 | false, true |
| `itemRealId` | 106/106 | string:106 | e.g. 10034, 10036, 10658, 10660 |
| `itemStatus` | 106/106 | dict:106 | e.g. {"status": 0, "color": 0, "description": "This item is available"}, {"status": 4, "color": 4, "description": "This item is on hold"} |
| `itemTypeId` | 106/106 | number:106 | 2 |
| `localCurrency` | 106/106 | dict:106 | (see media / description sections) |
| `maxWeightStone.clarity` | 106/106 | string:106 | Very Very Slightly Included, Eye Clean, Very Slightly Included, Not Applicable, Slightly Included, Included |
| `maxWeightStone.color` | 106/106 | string:106 | Blue, Pink, Orange, Multi Color, Green, Yellow, Red, Yellowish Green, White, Purplish Red, Bluish Green, Greenish Blue, Bi Color, Brown, Violetish Blue, Peach, Purple, Green (Lime Green), Blue Flash, Golden Brown, Pinkish Red, Purplish Pink, Golden Yellow, Greenish Yellow, Green to Purple, Green to Pink, Pinkish Purple, Orangey Red, Orangish Red, Purplish Blue, Violet, Greyish Brown, Pinkish Orange, Orangish Yellow, Green with Red Spots |
| `maxWeightStone.colorCategories` | 95/106 | list:106 | ["Blue"], ["Pink"], ["Orange"], ["Yellow"], ["Multi Color"], ["Green"], ["Blue", "Green"], ["Red"], ["Yellow", "Green"], ["White"], ["Brown"], ["Red", "Purple"], ["Bi Color", "Multi Color"], ["Pink", "Purple"], ["Pink", "Orange", "Peach"], ["Purple"], ["Blue", "Purple"], ["Pink", "Red"], ["Red", "Orange"], ["Pink", "Orange"], ["Yellow", "Orange"] |
| `maxWeightStone.colorIntensity` | 106/106 | string:106 | Intense, Medium, Vivid, Light, N/A, Near Colorless, Colorless, Faint |
| `maxWeightStone.cut` | 106/106 | string:106 | Mixed Brilliant Cut, Cabochon, Checkerboard Cut, Emerald Cut, Tablet, Princess Cut, Radiant Cut, Trillion Cut, Asscher Cut, Drops |
| `maxWeightStone.cuttingStyle` | 106/106 | string:106 | Faceted, Cabochon, Tablet, Briolette |
| `maxWeightStone.enhancement` | 106/106 | string:106 | No Enhancement, Heat Treated, Dye Treated, Vapor-Infused Coating, Irradiated |
| `maxWeightStone.height` | 106/106 | number:106 | e.g. 3.9, 3.18, 4.33, 5.11 |
| `maxWeightStone.isStar` | 106/106 | bool:106 | false |
| `maxWeightStone.labColor` | 106/106 | string:106 | N/A |
| `maxWeightStone.labType` | 4/106 | empty-string:102, string:4 | Other, GIA, Other,Other |
| `maxWeightStone.length` | 106/106 | number:106 | e.g. 5.64, 4.8, 6.08, 9.01 |
| `maxWeightStone.origin` | 106/106 | string:106 | Brazil, Madagascar, Ceylon (Sri Lanka), Australia, Tanzania, Russia, Mozambique, Pakistan, Afghanistan, Burma (Myanmar), Namibia, South Africa, Nigeria, Italy, USA, Mexico, Africa, United States |
| `maxWeightStone.position` | 0/106 | empty-string:106 |  |
| `maxWeightStone.shape` | 106/106 | string:106 | Oval, Round, Cushion, Pear, Emerald Cut, Fancy, Trillion, Asscher - Octagon, Princess, Radiant, Marquise |
| `maxWeightStone.starAppearance` | 0/106 | empty-string:106 |  |
| `maxWeightStone.stoneSubType` | 0/106 | null:106 |  |
| `maxWeightStone.stoneType` | 106/106 | string:106 | e.g. Tanzanite, Tourmaline, Chrome Tourmaline, Rubellite Tourmaline |
| `maxWeightStone.weight` | 106/106 | number:106 | e.g. 1.02, 0.55, 1.22, 2.04 |
| `maxWeightStone.width` | 106/106 | number:106 | e.g. 5.63, 4.74, 6.07, 7.09 |
| `noDiscount` | 106/106 | bool:106 | false, true |
| `phoneVideos` | 106/106 | list:106 | (see media / description sections) |
| `price` | 106/106 | number:106 | e.g. 200, 140, 1778, 1008 |
| `pricePerCt` | 106/106 | number:106 | e.g. 104.17, 127.27, 750.21, 250.12 |
| `productDescription` | 106/106 | string:106 | (see media / description sections) |
| `saleName` | 0/106 | empty-string:106 |  |
| `sarinPath` | 103/106 | string:103, empty-string:3 | e.g. https://images.thenaturalsapphirecompany.com/stone/pr10171/sarin/pr10171-1_srn.srn, https://images.thenaturalsapphirecompany.com/stone/pr10173/sarin/pr10173-1_srn.srn, https://images.thenaturalsapphir |
| `stoneType` | 106/106 | string:106 | e.g. Tanzanite, Tourmaline, Chrome Tourmaline, Rubellite Tourmaline |
| `stones[].clarity` | 106/106 | string:106 | Eye Clean, Very Very Slightly Included, Very Slightly Included, Not Applicable, Slightly Included, Included |
| `stones[].color` | 106/106 | string:106 | Blue, Orange, Pink, Multi Color, Green, Yellow, Red, Yellowish Green, White, Purplish Red, Bluish Green, Greenish Blue, Bi Color, Brown, Violetish Blue, Peach, Purple, Green (Lime Green), Blue Flash, Golden Brown, Pinkish Red, Purplish Pink, Golden Yellow, Greenish Yellow, Green to Purple, Green to Pink, Pinkish Purple, Orangey Red, Orangish Red, Purplish Blue, Greyish Brown, Pinkish Orange, Orangish Yellow, Green with Red Spots |
| `stones[].colorCategories` | 95/106 | list:106 | ["Blue"], ["Orange"], ["Pink"], ["Yellow"], ["Multi Color"], ["Green"], ["Blue", "Green"], ["Red"], ["Yellow", "Green"], ["White"], ["Brown"], ["Red", "Purple"], ["Bi Color", "Multi Color"], ["Pink", "Purple"], ["Pink", "Orange", "Peach"], ["Purple"], ["Pink", "Red"], ["Red", "Orange"], ["Blue", "Purple"], ["Pink", "Orange"], ["Yellow", "Orange"] |
| `stones[].colorIntensity` | 106/106 | string:106 | Intense, Medium, Vivid, Light, N/A, Near Colorless, Colorless, Faint |
| `stones[].cut` | 106/106 | string:106 | Mixed Brilliant Cut, Cabochon, Checkerboard Cut, Emerald Cut, Tablet, Princess Cut, Radiant Cut, Trillion Cut, Asscher Cut, Drops |
| `stones[].cuttingStyle` | 106/106 | string:106 | Faceted, Cabochon, Tablet, Briolette |
| `stones[].enhancement` | 106/106 | string:106 | No Enhancement, Heat Treated, Dye Treated, Vapor-Infused Coating, Irradiated |
| `stones[].height` | 106/106 | number:106 | e.g. 3.9, 3.25, 4.33, 5.11 |
| `stones[].isStar` | 106/106 | bool:106 | false |
| `stones[].labColor` | 106/106 | string:106 | N/A |
| `stones[].labType` | 4/106 | empty-string:102, string:4 | Other, GIA, Other,Other |
| `stones[].length` | 106/106 | number:106 | e.g. 5.64, 4.97, 6.08, 9.01 |
| `stones[].origin` | 106/106 | string:106 | Brazil, Ceylon (Sri Lanka), Madagascar, Australia, Tanzania, Russia, Mozambique, Pakistan, Afghanistan, Burma (Myanmar), Namibia, South Africa, Mexico, Nigeria, Italy, USA, Africa, Unknown, United States |
| `stones[].position` | 0/106 | empty-string:106 |  |
| `stones[].shape` | 106/106 | string:106 | Oval, Round, Cushion, Pear, Emerald Cut, Fancy, Trillion, Asscher - Octagon, Princess, Radiant |
| `stones[].starAppearance` | 0/106 | empty-string:106 |  |
| `stones[].stoneSubType` | 0/106 | null:106 |  |
| `stones[].stoneType` | 106/106 | string:106 | e.g. Tanzanite, Tourmaline, Chrome Tourmaline, Rubellite Tourmaline |
| `stones[].weight` | 106/106 | number:106 | e.g. 1.02, 0.55, 1.22, 2.04 |
| `stones[].width` | 106/106 | number:106 | e.g. 5.63, 4.87, 6.07, 7.09 |
| `thumbnails` | 106/106 | list:106 | (see media / description sections) |
| `totalWeight` | 106/106 | number:106 | e.g. 1.92, 1.1, 2.37, 4.03 |
| `videoFileName` | 0/106 | empty-string:106 |  |
| `webCategory` | 106/106 | number:106 | 1 |

Gallery item types seen (`thumbnails[].type`, title): 11 "Gemstone LifeStyle"×231, 4 "3D Scan Report"×206, 3 "Gemstone Report"×110, 1 ""×106, 10 "Gemstone Appraisal"×105

Videos per product: {2: 4, 3: 21, 4: 37, 5: 37, 6: 6, 7: 1}
Main photos (type 1) per product: {1: 106}
360 spin frames: [205, 222, 224, 227, 228, 234, 235, 239, 241, 243, 245, 250, 258, 259, 260, 261, 262, 263, 356]
Sarin 3D scan (.srn): 103/106; contains3D (settings): 0

### Per-subcategory differences

Fields present (non-empty) only in some subcategories of this kind:

- **Agate Pairs**: maxWeightStone.colorCategories, maxWeightStone.labType, stones[].colorCategories, stones[].labType
- **Alexandrite Pairs**: estimatedShipDate
- **Almandine Garnet Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Amethyst Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Ametrine Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Apatite Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Aquamarine Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Beryl Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Black Opal (Dark Opal) Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Boulder Opal (Ironstone Opal) Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Carnelian Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Chrome Tourmaline Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Chrysoberyl Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Citrine Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Cobalt Spinel Pairs**: maxWeightStone.colorCategories, maxWeightStone.labType, stones[].colorCategories, stones[].labType
- **Coral Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Crystal Opal (Jelly Opal) Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Demantoid Garnet Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Fire Opal (Flame Opal) Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Garnet Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Goshenite Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Grandidierite Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Heliodor Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Hessonite Garnet Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Iolite Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Jade Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Kunzite Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Lapis Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Malachite Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Malaya Garnet Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Moonstone Pairs**: estimatedShipDate
- **Morganite Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Paraiba Tourmaline Pairs**: bankWirePrice, maxWeightStone.colorCategories, maxWeightStone.labType, stones[].colorCategories, stones[].labType
- **Phenakite Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Precious Topaz Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Quartz Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Red Beryl Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Rhodochrosite Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Rhodolite Garnet Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Rubellite Tourmaline Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Rutilated Quartz Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Smoky Quartz Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Spessartite Garnet Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Sphene (Titanite) Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Spinel Pairs**: estimatedShipDate, maxWeightStone.colorCategories, stones[].colorCategories
- **Tanzanite Pairs**: estimatedShipDate
- **Tiger's Eye Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Topaz Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Tourmaline Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Tsavorite Garnet Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Turquoise Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **White Opal (Light Opal) Pairs**: maxWeightStone.colorCategories, stones[].colorCategories
- **Zircon Pairs**: maxWeightStone.colorCategories, stones[].colorCategories

Always present in every subcategory (55): category, containsSarin, containsVideo360, customDesigns, discountPrice, dyoProcess, framesCount, gemologistSuggestions, id, interestCount, isFix, itemRealId, itemStatus, itemTypeId, localCurrency, maxWeightStone.clarity, maxWeightStone.color, maxWeightStone.colorIntensity, maxWeightStone.cut, maxWeightStone.cuttingStyle, maxWeightStone.enhancement, maxWeightStone.height, maxWeightStone.isStar, maxWeightStone.labColor, maxWeightStone.length, maxWeightStone.origin, maxWeightStone.shape, maxWeightStone.stoneType, maxWeightStone.weight, maxWeightStone.width, noDiscount, phoneVideos, price, pricePerCt, productDescription, sarinPath, stoneType, stones[].clarity, stones[].color, stones[].colorIntensity, stones[].cut, stones[].cuttingStyle, stones[].enhancement, stones[].height, stones[].isStar, stones[].labColor, stones[].length, stones[].origin, stones[].shape, stones[].stoneType, stones[].weight, stones[].width, thumbnails, totalWeight, webCategory

## setting (85 products)

Rendered "Product Details" labels on page: Item ID; Metal (select, 14 options); Ring size (select 3.00–13.00 step 0.25) for rings; Finish (High Polish …); Est. Ship Date (productionTimeFrom–To days); "Price Calculated During Next Step"

| Field | Fill | Formats | Enum / examples |
|---|---|---|---|
| `bankWirePrice` | 0/85 | null:85 |  |
| `category` | 85/85 | string:85 | Setting_Ring, Setting_Earring, Setting_Bracelet, Setting_Necklace, Setting_Pendant |
| `centerStoneId` | 0/85 | null:85 |  |
| `contains3D` | 85/85 | bool:85 | false |
| `containsVideo360` | 85/85 | bool:85 | true, false |
| `customDesigns` | 85/85 | bool:85 | true, false |
| `designer` | 0/85 | null:85 |  |
| `discountPrice` | 0/85 | null:85 |  |
| `engravingLength` | 85/85 | number:85 | 15, 0 |
| `extendReferenceId` | 0/85 | null:85 |  |
| `finish` | 85/85 | list:85 | e.g. [{"key": 64, "value": "High Polish"}], [{"key": 64, "value": "High Polish"}, {"key": 2, "value": "Satin Finish"}, {"key": 8, "value": "Wire Matte"}, {"key": 16, "value": "Cross Satin"}, {"key": 128, " |
| `framesCount` | 85/85 | number:85 | 600, 300, 0, 301 |
| `gemologistSuggestions` | 85/85 | bool:85 | true, false |
| `id` | 85/85 | string:85 | e.g. JS31, JS1124, JS1274, JS1018 |
| `initialData.engraving` | 0/85 | empty-string:85 |  |
| `initialData.prongTypeId` | 0/85 | null:85 |  |
| `initialData.ringSize` | 85/85 | number:85 | 6.0 |
| `initialData.ringWidth` | 0/85 | null:85 |  |
| `initialData.sideStone` | 0/85 | list:85 |  |
| `initialData.vedicSetting` | 85/85 | bool:85 | false |
| `itemRealId` | 85/85 | string:85 | e.g. 34, 974, 1120, 869 |
| `itemStatus` | 85/85 | dict:85 | e.g. {"status": 0, "color": 0, "description": "This item is made to order"} |
| `itemTypeId` | 85/85 | number:85 | 4 |
| `localCurrency` | 85/85 | dict:85 | (see media / description sections) |
| `metalName` | 85/85 | string:85 | Platinum 950, 18K White Gold, 14K White Gold |
| `metalTypeCode` | 85/85 | string:85 | PT, W18, W14 |
| `metalTypeId` | 85/85 | number:85 | 11, 5, 4 |
| `metalTypes` | 85/85 | list:85 | (see media / description sections) |
| `pavesWeight` | 0/85 | list:85 |  |
| `phoneVideos` | 26/85 | list:85 | (see media / description sections) |
| `previewRequest` | 0/85 | null:85 |  |
| `price` | 85/85 | number:85 | e.g. 1157.0, 1438.0, 1375.0, 1245.0 |
| `productDescription` | 0/85 | empty-string:85 | (see media / description sections) |
| `productionTimeFrom` | 85/85 | number:85 | 21, 14, 28, 7 |
| `productionTimeTo` | 85/85 | number:85 | 35, 28, 21 |
| `prongs` | 0/85 | list:85 |  |
| `sizes` | 85/85 | list:85 | (see media / description sections) |
| `styleNames` | 85/85 | list:85 | e.g. ["Solitaire"], ["Antique", "Solitaire"], ["Accent Stones"], ["Antique", "Wedding Set"] |
| `threeDFilePath` | 0/85 | empty-string:85 |  |
| `thumbnails` | 85/85 | list:85 | (see media / description sections) |
| `vedicSetting` | 85/85 | bool:85 | false, true |

Gallery item types seen (`thumbnails[].type`, title): 1 "None"×310, 11 "None"×87

Videos per product: {0: 59, 1: 3, 2: 15, 3: 5, 4: 2, 11: 1}
Main photos (type 1) per product: {3: 30, 4: 55}
360 spin frames: [300, 301, 600]
Sarin 3D scan (.srn): 0/85; contains3D (settings): 0

### Per-subcategory differences

Fields present (non-empty) only in some subcategories of this kind:

- **Bracelet Settings / Solitaire**: phoneVideos
- **Earring Settings / Antique**: phoneVideos
- **Earring Settings / Bezel**: phoneVideos
- **Earring Settings / Halo**: phoneVideos
- **Earring Settings / Studs**: phoneVideos
- **Necklace & Pendant Settings**: phoneVideos
- **Necklace & Pendant Settings / Accent Stones**: phoneVideos
- **Necklace & Pendant Settings / Bezel**: phoneVideos
- **Necklace & Pendant Settings / Halo**: phoneVideos
- **Necklace & Pendant Settings / Pave**: phoneVideos
- **Necklace & Pendant Settings / Solitaire**: phoneVideos
- **Necklace & Pendant Settings / Vedic**: phoneVideos
- **Ring Settings**: phoneVideos
- **Ring Settings / Accent Stones**: phoneVideos
- **Ring Settings / Bezel**: phoneVideos
- **Ring Settings / Celtic**: phoneVideos
- **Ring Settings / Floral**: phoneVideos
- **Ring Settings / Flush Set**: phoneVideos
- **Ring Settings / Pave**: phoneVideos
- **Ring Settings / Two Stone (toi et moi)**: phoneVideos
- **Ring Settings / Vedic**: phoneVideos
- **Ring Settings / Wedding Set**: phoneVideos

Always present in every subcategory (26): category, contains3D, containsVideo360, customDesigns, engravingLength, finish, framesCount, gemologistSuggestions, id, initialData.ringSize, initialData.vedicSetting, itemRealId, itemStatus, itemTypeId, localCurrency, metalName, metalTypeCode, metalTypeId, metalTypes, price, productionTimeFrom, productionTimeTo, sizes, styleNames, thumbnails, vedicSetting

## jewelry (82 products)

Rendered "Product Details" labels on page: Item ID; Stone type (one column per stone group: center + side stones + diamonds); Quantity; Dimensions (MM); Total weight; Color; Color intensity; Color grade (diamonds); Clarity; Shape; Cut; Cutting style; Enhancements; Origin; Metal; Chain length / chain included (pendants); Ring size (rings)

| Field | Fill | Formats | Enum / examples |
|---|---|---|---|
| `bankWirePrice` | 0/82 | null:82 |  |
| `category` | 82/82 | string:82 | Ring, Necklace, Earring, Pendant, Bracelet, Brooch |
| `centerStones[].clarity` | 82/82 | string:82 | Very Slightly Included, Eye Clean, Very Very Slightly Included, Slightly Included, Not Applicable |
| `centerStones[].color` | 82/82 | string:82 | Multi Color, Blue, Violet, Pink, Red, Greenish Blue, Black, Bluish Green, Green, Purple, Yellowish Green to Yellowish Brown, Salmon (Orange), Bluish Green to Reddish Purple, Green to Brown, Purplish Red, Green to Purple, Reddish Brown, Green (Lime Green), Salmon and White, White, Orangish Yellow, Orange, Brownish Red, Yellowish Green |
| `centerStones[].colorGrade` | 63/82 | string:63, empty-string:19 | N/A |
| `centerStones[].colorIntensity` | 82/82 | string:82 | Intense, Vivid, Medium, Light, N/A, Vivid (Electric/Neon), Near Colorless, Medium Intense |
| `centerStones[].cut` | 82/82 | string:82 | Mixed Brilliant Cut, Double Cabochon, Cabochon, Checkerboard Cut, Emerald Cut, Tablet, Radiant Cut, Step Cut, Asscher Cut, Fantasy Cut (3D), Baguette Cut, Polished, Princess Cut |
| `centerStones[].cuttingStyle` | 82/82 | string:82 | Faceted, Cabochon, Tablet, Carving |
| `centerStones[].enhancement` | 82/82 | string:82 | Heat Treated, No Enhancement, Doublets, Triplets, Sugar Treated, Standard, Irradiated |
| `centerStones[].height` | 82/82 | number:82 | e.g. 6.44, 3.5, 2.6, 5.35 |
| `centerStones[].labColor` | 38/82 | empty-string:44, string:38 | N/A |
| `centerStones[].labType` | 82/82 | string:82 | N/A, GIA, GIA,GUBELIN,GUBELIN,GUBELIN, AGL, IGI, GUBELIN,GUBELIN |
| `centerStones[].length` | 82/82 | number:82 | e.g. 11.54, 10.23, 7.6, 7.01 |
| `centerStones[].origin` | 81/82 | string:81, empty-string:1 | Tanzania, Brazil, Ethiopia, Ceylon (Sri Lanka), Mozambique, Unknown, Australia, Madagascar, Italy, Burma (Myanmar), Zambia, Cambodia, China, Nigeria |
| `centerStones[].qty` | 82/82 | number:82 | 1, 2, 4, 10, 3, 23, 26, 7, 5, 6, 168, 12, 13, 25, 9, 20 |
| `centerStones[].shape` | 82/82 | string:82 | Oval, Pear, Cushion, Round, Fancy, Trillion, Emerald Cut, Radiant, Asscher - Octagon, Heart, Baguette (Straight), Freeform, Princess |
| `centerStones[].starAppearance` | 0/82 | empty-string:82 |  |
| `centerStones[].stoneType` | 82/82 | string:82 | Tanzanite, Opal, Paraiba Tourmaline, Aquamarine, Tourmaline, Alexandrite, Black Opal (Dark Opal), Coral, Rhodolite Garnet, Peridot, Spinel, Amethyst, Sapphire, Citrine, Garnet, Onyx, White Opal (Light Opal), Red Beryl, Rubellite Tourmaline, Beryl, Emerald, Zircon, Turquoise, Topaz, Moonstone |
| `centerStones[].totalWeight` | 82/82 | number:82 | e.g. 4.47, 4.21, 0.86, 0.8 |
| `centerStones[].width` | 82/82 | number:82 | e.g. 9.6, 10.39, 5.7, 5.16 |
| `chainIncluded` | 82/82 | bool:82 | false, true |
| `chainLength` | 38/82 | null:44, number:38 | 18.0, 16.0, 15.0, 0.0, 17.0, 21.0, 20.0, 8.5, 18.5 |
| `colorCategories` | 75/82 | list:82 | ["Multi Color"], ["Blue"], ["Blue", "Purple"], ["Blue", "Green"], ["Red"], ["Pink"], ["Purple"], ["Black"], ["Red", "Brown"], ["Red", "Purple"], ["Green"], ["White"], ["Yellow"], ["Orange"], ["Yellow", "Green"] |
| `containsSarin` | 82/82 | bool:82 | false |
| `containsVideo360` | 82/82 | bool:82 | false, true |
| `discountPrice` | 82/82 | number:82 | e.g. 402500.0, 150000.0, 43400.0, 7122.0 |
| `engravingLength` | 82/82 | number:82 | 0, 15, 1 |
| `estimatedShipDate` | 6/82 | null:76, string:6 | 2026-10-16 00:00:00, 2026-10-27 00:00:00 |
| `extendPlan` | 0/82 | null:82 |  |
| `extendReferenceId` | 73/82 | null:9, string:73 | e.g. extend_bridal43400, extend_bridal7100, extend_bridal13200, extend_bridal11500 |
| `framesCount` | 82/82 | number:82 | 0, 360, 511, 502, 615, 522, 517, 516, 550, 314, 407, 280, 450, 259, 238, 277, 300, 248, 230, 210, 308, 192, 189, 288, 379, 301, 229, 287, 243, 241, 311, 184 |
| `gemologistSuggestions` | 82/82 | bool:82 | false, true |
| `id` | 82/82 | string:82 | e.g. J11524, J11584, J12187, J12028 |
| `initialData.engraving` | 0/82 | empty-string:82 |  |
| `initialData.prongTypeId` | 0/82 | null:82 |  |
| `initialData.ringSize` | 20/82 | number:20, null:62 | 6.5, 6.75, 6.0, 7.0, 6.25 |
| `initialData.ringWidth` | 0/82 | null:82 |  |
| `initialData.sideStone` | 0/82 | list:82 |  |
| `initialData.vedicSetting` | 82/82 | bool:82 | false |
| `interestCount` | 82/82 | number:82 | 0, 1, 2, 3, 4 |
| `isFix` | 82/82 | bool:82 | false, true |
| `itemRealId` | 82/82 | number:82 | e.g. 11508, 11568, 12171, 12012 |
| `itemStatus` | 82/82 | dict:82 | e.g. {"status": 0, "color": 0, "description": "This item is available to ship now"}, {"status": 4, "color": 4, "description": "This item is on hold"}, {"status": 2, "color": 2, "description": "Call for Sta |
| `itemTypeId` | 82/82 | number:82 | 3 |
| `length` | 82/82 | number:82 | 0.0, 9.0, 8.0, 36.13, 52.66, 26.15, 12.0, 42.3, 34.93, 28.3, 15.26, 37.0, 32.24, 33.04, 11.5, 10.0, 40.25, 32.72, 24.3, 23.0, 8.15, 18.08, 12.31, 19.84, 24.88, 40.0, 20.0, 24.6, 13.83, 19.61, 19.96, 9.76, 4.8, 5.2, 7.85, 42.0, 8.5 |
| `localCurrency` | 82/82 | dict:82 | (see media / description sections) |
| `metal.key` | 82/82 | number:82 | 7, 5, 4, 11, 8, 37, 24, 33, 1, 12, 16, 3 |
| `metal.value` | 82/82 | string:82 | 14K Yellow Gold, 18K White Gold, 14K White Gold, Platinum 950, 18K Yellow Gold, 22K Gold Plated Silver, 18K Yellow & White, Platinum 900, 14K Rose Gold, Silver, 18K White & Yellow, 10K Yellow Gold |
| `metalTypeCode` | 82/82 | string:82 | Y14, W18, W14, PT, Y18, GSL22, YW18, PT900, R14, SL, WY18, Y10 |
| `modelImages` | 0/82 | list:82 |  |
| `noDiscount` | 82/82 | bool:82 | false |
| `phoneVideos` | 82/82 | list:82 | (see media / description sections) |
| `price` | 82/82 | number:82 | e.g. 402500, 150000, 43400, 7122 |
| `productDescription` | 82/82 | string:82 | (see media / description sections) |
| `saleName` | 0/82 | empty-string:82 |  |
| `sarinPath` | 0/82 | empty-string:82 |  |
| `sideStones` | 0/82 | null:66, list:16 |  |
| `sideStones[].clarity` | 66/82 | string:66, null:16 | VS1 - Very Slightly Included, SI2 - Slightly Included, VS2 - Very Slightly Included, I2 - Included, Very Slightly Included, SI1 - Slightly Included, Eye Clean, Not Applicable, VVS2 - Very Very Slightly Included, VVS1 - Very Very Slightly Included |
| `sideStones[].color` | 66/82 | string:66, null:16 | White, Black, Green to Purple, Blue, Peach, Pink, Violet |
| `sideStones[].colorGrade` | 65/82 | string:65, null:16, empty-string:1 | F, H, N/A, I, G, M |
| `sideStones[].colorIntensity` | 66/82 | string:66, null:16 | N/A, Intense, F, Dark, Medium Intense, Colorless, Medium |
| `sideStones[].cut` | 66/82 | string:66, null:16 | Brilliant Cut, Mixed Brilliant Cut, Cabochon, Fancy Cut, French Cut, Step Cut, Baguette Cut, N/A, Princess Cut |
| `sideStones[].cuttingStyle` | 66/82 | string:66, null:16 | Faceted, Cabochon |
| `sideStones[].enhancement` | 66/82 | string:66, null:16 | No Enhancement, Heat Treated |
| `sideStones[].height` | 66/82 | number:66, null:16 | 0.6, 0.5, 1.0, 0.65, 0.55, 0.8, 0.75, 2.0, 1.2, 0.4, 1.5, 1.7, 2.3, 2.18, 0.45, 0.25, 1.93, 1.6, 1.88, 1.35, 0.7, 2.5, 2.2, 2.15, 0.85, 3.5 |
| `sideStones[].labColor` | 20/82 | empty-string:46, string:20, null:16 | N/A |
| `sideStones[].labType` | 66/82 | string:66, null:16 | N/A, GIA, GIA,GUBELIN,GUBELIN,GUBELIN, AGL, IGI, GUBELIN,GUBELIN |
| `sideStones[].length` | 66/82 | number:66, null:16 | 1.0, 1.2, 1.5, 1.1, 1.3, 3.0, 3.5, 0.8, 4.0, 1.35, 0.5, 2.4, 6.0, 2.0, 2.66, 5.0, 1.7, 3.8, 4.8, 1.6, 4.54, 1.9 |
| `sideStones[].origin` | 65/82 | string:65, null:16, empty-string:1 | Unknown, Ceylon (Sri Lanka), Brazil, Mozambique, Pakistan, Tanzania |
| `sideStones[].qty` | 66/82 | number:66, null:16 | 2, 20, 16, 1, 6, 40, 8, 48, 52, 33, 14, 5, 18, 76, 22, 90, 12, 108, 100, 58, 43, 34, 36, 35, 3, 88, 11, 4, 38, 46, 27, 49, 260, 9, 26, 62, 25 |
| `sideStones[].shape` | 66/82 | string:66, null:16 | Round, Fancy, Oval, Pear, Hexagonal, Kite, Baguette (Straight), Princess |
| `sideStones[].starAppearance` | 0/82 | empty-string:66, null:16 |  |
| `sideStones[].stoneType` | 66/82 | string:66, null:16 | Natural Diamond, Onyx, Alexandrite, Paraiba Tourmaline, Tourmaline, Sapphire, Tanzanite |
| `sideStones[].totalWeight` | 66/82 | number:66, null:16 | e.g. 0.8, 0.16, 0.54, 0.3 |
| `sideStones[].width` | 66/82 | number:66, null:16 | 1.0, 1.2, 1.5, 1.1, 3.0, 1.3, 3.5, 0.8, 2.2, 1.35, 0.5, 2.4, 3.2, 3.1, 2.0, 2.64, 1.7, 1.6, 2.84, 1.9 |
| `sizes` | 82/82 | list:82 | (see media / description sections) |
| `stoneType` | 82/82 | string:82 | Tanzanite, Opal, Paraiba Tourmaline, Aquamarine, Tourmaline, Alexandrite, Peridot, Black Opal (Dark Opal), Amethyst, Coral, Rhodolite Garnet, Spinel, Citrine, Garnet, Onyx, White Opal (Light Opal), Red Beryl, Rubellite Tourmaline, Beryl, Zircon, Turquoise, Topaz |
| `styleNames` | 82/82 | list:82 | e.g. ["Three Stone"], ["Pave", "Halo", "Accent Stones", "Floral"], ["Pave", "Accent Stones", "Bezel", "Solitaire"], ["Pave", "Halo", "Accent Stones"] |
| `thumbnails` | 82/82 | list:82 | (see media / description sections) |
| `totalLength` | 32/82 | null:50, number:32 | 7.0, 18.0, 16.0, 15.0, 7.5, 17.0, 19.0, 22.5, 16.9, 8.9, 23.0, 10.0 |
| `videoFileName` | 0/82 | empty-string:82 |  |
| `webCategory` | 82/82 | number:82 | 0 |

Gallery item types seen (`thumbnails[].type`, title): 1 ""×293, 11 "Jewelry LifeStyle"×276, 3 "Jewelry Scan Report"×96, 10 "Jewelry Appraisal"×82, 31 "Jewelry Scan Report"×2

Videos per product: {3: 23, 4: 18, 5: 21, 6: 14, 7: 3, 9: 2, 10: 1}
Main photos (type 1) per product: {1: 1, 2: 7, 3: 18, 4: 56}
360 spin frames: [184, 189, 192, 210, 229, 230, 238, 241, 243, 248, 259, 277, 280, 287, 288, 300, 301, 308, 311, 314, 360, 379, 407, 450, 502, 511, 516, 517, 522, 550]
Sarin 3D scan (.srn): 0/82; contains3D (settings): 0

### Per-subcategory differences

Fields present (non-empty) only in some subcategories of this kind:

- **Bracelets & Bangles**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Bracelets & Bangles / Accent Stones**: centerStones[].labColor, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Bracelets & Bangles / Antique**: centerStones[].labColor, chainLength, colorCategories, extendReferenceId, totalLength
- **Bracelets & Bangles / Bezel**: centerStones[].labColor, chainLength, colorCategories, extendReferenceId, totalLength
- **Bracelets & Bangles / Halo**: centerStones[].colorGrade, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Bracelets & Bangles / Pave**: centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Bracelets & Bangles / Tennis/Line**: centerStones[].colorGrade, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Brooches**: centerStones[].colorGrade, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Accent Stones**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, estimatedShipDate, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Bezel**: centerStones[].labColor, colorCategories, extendReferenceId
- **Earrings / Drops**: centerStones[].colorGrade, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Earring Jacket**: centerStones[].colorGrade, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Halo**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Hoops**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Pave**: centerStones[].colorGrade, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Earrings / Studs**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, estimatedShipDate, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Accent Stones**: centerStones[].colorGrade, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Antique**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Bead**: centerStones[].colorGrade, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Bezel**: centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Halo**: centerStones[].colorGrade, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Multi Stone**: centerStones[].colorGrade, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Pave**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Solitaire**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width, totalLength
- **Necklaces / Tennis/Riviere**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, totalLength
- **Pendants**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Pendants / Accent Stones**: centerStones[].colorGrade, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Pendants / Bezel**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Pendants / Halo**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Pendants / Pave**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Pendants / Solitaire**: centerStones[].labColor, chainLength, colorCategories, estimatedShipDate, extendReferenceId, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Accent Stones**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Antique**: centerStones[].colorGrade, colorCategories, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Bezel**: centerStones[].colorGrade, colorCategories, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Floral**: centerStones[].colorGrade, colorCategories, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Halo**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Multi Stone**: centerStones[].colorGrade, estimatedShipDate, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Pave**: centerStones[].colorGrade, centerStones[].labColor, colorCategories, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Solitaire**: centerStones[].labColor, colorCategories, estimatedShipDate, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Three Stone**: centerStones[].colorGrade, centerStones[].labColor, chainLength, colorCategories, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labColor, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Two Stone (toi et moi)**: centerStones[].colorGrade, colorCategories, estimatedShipDate, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width
- **Rings / Wedding Set**: centerStones[].colorGrade, extendReferenceId, initialData.ringSize, sideStones[].clarity, sideStones[].color, sideStones[].colorGrade, sideStones[].colorIntensity, sideStones[].cut, sideStones[].cuttingStyle, sideStones[].enhancement, sideStones[].height, sideStones[].labType, sideStones[].length, sideStones[].origin, sideStones[].qty, sideStones[].shape, sideStones[].stoneType, sideStones[].totalWeight, sideStones[].width

Always present in every subcategory (44): category, centerStones[].clarity, centerStones[].color, centerStones[].colorIntensity, centerStones[].cut, centerStones[].cuttingStyle, centerStones[].enhancement, centerStones[].height, centerStones[].labType, centerStones[].length, centerStones[].origin, centerStones[].qty, centerStones[].shape, centerStones[].stoneType, centerStones[].totalWeight, centerStones[].width, chainIncluded, containsSarin, containsVideo360, discountPrice, engravingLength, framesCount, gemologistSuggestions, id, initialData.vedicSetting, interestCount, isFix, itemRealId, itemStatus, itemTypeId, length, localCurrency, metal.key, metal.value, metalTypeCode, noDiscount, phoneVideos, price, productDescription, sizes, stoneType, styleNames, thumbnails, webCategory
