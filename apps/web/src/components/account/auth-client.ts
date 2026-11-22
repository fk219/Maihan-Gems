/**
 * apps/web/src/components/account/auth-client.ts
 *
 * The browser half of the auth forms: one POST helper and one error reader,
 * shared by the sign-in and registration surfaces so they cannot drift.
 *
 * Server contract it consumes (`src/api/envelope.ts`):
 *   success -> the handler body verbatim, e.g. `{ user, expiresAt }`
 *   failure -> `{ error: { code, message, details?, requestId, traceId } }`
 *
 * Errors are read, never constructed: the browser shows the server's message
 * (which is written to be safe to render) and never invents its own wording.
 */

export interface AuthPostResult {
  readonly ok: boolean;
  readonly status: number;
  /** Parsed JSON body, or null when the response carried none. */
  readonly body: unknown;
}

/** POST JSON with a same-origin cookie. Never throws on a non-2xx. */
export async function postAuthJson(path: string, payload: unknown): Promise<AuthPostResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    // The session lives in an HttpOnly cookie; this form is same-origin.
    credentials: 'same-origin',
  });
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

interface ErrorEnvelopeLike {
  error?: { message?: unknown; details?: unknown };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * The most specific safe message the server sent.
 *
 * Field-level details win over the generic top-level text ("Request validation
 * failed.") because the detail is the rule the customer can actually fix.
 */
export function readAuthErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const envelope = body as ErrorEnvelopeLike;
  const details = Array.isArray(envelope.error?.details) ? envelope.error.details : [];
  for (const detail of details) {
    if (typeof detail !== 'object' || detail === null) continue;
    const message = nonEmptyString((detail as { message?: unknown }).message);
    if (message !== null) return message;
  }
  return nonEmptyString(envelope.error?.message) ?? fallback;
}
