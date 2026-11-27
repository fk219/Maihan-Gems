import type { ReactNode } from 'react';
import { ViewTransition } from 'react';

/**
 * apps/web/src/app/(storefront)/template.tsx
 *
 * The route crossfade. A template (unlike a layout) is a new instance on every
 * navigation, which is exactly the trigger React's built-in <ViewTransition>
 * expects: the old page exits, the new page enters, and the two crossfade in
 * 180 ms. In-page state changes (filtering a collection, opening a drawer) are
 * NOT navigations and therefore do not animate the page — `default="none"`
 * keeps every non-enter/exit trigger quiet.
 *
 * The header and footer live in the layout, outside this boundary, so they
 * never fade or move. The CSS suppresses the root snapshot, keeps the
 * transition under 200 ms, lets pointers through, and turns the whole thing
 * into an instant swap under prefers-reduced-motion.
 *
 * The group-level loading shell is a composed, full-height page frame rather
 * than a 320 px card, so the entering snapshot is never a blank field.
 */
export default function StorefrontTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="mh-page" exit="mh-page" default="none">
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </ViewTransition>
  );
}
