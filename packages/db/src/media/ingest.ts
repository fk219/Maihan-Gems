/**
 * packages/db/src/media/ingest.ts
 *
 * Track A3 — turn bytes into a stored, verified asset.
 *
 * The pipeline is deliberately byte-in, not URL-in: fetching is the caller's
 * job, so this module stays testable without a network and cannot be tricked by
 * a redirect or a slow endpoint. Order is fixed and non-negotiable:
 *
 *   validate (magic bytes + size)  ->  derive key from bytes  ->  store
 *
 * Because validation precedes key derivation, nothing that fails policy can
 * ever reach storage, and because the key is the content hash, ingesting the
 * same photograph twice is a no-op rather than a duplicate.
 */
import {
  contentAddressedKey,
  type ObjectStorage,
  type StoredObject,
} from './storage.js';
import { validateUpload, type MediaKind } from './policy.js';

export interface IngestInput {
  readonly kind: MediaKind;
  readonly declaredContentType: string;
  readonly bytes: Uint8Array;
}

export interface IngestResult extends StoredObject {
  /** True when the object already existed with identical bytes. */
  readonly deduplicated: boolean;
}

export async function ingestBytes(
  storage: ObjectStorage,
  input: IngestInput,
): Promise<IngestResult> {
  const verified = validateUpload(input);
  const key = contentAddressedKey(input.bytes, verified.contentType);

  const existing = await storage.head(key);
  if (existing !== null && existing.size === verified.size) {
    return { ...existing, contentType: verified.contentType, deduplicated: true };
  }

  const stored = await storage.put({
    key,
    body: input.bytes,
    contentType: verified.contentType,
  });
  return { ...stored, deduplicated: false };
}
