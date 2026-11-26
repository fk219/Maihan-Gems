/**
 * apps/web/src/lib/dyo-review-model.spec.ts
 *
 * The review dossier's display mapping. The repository spec proves the join;
 * this pins what the page receives:
 *
 *   - real gemstone / setting / quote fields reach the model;
 *   - a NULL component stays null, so the page renders `Not evidenced`;
 *   - nothing is derived from a sibling row or a guessed default.
 */
import { describe, expect, it } from 'vitest';

import type { DyoConfigurationRow, DyoReviewDetail } from '@maihan/db';
import { buildDyoReviewModel } from './dyo-server.js';

const CONFIGURATION: DyoConfigurationRow = {
  id: 'd0000000-0000-4000-8000-000000000001',
  configuration_hash: 'hash',
  short_code: 'DYO-1234',
  jewellery_type: 'RING',
  setting_id: 's1',
  setting_variant_id: 'v1',
  gemstone_id: 'g1',
  gemstone_pair_id: null,
  side_stones: [],
  engraving_text: 'AETERNUM',
  selected_options: { metal: 'Y18', ringSize: '7.0', ignored: 42 },
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
} as DyoConfigurationRow;

const DETAIL: DyoReviewDetail = {
  configuration: CONFIGURATION,
  gemstone: {
    name: 'Sapphire',
    gemRef: 'K1324',
    kind: 'SINGLE',
    variety: 'Sapphire',
    colour: 'Blue',
    clarity: 'VS',
    origin: 'Sri Lanka',
    shape: 'OVAL',
    treatment: null,
    totalWeightCt: '2.100',
    priceAmount: '5400.00',
    currency: 'USD',
  },
  settingVariant: {
    name: 'Pave Ring',
    metal: '14K_WHITE_GOLD',
    metalCode: '14K_WHITE_GOLD',
    sku: '1150',
    variantSku: 'JS1150W14',
    designCode: '1150',
    basePrice: '850.00',
    currency: 'USD',
  },
  quote: {
    total: '5400.00',
    currency: 'USD',
    gemstoneComponent: '4550.00',
    settingComponent: '850.00',
    sideStoneComponent: '0.00',
    makingComponent: '0.00',
    taxComponent: '0.00',
    pricingRuleVersion: 'dyo-v1',
  },
};

describe('buildDyoReviewModel', () => {
  it('carries the real joined rows into the page model', () => {
    const model = buildDyoReviewModel(DETAIL);
    expect(model.configurationCode).toBe('DYO-1234');
    expect(model.configuration.selected_options).toEqual({ metal: 'Y18', ringSize: '7.0' });
    expect(model.gemstone).toMatchObject({
      gemRef: 'K1324',
      carat: 2.1,
      variety: 'Sapphire',
      colour: 'Blue',
      clarity: 'VS',
      origin: 'Sri Lanka',
      shape: 'OVAL',
      treatment: null,
      totalWeightCt: '2.100',
      priceAmount: '5400.00',
    });
    expect(model.settingVariant).toMatchObject({
      name: 'Pave Ring',
      metalCode: '14K_WHITE_GOLD',
      variantSku: 'JS1150W14',
      designCode: '1150',
      basePrice: '850.00',
    });
    expect(model.quote).toMatchObject({
      total: '5400.00',
      gemstoneComponent: '4550.00',
      settingComponent: '850.00',
      pricingRuleVersion: 'dyo-v1',
    });
  });

  it('keeps every absent component null — never a plausible substitute', () => {
    const model = buildDyoReviewModel({
      configuration: CONFIGURATION,
      gemstone: null,
      settingVariant: null,
      quote: null,
    });
    expect(model.gemstone).toBeNull();
    expect(model.settingVariant).toBeNull();
    expect(model.quote).toBeNull();
  });

  it('keeps a null weight and a null treatment null inside a present row', () => {
    const model = buildDyoReviewModel({
      ...DETAIL,
      gemstone: {
        ...DETAIL.gemstone!,
        treatment: null,
        totalWeightCt: null,
        priceAmount: null,
      },
    });
    expect(model.gemstone?.carat).toBeNull();
    expect(model.gemstone?.totalWeightCt).toBeNull();
    expect(model.gemstone?.priceAmount).toBeNull();
    expect(model.gemstone?.treatment).toBeNull();
  });
});
