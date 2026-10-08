/**
 * apps/web/src/components/design-system/ErrorState.tsx
 *
 * Design-system primitive: ErrorState (doc 08 states table).
 *
 * Error view with a REAL recovery action (retry / return to category), never
 * a bare message and never a stack trace. The recovery control is passed in
 * by the caller (error.tsx 'use client' reset, or a plain link). Rendered
 * with role="alert" so the failure is announced. Server-compatible.
 */
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  /** Fixed, human title; implementation details never appear. */
  readonly title: string;
  readonly children?: ReactNode;
  /** The recovery action (retry button, category link, search link). */
  readonly recovery: ReactNode;
}

export function ErrorState({ title, children, recovery }: ErrorStateProps) {
  return (
    <section className="error-state" role="alert">
      <h2 className="error-state__title">{title}</h2>
      {children !== undefined && (
        <div className="error-state__body">{children}</div>
      )}
      <div className="error-state__recovery">{recovery}</div>
    </section>
  );
}
