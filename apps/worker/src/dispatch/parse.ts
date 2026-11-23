/**
 * apps/worker/src/dispatch/parse.ts
 *
 * Payload validation before execution.
 *
 * A job or event payload is untrusted input: it crossed a database boundary and
 * may have been written by an older producer. It is validated against its
 * contract BEFORE a handler touches it, and a failure is permanent — retrying a
 * payload that can never be valid only delays the alert (technical_design/27
 * §8).
 *
 * The parser is described structurally rather than by importing Zod, so this
 * module has no schema-library dependency. The schemas come from
 * `@maihan/contracts`.
 *
 * The error names the FIELD PATH only. It never echoes the value, because a
 * value can be an address.
 */
import { PermanentDispatchError, PermanentJobError } from './errors.js';

export interface SafeParser<T> {
  safeParse(
    value: unknown,
  ):
    | { readonly success: true; readonly data: T }
    | {
        readonly success: false;
        readonly error: { readonly issues: ReadonlyArray<{ readonly path: ReadonlyArray<string | number> }> };
      };
}

function describeIssues(error: { issues: ReadonlyArray<{ path: ReadonlyArray<string | number> }> }): string {
  const paths = error.issues
    .map((issue) => (issue.path.length === 0 ? '<root>' : issue.path.join('.')))
    .slice(0, 8);
  return paths.length === 0 ? 'no issue path' : paths.join(', ');
}

export function parseEventPayload<T>(
  schema: SafeParser<T>,
  payload: unknown,
  eventType: string,
): T {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  throw new PermanentDispatchError(
    `${eventType} payload does not match its schema (${describeIssues(result.error)})`,
  );
}

export function parseJobPayload<T>(
  schema: SafeParser<T>,
  payload: unknown,
  jobType: string,
): T {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  throw new PermanentJobError(
    `${jobType} payload does not match its schema (${describeIssues(result.error)})`,
  );
}
