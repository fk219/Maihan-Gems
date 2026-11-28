/**
 * apps/web/src/components/design-system/Skeleton.tsx
 *
 * Design-system primitive: Skeleton (doc 08).
 *
 * ADR-031 — the bone is Skullet's `SkeletonBox`. The package owns the fill, the
 * shimmer, the speed and the prefers-reduced-motion stop; this wrapper keeps
 * the shipped contract (explicit width/height so the shape matches the final
 * layout box for box, `aria-hidden` because a skeleton is decorative, and the
 * `skeleton--<variant>` hook the design-system spec asserts) and maps the three
 * variants onto the system radius scale.
 *
 * Announced once per page as part of an aria-busy region owned by the
 * loading.tsx that composes these.
 *
 * Server-compatible.
 */
import { SkeletonBox } from 'skullet/react';

export interface SkeletonProps {
  readonly width: string;
  readonly height: string;
  /** Extra class for layout-specific shapes (card, row, text). */
  readonly variant?: 'block' | 'text' | 'card';
}

/** text 4px · block 8px (system xs) · card 16px (system card). */
const RADIUS: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: '4px',
  block: '8px',
  card: '16px',
};

export function Skeleton({ width, height, variant = 'block' }: SkeletonProps) {
  return (
    <span aria-hidden="true" className={`skullet-wrap skeleton--${variant}`}>
      <SkeletonBox width={width} height={height} radius={RADIUS[variant]} />
    </span>
  );
}
