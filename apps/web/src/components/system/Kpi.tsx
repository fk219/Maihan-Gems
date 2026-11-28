/**
 * apps/web/src/components/system/Kpi.tsx
 *
 * Design-system primitive: Kpi (ADR-030). Montserrat figure, Manrope label,
 * tabular lining numerals so a number never reflows while it updates.
 *
 * `delta` is signed: it renders the sign, not a colour-only cue, so the
 * direction survives greyscale and screen readers.
 *
 * Server-compatible.
 */
export interface KpiProps {
  readonly label: string;
  readonly value: string;
  /** Optional supporting line, e.g. "of 42 live stones". */
  readonly meta?: string;
  /** Signed change, e.g. 12.4 for +12.4%. Omit when there is no baseline. */
  readonly delta?: number;
  readonly deltaSuffix?: string;
  readonly className?: string;
}

export function Kpi({ label, value, meta, delta, deltaSuffix = '%', className }: KpiProps) {
  const hasDelta = delta !== undefined && Number.isFinite(delta);
  const direction = hasDelta ? (delta >= 0 ? 'up' : 'down') : null;

  return (
    <div className={['mi-kpi', className ?? ''].filter(Boolean).join(' ')}>
      <span className="mi-kpi__label">{label}</span>
      <span className="mi-kpi__value">{value}</span>
      {hasDelta || meta ? (
        <span className="mi-kpi__meta">
          {hasDelta ? (
            <span className={`mi-kpi__delta mi-kpi__delta--${direction}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
              {deltaSuffix}
            </span>
          ) : null}
          {meta ? <span>{meta}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
