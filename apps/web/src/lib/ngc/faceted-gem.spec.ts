import { describe, expect, it } from 'vitest';

import { ROUND_BRILLIANT_FACETS, buildFacetedGem, meshIsWatertight, parseGemShape } from './faceted-gem.js';

describe('faceted gem geometry', () => {
  it('maps NGC shape names', () => {
    expect(parseGemShape('Round')).toBe('round');
    expect(parseGemShape('Oval mixed brilliant')).toBe('oval');
    expect(parseGemShape('Cushion')).toBe('cushion');
    expect(parseGemShape('Emerald Cut')).toBe('emerald');
    expect(parseGemShape('Pear')).toBe('pear');
  });

  it('builds a 57-facet round brilliant', () => {
    const mesh = buildFacetedGem('round');
    expect(mesh.facetCount).toBe(ROUND_BRILLIANT_FACETS);
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.indices.length).toBeGreaterThan(57 * 3);
    expect(mesh.vertexCount).toBeLessThan(mesh.indices.length);
  });

  it('warps oval, cushion and pear from the brilliant lattice', () => {
    expect(buildFacetedGem('oval', 1.35).facetCount).toBe(ROUND_BRILLIANT_FACETS);
    expect(buildFacetedGem('cushion').facetCount).toBe(ROUND_BRILLIANT_FACETS);
    expect(buildFacetedGem('pear').facetCount).toBe(ROUND_BRILLIANT_FACETS);
  });

  it('builds step cuts and square brilliants with many planar facets', () => {
    expect(buildFacetedGem('emerald').facetCount).toBeGreaterThan(40);
    expect(buildFacetedGem('princess').facetCount).toBeGreaterThan(16);
    expect(buildFacetedGem('trillion').facetCount).toBeGreaterThanOrEqual(10);
  });

  it('welds a watertight lattice with shared girdle vertices', () => {
    const shapes = ['round', 'oval', 'cushion', 'pear', 'emerald', 'princess', 'asscher', 'trillion'] as const;
    for (const shape of shapes) {
      const mesh = buildFacetedGem(shape, shape === 'oval' ? 1.35 : 1);
      expect({ shape, watertight: meshIsWatertight(mesh) }).toEqual({ shape, watertight: true });
      expect(mesh.vertexCount).toBeLessThan(mesh.indices.length);
    }
  });

  it('centres the lattice on the origin so the stone sits in frame', () => {
    const mesh = buildFacetedGem('round');
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < mesh.positions.length; i += 3) {
      minY = Math.min(minY, mesh.positions[i]!);
      maxY = Math.max(maxY, mesh.positions[i]!);
    }
    expect(Math.abs(minY + maxY)).toBeLessThan(0.02);
    expect(maxY).toBeGreaterThan(0.2);
    expect(minY).toBeLessThan(-0.2);
  });
});
