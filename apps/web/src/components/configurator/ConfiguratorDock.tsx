'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import type { MetalFinish } from './JewelryConfiguratorCanvas.js';

const Canvas = dynamic(
  () => import('./JewelryConfiguratorCanvas.js').then((mod) => mod.JewelryConfiguratorCanvas),
  { ssr: false },
);

const TryOn = dynamic(
  () => import('../webar/VirtualTryOnModal.js').then((mod) => mod.VirtualTryOnModal),
  { ssr: false },
);

const METALS: readonly { id: MetalFinish; label: string }[] = [
  { id: 'YELLOW_GOLD', label: '18k yellow gold' },
  { id: 'WHITE_GOLD', label: '18k white gold' },
  { id: 'ROSE_GOLD', label: '18k rose gold' },
  { id: 'PLATINUM', label: 'Platinum' },
];

export function ConfiguratorDock() {
  const [metal, setMetal] = useState<MetalFinish>('YELLOW_GOLD');
  const [carat, setCarat] = useState(1.5);
  const [tryOn, setTryOn] = useState(false);

  return (
    <section aria-label="Live assembly" style={{ marginBottom: '2rem' }}>
      <Canvas
        metal={metal}
        stone={{ shape: 'oval', carat, color: '#7ec8e3' }}
        label="Procedural ring with centre stone"
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {METALS.map((item) => (
          <button key={item.id} type="button" onClick={() => setMetal(item.id)} aria-pressed={metal === item.id}>
            {item.label}
          </button>
        ))}
        <label>
          Carat
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={carat}
            onChange={(event) => setCarat(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={() => setTryOn(true)}>Virtual try-on</button>
      </div>
      <TryOn open={tryOn} onClose={() => setTryOn(false)} assetId="preview" metal={metal} />
    </section>
  );
}
