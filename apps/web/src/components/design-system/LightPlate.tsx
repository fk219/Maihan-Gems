/**
 * apps/web/src/components/design-system/LightPlate.tsx
 *
 * The honest image slot for a catalogue that has no product photography yet.
 *
 * DESIGN_DIRECTION.md §2: "No filled cards. Depth comes from light falloff."
 * §4.1: the stone is composed from layered gradients. This primitive is the
 * catalogue-scale version of that idea: one dark chase, one step-cut stone,
 * one raking key light, one specular exit. It is a *light study*, never a
 * depiction of a particular gemstone — the visible caption says so, and no
 * alt text is fabricated.
 *
 * Why a primitive: ProductCard, the settings index and the product detail page
 * all need the same slot with the same honesty rule. Duplicating the forty
 * decorative nodes three times would guarantee they drift apart.
 *
 * Server-compatible: no 'use client', no image request, no canvas. The only
 * motion is the shared Pass sweep (CSS hover/transition) and the optional Hold
 * drift (`.mh-hold`, disabled by the token switch under reduced motion).
 */
export interface LightPlateProps {
  /** Visible truth line under the plate. Required: never render an unexplained blank. */
  readonly caption: string;
  /** Extra class for aspect/scale variants (e.g. `mh-plate--tall`). */
  readonly className?: string;
  /** Enable the ambient Hold drift. Use once per page at most (PDP). */
  readonly hold?: boolean;
}

export function LightPlate({ caption, className, hold = false }: LightPlateProps) {
  const rootClass = className === undefined ? 'mh-plate' : `mh-plate ${className}`;

  return (
    <div className={rootClass}>
      <div className="mh-plate__field" aria-hidden="true">
        <span className="mh-plate__shadow" />
        <span className={hold ? 'mh-plate__stone mh-hold' : 'mh-plate__stone'}>
          <span className="mh-plate__key" />
          <span className="mh-plate__rim" />
          <span className="mh-plate__specular" />
        </span>
        <span className="mh-plate__pass" />
      </div>
      <p className="mh-plate__note">{caption}</p>
    </div>
  );
}
