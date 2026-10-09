'use client';

/**
 * apps/web/src/components/layout/MegaMenu.tsx
 *
 * The accessible mega menu (Phase 4 Task 9).
 *
 * This is the ONLY client island in the application shell: opening/closing
 * and Escape handling need JS, everything else (the whole menu structure and
 * every link) is server-rendered markup passed in as a plain prop. The island
 * sits at the header level — no client component higher in the tree (SoT
 * 12.3: "Client islands only where interaction demands it").
 *
 * Accessibility contract:
 *   - Semantic <nav> with an accessible name; real links (no ARIA-menu
 *     emulation, no role="menu" — these are page links, not an application
 *     menu; a list of links is the correct, robust pattern).
 *   - One toggle button per group with aria-expanded + aria-controls; the
 *     panel is a plain region referenced by id.
 *   - Escape closes the open panel and RETURNS FOCUS to its trigger — no
 *     focus trap anywhere; tab order is the DOM order.
 *   - Panels hidden with the `hidden` attribute (removed from the a11y tree
 *     AND tab order) rather than CSS-only visibility.
 *   - Visible focus comes from the browser's default focus ring (design tokens
 *     may style it, it is never removed); reduced motion: the CSS transition
 *     is 0s under prefers-reduced-motion via the global stylesheet.
 *   - Empty groups never reach this component (filtered by the view model).
 */
import { useEffect, useId, useRef, useState } from 'react';

import type { MenuGroup } from '../../lib/mega-menu.js';

export interface MegaMenuProps {
  readonly groups: readonly MenuGroup[];
}

export function MegaMenu({ groups }: MegaMenuProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const baseId = useId();

  // Escape closes the open panel and returns focus to its trigger. Clicking
  // outside the menu also closes it. No focus is ever trapped.
  useEffect(() => {
    if (openId === null) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        const trigger = document.getElementById(`${baseId}-trigger-${openId}`);
        setOpenId(null);
        trigger?.focus();
      }
    };
    const onClick = (event: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [openId, baseId]);

  return (
    <nav className="mega-menu" aria-label="Main" ref={rootRef}>
      <ul className="mega-menu__groups">
        {groups.map((group) => {
          const open = openId === group.id;
          const panelId = `${baseId}-panel-${group.id}`;
          const triggerId = `${baseId}-trigger-${group.id}`;
          return (
            <li key={group.id} className="mega-menu__group">
              <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : group.id)}
              >
                {group.label}
              </button>
              <ul id={panelId} className="mega-menu__panel" hidden={!open} aria-labelledby={triggerId}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
