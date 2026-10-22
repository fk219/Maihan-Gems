# Maihan Gems — The cloth

The brief locks Silk & Stone. Cream and a serif are not a choice to undo. Uniqueness is the layout: one length of jeweller's cloth, not a stack of equal panels.

## Concepts considered

1. **The loupe.** The page is the instrument. A circular mask tracks the stone. Original, but it hides the jewel and fights a catalogue. Scores: originality 4, fit 3, feasibility 3, portability 3.
2. **The name.** Maihan as a wordmark that unfolds into the inventory. Typographic, portable to any house. Scores: originality 3, fit 2, feasibility 4, portability 4.
3. **The cloth.** Chosen. A stone is shown the way a bench shows it: laid on cloth, facts on a paper plate, the rest of the house unrolled as you pull the cloth toward you. Anchor: the real K11733 record (1.31 ct violetish blue tanzanite, round, VSI, heat treated and disclosed, Tanzania). Scores: originality 4, fit 5, feasibility 4, portability 2.

## Concept card

```
Idea:        The house is a length of cloth. The stone is already on it.
Metaphor:    the jeweller's cloth on the bench
Signature:   a sticky scroll opens the cloth around one real jewel (K11733)
Emotion:     quiet, exact, expensive
Motion verb: settle
Screenshot:  the tanzanite full-bleed, ink headline, paper plate of facts
```

## System

- Ground `#F6F2E9`, paper `#FDFBF5`, ink `#1D1710`, night `#16110C`, metal `#D4A437` as a line, muted `#5C5344` (small text must clear AA on ground and paper).
- Cormorant Garamond for display, Jost for interface. Sentence case in navigation. No italic one-word accents.
- One clock: GSAP ticker. Lenis rides that ticker on the storefront and is absent on checkout, account, admin, and vendor. Reduced motion shows every section at full opacity with no smooth scroll.
- Shape: no shared card radius. The cloth sections change family: full-bleed, marquee, asymmetric night index, sticky expand, text reveal.
- Eyebrows only where they name a real house function (atelier, vault), not above every heading.

## Genericness test

A generic luxury prompt lands on a black page, a gold gradient button, and three equal cards. This pass keeps the locked daylight ground and spends the layout on the cloth. Numbered steps stay only on Design Your Own, because that flow is a sequence.

## Tooling (owner-authorised)

shadcn (radix-nova) is initialised for `apps/web`. The attached 21st.dev picks are installed under `components/ui` and restyled to these tokens. Animated testimonials is installed and not rendered: there are no consented quotes. ADR-022 stays open; the owner ordered these primitives explicitly.
