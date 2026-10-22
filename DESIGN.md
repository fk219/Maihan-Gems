# Maihan Gems — the vitrine

Stack: the existing Next.js storefront. The visual layer is new. Routes, catalogue, cart, checkout, DYO, auth and the desks stay.

## Brief

A fine-gemstone house. Buyers should feel they are standing at a Graff window: one stone, a great deal of air, and a single way in. No invented prices, reviews, or phone numbers.

## Concepts

1. **The loupe.** A circular mask tracks the stone. Original, but it is a gadget on top of the jewellery. Originality 4, fit 2, feasibility 3, portability 4.
2. **The cloth.** The page folds like a jeweller’s suede. Already built and rejected: type sat on the stone, and the page read as stacked panels. Originality 3, fit 2, feasibility 4, portability 3.
3. **The vitrine.** Type occupies the left of a 12-column window. The photograph occupies the right and never crosses the type. One solid-ink invitation. The stone drifts a few percent on scroll and is otherwise still. Originality 3, fit 5, feasibility 5, portability 2 (it depends on a real vault photograph and a house that sells stones, not services).

Chosen: the vitrine. The owner named Graff, Cartier, Tiffany and Van Cleef, and asked for type in clear space.

```
Idea:        A shop window. The sentence is on the ivory. The stone is in its own pane.
Metaphor:    A vitrine on a quiet street.
Signature:   GSAP scrub parallax on the hero photograph only (data-parallax).
Emotion:     Stillness, then one slow drift as you move.
Motion verb: Settle. The stone shifts. Nothing else performs.
Screenshot:  A huge serif line on bone, a full-height tanzanite to its right, one ink button.
```

Genericness: ivory, Cormorant and a gold hairline are what the brief demands. The layout is the distinction: a 12-column split with an empty column between type and photograph, an asymmetric stone grid (one tall pane, the rest smaller), and no second button, search field, bag, or plate in the hero.

## System

| Role | Hex |
|---|---|
| Ground (bone) | `#F6F1E8` |
| Paper | `#FBF8F3` |
| Ink | `#16110C` |
| Muted | `#5C5344` |
| Line | `rgba(22, 17, 12, 0.12)` |
| Accent (hairline only) | `#C6A46A` |

Type: Cormorant Garamond for headlines via `next/font`, Jost for UI, JetBrains Mono for figures. Display is left-aligned, tight leading, no italic word accents.

Grid: 12 columns. Section rhythm alternates a full-viewport split, an asymmetric image grid, a horizontal strip, a sticky 50/50, a full-bleed band, then the footer.

Shape: square. No cards, no nav boxes.

CTAs: `.ink-cta` is solid ink. `.line-link` is text with an underline that draws from the left. Used on every route.

Motion: one clock (GSAP ticker / Lenis, already mounted). Reduced motion shows the photograph in place and the story text fully opaque. The nav fills to bone over the first 64px of scroll (`animation-timeline`), with a static bone bar where that API is absent.

## Composition

```
NAV     logo          four text links                 icons
HERO    headline                |     photograph
        one ink button          |     (parallax)
STONES  [ large ] [ ] [ ]
        [ ] [ ] [ ] [ ]
PIECES  horizontal strip of real jewels
STORY   sticky photograph | TextReveal
DYO     full-bleed band, type left, image right
FOOT    correspondence + four columns
```

Testimonials are omitted. There are no consented quotes.

Frontend-design notes applied: the brief’s uppercase labels are used once per section, not on the hero. Numbered steps stay only on Design Your Own, which is a sequence. No single italic word in a headline. Gold is a hairline, not a fill.
