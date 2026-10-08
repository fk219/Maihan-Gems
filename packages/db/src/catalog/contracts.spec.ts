/**
 * Catalogue contract-layer unit tests (no database).
 *
 * Covers the closed-registry error surface, the structured filter schemas
 * (unknown values rejected structurally; unknown FIELDS rejected by .strict),
 * the cursor envelope round-trip and validation rejections (Phase 3 task 4
 * "cursor validation").
 */
import { describe, it, expect } from 'vitest';
import {
  ProductFiltersSchema,
  ProductListQuerySchema,
  SettingListQuerySchema,
  RejectedFilterSchema,
  encodeProductCursor,
  tryDecodeProductCursor,
  encodeSettingCursor,
  tryDecodeSettingCursor,
  ContractError,
  CONTRACT_ERROR_CODES,
} from '@maihan/contracts';

describe('contract error registry', () => {
  it('is closed and 400/404-mapped', () => {
    expect(CONTRACT_ERROR_CODES).toEqual([
      'VALIDATION_FAILED',
      'INVALID_FILTER',
      'PRODUCT_NOT_FOUND',
      'GEMSTONE_NOT_FOUND',
      'SETTING_VARIANT_NOT_FOUND',
      'SETTING_NOT_FOUND',
    ]);
    const e = new ContractError('PRODUCT_NOT_FOUND', 'x');
    expect(e.httpStatus).toBe(404);
    expect(new ContractError('VALIDATION_FAILED', 'x').httpStatus).toBe(400);
  });
});

const FULL_FILTERS = {
  kind: [],
  jewelleryType: [],
  gemstoneKind: [],
  variety: [],
  color: [],
  intensity: [],
  clarity: [],
  treatment: [],
  origin: [],
  shape: [],
  metal: [],
  settingStyle: [],
};

describe('structured filter schemas (task 2 structural layer)', () => {
  it('accepts valid filters', () => {
    const parsed = ProductFiltersSchema.parse({
      ...FULL_FILTERS,
      kind: ['CONFIGURED'],
      metal: ['R14'],
      minPrice: 100,
    });
    expect(parsed.kind).toEqual(['CONFIGURED']);
  });

  it('rejects an unknown enum member instead of widening', () => {
    expect(ProductFiltersSchema.safeParse({ kind: ['NOT_A_KIND'] }).success).toBe(false);
    expect(ProductFiltersSchema.safeParse({ metal: ['XX99'] }).success).toBe(false);
  });

  it('rejects unknown filter FIELDS (strict)', () => {
    expect(ProductFiltersSchema.safeParse({ search: 'sapphire' }).success).toBe(false);
  });

  it('rejects non-list or empty-string descriptor values', () => {
    expect(ProductFiltersSchema.safeParse({ variety: [''] }).success).toBe(false);
    expect(ProductFiltersSchema.safeParse({ variety: 'tsavorite' }).success).toBe(false);
  });

  it('rejects negative or non-finite ranges', () => {
    expect(ProductFiltersSchema.safeParse({ minPrice: -1 }).success).toBe(false);
    expect(ProductFiltersSchema.safeParse({ minPrice: Number.NaN }).success).toBe(false);
  });
});

describe('list query schemas', () => {
  it('defaults limit/sort/direction', () => {
    const parsed = ProductListQuerySchema.parse({});
    expect(parsed.limit).toBe(24);
    expect(parsed.sort).toBe('price');
    expect(parsed.direction).toBe('asc');
    expect(parsed.filters).toEqual({});
  });

  it('caps the page size', () => {
    expect(ProductListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(ProductListQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('settings query defaults and strictness', () => {
    const parsed = SettingListQuerySchema.parse({});
    expect(parsed.limit).toBe(24);
    expect(SettingListQuerySchema.safeParse({ bogus: 1 }).success).toBe(false);
  });
});

describe('cursor envelope (task 4)', () => {
  const payload = { v: 1 as const, s: 'price' as const, d: 'asc' as const, n: 42, a: 199.5 };

  it('round-trips', () => {
    const token = encodeProductCursor(payload);
    expect(token.startsWith('cur1_')).toBe(true);
    const decoded = tryDecodeProductCursor(token);
    expect(decoded).toEqual(payload);
  });

  it('rejects garbage tokens', () => {
    expect(tryDecodeProductCursor('not-a-cursor')).toBe('NOT_A_TOKEN');
    expect(tryDecodeProductCursor('cur1_%%%-')).toBe('MALFORMED_PAYLOAD');
    expect(tryDecodeProductCursor('cur1_eyJ2IjoxfQ')).toBe('SCHEMA_MISMATCH');
  });

  it('rejects a non-conforming payload shape', () => {
    // v:2 is outside the schema's literal(1) — the envelope refuses it.
    const bogus = Buffer.from(JSON.stringify({ ...payload, v: 2 }))
      .toString('base64')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    expect(tryDecodeProductCursor(`cur1_${bogus}`)).toBe('SCHEMA_MISMATCH');
  });

  it('settings cursor round-trips and rejects a foreign payload', () => {
    const token = encodeSettingCursor({ v: 1, d: 'design_code', n: '1150' });
    expect(tryDecodeSettingCursor(token)).toEqual({ v: 1, d: 'design_code', n: '1150' });
    expect(tryDecodeSettingCursor('cur1_bogus')).toBe('MALFORMED_PAYLOAD');
  });
});

describe('rejected filter contract', () => {
  it('validates a machine-readable rejection', () => {
    expect(
      RejectedFilterSchema.parse({
        filter: 'variety',
        value: 'not-a-slug',
        reason: 'UNKNOWN_VALUE',
        message: 'x',
      }),
    ).toBeTruthy();
    expect(
      RejectedFilterSchema.safeParse({
        filter: 'variety',
        value: 'x',
        reason: 'MADE_UP_REASON',
        message: 'x',
      }).success,
    ).toBe(false);
  });
});
