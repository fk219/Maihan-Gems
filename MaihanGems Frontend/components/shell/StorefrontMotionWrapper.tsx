'use client';

import dynamic from 'next/dynamic';

const DynamicMotionLayer = dynamic(() => import('@/components/shell/MotionLayer'), {
  ssr: false,
});

export function StorefrontMotionWrapper() {
  return <DynamicMotionLayer />;
}
