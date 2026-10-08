/**
 * apps/web/src/components/design-system/Skeleton.tsx
 *
 * Design-system primitive: Skeleton (doc 08).
 *
 * Shape primitive for loading states (Task 5): a bordered box reserved to the
 * FINAL layout's dimensions (explicit width/height via style), never a
 * spinner. Announced once per page as part of an aria-busy region owned by
 * the loading.tsx that composes these; the skeleton itself is decorative
 * (aria-hidden) so screen readers don't read noise.
 *
 * Server-compatible.
 */
export interface SkeletonProps {
  readonly width: string;
  readonly height: string;
  /** Extra class for layout-specific shapes (card, row, text). */
  readonly variant?: 'block' | 'text' | 'card';
}

export function Skeleton({ width, height, variant = 'block' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton skeleton--${variant}`}
      style={{ width, height }}
    />
  );
}
