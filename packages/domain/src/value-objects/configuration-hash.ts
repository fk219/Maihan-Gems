/**
 * packages/domain — ConfigurationHash value object (doc 05 "Value objects";
 * SoT 19.2).
 *
 * `sha256:<hex>` — the deterministic identity of a DYO configuration, carrying
 * its hashVersion. The hash FUNCTION and slug derivation are plan task 8; this
 * object is the validated identity SHAPE only: a sha256-prefixed, lowercase
 * 64-hex-digit value plus a positive SMALLINT-bounded hash version.
 *
 * There is no normalisation: a hash value is produced exactly once by the
 * hashing function and compared exactly afterwards.
 */
import { DomainError } from '../errors.js';

declare const configurationHashBrand: unique symbol;
export type ConfigurationHashValue = string & { readonly [configurationHashBrand]: 'ConfigurationHash' };

/** SMALLINT bound for hash_version; versioning starts at 1. */
const MAX_HASH_VERSION = 32767;

export interface ConfigurationHash {
  readonly value: ConfigurationHashValue;
  readonly hashVersion: number;
}

const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function isConfigurationHashShape(value: string): value is ConfigurationHashValue {
  return HASH_PATTERN.test(value);
}

export function parseConfigurationHash(value: string, hashVersion: number): ConfigurationHash {
  if (!isConfigurationHashShape(value)) {
    throw new DomainError(
      'INVALID_CONFIGURATION_HASH',
      `configuration hash must be 'sha256:' followed by 64 lowercase hex digits; got "${value}"`,
    );
  }
  if (!Number.isInteger(hashVersion) || hashVersion < 1 || hashVersion > MAX_HASH_VERSION) {
    throw new DomainError('INVALID_HASH_VERSION', `hashVersion must be an integer in [1, ${MAX_HASH_VERSION}]; got ${hashVersion}`);
  }
  return Object.freeze({ value: value as ConfigurationHashValue, hashVersion } as const);
}
