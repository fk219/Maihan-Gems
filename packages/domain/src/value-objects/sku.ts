/**
 * packages/domain — Sku composite value object (doc 05 "Value objects").
 *
 * The composite of a setting design core, a metal code and — for configured
 * products — the gemstone reference:
 *
 *     SETTING    JS<designCore><metalCode>            e.g. JS1016W10
 *     CONFIGURED JS<designCore><metalCode>-<gemRef>   e.g. JS1383R14-PR5681
 *
 * `{ settingCore, metalCode, gemRef? }`; the metalCode must be one of the 15
 * authoritative codes; the gemRef is optional for setting-only SKUs.
 *
 * This is the composite OBJECT only. String composition (`SkuGrammar.compose`)
 * and parsing belong to the SKU grammar parser — plan task 7 — and are
 * deliberately not here.
 */
import { DomainError } from '../errors.js';
import type { GemstoneKind } from '../enums.js';
import type { MetalCode } from '../enums.js';
import { isGemRef, isPairGemRef, type GemRef } from './gem-ref.js';

export interface Sku {
  /** The numeric design core of the setting, e.g. '1150'. */
  readonly settingCore: string;
  readonly metalCode: MetalCode;
  /** Present for configured products, absent for setting-only SKUs. */
  readonly gemRef?: GemRef;
}

const SETTING_CORE_PATTERN = /^\d+$/;

export function isSettingCore(value: string): boolean {
  return SETTING_CORE_PATTERN.test(value);
}

export function parseSku(settingCore: string, metalCode: MetalCode, gemRef?: GemRef): Sku {
  if (!isSettingCore(settingCore)) {
    throw new DomainError('INVALID_SKU', `settingCore must be the numeric design core (e.g. '1150'); got "${settingCore}"`);
  }
  if (gemRef !== undefined && !isGemRef(gemRef)) {
    throw new DomainError('INVALID_SKU', `gemRef must be a valid gem reference; got "${gemRef}"`);
  }
  return Object.freeze({ settingCore, metalCode, ...(gemRef !== undefined ? { gemRef } : {}) } as const);
}

/** The gemstone kind a SKU carries: PAIR for PR refs, SINGLE for K refs, none for setting-only. */
export function skuGemstoneKind(sku: Sku): GemstoneKind | null {
  if (sku.gemRef === undefined) return null;
  return isPairGemRef(sku.gemRef) ? 'PAIR' : 'SINGLE';
}
