/**
 * apps/web/src/components/design-system/Card.tsx
 *
 * Design-system primitive: Card (doc 08). Semantic <article>; the whole card
 * MAY carry one primary link (catalogue cards) — the link is a real <a>, not
 * an overlay, so keyboard and screen-reader users get one coherent target.
 * Server-compatible.
 */
import type { ReactNode } from 'react';

export interface CardProps {
  /** Optional single primary action target; rendered as a real link. */
  readonly href?: string;
  /** Accessible name for the card's primary link (the title, usually). */
  readonly linkLabel?: string;
  readonly children: ReactNode;
}

export function Card({ href, linkLabel, children }: CardProps) {
  return (
    <article className="card">
      {children}
      {href !== undefined && (
        <a className="card__link" href={href}>
          {linkLabel ?? 'View details'}
        </a>
      )}
    </article>
  );
}
