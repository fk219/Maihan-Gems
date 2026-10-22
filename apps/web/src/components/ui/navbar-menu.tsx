'use client';

import React from 'react';
import { motion } from 'motion/react';

const transition = {
  type: 'spring' as const,
  mass: 0.5,
  damping: 20,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  const open = () => setActive(item);
  return (
    <div
      className="relative"
      onMouseEnter={open}
      onFocus={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setActive(active === item ? null : item);
        }
        if (event.key === 'Escape') setActive(null);
      }}
    >
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent p-0 font-[family-name:var(--font-sans)] text-[0.92rem] normal-case tracking-normal text-[#16110c] shadow-none"
        aria-expanded={active === item}
        onClick={() => setActive(active === item ? null : item)}
      >
        {item}
      </button>
      {active === item && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
        >
          <div className="absolute top-[calc(100%+0.6rem)] left-1/2 -translate-x-1/2 pt-2">
            <motion.div
              layoutId="maison-nav-panel"
              transition={transition}
              className="overflow-hidden border border-[#d4a437]/40 bg-[#fdfbf5] text-[#1d1710] shadow-none"
            >
              <motion.div layout className="h-full w-max p-4">
                {children}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative flex items-center gap-6 bg-transparent px-2 py-0"
      aria-label="Primary"
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <a href={href} className="flex gap-3 text-[#1d1710] no-underline">
      <img src={src} width={140} height={90} alt="" className="h-16 w-28 shrink-0 object-cover" />
      <span>
        <span className="mb-1 block font-[family-name:var(--font-serif)] text-xl">{title}</span>
        <span className="block max-w-40 text-sm text-[#5c5344]">{description}</span>
      </span>
    </a>
  );
};

export const HoveredLink = ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  return (
    <a {...rest} href={href} className="text-[#5c5344] no-underline hover:text-[#1d1710]">
      {children}
    </a>
  );
};
