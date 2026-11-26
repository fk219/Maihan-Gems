#!/usr/bin/env node
/**
 * scripts/check-slop.mjs
 *
 * Enforces DESIGN_DIRECTION.md section 8 on the storefront source.
 * Fails closed: any hit is a violation.
 *
 * Run: node scripts/check-slop.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] ?? 'apps/web/src';
const BANNED = [
  'timeless elegance',
  'crafted with passion',
  'elevate your style',
  'not just a gemstone',
  'unlock the',
  'discover the extraordinary',
  'experience the timeless',
  '100% natural',
  '100% verified',
  'happy clients',
  'happy customers',
  'world-class',
  'unparalleled',
  'breathtaking',
  'exquisite craftsmanship',
];

const HITS = [];
const DEMO = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(tsx|ts|mdx)$/.test(name)) scan(full);
  }
}

function scan(file) {
  const text = readFileSync(file, 'utf8');
  const lower = text.toLowerCase();
  for (const phrase of BANNED) {
    let index = lower.indexOf(phrase);
    while (index !== -1) {
      const line = text.slice(0, index).split('\n').length;
      HITS.push({ file: relative(process.cwd(), file), line, phrase });
      index = lower.indexOf(phrase, index + phrase.length);
    }
  }
  if (/DEMO_CONTENT|Demo content/i.test(text) && /page\.tsx$/.test(file)) {
    DEMO.push(relative(process.cwd(), file));
  }
}

walk(ROOT);

if (HITS.length > 0) {
  console.error(`slop-check: ${HITS.length} banned phrase(s)`);
  for (const h of HITS.slice(0, 60)) console.error(`  ${h.file}:${h.line}  "${h.phrase}"`);
  if (HITS.length > 60) console.error(`  ... ${HITS.length - 60} more`);
}

if (DEMO.length > 0) {
  console.error(`slop-check: ${DEMO.length} page(s) render demo content`);
  for (const d of DEMO) console.error(`  ${d}`);
}

if (HITS.length === 0 && DEMO.length === 0) {
  console.log('slop-check: clean');
  process.exit(0);
}
process.exit(1);
