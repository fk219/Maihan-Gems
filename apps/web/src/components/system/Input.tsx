/**
 * apps/web/src/components/system/Input.tsx
 *
 * Design-system primitive: Input (ADR-030). 12px radius, gold focus ring, 44px
 * minimum target. The same declarations are attached to `.portal-input` in
 * styles/maihan-system.css, so the console keeps its markup.
 *
 * Server-compatible.
 */
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as invalid and wires `aria-invalid`; the message itself is the caller's. */
  readonly invalid?: boolean;
}

export function Input({ className, invalid = false, ...rest }: InputProps) {
  return (
    <input
      className={['mi-field', className ?? ''].filter(Boolean).join(' ')}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
