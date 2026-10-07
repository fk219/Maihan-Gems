/**
 * tools/migrate — evidence-manifest reader and SHA-256 artifact gating.
 *
 * The authoritative record of every migration-critical artifact is
 * docs/evidence/MANIFEST.md (Phase 1 Task 3): path, size, SHA-256 and
 * retention class. Before consuming ANY migration-critical artifact the
 * runner:
 *
 *   1. reads the manifest (fail loudly if it is missing or malformed —
 *      a partial manifest is a provenance failure, never a warning),
 *   2. re-computes the SHA-256 of the artifact bytes at the manifest's
 *      actual path,
 *   3. refuses execution on any mismatch (or on an absent file), naming the
 *      artifact, the expected digest, the actual digest and the stage.
 *
 * The source archive is read-only forever (AGENTS.md section 5): this module
 * opens every file for reading only, and never writes inside the archive.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export interface ManifestArtifact {
  /** Logical identity of the artifact ('urls.jsonl', 'crawler.sqlite', ...). */
  readonly artifact: string;
  /** Archive-relative actual path as recorded by the manifest. */
  readonly actualPath: string;
  readonly sizeBytes: number;
  /** Lowercase 64-hex SHA-256 the manifest recorded from the true bytes. */
  readonly sha256: string;
}

export interface ParsedManifest {
  readonly source: string;
  readonly artifacts: readonly ManifestArtifact[];
}

export class ManifestError extends Error {
  readonly artifact: string;
  constructor(artifact: string, message: string) {
    super(`manifest: ${artifact}: ${message}`);
    this.name = 'ManifestError';
    this.artifact = artifact;
  }
}

/**
 * Parse the §4 artifact table of docs/evidence/MANIFEST.md. The table rows
 * look like:
 *
 *   | 2 | `urls.jsonl` | `naturalgemstones/reverse_engineered/data/urls.jsonl` |
 *   | 30,487,158 | `<64-hex>` | A — must remain permanently | ... | ... |
 *
 * The parser is deliberately tolerant of the prose columns but strict about
 * the four machine-verifiable ones (artifact, actual path, size, digest).
 * `options.minArtifacts` defaults to 13 — the authoritative manifest's
 * physical-artifact count — so a PARTIAL real manifest refuses the run;
 * verification fixtures (a disposable temp manifest) may pass a smaller
 * floor explicitly. PROJECT_SOURCE_OF_TRUTH.md is the one manifest entry
 * that lives at the repository root rather than in the archive.
 */
export function parseManifest(manifestPath: string, options?: { minArtifacts?: number }): ParsedManifest {
  if (!existsSync(manifestPath)) {
    throw new ManifestError('MANIFEST.md', `manifest file not found at ${manifestPath}`);
  }
  const minArtifacts = options?.minArtifacts ?? 13;
  const text = readFileSync(manifestPath, 'utf8');
  const artifacts: ManifestArtifact[] = [];
  const seen = new Map<string, string>(); // actualPath -> artifact, duplicate detection
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('|') || /Artifact \| Actual path/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 6) continue;
    const hex = /`([0-9a-f]{64})`/.exec(line);
    if (hex === null) continue;
    const digest = hex[1];
    // The actual path starts with the archive root (naturalgemstones/) or is
    // the one repository-root entry; the artifact-NAME cell of some rows also
    // carries slashes ('source_snapshots/manifest.jsonl') and is excluded by
    // requiring the archive prefix.
    const pathCell = cells.find((c) => (c.startsWith('`naturalgemstones/') && c.endsWith('`')) || c === '`PROJECT_SOURCE_OF_TRUTH.md`');
    if (pathCell === undefined) continue;
    const actualPath = pathCell.slice(1, -1);
    // The size cell is the nearest purely-numeric cell (digits/commas) BEFORE
    // the digest cell: `| 30,487,158 | \`<64-hex>\` |` — the ordinal cells get
    // excluded by only searching behind the digest.
    const digestIndex = cells.findIndex((c) => c === `\`${digest}\``);
    let sizeCell: string | undefined;
    for (let i = digestIndex - 1; i >= 1; i -= 1) {
      const candidate = cells[i] ?? '';
      if (/^[0-9,]+$/.test(candidate)) {
        sizeCell = candidate;
        break;
      }
    }
    // The first cell is the row ordinal ("1a", "10"); the artifact name is the
    // next backticked cell. Rows whose first cell is already the name (long,
    // dotted) keep it.
    const first = cells[0] ?? '';
    const artifactCellValue =
      /^[0-9a-z]{1,3}$/.test(first) ? (cells[1] ?? '').replace(/`/g, '') : first.replace(/`/g, '');
    if (digest === undefined) throw new ManifestError(artifactCellValue, 'digest cell did not capture');
    if (sizeCell === undefined) throw new ManifestError(artifactCellValue, `no recorded byte size found for ${actualPath}`);
    const sizeBytes = Number(sizeCell.replaceAll(',', ''));
    if (!Number.isInteger(sizeBytes) || sizeBytes < 0) {
      throw new ManifestError(artifactCellValue, `unparseable size "${sizeCell}"`);
    }
    if (!actualPath.startsWith('naturalgemstones/') && actualPath !== 'PROJECT_SOURCE_OF_TRUTH.md') {
      throw new ManifestError(artifactCellValue, `unexpected artifact path "${actualPath}"`);
    }
    if (seen.has(actualPath)) {
      throw new ManifestError(artifactCellValue, `duplicate actual path ${actualPath} (also ${seen.get(actualPath)})`);
    }
    seen.set(actualPath, artifactCellValue);
    artifacts.push(Object.freeze({ artifact: artifactCellValue, actualPath, sizeBytes, sha256: digest }));
  }
  if (artifacts.length < minArtifacts) {
    throw new ManifestError(
      'MANIFEST.md',
      `parsed only ${artifacts.length} artifact rows; expected at least ${minArtifacts} — refusing to run on a partial manifest`,
    );
  }
  return Object.freeze({ source: manifestPath, artifacts } as ParsedManifest);
}

/**
 * Where the read-only source archive lives. `MAIHAN_ARCHIVE_ROOT` overrides
 * the default repository-relative `naturalgemstones/` (verification fixture
 * tests use this to point at a disposable COPY; the real archive is never
 * touched by tests).
 */
export function resolveArchiveRoot(explicit?: string): string {
  return explicit ?? process.env['MAIHAN_ARCHIVE_ROOT'] ?? 'naturalgemstones';
}

/** Absolute path of an artifact on disk; the `naturalgemstones/` segment maps onto archiveRoot. */
export function artifactAbsolutePath(artifact: ManifestArtifact, archiveRoot: string, repoRoot: string): string {
  if (artifact.actualPath.startsWith('naturalgemstones/')) {
    const relative = artifact.actualPath.slice('naturalgemstones/'.length);
    return path.isAbsolute(archiveRoot) ? path.join(archiveRoot, relative) : path.join(repoRoot, archiveRoot, relative);
  }
  return path.join(repoRoot, artifact.actualPath);
}

export class ArtifactVerificationError extends Error {
  readonly stage: string;
  readonly artifact: string;
  readonly expectedSha256: string;
  readonly actualSha256: string | null;
  readonly actualPath: string;

  constructor(options: {
    stage: string;
    artifact: string;
    actualPath: string;
    expectedSha256: string;
    actualSha256: string | null;
    reason: 'MISMATCH' | 'MISSING' | 'UNREADABLE';
    detail?: string;
  }) {
    super(
      `artifact verification FAILED (stage "${options.stage}", reason ${options.reason}): ${options.artifact} at ${options.actualPath}` +
        (options.reason === 'MISMATCH'
          ? ` — expected sha256 ${options.expectedSha256}, actual ${options.actualSha256}`
          : options.detail !== undefined
            ? ` — ${options.detail}`
            : ''),
    );
    this.name = 'ArtifactVerificationError';
    this.stage = options.stage;
    this.artifact = options.artifact;
    this.actualPath = options.actualPath;
    this.expectedSha256 = options.expectedSha256;
    this.actualSha256 = options.actualSha256;
  }
}

/** Digest of a file's bytes; refuses path-incident substitutes by contract with the caller. */
function sha256File(absolutePath: string): string {
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
}

/**
 * Verify ONE artifact against its manifest record. Size is checked first
 * (cheap) then the SHA-256 of the real bytes. Every failure names the
 * artifact, expected and actual digests and the stage. No secret is ever in
 * an error: paths and digests only.
 */
export function verifyArtifact(options: {
  artifact: ManifestArtifact;
  archiveRoot: string;
  repoRoot: string;
  stage: string;
}): { absolutePath: string; sha256: string; sizeBytes: number } {
  const absolutePath = artifactAbsolutePath(options.artifact, options.archiveRoot, options.repoRoot);
  if (!existsSync(absolutePath)) {
    throw new ArtifactVerificationError({
      stage: options.stage,
      artifact: options.artifact.artifact,
      actualPath: options.artifact.actualPath,
      expectedSha256: options.artifact.sha256,
      actualSha256: null,
      reason: 'MISSING',
      detail: 'the artifact is absent from this environment (restore the durable archive; do not substitute)',
    });
  }
  const stat = statSync(absolutePath);
  if (stat.size !== options.artifact.sizeBytes) {
    throw new ArtifactVerificationError({
      stage: options.stage,
      artifact: options.artifact.artifact,
      actualPath: options.artifact.actualPath,
      expectedSha256: options.artifact.sha256,
      actualSha256: sha256File(absolutePath),
      reason: 'MISMATCH',
      detail: `byte size ${stat.size} differs from the recorded ${options.artifact.sizeBytes}`,
    });
  }
  const actual = sha256File(absolutePath);
  if (actual !== options.artifact.sha256) {
    throw new ArtifactVerificationError({
      stage: options.stage,
      artifact: options.artifact.artifact,
      actualPath: options.artifact.actualPath,
      expectedSha256: options.artifact.sha256,
      actualSha256: actual,
      reason: 'MISMATCH',
    });
  }
  return { absolutePath, sha256: actual, sizeBytes: stat.size };
}

/** Verify every artifact in a manifest; verifies one at a time in manifest order. */
export function verifyManifestArtifacts(options: {
  manifest: ParsedManifest;
  archiveRoot: string;
  repoRoot: string;
  stage: string;
}): { verified: number; bytes: number } {
  let bytes = 0;
  for (const artifact of options.manifest.artifacts) {
    const result = verifyArtifact({ artifact, archiveRoot: options.archiveRoot, repoRoot: options.repoRoot, stage: options.stage });
    bytes += result.sizeBytes;
  }
  return { verified: options.manifest.artifacts.length, bytes };
}
