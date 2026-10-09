#!/usr/bin/env node
/**
 * apps/web/scripts/check-bundle-budgets.mjs
 *
 * Phase 4 Task 10 — the SoT 12.11 initial-JS budget, enforced.
 *
 * What "initial JS" means here (and why): for a Next.js App Router build the
 * initial payload of a route is the build manifest's `rootMainFiles` (webpack
 * runtime, react-dom, the Next client runtime, main-app) PLUS the route's own
 * client chunks from its `page_client-reference-manifest.js`. That is exactly
 * the set a modern browser downloads before the page hydrates, so this — not
 * an arbitrary "total folder size" — is compared against the SoT budget.
 *
 * Measurement is deterministic: chunk sizes are gzip of the exact file bytes
 * (`gzip -c file | wc -c` semantics), chunk selection comes from the build's
 * own manifests (no log parsing), and URLs are URL-decoded before stat so
 * bracketed dynamic-route segments resolve.
 *
 * Exit 0 = every budget met. Exit 1 = at least one exceeded or unmeasurable —
 * an unmeasurable budget FAILS (fail closed); it is never silently skipped.
 *
 * LCP note: SoT 12.11's LCP p75 < 2.5 s is a REAL-USER metric on staging. A
 * bundle measurement is a build-time proxy and cannot prove it; see the
 * budget output's explicit LCP line. Nothing here claims an LCP pass.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = process.argv[2] !== undefined ? join(process.cwd(), process.argv[2]) : join(webRoot, '.next');
const budgetsPath = process.argv[3] !== undefined ? join(process.cwd(), process.argv[3]) : join(webRoot, 'performance-budgets.json');

function fail(message) {
  console.error(`bundle-budget: ${message}`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(budgetsPath, 'utf8'));
if (!Array.isArray(config.budgets) || config.budgets.length === 0) fail(`${budgetsPath}: no budgets configured`);

const buildManifestPath = join(nextDir, 'build-manifest.json');
if (!existsSync(buildManifestPath)) {
  fail(`no production build found at ${nextDir} — run \`next build --webpack\` first (fail closed, not skipped)`);
}
const rootMainFiles = JSON.parse(readFileSync(buildManifestPath, 'utf8')).rootMainFiles ?? [];
if (rootMainFiles.length === 0) fail('build-manifest.json has an empty rootMainFiles — cannot compute initial JS');

function gzipKb(absolutePath) {
  return gzipSync(readFileSync(absolutePath)).length / 1024;
}

/** A chunk is included only if its file exists — an unbuildable chunk is an error, not a zero. */
function collectChunks(route) {
  const manifestPath = join(nextDir, 'server', 'app', route, 'page_client-reference-manifest.js');
  if (!existsSync(manifestPath)) {
    fail(`route "${route}" has no client-reference manifest — is it in the App Router build?`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const referenced = [...raw.matchAll(/"(static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]);
  const unique = [...new Set([...rootMainFiles, ...referenced])];
  const chunks = [];
  for (const ref of unique) {
    // Route segments with brackets are percent-encoded inside the manifest.
    const path = join(nextDir, decodeURIComponent(ref));
    if (!existsSync(path)) fail(`manifest references chunk that is not on disk: ${ref}`);
    chunks.push({ ref, path, kb: gzipKb(path) });
  }
  return chunks;
}

let failures = 0;
console.log('Initial-JS budget check (SoT 12.11; gzip of exact chunk bytes)\n');
for (const budget of config.budgets) {
  const chunks = collectChunks(budget.route);
  const totalKb = chunks.reduce((sum, c) => sum + c.kb, 0);
  const limitKb = budget.maxInitialJsGzipKb;
  const ok = totalKb <= limitKb;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${budget.label} (${budget.route})`);
  console.log(`      initial JS = ${totalKb.toFixed(1)} KB gzip  |  budget <= ${limitKb} KB gzip  |  ${chunks.length} chunks`);
  for (const c of [...chunks].sort((a, b) => b.kb - a.kb).slice(0, 5)) {
    console.log(`        ${c.kb.toFixed(1).padStart(8)} KB  ${c.ref}`);
  }
  if (!ok) failures += 1;
}
console.log('\nLCP p75 < 2.5 s (SoT 12.11 / plan §11) is a REAL-USER metric on staging and is NOT measurable from this bundle check.');
process.exit(failures === 0 ? 0 : 1);
