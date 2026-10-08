/**
 * apps/web/src/modules/catalog/application/cache-codec.ts
 *
 * Task 6/7 — the ONE explicit cache codec (technical_design/25 §6:
 * "One explicit codec per value type; no ad-hoc JSON.stringify").
 *
 * Format: `{ "v": 1, "value": <payload> }`.
 *
 * The version travels inside the payload AND in the key (cache-identity
 * `v1`), so a serialization change is a miss, never a deserialization error.
 * Decoding validates the payload against the same Zod contract that defines
 * the wire shape: a malformed or foreign payload is a MISS (Task 7), never a
 * response. This is the belt to the key-version braces: even if a stale key
 * survives a version bump, the value cannot be served unvalidated.
 */
/** Structural schema: any Zod schema satisfies this (no zod import needed here). */
export interface CacheSchema<T> {
  parse(data: unknown): T;
}

const CODEC_VERSION = 1;

export function encodeCacheValue(value: unknown): string {
  return JSON.stringify({ v: CODEC_VERSION, value });
}

/**
 * Decode + validate. Returns null on ANY problem — malformed JSON, wrong
 * codec version, contract violation — which callers treat as a cache miss.
 */
export function decodeCacheValue<T>(raw: string, schema: CacheSchema<T>): T | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const envelope = parsed as { v?: unknown; value?: unknown };
  if (envelope.v !== CODEC_VERSION) return null;
  try {
    return schema.parse(envelope.value);
  } catch {
    return null;
  }
}
