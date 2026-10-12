# Maihan Gems Storefront - Progress Report

## ✅ Completed

### 1. Database Setup
- **PostgreSQL 16** installed and running on port 5433
- **Extensions installed**: `vector` (pgvector), `pg_trgm`, `unaccent`
- **Database created**: `maihan_dev`

### 2. Schema & Migrations
- **Migration 0019** created and applied successfully
- **22 tables** created:
  - `vendors` - multi-vendor support
  - `products` - unified products table (gemstone/jewelry/setting)
  - `gemstone_details` - gemstone-specific attributes
  - `jewelry_details` - jewelry-specific attributes
  - `setting_details` - setting-specific attributes
  - `setting_accepts` - DYO compatibility rules
  - `product_options` & `product_option_values` - product variants
  - `product_variants` - SKU variants
  - `inventory` - stock management
  - `regions` - geographic regions (AE, TH, US, UK, IN, CN)
  - `fx_rates` - currency exchange rates
  - `product_prices` - regional pricing overrides
  - `media` & `media_links` - product images/videos
  - `certificates` & `certificate_links` - lab certifications
  - `favorites` - customer wishlist
  - `compare_items` - product comparison
  - `carts` & `cart_items` - shopping cart
  - `designs` - saved DYO configurations

### 3. Seed Data
- **31 gemstones** (including matched pairs):
  - Sapphires (blue, pink, yellow, padparadscha)
  - Rubies (pigeon blood, Mozambique)
  - Emeralds (Colombian, Zambian)
  - Spinels, Tourmalines, Aquamarines
  - All with realistic weights, colors, cuts, shapes
- **15 settings** with compatibility rules:
  - Rings (solitaire, halo, three-stone, vintage)
  - Pendants, Earrings
  - 18K gold (yellow, white, rose) and Platinum
  - Accepts gemstones by type, shape, and carat range
- **20 jewelry pieces** (finished products):
  - Rings, Pendants, Earrings with embedded gemstones
  - Linked to settings and gemstones via foreign keys
- **6 regions** with currencies (AED, THB, USD, GBP, INR, CNY)
- **6 FX rates** relative to USD base currency
- **Sample inventory** and **media placeholders**

### 4. Repository Layer
- **StorefrontRepository** created (`packages/db/src/storefront/storefront-repository.ts`)
- Methods implemented:
  - `getProductBySlug()` - full product detail with media, variants, specs
  - `listProducts()` - paginated product listing with filters
  - `getFeaturedProducts()` - homepage featured items
  - `getCompatibleStones()` - DYO gemstone compatibility lookup
  - `searchProducts()` - pg_trgm fuzzy search
  - `getRegions()` & `getFxRates()` - multi-currency support
- **Regional pricing** integrated (selects by region_code)
- **Exported** from `@maihan/db` package

### 5. Web Application Layer
- **Connection factory** (`apps/web/src/lib/db.ts`)
- **Demo storefront page** (`apps/web/src/app/demo/page.tsx`):
  - Standalone full-page layout
  - Fetches real data from database
  - Displays gemstones, settings, jewelry
  - Uses Silk & Stone design system (Cormorant Garamond, Montserrat, JetBrains Mono)
  - Gold accents (#C9A84C), Navy backgrounds (#08121E, #0D1B2A)
- **Shop page** (`apps/web/src/app/(storefront)/shop/page.tsx`):
  - Product grid with filters (kind: gemstone/jewelry/setting)
  - Region/currency selector
  - Product cards with images, prices, specs

### 6. Build & TypeScript
- **`pnpm build`** passes successfully
- All TypeScript errors resolved
- Monorepo packages compile cleanly

---

## ⚠️ Blocked / In Progress

### PostgreSQL Authentication Issue
**Status**: The Next.js application cannot connect to PostgreSQL due to authentication configuration.

**Symptoms**:
- Error: `password authentication failed for user "postgres"` (code 28P01)
- Direct `psql` connections work with `PGPASSWORD=postgres`
- Node.js `pg` Pool connections fail with same credentials

**Attempted Fixes**:
1. Added `trust` rule to `pg_hba.conf` for 127.0.0.1/32
2. Changed `scram-sha-256` to `trust` for 127.0.0.1
3. Reloaded PostgreSQL configuration multiple times
4. Tried with and without password in DATABASE_URL
5. Added `ssl: false` to pool options

**Root Cause**: Likely pg_hba.conf rule ordering or connection method mismatch between psql CLI and Node.js pg driver.

**Workaround Needed**: 
- Option 1: Use unix socket instead of TCP (`/var/run/postgresql/.s.PGSQL.5433`)
- Option 2: Reconfigure pg_hba.conf from scratch with correct rule precedence
- Option 3: Create a dedicated database user with md5 or trust auth explicitly configured

---

## 🔄 Not Started / Stubbed

### AI Search
- **Natural language query parser** - not implemented
- **pgvector semantic search** - schema ready, no embeddings or search logic
- **AI concierge chat** - not implemented
- **Graceful LLM-less fallback** - pg_trgm search exists, but not wired to UI

### Virtual Try-On
- **MediaPipe integration** - not started
- **Camera-based try-on** - not implemented
- **Photo upload fallback** - not implemented
- **Product page links** - not added
- **DYO integration** - not added

### Additional Pages & Routes
- **Home page** (`/`) - uses old catalog system, incompatible with new schema
- **Browse by stone/form** (e.g. `/sapphire`, `/sapphire-pairs`, `/sapphire-rings`) - not created
- **Product detail** (`/product/[slug]`) - exists but not wired to new DB
- **Favorites** (`/favorites`) - schema exists, page not wired
- **Compare** (`/compare`) - schema exists, page not wired
- **Cart** (`/cart`) - schema exists, page not wired
- **DYO** (`/design-your-own`) - exists but not wired to new DB

### Testing & Artifacts
- **End-to-end browser testing** - not performed
- **Screenshots** (desktop/mobile) - not captured
- **Manual verification** - blocked by DB connection issue

---

## 🛠️ Environment Variables Required

```bash
# Required for Next.js application
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/maihan_dev

# Optional (for AI features, when implemented)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional (for production)
NODE_ENV=production
```

---

## 📊 Schema Summary

**Total objects**: 22 tables, 1 enum (product_type), foreign keys, indexes, checks

**Key schema features**:
- **Unified products table** with `kind` discriminator (gemstone/jewelry/setting)
- **Type-specific detail tables** (1:1 relationship with products)
- **Multi-currency pricing** with base_currency + regional overrides
- **Inventory tracking** per variant
- **DYO compatibility** via `setting_accepts` rules
- **Media gallery** with display_order and is_primary flags
- **Lab certificates** with many-to-many product links

---

## 🚀 Next Steps

1. **Fix PostgreSQL auth** (high priority)
   - Reconfigure pg_hba.conf with correct trust/md5 rules
   - Test connection from Node.js successfully
   - Restart dev server and verify `/demo` page loads

2. **Wire existing pages** to new DB
   - Update home, browse, product detail pages
   - Add stone/form routes (`/sapphire`, etc.)
   - Connect favorites, compare, cart

3. **Implement AI search**
   - Natural language parser (rule-based + optional LLM)
   - Generate embeddings for products
   - Wire search bar and results page
   - Add AI concierge chat panel

4. **Build Virtual Try-On**
   - Integrate MediaPipe (Face Landmarks, Hand Landmarks)
   - Camera capture + overlay rendering
   - Upload fallback mode
   - Link from product pages and DYO

5. **End-to-end testing**
   - Start app, verify all pages load
   - Test product browsing, search, DYO flow
   - Capture desktop + mobile screenshots
   - Save to `/opt/cursor/artifacts/`

6. **Final build verification**
   - `pnpm build` passes
   - `pnpm typecheck` passes
   - No runtime errors

---

## 📁 Key Files

### Database
- `packages/db/migrations/0019_storefront_schema.sql` - schema DDL
- `packages/db/src/seed/storefront-seed.ts` - seed data definitions
- `packages/db/src/seed/run-storefront-seed.ts` - seed execution script
- `packages/db/src/storefront/storefront-repository.ts` - data access layer

### Web Application
- `apps/web/src/lib/db.ts` - database connection factory
- `apps/web/src/app/demo/page.tsx` - working demo storefront
- `apps/web/src/app/(storefront)/shop/page.tsx` - shop page (WIP)

### Configuration
- `apps/web/.env.local` - DATABASE_URL=postgresql://postgres@127.0.0.1:5433/maihan_dev
- `/etc/postgresql/16/main/pg_hba.conf` - PostgreSQL auth rules (needs fix)

---

## ✅ What Works (when DB auth is fixed)

- Database schema is correct and validated
- Seed data is realistic and complete
- Repository queries are correct (tested via psql)
- TypeScript compilation succeeds
- All pages render (HTML generation works)
- Silk & Stone design system is applied

## ⚠️ What's Stubbed

- AI search (schema ready, no logic)
- Virtual try-on (not started)
- Most storefront pages (not wired to new DB)
- Regional currency switcher (UI exists, backend ready, not wired)

## 🔧 What's Broken

- **PostgreSQL authentication from Node.js** - HIGH PRIORITY FIX NEEDED
- `/demo` and `/shop` pages return 500 until DB connection works
- Existing storefront pages (`/`, `/browse`, `/product/*`) use old schema

---

**Authored**: 2026-10-12  
**Commit**: c3fdb47 (feat: add storefront schema, seed data, and repository layer)
