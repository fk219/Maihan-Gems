/**
 * apps/web/src/components/design-system/Badge.tsx
 *
 * Design-system primitive: Badge (doc 08 component inventory).
 *
 * Server-compatible (no 'use client'), semantic <span>. `role="status"` only
 * when the badge reports a live state (availability/provenance) so the
 * accessibility tree stays meaningful; decorative labels are plain spans.
 *
 * No page-local variants: tone is part of THIS api, encoded once.
 */
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'positive' | 'warning' | 'critical';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'badge badge--neutral',
  positive: 'badge badge--positive',
  warning: 'badge badge--warning',
  critical: 'badge badge--critical',
};

export interface BadgeProps {
  readonly tone: BadgeTone;
  /** Announce changes to assistive tech (availability, verification state). */
  readonly live?: boolean;
  readonly children: ReactNode;
}

export function Badge({ tone, live = false, children }: BadgeProps) {
  return (
    <span className={TONE_CLASS[tone]} role={live ? 'status' : undefined}>
      {children}
    </span>
  );
}
