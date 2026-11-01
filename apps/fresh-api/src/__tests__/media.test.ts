import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readMedia, removeStoredImage, storeImage } from '../media.js';

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
