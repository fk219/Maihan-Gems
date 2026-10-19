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

const METALS: readonly { id: MetalFinish; label: string; swatch: string }[] = [
  { id: 'YELLOW_GOLD', label: 'Yellow gold', swatch: '#D4A437' },
  { id: 'WHITE_GOLD', label: 'White gold', swatch: '#F6F2E9' },
  { id: 'ROSE_GOLD', label: 'Rose gold', swatch: '#EA580C' },
  { id: 'PLATINUM', label: 'Platinum', swatch: '#8A867E' },
];

const METAL_IDS: readonly MetalFinish[] = ['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD', 'PLATINUM'];

export function ConfiguratorDock({
  initialTryOn = false,
  initialMetal = 'YELLOW_GOLD',
  initialCarat = 1.5,
}: {
  readonly initialTryOn?: boolean;
  readonly initialMetal?: MetalFinish;
  readonly initialCarat?: number;
}) {
  const [metal, setMetal] = useState<MetalFinish>(METAL_IDS.includes(initialMetal) ? initialMetal : 'YELLOW_GOLD');
  const [carat, setCarat] = useState(initialCarat);
  const [tryOn, setTryOn] = useState(initialTryOn);
  const metalLabel = METALS.find((item) => item.id === metal)?.label ?? 'Yellow gold';

  return (
    <section className="cfg" aria-label="Live assembly">
      <div className="cfg__stage">
        <Canvas
          metal={metal}
          stone={{ shape: 'round', carat, color: '#0891B2' }}
          label={`${metalLabel} ring, ${carat.toFixed(1)} carat centre stone`}
        />
        <p className="cfg__caption">Drag to turn · scroll to zoom</p>
      </div>
      <aside className="cfg__panel">
        <p className="cfg__kicker">Preview</p>
        <h2>Your ring</h2>
        <p className="cfg__meta">{metalLabel} · {carat.toFixed(1)} ct</p>
        <p className="cfg__label">Metal</p>
        <div className="cfg__metals" role="group" aria-label="Metal">
          {METALS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={metal === item.id ? 'is-on' : ''}
              aria-pressed={metal === item.id}
              onClick={() => setMetal(item.id)}
            >
              <span style={{ background: item.swatch }} />
              {item.label}
            </button>
          ))}
        </div>
        <label className="cfg__carat">
          <span>Carat <strong>{carat.toFixed(1)}</strong></span>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.1}
            value={carat}
            onChange={(event) => setCarat(Number(event.target.value))}
          />
        </label>
        <button type="button" className="cfg__try" onClick={() => setTryOn(true)}>
          Virtual try-on
        </button>
      </aside>
      <TryOn open={tryOn} onClose={() => setTryOn(false)} metal={metal} carat={carat} />
    </section>
  );
}
