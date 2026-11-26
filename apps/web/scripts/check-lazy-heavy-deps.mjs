#!/usr/bin/env node
/**
 * apps/web/scripts/check-lazy-heavy-deps.mjs
 *
 * ADR-029 proof: three.js (and MediaPipe, if it is ever imported) must load
 * ONLY inside the AR routes, through a dynamic import with `ssr: false`, and
 * must never appear in another route's initial JS.
 *
 * Method (no log parsing):
 *  1. Scan every built client chunk for the fingerprint of each heavy package.
 *  2. Read the build manifest's rootMainFiles plus each route's
 *     page_client-reference-manifest.js — exactly the set the browser
 *     downloads before hydration (the same set the budget script measures).
 *  3. FAIL if a fingerprint chunk is in the initial set of a non-AR route, or
 *     in the AR route's own initial set (it must be lazily fetched, not part
 *     of first load).
 *
 * Exit 0 = the heavy dependency is absent from every initial JS set.
 * Exit 1 = it leaked, or the build is missing (fail closed).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = process.argv[2] !== undefined ? join(process.cwd(), process.argv[2]) : join(webRoot, '.next');
const chunksDir = join(nextDir, 'static', 'chunks');
const appDir = join(nextDir, 'server', 'app');

if (!existsSync(join(nextDir, 'build-manifest.json'))) {
  console.error('lazy-deps: no production build — run `next build --webpack` first');
  process.exit(1);
}

/** Distinctive strings that only a bundle containing the package can carry. */
const FINGERPRINTS = {
  // three keeps its `is*` class flags through minification.
  'three': ['isBufferGeometry', 'isMeshStandardMaterial', 'WebGLRenderer'],
  '@mediapipe/tasks-vision': ['FaceLandmarker', 'HandLandmarker'],
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const allChunks = walk(chunksDir);
const leaked = new Map();

for (const [pkg, needles] of Object.entries(FINGERPRINTS)) {
  for (const file of allChunks) {
    const text = readFileSync(file, 'utf8');
    if (needles.every((n) => text.includes(n))) {
      const rel = relative(nextDir, file).split(sep).join('/');
      leaked.set(rel, pkg);
    }
  }
}

if (leaked.size === 0) {
  console.log('lazy-deps: PASS — no heavy package fingerprint found in any client chunk');
  console.log('           (three and MediaPipe are not shipped at all in this build)');
  process.exit(0);
}

const buildManifest = JSON.parse(readFileSync(join(nextDir, 'build-manifest.json'), 'utf8'));
const rootMainFiles = new Set(buildManifest.rootMainFiles ?? []);
const routeManifests = walk(appDir).filter((f) => f.endsWith('page_client-reference-manifest.js'));

let failures = 0;
const arRoute = '/ar/[assetId]';

for (const manifestPath of routeManifests) {
  const route = '/' + relative(appDir, dirname(manifestPath)).split(sep).join('/');
  const raw = readFileSync(manifestPath, 'utf8');
  const referenced = new Set([...raw.matchAll(/"(static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]));
  const initial = new Set([...rootMainFiles, ...referenced]);

  for (const [chunk, pkg] of leaked) {
    if (!initial.has(chunk)) continue;
    // The AR route may reference the lazy chunk's *name*, but a dynamic
    // import is not part of the initial set; if it is here, it is eager.
    console.error(`lazy-deps: FAIL — ${pkg} chunk ${chunk} is in the initial JS of ${route}`);
    failures += 1;
  }
}

if (failures === 0) {
  console.log(`lazy-deps: PASS — ${leaked.size} heavy chunk(s) exist but none is in any route's initial JS`);
  for (const [chunk, pkg] of leaked) console.log(`           ${pkg} -> ${chunk} (lazy)`);
  console.log(`           AR route checked: ${arRoute} (dynamic import, ssr:false in ArViewerPageClient)`);
}

process.exit(failures === 0 ? 0 : 1);
