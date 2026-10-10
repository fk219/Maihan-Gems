# DESIGN SPECIFICATION & AI AGENT SYSTEM PROMPT
> **Instruction for AI Agents**: Refer to this document as the single source of truth when generating UI layouts, components, styles, and page architectures. Adhere strictly to the color tokens, alternating background cadence, typography hierarchy, and luxury micro-interactions defined below. Never generate flat, generic, or default bootstrap-like interfaces.

---

## 1. Core Visual Archetype & Brand Philosophy
- **Identity**: Private Wealth Advisory, Sovereign Commodity Trading & High-Asset Executive Portal.
- **Aesthetic DNA**: *"Swiss Private Banking precision combined with modern Dubai luxury"*.
- **Visual Pillars**:
  1. **High-Contrast Alternating Rhythm**: Strategic switching between deep obsidian navy and crisp ivory/white blocks.
  2. **Hairline Gold Precision**: 1px to 1.5px semi-transparent metallic gold borders (`rgba(201, 168, 76, 0.18)` to `0.40`).
  3. **Monospace Tabular Numerals**: Every monetary figure, ROI percent, and ledger value strictly uses `font-mono` with `tabular-nums lining-nums`.
  4. **Dynamic Specular Light**: Primary action buttons feature continuous 45° angled light sweep animations.
  5. **Restrained Status Feedback**: Statuses use low-opacity tinted chips with hairline borders, never aggressive solid alert banners.

---

## 2. The Signature Alternating Section Cadence

The website does **NOT** use a single monotonous dark or light background. Instead, it alternates between distinct dark, accent, and light tones to create an editorial, magazine-like storytelling flow.

### 2.1 The Cadence Sequence
When designing multi-section landing pages or marketing flows, apply this rhythm:

```
[1. Hero Section]            ──> Deep Obsidian Navy  (#08121E) with radial gold orbs
[2. Marquee Ticker]          ──> Solid Metallic Gold (#C9A84C) high-impact banner
[3. Showcase / Units]        ──> Dark Primary Navy   (#0D1B2A) with translucent glass cards
[4. Product / Deep Dive A]   ──> Split Hero + Crisp White (#FFFFFF) with dark typography
[5. Product / Deep Dive B]   ──> Split Hero + Crisp White (#FFFFFF) with dark typography
[6. Advisory Spotlight]      ──> Midnight Obsidian   (#080D19) high-focus dark contrast
[7. Interactive Tabs]        ──> Crisp White         (#FFFFFF) with Off-White tab pill bar
[8. Advantages / Why Us]     ──> Crisp White         (#FFFFFF) with light surface cards
[9. Leadership Team]         ──> Ivory Off-White     (#FAFAF8) warm editorial background
[10. Global Offices]         ──> Ivory Off-White     (#FAFAF8) with white cards & gold borders
[11. Contact / Enquiries]    ──> Deep Primary Navy   (#0D1B2A) with dark translucent forms
[12. Institutional Footer]   ──> Deepest Obsidian    (#08121E) with top gold hairline border
```

### 2.2 Text & Contrast Rules by Section Tone

| Background Tone | Background Class / Hex | Primary Text | Subtext / Muted | Accent / Eyebrow | Card Background |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Obsidian Deep** | `bg-[#08121E]` | `text-white` | `text-white/60` | `text-gold` (`#C9A84C`) | `bg-[#132234]/80` (Glass) |
| **Primary Navy** | `bg-[#0D1B2A]` | `text-white` | `text-white/70` | `text-gold` (`#C9A84C`) | `bg-white/[0.04]` border `gold/20` |
| **Midnight Navy** | `bg-[#080D19]` | `text-white` | `text-white/65` | `text-gold-light` (`#E8C96A`) | `bg-white/5` border `gold/20` |
| **Crisp White** | `bg-white` (`#FFFFFF`)| `text-[#0D1B2A]` (Navy)| `text-[#4A4740]` | `text-[#8B6914]` / `text-gold` | `bg-white` border `border-[#E8E4DC]` |
| **Ivory Off-White** | `bg-[#FAFAF8]` | `text-[#0D1B2A]` (Navy)| `text-[#4A4740]` | `text-[#8B6914]` / `text-gold` | `bg-white` border `border-[#E8E1CE]` |
| **Gold Banner** | `bg-gold` (`#C9A84C`) | `text-[#08121E]` (Dark)| `text-[#08121E]/80` | `text-[#08121E]` (Bold) | N/A (Banner strip) |

---

## 3. Color Palette Tokens

### 3.1 The Master Gold Palette
- **`--color-gold`**: `#C9A84C` (RGB: `201, 168, 76`) — Primary brand gold, button gradients, active icons.
- **`--color-gold-light`**: `#E8C96A` (RGB: `232, 201, 106`) — Hover highlights, gradient peaks, glowing strokes.
- **`--color-gold-dark`**: `#8B6914` (RGB: `139, 105, 20`) — Gradient tails, deep shadows, dark gold on light backgrounds.
- **`--color-gold-pale`**: `#F5E8C0` (RGB: `245, 232, 192`) — Subdued chip backgrounds in light theme.
- **`--color-gold-ultra`**: `#FBF5E6` (RGB: `251, 245, 230`) — Light-theme badge fills and pill backgrounds.

### 3.2 The Obsidian Navy Palette (Dark Theme)
- **`--color-navy-deep`**: `#08121E` (RGB: `8, 18, 30`) — Deepest base canvas, footers, modal backdrops.
- **`--color-navy`**: `#0D1B2A` (RGB: `13, 27, 42`) — Primary surfaces, sidebars, headers.
- **`--color-navy-mid`**: `#132234` (RGB: `19, 34, 52`) — Elevated cards, table headers, hover highlights.
- **`--color-navy-light`**: `#1C2E3F` (RGB: `28, 46, 63`) — Specular highlight gradient stop, active indicators.

### 3.3 The Ivory Champagne Palette (Light Theme)
- **`--portal-bg`**: `#F8FAFC` or `#FBF9F4` — Canvas background.
- **`--portal-surface`**: `#FFFFFF` — Elevated card panels.
- **`--portal-card-subtle`**: `#F1F5F9` — Inner panels, table header strips.
- **`--portal-border`**: `#E8E1CE` — Warm champagne hairline border.
- **`--portal-gold`**: `#B38E2E` — High-contrast gold calibrated for light surfaces.

### 3.4 Semantic Status Colors (Low-Opacity Rule)
- **Settled / Success**: Emerald `#34D399` ➔ `bg-emerald-400/10 text-emerald-300 border-emerald-400/25`
- **Pending / In Review**: Amber `#FBBF24` ➔ `bg-amber-400/10 text-amber-300 border-amber-400/25`
- **Critical / Overdue**: Rose `#FB7185` ➔ `bg-rose-400/10 text-rose-300 border-rose-400/25`
- **Advisory / Institutional**: Sky `#38BDF8` ➔ `bg-sky-400/10 text-sky-300 border-sky-400/25`

---

## 4. Typography Hierarchy & Rules

### 4.1 Fonts Setup
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### 4.2 Font Mapping
- **Display & Section Titles**: `'Cormorant Garamond', Georgia, serif`
  - Always rendered with `font-feature-settings: "lnum" 1, "tnum" 1`.
- **UI Headers, Buttons, Navigation**: `'Outfit', 'Montserrat', -apple-system, sans-serif`
  - Modern geometric balance.
- **Body & Editorial Copy**: `'Inter', -apple-system, sans-serif`
  - Line height `1.7` to `1.8`.
- **Financial Figures & Metrics**: `'JetBrains Mono', ui-monospace, monospace`
  - Always `tabular-nums lining-nums` for currency, ROI percentages, dates, and tables.

### 4.3 Typography Helper Classes
```css
/* 1. Section Eyebrow (Overline) */
.section-eyebrow {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-gold);
}

/* 2. Editorial Section Title */
.section-title {
  font-family: var(--font-serif);
  font-weight: 600;
  line-height: 1.2;
}

/* 3. Gold Metallic Gradient Text */
.text-gold-gradient {
  background: linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #8B6914 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 5. Master CSS Setup (`globals.css`)

Drop this into your project's global stylesheet (Tailwind CSS v4 or v3):

```css
@import "tailwindcss";

@theme {
  --color-gold: #c9a84c;
  --color-gold-light: #e8c96a;
  --color-gold-dark: #8b6914;
  --color-gold-pale: #f5e8c0;
  --color-gold-ultra: #fbf5e6;
  
  --color-navy: #0d1b2a;
  --color-navy-mid: #132234;
  --color-navy-light: #1c2e3f;
  --color-navy-deep: #08121e;

  --color-off-white: #fafaf8;
  --color-mid-grey: #e8e4dc;

  --font-serif: 'Cormorant Garamond', Georgia, serif;
  --font-sans: 'Outfit', 'Montserrat', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --shadow-gold: 0 10px 25px -5px rgba(201, 168, 76, 0.3), 0 8px 10px -6px rgba(201, 168, 76, 0.3);
  --shadow-gold-sm: 0 4px 14px rgba(201, 168, 76, 0.4);
}

/* ── Subtle Geometric Diamond Texture on Dark Canvas ── */
body {
  background-color: #0d1b2a;
  color: #ffffff;
  font-family: var(--font-sans);
  background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20L20 0Z' fill='none' stroke='%23ffffff' stroke-opacity='0.02' stroke-width='1'/%3E%3C/svg%3E");
}

/* ── Sleek 6px Gold Scrollbar ── */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(201, 168, 76, 0.3) transparent;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(201, 168, 76, 0.3);
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 168, 76, 0.6);
}

/* ── Specular Light Shimmer Animation ── */
@keyframes shimmer {
  0% { transform: translateX(-100%) rotate(45deg); }
  25%, 100% { transform: translateX(100%) rotate(45deg); }
}

/* ── Button Component Classes ── */
.btn-primary {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #c9a84c 0%, #e8c96a 50%, #c9a84c 100%);
  color: #08121e;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 0.75rem;
  padding: 0.625rem 1.25rem;
  box-shadow: 0 10px 25px -5px rgba(201, 168, 76, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}
.btn-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
  box-shadow: 0 14px 28px -5px rgba(201, 168, 76, 0.45);
}
.btn-primary::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: rotate(45deg);
  animation: shimmer 4s infinite;
  pointer-events: none;
}

.btn-outline {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 0.75rem;
  padding: 0.625rem 1.25rem;
  transition: all 0.3s ease;
}
.btn-outline:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(201, 168, 76, 0.6);
  transform: translateY(-2px);
}
```

---

## 6. Component Blueprints (Ready to Copy/Paste)

### 6.1 The Private Bank Luxury Metric Card
```tsx
import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, isPositive, icon }: MetricCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-2xl transition-all duration-300
      bg-[linear-gradient(165deg,rgba(28,46,63,0.5)_0%,rgba(19,34,52,0.72)_42%,rgba(8,18,30,0.92)_100%)]
      backdrop-blur-md border border-gold/15 hover:border-gold/40
      shadow-[0_10px_36px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)]
      hover:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]">
      
      {/* Top Hairline Gold Accent */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/80 to-transparent pointer-events-none" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[2px] text-white/50">
            {title}
          </span>
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold-light group-hover:scale-110 transition-transform">
              {icon}
            </div>
          )}
        </div>

        <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 tabular-nums">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-xs">
            {trend && (
              <span className={`font-mono font-semibold px-2 py-0.5 rounded-full ${
                isPositive 
                  ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/25'
                  : 'bg-rose-400/10 text-rose-300 border border-rose-400/25'
              }`}>
                {trend}
              </span>
            )}
            {subtitle && <span className="text-white/40">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 6.2 Financial Ledger Data Table
```tsx
export function LedgerTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gold/15 bg-navy-mid/60 backdrop-blur-md">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-gold/15 bg-navy/80 text-[10px] uppercase tracking-[1.5px] text-white/45">
            {headers.map((h, i) => (
              <th key={i} className="py-3.5 px-4 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-gold/[0.03] transition-colors group">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="py-3 px-4 font-mono text-white/85 group-hover:text-white tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 6.3 Luxury Form Input Field
```tsx
export function LuxuryInput({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="block text-[11px] font-semibold tracking-wider uppercase text-white/60">
        {label}
      </label>
      <input
        {...props}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm font-sans bg-navy-deep/80 text-white placeholder-white/30 border border-gold/20 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-all duration-200"
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
```

---

### 6.4 Restrained Status Badge
```tsx
type BadgeVariant = 'settled' | 'pending' | 'critical' | 'advisory';

export function StatusBadge({ status, variant }: { status: string; variant: BadgeVariant }) {
  const styles = {
    settled: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    pending: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    critical: 'bg-rose-400/10 text-rose-300 border-rose-400/25',
    advisory: 'bg-sky-400/10 text-sky-300 border-sky-400/25',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${styles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}
```

---

## 7. Zero-Flash Theme Initialization Script

To eliminate dark/light theme flashing on page load, place this inside `<head>` in your root `layout.tsx` or `index.html`:

```html
<script id="theme-init">
  (function(){
    try {
      var t = localStorage.getItem('theme_preference') || 'dark';
      var r = document.documentElement;
      r.setAttribute('data-theme', t);
      r.classList.remove('dark', 'light');
      r.classList.add(t);
    } catch(e) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

---

## 8. AI Agent Code Generation Rules
When asked to build a page or component:
1. **Never use standard grey `bg-gray-900` or blue `bg-blue-600`**. Use `--color-navy-deep` (`#08121E`), `--color-navy` (`#0D1B2A`), and `--color-gold` (`#C9A84C`).
2. **Never create flat buttons**. Use `.btn-primary` with the gold gradient, subtle scale/lift on hover, and the 45° shimmer pseudo-element.
3. **Always alternate sections on long-scroll landing pages** (Obsidian Deep ➔ Gold Marquee ➔ Dark Navy ➔ Crisp White ➔ Midnight Navy ➔ Ivory Off-White ➔ Deep Navy).
4. **All numeric and monetary figures must have `tabular-nums lining-nums font-mono`**.
5. **Always add the 1.5px gold hairline top accent** to cards and section dividers.
