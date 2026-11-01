import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readMedia, removeStoredImage, sanitizeImage, sniffImage, storeImage } from '../media.js';

describe('media storage (local driver)', () => {
  let dir = '';
  let previous: string | undefined;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'maihan-media-'));
    previous = process.env['MEDIA_DIR'];
    process.env['MEDIA_DIR'] = dir;
  });
  afterAll(async () => {
    if (previous === undefined) delete process.env['MEDIA_DIR'];
    else process.env['MEDIA_DIR'] = previous;
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a file, serves it back, and removes it', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]);
    const stored = await storeImage(bytes, 'image/jpeg');
    expect(stored.file).toMatch(/^[a-f0-9-]{36}\.jpg$/);
    expect(stored.url).toBe(`/media/${stored.file}`);

    const read = await readMedia(stored.file);
    expect(read?.mime).toBe('image/jpeg');
    expect(read?.data.equals(bytes)).toBe(true);

    await removeStoredImage(stored.url);
    expect(await readMedia(stored.file)).toBeNull();
  });

  it('rejects traversal and unsupported types', async () => {
    expect(await readMedia('../etc/passwd')).toBeNull();
    expect(await readMedia('not-a-file.jpg')).toBeNull();
    await expect(storeImage(Buffer.from('x'), 'text/plain')).rejects.toThrow();
  });

  it('ignores external URLs on removal', async () => {
    await expect(removeStoredImage('https://example.org/a.jpg')).resolves.toBeUndefined();
  });
});


describe('image metadata stripping', () => {
  const jpegWithExif = (): Buffer => {
    const app1Payload = Buffer.from('Exif\0\0', 'binary');
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 12]), app1Payload, Buffer.alloc(4)]);
    return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, Buffer.from([0xff, 0xda, 0x00, 0x04, 0x00, 0x00, 0x11, 0x22, 0xff, 0xd9])]);
  };

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();
  const crc32 = (buffer: Buffer): number => {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const pngWithText = (): Buffer => {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const chunk = (type: string, data: Buffer): Buffer => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(data.length, 0);
      head.write(type, 4, 'ascii');
      const body = Buffer.concat([head.subarray(4), data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(body), 0);
      return Buffer.concat([head, data, crc]);
    };
    return Buffer.concat([sig, chunk('IHDR', Buffer.alloc(13)), chunk('tEXt', Buffer.from('author\0GPS')), chunk('IDAT', Buffer.alloc(1)), chunk('IEND', Buffer.alloc(0))]);
  };

  const webpWithExif = (): Buffer => {
    const chunk = (type: string, data: Buffer): Buffer => {
      const head = Buffer.alloc(8);
      head.write(type, 0, 'ascii');
      head.writeUInt32LE(data.length, 4);
      return Buffer.concat([head, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
    };
    const body = Buffer.concat([chunk('EXIF', Buffer.from('meta')), chunk('VP8 ', Buffer.from('data'))]);
    const header = Buffer.alloc(12);
    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(4 + body.length, 4);
    header.write('WEBP', 8, 'ascii');
    return Buffer.concat([header, body]);
  };

  it('sniffs real formats from magic bytes', () => {
    expect(sniffImage(jpegWithExif())).toBe('image/jpeg');
    expect(sniffImage(pngWithText())).toBe('image/png');
    expect(sniffImage(webpWithExif())).toBe('image/webp');
    expect(sniffImage(Buffer.from('not an image'))).toBeNull();
  });

  it('strips JPEG EXIF/APP1 segments', () => {
    const clean = sanitizeImage(jpegWithExif(), 'image/jpeg');
    expect(clean.buffer[0]).toBe(0xff);
    expect(clean.buffer[1]).toBe(0xd8);
    expect(clean.buffer.includes(Buffer.from('Exif'))).toBe(false);
  });

  it('strips PNG text/EXIF chunks and keeps IHDR/IEND', () => {
    const clean = sanitizeImage(pngWithText(), 'image/png');
    expect(clean.buffer.toString('ascii')).not.toContain('tEXt');
    expect(clean.buffer.toString('ascii')).toContain('IHDR');
    expect(clean.buffer.toString('ascii')).toContain('IEND');
  });

  it('strips WebP EXIF/XMP chunks and fixes the RIFF size', () => {
    const clean = sanitizeImage(webpWithExif(), 'image/webp');
    expect(clean.buffer.toString('ascii', 0, 4)).toBe('RIFF');
    expect(clean.buffer.toString('ascii', 8, 12)).toBe('WEBP');
    expect(clean.buffer.toString('ascii')).not.toContain('EXIF');
    expect(clean.buffer.toString('ascii')).toContain('VP8 ');
    expect(clean.buffer.readUInt32LE(4)).toBe(clean.buffer.length - 8);
  });

  it('rejects mismatched or unsupported uploads', () => {
    expect(() => sanitizeImage(pngWithText(), 'image/jpeg')).toThrow(/does not match/);
    expect(() => sanitizeImage(Buffer.from('text'), 'image/png')).toThrow(/invalid image/);
    expect(() => sanitizeImage(jpegWithExif(), 'image/gif')).toThrow(/unsupported/);
  });
});
