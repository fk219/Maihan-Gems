/**
 * packages/domain — configuration slug derivation and slug normalisation
 * (plan task 8 / E1.5 "Configuration-hash and slug derivation"; doc 14
 * section 9 "Resume and share"; doc 34 section 5 "Slug strategy").
 *
 * The URL-facing identity of a DYO configuration is its slug (doc 34 target
 * shape `/design-your-own/review/{code}`; doc 14: "the short code is the only
 * identifier in the URL — no stone ref, price or setting SKU is exposed").
 * This module derives it deterministically from the canonical configuration:
 *
 *     slug = base62( sha256( canonicalJson(configuration) ) ), fixed 43 digits
 *
 * Properties (each test-frozen by the configuration specs):
 *   - deterministic: identical canonical configuration, identical slug;
 *   - URL-safe: the base62 alphabet [0-9A-Za-z] contains no separators,
 *     symbols or reserved characters;
 *   - stable for the same configuration across repeated execution;
 *   - collision-resistant within the defined identity space: the whole
 *     versioned 256-bit digest is encoded, no truncation;
 *   - independent of presentation ordering: the canonical representation
 *     sorts keys and arrays before hashing;
 *   - no descriptive/catalogue/slug-routing behaviour lives here: product,
 *     setting and variety slugs, redirects and URL parity are doc 34 concern
 *     with their own tasks. This module only owns the configuration identity
 *     slug and the pure URL-safe normalisation primitive shared by it.
 *
 * `normaliseSlug` is the pure normalisation primitive for human-readable
 * slug tokens (doc 34: slugs are "derived from the source slug, never from a
 * mutable display name", never embed price or availability). It lowercases,
 * strips diacritics (NFKD), maps every run of non-alphanumeric characters to
 * a single '-' and trims, so '5.98ct' becomes '5-98ct' exactly as the
 * observed target slug shape in doc 34 section 5 ('5-98ct-14k-rose-gold').
 */
import { DomainError } from '../errors.js';
import { computeConfigurationDigest, type ConfigurationInput } from './hash.js';

/** base62 digits: '0'-'9' < 'a'-'z' < 'A'-'Z'. Deterministic across runtimes. */
const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE62_RADIX = 62n;

/** A sha256 digest is 32 bytes, exactly 43 base62 digits when zero-padded. */
const SLUG_LENGTH = 43;

declare const configurationSlugBrand: unique symbol;
export type ConfigurationSlug = string & { readonly [configurationSlugBrand]: 'ConfigurationSlug' };

/** Raw 32-byte digest -> fixed-length base62 (big-endian, zero-padded). */
function base62FromDigest(digest: Buffer): ConfigurationSlug {
  let remaining = BigInt(`0x${digest.toString('hex')}`);
  if (remaining === 0n) return '0'.repeat(SLUG_LENGTH) as ConfigurationSlug;
  let digits = '';
  while (remaining > 0n) {
    digits = BASE62_ALPHABET[Number(remaining % BASE62_RADIX)] + digits;
    remaining /= BASE62_RADIX;
  }
  if (digits.length > SLUG_LENGTH) {
    // Unreachable for a 32-byte digest: 62^43 > 2^256. Reaching this is a bug,
    // not a truncation opportunity — refuse rather than weaken the identity.
    throw new DomainError('INVALID_CONFIGURATION_SLUG', `base62 digest form overflow: ${digits.length} digits`);
  }
  return digits.padStart(SLUG_LENGTH, '0') as ConfigurationSlug;
}

/**
 * Derive the configuration slug from the canonical configuration. Malformed
 * inputs (bad enum value, invalid gem reference, non-JSON option values) are
 * rejected with the same errors the hash path raises — the slug is computed
 * from the identical canonical representation, never a second one.
 */
export function deriveConfigurationSlug(input: ConfigurationInput): ConfigurationSlug {
  return base62FromDigest(computeConfigurationDigest(input));
}

/**
 * Pure URL-safe slug normalisation for human-readable tokens: lowercase,
 * NFKD diacritic folding, every run of characters outside [a-z0-9] becomes a
 * single '-', edges trimmed. Empty or all-symbol input is a data error, not
 * a silent empty slug.
 */
export function normaliseSlug(value: string): string {
  if (typeof value !== 'string') {
    throw new DomainError('INVALID_SLUG', `a slug must be a string; got ${typeof value}`);
  }
  const folded = value.normalize('NFKD').replace(/\p{M}+/gu, '');
  const slug = folded.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length === 0) {
    throw new DomainError('INVALID_SLUG', `the slug normalised to an empty value; input was non-empty ("${value}")`);
  }
  return slug;
}

/** URL-safe proof: a normalised slug token holds nothing outside [a-z0-9-]. */
export function isNormalisedSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/** True iff the value is a derived configuration slug (43 strict base62 digits). */
export function isConfigurationSlugShape(value: string): value is ConfigurationSlug {
  return value.length === SLUG_LENGTH && /^[0-9A-Za-z]+$/.test(value);
}
