'use client';

/**
 * apps/web/src/components/storefront/VaultReveal.tsx
 *
 * The one orchestrated reveal (awwwards Phase 5 — "Polish" lens):
 * elements enter once, when they first enter the viewport, with a measured
 * stagger; afterwards they never animate again. `prefers-reduced-motion`
 * is honoured in CSS (elements land as plain presence).
 *
 * Zero dependencies; the observer disconnects after every child is revealed.
 */
import { useEffect, useRef } from 'react';

export function VaultReveal({
  children,
  stagger = 90,
  className = '',
  as,
}: {
  children: React.ReactNode;
  /** Stagger between direct children (ms). 0 = all together. */
  stagger?: number;
  className?: string;
  /** Render as a specific element (e.g. 'ol' for ordered ledgers). */
  as?: 'div' | 'ol' | 'ul' | 'section' | 'header' | 'figure';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = (as ?? 'div') as 'div';

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') {
      root.classList.add('is-revealed');
      return;
    }

    const targets = Array.from(root.children);
    for (const target of targets) {
      if (target instanceof HTMLElement) target.classList.add('vault-reveal__item');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let index = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.setProperty('--reveal-delay', `${index * stagger}ms`);
          el.classList.add('is-revealed');
          index += 1;
          observer.unobserve(el);
        }
        if (targets.every((t) => t.classList.contains('is-revealed'))) observer.disconnect();
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [stagger]);

  return (
    <Tag ref={ref as never} className={`vault-reveal ${className}`.trim()}>
      {children}
    </Tag>
  );
}

export default VaultReveal;
