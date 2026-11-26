export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ease = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
} as const;
