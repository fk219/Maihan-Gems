/**
 * packages/db/src/dyo/dyo-repository.ts
 *
 * Authority: technical_design/14_DYO_ARCHITECTURE.md
 *
 * Implements:
 *   - Create / retrieve / update DYO configurations (`dyo_configurations`)
 *   - Compatibility rules lookup & verification (`setting_compatibility_rules`)
 *   - Price snapshots and quotes (`dyo_price_snapshots`, `dyo_quotes`)
 *   - Compatible settings lookup for a chosen gemstone/pair
 *   - Cart conversion inside a PostgreSQL transaction (re-validating and re-pricing)
 */
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import {
  calculateDyoPrice,
  evaluateCompatibility,
  transitionDyoState,
  type CompatibilityRuleInput,
  type EvaluatedStoneInput,
  type DyoTrigger,
} from '@maihan/domain';
import { addItemToCart, type AddToCartRepositoryInput } from '../commerce/cart-repository.js';
import type { CatalogDatabase as DrizzleCatalogDatabase } from '../catalog/executor.js';

export type CatalogDatabase = DrizzleCatalogDatabase;

export interface DyoConfigurationRow {
  id: string;
  configuration_hash: string;
  short_code: string;
  jewellery_type: string;
  setting_id: string | null;
  setting_variant_id: string | null;
  gemstone_id: string | null;
  gemstone_pair_id: string | null;
  side_stones: unknown[];
  engraving_text: string | null;
  selected_options: Record<string, unknown>;
  state: string;
  compatibility_status: string;
  compatibility_detail: unknown[];
  compatibility_checked_at: Date | null;
  hash_version: number;
  state_version: number;
  anonymous_session_id: string | null;
  customer_id: string | null;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
}

export interface CreateDyoConfigurationInput {
  configurationHash: string;
  shortCode: string;
  jewelleryType: string;
  settingId?: string | null;
  settingVariantId?: string | null;
  gemstoneId?: string | null;
  gemstonePairId?: string | null;
  engravingText?: string | null;
  selectedOptions?: Record<string, unknown>;
  anonymousSessionId?: string | null;
  customerId?: string | null;
  expiresAt?: Date | null;
}

function generateBase62Code(length = 8): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function createDyoConfiguration(
  db: CatalogDatabase,
  input: CreateDyoConfigurationInput,
): Promise<DyoConfigurationRow> {
  const shortCode = input.shortCode || generateBase62Code(8);
  const res = await db.execute(sql`
    INSERT INTO dyo_configurations (
      configuration_hash, short_code, jewellery_type,
      setting_id, setting_variant_id, gemstone_id, gemstone_pair_id,
      engraving_text, selected_options, state, compatibility_status,
      anonymous_session_id, customer_id, expires_at
    ) VALUES (
      ${input.configurationHash}, ${shortCode}, ${input.jewelleryType}::jewellery_type,
      ${input.settingId ?? null}, ${input.settingVariantId ?? null},
      ${input.gemstoneId ?? null}, ${input.gemstonePairId ?? null},
      ${input.engravingText ?? null}, ${JSON.stringify(input.selectedOptions ?? {})}::jsonb,
      'DRAFT'::dyo_state, 'UNKNOWN'::compatibility_result,
      ${input.anonymousSessionId ?? null}, ${input.customerId ?? null}, ${input.expiresAt ?? null}
    )
    ON CONFLICT (configuration_hash) WHERE state <> 'EXPIRED'
    DO UPDATE SET updated_at = now()
    RETURNING *;
  `);
  return res.rows[0] as unknown as DyoConfigurationRow;
}

export async function getDyoConfigurationByShortCode(
  db: CatalogDatabase,
  shortCode: string,
): Promise<DyoConfigurationRow | null> {
  const res = await db.execute(sql`SELECT * FROM dyo_configurations WHERE short_code = ${shortCode};`);
  return (res.rows[0] as unknown as DyoConfigurationRow | undefined) ?? null;
}

export async function getDyoConfigurationById(
  db: CatalogDatabase,
  id: string,
): Promise<DyoConfigurationRow | null> {
  const res = await db.execute(sql`SELECT * FROM dyo_configurations WHERE id = ${id};`);
  return (res.rows[0] as unknown as DyoConfigurationRow | undefined) ?? null;
}

export async function loadSettingCompatibilityRules(
  db: CatalogDatabase,
  settingId: string,
): Promise<CompatibilityRuleInput[]> {
  const res = await db.execute(sql`
    SELECT
      id, setting_id AS "settingId", jewellery_type AS "jewelleryType",
      stone_kind AS "stoneKind", variety_id AS "varietyId", colour_id AS "colourId",
      shape, min_weight_ct::float AS "minWeightCt", max_weight_ct::float AS "maxWeightCt",
      min_length_mm::float AS "minLengthMm", max_length_mm::float AS "maxLengthMm",
      min_width_mm::float AS "minWidthMm", max_width_mm::float AS "maxWidthMm",
      requires_treatment_id AS "requiresTreatmentId", forbids_treatment_id AS "forbidsTreatmentId",
      rule_kind AS "ruleKind", priority, explanation
    FROM setting_compatibility_rules
    WHERE setting_id = ${settingId} AND state = 'ACTIVE'
    ORDER BY priority DESC;
  `);
  return res.rows as unknown as CompatibilityRuleInput[];
}

export async function validateDyoConfiguration(
  db: CatalogDatabase,
  shortCode: string,
): Promise<DyoConfigurationRow> {
  const config = await getDyoConfigurationByShortCode(db, shortCode);
  if (!config) throw new Error('DYO configuration not found');

  if (!config.setting_id) {
    throw new Error('DYO_SETTING_REQUIRED');
  }

  // Load stone attributes
  let evaluatedStone: EvaluatedStoneInput | null = null;
  const stoneId = config.gemstone_id ?? config.gemstone_pair_id;
  if (stoneId) {
    const stoneRes = await db.execute(sql`
      SELECT variety_id, colour_id, shape, total_weight_ct::float AS weight, kind,
             length_mm::float AS length_mm, width_mm::float AS width_mm
      FROM gemstones WHERE id = ${stoneId};
    `);
    const s = stoneRes.rows[0] as {
      variety_id: string | null;
      colour_id: string | null;
      shape: string | null;
      weight: number | null;
      length_mm: number | null;
      width_mm: number | null;
    } | undefined;
    if (s) {
      evaluatedStone = {
        kind: config.gemstone_pair_id ? 'PAIR' : 'SINGLE',
        varietyId: s.variety_id,
        colourId: s.colour_id,
        shape: s.shape,
        weightCt: s.weight,
        lengthMm: s.length_mm,
        widthMm: s.width_mm,
      };
    }
  }

  const rules = await loadSettingCompatibilityRules(db, config.setting_id);
  const evaluation = evaluateCompatibility(
    {
      settingId: config.setting_id,
      jewelleryType: config.jewellery_type as any,
    },
    evaluatedStone,
    rules,
  );

  const trigger: DyoTrigger = evaluation.status === 'COMPATIBLE' ? 'VALIDATION_PASSED' : 'VALIDATION_FAILED';
  const transition = transitionDyoState('VALIDATING', trigger);

  const updatedRes = await db.execute(sql`
    UPDATE dyo_configurations
    SET state = ${config.state === 'PRICED' ? 'PRICED' : transition.nextState}::dyo_state,
        compatibility_status = ${evaluation.status}::compatibility_result,
        compatibility_detail = ${JSON.stringify(evaluation.ruleDetails)}::jsonb,
        compatibility_checked_at = now(),
        state_version = state_version + 1,
        updated_at = now()
    WHERE id = ${config.id}
    RETURNING *;
  `);
  return updatedRes.rows[0] as unknown as DyoConfigurationRow;
}

export async function createDyoPriceQuote(
  db: CatalogDatabase,
  shortCode: string,
): Promise<{ snapshot: any; quoteToken: string }> {
  const config = await getDyoConfigurationByShortCode(db, shortCode);
  if (!config) throw new Error('DYO configuration not found');
  if (config.state !== 'VALID' && config.state !== 'PRICED') {
    throw new Error('DYO configuration must be in VALID or PRICED state to quote price');
  }
  if (!config.setting_variant_id || (!config.gemstone_id && !config.gemstone_pair_id)) {
    throw new Error('DYO_COMPONENTS_REQUIRED');
  }

  // Catalogue prices are only quoteable when both amount and evidence exist.
  const stoneId = config.gemstone_id ?? config.gemstone_pair_id;
  const stoneRes = await db.execute(sql`
    SELECT price_amount::text AS price, currency, price_evidence::text AS price_evidence
    FROM gemstones
    WHERE id = ${stoneId} AND deleted_at IS NULL AND state = 'ACTIVE' AND availability = true;
  `);
  const stone = stoneRes.rows[0] as {
    price: string | null;
    currency: string;
    price_evidence: string;
  } | undefined;
  if (!stone || stone.price === null || stone.price_evidence !== 'OBSERVED' && stone.price_evidence !== 'VERIFIED') {
    throw new Error('DYO_PRICE_UNVERIFIED');
  }
  if (!Number.isFinite(Number(stone.price)) || Number(stone.price) < 0) {
    throw new Error('DYO_PRICE_UNVERIFIED');
  }

  const variantRes = await db.execute(sql`
    SELECT base_price::text AS price, currency, price_evidence::text AS price_evidence
    FROM setting_variants
    WHERE id = ${config.setting_variant_id}
      AND deleted_at IS NULL AND state = 'ACTIVE' AND availability = true;
  `);
  const variant = variantRes.rows[0] as {
    price: string | null;
    currency: string;
    price_evidence: string;
  } | undefined;
  if (!variant || variant.price === null || variant.price_evidence !== 'OBSERVED' && variant.price_evidence !== 'VERIFIED') {
    throw new Error('DYO_SETTING_PRICE_UNVERIFIED');
  }
  if (!Number.isFinite(Number(variant.price)) || Number(variant.price) < 0) {
    throw new Error('DYO_SETTING_PRICE_UNVERIFIED');
  }
  if (stone.currency !== variant.currency) {
    throw new Error('DYO_CURRENCY_MISMATCH');
  }

  const componentBase = Number(stone.price) + Number(variant.price);
  const makingFee = Math.round(componentBase * 0.15 * 100) / 100;
  const calculated = calculateDyoPrice({
    gemstoneBasePrice: Number(stone.price),
    settingBasePrice: Number(variant.price),
    makingFee,
    currency: stone.currency.trim(),
  });

  const snapRes = await db.execute(sql`
    INSERT INTO dyo_price_snapshots (
      configuration_id, gemstone_component, setting_component,
      side_stone_component, making_component, discount_component,
      tax_component, total, currency, pricing_rule_version, breakdown,
      expires_at
    ) VALUES (
      ${config.id}, ${calculated.gemstoneComponent}, ${calculated.settingComponent},
      ${calculated.sideStoneComponent}, ${calculated.makingComponent},
      ${calculated.discountComponent}, ${calculated.taxComponent}, ${calculated.total},
      ${calculated.currency}, ${calculated.pricingRuleVersion},
      ${JSON.stringify(calculated.breakdown)}::jsonb, now() + interval '7 days'
    ) RETURNING *;
  `);
  const snapshot = snapRes.rows[0] as Record<string, unknown> | undefined;
  if (!snapshot || typeof snapshot['id'] !== 'string') {
    throw new Error('DYO_PRICE_SNAPSHOT_FAILED');
  }

  const quoteToken = `quote_${generateBase62Code(16)}`;
  await db.execute(sql`
    INSERT INTO dyo_quotes (quote_token, configuration_id, price_snapshot_id, expires_at)
    VALUES (${quoteToken}, ${config.id}, ${snapshot['id']}, now() + interval '7 days');
  `);

  // Enter or remain in PRICED state. Re-quoting allows a stale quote to be
  // replaced after a PRICE_CHANGED response without weakening its price guard.
  const stateRes = await db.execute(sql`
    UPDATE dyo_configurations
    SET state = 'PRICED'::dyo_state, state_version = state_version + 1, updated_at = now()
    WHERE id = ${config.id} AND state IN ('VALID'::dyo_state, 'PRICED'::dyo_state)
    RETURNING id;
  `);
  if (stateRes.rows.length === 0) {
    throw new Error('DYO_STATE_CHANGED_DURING_QUOTE');
  }

  return { snapshot, quoteToken };
}

export async function addDyoConfigurationToCart(
  db: CatalogDatabase,
  input: { shortCode: string; cartToken: string; quoteToken: string },
): Promise<{ cart: any; configurationId: string }> {
  return db.transaction(async (tx) => {
    // Lock the configuration and the selected quote for this complete conversion.
    const configRes = await tx.execute(sql`
      SELECT * FROM dyo_configurations
      WHERE short_code = ${input.shortCode}
      FOR UPDATE;
    `);
    const config = configRes.rows[0] as unknown as DyoConfigurationRow | undefined;
    if (!config) throw new Error('DYO_CONFIGURATION_NOT_FOUND');
    if (config.state !== 'PRICED') throw new Error('DYO_CONFIGURATION_NOT_PRICED');

    const updatedConfig = await validateDyoConfiguration(tx, input.shortCode);
    if (updatedConfig.compatibility_status !== 'COMPATIBLE') {
      throw new Error('DYO_COMPATIBILITY_FAILED');
    }
    if (!config.setting_variant_id || (!config.gemstone_id && !config.gemstone_pair_id)) {
      throw new Error('DYO_COMPONENTS_REQUIRED');
    }

    const quoteRes = await tx.execute(sql`
      SELECT id, price_snapshot_id
      FROM dyo_quotes
      WHERE quote_token = ${input.quoteToken}
        AND configuration_id = ${config.id}
        AND consumed_at IS NULL
        AND expires_at > now()
      FOR UPDATE;
    `);
    const quote = quoteRes.rows[0] as { id: string; price_snapshot_id: string } | undefined;
    if (!quote) throw new Error('DYO_QUOTE_INVALID');

    const snapRes = await tx.execute(sql`
      SELECT id, total::text AS total, currency
      FROM dyo_price_snapshots
      WHERE id = ${quote.price_snapshot_id}
        AND configuration_id = ${config.id}
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;
    `);
    const snapshot = snapRes.rows[0] as { id: string; total: string; currency: string } | undefined;
    if (!snapshot || snapshot.total == null) throw new Error('DYO_PRICE_SNAPSHOT_EXPIRED');

    const [stonePriceRes, settingPriceRes] = await Promise.all([
      tx.execute(sql`
        SELECT price_amount::text AS price, currency, price_evidence::text AS price_evidence
        FROM gemstones
        WHERE id = ${config.gemstone_id ?? config.gemstone_pair_id}
          AND deleted_at IS NULL AND state = 'ACTIVE' AND availability = true;
      `),
      tx.execute(sql`
        SELECT base_price::text AS price, currency, price_evidence::text AS price_evidence
        FROM setting_variants
        WHERE id = ${config.setting_variant_id}
          AND deleted_at IS NULL AND state = 'ACTIVE' AND availability = true;
      `),
    ]);
    const stonePrice = stonePriceRes.rows[0] as { price: string | null; currency: string; price_evidence: string } | undefined;
    const settingPrice = settingPriceRes.rows[0] as { price: string | null; currency: string; price_evidence: string } | undefined;
    if (!stonePrice || !settingPrice || stonePrice.price === null || settingPrice.price === null
      || !['OBSERVED', 'VERIFIED'].includes(stonePrice.price_evidence)
      || !['OBSERVED', 'VERIFIED'].includes(settingPrice.price_evidence)
      || stonePrice.currency !== settingPrice.currency) {
      throw new Error('DYO_PRICE_CHANGED');
    }
    const currentPrice = calculateDyoPrice({
      gemstoneBasePrice: Number(stonePrice.price),
      settingBasePrice: Number(settingPrice.price),
      currency: stonePrice.currency.trim(),
    });
    if (!Number.isFinite(Number(stonePrice.price)) || !Number.isFinite(Number(settingPrice.price))
      || currentPrice.total.toFixed(2) !== Number(snapshot.total).toFixed(2)) {
      throw new Error('DYO_PRICE_CHANGED');
    }

    const slug = `dyo-${config.short_code.toLowerCase()}`;
    const productRes = await tx.execute(sql`
      INSERT INTO products (
        kind, slug, title, setting_variant_id, gemstone_id, gemstone_pair_id,
        jewellery_type, stone_count, price_amount, currency, price_evidence,
        state, availability, sku_evidence_status
      ) VALUES (
        'CONFIGURED', ${slug}, ${`Custom ${config.jewellery_type} ${config.short_code}`},
        ${config.setting_variant_id}, ${config.gemstone_id}, ${config.gemstone_pair_id},
        ${config.jewellery_type}::jewellery_type, ${config.gemstone_pair_id ? 2 : 1},
        ${snapshot.total}::numeric, ${snapshot.currency}, 'INFERRED', 'ACTIVE', true, 'INFERRED'
      )
      ON CONFLICT (slug) WHERE deleted_at IS NULL
      DO UPDATE SET updated_at = now()
      RETURNING id;
    `);
    const productId = (productRes.rows[0] as { id: string } | undefined)?.id;
    if (!productId) throw new Error('DYO_CONFIGURED_PRODUCT_FAILED');

    const cartInput: AddToCartRepositoryInput = {
      product_id: productId,
      configuration_id: config.id,
      price_snapshot_id: snapshot.id,
      quantity: 1,
      expected_unit_price: snapshot.total,
    };
    const cart = await addItemToCart(tx, input.cartToken, cartInput);

    const consumeRes = await tx.execute(sql`
      UPDATE dyo_quotes
      SET consumed_at = now()
      WHERE id = ${quote.id} AND consumed_at IS NULL AND expires_at > now()
      RETURNING id;
    `);
    if (consumeRes.rows.length === 0) throw new Error('DYO_QUOTE_INVALID');

    const stateRes = await tx.execute(sql`
      UPDATE dyo_configurations
      SET state = 'ADDED_TO_CART'::dyo_state,
          state_version = state_version + 1,
          updated_at = now()
      WHERE id = ${config.id} AND state = 'PRICED'::dyo_state
      RETURNING id;
    `);
    if (stateRes.rows.length === 0) throw new Error('DYO_CONFIGURATION_STATE_CHANGED');

    await tx.execute(sql`
      INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, payload)
      VALUES (
        ${randomUUID()}, 'DYOConfigurationAddedToCart', 'DYO_CONFIGURATION', ${config.id},
        ${JSON.stringify({ cartToken: input.cartToken, quoteId: quote.id, priceSnapshotId: snapshot.id })}::jsonb
      );
    `);

    return { cart, configurationId: config.id };
  });
}

export async function findCompatibleSettingsForStone(
  db: CatalogDatabase,
  gemstoneId: string,
): Promise<any[]> {
  const stoneRes = await db.execute(sql`
    SELECT kind, variety_id, colour_id, shape, total_weight_ct::float AS weight
    FROM gemstones WHERE id = ${gemstoneId};
  `);
  if (stoneRes.rows.length === 0) return [];
  const stone = stoneRes.rows[0] as { kind: string } | undefined;
  if (!stone) return [];

  const targetJewelleryType = stone.kind === 'PAIR' ? 'EARRINGS' : null;

  const res = targetJewelleryType
    ? await db.execute(sql`
        SELECT s.id, s.design_code, s.name, s.jewellery_type, s.description
        FROM settings s
        WHERE s.state = 'ACTIVE' AND s.deleted_at IS NULL
          AND s.jewellery_type = ${targetJewelleryType}::jewellery_type
        ORDER BY s.name ASC LIMIT 50;
      `)
    : await db.execute(sql`
        SELECT s.id, s.design_code, s.name, s.jewellery_type, s.description
        FROM settings s
        WHERE s.state = 'ACTIVE' AND s.deleted_at IS NULL
          AND s.jewellery_type <> 'EARRINGS'
        ORDER BY s.name ASC LIMIT 50;
      `);
  return res.rows as unknown as any[];
}
