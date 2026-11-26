/**
 * packages/db/src/dyo/dyo-review-repository.spec.ts
 *
 * The review dossier's joined read, proven without a database:
 *   - the gemstone is resolved by the configuration's own foreign key;
 *   - the setting variant is resolved with its design;
 *   - the quote is the NEWEST NON-EXPIRED snapshot (`computed_at DESC` with an
 *     expiry predicate), so a stale quote is not presented as current;
 *   - every id is a bound parameter;
 *   - a NULL id or a missing row stays null (the page's `Not evidenced`).
 */

import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  loadDyoReviewDetail,
  readDyoGemstone,
  readDyoSettingVariant,
  readLatestDyoQuote,
} from './dyo-review-repository.js';
import type { DyoConfigurationRow } from './dyo-repository.js';

const CONFIG = 'd0000000-0000-4000-8000-000000000001';
const STONE = 'g0000000-0000-4000-8000-000000000001';
const VARIANT = 'v0000000-0000-4000-8000-000000000001';

function dbWith(results: ReadonlyArray<ReadonlyArray<unknown>>): {
  db: CatalogDatabase;
  queries: Array<{ text: string; values: unknown[] }>;
} {
  const scripted = createScriptedExecutor(results);
  return {
    db: scripted as unknown as CatalogDatabase,
    queries: scripted.queries as Array<{ text: string; values: unknown[] }>,
  };
}

function configuration(overrides: Partial<DyoConfigurationRow> = {}): DyoConfigurationRow {
  return {
    id: CONFIG,
    configuration_hash: 'hash',
    short_code: 'DYO-1234',
    jewellery_type: 'RING',
    setting_id: null,
    setting_variant_id: null,
    gemstone_id: null,
    gemstone_pair_id: null,
    side_stones: [],
    engraving_text: null,
    selected_options: { ringSize: '7.0' },
    state: 'VALID',
    compatibility_status: 'COMPATIBLE',
    compatibility_detail: [],
    compatibility_checked_at: null,
    hash_version: 1,
    state_version: 1,
    anonymous_session_id: null,
    customer_id: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    expires_at: null,
    ...overrides,
  } as DyoConfigurationRow;
}

describe('readLatestDyoQuote', () => {
  it('reads the newest non-expired snapshot with the id bound', async () => {
    const { db, queries } = dbWith([
      [
        {
          total: '5400.00',
          currency: 'USD',
          gemstone_component: '4550.00',
          setting_component: '850.00',
          side_stone_component: '0.00',
          making_component: '0.00',
          tax_component: '0.00',
          pricing_rule_version: 'dyo-v1',
        },
      ],
    ]);
    const quote = await readLatestDyoQuote(db, CONFIG);
    expect(quote).toEqual({
      total: '5400.00',
      currency: 'USD',
      gemstoneComponent: '4550.00',
      settingComponent: '850.00',
      sideStoneComponent: '0.00',
      makingComponent: '0.00',
      taxComponent: '0.00',
      pricingRuleVersion: 'dyo-v1',
    });
    expect(queries[0]?.text).toMatch(/ORDER BY computed_at DESC/);
    expect(queries[0]?.text).toMatch(/expires_at IS NULL OR expires_at > now\(\)/);
    expect(queries[0]?.values).toContain(CONFIG);
    expect(queries[0]?.text).not.toContain(CONFIG);
  });

  it('is null when no live snapshot exists', async () => {
    const { db } = dbWith([[]]);
    await expect(readLatestDyoQuote(db, CONFIG)).resolves.toBeNull();
  });
});

describe('readDyoGemstone', () => {
  it('maps the real taxonomy and binds the stone id', async () => {
    const { db, queries } = dbWith([
      [
        {
          gem_ref: 'K1324',
          kind: 'SINGLE',
          variety: 'Sapphire',
          colour: 'Blue',
          clarity: 'VS',
          origin: 'Sri Lanka',
          shape: 'OVAL',
          treatment: null,
          total_weight_ct: '2.100',
          price_amount: '5400.00',
          currency: 'USD',
        },
      ],
    ]);
    const gem = await readDyoGemstone(db, STONE);
    expect(gem).toMatchObject({
      name: 'Sapphire',
      gemRef: 'K1324',
      variety: 'Sapphire',
      colour: 'Blue',
      clarity: 'VS',
      origin: 'Sri Lanka',
      shape: 'OVAL',
      treatment: null,
      totalWeightCt: '2.100',
      priceAmount: '5400.00',
    });
    expect(queries[0]?.values).toContain(STONE);
    expect(queries[0]?.text).not.toContain(STONE);
  });

  it('is null when the stone row has been removed', async () => {
    const { db } = dbWith([[]]);
    await expect(readDyoGemstone(db, STONE)).resolves.toBeNull();
  });
});

describe('readDyoSettingVariant', () => {
  it('maps the variant and its design, with the variant id bound', async () => {
    const { db, queries } = dbWith([
      [
        {
          design_code: '1150',
          setting_name: 'Pave Ring',
          sku: 'JS1150W14',
          metal_code: '14K_WHITE_GOLD',
          base_price: '850.00',
          currency: 'USD',
        },
      ],
    ]);
    const variant = await readDyoSettingVariant(db, VARIANT);
    expect(variant).toEqual({
      name: 'Pave Ring',
      metal: '14K_WHITE_GOLD',
      metalCode: '14K_WHITE_GOLD',
      sku: '1150',
      variantSku: 'JS1150W14',
      designCode: '1150',
      basePrice: '850.00',
      currency: 'USD',
    });
    expect(queries[0]?.values).toContain(VARIANT);
    expect(queries[0]?.text).not.toContain(VARIANT);
  });
});

describe('loadDyoReviewDetail', () => {
  it('joins the stone, the setting variant and the latest quote', async () => {
    const { db, queries } = dbWith([
      [configuration({ gemstone_id: STONE, setting_variant_id: VARIANT, setting_id: 's1' })],
      [
        {
          gem_ref: 'K1324',
          kind: 'SINGLE',
          variety: 'Sapphire',
          colour: 'Blue',
          clarity: 'VS',
          origin: 'Sri Lanka',
          shape: 'OVAL',
          treatment: null,
          total_weight_ct: '2.100',
          price_amount: '5400.00',
          currency: 'USD',
        },
      ],
      [
        {
          design_code: '1150',
          setting_name: 'Pave Ring',
          sku: 'JS1150W14',
          metal_code: '14K_WHITE_GOLD',
          base_price: '850.00',
          currency: 'USD',
        },
      ],
      [{ total: '5400.00', currency: 'USD', gemstone_component: '4550.00', setting_component: '850.00' }],
    ]);

    const detail = await loadDyoReviewDetail(db, 'DYO-1234');
    expect(detail?.configuration.short_code).toBe('DYO-1234');
    expect(detail?.gemstone?.gemRef).toBe('K1324');
    expect(detail?.settingVariant?.variantSku).toBe('JS1150W14');
    expect(detail?.quote?.total).toBe('5400.00');
    expect(queries).toHaveLength(4);
    expect(queries[0]?.values).toContain('DYO-1234');
    expect(queries[0]?.text).not.toContain('DYO-1234');
  });

  it('leaves an absent stone/setting/quote null (INV-07 honesty)', async () => {
    const { db, queries } = dbWith([[configuration()], []]);

    const detail = await loadDyoReviewDetail(db, 'DYO-1234');
    expect(detail).not.toBeNull();
    expect(detail?.gemstone).toBeNull();
    expect(detail?.settingVariant).toBeNull();
    expect(detail?.quote).toBeNull();
    // Only the configuration and the quote are read: no join key, no join.
    expect(queries).toHaveLength(2);
  });

  it('is null for an unknown code', async () => {
    const { db } = dbWith([[]]);
    await expect(loadDyoReviewDetail(db, 'NOPE')).resolves.toBeNull();
  });
});
