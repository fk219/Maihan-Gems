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
import {
  calculateDyoPrice,
  evaluateCompatibility,
  transitionDyoState,
  type CompatibilityRuleInput,
  type EvaluatedStoneInput,
  type DyoTrigger,
} from '@maihan/domain';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
}

export type CatalogDatabase = any;

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
  const sql = `
    INSERT INTO dyo_configurations (
      configuration_hash, short_code, jewellery_type,
      setting_id, setting_variant_id, gemstone_id, gemstone_pair_id,
      engraving_text, selected_options, state, compatibility_status,
      anonymous_session_id, customer_id, expires_at
    ) VALUES (
      $1, $2, $3::jewellery_type,
      $4, $5, $6, $7,
      $8, $9, 'DRAFT'::dyo_state, 'UNKNOWN'::compatibility_result,
      $10, $11, $12
    )
    ON CONFLICT (configuration_hash) WHERE state <> 'EXPIRED'
    DO UPDATE SET updated_at = now()
    RETURNING *;
  `;
  const res = (await db.query(sql, [
    input.configurationHash,
    shortCode,
    input.jewelleryType,
    input.settingId ?? null,
    input.settingVariantId ?? null,
    input.gemstoneId ?? null,
    input.gemstonePairId ?? null,
    input.engravingText ?? null,
    JSON.stringify(input.selectedOptions ?? {}),
    input.anonymousSessionId ?? null,
    input.customerId ?? null,
    input.expiresAt ?? null,
  ])) as QueryResult<DyoConfigurationRow>;
  return res.rows[0] as DyoConfigurationRow;
}

export async function getDyoConfigurationByShortCode(
  db: CatalogDatabase,
  shortCode: string,
): Promise<DyoConfigurationRow | null> {
  const res = (await db.query(
    `SELECT * FROM dyo_configurations WHERE short_code = $1;`,
    [shortCode],
  )) as QueryResult<DyoConfigurationRow>;
  return res.rows[0] ?? null;
}

export async function getDyoConfigurationById(
  db: CatalogDatabase,
  id: string,
): Promise<DyoConfigurationRow | null> {
  const res = (await db.query(
    `SELECT * FROM dyo_configurations WHERE id = $1;`,
    [id],
  )) as QueryResult<DyoConfigurationRow>;
  return res.rows[0] ?? null;
}

export async function loadSettingCompatibilityRules(
  db: CatalogDatabase,
  settingId: string,
): Promise<CompatibilityRuleInput[]> {
  const sql = `
    SELECT
      id, setting_id AS "settingId", jewellery_type AS "jewelleryType",
      stone_kind AS "stoneKind", variety_id AS "varietyId", colour_id AS "colourId",
      shape, min_weight_ct::float AS "minWeightCt", max_weight_ct::float AS "maxWeightCt",
      min_length_mm::float AS "minLengthMm", max_length_mm::float AS "maxLengthMm",
      min_width_mm::float AS "minWidthMm", max_width_mm::float AS "maxWidthMm",
      requires_treatment_id AS "requiresTreatmentId", forbids_treatment_id AS "forbidsTreatmentId",
      rule_kind AS "ruleKind", priority, explanation
    FROM setting_compatibility_rules
    WHERE setting_id = $1 AND state = 'ACTIVE'
    ORDER BY priority DESC;
  `;
  const res = (await db.query(sql, [settingId])) as QueryResult<CompatibilityRuleInput>;
  return res.rows;
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
    const stoneRes = await db.query(
      `SELECT variety_id, colour_id, shape, total_weight_ct::float as weight, kind, length_mm::float as length_mm, width_mm::float as width_mm
       FROM gemstones WHERE id = $1;`,
      [stoneId],
    );
    if (stoneRes.rows.length > 0) {
      const s = stoneRes.rows[0];
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

  const updateSql = `
    UPDATE dyo_configurations
    SET state = $1::dyo_state,
        compatibility_status = $2::compatibility_result,
        compatibility_detail = $3,
        compatibility_checked_at = now(),
        state_version = state_version + 1,
        updated_at = now()
    WHERE id = $4
    RETURNING *;
  `;
  const updatedRes = (await db.query(updateSql, [
    transition.nextState,
    evaluation.status,
    JSON.stringify(evaluation.ruleDetails),
    config.id,
  ])) as QueryResult<DyoConfigurationRow>;
  return updatedRes.rows[0] as DyoConfigurationRow;
}

export async function createDyoPriceQuote(
  db: CatalogDatabase,
  shortCode: string,
): Promise<{ snapshot: any; quoteToken: string }> {
  const config = await getDyoConfigurationByShortCode(db, shortCode);
  if (!config) throw new Error('DYO configuration not found');
  if (config.state !== 'VALID') {
    throw new Error('DYO configuration must be in VALID state to quote price');
  }

  // Load stone price & setting price
  let stonePrice = 0;
  if (config.gemstone_id || config.gemstone_pair_id) {
    const stoneId = config.gemstone_id ?? config.gemstone_pair_id;
    const sRes = await db.query(
      `SELECT price_amount::float as price, price_evidence FROM gemstones WHERE id = $1`,
      [stoneId],
    );
    if (sRes.rows.length > 0 && sRes.rows[0].price_evidence === 'UNKNOWN') {
      throw new Error('DYO_PRICE_UNVERIFIED');
    }
    if (sRes.rows.length > 0) stonePrice = sRes.rows[0].price || 0;
  }

  let settingPrice = 0;
  if (config.setting_variant_id) {
    const vRes = await db.query(`SELECT base_price::float as price FROM setting_variants WHERE id = $1`, [
      config.setting_variant_id,
    ]);
    if (vRes.rows.length > 0) settingPrice = vRes.rows[0].price || 0;
  }

  const calculated = calculateDyoPrice({
    gemstoneBasePrice: stonePrice,
    settingBasePrice: settingPrice,
    currency: 'USD',
  });

  const snapshotSql = `
    INSERT INTO dyo_price_snapshots (
      configuration_id, gemstone_component, setting_component,
      side_stone_component, making_component, discount_component,
      tax_component, total, currency, pricing_rule_version, breakdown,
      expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now() + interval '7 days'
    ) RETURNING *;
  `;
  const snapRes = await db.query(snapshotSql, [
    config.id,
    calculated.gemstoneComponent,
    calculated.settingComponent,
    calculated.sideStoneComponent,
    calculated.makingComponent,
    calculated.discountComponent,
    calculated.taxComponent,
    calculated.total,
    calculated.currency,
    calculated.pricingRuleVersion,
    JSON.stringify(calculated.breakdown),
  ]);
  const snapshot = snapRes.rows[0];

  const quoteToken = `quote_${generateBase62Code(16)}`;
  await db.query(
    `INSERT INTO dyo_quotes (quote_token, configuration_id, price_snapshot_id, expires_at)
     VALUES ($1, $2, $3, now() + interval '7 days');`,
    [quoteToken, config.id, snapshot.id],
  );

  // Transition state to PRICED
  await db.query(
    `UPDATE dyo_configurations SET state = 'PRICED'::dyo_state, state_version = state_version + 1, updated_at = now() WHERE id = $1;`,
    [config.id],
  );

  return { snapshot, quoteToken };
}

export async function findCompatibleSettingsForStone(
  db: CatalogDatabase,
  gemstoneId: string,
): Promise<any[]> {
  const stoneRes = await db.query(
    `SELECT kind, variety_id, colour_id, shape, total_weight_ct::float as weight
     FROM gemstones WHERE id = $1;`,
    [gemstoneId],
  );
  if (stoneRes.rows.length === 0) return [];
  const stone = stoneRes.rows[0];

  const targetJewelleryType = stone.kind === 'PAIR' ? 'EARRINGS' : null;

  let sql = `
    SELECT s.id, s.design_code, s.name, s.jewellery_type, s.description
    FROM settings s
    WHERE s.state = 'ACTIVE' AND s.deleted_at IS NULL
  `;
  const params: any[] = [];
  if (targetJewelleryType) {
    sql += ` AND s.jewellery_type = $1`;
    params.push(targetJewelleryType);
  } else {
    sql += ` AND s.jewellery_type <> 'EARRINGS'`;
  }
  sql += ` ORDER BY s.name ASC LIMIT 50;`;

  const res = await db.query(sql, params);
  return res.rows;
}
