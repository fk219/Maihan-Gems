'use client';

import { useEffect } from 'react';

export function PortalSurface() {
  useEffect(() => {
    document.body.classList.add('portal-surface');
    return () => {
      document.body.classList.remove('portal-surface');
    };
  }, []);
  return null;
}
