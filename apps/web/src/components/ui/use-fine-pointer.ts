'use client';

import { useEffect, useState } from 'react';

/** True only for a fine pointer that has not asked for reduced motion. */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const pointer = window.matchMedia('(pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setFine(pointer.matches && !reduce.matches);
    sync();
    pointer.addEventListener('change', sync);
    reduce.addEventListener('change', sync);
    return () => {
      pointer.removeEventListener('change', sync);
      reduce.removeEventListener('change', sync);
    };
  }, []);

  return fine;
}
