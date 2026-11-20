/**
 * packages/db/src/media/storage.spec.ts — A1 properties.
 *
 * The two that matter: a key can never escape the storage root, and the same
 * bytes always produce the same key (so re-uploading is a no-op, not a
 * duplicate).
 */
import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  LocalDiskStorage,
  StorageKeyError,
  assertSafeKey,
  contentAddressedKey,
  extensionFor,
} from './storage.js';

describe('content addressing', () => {
  it('derives the key from the bytes, not the name', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    expect(contentAddressedKey(a, 'image/png')).toBe(contentAddressedKey(b, 'image/png'));
    expect(contentAddressedKey(a, 'image/png')).toMatch(/^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.png$/);
  });

  it('changes the key when a byte changes', () => {
    expect(contentAddressedKey(new Uint8Array([1]), 'image/png')).not.toBe(
      contentAddressedKey(new Uint8Array([2]), 'image/png'),
    );
  });

  it('refuses an unsupported content type', () => {
    expect(() => extensionFor('application/x-msdownload')).toThrow(StorageKeyError);
  });
});

describe('key safety', () => {
  it.each(['../etc/passwd', '/abs/path', 'a\\b', 'a/../../b', ''])(
    'rejects %s',
    (key) => {
      expect(() => assertSafeKey(key)).toThrow(StorageKeyError);
    },
  );

  it('accepts a content-addressed key', () => {
    expect(() => assertSafeKey('ab/cd/' + 'a'.repeat(64) + '.jpg')).not.toThrow();
  });
});

describe('local driver', () => {
  it('round-trips put, head, get and delete', async () => {
    const root = await mkdtemp(join(tmpdir(), 'maihan-media-'));
    try {
      const storage = new LocalDiskStorage(root);
      const bytes = new Uint8Array([9, 9, 9]);
      const key = contentAddressedKey(bytes, 'image/jpeg');
      const stored = await storage.put({ key, body: bytes, contentType: 'image/jpeg' });
      expect(stored.size).toBe(3);
      expect(await storage.head(key)).not.toBeNull();
      expect(await storage.get(key)).toEqual(bytes);
      expect(storage.publicUrl(key)).toBe(`/media/${key}`);
      await storage.delete(key);
      expect(await storage.get(key)).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('cannot write outside its root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'maihan-media-'));
    try {
      const storage = new LocalDiskStorage(root);
      await expect(
        storage.put({
          key: '../escape.jpg',
          body: new Uint8Array([1]),
          contentType: 'image/jpeg',
        }),
      ).rejects.toThrow(StorageKeyError);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
