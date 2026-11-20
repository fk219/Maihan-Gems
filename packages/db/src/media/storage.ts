/**
 * packages/db/src/media/storage.ts
 *
 * Track A1 — the object-storage port.
 *
 * The store cannot show a product until media has somewhere to live. This is
 * the boundary: callers depend on `ObjectStorage`, never on a vendor SDK. Two
 * drivers follow — local disk for development and tests, an S3-compatible HTTP
 * driver for R2/S3 in deployment. No new dependency is introduced by the port.
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

export interface PutObjectInput {
  /** Content-addressed key, never user-supplied. */
  readonly key: string;
  readonly body: Uint8Array;
  readonly contentType: string;
}

export interface StoredObject {
  readonly key: string;
  readonly size: number;
  readonly contentType: string;
  readonly sha256: string;
}

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<Uint8Array | null>;
  head(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /** A browser-usable URL. Local driver returns a relative path. */
  publicUrl(key: string): string;
}

export class StorageKeyError extends Error {
  constructor(reason: string) {
    super(`STORAGE_KEY: ${reason}`);
    this.name = 'StorageKeyError';
  }
}

/**
 * Content-addressed key: `ab/cd/<sha256>.<ext>`.
 * Content addressing makes uploads idempotent and prevents path traversal —
 * the key is derived from bytes, not from a filename.
 */
export function contentAddressedKey(bytes: Uint8Array, contentType: string): string {
  const sha = createHash('sha256').update(bytes).digest('hex');
  return `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.${extensionFor(contentType)}`;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const EXTENSIONS: Readonly<Record<string, string>> = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'model/gltf-binary': 'glb',
});

export function extensionFor(contentType: string): string {
  const ext = EXTENSIONS[contentType];
  if (ext === undefined) throw new StorageKeyError(`unsupported content type ${contentType}`);
  return ext;
}

/** Reject anything that is not a normalised `aa/bb/hash.ext` style key. */
export function assertSafeKey(key: string): void {
  if (key.length === 0 || key.length > 300) throw new StorageKeyError('length');
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) {
    throw new StorageKeyError('traversal');
  }
  if (!/^[0-9a-zA-Z][0-9a-zA-Z._/-]*$/.test(key)) throw new StorageKeyError('characters');
}

export class LocalDiskStorage implements ObjectStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathFor(key: string): string {
    assertSafeKey(key);
    const full = normalize(join(this.root, key));
    if (!full.startsWith(this.root + sep)) throw new StorageKeyError('outside root');
    return full;
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const full = this.pathFor(input.key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, input.body);
    return {
      key: input.key,
      size: input.body.byteLength,
      contentType: input.contentType,
      sha256: sha256Hex(input.body),
    };
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.pathFor(key)));
    } catch {
      return null;
    }
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const full = this.pathFor(key);
      const info = await stat(full);
      const bytes = new Uint8Array(await readFile(full));
      return {
        key,
        size: info.size,
        contentType: 'application/octet-stream',
        sha256: sha256Hex(bytes),
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  publicUrl(key: string): string {
    assertSafeKey(key);
    return `/media/${key}`;
  }
}
