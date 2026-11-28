/**
 * apps/web/src/components/system/Chip.tsx
 *
 * Design-system primitive: Chip (ADR-030). 9999px, 8.5px/700, +0.12em,
 * uppercase — the document's exact chip recipe. Tones map to the status scale.
 *
 * Server-compatible.
 */
import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'gold' | 'positive' | 'negative' | 'info' | 'warning';

export interface ChipProps {
  readonly tone?: ChipTone;
  readonly className?: string;
  readonly children: ReactNode;
}

const TONE_CLASS: Record<ChipTone, string> = {
  neutral: '',
  gold: 'mi-chip--gold',
  positive: 'mi-chip--positive',
  negative: 'mi-chip--negative',
  info: 'mi-chip--info',
  warning: 'mi-chip--warning',
};

export function Chip({ tone = 'neutral', className, children }: ChipProps) {
  return (
    <span className={['mi-chip', TONE_CLASS[tone], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
