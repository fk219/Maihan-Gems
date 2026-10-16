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
  addDyoConfigurationToCart,
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

  try {
    const result = await addDyoConfigurationToCart(db, {
      shortCode,
      cartToken,
      quoteToken: String(rawBody['quoteToken'] ?? ''),
    });
    return {
      status: 200,
      body: {
        data: {
          cart: result.cart,
          configurationId: result.configurationId,
          state: 'ADDED_TO_CART',
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        DYO_CONFIGURATION_NOT_FOUND: 'DYO configuration not found.',
        DYO_CONFIGURATION_NOT_PRICED: 'DYO configuration must be quoted before adding it to cart.',
        DYO_COMPATIBILITY_FAILED: 'DYO configuration re-validation failed during cart conversion.',
        DYO_COMPONENTS_REQUIRED: 'DYO configuration is missing a setting variant or gemstone.',
        DYO_QUOTE_INVALID: 'A valid, unconsumed quote is required to add this configuration to cart.',
        DYO_PRICE_SNAPSHOT_EXPIRED: 'DYO configuration has no active price snapshot.',
        DYO_CONFIGURED_PRODUCT_FAILED: 'The configured product could not be saved.',
        DYO_CONFIGURATION_STATE_CHANGED: 'DYO configuration state changed during cart conversion.',
      };
      if (error.message === 'DYO_PRICE_CHANGED') {
        throw new ContractError('PRICE_CHANGED', 'The quoted price is no longer current. Request a new quote before adding this configuration to cart.');
      }
      const message = messages[error.message];
      if (message) throw new ContractError('UNPROCESSABLE', message);
    }
    throw error;
  }
};
