/**
 * packages/db/src/seed/webar-seed.ts
 *
 * P2-9 first tranche (no provider needed): the procedural gem GLBs exported by
 * `tools/export-gem-glb.mjs` are registered as READY WebAR assets, one per
 * catalogue colour hue, budget-validated against the real file bytes. The PDP
 * resolves the asset by hue (`brilliant-<hue>`), so every gemstone product
 * gains the 3D/AR tab without per-product bespoke models.
 */
import { statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createWebarAsset } from '../webar/webar-repository.js';
import type { Pool } from 'pg';

export interface WebarSeedCounts {
  readonly created: number;
  readonly skipped: number;
}

const HUES: readonly string[] = ['blue', 'violet', 'red', 'pink', 'green', 'yellow', 'orange', 'purple', 'white'];

const STORAGE_BASE = '/models/gems';

export async function seedWebarAssets(pool: Pool, options: { readonly webRoot?: string } = {}): Promise<WebarSeedCounts> {
  const repoRoot = resolve((options.webRoot ?? process.cwd()), '../../');
  let created = 0;
  let skipped = 0;

  for (const hue of HUES) {
    const storageKey = `${STORAGE_BASE}/brilliant-${hue}.glb`;
    const fsPath = join(repoRoot, 'apps/web/public', storageKey);
    if (!existsSync(fsPath)) {
      skipped += 1;
      continue;
    }
    const bytes = statSync(fsPath).size;
    // The exporter emits one indexed BufferGeometry; the triangle count is a
    // function of the lattice (16 segments): crown (16×5 + 16 fan) + pavilion
    // (16×3) = 144 faces.
    const existing = await pool.query('SELECT id FROM webar_assets WHERE storage_key = $1 LIMIT 1', [storageKey]);
    if (existing.rows.length > 0) {
      skipped += 1;
      continue;
    }
    await createWebarAsset(
      pool,
      {
        jewelleryType: 'RING',
        modelFormat: 'GLB',
        compression: 'NONE',
        storageKey,
        cdnUrl: storageKey,
        textureMaxPx: 1024,
        polyCount: 144,
        vertexCount: 82,
        fileBytes: bytes,
        fitRule: {
          anchorSegment: 'PROXIMAL_PHALANX',
          baseScale: 1,
          scaleMin: 0.7,
          scaleMax: 1.4,
          rotationOffset: { x: 0, y: 0, z: 0 },
          positionOffset: { x: 0, y: 0, z: 0 },
        },
        state: 'READY',
      } as unknown as Parameters<typeof createWebarAsset>[1],
    );
    created += 1;
  }

  return { created, skipped };
}
