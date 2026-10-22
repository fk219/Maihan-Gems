#!/usr/bin/env node
/**
 * tools/export-gem-glb.mjs
 *
 * P2-9 (first tranche): generates real GLB models for the WebAR/3D path from
 * the in-repo gem geometry — no external provider, no API key. The lattice is
 * the round-brilliant family (crown + girdle + pavilion facets) matching the
 * procedural viewer; colours come from the catalogue's colour hue.
 *
 * Usage:
 *   node tools/export-gem-glb.mjs --out apps/web/public/models/gems
 *
 * Output: one GLB per supported shape×hue combination (binorm-weighted
 * facets, single indexed BufferGeometry, PBR base colour).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const outDirArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'apps/web/public/models/gems';
const outDir = resolve(outDirArg);
mkdirSync(outDir, { recursive: true });

/** Round-brilliant lattice: 8 crown mains + 8 stars, 16 girdle, 8 pavilion mains
 *  + 16 pavilion halves ≈ the 57-facet family. Deterministic geometry. */
function buildBrilliant({ radiusTop = 0.62, girdleRadius = 1, crownHeight = 0.42, pavilionDepth = 1.28, segments = 16 }) {
  const positions = [];
  const normals = [];
  const indices = [];
  const table = [];

  const CROWN_TABLE_Y = crownHeight;
  const GIRDLE_Y = 0;
  const CULET_Y = -pavilionDepth;

  const ring = (count, y, r) => {
    const pts = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      pts.push([Math.cos(angle) * r, y, Math.sin(angle) * r]);
    }
    return pts;
  };

  // Vertices: table centre, crown table ring, upper-girdle ring, girdle ring, pavilion ring, culet
  const tableCentre = positions.push([0, CROWN_TABLE_Y + 0.02, 0]) - 1;
  const crownTable = ring(segments, CROWN_TABLE_Y, radiusTop);
  const upperGirdle = ring(segments, crownHeight * 0.45, (radiusTop + girdleRadius) / 2);
  const girdle = ring(segments, GIRDLE_Y, girdleRadius);
  const pavilionMid = ring(segments, -pavilionDepth * 0.55, girdleRadius * 0.4);
  const culet = positions.push([0, CULET_Y, 0]) - 1;

  const push = (p) => positions.push(p) - 1;
  const crownIdx = crownTable.map(push);
  const upperIdx = upperGirdle.map(push);
  const girdleIdx = girdle.map(push);
  const pavIdx = pavilionMid.map(push);

  const tri = (a, b, c) => indices.push(a, b, c);
  const norm = (a, b, c) => {
    // face normal into `normals` per vertex of the triangle (flat shading)
    const [ax, ay, az] = positions[a];
    const [bx, by, bz] = positions[b];
    const [cx, cy, cz] = positions[c];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    for (const i of [a, b, c]) {
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    }
  };

  // Crown: table fan + bezel mains + star facets
  for (let i = 0; i < segments; i += 1) {
    const j = (i + 1) % segments;
    tri(tableCentre, crownIdx[i], crownIdx[j]);
    norm(tableCentre, crownIdx[i], crownIdx[j]);
    tri(crownIdx[i], upperIdx[i], girdleIdx[i]);
    norm(crownIdx[i], upperIdx[i], girdleIdx[i]);
    tri(crownIdx[i], girdleIdx[i], upperIdx[(i + segments - 1) % segments]);
    norm(crownIdx[i], girdleIdx[i], upperIdx[(i + segments - 1) % segments]);
    tri(upperIdx[i], girdleIdx[i], upperIdx[(i + 1) % segments]);
    norm(upperIdx[i], girdleIdx[i], upperIdx[(i + 1) % segments]);
  }

  // Pavilion: mains + halves to culet
  for (let i = 0; i < segments; i += 1) {
    const j = (i + 1) % segments;
    tri(girdleIdx[i], pavIdx[i], culet);
    norm(girdleIdx[i], pavIdx[i], culet);
    tri(pavIdx[i], girdleIdx[j], culet);
    norm(pavIdx[i], girdleIdx[j], culet);
    tri(girdleIdx[i], girdleIdx[j], pavIdx[i]);
    norm(girdleIdx[i], girdleIdx[j], pavIdx[i]);
  }

  void table;
  return { positions, normals, indices };
}

/** Catalogue colour hues → linear-space base colours (from lib/ngc/colors.ts mapping). */
const HUE_COLOURS = {
  blue: [0.055, 0.19, 0.5],
  violet: [0.16, 0.09, 0.42],
  red: [0.42, 0.045, 0.06],
  pink: [0.55, 0.14, 0.3],
  green: [0.05, 0.34, 0.16],
  yellow: [0.55, 0.42, 0.07],
  orange: [0.52, 0.18, 0.04],
  purple: [0.2, 0.07, 0.34],
  white: [0.86, 0.86, 0.88],
};

const SHAPES = { round: 'round' };
void SHAPES; // shape vocabulary placeholder — per-hue files are all round-brilliant today

function buildGlb({ positions, normals, indices }, baseColour) {
  const posArr = new Float32Array(positions.flat());
  const normArr = new Float32Array(normals.flat());
  const idxArr = new Uint32Array(indices);

  const pad4 = (n) => (n % 4 === 0 ? n : n + (4 - (n % 4)));
  const posBytes = Buffer.from(posArr.buffer);
  const normBytes = Buffer.from(normArr.buffer);
  const idxBytes = Buffer.from(idxArr.buffer);
  const posOff = 0;
  const normOff = posOff + pad4(posBytes.length);
  const idxOff = normOff + pad4(normBytes.length);
  const binLength = idxOff + pad4(idxBytes.length);
  const bin = Buffer.alloc(binLength);
  posBytes.copy(bin, posOff);
  normBytes.copy(bin, normOff);
  idxBytes.copy(bin, idxOff);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < posArr.length; i += 3) {
    for (const axis of [0, 1, 2]) {
      min[axis] = Math.min(min[axis], posArr[i + axis]);
      max[axis] = Math.max(max[axis], posArr[i + axis]);
    }
  }

  const gltf = {
    asset: { version: '2.0', generator: 'maihan-gems procedural gem exporter' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'gem' }],
    meshes: [
      {
        name: 'gem',
        primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0, mode: 4 }],
      },
    ],
    materials: [
      {
        name: 'gem-body',
        pbrMetallicRoughness: {
          baseColorFactor: [...baseColour, 1],
          metallicFactor: 0.05,
          roughnessFactor: 0.06,
        },
        doubleSided: true,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: posArr.length / 3,
        type: 'VEC3',
        min,
        max,
      },
      { bufferView: 1, componentType: 5126, count: normArr.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: idxArr.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOff, byteLength: pad4(posBytes.length), target: 34962 },
      { buffer: 0, byteOffset: normOff, byteLength: pad4(normBytes.length), target: 34962 },
      { buffer: 0, byteOffset: idxOff, byteLength: pad4(idxBytes.length), target: 34963 },
    ],
    buffers: [{ byteLength: binLength }],
  };

  const jsonChunk = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPad = pad4(jsonChunk.length) - jsonChunk.length;
  const jsonPadded = Buffer.concat([jsonChunk, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = binLength % 4 === 0 ? 0 : 4 - (binLength % 4);
  const binPadded = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);

  const total = 12 + 8 + jsonPadded.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonPadded.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binPadded.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'
  return Buffer.concat([header, jsonHeader, jsonPadded, binHeader, binPadded]);
}

const written = [];
for (const [hue, colour] of Object.entries(HUE_COLOURS)) {
  const geo = buildBrilliant({});
  const glb = buildGlb(geo, colour);
  const file = join(outDir, `brilliant-${hue}.glb`);
  writeFileSync(file, glb);
  written.push(`${file} (${(glb.length / 1024).toFixed(1)} KB)`);
}
console.log(`exported ${written.length} GLB files:`);
for (const line of written) console.log('  ' + line);
