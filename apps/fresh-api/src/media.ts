/**
 * Image storage seam.
 *
 * Driver: local disk (default) — files live under MEDIA_DIR (default
 * var/media at the repo root) and are served by fresh-api at /media/<file>,
 * proxied by the web app. External HTTPS URLs are stored as-is.
 *
 * An S3/R2 driver is a drop-in replacement for storeImage/readMedia once
 * object-storage credentials are approved; no base64 is written to Postgres.
 */
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const FILE_RE = /^[a-f0-9-]{36}\.(?:jpg|png|webp|gif|avif)$/;

export function mediaDir(): string {
  return process.env['MEDIA_DIR'] ?? path.resolve(import.meta.dirname, '../../../var/media');
}

export async function storeImage(buffer: Buffer, mime: string): Promise<{ file: string; url: string }> {
  const ext = EXT[mime];
  if (!ext) throw new Error(`unsupported image type '${mime}'`);
  await mkdir(mediaDir(), { recursive: true });
  const file = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(mediaDir(), file), buffer);
  return { file, url: `/media/${file}` };
}

export function mimeFor(file: string): string {
  const ext = file.split('.').pop() ?? '';
  return Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
}

export async function readMedia(file: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!FILE_RE.test(file)) return null;
  try {
    const data = await readFile(path.join(mediaDir(), file));
    return { data, mime: mimeFor(file) };
  } catch {
    return null;
  }
}

/** Remove a locally stored file (external URLs are left untouched). */
export async function removeStoredImage(url: string): Promise<void> {
  if (!url.startsWith('/media/')) return;
  const file = url.slice('/media/'.length);
  if (!FILE_RE.test(file)) return;
  await unlink(path.join(mediaDir(), file)).catch(() => undefined);
}
