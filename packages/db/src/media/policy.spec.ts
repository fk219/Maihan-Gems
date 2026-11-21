/** packages/db/src/media/policy.spec.ts — A3 upload policy. */
import { describe, expect, it } from 'vitest';
import { MediaPolicyError, sniffContentType, validateUpload } from './policy.js';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const GLB = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00]);

describe('sniffing', () => {
  it('identifies the accepted formats from bytes', () => {
    expect(sniffContentType(JPEG)).toBe('image/jpeg');
    expect(sniffContentType(PNG)).toBe('image/png');
    expect(sniffContentType(GLB)).toBe('model/gltf-binary');
    expect(sniffContentType(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts a real JPEG declared as JPEG', () => {
    expect(validateUpload({ kind: 'IMAGE', declaredContentType: 'image/jpeg', bytes: JPEG })).toEqual({
      contentType: 'image/jpeg',
      size: JPEG.byteLength,
    });
  });

  it('rejects a declared type that the bytes contradict', () => {
    expect(() =>
      validateUpload({ kind: 'IMAGE', declaredContentType: 'image/png', bytes: JPEG }),
    ).toThrow(MediaPolicyError);
  });

  it('rejects empty input', () => {
    expect(() =>
      validateUpload({ kind: 'IMAGE', declaredContentType: 'image/jpeg', bytes: new Uint8Array() }),
    ).toThrow(MediaPolicyError);
  });

  it('rejects an unsupported declared type', () => {
    expect(() =>
      validateUpload({ kind: 'IMAGE', declaredContentType: 'text/html', bytes: JPEG }),
    ).toThrow(MediaPolicyError);
  });

  it('rejects an oversized image', () => {
    const huge = new Uint8Array(13 * 1024 * 1024);
    huge.set(JPEG);
    expect(() =>
      validateUpload({ kind: 'IMAGE', declaredContentType: 'image/jpeg', bytes: huge }),
    ).toThrow(MediaPolicyError);
  });
});
