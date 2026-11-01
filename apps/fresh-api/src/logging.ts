/**
 * Minimal structured logging — one JSON line per event, no request bodies,
 * no query strings and no PII. Request IDs are generated per request and
 * echoed in the x-request-id response header.
 */
import crypto from 'node:crypto';

type Level = 'debug' | 'info' | 'warn' | 'error';

export function requestId(incoming: string | string[] | undefined): string {
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : crypto.randomUUID();
}

export function log(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, message, ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
