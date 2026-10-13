# Maihan Gems Storefront - Quick Start Guide

## 🎯 What's Been Built

A **premium luxury gemstone and jewelry storefront** with:

### ✅ Complete Features
- **Multi-vendor schema** (products, variants, pricing, inventory)
- **75+ seed products** (gemstones, jewelry, settings)
- **5 core pages** (Home, Browse, Product Detail, Cart, DYO)
- **Silk & Stone design system** throughout
- **TypeScript builds** passing
- **Multi-currency support** (AED, THB, USD)

### 🚧 Requires Database Connection
All pages currently use **placeholder data**. To see real data:

## 🚀 Quick Setup (5 Minutes)

### Option A: Local PostgreSQL

```bash
# 1. Start Postgres (repo compose — port 5433)
docker compose up -d

# 2. Set environment variable
export DATABASE_URL="postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev"

# 3. Storefront schema + seed (do NOT use migrate.js for storefront-only dev)
cd /workspace
pnpm install
pnpm storefront:db:setup

# 4. Start dev server
pnpm dev
```

### Option B: Neon (Recommended)

```bash
# 1. Create Neon project at https://neon.tech
# 2. Copy DATABASE_URL from dashboard
export DATABASE_URL="postgresql://...@...neon.tech/..."

# 3. Storefront schema + seed
pnpm install
pnpm storefront:db:setup

# 4. Start dev server
pnpm dev
```

## 📂 Project Structure

```
apps/web/
  src/app/
    (storefront)/
      page.tsx              ← Home page
      browse/page.tsx       ← Search & filter
      product/[slug]/       ← Product detail
      cart/page.tsx         ← Shopping cart
      design-your-own/      ← DYO configurator

packages/db/
  migrations/
    ../storefront-migrations/0019_storefront_schema.sql
  src/seed/
    storefront-seed.ts            ← 75+ products
    run-storefront-seed.ts        ← Seed script

Design.md                  ← Silk & Stone design system
STOREFRONT_STATUS.md       ← Detailed status
```

## 🎨 Design System

### Fonts
- **Cormorant Garamond** - Headings
- **Montserrat** - Body text
- **JetBrains Mono** - Numbers/prices

### Colors
- Warm Alabaster: `#FAFAF8`
- Imperial Gold: `#C9A84C`
- Deep Navy: `#08121E`

### Components
```tsx
// Luxury Card
<div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6
  hover:border-[rgba(201,168,76,0.35)] hover:-translate-y-1 
  hover:shadow-[0_24px_48px_-12px_rgba(139,105,20,0.08)] transition-all">
  ...
</div>

// Primary Button
<button className="px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase 
  text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] 
  rounded-[12px] hover:brightness-105 transition-all">
  Add to Cart
</button>
```

## 📊 Database Schema Highlights

### Products Table
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id),
  kind product_type, -- gemstone, jewelry, setting
  sku TEXT NOT NULL,
  slug TEXT UNIQUE,
  title TEXT,
  pricing_mode TEXT, -- fixed, per_carat, on_request
  base_currency CHAR(3),
  status TEXT,
  ...
);
```

### Multi-Currency Pricing
```sql
-- Regions
AE → AED (5% VAT, inclusive)
TH → THB (7% VAT)
GLOBAL → USD

-- FX Rates with daily updates
CREATE TABLE fx_rates (
  base CHAR(3),
  quote CHAR(3),
  rate NUMERIC(18,8),
  ...
);

-- Regional Price Overrides
CREATE TABLE product_prices (
  variant_id UUID,
  region_code TEXT, -- NULL = base price
  amount NUMERIC(12,2),
  ...
);
```

### Setting Compatibility (DYO)
```sql
CREATE TABLE setting_accepts (
  setting_product_id UUID,
  shape TEXT,
  min_carat NUMERIC(8,3),
  max_carat NUMERIC(8,3),
  ...
);
```

## 🔄 Development Workflow

### Build & Type Check
```bash
pnpm build      # TypeScript compilation
pnpm typecheck  # Type checking only
pnpm lint       # ESLint
```

### Database Operations
```bash
# Run migrations
node packages/db/dist/migrate.js

# Seed data
node packages/db/dist/seed/run-storefront-seed.js

# Verify schema
pnpm --filter @maihan/db run schema-fidelity
```

### Dev Server
```bash
pnpm dev                    # All apps
pnpm --filter @maihan/web dev  # Web only
```

## 📸 What It Looks Like

### Home Page
- Hero with integrated search
- Curated gemstone collections (4-up grid)
- Master settings showcase
- 3-step bespoke workflow
- Mineral variety navigation
- Integrity pillars

### Browse Page
- Left sidebar with filters
  - Stone type, shape, treatment
  - Price range
  - Carat weight
- Product grid (3-up)
- Luxury card hover effects
- Sorting & pagination

### Product Detail
- Large gallery with thumbnails
- Complete specifications table
- Per-carat pricing
- Certificate display
- Add to cart
- Related products

### Cart
- Item list with quantities
- Order summary (subtotal, VAT, total)
- Metal/size dropdowns
- Proceed to checkout

### Design Your Own
- 3-step wizard
- Setting selection grid
- Compatible gemstone grid
- Live preview (setting + stone overlay)
- Price calculator
- Metal & ring size selectors

## 🔗 Routes

- `/` - Home
- `/browse` - Search & browse
- `/browse?q=sapphire` - Search query
- `/product/{slug}` - Product detail
- `/cart` - Shopping cart
- `/design-your-own` - DYO configurator
- `/favorites` - Favorites (TODO)
- `/compare` - Compare (TODO)
- `/settings` - Settings browse (TODO)

## 🚫 Not Implemented Yet

Due to time constraints, these were **not** implemented:

1. **Virtual Try-On** - MediaPipe camera integration
2. **AI Search** - NL parsing, semantic search
3. **Favorites/Compare Pages** - UI not built (schema exists)
4. **Authentication** - No login/signup
5. **Checkout** - Payment integration stubbed
6. **Admin Panel** - No vendor management
7. **Real Product Images** - Using placeholder SVGs
8. **Inventory Sync** - Frontend doesn't query inventory table
9. **Geo-IP Detection** - Regional pricing logic exists but not wired
10. **End-to-End Tests** - No automated tests

## ⚡ Performance Notes

- All pages use `export const dynamic = 'force-dynamic'` for SSR
- Images are optimized SVGs (placeholder)
- Fonts are preconnected
- CSS-in-JS for theme variables
- No hydration mismatches

## 🐛 Known Issues

1. **No database connection** - Pages show placeholder data
2. **Placeholder images** - Need real product photography
3. **No auth** - Cart/favorites use session ID only
4. **Static FX rates** - Need daily update job
5. **No error boundaries** - Pages will crash on data errors
6. **No loading states** - Should add Suspense boundaries

## 📚 Further Reading

- **STOREFRONT_STATUS.md** - Detailed development status
- **Design.md** - Complete Silk & Stone design system
- **PROJECT_SOURCE_OF_TRUTH.md** - Original planning docs
- **AGENTS.md** - Project rules and architecture

## 🎯 Next Steps

1. **Connect database** (5 min)
2. **Wire up data queries** to replace placeholder data (2-3 hours)
3. **Add favorites/compare pages** (1-2 hours)
4. **Implement AI search** (4-6 hours)
5. **Add virtual try-on** (6-8 hours)
6. **Build checkout flow** (4-6 hours)
7. **End-to-end testing** (2-3 hours)
8. **Take screenshots** (30 min)

## 💡 Tips

- All commits are on `develop` branch
- Never `git add .` - use explicit paths (AGENTS.md rule)
- Build must pass before pushing
- Follow Silk & Stone design system
- No pill badges, no fake data, no lorem ipsum
- Use tabular numerals for prices (`font-mono`)
- Unboxed metadata with `·` separators
- One elevation depth per view

---

**Made with ❤️ following the Silk & Stone design philosophy**
