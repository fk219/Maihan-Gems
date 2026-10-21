'use client';

/**
 * apps/web/src/components/ai/AiConciergeLauncher.tsx
 *
 * P1-29 route wiring: mounts the previously unreachable
 * AiConciergeDrawer (a complete SSE concierge client that was only
 * referenced by tests) behind a lazy client island so storefront page
 * bundles stay inside the budget.
 */
import dynamic from 'next/dynamic';

const AiConciergeDrawer = dynamic(() => import('./AiConciergeDrawer.js').then((m) => m.default), {
  ssr: false,
});

export function AiConciergeLauncher() {
  return <AiConciergeDrawer />;
}

export default AiConciergeLauncher;

