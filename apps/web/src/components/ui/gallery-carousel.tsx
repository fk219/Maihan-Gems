'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useState } from 'react';

export interface GallerySlide {
  title: string;
  button: string;
  src: string;
  href: string;
}

/**
 * Aceternity carousel (21st #1565). `strip` is the horizontal signature row.
 * The stage layout stays for related pieces on a product page.
 */
export function GalleryCarousel({
  slides,
  layout = 'stage',
  title = 'Collections',
  titleId,
}: {
  slides: readonly GallerySlide[];
  layout?: 'stage' | 'strip';
  title?: string;
  titleId?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [per, setPer] = useState(1);
  const autoId = useId();
  const id = titleId ?? autoId;
  if (slides.length === 0) return null;

  const go = (next: number) => {
    const count = slides.length;
    setCurrent((next + count) % count);
  };

  if (layout === 'strip') {
    return <SignatureStrip slides={slides} title={title} titleId={id} current={current} per={per} setPer={setPer} go={go} />;
  }

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
            <a href={slide.href} className="group relative block h-[58vh] min-h-72 overflow-hidden bg-[#efe8dc] text-[#16110c] no-underline">
              <Image
                src={slide.src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
              <span className="absolute bottom-0 left-0 p-6 md:p-10">
                <span className="block bg-[#f6f1e8] px-3 py-2 font-[family-name:var(--font-serif)] text-4xl md:text-6xl">{slide.title}</span>
                <span className="line-link mt-3">{slide.button}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" aria-label="Previous collection" className="grid size-10 place-items-center border-0 border-b border-[#16110c]/40 text-[#16110c]" onClick={() => go(current - 1)}>
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label="Next collection" className="grid size-10 place-items-center border-0 border-b border-[#16110c]/40 text-[#16110c]" onClick={() => go(current + 1)}>
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function SignatureStrip({
  slides,
  title,
  titleId,
  current,
  per,
  setPer,
  go,
}: {
  slides: readonly GallerySlide[];
  title: string;
  titleId: string;
  current: number;
  per: number;
  setPer: (value: number) => void;
  go: (next: number) => void;
}) {
  useEffect(() => {
    const query = window.matchMedia('(min-width: 900px)');
    const apply = () => setPer(query.matches ? 3 : 1);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [setPer]);

  const shift = (100 / per) * current;

  return (
    <div className="atelier-strip">
      <div className="atelier-strip__head">
        <div>
          <p className="atelier-label">The house</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="atelier-strip__nav">
          <button type="button" aria-label="Previous piece" onClick={() => go(current - 1)}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label="Next piece" onClick={() => go(current + 1)}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <div className="atelier-strip__viewport">
        <ul className="atelier-strip__track" style={{ transform: `translateX(-${shift}%)` }}>
          {slides.map((slide, index) => (
            <li key={slide.href} style={{ width: `${100 / per}%` }} aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}>
              <a className="atelier-strip__card" href={slide.href}>
                <Image
                  src={slide.src}
                  alt=""
                  width={900}
                  height={1200}
                  sizes="(max-width: 800px) 86vw, 30vw"
                  style={{ width: '100%', height: 'auto' }}
                />
                <span>{slide.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
