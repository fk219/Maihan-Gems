# DESIGN DIRECTION — "Light Through Stone"

Status: PROPOSED for the storefront rebuild. Authority: `Design.md` (palette,
type) extended by this document (concept, motion, interaction).
Nothing here overrides the accessibility or bundle-budget rules.

---

## 1. The concept

A gemstone is not a coloured object. It is a **light path**: light enters,
refracts, splits, and leaves changed. Every motion in the storefront derives
from that single behaviour.

This is the difference between decoration and direction. A dark section with a
gold line is a palette. A page where light physically moves through the product
and hands over to the next section is a concept.

**Rule:** if an animation cannot be explained as light entering, bending,
passing through, or leaving, it does not belong.

---

## 2. Art direction

| Element | Decision |
|---|---|
| Palette | Obsidian `#08121E` / `#0D1B2A`, gold `#C9A84C`, ivory `#FAFAF8`. Gold is **light**, never a fill: hairlines, specular edges, sweep gradients |
| Surfaces | No filled cards. Depth comes from light falloff, not borders |
| Photography | Single-stone, dark chase, raking light, no lifestyle stock |
| Type | Cormorant Garamond for display; a neutral sans for data. Display type is treated as an object: it can be clipped, revealed, and optically scaled |
| Colour | Stone colour is the only saturated colour on the page. Chrome stays neutral |
| Density | Generous. One idea per viewport |

---

## 3. Motion system

Three primitives only. Everything is composed from them.

1. **Enter** — content arrives along the light path (opacity + 8–16px travel +
   slight blur decay). 420–620 ms, `cubic-bezier(.16,1,.3,1)`.
2. **Pass** — a light sweep crosses a surface, revealing what is beneath.
   Used for section handover and image reveal.
3. **Hold** — after entrance, a slow ambient drift (2–6% scale, 6–12 s) so the
   page is never fully static.

**Forbidden:** bounce, elastic, spin, generic fade-up on everything, parallax
without a light reason.

**Reduced motion:** `prefers-reduced-motion: reduce` removes Enter travel and
Hold drift entirely; Pass becomes an instant state change. No information is
ever conveyed by motion alone.

---

## 4. Signature interactions

1. **Hero — refracted scroll.** A single stone, lit from a moving angle. Scroll
   changes the angle, which shifts the spectrum and the shadow. Built with CSS
   layered gradients first; a shader only if the budget allows (ADR required).
2. **Loupe cursor.** A custom cursor that magnifies the stone beneath it and
   exposes inclusions. Disabled on touch and under reduced motion.
3. **Card light-pass.** Hover sends one sweep across the stone; the image does
   not swap, it is *lit*.
4. **Faceted page transition.** Route change masked by a faceted polygon wipe,
   timed to the light sweep.
5. **Kinetic display type.** Headlines reveal word-by-word with a clip mask,
   staggered 40–60 ms, never letter-by-letter (illegible).
6. **Configurator lighting.** Metal change alters reflection; stone change
   alters refraction. One lighting model across 3D, AR, and static imagery, so
   the product looks like the same object everywhere.

---

## 5. Craft rules

- One exceptional section beats five average ones. Build the hero to final
  quality before touching the next section.
- Every interactive element has a visible focus ring and a keyboard path.
- Contrast checked against the real rendered background, not the token.
- No animation longer than 700 ms on interaction; ambient loops are exempt but
  must pause when off-screen.
- Images: explicit dimensions, `sizes`, modern formats, LCP preloaded.
- Text is never inside an image.

---

## 6. Guardrails (non-negotiable)

| Rule | Limit |
|---|---|
| Initial JS, category | ≤ 170 KB gzip |
| Initial JS, product | ≤ 190 KB gzip |
| LCP p75 | < 2.5 s |
| Accessibility | WCAG 2.2 AA, axe-clean |
| New dependency (three, GSAP, Lenis) | ADR first |
| Motion | `prefers-reduced-motion` honoured everywhere |

---

## 7. Implementation order

1. Design tokens for light (angle, falloff, sweep) — not just colour.
2. Hero: refracted scroll, reduced-motion variant, LCP measured.
3. Display typography system (kinetic reveal).
4. Product card light-pass.
5. Section handover (Pass primitive).
6. Page transition (faceted wipe).
7. Loupe cursor (pointer-capable devices only).
8. Configurator lighting parity.
9. Cross-page audit: one motion vocabulary, no leftovers.

Each step ships with a screenshot at 1440/768/390 and a budget check.
