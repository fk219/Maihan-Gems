/**
 * apps/web/src/components/design-system/EditorialMasthead.tsx
 *
 * The one page-opening pattern for the storefront: a hairline eyebrow, a
 * Cormorant display title, an honest lead, and an optional tabular fact line.
 *
 * Why a primitive: category, colour, variety, search, settings and cart all
 * opened with slightly different copies of `page-eyebrow` + h1 + subtitle.
 * That is how a storefront becomes a set of templates. One masthead, one
 * Enter motion, one measured rule.
 *
 * Server-compatible. The Enter animation is the shared primitive from
 * light-tokens.ts: 520 ms, 12 px travel, blur decay, cubic-bezier(.16,1,.3,1).
 * Reduced motion resolves it in 1 ms with zero travel via the token switch;
 * no local media query is needed.
 */
import type { ReactNode } from 'react';

export interface EditorialMastheadProps {
  readonly eyebrow: string;
  readonly title: string;
  /** One or two sentences. State what the data is, not what it is not. */
  readonly lead?: ReactNode;
  /** A tabular fact line, e.g. a count. Rendered in mono. */
  readonly meta?: ReactNode;
}

export function EditorialMasthead({ eyebrow, title, lead, meta }: EditorialMastheadProps) {
  return (
    <header className="mh-masthead">
      <p className="mh-masthead__eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {lead !== undefined && <p className="mh-masthead__lead">{lead}</p>}
      {meta !== undefined && <div className="mh-masthead__meta">{meta}</div>}
    </header>
  );
}
