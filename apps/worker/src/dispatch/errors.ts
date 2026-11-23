/**
 * apps/worker/src/dispatch/errors.ts
 *
 * Retryability is a property of the FAILURE, not of the caller's mood.
 *
 * A handler that knows the payload can never parse, or that the aggregate no
 * longer exists, throws a `Permanent*Error`. The runner dead-letters it on the
 * first attempt instead of retrying five times before telling anyone
 * (technical_design/27 §8: "a malformed payload is not retryable").
 *
 * Everything else is treated as transient and retried with backoff. That is
 * the right default for infrastructure: a timeout, a refused connection and a
 * 5xx are all worth another attempt.
 */

export class PermanentDispatchError extends Error {
  readonly retryable = false;

  constructor(reason: string) {
    super(`[DISPATCH] permanent failure: ${reason}`);
    this.name = 'PermanentDispatchError';
  }
}

export class PermanentJobError extends Error {
  readonly retryable = false;

  constructor(reason: string) {
    super(`[JOB] permanent failure: ${reason}`);
    this.name = 'PermanentJobError';
  }
}

/** True when the failure must not be retried. */
export function isPermanentFailure(error: unknown): boolean {
  if (error instanceof PermanentDispatchError || error instanceof PermanentJobError) return true;
  if (typeof error === 'object' && error !== null && 'retryable' in error) {
    return (error as { retryable?: unknown }).retryable === false;
  }
  return false;
}

/**
 * A stable, log-safe description. The message is kept because a dead letter
 * without a reason is unactionable; the stack is not, because it is noise in a
 * database column and can contain a filesystem path.
 */
export function describeFailure(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return typeof error === 'string' ? error : 'unknown error';
}
