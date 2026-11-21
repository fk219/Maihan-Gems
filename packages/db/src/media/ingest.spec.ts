/** packages/db/src/media/ingest.spec.ts — A3 pipeline. */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorage } from './storage.js';
import { MediaPolicyError } from './policy.js';
import { ingestBytes } from './ingest.js';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

let root: string;
let storage: LocalDiskStorage;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'maihan-ingest-'));
  storage = new LocalDiskStorage(root);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('ingestBytes', () => {
  it('stores a verified image under its content hash', async () => {
    const result = await ingestBytes(storage, {
      kind: 'IMAGE',
      declaredContentType: 'image/jpeg',
      bytes: JPEG,
    });
    expect(result.contentType).toBe('image/jpeg');
    expect(result.key).toMatch(/^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.jpg$/);
    expect(result.deduplicated).toBe(false);
    expect(await storage.get(result.key)).toEqual(JPEG);
  });

  it('is idempotent for identical bytes', async () => {
    const first = await ingestBytes(storage, {
      kind: 'IMAGE',
      declaredContentType: 'image/png',
      bytes: PNG,
    });
    const second = await ingestBytes(storage, {
      kind: 'IMAGE',
      declaredContentType: 'image/png',
      bytes: PNG,
    });
    expect(second.key).toBe(first.key);
    expect(second.deduplicated).toBe(true);
  });

  it('stores nothing when the type is lying', async () => {
    await expect(
      ingestBytes(storage, {
        kind: 'IMAGE',
        declaredContentType: 'image/png',
        bytes: JPEG,
      }),
    ).rejects.toThrow(MediaPolicyError);
  });

  it('stores nothing for an empty upload', async () => {
    await expect(
      ingestBytes(storage, {
        kind: 'IMAGE',
        declaredContentType: 'image/jpeg',
        bytes: new Uint8Array(),
      }),
    ).rejects.toThrow(MediaPolicyError);
  });
});
