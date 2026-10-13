# naturalgemstones.com research package

Captured 13 Oct 2026 for the Maihan Gems rebuild. Source: the attached `ngc-research-docs.tgz`.

| File | Contents |
|---|---|
| `taxonomy.json` / `taxonomy.md` | Three roots (Gemstones / Settings / Jewellery), 82 stone types, pairs, 15 colour categories, setting and jewellery types |
| `products.json` | 443 captured products (149 loose, 106 pairs, 85 settings, 82 jewellery, 21 DYO composites) |
| `field-matrix.md` | Every PDP field and tab, by kind |
| `features.md` | Filters, URL patterns, DYO, compare, wishlist |
| `schema-proposal.md` | Postgres / Drizzle product core, stone_specs, media, prices, storefronts |
| `compat_study.json` | Stone × setting compatibility probes |
| `api/*filters*.json` | Live facet value lists |
| `ui-strings-en.json` | NGC English UI copy |

Runtime storefront reads the compiled slim files in `apps/web/src/data/` (`ngc-catalog.json`, `ngc-taxonomy.json`). Recompile with `node scripts/compile-ngc-catalog.mjs`.
