# Silk & Stone Design System Specification
> **Brand & Atelier:** Maihan Gems  
> **Aesthetic Philosophy:** *Silk & Stone* — Geological Permanence Meets Haute Couture Grace  
> **Target Audiences:** High-Net-Worth Individuals (HNWI), collectors, bespoke luxury consumers across the UAE, GCC, and global markets  
> **Reference Stack:** React 18+, Tailwind CSS (v4/v3 compatible), Cormorant Garamond + Montserrat + JetBrains Mono  

---

## 1. Executive Summary & Design Philosophy

The **Silk & Stone** design system was engineered to bridge the emotional intimacy of high jewelry with the mathematical rigor of natural mineralogy. Rather than defaulting to generic SaaS aesthetics or ubiquitous "AI slop" (purple neon gradients, pill-shaped tags, thick asymmetrical borders, and arbitrary badges), *Silk & Stone* draws direct inspiration from the world's most prestigious luxury houses: Place Vendôme, Geneva high-watchmaking salons, and the sovereign jewelry quarters of Dubai.

### The Core Principles:
1. **Silk (Organic Grace & Tactility):** Soft, warm-white alabaster canvases (`#FAFAF8`), subtle brushed-gold reflections, generous typographic tracking, and airy negative space that gives high-ticket pieces room to breathe.
2. **Stone (Geological Precision & Permanence):** Razor-sharp hairline borders (`1px solid rgba(201, 168, 76, 0.15)`), balanced classical proportions, unboxed scientific metadata, and tabular figures for precise millimeter tolerances and carat weights.
3. **Zero-Pill Discipline:** Categories, statuses, gem cuts, and dimensions are rendered as clean, unboxed typography separated by quiet punctuation (`·`, `/`), never trapped in neon capsules or generic rounded tags.
4. **Anti-Cliché Restraint:** Strict ban on fake telemetry tickers, decorative pulsating green dots, comment headers (`// 01`), and multi-colored badge sandwiches. Every visual element has a functional purpose.

---

## 2. Design Tokens & Color Palette

The color system enforces the classical **60-30-10 rule**:
- **60% Canvas & Atmosphere:** Warm alabaster (`#FAFAF8`) and pure white cards (`#FFFFFF`).
- **30% Structure & Contrast:** Deep midnight navy (`#08121E`), espresso text (`#1A1A18`), warm slate text (`#4A4740`), and hairline gold borders.
- **10% High-Intent Accents:** Brushed champagne gold gradients reserved exclusively for primary interactive anchors, CTA buttons, and selected states.

### 2.1 Core Neutral & Metal Tokens

| Token Name | Hex Value | RGB / Alpha | Semantic Role | Tailwind Utility / CSS Var |
| :--- | :--- | :--- | :--- | :--- |
| **Warm Alabaster** | `#FAFAF8` | `rgb(250, 250, 248)` | Page background canvas, page backdrop | `bg-[#FAFAF8]`, `var(--warm-white)` |
| **Studio White** | `#FFFFFF` | `rgb(255, 255, 255)` | Structural card surfaces, modals, popovers | `bg-white` |
| **Deep Midnight** | `#08121E` | `rgb(8, 18, 30)` | Header accents, dark hero mode, footers | `bg-[#08121E]`, `var(--navy-deep)` |
| **Atelier Navy** | `#0D1B2A` | `rgb(13, 27, 42)` | Secondary dark contrast, dropdown backdrops | `bg-[#0D1B2A]`, `var(--navy)` |
| **Imperial Gold** | `#C9A84C` | `rgb(201, 168, 76)` | Primary brand metal, focused borders | `text-[#C9A84C]`, `var(--gold)` |
| **Gold Light** | `#E8C96A` | `rgb(232, 201, 106)` | Gradient highlight, brushed metal shimmer | `var(--gold-light)` |
| **Gold Dark** | `#8B6914` | `rgb(139, 105, 20)` | Gradient shadow, warm bronze depth | `var(--gold-dark)` |
| **Text Primary** | `#1A1A18` | `rgb(26, 26, 24)` | High-contrast headlines, primary prose | `text-[#1A1A18]`, `var(--text-primary)` |
| **Text Secondary** | `#4A4740` | `rgb(74, 71, 64)` | Body copy, descriptions, navigation links | `text-[#4A4740]`, `var(--text-secondary)` |
| **Text Muted** | `#8A867E` | `rgb(138, 134, 126)` | Micro-labels, dimensions, unboxed tags | `text-[#8A867E]`, `var(--text-muted)` |
| **Hairline Border** | `rgba(201,168,76,0.15)` | `rgba(201, 168, 76, 0.15)` | Luxury container outlines, divider rules | `border-[rgba(201,168,76,0.15)]` |
| **Subtle Divider** | `rgba(0,0,0,0.06)` | `rgba(0, 0, 0, 0.06)` | Internal card split lines, table row borders | `border-[rgba(0,0,0,0.06)]` |

### 2.2 Gemstone Accent Spectrum

Natural mineral accents provide rich color depth without polluting the primary brand canvas:

| Gemstone | Primary Hue | Deep Tone | Accent Light | Recommended Use |
| :--- | :--- | :--- | :--- | :--- |
| **Ceylon Sapphire** | `#1E3A8A` | `#0F172A` | `#3B82F6` | Royal blue filters, sapphire card indicators |
| **Burmese Ruby** | `#991B1B` | `#450A0A` | `#EF4444` | "Pigeon's blood" red accents, high-value highlights |
| **Colombian Emerald** | `#065F46` | `#022C22` | `#10B981` | Natural vivid green indicators, certificate seals |
| **Padparadscha** | `#EA580C` | `#7C2D12` | `#FB923C` | Rare sunset pink-orange accents, bridal highlights |
| **Canary Diamond** | `#D97706` | `#78350F` | `#FBBF24` | Vivid yellow sapphire / diamond highlights |
| **Paraíba Tourmaline**| `#0891B2` | `#164E63` | `#06B6D4` | Electric neon-cyan highlights |

---

## 3. Typography & Hierarchy

The typography pairs an **editorial serif** with a **geometric sans**, complemented by a **monospace tabular font** for scientific metrics.

### 3.1 Font Families

```html
<!-- Google Fonts Embed Code -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Montserrat:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

1. **Editorial Display:** `Cormorant Garamond, Georgia, serif`
   - *Role:* Headlines (H1–H3), hero titles, product names, italic accents, editorial pull quotes.
   - *Characteristics:* High contrast between thick and thin strokes, elegant calligraphic terminals, aristocratic dignity.
2. **Interface & Body:** `Montserrat, -apple-system, sans-serif`
   - *Role:* Body paragraphs, navigation links, button labels, uppercase eyebrows, form inputs.
   - *Characteristics:* Wide geometric proportions, legible at micro-sizes, modern architectural feel.
3. **Scientific & Tabular:** `JetBrains Mono, monospace` (with `font-variant-numeric: tabular-nums`)
   - *Role:* Carat weights (e.g., `4.21 ct`), millimeter measurements (`10.4 × 8.2 × 5.1 mm`), prices, SKU identifiers, GIA/GRS lab certificate codes.

### 3.2 Typographic Hierarchy Matrix

| Element | Font Family | Size | Weight | Tracking (Letter-spacing) | Line Height | Case & Style |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | Cormorant Garamond | `clamp(2.75rem, 5vw, 4.5rem)` | 500 | `-0.02em` | `1.05` | Title Case, `text-wrap: balance` |
| **H1 Section Title** | Cormorant Garamond | `2.25rem` – `3rem` (36–48px) | 500 | `-0.015em` | `1.15` | Title Case |
| **H2 Card / Feature**| Cormorant Garamond | `1.5rem` – `1.875rem` (24–30px)| 500 | `-0.01em` | `1.2` | Title Case |
| **H3 Subsection** | Cormorant Garamond | `1.25rem` – `1.375rem` (20–22px)| 600 | `0` | `1.3` | Title Case |
| **Uppercase Eyebrow**| Montserrat | `11px` (0.6875rem) | 600 | `+0.25em` (Widely tracked) | `1.0` | ALL-CAPS, `text-[#4A4740]` |
| **Body Large** | Montserrat | `16px` (1.0rem) | 400 | `+0.01em` | `1.8` | Sentence case |
| **Body Base** | Montserrat | `15px` (0.9375rem) | 400 | `+0.01em` | `1.8` | Sentence case, `text-[#4A4740]` |
| **Micro Metadata** | Montserrat | `12px` (0.75rem) | 500 | `+0.08em` | `1.4` | Unboxed, separated by `·` |
| **Button Label** | Montserrat | `11px` (0.6875rem) | 600 | `+0.2em` | `1.0` | ALL-CAPS, `whitespace-nowrap` |
| **Tabular Metrics**| JetBrains Mono | `13px` – `15px` | 500 | `0` | `1.0` | `tabular-nums` |

---

## 4. Spacing, Elevation & Spatial Math

### 4.1 Spatial Grid & Viewport Baseline
- **Baseline Viewport:** 1440px wide desktop.
- **Maximum Content Width:** `max-w-7xl` (1280px) or `max-w-6xl` (1152px) centered with `mx-auto`.
- **Horizontal Container Padding:** `px-6` (24px) on mobile, `lg:px-12` (48px) on desktop.
- **Vertical Section Rhythm:** `py-16` (64px) to `py-24` (96px) between major thematic chapters.

### 4.2 Elevation & Border Math
- **Single-Elevation Depth:** Avoid nesting cards within cards. Maximum one elevated surface per screen view.
- **Surface Contrast:** Background-to-card brightness delta is $\le 5\%$ (soft off-white `#FAFAF8` to crisp `#FFFFFF`).
- **Default Border Radius:** `12px` (`var(--radius)`).
- **Nested Radius Rule:** $r_{\text{inner}} = r_{\text{outer}} - \text{padding}$.
  - E.g., Card with $r = 12\text{px}$ and `p-3` (12px padding) contains an image container with $r = 0\text{px}$ or flush edge.
- **Signature Box Shadow:**
  ```css
  /* Resting State */
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.03);

  /* Hover State (Subtle Lift) */
  box-shadow: 0 30px 60px -15px rgba(139, 105, 20, 0.08);
  transform: translateY(-4px);
  ```

---

## 5. Component Catalog & Code Patterns

### 5.1 The 3-Zone Top Bar Navigation Contract
The top bar follows a strict one-row, three-zone contract:
`[Brand Wordmark]` — `[5 Single-Line Nav Links]` — `[Primary Action & Utility Icons]`

```tsx
<header className="sticky top-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[rgba(201,168,76,0.15)] transition-all">
  <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-8">
    
    {/* Zone 1: Single Brand Wordmark in Cormorant Garamond */}
    <a href="/" className="flex items-center gap-3 shrink-0 group">
      <span className="font-serif text-2xl lg:text-3xl font-medium tracking-tight text-[#1A1A18] group-hover:text-[#C9A84C] transition-colors whitespace-nowrap">
        CARATOZA
      </span>
      <span className="hidden sm:inline-block h-3 w-[1px] bg-[rgba(201,168,76,0.4)]" />
      <span className="hidden sm:inline-block font-sans text-[10px] tracking-[0.25em] uppercase text-[#8A867E]">
        Atelier
      </span>
    </a>

    {/* Zone 2: Exactly 5 Single-Line Navigation Links */}
    <nav className="hidden lg:flex items-center gap-8 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#4A4740]">
      <a href="#jewellery" className="hover:text-[#1A1A18] transition-colors whitespace-nowrap">Jewellery</a>
      <a href="#gemstones" className="hover:text-[#1A1A18] transition-colors whitespace-nowrap">Gemstones</a>
      <a href="#settings" className="hover:text-[#1A1A18] transition-colors whitespace-nowrap">Settings</a>
      <a href="#education" className="hover:text-[#1A1A18] transition-colors whitespace-nowrap">Education</a>
      <a href="#concierge" className="hover:text-[#1A1A18] transition-colors whitespace-nowrap">AI Concierge</a>
    </nav>

    {/* Zone 3: Primary Action & Direct Utilities */}
    <div className="flex items-center gap-4 shrink-0">
      <button className="px-5 py-2.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 hover:-translate-y-0.5 transition-all whitespace-nowrap cursor-pointer">
        Book Appointment
      </button>
    </div>
    
  </div>
</header>
```

### 5.2 Primary & Secondary Button Utilities

```css
/* Brushed Gold Button (Primary) */
.btn-primary {
  background: linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #8B6914 100%);
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  padding: 1rem 2.2rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px -2px rgba(201, 168, 76, 0.25);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -4px rgba(201, 168, 76, 0.35);
  filter: brightness(1.04);
}

/* Alabaster & Gold Outline Button (Secondary) */
.btn-secondary {
  background: #FFFFFF;
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: #1A1A18;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  padding: 1rem 2.2rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-secondary:hover {
  background: rgba(201, 168, 76, 0.04);
  border-color: #C9A84C;
  transform: translateY(-1px);
}
```

### 5.3 Luxury Gemstone / Product Card
Adheres strictly to the **Zero-Pill Rule**: no rounded badge tags over the image. Unboxed metadata with typographic separators.

```tsx
<article className="group bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] overflow-hidden transition-all duration-500 hover:border-[rgba(201,168,76,0.35)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(139,105,20,0.08)] flex flex-col">
  
  {/* Visual Media Slot (65% Height with Subtle Zoom) */}
  <div className="relative aspect-[4/3] bg-[#F7F7F5] overflow-hidden flex items-center justify-center p-6">
    <img
      src="/assets/gemstones/ceylon_sapphire.png"
      alt="3.42 ct Cushion Royal Blue Ceylon Sapphire"
      referrerPolicy="no-referrer"
      className="max-h-full max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
    />
    
    {/* Clean Unboxed Status Indicator (Top Right) */}
    <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A867E]">
      1-of-1 Vault
    </div>
  </div>

  {/* Card Content & Metadata */}
  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
    <div>
      {/* Eyebrow / Provenance */}
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A867E] block mb-1">
        Ceylon, Sri Lanka · Natural Unheated
      </span>

      {/* Title */}
      <h3 className="font-serif text-xl font-medium text-[#1A1A18] leading-tight group-hover:text-[#C9A84C] transition-colors">
        3.42 Carat Vivid Royal Blue Sapphire
      </h3>

      {/* Unboxed Metadata with Typographic Separators */}
      <div className="mt-2.5 flex items-center gap-2 text-[12px] text-[#4A4740]">
        <span>Cushion Cut</span>
        <span aria-hidden="true" className="text-[rgba(201,168,76,0.5)]">·</span>
        <span className="font-mono tabular-nums">9.12 × 7.84 mm</span>
        <span aria-hidden="true" className="text-[rgba(201,168,76,0.5)]">·</span>
        <span>GRS Certified</span>
      </div>
    </div>

    {/* Financial Value & Direct Action */}
    <div className="pt-3 border-t border-[rgba(0,0,0,0.05)] flex items-center justify-between">
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A867E] block">Price (Inc. VAT)</span>
        <span className="font-mono text-base font-semibold text-[#1A1A18] tabular-nums">
          AED 48,500
        </span>
      </div>

      <button className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C] group-hover:text-[#8B6914] flex items-center gap-1 transition-colors">
        Inquire <span aria-hidden="true">→</span>
      </button>
    </div>
  </div>
  
</article>
```

### 5.4 AI Gemologist Concierge Search Bar
An intelligent search and consultation bar with a gold accent rim and prompt suggestions:

```tsx
<div className="relative max-w-2xl mx-auto w-full">
  <div className="relative flex items-center bg-white rounded-[12px] border border-[rgba(201,168,76,0.25)] shadow-[0_10px_30px_-5px_rgba(201,168,76,0.08)] focus-within:border-[#C9A84C] focus-within:ring-2 focus-within:ring-[rgba(201,168,76,0.2)] transition-all">
    <div className="pl-4 text-[#C9A84C]">
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      placeholder="Ask our AI Gemologist: 'Show untreated 3ct emeralds under AED 50,000'..."
      className="w-full py-4 pl-3 pr-28 text-[14px] text-[#1A1A18] placeholder-[#8A867E] bg-transparent outline-none font-sans"
    />
    <button className="absolute right-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white bg-[#08121E] hover:bg-[#C9A84C] rounded-[8px] transition-colors">
      Ask Vault
    </button>
  </div>
</div>
```

---

## 6. Motion & Micro-Interactions

Luxury interfaces must never feel rushed, jerky, or hyperactive. All animations utilize a **decelerated cubic bezier settling curve**.

### 6.1 Motion Timing Curves

| Curve Type | Cubic Bezier | Typical Duration | Use Case |
| :--- | :--- | :--- | :--- |
| **Luxury Decelerate** | `cubic-bezier(0.16, 1, 0.3, 1)` | 400ms – 600ms | Drawers, modals, card expansion |
| **Micro Hover Lift** | `cubic-bezier(0.16, 1, 0.3, 1)` | 200ms – 300ms | Card hover lift (`translateY(-4px)`), button glow |
| **Page Fade In** | `cubic-bezier(0.16, 1, 0.3, 1)` | 1200ms – 1400ms | Hero typography and artwork on initial mount |

### 6.2 Compositor Performance Rule
- **Allowed Animated Properties:** `transform`, `opacity`, `filter`.
- **Prohibited Animated Properties:** Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` during scroll or hover triggers to prevent GPU layout reflows.

```css
/* Silk Fade-Up Keyframe */
@keyframes silkFadeUp {
  0% {
    opacity: 0;
    transform: translateY(24px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.silk-enter {
  animation: silkFadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

---

## 7. Complete Copy-Paste CSS Starter (`index.css`)

Drop this into your project's main stylesheet (Tailwind v3 or v4 compatible):

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Sovereign Luxury Palette */
    --gold: #C9A84C;
    --gold-light: #E8C96A;
    --gold-dark: #8B6914;
    --navy: #0D1B2A;
    --navy-deep: #08121E;
    --warm-white: #FAFAF8;
    
    /* Text Hierarchy */
    --text-primary: #1A1A18;
    --text-secondary: #4A4740;
    --text-muted: #8A867E;

    /* Typography */
    --font-serif: 'Cormorant Garamond', Georgia, serif;
    --font-sans: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    
    /* Global Radius */
    --radius: 12px;
  }

  body {
    font-family: var(--font-sans);
    background-color: var(--warm-white);
    color: var(--text-primary);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.8;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, .font-editorial {
    font-family: var(--font-serif);
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.15;
    text-wrap: balance;
  }
}

@layer utilities {
  /* Editorial Eyebrow */
  .eyebrow {
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: var(--text-secondary);
    line-height: 1;
    display: block;
  }

  /* Brushed Gold Text Gradient */
  .gold-gradient-text {
    background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 50%, var(--gold-dark) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Luxury Card Surface */
  .premium-card {
    background: #FFFFFF;
    border: 1px solid rgba(201, 168, 76, 0.12);
    border-radius: var(--radius);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .premium-card:hover {
    border-color: rgba(201, 168, 76, 0.35);
    box-shadow: 0 24px 48px -12px rgba(139, 105, 20, 0.08);
    transform: translateY(-3px);
  }

  /* Primary Button */
  .btn-primary {
    background: linear-gradient(135deg, var(--gold-light), var(--gold), var(--gold-dark));
    color: #FFFFFF;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    padding: 1rem 2rem;
    border-radius: var(--radius);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 4px 15px -2px rgba(201, 168, 76, 0.25);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -4px rgba(201, 168, 76, 0.35);
    filter: brightness(1.05);
  }

  /* Secondary Button */
  .btn-secondary {
    background: #FFFFFF;
    border: 1px solid rgba(201, 168, 76, 0.3);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    padding: 1rem 2rem;
    border-radius: var(--radius);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-secondary:hover {
    background: rgba(201, 168, 76, 0.04);
    border-color: var(--gold);
    transform: translateY(-1px);
  }

  /* Layout Container */
  .section-container {
    max-width: 80rem; /* 1280px */
    margin-left: auto;
    margin-right: auto;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}
```

---

## 8. How to Adapt This Design System for Other Projects

The *Silk & Stone* philosophy translates seamlessly across high-value luxury domains by swapping the primary metal tone and adjusting typographic flavor:

### 8.1 Fine Watchmaking & Horology (Geneva Haute Horlogerie)
- **Palette Shift:** Replace Warm Gold (`#C9A84C`) with **Rose Gold** (`#B76E79`) or **Titanium Platinum** (`#E5E7EB` / `#475569`).
- **Surface Shift:** Deep Charcoal `#121214` canvas with satin brushed metal dials.
- **Data Emphasis:** Highlight movement frequencies (`28,800 vph`), power reserves (`72 Hours`), and case thicknesses in `JetBrains Mono`.

### 8.2 Haute Parfumerie & Botanical Cosmetics
- **Palette Shift:** Replace Gold with **Warm Terracotta / Amber** (`#C27803`) or **Sage Botanical Green** (`#3B5349`).
- **Surface Shift:** French textured paper canvas (`#F7F5F0`).
- **Metadata:** Render olfactory pyramid notes (Top, Heart, Base) as unboxed inline typography with `·` dividers.

### 8.3 Bespoke Architecture & Interior Ateliers
- **Palette Shift:** Monochromatic limestone (`#EBE9E4`), travertine, and blackened bronze (`#262320`).
- **Typography:** Swap Montserrat for `Plus Jakarta Sans` or `Manrope` for structured Swiss architectural modernism.
- **Imagery:** Focus on wide-angle architectural framing and material swatches.

### 8.4 Contemporary Art Galleries & Sovereign Auction Houses
- **Palette Shift:** Minimalist pure stark white (`#FFFFFF`) or obsidian noir (`#0A0A0A`).
- **Focus:** 80% visual artwork space, 1-line provenance, auction estimates in clean tabular numerals.

---

## 9. Quality Assurance & Anti-Slop Audit Checklist

Before launching any screen using this design system, verify against this 10-point checklist:

- [ ] **No Pill Capsules on Metadata:** Are categories, dimensions, and tags rendered as clean unboxed text with `·` separators?
- [ ] **One Dominant Visual Anchor:** Does each viewport contain exactly one primary CTA and hero focal point?
- [ ] **Top Bar Simplicity:** Does the navigation header contain strictly 1 Brand wordmark, 4–5 single-line links, and 1 primary button?
- [ ] **No Mechanical Prefixes:** Are all headings free from `//`, `/* */`, `>_`, or UPPERCASE_SNAKE_CASE?
- [ ] **Tabular Numerals for Data:** Do prices, carats, millimeter dimensions, and metrics use `tabular-nums`?
- [ ] **WCAG AA Contrast Verified:** Does body text meet at least 4.5:1 contrast against `#FAFAF8` and `#FFFFFF`?
- [ ] **Single Elevation Depth:** Are cards free from nested inner-cards or thick colored left accent borders?
- [ ] **Smooth Settling Curves:** Do hover states and modals use `cubic-bezier(0.16, 1, 0.3, 1)`?
- [ ] **Single-Line Button Labels:** Are all button texts single-line (`whitespace-nowrap`) with zero awkward wrapping?
- [ ] **Consistent Radius Math:** Do nested elements satisfy $r_{\text{inner}} = r_{\text{outer}} - \text{padding}$?
