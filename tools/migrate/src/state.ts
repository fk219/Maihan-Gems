/**
 * tools/migrate — durable stage state over the LOCKED `import_batches` table.
 *
 * Plan task 10 requires: resumable stage execution, durable completed-stage
 * state (never process memory), retry-safe failure handling and auditability.
 * The locked schema already owns the pipeline-state table the architecture
 * designed for this purpose (SoT 8.4 / migration 0003):
 *
 *     import_batches (batch_key UNIQUE, source_artifact, source_sha256,
 *                     status job_state, started_at, finished_at, counters,
 *                     notes, created_at)
 *
 * Stage identity rule: each stage execution is ONE import_batches row whose
 * `batch_key` is the STABLE stage key ("stage:verify-artifacts"). Adding a
 * schema table would be a schema change (rejected by the Task 10 gates);
 * reusing the pipeline's own state table is the zero-infrastructure design
 * the commit already locks in.
 *
 * Status mapping (job_state):
 *   RUNNING    -> SUCCEEDED (finished_at set, audit note)
 *   RUNNING    -> FAILED    (finished_at set, reason in notes, retryable)
 *   SUCCEEDED  -> skip on rerun (idempotency: no work repeats)
 *   FAILED     -> retry resets to RUNNING (same row, new started_at)
 *
 * Concurrency: one runner process per stage chain is assumed at Phase 1
 * (single-operator tooling); the advisory-lock pattern used by the DDL
 * migrator arrives with the Phase 2 scheduled runs if needed.
 */
import pg from 'pg';

const { Client } = pg;

export type StageStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';

export interface StageStateRow {
  readonly stageKey: string;
  readonly status: StageStatus;
  readonly sourceArtifact: string | null;
  readonly notes: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

function normalizeStatus(value: string): StageStatus {
  const known: readonly string[] = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'];
  return known.includes(value) ? (value as StageStatus) : 'FAILED';
}

export class MigrationState {
  private readonly client: pg.Client;

  private constructor(databaseUrl: string) {
    this.client = new Client({ connectionString: databaseUrl });
  }

  static async connect(databaseUrl: string): Promise<MigrationState> {
    const state = new MigrationState(databaseUrl);
    await state.client.connect();
    return state;
  }

  async end(): Promise<void> {
    await this.client.end().catch(() => undefined);
  }

  /** Read the durable state of one stage; null when the stage never ran. */
  async get(stageKey: string): Promise<StageStateRow | null> {
    const r = await this.client.query<{
      batch_key: string;
      status: string;
      source_artifact: string | null;
      notes: string | null;
      started_at: string | null;
      finished_at: string | null;
    }>(
      `SELECT batch_key, status::text AS status, source_artifact, notes, started_at::text AS started_at, finished_at::text AS finished_at
       FROM import_batches WHERE batch_key = $1`,
      [stageKey],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      stageKey: row.batch_key,
      status: normalizeStatus(row.status),
      sourceArtifact: row.source_artifact,
      notes: row.notes,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  }

  /**
   * Begin (or re-begin) a stage. A SUCCEEDED stage is never reset by the
   * caller's contract — the runner checks get() first, this upsert is only
   * reached for QUEUED/FAILED/absent rows.
   */
  async markRunning(options: { stageKey: string; sourceArtifact: string; notes?: string }): Promise<void> {
    await this.client.query(
      `INSERT INTO import_batches (batch_key, source_artifact, status, started_at, notes)
       VALUES ($1, $2, 'RUNNING', now(), $3)
       ON CONFLICT (batch_key) DO UPDATE
         SET status = 'RUNNING',
             source_artifact = EXCLUDED.source_artifact,
             notes = EXCLUDED.notes,
             started_at = now(),
             finished_at = NULL,
             records_seen = 0,
             records_accepted = 0,
             records_rejected = 0,
             records_quarantined = 0`,
      [options.stageKey, options.sourceArtifact, options.notes ?? null],
    );
  }

  async markSucceeded(options: { stageKey: string; notes: string }): Promise<void> {
    await this.client.query(
      `UPDATE import_batches
       SET status = 'SUCCEEDED', finished_at = now(), records_accepted = 1, notes = $2
       WHERE batch_key = $1`,
      [options.stageKey, options.notes],
    );
  }

  /** A failed stage is marked FAILED and stays retryable (never DEAD_LETTER by default). */
  async markFailed(options: { stageKey: string; reason: string }): Promise<void> {
    await this.client.query(
      `INSERT INTO import_batches (batch_key, source_artifact, status, started_at, finished_at, notes)
       VALUES ($1, '-', 'FAILED', now(), now(), $2)
       ON CONFLICT (batch_key) DO UPDATE
         SET status = 'FAILED', finished_at = now(), notes = EXCLUDED.notes`,
      [options.stageKey, options.reason],
    );
  }

  /** The stage's durable import_batches.id (null when the stage never ran). */

  async stageBatchId(stageKey: string): Promise<string | null> {
    const r = await this.client.query<{ id: string }>('SELECT id::text AS id FROM import_batches WHERE batch_key = $1', [stageKey]);
    return r.rows[0]?.id ?? null;
  }

  /** Every stage row, for the status command. */
  async listStages(): Promise<StageStateRow[]> {
    const r = await this.client.query<{ batch_key: string; status: string; source_artifact: string | null; notes: string | null; started_at: string | null; finished_at: string | null }>(
      `SELECT batch_key, status::text AS status, source_artifact, notes, started_at::text AS started_at, finished_at::text AS finished_at
       FROM import_batches ORDER BY created_at`,
    );
    return r.rows.map((row) => ({
      stageKey: row.batch_key,
      status: normalizeStatus(row.status),
      sourceArtifact: row.source_artifact,
      notes: row.notes,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    }));
  }

  /** Guard mirroring the DDL migrator: the dev contract is maihan_dev*. */
  async assertDevContract(): Promise<string> {
    const r = await this.client.query<{ db: string }>('SELECT current_database() AS db');
    const db = r.rows[0]?.db ?? '';
    if (!db.startsWith('maihan_dev')) {
      throw new Error(`refusing to run: current_database() is "${db}", the dev contract is maihan_dev (Task 2)`);
    }
    return db;
  }
}
