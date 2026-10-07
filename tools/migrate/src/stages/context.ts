/**
 * tools/migrate/src/stages/context.ts — shared stage-execution plumbing
 * (Phase 2; plan tasks 11-20).
 *
 * Stages consume READ-ONLY evidence artifacts whose SHA-256 the runner has
 * already verified against docs/evidence/MANIFEST.md before execution. This
 * module carries the common contract:

 *   - `StageContext` — the verified artifact paths, the durable
 *     `import_batches` row id of the running stage (provenance anchor for
 *     every inserted row), the database client and a writer.
 *
 *   - `jsonLines` — a line reader for *.jsonl artifacts. The evidence
 *     discipline requires NO REWRITING of the bytes: the reader yields each
 *     line's parsed JSON object next to its 1-based line number, and every
 *     downstream write keeps the unparsed text verbatim where the schema
 *     wants it (`source_json` etc).
 *
 *   - `insertRecords` — one parameterised multi-row INSERT per batch,
 *     `ON CONFLICT <natural key> DO NOTHING`, so a full re-execution of a
 *     stage (the deep idempotency check, gate V17) is provably zero-change:
 *     identical input hashes and deterministic derivation yield identical
 *     rows that the conflict target already holds.
 *
 * No stage below normalises during load, reads the archive through anything
 * but these verified paths, or mutates the archive: the module opens files
 * read-only only.
 */
import { createReadStream, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import type { Client } from 'pg';

export interface StageContext {
  /** Postgres client dedicated to this stage execution. */
  readonly db: Client;
  /** Absolute directory the verified archive resolves under. */
  readonly archiveRoot: string;
  /** Repository root (manifest paths resolve from here). */
  readonly repoRoot: string;
  /** Durable import_batches.id of the RUNNING stage row (provenance anchor). */
  readonly importBatchId: string;
  /** Stage diagnostics writer (the runner's). */
  readonly write: (msg: string) => void;
  /** Resolve an archive-artifact name ('urls.jsonl') to its verified absolute path. */
  readonly artifactPath: (artifactName: string) => string;
}

export interface JsonLine<T = Record<string, unknown>> {
  /** 1-based line number in the artifact. */
  readonly lineNo: number;
  /** The raw UTF-8 text of the line, UNMODIFIED. */
  readonly raw: string;
  /** The parsed record. */
  readonly record: T;
}

/**
 * Read a .jsonl artifact line by line. Throws on a non-object record or
 * invalid JSON — an evidence file with a corrupt line is a provenance
 * failure, never a skipped line.
 */
export async function* jsonLines(path: string): AsyncGenerator<JsonLine> {
  const stream = createReadStream(path, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let lineNo = 0;
  for await (const line of rl) {
    lineNo += 1;
    if (line.trim().length === 0) {
      throw new Error(`evidence artifact ${path}: blank line at line ${lineNo} (evidence files are dense JSON lines)`);
    }
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`evidence artifact ${path}: line ${lineNo} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`evidence artifact ${path}: line ${lineNo} is not a JSON object`);
    }
    yield { lineNo, raw: line, record: record as Record<string, unknown> };
  }
}

/** Read a .json file (small, validated evidence like taxonomy.json). */
export function readJsonFile(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8');
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`evidence artifact ${path} does not hold a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** pg returns bigints as strings; coerce defensively without float drift. */
export function asCount(value: string | number | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) throw new Error(`non-numeric count: ${String(value)}`);
  return n;
}

/** Table row-count snapshot for the stage auditors and V17. */
export async function tableRowCount(db: Client, table: string): Promise<number> {
  const r = await db.query(`SELECT count(*)::text AS n FROM ${table}`);
  return asCount(r.rows[0]?.n ?? '0');
}
