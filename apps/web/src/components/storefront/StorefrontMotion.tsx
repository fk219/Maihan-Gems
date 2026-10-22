'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ease, prefersReducedMotion } from '../../engine/env.js';
import { destroyScroll, initScroll } from '../../engine/scroll.js';

gsap.registerPlugin(ScrollTrigger);

const QUIET = /^\/(checkout|account)/;

/**
 * Storefront-only motion. Checkout and account stay on native scroll.
 * Admin and vendor never mount this component.
 * One clock: GSAP's ticker drives Lenis and every tween.
 */
export function StorefrontMotion() {
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    if (prefersReducedMotion() || QUIET.test(pathname)) {
      destroyScroll();
      return;
    }
    initScroll();
    const stopMagnetic = new AbortController();

    const ctx = gsap.context(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 36,
          autoAlpha: 0,
          duration: 1.1,
          ease: ease.out,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const amount = Number(el.dataset['parallax'] ?? '8');
        gsap.fromTo(
          el,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: el.parentElement ?? el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });

      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const onMove = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          const x = event.clientX - (rect.left + rect.width / 2);
          const y = event.clientY - (rect.top + rect.height / 2);
          gsap.to(el, { x: x * 0.25, y: y * 0.25, duration: 0.35, ease: ease.soft });
        };
        const onLeave = () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: ease.out });
        };
        el.addEventListener('pointermove', onMove, { signal: stopMagnetic.signal });
        el.addEventListener('pointerleave', onLeave, { signal: stopMagnetic.signal });
      });

      document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((el) => {
        const distance = el.scrollWidth / 2;
        gsap.to(el, {
          x: -distance,
          duration: 28,
          ease: 'none',
          repeat: -1,
        });
      });

      const stone = document.querySelector<HTMLElement>('[data-cloth-idle]');
      if (stone) {
        gsap.to(stone, {
          y: -10,
          duration: 4.8,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      }

      const pin = document.querySelector<HTMLElement>('[data-cloth-pin]');
      const settle = pin?.querySelector<HTMLElement>('[data-cloth-settle]');
      if (pin && settle && window.matchMedia('(min-width: 900px)').matches) {
        gsap.fromTo(
          settle,
          { scale: 1.08 },
          {
            scale: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: pin,
              start: 'top top',
              end: '+=70%',
              pin: true,
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      }
    });

    return () => {
      stopMagnetic.abort();
      ctx.revert();
      destroyScroll();
    };
  }, [pathname]);

  return null;
}
