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

const UPLOAD_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Structural validation beyond the magic bytes (no pixel decoding). */
function validatePng(buffer: Buffer): void {
  let pos = 8;
  let first = true;
  let sawData = false;
  let sawEnd = false;
  while (pos + 12 <= buffer.length) {
    const size = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const total = 12 + size;
    if (pos + total > buffer.length) throw new Error('truncated PNG chunk');
    const expected = buffer.readUInt32BE(pos + 8 + size);
    const actual = crc32(buffer.subarray(pos + 4, pos + 8 + size));
    if (expected !== actual) throw new Error('PNG chunk checksum failed');
    if (first && (type !== 'IHDR' || size !== 13)) throw new Error('PNG must start with IHDR');
    first = false;
    if (type === 'IDAT') sawData = true;
    if (type === 'IEND') { sawEnd = true; pos += total; break; }
    pos += total;
  }
  if (!sawData || !sawEnd) throw new Error('incomplete PNG');
}

function validateJpeg(buffer: Buffer): void {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('invalid JPEG');
  let pos = 2;
  let sawScan = false;
  while (pos + 1 < buffer.length) {
    if (buffer[pos] !== 0xff) throw new Error('corrupt JPEG marker');
    const marker = buffer[pos + 1]!;
    if (marker === 0xd9) {
      if (!sawScan) throw new Error('JPEG has no scan');
      return;
    }
    if (marker === 0xda) {
      sawScan = true;
      // Entropy-coded data follows; require a terminal EOI somewhere after it.
      const eoi = buffer.lastIndexOf(Buffer.from([0xff, 0xd9]));
      if (eoi <= pos) throw new Error('truncated JPEG');
      return;
    }
    if (marker >= 0xd0 && marker <= 0xd8) { pos += 2; continue; }
    if (pos + 4 > buffer.length) throw new Error('truncated JPEG segment');
    const length = buffer.readUInt16BE(pos + 2);
    if (length < 2 || pos + 2 + length > buffer.length) throw new Error('corrupt JPEG segment');
    pos += 2 + length;
  }
  throw new Error('incomplete JPEG');
}

function validateWebp(buffer: Buffer): void {
  if (buffer.length < 20) throw new Error('invalid WebP');
  const riffSize = buffer.readUInt32LE(4);
  if (riffSize + 8 !== buffer.length) throw new Error('WebP RIFF size mismatch');
  let pos = 12;
  let sawImage = false;
  while (pos + 8 <= buffer.length) {
    const type = buffer.toString('ascii', pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    const total = 8 + size + (size % 2);
    if (pos + total > buffer.length) throw new Error('truncated WebP chunk');
    if (['VP8 ', 'VP8L', 'VP8X'].includes(type)) sawImage = true;
    pos += total;
  }
  if (!sawImage) throw new Error('WebP has no image data');
}

export function sniffImage(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

function stripJpeg(buffer: Buffer): Buffer {
  const out: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let pos = 2;
  while (pos + 1 < buffer.length) {
    if (buffer[pos] !== 0xff) {
      out.push(buffer.subarray(pos));
      break;
    }
    const marker = buffer[pos + 1]!;
    if (marker === 0xd9) {
      out.push(buffer.subarray(pos, pos + 2));
      break;
    }
    if (marker === 0xda) {
      out.push(buffer.subarray(pos));
      break;
    }
    if (marker >= 0xd0 && marker <= 0xd8) {
      out.push(buffer.subarray(pos, pos + 2));
      pos += 2;
      continue;
    }
    if (pos + 4 > buffer.length) {
      out.push(buffer.subarray(pos));
      break;
    }
    const length = buffer.readUInt16BE(pos + 2);
    const total = 2 + length;
    if (length < 2 || pos + total > buffer.length) {
      out.push(buffer.subarray(pos));
      break;
    }
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) out.push(buffer.subarray(pos, pos + total));
    pos += total;
  }
  return Buffer.concat(out);
}

function stripPng(buffer: Buffer): Buffer {
  const drop = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
  const out: Buffer[] = [PNG_SIGNATURE];
  let pos = 8;
  while (pos + 12 <= buffer.length) {
    const size = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const total = 12 + size;
    if (pos + total > buffer.length) {
      out.push(buffer.subarray(pos));
      break;
    }
    if (!drop.has(type)) out.push(buffer.subarray(pos, pos + total));
    pos += total;
  }
  return Buffer.concat(out);
}

function stripWebp(buffer: Buffer): Buffer {
  const out: Buffer[] = [];
  let pos = 12;
  while (pos + 8 <= buffer.length) {
    const type = buffer.toString('ascii', pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    const total = 8 + size + (size % 2);
    if (pos + total > buffer.length) break;
    if (type !== 'EXIF' && type !== 'XMP ') out.push(buffer.subarray(pos, pos + total));
    pos += total;
  }
  const body = Buffer.concat(out);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(4 + body.length, 4);
  header.write('WEBP', 8, 'ascii');
  return Buffer.concat([header, body]);
}

/**
 * Sniff the real format, reject MIME mismatches, and remove metadata chunks.
 * No image codec is needed: the bytes are re-framed, not re-encoded.
 */
export function sanitizeImage(buffer: Buffer, declaredMime: string): { buffer: Buffer; mime: string } {
  if (!UPLOAD_MIME.has(declaredMime)) throw new Error('unsupported image type — use JPEG, PNG or WebP');
  const actual = sniffImage(buffer);
  if (!actual) throw new Error('invalid image data');
  if (actual !== declaredMime) throw new Error('image content does not match its declared type');
  if (actual === 'image/jpeg') { validateJpeg(buffer); return { buffer: stripJpeg(buffer), mime: actual }; }
  if (actual === 'image/png') { validatePng(buffer); return { buffer: stripPng(buffer), mime: actual }; }
  validateWebp(buffer);
  return { buffer: stripWebp(buffer), mime: actual };
}

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
