'use client';

import React from 'react';
import { motion, useReducedMotion, type MotionProps } from 'motion/react';

import { cn } from '@/lib/utils';

interface ShinyButtonProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof MotionProps>, MotionProps {
  children: React.ReactNode;
  className?: string;
  href: string;
}

/** Magic UI shiny button, restyled to night ink with a slow gold sweep. */
export const ShinyButton = React.forwardRef<HTMLAnchorElement, ShinyButtonProps>(
  ({ children, className, href, ...props }, ref) => {
    const reduce = useReducedMotion();
    return (
      <motion.a
        ref={ref}
        href={href}
        className={cn(
          'relative inline-flex cursor-pointer items-center justify-center bg-[#16110c] px-6 py-3 text-[#f6f2e9] no-underline',
          className,
        )}
        initial={reduce ? false : { '--x': '100%' }}
        animate={reduce ? undefined : { '--x': '-100%' }}
        transition={
          reduce
            ? undefined
            : {
                repeat: Infinity,
                repeatType: 'loop',
                repeatDelay: 2.4,
                duration: 1.1,
                ease: 'linear',
              }
        }
        {...props}
      >
        <span
          className="relative block font-[family-name:var(--font-sans)] text-[0.72rem] uppercase tracking-[0.18em]"
          style={
            reduce
              ? undefined
              : {
                  maskImage:
                    'linear-gradient(-75deg,#f6f2e9 calc(var(--x) + 20%),transparent calc(var(--x) + 30%),#f6f2e9 calc(var(--x) + 100%))',
                }
          }
        >
          {children}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block p-px"
          style={
            reduce
              ? { boxShadow: 'inset 0 0 0 1px #d4a437' }
              : {
                  mask: 'linear-gradient(#000,#000) content-box exclude,linear-gradient(#000,#000)',
                  WebkitMask: 'linear-gradient(#000,#000) content-box exclude,linear-gradient(#000,#000)',
                  backgroundImage:
                    'linear-gradient(-75deg,rgba(212,164,55,0.15) calc(var(--x) + 20%),rgba(212,164,55,0.85) calc(var(--x) + 25%),rgba(212,164,55,0.15) calc(var(--x) + 100%))',
                }
          }
        />
      </motion.a>
    );
  },
);

ShinyButton.displayName = 'ShinyButton';
