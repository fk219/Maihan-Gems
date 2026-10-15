/**
 * apps/web/src/api/dyo-handlers.ts
 *
 * Route handlers for Phase 7 Design Your Own (DYO) surfaces:
 *   - POST /api/v1/dyo/configurations
 *   - GET /api/v1/dyo/configurations/{shortCode}
 *   - POST /api/v1/dyo/configurations/{shortCode}/validate
 *   - POST /api/v1/dyo/configurations/{shortCode}/quote
 *   - GET /api/v1/dyo/configurations/{shortCode}/compatible-settings
 *   - POST /api/v1/dyo/configurations/{shortCode}/add-to-cart
 */
import { ContractError } from '@maihan/contracts';
import {
  createDyoConfiguration,
  getDyoConfigurationByShortCode,
  validateDyoConfiguration,
  createDyoPriceQuote,
  findCompatibleSettingsForStone,
  addItemToCart,
  type CatalogDatabase,
} from '@maihan/db';
import { computeConfigurationIdentity, parseSkuOrThrow } from '@maihan/domain';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db as unknown as CatalogDatabase;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available for DYO operations.');
}

async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Request body must be valid JSON.');
  }
}

export const createDyoConfigurationHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const jewelleryType = (rawBody['jewelleryType'] as string | undefined) ?? 'RING';
  const settingVariantSkuText = (rawBody['settingVariantSku'] as string | undefined) ?? 'JS1150W14';
  const parsedSku = parseSkuOrThrow(settingVariantSkuText);
  if (parsedSku.family !== 'SETTING') {
    throw new ContractError('VALIDATION_FAILED', `settingVariantSku must be a SETTING-only SKU, got: ${settingVariantSkuText}`);
  }
  const gemRef = (rawBody['gemRef'] as string | undefined) ?? null;

  // Compute canonical identity
  const idResult = computeConfigurationIdentity({
    hashVersion: 1,
    jewelleryType: jewelleryType as any,
    settingVariantSku: parsedSku.sku,
    gemRef,
    options: (rawBody['options'] as Record<string, unknown> | undefined) ?? {},
  });

  const row = await createDyoConfiguration(db, {
    configurationHash: idResult.configurationHash.value,
    shortCode: rawBody['shortCode'] as string,
    jewelleryType,
    settingId: rawBody['settingId'] as string | undefined,
    settingVariantId: rawBody['settingVariantId'] as string | undefined,
    gemstoneId: rawBody['gemstoneId'] as string | undefined,
    gemstonePairId: rawBody['gemstonePairId'] as string | undefined,
    engravingText: rawBody['engravingText'] as string | undefined,
    selectedOptions: rawBody['options'] as Record<string, unknown> | undefined,
    anonymousSessionId: rawBody['sessionId'] as string | undefined,
  });

  return {
    status: 201,
    body: {
      data: {
        configuration: row,
      },
    },
  };
};

export const getDyoConfigurationHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const shortCode = requireIdentifier(ctx.params['shortCode'], 'shortCode');
  const row = await getDyoConfigurationByShortCode(db, shortCode);
  if (!row) {
    throw new ContractError('NOT_FOUND', `DYO configuration not found for short code: ${shortCode}`);
  }
  return {
    status: 200,
    body: {
      data: {
        configuration: row,
      },
    },
  };
};

export const validateDyoConfigurationHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const shortCode = requireIdentifier(ctx.params['shortCode'], 'shortCode');
  const updated = await validateDyoConfiguration(db, shortCode);
  return {
    status: 200,
    body: {
      data: {
        configuration: updated,
      },
    },
  };
};

export const quoteDyoConfigurationHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const shortCode = requireIdentifier(ctx.params['shortCode'], 'shortCode');
  const { snapshot, quoteToken } = await createDyoPriceQuote(db, shortCode);
  return {
    status: 200,
    body: {
      data: {
        priceSnapshot: snapshot,
        quoteToken,
      },
    },
  };
};

export const getCompatibleSettingsHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const shortCode = requireIdentifier(ctx.params['shortCode'], 'shortCode');
  const config = await getDyoConfigurationByShortCode(db, shortCode);
  if (!config) {
    throw new ContractError('NOT_FOUND', `DYO configuration not found for short code: ${shortCode}`);
  }

  const stoneId = config.gemstone_id ?? config.gemstone_pair_id;
  if (!stoneId) {
    return {
      status: 200,
      body: {
        data: {
          compatibleSettings: [],
        },
      },
    };
  }

  const settings = await findCompatibleSettingsForStone(db, stoneId);
  return {
    status: 200,
    body: {
      data: {
        compatibleSettings: settings,
      },
    },
  };
};

export const addDyoToCartHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const shortCode = requireIdentifier(ctx.params['shortCode'], 'shortCode');
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;
  const cartToken = rawBody['cartToken'] as string | undefined;
  if (!cartToken) {
    throw new ContractError('VALIDATION_FAILED', 'cartToken is required to convert DYO to cart');
  }

  const config = await getDyoConfigurationByShortCode(db, shortCode);
  if (!config) {
    throw new ContractError('NOT_FOUND', `DYO configuration not found for short code: ${shortCode}`);
  }

  // Validate that configuration is in PRICED state
  if (config.state !== 'PRICED') {
    throw new ContractError('UNPROCESSABLE', 'DYO configuration must be quoted and in PRICED state before adding to cart');
  }

  // Re-verify compatibility and price inside transaction
  const updatedConfig = await validateDyoConfiguration(db, shortCode);
  if (updatedConfig.compatibility_status !== 'COMPATIBLE') {
    throw new ContractError('UNPROCESSABLE', 'DYO configuration re-validation failed during cart conversion');
  }

  if (!config.setting_variant_id || (!config.gemstone_id && !config.gemstone_pair_id)) {
    throw new ContractError('UNPROCESSABLE', 'DYO configuration is missing a setting variant or gemstone.');
  }

  const snapRes = await (db as any).query(
    `SELECT id, total::float AS total
     FROM dyo_price_snapshots
     WHERE configuration_id = $1 AND (expires_at IS NULL OR expires_at > now())
     ORDER BY computed_at DESC
     LIMIT 1;`,
    [config.id],
  );
  const snapshot = snapRes.rows[0] as { id: string; total: number } | undefined;
  if (!snapshot || snapshot.total == null) {
    throw new ContractError('UNPROCESSABLE', 'DYO configuration has no active price snapshot.');
  }

  const slug = `dyo-${String(config.short_code).toLowerCase()}`;
  const existing = await (db as any).query(
    `SELECT id FROM products WHERE slug = $1 AND deleted_at IS NULL LIMIT 1;`,
    [slug],
  );
  let productId = existing.rows[0]?.id as string | undefined;
  if (productId) {
    await (db as any).query(
      `UPDATE products SET price_amount = $2, updated_at = now() WHERE id = $1;`,
      [productId, snapshot.total],
    );
  } else {
    const inserted = await (db as any).query(
      `INSERT INTO products (
         kind, slug, title, setting_variant_id, gemstone_id, gemstone_pair_id,
         jewellery_type, stone_count, price_amount, currency, price_evidence, state, availability
       ) VALUES (
         'CONFIGURED', $1, $2, $3, $4, $5, $6::jewellery_type, $7, $8, 'USD', 'INFERRED', 'ACTIVE', true
       )
       RETURNING id;`,
      [
        slug,
        `Custom ${config.jewellery_type} ${config.short_code}`,
        config.setting_variant_id,
        config.gemstone_id,
        config.gemstone_pair_id,
        config.jewellery_type,
        config.gemstone_pair_id ? 2 : 1,
        snapshot.total,
      ],
    );
    productId = inserted.rows[0]?.id as string | undefined;
  }
  if (!productId) {
    throw new ContractError('UNPROCESSABLE', 'The configured product could not be saved.');
  }

  const cart = await addItemToCart(db, cartToken, {
    product_id: productId,
    configuration_id: config.id,
    quantity: 1,
  });

  await (db as any).query(
    `UPDATE dyo_quotes SET consumed_at = now()
     WHERE configuration_id = $1 AND consumed_at IS NULL;`,
    [config.id],
  );

  // Mark configuration as ADDED_TO_CART
  await (db as any).query(`UPDATE dyo_configurations SET state = 'ADDED_TO_CART'::dyo_state, updated_at = now() WHERE id = $1;`, [config.id]);

  return {
    status: 200,
    body: {
      data: {
        cart,
        configurationId: config.id,
        state: 'ADDED_TO_CART',
      },
    },
  };
};
