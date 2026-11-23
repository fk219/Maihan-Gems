/**
 * apps/worker/src/dispatch/logger.ts
 *
 * The narrow logging surface the dispatcher and handlers use.
 *
 * It is a structural subset of `@maihan/observability`'s Logger, so `main`
 * passes the real one and tests pass a silent or recording one. Keeping the
 * interface here means the dispatcher does not depend on the observability
 * package to be testable.
 *
 * Callers log identifiers and outcomes. They never log a recipient, a subject,
 * a body or a job payload.
 */

export interface WorkerLogger {
  info(event: string, message: string, data?: Record<string, unknown>): void;
  warn(event: string, message: string, data?: Record<string, unknown>): void;
  error(event: string, message: string, data?: Record<string, unknown>): void;
}

export const SILENT_LOGGER: WorkerLogger = Object.freeze({
  info(): void {},
  warn(): void {},
  error(): void {},
});

/** A recording logger for tests. Never used by production wiring. */
export class MemoryWorkerLogger implements WorkerLogger {
  readonly records: Array<{ level: 'info' | 'warn' | 'error'; event: string; data?: Record<string, unknown> }> = [];

  info(event: string, _message: string, data?: Record<string, unknown>): void {
    this.records.push({ level: 'info', event, data });
  }

  warn(event: string, _message: string, data?: Record<string, unknown>): void {
    this.records.push({ level: 'warn', event, data });
  }

  error(event: string, _message: string, data?: Record<string, unknown>): void {
    this.records.push({ level: 'error', event, data });
  }
}
