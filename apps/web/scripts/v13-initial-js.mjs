#!/usr/bin/env node
/**
 * apps/web/scripts/v13-initial-js.mjs
 *
 * What the browser must download before the page is interactive: the <script>
 * tags and `rel=preload as=script` links in the server HTML, gzipped. This is
 * the set the +15 KB gate is about; dynamically imported chunks are reported
 * separately because they are not initial.
 */
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const nextDir = path.resolve(process.cwd(), '.next');
const ROUTES = ['/admin/login', '/vendor/login', '/'];

const chunkPath = (url) => {
  const clean = url.split('?')[0];
  const rel = clean.replace(/^\/_next\//, '');
  return path.join(nextDir, rel);
};

const gzipOf = (file) => {
  try {
    return gzipSync(readFileSync(file)).length;
  } catch {
    return 0;
  }
};

const result = [];
for (const route of ROUTES) {
  const html = await fetch(`${BASE}${route}`).then((r) => r.text());
  const scripts = new Set();
  for (const match of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) scripts.add(match[1]);
  for (const match of html.matchAll(/<link[^>]+rel="preload"[^>]+as="script"[^>]+href="([^"]+\.js)"/g)) {
    scripts.add(match[1]);
  }
  for (const match of html.matchAll(/<link[^>]+href="([^"]+\.js)"[^>]+as="script"/g)) {
    scripts.add(match[1]);
  }

  let total = 0;
  const files = [];
  for (const src of scripts) {
    const file = chunkPath(src);
    const exists = (() => {
      try {
        return statSync(file).isFile();
      } catch {
        return false;
      }
    })();
    if (!exists) continue;
    const gz = gzipOf(file);
    total += gz;
    files.push({ src, gzipKb: Math.round((gz / 1024) * 10) / 10 });
  }
  result.push({ route, scripts: files.length, initialGzipKb: Math.round((total / 1024) * 10) / 10, files });
  console.log(`${route}: ${files.length} initial scripts, ${(total / 1024).toFixed(1)} KB gzip`);
}

console.log(JSON.stringify(result, null, 2));
