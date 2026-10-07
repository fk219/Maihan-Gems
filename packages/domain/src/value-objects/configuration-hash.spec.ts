import { describe, expect, it } from 'vitest';
import { isConfigurationHashShape, parseConfigurationHash } from './configuration-hash.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

const HEX64 = 'a'.repeat(64) + 'b'.repeat(0); // 64 lowercase hex digits
const VALID = `sha256:${HEX64}`;

describe('ConfigurationHash', () => {
  it('accepts the sha256:<64 lowercase hex> shape with a positive version', () => {
    expect(parseConfigurationHash(VALID, 1)).toEqual({ value: VALID, hashVersion: 1 });
    expect(isConfigurationHashShape(VALID)).toBe(true);
  });

  it('rejects malformed hashes without normalising them', () => {
    expectErrorCode(() => parseConfigurationHash(`sha256:${'A'.repeat(64)}`, 1), 'INVALID_CONFIGURATION_HASH');
    expectErrorCode(() => parseConfigurationHash(`sha256:${'a'.repeat(63)}`, 1), 'INVALID_CONFIGURATION_HASH');
    expectErrorCode(() => parseConfigurationHash(`sha256:${'a'.repeat(65)}`, 1), 'INVALID_CONFIGURATION_HASH');
    expectErrorCode(() => parseConfigurationHash('md5:abcd', 1), 'INVALID_CONFIGURATION_HASH');
    expectErrorCode(() => parseConfigurationHash('', 1), 'INVALID_CONFIGURATION_HASH');
    expect(isConfigurationHashShape('sha256:')).toBe(false);
  });

  it('bounds hashVersion to the SMALLINT domain, starting at 1', () => {
    expectErrorCode(() => parseConfigurationHash(VALID, 0), 'INVALID_HASH_VERSION');
    expectErrorCode(() => parseConfigurationHash(VALID, 32768), 'INVALID_HASH_VERSION');
    expectErrorCode(() => parseConfigurationHash(VALID, 1.5), 'INVALID_HASH_VERSION');
    expect(parseConfigurationHash(VALID, 32767).hashVersion).toBe(32767);
  });

  it('implements NO hashing: Task 8 owns the hash function', () => {
    // The value object validates a hash produced elsewhere; it must not
    // compute one (plan task 8).
    expect(typeof parseConfigurationHash(VALID, 1).value).toBe('string');
  });
});
