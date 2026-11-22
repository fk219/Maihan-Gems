/**
 * apps/web/src/lib/home-hero-styles.ts
 *
 * DESIGN_DIRECTION.md §4.1 — "Hero: refracted scroll". The storefront hero is
 * ONE step-cut stone under a raking key light. There is no photograph, so the
 * composition IS the light: a cast shadow, an escaping caustic, and six
 * surfaces inside the cut (body, key, spectrum, facets, vignette, specular).
 *
 * Why a token file and not CSS modules: the hero's geometry is expressed as
 * custom properties consumed by `.mh-stone*`, and the whole section is one
 * server-rendered `<style>` hoisted into <head> by React 19's precedence
 * handling — no client JS, no runtime style injection, no dependency.
 * Everything numeric comes from `light-tokens.ts` (--light-angle, --light-key,
 * --light-rim, --light-shadow, --light-specular, --motion-*), so the hero and
 * the rest of the storefront share one lighting model.
 *
 * Scroll → light angle: a scroll-driven CSS animation (no JS) rotates the key
 * layer, rotates the spectrum further (refraction exceeds incidence), moves the
 * specular glint and translates the cast shadow. Only `transform` and `opacity`
 * are animated, so the work stays on the compositor.
 * `@supports (animation-timeline: scroll())` is a hard gate: browsers without
 * scroll timelines get the static composition and never a 1 s "play once"
 * animation, because the rule is only applied when the feature exists.
 *
 * Reduced motion: the time-based motion in this section (the word reveal, the
 * light pass) is governed entirely by the --motion-* switch in light-tokens.ts.
 * A scroll timeline is not duration-based, so the token switch cannot neutralise
 * it — one `prefers-reduced-motion: no-preference` gate in this stylesheet
 * keeps the scroll-linked rake from ever starting, and the hero collapses from
 * 68vh of pinned scroll travel to a single static viewport. No media query is
 * needed in the component.
 *
 * Mobile (< 981px): the pinned scroll travel is removed. A 68vh scrub on a
 * phone costs more than it gives; the hero becomes the same composition, static
 * and complete, with the copy first.
 */

export const HOME_HERO_CSS = `
/* ── Section shell: the track that the sticky stage travels through ── */
.mh-hero {
  --mh-hero-ink: #08121e;
  --mh-hero-ivory: #fafaf8;
  --mh-hero-gutter: clamp(1.25rem, 5vw, 5rem);
  --mh-hero-travel: 68vh;
  --mh-hero-stone: clamp(15rem, 30vw, 26rem);

  position: relative;
  isolation: isolate;
  /* Stage (100vh) + travel (68vh) = the scrub distance of the rake. */
  min-height: calc(100vh + var(--mh-hero-travel));
  background-color: var(--mh-hero-ink);
  color: var(--mh-hero-ivory);
}

/* ── Sticky stage: one viewport, one idea ── */
.mh-hero__stage {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* The 5rem header is sticky above this stage; the extra padding keeps the
     eyebrow clear of it while the stage is pinned. */
  padding: calc(5rem + clamp(1.5rem, 4vh, 3rem)) var(--mh-hero-gutter) clamp(1.25rem, 3vh, 2rem);
  overflow: clip;
}

/* Ambient bounty of light behind the stone only. Never crosses the copy block,
   so the text/background pair stays a measurable navy. */
.mh-hero__glow {
  position: absolute;
  top: -10%;
  right: -10%;
  width: min(68vw, 54rem);
  height: min(68vw, 54rem);
  background: radial-gradient(
    closest-side,
    rgba(201, 168, 76, 0.16) 0%,
    rgba(201, 168, 76, 0.05) 46%,
    transparent 74%
  );
  pointer-events: none;
  z-index: 0;
}

.mh-hero__inner {
  position: relative;
  z-index: 1;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4.5rem);
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
}

/* ── Copy ── */
.mh-hero__copy {
  max-width: 44rem;
}

.mh-hero__eyebrow {
  margin: 0 0 clamp(1rem, 2.4vh, 1.75rem);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  /* gold at 8.2:1 on #08121E — safe for 11px text */
  color: var(--color-gold, #c9a84c);
}

.mh-hero__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(3rem, min(7.2vw, 13.5vh), 7.75rem);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.035em;
  color: var(--mh-hero-ivory);
}

.mh-hero__line {
  display: block;
}

.mh-hero__title em {
  font-style: italic;
  font-weight: 400;
  letter-spacing: -0.02em;
}

/* Clip-mask word reveal. Each word is a real text node inside a block line:
   screen readers and copy/paste see "Light through stone.", not fragments.
   The word box is padded right so italic overhang is not clipped. */
.mh-word {
  --mh-word: 0;
  display: inline-block;
  padding-inline-end: 0.06em;
  padding-block-end: 0.1em;
  margin-inline-end: -0.06em;
  margin-block-end: -0.1em;
  clip-path: inset(0);
  animation: mh-word-reveal var(--motion-enter) var(--motion-ease) both;
  animation-delay: calc(var(--mh-word) * var(--motion-stagger));
}

.mh-word[data-word='1'] { --mh-word: 1; }
.mh-word[data-word='2'] { --mh-word: 2; }

@keyframes mh-word-reveal {
  from {
    clip-path: inset(0 0 100% 0);
    transform: translateY(var(--motion-travel));
  }
  to {
    clip-path: inset(0 0 0 0);
    transform: translateY(0);
  }
}

.mh-hero__lead {
  max-width: 34rem;
  margin: clamp(1.25rem, 3vh, 2rem) 0 0;
  font-family: var(--font-body);
  font-size: clamp(0.9375rem, 1.05vw, 1.0625rem);
  line-height: 1.75;
  /* ivory @ 0.78 = 11.1:1 on the hero navy */
  color: rgba(250, 250, 248, 0.78);
}

.mh-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.75rem;
  margin-top: clamp(1.75rem, 4vh, 2.75rem);
}

/* Gold is light, not a fill: a 1px lit edge with a faint inner falloff. */
.mh-hero__cta {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1.6rem;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mh-hero-ivory);
  text-decoration: none;
  border: 1px solid rgba(201, 168, 76, 0.7);
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    rgba(201, 168, 76, 0.1) 0%,
    rgba(201, 168, 76, 0.02) 100%
  );
  transition:
    border-color 220ms var(--motion-ease),
    background 220ms var(--motion-ease),
    color 220ms var(--motion-ease);
}

.mh-hero__cta:hover {
  border-color: var(--color-gold-light, #e8c96a);
  background: linear-gradient(
    180deg,
    rgba(201, 168, 76, 0.16) 0%,
    rgba(201, 168, 76, 0.04) 100%
  );
  color: #ffffff;
}

.mh-hero__cta span[aria-hidden] {
  transition: transform 220ms var(--motion-ease);
}

.mh-hero__cta:hover span[aria-hidden] {
  transform: translateX(4px);
}

.mh-hero__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding-block: 0.6rem;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(250, 250, 248, 0.82);
  text-decoration: none;
  border-bottom: 1px solid rgba(201, 168, 76, 0.35);
  transition:
    color 200ms var(--motion-ease),
    border-color 200ms var(--motion-ease);
}

.mh-hero__link:hover {
  color: #ffffff;
  border-color: var(--color-gold-light, #e8c96a);
}

/* Visible keyboard ring, separated from the gold hairline underneath it. */
.mh-hero a:focus-visible {
  outline: 2px solid var(--color-gold-light, #e8c96a);
  outline-offset: 3px;
  border-radius: 2px;
  box-shadow: 0 0 0 6px rgba(8, 18, 30, 0.9);
}

/* ── Stone figure ── */
.mh-hero__figure {
  position: relative;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1rem, 3vh, 1.75rem);
}

.mh-hero__caption {
  max-width: 26rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  line-height: 1.6;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  text-align: center;
  text-wrap: balance;
  /* ivory @ 0.55 ≈ 6.3:1 */
  color: rgba(250, 250, 248, 0.55);
}

.mh-stone {
  position: relative;
  width: var(--mh-hero-stone);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

/* Cast shadow: opposite the key light, moves as the rake moves. */
.mh-stone__shadow {
  position: absolute;
  left: 2%;
  right: 2%;
  bottom: -9%;
  height: 26%;
  z-index: 0;
  background: radial-gradient(
    closest-side,
    var(--light-shadow, rgba(3, 8, 14, 0.72)) 0%,
    transparent 72%
  );
  filter: blur(16px);
  /* Base transform == the first frame of the rake (see .mh-stone__key). */
  transform: translate(-6%, 5%) scale(1.04, 0.9);
  opacity: 0.9;
  transform-origin: 50% 50%;
  pointer-events: none;
}

/* Caustic: light that has passed through the stone and leaves to the lower
   right. Sits behind the body, so only the escaping part is visible. */
.mh-stone__caustic {
  position: absolute;
  left: 58%;
  right: -7%;
  top: 66%;
  height: 6%;
  z-index: 0;
  background: linear-gradient(
    90deg,
    rgba(232, 201, 106, 0.45) 0%,
    rgba(232, 201, 106, 0.1) 62%,
    transparent 100%
  );
  filter: blur(8px);
  transform: rotate(-26deg);
  transform-origin: 0 50%;
  mix-blend-mode: screen;
  pointer-events: none;
}

/* The body: an eight-facet step-cut silhouette, not a circle. */
.mh-stone__shape {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  isolation: isolate;
  clip-path: polygon(
    17% 0%,
    83% 0%,
    100% 19%,
    100% 81%,
    83% 100%,
    17% 100%,
    0% 81%,
    0% 19%
  );
  background: radial-gradient(
    115% 120% at 30% 20%,
    #1d3d54 0%,
    #102a3f 34%,
    #071320 72%,
    #04090f 100%
  );
  /* Clipped at the polygon, so this reads as a hairline along the straight
     girdle edges — the cut, catching the room. */
  box-shadow: inset 0 0 0 1px rgba(245, 232, 192, 0.18);
}

/* Raking key. Oversized so rotation never exposes an edge. */
.mh-stone__key {
  position: absolute;
  inset: -60%;
  /* The intensity stops are tuned literals on purpose. --light-key is the
     AMBIENT ramp (a 5%-wide, 0.55-alpha band); used directly here it floods the
     body and the stone reads as gold-filled, not lit. The raking edge needs a
     narrower, hotter profile: the light's DIRECTION still comes from
     --light-angle, and the Pass/enter motion from the shared --motion-* set. */
  background: linear-gradient(
    var(--light-angle, 135deg),
    transparent 34%,
    rgba(201, 168, 76, 0.06) 41%,
    rgba(232, 201, 106, 0.34) 46%,
    rgba(245, 232, 192, 0.72) 48.8%,
    /* The specular core is white light, never a tint. */
    rgba(255, 255, 255, 0.62) 49.6%,
    rgba(232, 201, 106, 0.26) 51.5%,
    rgba(201, 168, 76, 0.05) 57%,
    transparent 64%
  );
  mix-blend-mode: screen;
  /* Base transform == the first frame of the rake, so a browser without
     scroll timelines shows exactly the scroll-0 composition. */
  transform: rotate(-16deg) scale(1.02);
  opacity: 0.85;
  transform-origin: 50% 50%;
  pointer-events: none;
}

/* Refracted spectrum at the rim. The stone is the only saturated colour on
   the page, and it is a consequence of the light — not a decorative fill. */
.mh-stone__spectrum {
  position: absolute;
  inset: -18%;
  background: conic-gradient(
    from 140deg,
    #ff6f61 0deg,
    #ffb968 51deg,
    #f0e29a 102deg,
    #6fdaa0 154deg,
    #5cc4ff 205deg,
    #8f7bff 257deg,
    #ff6ec7 308deg,
    #ff6f61 360deg
  );
  mix-blend-mode: screen;
  -webkit-mask-image: radial-gradient(
    closest-side,
    transparent 60%,
    #000 77%,
    transparent 95%
  );
  mask-image: radial-gradient(
    closest-side,
    transparent 60%,
    #000 77%,
    transparent 95%
  );
  /* Base transform == the first frame of the rake (see .mh-stone__key). */
  transform: rotate(-10deg) scale(0.98);
  opacity: 0.08;
  transform-origin: 50% 50%;
  pointer-events: none;
}

/* Static facet planes: the cut does not move, only the light does. */
.mh-stone__facets {
  position: absolute;
  inset: 0;
  background: conic-gradient(
    from 45deg at 50% 50%,
    rgba(250, 250, 248, 0.06) 0deg 45deg,
    rgba(250, 250, 248, 0) 45deg 90deg,
    rgba(250, 250, 248, 0.04) 90deg 135deg,
    rgba(250, 250, 248, 0) 135deg 180deg,
    rgba(250, 250, 248, 0.055) 180deg 225deg,
    rgba(250, 250, 248, 0) 225deg 270deg,
    rgba(250, 250, 248, 0.035) 270deg 315deg,
    rgba(250, 250, 248, 0) 315deg 360deg
  );
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* The table and the crown, drawn as nested octagon hairlines. box-shadow is
   clipped by the polygon, so each ring only paints along the straight girdle
   edges — the cut, not a border. */
.mh-stone__facets::before,
.mh-stone__facets::after {
  content: '';
  position: absolute;
  clip-path: polygon(
    17% 0%,
    83% 0%,
    100% 19%,
    100% 81%,
    83% 100%,
    17% 100%,
    0% 81%,
    0% 19%
  );
  box-shadow: inset 0 0 0 1px rgba(245, 232, 192, 0.1);
}

.mh-stone__facets::before {
  inset: 17%;
}

.mh-stone__facets::after {
  inset: 35%;
  box-shadow: inset 0 0 0 1px rgba(245, 232, 192, 0.07);
}

.mh-stone__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    closest-side at 42% 34%,
    transparent 36%,
    rgba(3, 8, 14, 0.38) 76%,
    rgba(3, 8, 14, 0.66) 100%
  );
  pointer-events: none;
}

/* Specular: where the key enters. Small and hard; the bloom is the key layer. */
.mh-stone__specular {
  position: absolute;
  left: 30%;
  top: 26%;
  width: var(--light-specular, 12%);
  min-width: 38px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(245, 232, 192, 0.4) 34%,
    transparent 66%
  );
  mix-blend-mode: screen;
  transform: translate(-50%, -50%) rotate(-20deg) scaleY(0.75);
  opacity: 0.95;
  filter: blur(0.5px);
  pointer-events: none;
}

/* Exit: where the light leaves changed. */
.mh-stone__exit {
  position: absolute;
  left: 68%;
  top: 72%;
  width: 4.5%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    #ffffff 0%,
    rgba(245, 232, 192, 0.5) 40%,
    transparent 70%
  );
  mix-blend-mode: screen;
  opacity: 0.8;
  pointer-events: none;
}

/* The one signature motion: the shared Pass primitive, crossing the stone
   once, after the display type has landed.
   Base opacity 0 is deliberate: light-tokens switches the animation off under
   reduced motion, and without an explicit base the element would then sit as a
   static 38%-wide light band across the stone. */
.mh-stone .mh-light-pass {
  opacity: 0;
  animation-delay: 260ms;
  mix-blend-mode: screen;
}

/* ── Foot: the handover line ── */
.mh-hero__foot {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 1.5rem;
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding-top: clamp(0.85rem, 2vh, 1.15rem);
  border-top: 1px solid rgba(201, 168, 76, 0.2);
}

.mh-hero__footline {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(250, 250, 248, 0.62);
}

.mh-hero__scroll {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(250, 250, 248, 0.62);
}

.mh-hero__scroll::after {
  content: '';
  width: 1px;
  height: 1.6rem;
  background: linear-gradient(
    180deg,
    rgba(201, 168, 76, 0.65) 0%,
    rgba(201, 168, 76, 0) 100%
  );
}

/* ── Scroll-driven rake (CSS only, no JS) ──
   Only transform + opacity animate, so the light stays on the compositor.
   The feature query gates it completely: no scroll timeline, no animation. */
@supports (animation-timeline: scroll()) {
  @media (min-width: 981px) and (prefers-reduced-motion: no-preference) {
    .mh-stone__key,
    .mh-stone__spectrum,
    .mh-stone__shadow,
    .mh-stone__specular {
      animation-duration: 1s; /* ignored by a scroll timeline; required syntax */
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-timeline: scroll(root block);
      animation-range: 0 var(--mh-hero-travel);
      will-change: transform, opacity;
    }

    .mh-stone__key {
      animation-name: mh-rake-key;
    }

    .mh-stone__spectrum {
      animation-name: mh-rake-spectrum;
    }

    .mh-stone__shadow {
      animation-name: mh-rake-shadow;
    }

    .mh-stone__specular {
      animation-name: mh-rake-specular;
    }
  }
}

/* 119deg → 157deg: the key walks from upper-left to upper-right. */
@keyframes mh-rake-key {
  from {
    transform: rotate(-16deg) scale(1.02);
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
  to {
    transform: rotate(22deg) scale(1.06);
    opacity: 0.92;
  }
}

/* The spectrum travels further than the key: refraction exceeds incidence. */
@keyframes mh-rake-spectrum {
  from {
    transform: rotate(-10deg) scale(0.98);
    opacity: 0.08;
  }
  to {
    transform: rotate(30deg) scale(1.04);
    opacity: 0.24;
  }
}

@keyframes mh-rake-shadow {
  from {
    transform: translate(-6%, 5%) scale(1.04, 0.9);
    opacity: 0.9;
  }
  to {
    transform: translate(7%, -3%) scale(0.94, 1.06);
    opacity: 0.72;
  }
}

/* The glint crosses the crown: the clearest read that the angle moved. */
@keyframes mh-rake-specular {
  from {
    transform: translate(-50%, -50%) rotate(-20deg) scaleY(0.75);
    opacity: 0.95;
  }
  to {
    transform: translate(-24%, -66%) rotate(-4deg) scaleY(0.92);
    opacity: 0.72;
  }
}

/* ── Reduced motion: no pinned travel, no scroll scrub, static light ── */
@media (prefers-reduced-motion: reduce) {
  .mh-hero {
    min-height: 100vh;
    min-height: 100svh;
  }

  .mh-hero__stage {
    position: relative;
    top: auto;
    min-height: 100vh;
    min-height: 100svh;
  }
}

/* ── Small screens: the composition, unpinned ── */
@media (max-width: 980px) {
  .mh-hero {
    min-height: 0;
  }

  .mh-hero__stage {
    position: relative;
    top: auto;
    min-height: 0;
    padding: clamp(2rem, 6vh, 3.5rem) var(--mh-hero-gutter) clamp(2rem, 5vh, 3rem);
    /* Keep clipping the decorative glow: it is wider than the viewport, and
       with overflow visible it would extend the document past the section. */
    overflow: clip;
  }

  .mh-hero__glow {
    top: 42%;
    right: -30%;
    width: 120vw;
    height: 120vw;
  }

  .mh-hero__inner {
    grid-template-columns: 1fr;
    gap: clamp(2rem, 6vh, 3.5rem);
  }

  .mh-hero__copy {
    max-width: none;
  }

  .mh-hero__title {
    font-size: clamp(2.75rem, 12vw, 4.5rem);
  }

  .mh-hero__eyebrow {
    /* One line, not two: the tracking is the only thing that has to give. */
    letter-spacing: 0.26em;
  }

  .mh-stone {
    --mh-hero-stone: min(62vw, 17rem);
  }

  .mh-hero__foot {
    margin-top: clamp(2rem, 6vh, 3rem);
  }
}
`;
