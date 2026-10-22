'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';

export interface GallerySlide {
  title: string;
  button: string;
  src: string;
  href: string;
}

/**
 * Aceternity carousel (21st #1565) with lucide icons, real links, and
 * pointer parallax only on a fine pointer.
 */
export function GalleryCarousel({ slides }: { slides: readonly GallerySlide[] }) {
  const [current, setCurrent] = useState(0);
  const id = useId();
  if (slides.length === 0) return null;

  const go = (next: number) => {
    const count = slides.length;
    setCurrent((next + count) % count);
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl" aria-roledescription="carousel" aria-labelledby={id}>
      <h2 id={id} className="sr-only">Collections</h2>
      <ul
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <li
            key={slide.href}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            className="w-full shrink-0 px-2"
          >
            <a href={slide.href} className="group relative block h-[58vh] min-h-72 overflow-hidden bg-[#16110c] text-[#f6f2e9] no-underline">
              <img
                src={slide.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#16110c]/80 to-transparent" />
              <span className="absolute bottom-0 left-0 p-6 md:p-10">
                <span className="block font-[family-name:var(--font-serif)] text-4xl md:text-6xl">{slide.title}</span>
                <span className="mt-3 inline-block border border-[#d4a437] px-4 py-2 text-xs uppercase tracking-[0.16em]">
                  {slide.button}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" aria-label="Previous collection" className="grid size-10 place-items-center border border-[#d4a437]/50 text-[#1d1710]" onClick={() => go(current - 1)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label="Next collection" className="grid size-10 place-items-center border border-[#d4a437]/50 text-[#1d1710]" onClick={() => go(current + 1)}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
