'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export function StoneMarquee({
  tiles,
}: {
  readonly tiles: readonly { name: string; href: string; img: string }[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const el = scroller.current;
      if (el && !paused.current) {
        el.scrollLeft += ((now - last) / 16) * 0.7;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  function hold(next: boolean) {
    paused.current = next;
    setHeld(next);
  }

  function nudge(direction: number) {
    hold(true);
    scroller.current?.scrollBy({ left: direction * 240, behavior: 'smooth' });
  }

  const row = [...tiles, ...tiles];

  return (
    <div className={`marquee${held ? ' is-held' : ''}`}>
      <button type="button" className="marquee__arrow" aria-label="Previous gemstones" onClick={() => nudge(-1)}>‹</button>
      <div
        className="marquee__scroller"
        ref={scroller}
        onMouseEnter={() => hold(true)}
        onMouseLeave={() => hold(false)}
      >
        <div className="marquee__track">
          {row.map((stone, index) => (
            <Link key={`${stone.href}-${index}`} href={stone.href} className="marquee__item">
              <img src={stone.img} alt="" />
              <span>{stone.name}</span>
            </Link>
          ))}
        </div>
      </div>
      <button type="button" className="marquee__arrow" aria-label="Next gemstones" onClick={() => nudge(1)}>›</button>
    </div>
  );
}
