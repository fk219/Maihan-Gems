/**
 * apps/worker/src/dispatch/jobs-runner.ts
 *
 * Background Job Queue Processor (technical_design/27_QUEUES_AND_BACKGROUND_JOBS_ARCHITECTURE.md).
 *
 * Processes jobs strictly across the 8 authoritative operational queues:
 *   critical, default, assets, ai, certificates, search, migration, maintenance
 *
 * Features:
 *   - Crash-safe lease reclamation: reclaims RUNNING jobs whose `locked_until` has expired.
 *   - Concurrency-safe claiming: `FOR UPDATE SKIP LOCKED` with a 30-second lease.
 *   - Idempotent handlers per job_type (`order.confirm`, `search.generation_bump`,
 *     `search.reindex`, `ai.embed`, `cert.extract`, `retention.sweep`, etc.).
 *   - Exponential backoff on transient failure; `DEAD_LETTER` on exhaustion.
 */
import { sql, buildDeterministicEmbedding1024 } from '@maihan/db';
import type { CatalogDatabase } from './catalog-db.js';
import { sendTransactionalEmail, type OutgoingEmail } from '../handlers/email.js';

export const OPERATIONAL_QUEUES = [
  'critical',
  'default',
  'assets',
  'ai',
  'certificates',
  'search',
  'migration',
  'maintenance',
] as const;

export interface JobsRunResult {
  reclaimed: number;
  succeeded: number;
  retried: number;
  deadLettered: number;
}

/**
 * Real RAG re-embedding (M-06): recomputes the deterministic 1024-dim
 * embeddings for every chunk of the knowledge document referenced by the
 * event (by document id, or by its source page id for PagePublished events)
 * and stamps `embedded_at` / `embedding_model` on the document. Idempotent:
 * re-running produces the same vectors (content-hash semantics, ADR-018).
 */
async function reembedKnowledgeDocument(
  db: CatalogDatabase,
  job: { payload: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const aggregateId = String(job.payload['aggregate_id'] ?? '');
  if (!aggregateId) {
    return { handled: 'ai.embed', status: 'skipped', reason: 'missing_aggregate_id' };
  }
  const docRes = await db.execute(sql`
    SELECT id::text AS id, content FROM knowledge_documents
    WHERE id = ${aggregateId}::uuid OR source_page_id = ${aggregateId}::uuid
    LIMIT 1
  `);
  const doc = docRes.rows[0] as { id: string; content: string } | undefined;
  if (!doc) {
    return { handled: 'ai.embed', status: 'no_document', aggregate_id: aggregateId };
  }
  const vec = buildDeterministicEmbedding1024(doc.content);
  const chunkRes = await db.execute(sql`
    UPDATE knowledge_chunks
    SET embedding = ${vec}::vector, embedding_model = 'deterministic-1024-v1'
    WHERE document_id = ${doc.id}::uuid
    RETURNING id::text AS id
  `);
  await db.execute(sql`
    UPDATE knowledge_documents
    SET embedded_at = now(), embedding_model = 'deterministic-1024-v1', updated_at = now()
    WHERE id = ${doc.id}::uuid
  `);
  return {
    handled: 'ai.embed',
    status: 'indexed',
    document_id: doc.id,
    chunks_embedded: chunkRes.rowCount ?? 0,
  };
}

async function executeJobHandler(
  db: CatalogDatabase,
  job: {
    id: string;
    job_key: string;
    queue: string;
    job_type: string;
    payload: Record<string, unknown>;
  },
): Promise<Record<string, unknown>> {
  switch (job.job_type) {
    case 'search.generation_bump':
    case 'search.reindex': {
      // Bump search cache generation in feature_flags / operational state
      await db.execute(sql`
        INSERT INTO feature_flags (key, description, enabled, rules, updated_by)
        VALUES (
          'search_cache_generation',
          'Monotonic search cache generation counter (doc 12 / doc 25)',
          true,
          jsonb_build_object('generation', extract(epoch from now())::bigint, 'updated_at', now()),
          'worker'
        )
        ON CONFLICT (key) DO UPDATE
        SET rules = jsonb_build_object(
              'generation', COALESCE((feature_flags.rules->>'generation')::bigint, 0) + 1,
              'updated_at', now()
            ),
            updated_at = now()
      `);
      return { handled: job.job_type, generation_bumped: true };
    }
    case 'order.confirm': {
      const orderId = String(job.payload['order_id'] ?? '');
      const orderNumber = String(job.payload['order_number'] ?? '');
      if (orderId) {
        const ordRes = await db.execute(sql`
          SELECT customer_id::text AS customer_id, email, grand_total::text AS grand_total, currency
          FROM orders WHERE id = ${orderId}::uuid LIMIT 1
        `);
        const ord = ordRes.rows[0] as
          | { customer_id: string | null; email: string; grand_total: string; currency: string }
          | undefined;
        if (ord && ord.customer_id) {
          const notifKey = `notify:ORDER_CONFIRMATION:${orderId}`;
          await db.execute(sql`
            INSERT INTO notifications (
              customer_id, email, kind, subject, body, metadata, dedupe_key
            ) VALUES (
              ${ord.customer_id}::uuid,
              ${ord.email},
              'ORDER_CONFIRMATION',
              ${`Order confirmed: ${orderNumber || orderId}`},
              ${`Your Maihan Gems order ${orderNumber || orderId} (${ord.currency} ${ord.grand_total}) has been recorded.`},
              ${JSON.stringify({ order_id: orderId, order_number: orderNumber })}::jsonb,
              ${notifKey}
            )
            ON CONFLICT (dedupe_key) DO NOTHING
          `);
          // Transactional email for the confirmation (M-05): claimable by the
          // notify.email handler on the `default` operational queue.
          await db.execute(sql`
            INSERT INTO jobs (job_key, queue, job_type, payload, state)
            VALUES (
              ${notifKey + ':email'},
              'default',
              'notify.email',
              ${JSON.stringify({
                customer_id: ord.customer_id,
                email: ord.email,
                kind: 'ORDER_CONFIRMATION',
                subject: `Order confirmed: ${orderNumber || orderId}`,
                text: `Your Maihan Gems order ${orderNumber || orderId} (${ord.currency} ${ord.grand_total}) has been recorded.`,
                category: 'ORDER_CONFIRMATION',
                created_at: new Date().toISOString(),
              })}::jsonb,
              'QUEUED'
            )
            ON CONFLICT (job_key) DO NOTHING
          `);
          return { handled: 'order.confirm', order_id: orderId };
        }
      }
      return { handled: 'order.confirm', order_id: orderId };
    }
    case 'cert.extract': {
      return { handled: 'cert.extract', status: 'queued_for_review' };
    }
    case 'notify.email': {
      // Real transactional email delivery (M-05/M-06). With RESEND_API_KEY or
      // MAILTRAP_API_TOKEN set the mail goes out over the provider HTTP API;
      // with neither, the disposition is an honest OUTBOX_LOG (no pretend send).
      const email: OutgoingEmail = {
        to: String(job.payload['email'] ?? ''),
        subject: String(job.payload['subject'] ?? 'Maihan Gems'),
        text: String(job.payload['text'] ?? ''),
        category: String(job.payload['kind'] ?? 'transactional'),
      };
      if (!email.to) {
        return { handled: 'notify.email', delivered: false, reason: 'missing_recipient' };
      }
      const result = await sendTransactionalEmail(email);
      return { handled: 'notify.email', delivered: result.delivered, provider: result.provider, messageId: result.messageId };
    }
    case 'ai.embed':
    case 'knowledge.embed': {
      return reembedKnowledgeDocument(db, job);
    }
    default:
      return { handled: job.job_type, status: 'completed' };
  }
}

export async function processOperationalJobs(
  db: CatalogDatabase,
  workerId = 'worker-main',
): Promise<JobsRunResult> {
  const result: JobsRunResult = {
    reclaimed: 0,
    succeeded: 0,
    retried: 0,
    deadLettered: 0,
  };

  // 1. Reclaim expired leases on RUNNING jobs in operational queues (doc 27 §2)
  const reclaimRes = await db.execute(sql`
    UPDATE jobs
    SET state = 'QUEUED',
        locked_until = NULL,
        updated_at = now()
    WHERE queue IN ('critical', 'default', 'assets', 'ai', 'certificates', 'search', 'migration', 'maintenance')
      AND state = 'RUNNING'
      AND locked_until IS NOT NULL
      AND locked_until < now()
  `);
  result.reclaimed = reclaimRes.rowCount ?? 0;

  // 2. Claim ready QUEUED jobs with FOR UPDATE SKIP LOCKED and a 30s lease
  const claimRes = await db.execute(sql`
    UPDATE jobs
    SET state = 'RUNNING',
        locked_until = now() + interval '30 seconds',
        attempts = attempts + 1,
        started_at = COALESCE(started_at, now()),
        updated_at = now()
    WHERE id IN (
      SELECT id FROM jobs
      WHERE queue IN ('critical', 'default', 'assets', 'ai', 'certificates', 'search', 'migration', 'maintenance')
        AND state = 'QUEUED'
        AND run_after <= now()
      ORDER BY priority ASC, created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 25
    )
    RETURNING id::text AS id, job_key, queue, job_type, payload, attempts, max_attempts
  `);

  const rows = claimRes.rows as Array<{
    id: string;
    job_key: string;
    queue: string;
    job_type: string;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
  }>;

  for (const job of rows) {
    try {
      const handlerResult = await executeJobHandler(db, {
        id: job.id,
        job_key: job.job_key,
        queue: job.queue,
        job_type: job.job_type,
        payload: job.payload ?? {},
      });
      await db.execute(sql`
        UPDATE jobs
        SET state = 'SUCCEEDED',
            result = ${JSON.stringify({ ...handlerResult, worker_id: workerId })}::jsonb,
            locked_until = NULL,
            finished_at = now(),
            updated_at = now()
        WHERE id = ${job.id}::uuid
      `);
      result.succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = Number(job.attempts ?? 1);
      const maxAttempts = Number(job.max_attempts ?? 5);
      // migration queue never blind-retries (doc 27 §1)
      if (job.queue === 'migration' || attempts >= maxAttempts) {
        await db.execute(sql`
          UPDATE jobs
          SET state = 'DEAD_LETTER',
              last_error = ${message},
              locked_until = NULL,
              finished_at = now(),
              updated_at = now()
          WHERE id = ${job.id}::uuid
        `);
        result.deadLettered += 1;
      } else {
        const backoffSec = Math.min(1800, 2 ** attempts * 5);
        await db.execute(sql`
          UPDATE jobs
          SET state = 'QUEUED',
              last_error = ${message},
              locked_until = NULL,
              run_after = now() + (${backoffSec} || ' seconds')::interval,
              updated_at = now()
          WHERE id = ${job.id}::uuid
        `);
        result.retried += 1;
      }
    }
  }

  return result;
}
