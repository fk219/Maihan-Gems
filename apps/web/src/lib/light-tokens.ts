/**
 * apps/web/src/lib/light-tokens.ts
 *
 * DESIGN_DIRECTION.md step 1 — the light token layer.
 *
 * The palette alone produces a template. What makes the direction legible is a
 * second token set: where the light is, how hard it falls, how fast it sweeps,
 * and how it decays. Components consume these variables instead of inventing
 * their own gradients, so the whole storefront reads as ONE lighting model.
 *
 * Naming: --light-* for geometry and intensity, --motion-* for time.
 * Reduced motion is handled in the same block, so no component can forget it.
 */
export const LIGHT_TOKENS_CSS = `
:root {
  /* Source light: 135deg is a raking key from the upper left. */
  --light-angle: 135deg;
  --light-angle-soft: 160deg;

  /* Intensity ramp. Gold is light here, never a fill. */
  --light-key: rgba(232, 201, 106, 0.55);
  --light-fill: rgba(201, 168, 76, 0.14);
  --light-rim: rgba(245, 232, 192, 0.30);
  --light-shadow: rgba(3, 8, 14, 0.72);

  /* Falloff radii: tight specular, wide ambient. */
  --light-specular: 12%;
  --light-ambient: 68%;

  /* Sweep geometry for the Pass primitive. */
  --light-sweep-width: 38%;
  --light-sweep-opacity: 0.22;

  /* Motion: one easing, three durations. */
  --motion-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-enter: 520ms;
  --motion-pass: 640ms;
  --motion-hold: 9s;
  --motion-stagger: 48ms;

  /* Enter travel. Small on purpose: travel reads as weight, not bounce. */
  --motion-travel: 12px;
}

/* The Pass primitive: one sweep across a surface, left to right along the
   key light. Used for section handover and image reveal. */
@keyframes mh-light-pass {
  from { transform: translateX(-60%) skewX(-12deg); opacity: 0; }
  40%  { opacity: var(--light-sweep-opacity); }
  to   { transform: translateX(160%) skewX(-12deg); opacity: 0; }
}

/* The Hold primitive: ambient drift so a settled page is never dead. */
@keyframes mh-light-hold {
  from { transform: scale(1) translateY(0); }
  to   { transform: scale(1.03) translateY(-1.5%); }
}

.mh-light-pass {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--light-rim) 45%,
    transparent 100%
  );
  width: var(--light-sweep-width);
  animation: mh-light-pass var(--motion-pass) var(--motion-ease) both;
}

.mh-hold {
  animation: mh-light-hold var(--motion-hold) ease-in-out infinite alternate;
}

/* One switch governs the whole site. Nothing conveys meaning by motion alone,
   so reduced motion removes travel and drift without removing information. */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-travel: 0px;
    --motion-enter: 1ms;
    --motion-pass: 1ms;
    --motion-hold: 1ms;
    --motion-stagger: 0ms;
    --light-sweep-opacity: 0;
  }
  .mh-hold,
  .mh-light-pass {
    animation: none !important;
  }
}
`;
