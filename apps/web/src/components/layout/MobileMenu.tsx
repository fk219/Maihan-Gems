'use client';

/**
 * apps/web/src/components/layout/MobileMenu.tsx
 *
 * The mobile half of the two-part header. The previous build had no mobile
 * navigation at all: below 1024px every link simply disappeared. This is a
 * real modal drawer, not a CSS-shifted desktop menu:
 *
 *   - The trigger is a 44px button with aria-expanded + aria-controls.
 *   - The drawer is a labelled dialog (aria-modal), focus moves to Close on
 *     open, Tab is trapped inside, Escape closes and focus returns to the
 *     trigger, and body scroll is locked while open.
 *   - Groups are native <details>/<summary>, so keyboard and screen-reader
 *     behaviour comes from the platform rather than a re-implementation.
 *   - Every link is the same canonical route the desktop wing renders.
 *
 * No dependency, no animation that carries meaning. Enter is the shared
 * 320ms arrival; reduced motion resolves it instantly.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { MenuGroup } from '../../lib/mega-menu.js';

export interface MobileMenuProps {
  readonly groups: readonly MenuGroup[];
}

const UTILITY_LINKS = [
  { label: 'Search', href: '/search' },
  { label: 'Account', href: '/account' },
  { label: 'Bag', href: '/cart' },
  { label: 'Favourites', href: '/favorites' },
  { label: 'Compare', href: '/compare' },
] as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function MobileMenu({ groups }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || drawerRef.current === null) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null || node === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="sf-header__burger"
        aria-expanded={open}
        aria-controls="sf-mobile-drawer"
        onClick={() => setOpen(true)}
      >
        <span className="sf-header__burger-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Menu
      </button>

      {open &&
        createPortal(
          <div className="sf-v2">
          <div
            ref={drawerRef}
            id="sf-mobile-drawer"
            className="sf-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
          <div className="sf-drawer__top">
            <a href="/" className="sf-wordmark" onClick={() => setOpen(false)}>
              <span className="sf-wordmark__name">Maihan Gems</span>
              <span className="sf-wordmark__sub">Natural stones · Atelier</span>
            </a>
            <button
              ref={closeRef}
              type="button"
              className="sf-drawer__close"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="sf-drawer__body">
            {groups.map((group) => (
              <details key={group.id} className="sf-drawer__group">
                <summary>{group.label}</summary>
                <div className="sf-drawer__links">
                  {group.links.map((link) => (
                    <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </details>
            ))}
            <a className="sf-drawer__direct" href="/design-your-own" onClick={() => setOpen(false)}>
              Design your own
            </a>
          </div>

          <div className="sf-drawer__foot">
            <div className="sf-drawer__foot-links">
              {UTILITY_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
            </div>
            <p style={{ margin: 0 }}>Private appointments · New York</p>
          </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
