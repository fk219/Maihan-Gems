/**
 * apps/web/src/components/system/Card.tsx
 *
 * Design-system primitive: Card (ADR-030). 16px radius, surface fill, one gold
 * top hairline, and a 1px lift only when the card is itself the interaction.
 *
 * Server-compatible.
 */
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** The whole card is a target (a link or a button wraps it): enable the lift. */
  readonly interactive?: boolean;
  readonly children: ReactNode;
}

export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={['mi-card', interactive ? 'mi-card--interactive' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
