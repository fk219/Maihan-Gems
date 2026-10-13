import { describe, expect, it } from 'vitest';

import { METAL_PBR } from './preview-ring.js';

describe('metal PBR', () => {
  it('uses jewellery metals rather than a pewter stand-in for platinum', () => {
    expect(METAL_PBR.YELLOW_GOLD.color).toBe(0xc9a84c);
    expect(METAL_PBR.WHITE_GOLD.color).toBe(0xf2f0ea);
    expect(METAL_PBR.ROSE_GOLD.color).toBe(0xc47a52);
    expect(METAL_PBR.PLATINUM.color).toBe(0xd7d8dc);
    expect(METAL_PBR.PLATINUM.roughness).toBeLessThan(METAL_PBR.YELLOW_GOLD.roughness);
  });
});
