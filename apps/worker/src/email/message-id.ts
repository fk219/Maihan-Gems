/**
 * apps/worker/src/email/message-id.ts
 *
 * A Message-ID is a header token, not a path and not free text. Everything
 * outside the token alphabet is removed before it reaches a header or a
 * filename, so an injected id cannot break the header, the MIME boundary or
 * the mailbox path.
 */
export function sanitizeMessageId(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 120);
  return safe.length === 0 ? 'message' : safe;
}
