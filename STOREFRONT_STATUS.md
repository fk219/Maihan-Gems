# Maihan Gems Storefront - Development Status

**Date:** October 12, 2026  
**Branch:** `develop`  
**Status:** Schema & Core Pages Complete - Database Connection Required

## ✅ What Has Been Built

### 1. Database Schema (Migration 0019)
**Location:** `packages/db/migrations/0019_storefront_schema.sql`

- **Vendors table** with default 'Maihan' vendor
- **Unified products table** supporting 3 product kinds:
  - `gemstone` - loose stones and pairs
  - `jewelry` - finished jewelry pieces
  - `setting` - mountings for custom designs
- **Product details tables**:
  - `gemstone_details` - carat, shape, treatment, origin, etc.
  - `jewelry_details` - metal, ring size, chain length, etc.
  - `setting_details` - style, prong count, ring size range, etc.
- **setting_accepts** - compatibility rules for DYO
- **Product variants & options** - metal, size, etc.
- **Inventory tracking**
- **Multi-currency pricing**:
  - Regions table (AE=AED, TH=THB, GLOBAL=USD)
  - FX rates table with initial rates
  - Product prices with region overrides
- **Media & certificates**
- **Favorites, compare, cart** tables
- **DYO designs table**

**Dropped from original proposal:**
- Evidence/scraping columns (not needed for storefront)
- Import/staging tables (not needed for storefront)
- OCR tables (deferred)

### 2. Seed Data
**Location:** `packages/db/src/seed/`

- **storefront-seed.ts** - 40+ gemstones, 20 jewelry pieces, 15 settings with realistic data
- **run-storefront-seed.ts** - Script to insert seed data into database

**Gemstones include:**
- Sapphires (Ceylon, Kashmir, Padparadscha, Pink)
- Rubies (Burmese Pigeon's Blood, Mozambique)
- Emeralds (Colombian, Zambian)
- Paraíba Tourmalines
- Alexandrites, Spinels, Tanzanites
- Aquamarines, Morganites
- Garnets (Demantoid, Tsavorite, Spessartite)
- Diamonds (natural and lab-grown)
- Opals, Pearls, Moissanite
- Matched pairs for earrings

**Settings include:**
- Solitaire rings (4-prong, 6-prong)
- Halo and hidden halo settings
- Three-stone, bezel, tension settings
- Pendant and earring settings
- Each with compatibility rules (shape, carat range)

**Jewelry includes:**
- Rings, earrings, necklaces, bracelets
- Various metals (14K, 18K, Platinum)
- With gemstone details

### 3. Storefront Pages (Silk & Stone Design)
**Location:** `apps/web/src/app/(storefront)/`

#### Home Page (`page.tsx`)
- ✅ Hero section with search
- ✅ Curated gemstone collections
- ✅ Settings showcase
- ✅ Bespoke workflow steps
- ✅ Mineralogical discovery (variety & color navigation)
- ✅ Integrity pillars
- ✅ Marquee ticker with values
- ✅ Fully styled with Silk & Stone design system

#### Browse Page (`/browse/page.tsx`)
- ✅ Search bar with filters
- ✅ Sidebar filters (stone type, shape, treatment, price)
- ✅ Product grid with hover effects
- ✅ Sorting options
- ✅ Pagination
- ✅ Luxury card styling
- ✅ Currently uses placeholder data

#### Product Detail Page (`/product/[slug]/page.tsx`)
- ✅ Image gallery with thumbnails
- ✅ Product specifications table
- ✅ Price display (per item and per carat)
- ✅ Certificate information
- ✅ Add to cart button
- ✅ Breadcrumb navigation
- ✅ Related products section
- ✅ Premium typography and spacing

#### Shopping Cart (`/cart/page.tsx`)
- ✅ Cart items list with quantities
- ✅ Order summary with VAT calculation
- ✅ Remove item functionality
- ✅ Empty state
- ✅ Checkout button
- ✅ Continue shopping link

#### Design Your Own (`/design-your-own/page.tsx`)
- ✅ 3-step wizard UI
- ✅ Setting selection grid
- ✅ Gemstone selection (shows compatible stones)
- ✅ Live preview of setting + stone
- ✅ Price calculation
- ✅ Metal and ring size selectors
- ✅ Add to cart

### 4. Design System Applied
**Fonts:**
- Cormorant Garamond (serif, headings)
- Montserrat (sans, body)
- JetBrains Mono (mono, numbers)

**Colors:**
- Warm Alabaster (#FAFAF8)
- Studio White (#FFFFFF)
- Imperial Gold (#C9A84C)
- Deep Navy (#08121E)
- Text hierarchy

**Components:**
- Luxury cards with hairline borders
- Gold gradient buttons
- Hover lift effects
- Tabular numerals for prices
- Unboxed metadata with · separators
- Generous whitespace
- Premium shadows

### 5. TypeScript Fix
- ✅ Fixed build error in `cms-handlers.ts` (merged `allowRoleHeader` into request object)
- ✅ Build passes: `pnpm build` succeeds

## 🚧 What's Stubbed / Not Yet Implemented

### Database Connection
- **Status:** Schema created, seed data ready, but no DATABASE_URL configured
- **Action needed:** Set up Postgres database (local or Neon)
- **To run migrations:** 
  ```bash
  export DATABASE_URL="postgresql://..."
  pnpm --filter @maihan/db run migrate
  ```
- **To seed:**
  ```bash
  node packages/db/dist/seed/run-storefront-seed.js
  ```

### Features Not Implemented
1. **AI Search** - Natural language parsing, semantic search, fuzzy fallback
2. **Virtual Try-On** - MediaPipe camera integration
3. **Favorites & Compare** - Pages exist in schema but no UI pages
4. **Authentication** - No user login/signup (vendor_id defaults to Maihan)
5. **Checkout** - Payment integration stubbed
6. **Admin Panel** - No vendor management UI
7. **Image Upload** - Placeholder SVGs used
8. **Real-time Inventory** - Frontend doesn't connect to inventory table
9. **Regional Currency** - Logic exists but needs geo-IP detection
10. **Certificate Verification** - Display only, no verification workflow

### Pages Not Built
- `/favorites` - Favorites list
- `/compare` - Product comparison
- `/settings` - Settings browse page (similar to /browse)
- `/search` - AI-powered search page
- `/try-on` - Virtual try-on page
- `/checkout` - Checkout flow

## 📝 How to Run (Once Database is Connected)

### Prerequisites
1. Node.js 22+
2. pnpm
3. PostgreSQL 16 database

### Setup
```bash
# Install dependencies
pnpm install

# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Run migrations
cd packages/db
pnpm run migrate

# Seed data (optional)
node dist/seed/run-storefront-seed.js

# Start dev server
cd ../..
pnpm dev
```

### Environment Variables Needed
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional for AI features
OPENAI_API_KEY=sk-...
```

## 🎨 Design System Notes

All pages follow the **Silk & Stone** design philosophy from `Design.md`:
- **60%** Canvas: Warm Alabaster background
- **30%** Structure: Navy and text hierarchy
- **10%** Accents: Gold gradients for CTAs

**Key Rules:**
- No pill badges - use unboxed text with · separators
- Tabular numerals for all prices and measurements
- One elevation depth per view
- Luxury hover states with transform
- Wide tracking on uppercase labels

## 🚀 Next Steps (Priority Order)

1. **Connect Database**
   - Set up Neon/local Postgres
   - Run migrations
   - Run seed script
   - Test data display

2. **Complete Core Features**
   - Favorites page
   - Compare page
   - Settings browse page
   - Wire up database queries to replace placeholder data

3. **AI Search**
   - Natural language query parser
   - pgvector semantic search
   - pg_trgm fuzzy fallback
   - Chat interface

4. **Virtual Try-On**
   - MediaPipe Hands/Face integration
   - Overlay rendering
   - Photo upload fallback

5. **Checkout Flow**
   - Payment provider integration (Stripe/Tabby)
   - Order confirmation
   - Email notifications

6. **Testing & Polish**
   - End-to-end tests
   - Mobile responsiveness
   - Performance optimization
   - Screenshot artifacts

## 📊 Statistics

- **Schema Objects:** ~40 tables
- **Migrations:** 1 new (0019)
- **Seed Products:** 75+ items
- **Pages Built:** 5 core pages
- **Lines of Code:** ~2,000+ in storefront
- **Design System:** Fully applied
- **Build Status:** ✅ Passing

## 🐛 Known Issues

1. No database connection - all pages use placeholder data
2. Images are placeholder SVGs - need real product photography
3. No authentication - cart/favorites tied to session ID only
4. FX rates are static - need daily update job
5. Search doesn't connect to database
6. Compatibility checking in DYO is frontend-only
7. No error boundaries on pages
8. No loading states

## 💾 Git Status

**Branch:** `develop`  
**Commits:** 3 new commits
1. Schema and TypeScript fix
2. Seed data
3. Storefront pages

**All changes committed and pushed to develop.**

---

**Summary:** The foundation is complete with a working schema, seed data, and beautiful frontend pages. The main blocker is connecting to a database. Once DATABASE_URL is set, migrations can run, seed data can load, and the frontend can be wired to real data queries.
