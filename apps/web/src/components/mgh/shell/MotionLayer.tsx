'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.documentElement.style.scrollBehavior = 'auto';
      return;
    }

    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.style.opacity = '1';
            target.style.transform = 'translateY(0px)';
            observer.unobserve(target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.92) {
        el.style.opacity = '0.01';
        el.style.transform = 'translateY(14px)';
        observer.observe(el);
      } else {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0px)';
      }
    });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
