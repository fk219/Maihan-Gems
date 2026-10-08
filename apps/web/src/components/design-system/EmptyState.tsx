/**
 * apps/web/src/components/design-system/EmptyState.tsx
 *
 * Design-system primitive: EmptyState (doc 08 states table).
 *
 * Purpose-built empty view with ONE clear next action (never bare text).
 * The action is a real link/button passed in by the page so the primitive
 * stays data-free. Server-compatible.
 */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  readonly title: string;
  /** Human explanation; must NOT invent counts or suggest fake data. */
  readonly children?: ReactNode;
  /** The single next action (Task 5 contract: empty is never a dead end). */
  readonly action: ReactNode;
}

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <h2 className="empty-state__title">{title}</h2>
      {children !== undefined && (
        <div className="empty-state__body">{children}</div>
      )}
      <div className="empty-state__action">{action}</div>
    </section>
  );
}
