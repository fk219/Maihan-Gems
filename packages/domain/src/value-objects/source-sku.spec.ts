import { describe, expect, it } from 'vitest';
import { isSourceSku, parseSourceSku } from './source-sku.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('SourceSku', () => {
  it('accepts observed SKU forms from the evidence', () => {
    expect(parseSourceSku('JS1150W10')).toBe('JS1150W10');
    expect(parseSourceSku('JS1383R14-PR5681')).toBe('JS1383R14-PR5681');
    expect(parseSourceSku('J10347')).toBe('J10347');
    expect(parseSourceSku('JS1169SL')).toBe('JS1169SL');
  });

  it('requires uppercase-normalised input and rejects lowercase instead of repairing it', () => {
    expectErrorCode(() => parseSourceSku('js1150w10'), 'INVALID_SOURCE_SKU');
    expectErrorCode(() => parseSourceSku('Js1150W10'), 'INVALID_SOURCE_SKU');
    expect(isSourceSku('js1150w10')).toBe(false);
  });

  it('rejects empty and whitespace-bearing values', () => {
    expectErrorCode(() => parseSourceSku(''), 'INVALID_SOURCE_SKU');
    expectErrorCode(() => parseSourceSku('JS 1150'), 'INVALID_SOURCE_SKU');
    expectErrorCode(() => parseSourceSku('JS1150W10 '), 'INVALID_SOURCE_SKU');
  });
});
