/**
 * apps/worker/src/handlers/email-jobs.ts
 *
 * Enqueue a notification for delivery. Event handlers call this; they do not
 * touch the EmailPort themselves. That separation is what makes "one handler
 * sends email" true rather than aspirational, and it gives every send a
 * `job_key` — the idempotency boundary that survives a redelivered event.
 *
 * The job payload carries the recipient address because the sender needs it
 * (technical_design/27 §10 permits PII a handler requires). The OUTBOX payload
 * does not: it carries identifiers only.
 */
import {
  EMAIL_QUEUE,
  EMAIL_SEND_JOB_TYPE,
  type NotificationRequest,
} from '@maihan/contracts';
import { enqueueJob, type CatalogDatabase } from '@maihan/db';

export interface EnqueueEmailResult {
  readonly inserted: boolean;
}

export interface EmailJobEnqueuer {
  /** `jobKey` is the idempotency boundary; a duplicate is a no-op. */
  enqueueEmail(jobKey: string, request: NotificationRequest): Promise<EnqueueEmailResult>;
}

export function createEmailJobEnqueuer(db: CatalogDatabase): EmailJobEnqueuer {
  return {
    async enqueueEmail(jobKey: string, request: NotificationRequest): Promise<EnqueueEmailResult> {
      const result = await enqueueJob(db, {
        jobKey,
        queue: EMAIL_QUEUE,
        jobType: EMAIL_SEND_JOB_TYPE,
        payload: request as unknown as Record<string, unknown>,
      });
      return { inserted: result.inserted };
    },
  };
}
