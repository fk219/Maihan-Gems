/**
 * packages/domain — the ConfigurationHasher domain service
 * (SoT 19.2; technical_design/14 section 2; doc 05 "Domain services").
 *
 *     configurationHash = 'sha256:' + sha256(canonicalJson(canonical)).hex
 *
 * Properties (each test-frozen by the configuration specs):
 *   - deterministic and pure: identical canonical configuration, identical
 *     hash; no timestamp, random value, database id, presentation field or
 *     generated metadata takes part;
 *   - independent of input construction order: the canonical representation
 *     is built from explicitly named identity fields, so object key insertion
 *     order cannot influence the result;
 *   - `hashVersion` is inside the hashed object, so a deliberate option-set
 *     change invalidates the hash space without colliding with history;
 *   - engraving text never enters the hash — presence only (doc 14 section 2);
 *   - the result is a frozen Task 6 ConfigurationHash value object
 *     ('sha256:' + 64 lowercase hex digits + SMALLINT-bounded version), never
 *     a bare string.
 *
 * The sha256 computation uses the platform's crypto digest. Hashing is a pure
 * byte-level computation: no I/O, no network, no filesystem, no clock. The
 * domain boundary rules (technical_design/01 forbidden-import table, doc 03)
 * prohibit I/O builtins; node:crypto's createHash performs none.
 */
import { createHash } from 'node:crypto';
import {
  canonicaliseConfiguration,
  canonicalJson,
  type ConfigurationInput,
} from './canonical-configuration.js';
import { parseConfigurationHash, type ConfigurationHash } from '../value-objects/configuration-hash.js';

export type { CanonicalConfiguration, ConfigurationInput } from './canonical-configuration.js';
export {
  canonicaliseConfiguration,
  canonicalJson,
} from './canonical-configuration.js';

export interface ConfigurationIdentity {
  /** The frozen Task 6 ConfigurationHash value object ('sha256:<hex>', versioned). */
  readonly configurationHash: ConfigurationHash;
  /** The canonical input the hash is computed from (keys sorted, arrays sorted). */
  readonly canonicalJson: string;
}

/**
 * Compute the explicit canonical representation and return both it and the
 * frozen ConfigurationHash value object. The canonical representation is
 * exposed because INV-07/INV-08 style provenance work and compatibility
 * caching must be able to show exactly what was hashed.
 */
export function computeConfigurationIdentity(input: ConfigurationInput): ConfigurationIdentity {
  const canonical = canonicaliseConfiguration(input);
  const json = canonicalJson(canonical);
  const hex = createHash('sha256').update(json, 'utf8').digest('hex');
  return Object.freeze({
    configurationHash: parseConfigurationHash(`sha256:${hex}`, canonical.hashVersion),
    canonicalJson: json,
  } as const);
}

/** The hash itself, as the frozen Task 6 value object. */
export function computeConfigurationHash(input: ConfigurationInput): ConfigurationHash {
  return computeConfigurationIdentity(input).configurationHash;
}

/** The raw 32-byte sha256 digest of the canonical configuration JSON. */
export function computeConfigurationDigest(input: ConfigurationInput): Buffer {
  const canonical = canonicaliseConfiguration(input);
  const json = canonicalJson(canonical);
  return createHash('sha256').update(json, 'utf8').digest();
}
