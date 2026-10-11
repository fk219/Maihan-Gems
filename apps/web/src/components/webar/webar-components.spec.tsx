import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThreeDViewer } from './ThreeDViewer.js';
import { WebArModal } from './WebArModal.js';
import { WebArLauncher } from './WebArLauncher.js';

const renderHtml = (ui: React.ReactElement): string => renderToStaticMarkup(ui);

describe('WebAR 3D Viewer & Camera Privacy (Phase 11)', () => {
  describe('ThreeDViewer SSR / Markup', () => {
    it('renders 3D viewer container with accessible labels and control buttons', () => {
      const html = renderHtml(
        <ThreeDViewer
          glbUrl="https://cdn.maihan.gems/models/ring.glb"
          title="Solitaire Diamond Ring"
          onTryArClick={() => {}}
        />
      );

      expect(html).toContain('three-d-viewer-container');
      expect(html).toContain('aria-label="Solitaire Diamond Ring"');
      expect(html).toContain('aria-label="Zoom in"');
      expect(html).toContain('aria-label="Zoom out"');
      expect(html).toContain('aria-label="Reset 3D view"');
      expect(html).toContain('Try On in AR');
    });

    it('renders fallback markup when provided a static poster', () => {
      const html = renderHtml(
        <ThreeDViewer
          glbUrl="https://cdn.maihan.gems/models/ring.glb"
          title="Emerald Cut Pendant"
          posterUrl="https://cdn.maihan.gems/images/pendant.jpg"
        />
      );

      expect(html).toContain('aria-label="Emerald Cut Pendant"');
    });
  });

  describe('WebArModal Privacy Boundary (NFR-06)', () => {
    it('displays pre-flight privacy explanation when opened', () => {
      const html = renderHtml(
        <WebArModal
          isOpen={true}
          onClose={() => {}}
          glbUrl="https://cdn.maihan.gems/models/ring.glb"
          assetId="a0000000-0000-0000-0000-000000000001"
          fitRule={{
            anchorSegment: 'PROXIMAL_PHALANX',
            baseScale: 1.0,
            scaleMin: 0.7,
            scaleMax: 1.4,
            rotationOffset: { x: 0, y: 0, z: 0 },
            positionOffset: { x: 0, y: 0, z: 0 },
            fingerIndex: 3,
          }}
        />
      );

      expect(html).toContain('Privacy-First Virtual Try-On');
      expect(html).toContain('strictly on your device');
      expect(html).toContain('Enable Camera &amp; Try On');
      expect(html).toContain('Try On via Mobile Phone (Scan QR)');
    });

    it('renders nothing when isOpen is false', () => {
      const html = renderHtml(
        <WebArModal
          isOpen={false}
          onClose={() => {}}
          glbUrl="https://cdn.maihan.gems/models/ring.glb"
          assetId="a0000000-0000-0000-0000-000000000001"
          fitRule={{
            anchorSegment: 'PROXIMAL_PHALANX',
            baseScale: 1.0,
            scaleMin: 0.7,
            scaleMax: 1.4,
            rotationOffset: { x: 0, y: 0, z: 0 },
            positionOffset: { x: 0, y: 0, z: 0 },
            fingerIndex: 3,
          }}
        />
      );

      expect(html).toBe('');
    });
  });

  describe('WebArLauncher', () => {
    it('renders launcher root and embedded 3D viewer', () => {
      const html = renderHtml(
        <WebArLauncher
          assetId="a0000000-0000-0000-0000-000000000001"
          glbUrl="https://cdn.maihan.gems/models/ring.glb"
          title="Eternity Band"
        />
      );

      expect(html).toContain('webar-launcher-root');
      expect(html).toContain('three-d-viewer-container');
      expect(html).toContain('aria-label="Eternity Band"');
    });
  });
});
