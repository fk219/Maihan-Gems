/**
 * apps/web/src/components/system/index.ts
 *
 * The public surface of the design-system primitives (ADR-030). Import from
 * here, never from the individual files, so the set can grow without touching
 * call sites.
 */
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button.js';
export { Input, type InputProps } from './Input.js';
export { Label, type LabelProps } from './Label.js';
export { Card, type CardProps } from './Card.js';
export { Chip, type ChipProps, type ChipTone } from './Chip.js';
export { Kpi, type KpiProps } from './Kpi.js';
export { Toaster, notify, notifySuccess, notifyError } from './Toaster.js';
