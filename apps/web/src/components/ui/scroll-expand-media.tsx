'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

import { cn } from '@/lib/utils';

export interface ScrollExpandMediaProps {
  mediaSrc: string;
  title: string;
  kicker?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * 21st scroll-expansion hero (#1932), rewritten as a sticky scroll-linked
 * section. The original hijacked wheel and touch; this one only reads
 * scroll progress inside its own track.
 */
export function ScrollExpandMedia({ mediaSrc, title, kicker, className, children }: ScrollExpandMediaProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });
  const frame = useTransform(scrollYProgress, [0, 1], ['42%', '100%']);
  const frameY = useTransform(scrollYProgress, [0, 1], ['18%', '0%']);
  const split = useTransform(scrollYProgress, [0, 1], ['0vw', '8vw']);
  const splitNeg = useTransform(scrollYProgress, [0, 1], ['0vw', '-8vw']);
  const words = title.split(' ');
  const first = words[0] ?? title;
  const rest = words.slice(1).join(' ');

  if (reduce) {
    return (
      <section className={cn('relative bg-[#16110c] text-[#f6f2e9]', className)}>
        <img src={mediaSrc} alt="" className="block h-[70vh] w-full object-cover" />
        <div className="px-[6vw] py-10">
          {kicker ? <p className="text-xs uppercase tracking-[0.18em] text-[#d4a437]">{kicker}</p> : null}
          <h2 className="font-[family-name:var(--font-serif)] text-[clamp(2.4rem,6vw,5rem)] font-normal leading-none">{title}</h2>
          {children}
        </div>
      </section>
    );
  }

  return (
    <div ref={trackRef} className={cn('relative h-[160vh] bg-[#16110c]', className)}>
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        <motion.div
          className="absolute overflow-hidden"
          style={{ width: frame, height: frame, top: frameY }}
        >
          <img src={mediaSrc} alt="" className="h-full w-full object-cover" />
        </motion.div>
        <div className="relative z-10 flex w-full flex-col items-center px-6 text-center text-[#f6f2e9]">
          {kicker ? <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#d4a437]">{kicker}</p> : null}
          <motion.h2
            className="font-[family-name:var(--font-serif)] text-[clamp(2.6rem,7vw,6rem)] font-normal leading-none"
            style={{ x: splitNeg }}
          >
            {first}
          </motion.h2>
          {rest ? (
            <motion.p
              className="font-[family-name:var(--font-serif)] text-[clamp(2.6rem,7vw,6rem)] font-normal leading-none"
              style={{ x: split }}
            >
              {rest}
            </motion.p>
          ) : null}
        </div>
        {children ? <div className="absolute inset-x-0 bottom-0 z-10 px-[6vw] pb-8 text-[#f6f2e9]">{children}</div> : null}
      </div>
    </div>
  );
}
