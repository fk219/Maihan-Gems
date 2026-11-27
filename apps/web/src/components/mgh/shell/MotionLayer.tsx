'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * apps/web/src/components/mgh/shell/MotionLayer.tsx
 *
 * The scroll choreography, in one place:
 *   - a section marked `[data-reveal]` enters ONCE, in 520 ms, when it first
 *     crosses the fold;
 *   - a list marked `[data-reveal-list]` enters once and staggers its direct
 *     children at 48 ms each — lists only, because order is information there;
 *   - anything already above the fold is left alone (no hidden content, no
 *     flash, no layout work on first paint);
 *   - reduced motion lands everything as plain presence, instantly.
 *
 * The observer re-scans on DOM additions because the storefront streams: a
 * client listing can arrive after this effect has run. Elements are marked
 * `data-motion` so a re-scan never observes the same node twice.
 *
 * The header/footer are deliberately not participants: a sticky element that
 * animates is a jump, and a jump breaks spatial anchoring.
 */
const ABOVE_FOLD = 0.92;
const STAGGER_MS = 48;

export default function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          if (target.hasAttribute('data-reveal-list')) {
            target.classList.add('is-revealed');
          } else {
            target.style.opacity = '1';
            target.style.transform = 'translateY(0px)';
          }
          observer.unobserve(target);
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
    );

    const revealAll = () => {
      document.querySelectorAll<HTMLElement>('[data-motion]').forEach((element) => {
        element.style.removeProperty('opacity');
        element.style.removeProperty('transform');
        element.classList.remove('is-pending', 'is-revealed');
      });
    };

    if (reduce.matches) {
      document.documentElement.style.scrollBehavior = 'auto';
      revealAll();
      return;
    }

    const scan = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-motion])').forEach((element) => {
        element.dataset['motion'] = 'section';
        if (element.getBoundingClientRect().top <= window.innerHeight * ABOVE_FOLD) return;
        element.style.opacity = '0.01';
        element.style.transform = 'translateY(14px)';
        observer.observe(element);
      });

      document.querySelectorAll<HTMLElement>('[data-reveal-list]:not([data-motion])').forEach((list) => {
        list.dataset['motion'] = 'list';
        if (list.getBoundingClientRect().top <= window.innerHeight * ABOVE_FOLD) return;
        list.classList.add('is-pending');
        Array.from(list.children).forEach((child, index) => {
          if (child instanceof HTMLElement) {
            child.style.setProperty('--mh-reveal-delay', `${index * STAGGER_MS}ms`);
          }
        });
        observer.observe(list);
      });
    };

    scan();

    // Streaming content and client-rendered listings can land after this
    // effect. Re-scan on additions, coalesced to one frame.
    let frame = 0;
    const mutations = new MutationObserver(() => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
