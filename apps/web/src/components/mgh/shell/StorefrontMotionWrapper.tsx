'use client';

import dynamic from 'next/dynamic';

/**
 * The scroll-choreography layer is loaded after the page is interactive: the
 * reveal is a perceived-quality detail, never a render-blocking cost. Keeping
 * it in its own chunk is also why it does not count against the route's
 * initial-JS budget.
 */
const DynamicMotionLayer = dynamic(() => import('@/components/mgh/shell/MotionLayer'), {
  ssr: false,
});

export function StorefrontMotionWrapper() {
  return <DynamicMotionLayer />;
}
