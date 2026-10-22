/**
 * packages/db/src/operations/jobs-ops-repository.ts
 *
 * P3-2 AI-ops console reality: the jobs table (queue, state, attempts,
 * last_error) gets an operator surface — list jobs, requeue a dead-lettered
 * job (idempotent via the state guard; audited), and a tail of ai_logs.
 * Requeue is a guarded transition: only DEAD_LETTER rows move, so a
 * double-click cannot re-run a QUEUED or SUCCEEDED job.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface JobOpsRow {
  readonly id: string;
  readonly job_key: string;
  readonly queue: string;
  readonly job_type: string;
  readonly state: string;
  readonly attempts: number;
  readonly last_error: string | null;
  readonly updated_at: string;
}

export interface AiLogRow {
  readonly id: string;
  readonly module: string;
  readonly action: string;
  readonly latency_ms: number | null;
  readonly tokens_in: number | null;
  readonly tokens_out: number | null;
  readonly success: boolean;
  readonly degraded: boolean;
  readonly created_at: string;
}

export interface JobsOpsRepository {
  listJobs(opts: { queue?: string; state?: string; limit: number; offset: number }): Promise<JobOpsRow[]>;
  requeueDeadLetter(opts: { jobId: string; actorId: string }): Promise<JobOpsRow>;
  tailAiLogs(opts: { limit: number }): Promise<AiLogRow[]>;
}

const JOB_STATES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'] as const;

export function createJobsOpsRepository(db: CatalogDatabase): JobsOpsRepository {
  return {
    async listJobs({ queue, state, limit, offset }) {
      if (state !== undefined && !(JOB_STATES as readonly string[]).includes(state)) {
        throw new Error(`jobs-ops: unknown state ${state}`);
      }
      const res = await db.execute(sql`
        SELECT id, job_key, queue, job_type, state, attempts, last_error, updated_at
          FROM jobs
         WHERE 1 = 1
          ${queue !== undefined ? sql`AND queue = ${queue}` : sql``}
          ${state !== undefined ? sql`AND state = ${state}::job_state` : sql``}
         ORDER BY updated_at DESC
         LIMIT ${limit} OFFSET ${offset}
      `);
      return res.rows as unknown as JobOpsRow[];
    },

    async requeueDeadLetter({ jobId, actorId }) {
      const beforeRes = await db.execute(sql`
        SELECT id, job_key, queue, job_type, state, attempts, last_error, updated_at
          FROM jobs WHERE id = ${jobId}
      `);
      const before = beforeRes.rows[0] as unknown as JobOpsRow | undefined;
      if (before === undefined) throw new Error('jobs-ops: job not found');
      if (before.state !== 'DEAD_LETTER') {
        throw new Error(`jobs-ops: only DEAD_LETTER jobs may be requeued (job is ${before.state})`);
      }
      const res = await db.execute(sql`
        UPDATE jobs
           SET state = 'QUEUED',
               attempts = 0,
               updated_at = now()
         WHERE id = ${jobId} AND state = 'DEAD_LETTER'
        RETURNING id, job_key, queue, job_type, state, attempts, last_error, updated_at
      `);
      const row = res.rows[0] as unknown as JobOpsRow | undefined;
      if (row === undefined) throw new Error('jobs-ops: concurrent transition lost the dead-letter job');
      await db.execute(sql`
        INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason)
        VALUES (
          'ADMIN',
          NULLIF(${actorId}, '')::uuid,
          'REQUEUE_DEAD_LETTER',
          'jobs',
          ${jobId}::uuid,
          ${JSON.stringify(before)}::jsonb,
          ${JSON.stringify(row)}::jsonb,
          'Dead-lettered job requeued via AI-ops console'
        )
      `);
      void actorId;
      return row;
    },

    async tailAiLogs({ limit }) {
      const res = await db.execute(sql`
        SELECT id, module, action, latency_ms, tokens_in, tokens_out, success, degraded, created_at
          FROM ai_logs
         ORDER BY created_at DESC
         LIMIT ${limit}
      `);
      return res.rows as unknown as AiLogRow[];
    },
  };
}
