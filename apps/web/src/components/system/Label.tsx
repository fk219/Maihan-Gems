/**
 * apps/web/src/components/system/Label.tsx
 *
 * Design-system primitive: Label (ADR-030). 10px/700, +0.12em, uppercase,
 * muted ink. Always paired with a control by `htmlFor`; the gold focus
 * acknowledgement is `.font-portal`'s `:focus-visible` rule.
 *
 * Server-compatible.
 */
import type { LabelHTMLAttributes, ReactNode } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  readonly children: ReactNode;
}

export function Label({ className, children, ...rest }: LabelProps) {
  return (
    <label className={['mi-label', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </label>
  );
}
