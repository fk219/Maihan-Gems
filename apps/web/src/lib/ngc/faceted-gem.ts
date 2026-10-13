/**
 * Procedural faceted gem meshes. Round brilliant is 57 facets (no culet):
 * table, 8 stars, 8 kites, 16 upper girdle, 16 lower girdle, 8 pavilion mains.
 * Oval / cushion / pear / marquise warp that girdle. Emerald and asscher are
 * step cuts. Princess / radiant / heart / trillion have their own lattices.
 */

export type GemShapeId =
  | 'round'
  | 'oval'
  | 'cushion'
  | 'emerald'
  | 'pear'
  | 'marquise'
  | 'princess'
  | 'asscher'
  | 'radiant'
  | 'heart'
  | 'trillion';

export interface FacetedGemMesh {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly vertexCount: number;
  readonly facetCount: number;
  readonly shape: GemShapeId;
}

type Vec = [number, number, number];

function sub(a: Vec, b: Vec): Vec {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function ring(count: number, radius: number, y: number, phase: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = phase + (i / count) * Math.PI * 2;
    out.push([radius * Math.cos(a), y, radius * Math.sin(a)]);
  }
  return out;
}

export function parseGemShape(shape: string | null | undefined): GemShapeId {
  const text = (shape ?? 'round').toLowerCase();
  if (text.includes('emerald')) return 'emerald';
  if (text.includes('asscher') || text.includes('octagon')) return 'asscher';
  if (text.includes('radiant')) return 'radiant';
  if (text.includes('princess')) return 'princess';
  if (text.includes('cushion')) return 'cushion';
  if (text.includes('oval')) return 'oval';
  if (text.includes('pear')) return 'pear';
  if (text.includes('marquise')) return 'marquise';
  if (text.includes('heart')) return 'heart';
  if (text.includes('trillion') || text.includes('trilliant')) return 'trillion';
  return 'round';
}

class FacetBag {
  readonly facets: Vec[][] = [];
  push(verts: Vec[]) {
    if (verts.length >= 3) this.facets.push(verts);
  }
  mesh(shape: GemShapeId): FacetedGemMesh {
    const positions: number[] = [];
    for (const poly of this.facets) {
      const ordered = makeOutward(poly);
      for (let i = 1; i < ordered.length - 1; i += 1) {
        positions.push(...ordered[0]!, ...ordered[i]!, ...ordered[i + 1]!);
      }
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]!);
      maxX = Math.max(maxX, positions[i]!);
      minY = Math.min(minY, positions[i + 1]!);
      maxY = Math.max(maxY, positions[i + 1]!);
      minZ = Math.min(minZ, positions[i + 2]!);
      maxZ = Math.max(maxZ, positions[i + 2]!);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i]! -= cx;
      positions[i + 1]! -= cy;
      positions[i + 2]! -= cz;
    }
    const welded = weld(positions);
    return {
      positions: welded.positions,
      indices: welded.indices,
      vertexCount: welded.positions.length / 3,
      facetCount: this.facets.length,
      shape,
    };
  }
}

/** Flip winding so the facet normal points away from the gem centre. */
function makeOutward(poly: Vec[]): Vec[] {
  const n = cross(sub(poly[1]!, poly[0]!), sub(poly[2]!, poly[0]!));
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const v of poly) {
    cx += v[0];
    cy += v[1];
    cz += v[2];
  }
  const inv = 1 / poly.length;
  const dot = n[0] * cx * inv + n[1] * cy * inv + n[2] * cz * inv;
  return dot < 0 ? [...poly].reverse() : poly;
}

function weld(positions: number[]): { positions: Float32Array; indices: Uint32Array } {
  const map = new Map<string, number>();
  const unique: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const key = `${Math.round(positions[i]! * 1e5)}|${Math.round(positions[i + 1]! * 1e5)}|${Math.round(positions[i + 2]! * 1e5)}`;
    let index = map.get(key);
    if (index === undefined) {
      index = unique.length / 3;
      map.set(key, index);
      unique.push(positions[i]!, positions[i + 1]!, positions[i + 2]!);
    }
    indices.push(index);
  }
  return { positions: new Float32Array(unique), indices: new Uint32Array(indices) };
}

/** Every undirected edge belongs to exactly two triangles. */
export function meshIsWatertight(mesh: FacetedGemMesh): boolean {
  const counts = new Map<string, number>();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i]!;
    const b = mesh.indices[i + 1]!;
    const c = mesh.indices[i + 2]!;
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.values()].every((n) => n === 2);
}

function mapXZ(verts: Vec[], fn: (x: number, z: number) => [number, number]): Vec[] {
  return verts.map(([x, y, z]) => {
    const [nx, nz] = fn(x, z);
    return [nx, y, nz];
  });
}

function brilliant(map?: (x: number, z: number) => [number, number]): FacetBag {
  const R = 0.5;
  const tableR = 0.285;
  const crownH = 0.152;
  const pavH = 0.43;
  const tableY = crownH;
  const pavY = -pavH;
  const starY = crownH * 0.55;
  const starR = 0.39;
  const pavBreak = -pavH * 0.38;

  const apply = (v: Vec[]): Vec[] => (map ? mapXZ(v, map) : v);
  const T = apply(ring(8, tableR, tableY, Math.PI / 8));
  const S = apply(ring(8, starR, starY, 0));
  const BZ = apply(ring(8, R, 0, Math.PI / 8));
  const UG = apply(ring(8, R, 0, 0));
  const LD = BZ;
  const LM = UG;
  // Pavilion break sits on the upper-girdle azimuth so each main kite points at a bezel.
  const P = apply(ring(8, 0.22, pavBreak, 0));
  const culet: Vec = [0, pavY, 0];
  const bag = new FacetBag();

  bag.push(T);
  for (let i = 0; i < 8; i += 1) {
    const n = (i + 1) % 8;
    bag.push([T[i]!, T[(i + 7) % 8]!, S[i]!]);
    bag.push([T[i]!, S[i]!, BZ[i]!, S[n]!]);
    bag.push([S[i]!, UG[i]!, BZ[i]!]);
    bag.push([S[n]!, UG[n]!, BZ[i]!]);
    bag.push([culet, P[i]!, LD[i]!, P[n]!]);
    bag.push([P[i]!, LD[i]!, LM[i]!]);
    bag.push([P[n]!, LM[n]!, LD[i]!]);
  }
  return bag;
}

function squircle(x: number, z: number, k = 0.42): [number, number] {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const m = Math.max(ax, az, 1e-6);
  const sx = (ax / m) * Math.sign(x) * 0.5;
  const sz = (az / m) * Math.sign(z) * 0.5;
  return [x * (1 - k) + sx * k, z * (1 - k) + sz * k];
}

function pearify(x: number, z: number): [number, number] {
  const a = Math.atan2(x, z);
  const s = 1 + 0.52 * Math.cos(a);
  return [x * 0.78, z * s * 0.92];
}

function marquise(x: number, z: number): [number, number] {
  const a = Math.atan2(x, z);
  const s = 1 + 0.28 * Math.cos(2 * a);
  return [x * 0.62, z * 1.15 * s];
}

function heartify(x: number, z: number): [number, number] {
  const a = Math.atan2(x, z);
  const cleft = Math.max(0, Math.cos(a)) * 0.22;
  const nx = x * (0.9 + 0.18 * Math.abs(Math.sin(a)));
  const nz = z * 0.95 + (z > 0 ? cleft : -0.08 * Math.abs(z));
  return [nx, nz];
}

function stepCut(corners: number, stretchX: number, stretchZ: number): FacetBag {
  const bag = new FacetBag();
  const levels: Array<{ y: number; rx: number; rz: number }> = [
    { y: 0.16, rx: 0.28 * stretchX, rz: 0.22 * stretchZ },
    { y: 0.09, rx: 0.38 * stretchX, rz: 0.3 * stretchZ },
    { y: 0, rx: 0.5 * stretchX, rz: 0.4 * stretchZ },
    { y: -0.14, rx: 0.36 * stretchX, rz: 0.28 * stretchZ },
    { y: -0.28, rx: 0.22 * stretchX, rz: 0.16 * stretchZ },
    { y: -0.4, rx: 0.08 * stretchX, rz: 0.06 * stretchZ },
  ];
  const rings = levels.map((level) => ring(corners, 1, level.y, Math.PI / corners).map(([x, y, z]) => [x * level.rx, y, z * level.rz] as Vec));
  bag.push(rings[0]!);
  for (let r = 0; r < rings.length - 1; r += 1) {
    const a = rings[r]!;
    const b = rings[r + 1]!;
    for (let i = 0; i < corners; i += 1) {
      bag.push([a[i]!, a[(i + 1) % corners]!, b[(i + 1) % corners]!, b[i]!]);
    }
  }
  bag.push([...rings[rings.length - 1]!].reverse());
  return bag;
}

function princess(): FacetBag {
  const bag = new FacetBag();
  const T = ring(4, 0.28, 0.16, Math.PI / 4);
  const C = ring(4, 0.42, 0.07, Math.PI / 4);
  const G = ring(4, 0.5, 0, Math.PI / 4);
  const P = ring(4, 0.22, -0.22, Math.PI / 4);
  const culet: Vec = [0, -0.42, 0];
  bag.push(T);
  for (let i = 0; i < 4; i += 1) {
    const n = (i + 1) % 4;
    bag.push([T[i]!, T[n]!, C[n]!, C[i]!]);
    bag.push([C[i]!, C[n]!, G[n]!, G[i]!]);
    bag.push([G[i]!, G[n]!, P[n]!, P[i]!]);
    bag.push([P[i]!, P[n]!, culet]);
  }
  return bag;
}

function trillion(): FacetBag {
  const bag = new FacetBag();
  const T = ring(3, 0.26, 0.14, Math.PI / 6);
  const G = ring(3, 0.5, 0, Math.PI / 6);
  const P = ring(3, 0.2, -0.24, Math.PI / 6);
  const culet: Vec = [0, -0.4, 0];
  bag.push(T);
  for (let i = 0; i < 3; i += 1) {
    const n = (i + 1) % 3;
    bag.push([T[i]!, T[n]!, G[n]!, G[i]!]);
    bag.push([G[i]!, G[n]!, P[n]!, P[i]!]);
    bag.push([P[i]!, P[n]!, culet]);
  }
  return bag;
}

function radiant(): FacetBag {
  const bag = stepCut(8, 1.05, 0.82);
  return bag;
}

export function buildFacetedGem(
  shape: GemShapeId,
  aspect = 1,
): FacetedGemMesh {
  const ax = Math.max(0.7, Math.min(aspect, 1.65));
  switch (shape) {
    case 'oval':
      return brilliant((x, z) => [x * ax, z]).mesh(shape);
    case 'cushion':
      return brilliant((x, z) => squircle(x * 0.96, z * 0.96)).mesh(shape);
    case 'pear':
      return brilliant(pearify).mesh(shape);
    case 'marquise':
      return brilliant(marquise).mesh(shape);
    case 'heart':
      return brilliant(heartify).mesh(shape);
    case 'emerald':
      return stepCut(8, 1.15, 0.78).mesh(shape);
    case 'asscher':
      return stepCut(8, 0.95, 0.95).mesh(shape);
    case 'radiant':
      return radiant().mesh(shape);
    case 'princess':
      return princess().mesh(shape);
    case 'trillion':
      return trillion().mesh(shape);
    default:
      return brilliant().mesh('round');
  }
}

export const ROUND_BRILLIANT_FACETS = 57;
