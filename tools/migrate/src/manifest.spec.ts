/**
 * Task 10 — manifest parsing rules (no database involvement).
 *
 * The authoritative manifest binds 13 physical artifacts. A PARTIAL real
 * manifest must refuse; a fixture manifest (disposable, temp) may set its own floor. Paths and digests are the only secret-free content —
 * and these are exactly what the gate verifies at run time.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ManifestError, parseManifest } from './manifest.js';

const tempRoots: string[] = [];

afterAll(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'maihan-manifest-'));
  tempRoots.push(root);
  mkdirSync(path.join(root, 'docs', 'evidence'), { recursive: true });
  return root;
}

function row(no: string, name: string, actualPath: string, bytes: number): string {
  const digest = createHash('sha256').update(`fixture:${name}`).digest('hex');
  return `| ${no} | \`${name}\` | \`${actualPath}\` | ${bytes.toLocaleString('en-US')} | \`${digest}\` | A — must remain permanently | reason | loss |`;
}

describe('parseManifest — the authoritative manifest', () => {
  it('parses all 13 physical artifacts with digests from multiple layouts', () => {
    // Only use THIS repo's real manifest.
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const manifest = parseManifest(path.join(repoRoot, 'docs', 'evidence', 'MANIFEST.md'));
    expect(manifest.artifacts.length).toBeGreaterThanOrEqual(13);
    const names = manifest.artifacts.map((a) => a.artifact);
    expect(names).toContain('urls.jsonl');
    expect(names).toContain('taxonomy.json');
    expect(names).toContain('PROJECT_SOURCE_OF_TRUTH.md');
    for (const a of manifest.artifacts) {
      expect(a.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(a.sizeBytes).toBeGreaterThan(0);
    }
  });
});

describe('parseManifest — refusal rules', () => {
  it('refuses a partial real-scale manifest (fewer than 13 artifacts)', () => {
    const root = fixtureRoot();
    const manifestPath = path.join(root, 'docs', 'evidence', 'MANIFEST.md');
    writeFileSync(manifestPath, [row('1', 'a.jsonl', 'naturalgemstones/a.jsonl', 10), row('2', 'b.jsonl', 'naturalgemstones/b.jsonl', 20)].join('\n'));
    expect(() => parseManifest(manifestPath)).toThrow(ManifestError);
  });

  it('honours an explicit smaller floor for disposable fixtures', () => {
    const root = fixtureRoot();
    const manifestPath = path.join(root, 'docs', 'evidence', 'MANIFEST.md');
    writeFileSync(manifestPath, row('1', 'a.jsonl', 'naturalgemstones/a.jsonl', 10));
    const parsed = parseManifest(manifestPath, { minArtifacts: 1 });
    expect(parsed.artifacts).toHaveLength(1);
  });

  it('refuses a missing manifest', () => {
    const root = fixtureRoot();
    expect(() => parseManifest(path.join(root, 'docs', 'evidence', 'MANIFEST.md'))).toThrowError(/not found/);
  });

  it('refuses duplicate actual paths', () => {
    const root = fixtureRoot();
    const manifestPath = path.join(root, 'docs', 'evidence', 'MANIFEST.md');
    writeFileSync(manifestPath, [row('1', 'x', 'naturalgemstones/a.jsonl', 10), row('2', 'y', 'naturalgemstones/a.jsonl', 10)].join('\n'));
    expect(() => parseManifest(manifestPath, { minArtifacts: 1 })).toThrowError(/duplicate actual path/);
  });
});
