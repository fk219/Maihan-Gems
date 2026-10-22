import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { prefersReducedMotion } from './env.js';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let ticker: ((time: number) => void) | null = null;

export function initScroll() {
  if (lenis || prefersReducedMotion()) return;
  lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, touchMultiplier: 1.1 });
  lenis.on('scroll', () => {
    ScrollTrigger.update();
  });
  ticker = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);
}

export function destroyScroll() {
  if (ticker) gsap.ticker.remove(ticker);
  ticker = null;
  lenis?.destroy();
  lenis = null;
}
