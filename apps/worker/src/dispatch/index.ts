/**
 * apps/worker/src/dispatch/index.ts
 *
 * The dispatch surface. `main` composes these; tests import them directly.
 */
export { OutboxDispatcher, type DispatchPassResult, type OutboxDispatcherOptions } from './dispatcher.js';
export { JobRunner, type JobPassResult, type JobRunnerOptions } from './job-runner.js';
export {
  HandlerRegistry,
  JobHandlerRegistry,
  type ClaimedJob,
  type DispatchEvent,
  type EventHandler,
  type EventHandlerRegistration,
  type HandlerContext,
  type JobHandler,
} from './registry.js';
export { PermanentDispatchError, PermanentJobError, describeFailure, isPermanentFailure } from './errors.js';
export { parseEventPayload, parseJobPayload, type SafeParser } from './parse.js';
export { SILENT_LOGGER, MemoryWorkerLogger, type WorkerLogger } from './logger.js';
export { delay } from './delay.js';
