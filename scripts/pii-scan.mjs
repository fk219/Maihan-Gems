#!/usr/bin/env node
/**
 * scripts/pii-scan.mjs
 *
 * SG-14 guardrail: "No PII in logs, analytics or embeddings."
 *
 * Scans application SOURCE (not test fixtures, which legitimately hold fake
 * PII) for log/telemetry lines carrying raw PII-ish identifiers. Catches the
 * realistic drift: someone logging a request body, query string, or a named
 * user field. Regex-level and advisory of review — it is a CI tripwire, not
 * a guarantee; the honest guarantee remains the test suite + review.
 *
 *   node scripts/pii-scan.mjs            # scan; exit 1 on findings
 *   node scripts/pii-scan.mjs --report   # list findings without failing
 */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const reportOnly = process.argv.includes('--report');
const repoRoot = resolve(process.cwd(), import.meta.url ? '.' : '.');

// Source roots that RUN in production (apps + runtime packages). Test and
// fixture trees are excluded: fake PII there is intentional test data.
const SCAN_ROOTS = [
  'apps/web/src',
  'apps/worker/src',
  'packages/ai/src',
  'packages/observability/src',
  'packages/domain/src/commerce',
  'packages/domain/src/auth',
  'packages/db/src/auth',
];

// Scan only real app files.
const FILE_SUFFIXES = ['.ts', '.tsx', '.mjs'];

// Spots where PII would live if leaked INTO observability surfaces.
const ORE = /logger\.(info|warn|error|debug)|withSpan|\.inc\(|\.observe\(|console\.(log|info|warn|error)/;

// PII-style payloads worth flagging inside observability calls.
const PII_PATTERNS = [
  [/\bemail\b\s*[:=]/i, 'email identifier'],
  [/\bphone\b\s*[:=]|telephone/i, 'phone identifier'],
  [/\bpassword\b\s*[:=]/i, 'password literal'],
  [/\bip[_-]?(address|addr)\b\s*[:=]/i, 'IP address field'],
  [/\bcard\b\.?(number|no)\b\s*[:=]/i, 'card number field'],
  [/\bsession[_-]?token\b\s*[:=]\s*(cwd|\w+\.)/i, 'raw session token assignment'],
];

let findings = 0;
const flagged = [];

function walk(dir) {
  if (!statSync(dir).isDirectory()) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(resolve(repoRoot), full);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      walk(full);
      continue;
    }
    if (!FILE_SUFFIXES.some((s) => entry.endsWith(s))) continue;
    // Guardrail TESTS deliberately pass fake PII to prove scrubbing works —
    // they are the proof of SG-14, not a violation of it.
    if (entry.endsWith('.spec.ts') || entry.endsWith('.spec.tsx')) continue;

    const lines = readFileSync(full, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/\.(info|warn|error|debug|log|inc|observe)\(/.test(line) && !/withSpan\(/.test(line)) continue;
      const window = [line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join('\n');
      if (!ORE.test(window)) continue;
      for (const [pattern, kind] of PII_PATTERNS) {
        if (pattern.test(window)) {
          findings += 1;
          flagged.push(`PII-SCAN ${rel}:${i + 1}: possible ${kind} near an observability call`);
          break;
        }
      }
    }
  }
}

const require = createRequire(import.meta.url);
void require;
for (const root of SCAN_ROOTS) {
  const abs = resolve(process.cwd(), root);
  try {
    statSync(abs);
    walk(abs);
  } catch {
    // root absent in this checkout — fine
  }
}

if (flagged.length > 0) {
  for (const f of flagged) console.log(f);
}

if (findings > 0 && !reportOnly) {
  console.error(`pii-scan: ${findings} finding(s) — review each line. A finding is not proof of a leak, but CI does not merge on it.`);
  process.exit(1);
}
console.log(`pii-scan: clean — 0 findings across the scanned runtime sources.`);
