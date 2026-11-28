/**
 * apps/web/src/components/system/Button.tsx
 *
 * Design-system primitive: Button (Maihan Group App & Portal Design System v2,
 * ADR-030). The recipe lives in styles/maihan-system.css so the console's
 * existing `.portal-btn` markup gets the identical rules without a rewrite.
 *
 * primary   the one call to action: 135deg gold gradient, white 11px/800,
 *           9999px radius, 1px hover lift
 * secondary hairline capsule on the canvas surface
 * danger    the negative action; never the default
 * icon      square 44px target (WCAG 2.2 2.5.8 floor)
 *
 * Server-compatible: no state, no handlers of its own.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Square 44px control that carries only an icon; `children` becomes the label. */
  readonly iconOnly?: boolean;
  readonly children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'mi-btn--primary',
  secondary: 'mi-btn--secondary',
  danger: 'mi-btn--danger',
  quiet: 'mi-btn--quiet',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'mi-btn',
    VARIANT_CLASS[variant],
    size === 'sm' ? 'mi-btn--sm' : '',
    iconOnly ? 'mi-btn--icon' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
