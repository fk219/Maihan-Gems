'use client';

/**
 * apps/web/src/components/webar/WebArLauncher.tsx
 *
 * Isolated entry point for 3D Viewer & WebAR Modal.
 * Encapsulates dynamic modal toggling and client-side presentation.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { FitRule } from '@maihan/contracts';
import { ThreeDViewer } from './ThreeDViewer.js';

const DynamicWebArModal = dynamic(
  () => import('./WebArModal.js').then((mod) => mod.WebArModal),
  { ssr: false }
);

export interface WebArLauncherProps {
  readonly assetId: string;
  readonly glbUrl: string;
  readonly title?: string;
  readonly posterUrl?: string;
  readonly fitRule?: FitRule;
  readonly jewelleryType?: string;
}

const DEFAULT_FIT_RULE: FitRule = {
  anchorSegment: 'PROXIMAL_PHALANX',
  baseScale: 1.0,
  scaleMin: 0.7,
  scaleMax: 1.4,
  rotationOffset: { x: 0, y: 0, z: 0 },
  positionOffset: { x: 0, y: 0, z: 0 },
  fingerIndex: 3,
};

export function WebArLauncher({
  assetId,
  glbUrl,
  title,
  posterUrl,
  fitRule = DEFAULT_FIT_RULE,
  jewelleryType = 'RING',
}: WebArLauncherProps) {
  const [isArOpen, setIsArOpen] = useState(false);

  return (
    <div className="webar-launcher-root" style={{ width: '100%', margin: '1.5rem 0' }}>
      <ThreeDViewer
        glbUrl={glbUrl}
        title={title}
        posterUrl={posterUrl}
        onTryArClick={() => setIsArOpen(true)}
      />

      {isArOpen && (
        <DynamicWebArModal
          isOpen={isArOpen}
          onClose={() => setIsArOpen(false)}
          glbUrl={glbUrl}
          fitRule={fitRule}
          jewelleryType={jewelleryType}
          assetId={assetId}
        />
      )}
    </div>
  );
}
