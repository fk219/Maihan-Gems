# Minimalist White & Golden Cloud Homepage & Light Card Redesign

This plan transforms the Maihan Gems storefront below the hero video into a luminous white gallery accented with soft golden clouds, re-styles the unified full-bleed product cards into a light pearl-and-gold palette, and weaves in warm, editorial sections inspired by your references—crafted in our own signature **EB Garamond** and golden-cloud design language.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All choices below combine your confirmed preferences with original interpretations of the four section inspirations you shared.

- **Confirmed Theme — White Gallery with Golden Clouds**: Below the full-bleed hero video, the page uses a pure white gallery canvas layered with soft, atmospheric golden cloud gradients so the background feels airy, warm, and ready for your golden cloud artwork.
- **Confirmed Card Styling — Light-Colored Full-Bleed Cards**: Preserves the exact layout of your reference card (full-background photo, rounded corners, top category with gold line, top-right circular heart button, bottom gold line, title, `MATERIAL · CARAT`, price, and bottom-right circular arrow button) while shifting the card's overlays, borders, and text into a bright ivory-pearl and warm gold aesthetic.
- **Complete Homepage Flow (Incorporating Your New Section Inspirations)**:
  1. **Minimalist Trust Bar**: Free Insured Shipping, Certified Natural Stones, and Lifetime Care Plan.
  2. **Gemstone Category Marquee + Featured Loose Stones**: Smooth horizontal marquee of all 8 gemstone types (Tanzanite, Sapphire, Emerald, Ruby, Spinel, Tourmaline, Alexandrite, Tsavorite) followed by 6 featured loose gemstones in the light-colored card design.
  3. **Fine Jewelry — "Four Ways to Shop" & Featured Creations** *(Inspired by Reference 1)*: Editorial 4-category showcase (**Rings**, **Necklaces**, **Earrings**, **Custom Settings**) with quick sub-style tags (e.g., *Engagement · Solitaire · Cocktail*, *Pendants · Chains · Statement*, *Studs · Matched Pairs · Drops*) alongside our signature light-colored product cards.
  4. **Design Your Own Jewelry — Simple 3-Step Visual Banner**: Clear 3-step visual walkthrough (*1. Pick a Gemstone → 2. Choose a Setting → 3. Handcrafted for You*) with interactive links into the custom builder.
  5. **The AI Gemologist — "Expert Guidance, Anytime"** *(Inspired by Reference 2)*: Reimagined in our white-and-gold glass style with a clear headline, primary action button, and **3 everyday pillars** (*1. Tell it what you want*, *2. Compare stones side by side*, *3. See it in 3D & custom mounts*) plus one-click starter questions.
  6. **Client Stories — "Chosen by Thoughtful Buyers"** *(Inspired by Reference 3)*: Three honest, conversational buyer stories about asking questions, understanding natural stone details, and previewing ring sizes before buying.
  7. **Private Showroom & Gemologist Call — "Still Deciding? Talk to a Gemologist."** *(Inspired by Reference 4)*: A warm bronze-and-gold closing banner inviting shoppers to book a relaxed, no-pressure 15-minute video call or visit our Geneva, New York, or London showrooms.

---

## 1. Overview & Core Concept

- **What It Does**: Delivers a serene, editorial luxury jewelry homepage that pairs a dramatic full-screen hero video with a bright white-and-golden-cloud gallery below—guiding visitors naturally from loose gemstones and fine jewelry to custom ring creation, AI guidance, real buyer stories, and personal consultations.
- **Target Audience**: Jewelry shoppers and gemstone collectors who appreciate honest, plain-English explanations, transparent pricing, and effortless browsing.
- **Key Value**: Unifies the entire website around light-colored full-bleed product cards and warm, human storytelling without copying stock templates or using complicated gemological jargon.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Aesthetic Direction**: Airy Haute Joaillerie Gallery — crisp white surfaces (`#FFFFFF` and `#FAF8F4`), soft golden cloud radial washes (`rgba(212, 175, 55, 0.10)` to `rgba(230, 201, 122, 0.18)`), champagne gold borders (`#E5D5B5`), and deep charcoal ink (`#181613`).
- **Light-Colored Product Card Architecture**:
  - **Full-Bleed Image Stage**: The jewelry or gemstone photo covers 100% of the card background (`aspect-[3/4]`, `rounded-[24px]`).
  - **Luminous Pearl Veil Scrims**: Replaces dark black gradients with a soft warm-ivory top veil (`from-[#FAF8F4]/85 via-[#FAF8F4]/35 to-transparent`) and a creamy pearl bottom gradient (`from-[#FAF8F4]/95 via-[#FAF8F4]/80 to-transparent`) so the full photo remains vivid while dark text is 100% legible.
  - **Typography & Accents**: Warm bronze-gold (`#9A7B2C`) uppercase category label and accent lines, deep charcoal (`#181613`) **EB Garamond** title and price, and frosted white circular action buttons (`bg-white/80 hover:bg-[#D4AF37]`) for the wishlist heart and add-to-bag arrow.

### Adapted Section Inspirations (Original Maihan Gems Interpretation)
- **Fine Jewelry "Four Ways In" Grid**: Uses our light-colored full-bleed card aesthetic paired with subtle champagne-gold sub-category tags (*Solitaire*, *Halo*, *Pendants*, *Studs*, *Drops*) so visitors can jump directly to the exact style they want.
- **AI Gemologist 3-Pillar Showcase**: Framed inside a luminous golden-cloud pearl panel with custom gold icon badges and three plain-English columns explaining how the assistant matches budgets, explains stone quality simply, and previews 3D settings.
- **Client Voices Editorial Cards**: Three clean, border-lit ivory cards with subtle gold quote accents, sharing specific stories from real gemstone and custom ring buyers.
- **Warm Bronze-Gold Consultation Banner**: A rich, warm golden-bronze closing section with **EB Garamond** display typography, offering both a 15-minute live video stone viewing and in-person showroom appointments.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Luminous Pearl Scrims on Full-Bleed Cards**
  - *Chosen Approach*: Keep the full-background photo covering 100% of the card and apply soft ivory-pearl top and bottom gradient veils with dark charcoal and gold typography.
  - *Why*: Preserves your exact reference card layout while transforming the cards from dark black to a light, airy look that matches the white and golden-cloud homepage.
- **Decision 2: Original Styling for Inspired Sections**
  - *Chosen Approach*: Re-interpret the editorial structure and plain-English warmth of your four screenshots using our rounded `[24px]` pearl frames, golden cloud gradients, and **EB Garamond** typography rather than copying the flat beige boxes from the screenshots.
  - *Why*: Ensures every section feels native to Maihan Gems and visually unified with your product cards.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                   Storefront Shell (EB Garamond + Plain English)          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Two-Row Transparent Navbar (Currency/Language Dropdowns + MegaMenu) │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
│                                     ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Section 1: Full-Screen Hero Video (Stacked Behind Navbar at top: 0) │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
│                                     ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ White Gallery Canvas with Soft Golden Cloud Background Layers       │  │
│  │                                                                     │  │
│  │  ├─► Section 2: Minimalist Trust Bar                                │  │
│  │  │     (Free Insured Shipping · Certified Stones · Lifetime Care)   │  │
│  │  │                                                                  │  │
│  │  ├─► Section 3: Gemstone Category Marquee + Loose Gemstones Grid    │  │
│  │  │     (Infinite Marquee of 8 Gem Types + 6 Light ProductCards)     │  │
│  │  │                                                                  │  │
│  │  ├─► Section 4: Fine Jewelry — "Four Ways to Shop" + Featured Cards │  │
│  │  │     (Rings · Necklaces · Earrings · Settings + Style Tag Pills)  │  │
│  │  │                                                                  │  │
│  │  ├─► Section 5: Design Your Own Jewelry (3-Step Visual Banner)      │  │
│  │  │     (1. Pick Stone -> 2. Pick Setting -> 3. Handcrafted for You) │  │
│  │  │                                                                  │  │
│  │  ├─► Section 6: AI Gemologist — "Expert Guidance, Anytime"          │  │
│  │  │     (3 Plain-English Pillars + Quick Starter Prompts -> /concierge)│
│  │  │                                                                  │  │
│  │  ├─► Section 7: Client Voices — "Chosen by Thoughtful Buyers"       │  │
│  │  │     (3 Honest Buyer Stories on Stone Quality, Sizing & Trust)    │  │
│  │  │                                                                  │  │
│  │  └─► Section 8: Warm Bronze-Gold Consultation & Showroom Banner     │  │
│  │        ("Still Deciding? Talk to a Gemologist" + Book Appointment)  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Light-Colored `ProductCard` Component**:
  - Uses global currency formatting (`USD`, `AED`, `BHAT`) from `StorefrontProvider`.
  - Top-right frosted button toggles wishlist (`favorites`); bottom-right frosted arrow button adds to bag (`addToCart`) and opens `CartDrawer`.
- **Gemstone Marquee & Category Gateways**:
  - Marquee items route to `/varieties/[slug]`; Fine Jewelry category cards and sub-tag pills route to `/browse`, `/pairs`, `/settings`, and `/jewellery`.
- **3-Step Custom Ring Banner & AI Gemologist Pillars**:
  - Step cards link to `/design-your-own?step=stone|setting|review`; AI Gemologist CTA and prompt chips route to `/concierge` with pre-populated queries; Consultation banner routes to `/contact` and `/showrooms`.
