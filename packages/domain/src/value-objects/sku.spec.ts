import { describe, expect, it } from 'vitest';
import { parseMetalCode } from '../enums.js';
import { parseGemRef } from './gem-ref.js';
import { isSettingCore, parseSku, skuGemstoneKind } from './sku.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('Sku (composite)', () => {
  it('accepts a setting-only composite', () => {
    const sku = parseSku('1150', parseMetalCode('W10'));
    expect(sku).toEqual({ settingCore: '1150', metalCode: 'W10' });
    expect('gemRef' in sku).toBe(false);
    expect(skuGemstoneKind(sku)).toBeNull();
  });

  it('accepts a configured composite with a single-stone reference', () => {
    const sku = parseSku('1383', parseMetalCode('R14'), parseGemRef('K1324'));
    expect(sku.gemRef).toBe('K1324');
    expect(skuGemstoneKind(sku)).toBe('SINGLE');
  });

  it('accepts a configured composite with a pair reference', () => {
    const sku = parseSku('1383', parseMetalCode('R14'), parseGemRef('PR5681'));
    expect(skuGemstoneKind(sku)).toBe('PAIR');
  });

  it('requires a numeric design core', () => {
    expectErrorCode(() => parseSku('JS1150', parseMetalCode('W14')), 'INVALID_SKU');
    expectErrorCode(() => parseSku('', parseMetalCode('W14')), 'INVALID_SKU');
    expectErrorCode(() => parseSku('11 50', parseMetalCode('W14')), 'INVALID_SKU');
    expect(isSettingCore('1150')).toBe(true);
    expect(isSettingCore('JS1150')).toBe(false);
  });

  it('rejects an invalid gemRef', () => {
    // @ts-expect-error a raw string is not a GemRef; this one is also invalid at runtime
    expectErrorCode(() => parseSku('1150', parseMetalCode('W14'), 'K132x'), 'INVALID_SKU');
  });

  it('metalCode membership is the authoritative 15-code enumeration', () => {
    for (const code of ['W10', 'Y10', 'R10', 'W14', 'Y14', 'R14', 'W18', 'Y18', 'R18', 'PT', 'SL', 'YW14', 'YW18', 'WY14', 'WY18']) {
      expect(parseMetalCode(code)).toBe(code);
    }
    expectErrorCode(() => parseMetalCode('GOLD'), 'INVALID_METAL_CODE');
    expectErrorCode(() => parseMetalCode('w14'), 'INVALID_METAL_CODE');
  });
});
