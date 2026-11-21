/**
 * packages/db/src/media/policy.ts
 *
 * Track A3 — the rules every uploaded asset must satisfy before it is stored.
 *
 * The limits are enforced server-side from bytes, not from a filename or a
 * client-declared type. A caller that lies about content type still hits the
 * magic-byte check. Keeping this pure means the pipeline (network, disk) and
 * the policy (decisions) can be tested independently.
 */

export type MediaKind = 'IMAGE' | 'MODEL';

export interface MediaPolicy {
  readonly maxBytes: number;
  readonly contentTypes: readonly string[];
}

/** Budgets mirror technical_design/21 (WEBAR budgets) for models. */
export const MEDIA_POLICIES: Readonly<Record<MediaKind, MediaPolicy>> = Object.freeze({
  IMAGE: Object.freeze({
    maxBytes: 12 * 1024 * 1024,
    contentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  }),
  MODEL: Object.freeze({
    maxBytes: 4 * 1024 * 1024,
    contentTypes: ['model/gltf-binary'],
  }),
});

export type MediaPolicyCode =
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'UNSUPPORTED_TYPE'
  | 'TYPE_MISMATCH';

export class MediaPolicyError extends Error {
  constructor(readonly code: MediaPolicyCode, detail: string) {
    super(`MEDIA_POLICY: ${code} (${detail})`);
    this.name = 'MediaPolicyError';
  }
}

/** Magic-byte sniffing for the formats the storefront accepts. */
export function sniffContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  // ISO-BMFF: '....ftypavif'
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  // glTF binary: 'glTF'
  if (bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    return 'model/gltf-binary';
  }
  return null;
}

export interface ValidateUploadInput {
  readonly kind: MediaKind;
  readonly declaredContentType: string;
  readonly bytes: Uint8Array;
}

/**
 * Returns the VERIFIED content type. Throws when the upload violates policy.
 * A declared type that disagrees with the bytes is rejected rather than
 * trusted, which is what stops an HTML file being served as an image.
 */
export function validateUpload(input: ValidateUploadInput): { contentType: string; size: number } {
  const policy = MEDIA_POLICIES[input.kind];
  if (input.bytes.byteLength === 0) throw new MediaPolicyError('EMPTY', 'zero bytes');

  if (!policy.contentTypes.includes(input.declaredContentType)) {
    throw new MediaPolicyError('UNSUPPORTED_TYPE', input.declaredContentType);
  }
  if (input.bytes.byteLength > policy.maxBytes) {
    throw new MediaPolicyError('TOO_LARGE', `${input.bytes.byteLength} > ${policy.maxBytes}`);
  }

  const actual = sniffContentType(input.bytes);
  if (actual === null) {
    throw new MediaPolicyError('TYPE_MISMATCH', `unrecognised bytes for ${input.declaredContentType}`);
  }
  if (actual !== input.declaredContentType) {
    throw new MediaPolicyError('TYPE_MISMATCH', `declared ${input.declaredContentType}, found ${actual}`);
  }
  return { contentType: actual, size: input.bytes.byteLength };
}
