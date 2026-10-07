/**
 * packages/domain — the canonical DYO configuration representation
 * (SoT 19.2; technical_design/14 section 2 "Configuration hash").
 *
 * The locked architecture defines ONE configuration identity model:

 *     configuration_hash = sha256( canonical_json({
 *         hash_version, jewellery_type, setting_variant_sku,
 *         gem_ref, side_stones_sorted, options_sorted, engraving_present
 *     })).hex
 *
 * This module builds that canonical representation explicitly:
 *
 *   - canonical keys are emitted in sorted key order;
 *   - `gemRef` is present as a key exactly when a gem reference is part of
 *     the configuration (omitted is deterministic);
 *   - every object is canonicalised recursively with keys sorted; every array
 *     is canonicalised per element and then sorted by the element's own
 *     canonical JSON (doc 14: "arrays sorted by a stable key");
 *   - only plain JSON values are accepted; `undefined`, class instances,
 *     Maps, Sets, Dates, BigInts, symbols and functions are rejected instead
 *     of being silently dropped or stringified, because a silent drop would
 *     let two different states hash identically;
 *   - engraving TEXT is stored on the durable record but its PRESENCE is
 *     hashed: an engraving never leaks into the identity or a share link
 *     (doc 14 sections 2, 9, 12).
 *
 * NOT enforced here deliberately: INV-01/02/03 composition and the
 * compatibility rules (doc 14 sections 3, 5). A configuration being edited
 * passes through DRAFT and INCOMPATIBLE states, all of which are legitimate
 * identities; the hash is a deterministic identity over the canonical state,
 * and the compatibility engine is a separate pure function of a later task.
 *
 * The canonicalisation rule is versioned with the hash itself: hashVersion is
 * INSIDE the hashed object (SoT 19.2), so a deliberate change to the option
 * set or to this serialisation rule bumps hash_version and yields a new hash
 * space that cannot collide with history.
 */
import { DomainError } from '../errors.js';
import { isJewelleryType, type JewelleryType } from '../enums.js';
import type { GemRef } from '../value-objects/gem-ref.js';
import { isGemRef, parseGemRef } from '../value-objects/gem-ref.js';
import type { Sku } from '../value-objects/sku.js';
import { composeSku } from '../sku/grammar.js';

/** A configuration may carry at most one engraving; presence is hashed, never the text. */
export type EngravingText = string | null;

/**
 * Raw (un-canonicalised) configuration input. `hashVersion`, `jewelleryType`
 * and `settingVariantSku` are required identity fields; the gem reference,
 * side stones, options and engraving text are optional and default to their
 * empty forms.
 */
export interface ConfigurationInput {
  readonly hashVersion: number;
  readonly jewelleryType: JewelleryType;
  /** The setting variant's standalone SKU (SETTING-only shape; no gem reference). */
  readonly settingVariantSku: Sku;
  readonly gemRef?: GemRef | string | null;
  /** `side_stones` JSONB array. Shape [UNKNOWN] in the source; plain JSON only. */
  readonly sideStones?: readonly unknown[];
  /** `selected_options` JSONB object. Plain keys and plain JSON values only. */
  readonly options?: Readonly<Record<string, unknown>>;
  /** Engraving text. Only presence is hashed; the text itself never is. */
  readonly engravingText?: EngravingText;
}

/**
 * The validated, frozen canonical configuration — exactly the fields the
 * canonical JSON carries. This is the explicit canonical representation the
 * hash and the slug are computed from.
 */
export interface CanonicalConfiguration {
  readonly hashVersion: number;
  readonly jewelleryType: JewelleryType;
  /** Upper-cased standalone SKU text, e.g. 'JS1383R14'. */
  readonly settingVariantSku: string;
  /** Upper-cased gem reference text, e.g. 'PR5681'; null for setting-only identities. */
  readonly gemRef: GemRef | null;
  readonly sideStones: readonly unknown[];
  readonly options: Readonly<Record<string, unknown>>;
  readonly engravingPresent: boolean;
}

function validateHashVersion(hashVersion: number): number {
  if (!Number.isInteger(hashVersion) || hashVersion < 1 || hashVersion > 32767) {
    throw new DomainError('INVALID_HASH_VERSION', `hashVersion must be an integer in [1, 32767]; got ${String(hashVersion)}`);
  }
  return hashVersion;
}

function validateSettingVariantSku(sku: Sku): string {
  if (sku.gemRef !== undefined) {
    throw new DomainError(
      'INVALID_SKU',
      'the canonical field setting_variant_sku must be a SETTING-only SKU; move the gem reference to the configuration gemRef field',
    );
  }
  return composeSku({ settingCore: sku.settingCore, metalCode: sku.metalCode });
}

function validateGemRef(gemRef: GemRef | string | null | undefined): GemRef | null {
  if (gemRef === undefined || gemRef === null) return null;
  if (isGemRef(gemRef)) return gemRef;
  return parseGemRef(gemRef); // precise INVALID_GEM_REF reason on failure
}

function validateEngravingText(engravingText: EngravingText | undefined): boolean {
  if (engravingText === undefined || engravingText === null) return false;
  if (typeof engravingText === 'string') return engravingText.length > 0;
  throw new DomainError('INVALID_ENGRAVING_TEXT', 'engravingText must be a string or null');
}

/** Plain-object test that rejects class instances, Maps, Sets, Dates and functions. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Canonical JSON value rule. Every object's keys are sorted; every array is
 * canonicalised per element then sorted by the element's own canonical JSON.
 * Values that cannot be represented without a silent, order-dependent or
 * lossy transformation are rejected, never approximated.
 */
function canonicalValue(value: unknown, reject: (reason: string) => never): unknown {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) reject(`non-finite number ${String(value)}`);
    return value;
  }
  if (value === null) return null;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const entry: unknown = value[key];
      if (entry === undefined) reject(`key "${key}" holds undefined`);
      out[key] = canonicalValue(entry, reject);
    }
    return out;
  }
  if (Array.isArray(value)) {
    const elements: unknown[] = value.map((element) => canonicalValue(element, reject));
    return elements.sort((a, b) => (canonicalJsonOf(a) < canonicalJsonOf(b) ? -1 : 1));
  }
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    reject(`value of type ${typeof value} is not plain JSON`);
  }
  reject(`non-plain JSON value of kind ${Object.prototype.toString.call(value).slice(8, -1)}`);
}

/** Canonical JSON text of a value (keys sorted, no insignificant whitespace). */
function canonicalJsonOf(value: unknown): string {
  return JSON.stringify(canonicalValue(value, (reason) => { throw new DomainError('INVALID_CONFIGURATION', reason); })) ?? 'null';
}

/** Plain JSON text of an already-canonical value. */
function jsonOf(value: unknown): string {
  return JSON.stringify(value) ?? 'null';
}

/**
 * Build the explicit canonical configuration, validating every field. The
 * frozen result is the ONLY input the hash and the slug are computed from.
 */
export function canonicaliseConfiguration(input: ConfigurationInput): CanonicalConfiguration {
  if (typeof input !== 'object' || input === null) {
    throw new DomainError('INVALID_CONFIGURATION', 'a configuration input object is required');
  }
  if (!isJewelleryType(input.jewelleryType)) {
    throw new DomainError(
      'INVALID_JEWELLERY_TYPE',
      `configuration jewellery_type must be one of the 8 enum members; got ${String(input['jewelleryType'])}`,
    );
  }
  if (typeof input.settingVariantSku !== 'object' || input.settingVariantSku === null) {
    throw new DomainError('INVALID_SKU', 'a canonical setting-variant SKU (the Task 6 Sku value object) is required');
  }

  const hashVersion = validateHashVersion(input.hashVersion);
  const settingVariantSku = validateSettingVariantSku(input.settingVariantSku);
  const gemRef = validateGemRef(input.gemRef);
  const engravingPresent = validateEngravingText(input.engravingText);

  let sideStones: readonly unknown[] = [];
  if (input.sideStones !== undefined) {
    if (!Array.isArray(input.sideStones)) {
      throw new DomainError('INVALID_SIDE_STONES', 'sideStones must be an array (the side_stones JSONB shape)');
    }
    sideStones = input.sideStones
      .map((element) => canonicalValue(element, (reason) => { throw new DomainError('INVALID_SIDE_STONES', reason); }))
      .sort((a, b) => (canonicalJsonOf(a) < canonicalJsonOf(b) ? -1 : 1));
  }

  let options: Readonly<Record<string, unknown>> = {};
  if (input.options !== undefined) {
    if (!isPlainObject(input.options)) {
      throw new DomainError('INVALID_OPTIONS', 'options must be a plain object (the selected_options JSONB shape)');
    }
    const canonical: Record<string, unknown> = {};
    for (const key of Object.keys(input.options).sort()) {
      const entry: unknown = input.options[key];
      if (entry === undefined) {
        throw new DomainError('INVALID_OPTIONS', `options["${key}"] holds undefined`);
      }
      canonical[key] = canonicalValue(entry, (reason) => { throw new DomainError('INVALID_OPTIONS', `options["${key}"]: ${reason}`); });
    }
    options = Object.freeze(canonical);
  }

  return Object.freeze({
    hashVersion,
    jewelleryType: input.jewelleryType,
    settingVariantSku,
    gemRef,
    sideStones,
    options,
    engravingPresent,
  } as const);
}

/**
 * The canonical JSON text of a canonical configuration: keys sorted at every
 * level, arrays sorted by a stable key, no insignificant whitespace. This is
 * the exact input of the sha256 operation in SoT 19.2.
 */
export function canonicalJson(config: CanonicalConfiguration): string {
  const parts: Array<[string, string]> = [
    ['engravingPresent', jsonOf(config.engravingPresent)],
    ['hashVersion', jsonOf(config.hashVersion)],
    ['jewelleryType', jsonOf(config.jewelleryType)],
    ['options', canonicalJsonOf(config.options)],
    ['settingVariantSku', jsonOf(config.settingVariantSku)],
    ['sideStones', canonicalJsonOf(config.sideStones)],
  ];
  if (config.gemRef !== null) {
    parts.push(['gemRef', jsonOf(config.gemRef)]);
  }
  parts.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return `{${parts.map(([key, json]) => `"${key}":${json}`).join(',')}}`;
}
