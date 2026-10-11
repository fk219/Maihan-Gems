/**
 * packages/ai/src/tools/dyo-pricing-tools.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4, doc 14, doc 16
 *
 * Tools:
 * - check_dyo_compatibility
 * - get_price_quote
 */
import { z } from 'zod';
import type { Tool, ToolContext, AuthzDecision, Citation } from './types.js';

// ─── 6. check_dyo_compatibility ──────────────────────────────────────────────

const CheckDyoCompatibilityInput = z.object({
  jewelleryType: z.enum(['RING', 'EARRINGS', 'PENDANT', 'NECKLACE', 'BRACELET']),
  settingVariantSku: z.string().min(1),
  gemRef: z.string().min(1),
});

const CheckDyoCompatibilityOutput = z.object({
  status: z.enum(['COMPATIBLE', 'INCOMPATIBLE', 'UNKNOWN']),
  isCompatible: z.boolean(),
  reasons: z.array(z.string()),
  evaluatedRules: z.array(z.record(z.unknown())),
});

export const checkDyoCompatibilityTool: Tool<
  z.infer<typeof CheckDyoCompatibilityInput>,
  z.infer<typeof CheckDyoCompatibilityOutput>
> = {
  name: 'check_dyo_compatibility',
  version: '1.0.0',
  description: 'Evaluate physical and geometric mounting compatibility between a gemstone and a setting design.',
  inputSchema: CheckDyoCompatibilityInput,
  outputSchema: CheckDyoCompatibilityOutput,
  mutates: false,
  timeoutMs: 2000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const outcome = await ctx.services.dyo.checkCompatibility(input);
    return {
      status: outcome.status,
      isCompatible: outcome.status === 'COMPATIBLE',
      reasons: outcome.reasons ?? [],
      evaluatedRules: outcome.evaluatedRules ?? [],
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    return [
      {
        type: 'DYO_RULE',
        id: `dyo_compat_${output.status}`,
        label: `Mounting Rule (${output.status})`,
        url: '/design-your-own',
        confidence: 1.0,
        fields: ['status', 'isCompatible', 'reasons'],
      },
    ];
  },
};

// ─── 7. get_price_quote ──────────────────────────────────────────────────────

const GetPriceQuoteInput = z.object({
  jewelleryType: z.string().optional(),
  settingVariantSku: z.string().optional(),
  gemRef: z.string().optional(),
  productId: z.string().optional(),
});

const GetPriceQuoteOutput = z.object({
  totalAmount: z.number(),
  currency: z.string(),
  breakdown: z.object({
    gemstoneComponent: z.number().optional(),
    settingComponent: z.number().optional(),
    makingFee: z.number().optional(),
    taxAmount: z.number().optional(),
  }),
  isLiveQuote: z.boolean(),
});

export const getPriceQuoteTool: Tool<
  z.infer<typeof GetPriceQuoteInput>,
  z.infer<typeof GetPriceQuoteOutput>
> = {
  name: 'get_price_quote',
  version: '1.0.0',
  description: 'Retrieve reproducible price quote snapshot and transparent component breakdown.',
  inputSchema: GetPriceQuoteInput,
  outputSchema: GetPriceQuoteOutput,
  mutates: false,
  timeoutMs: 2000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const quote = await ctx.services.pricing.getQuote(input);
    return {
      totalAmount: quote.totalAmount ?? quote.total ?? 0,
      currency: quote.currency ?? 'USD',
      breakdown: quote.breakdown ?? {},
      isLiveQuote: true,
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    return [
      {
        type: 'PRODUCT',
        id: `quote_${output.totalAmount}`,
        label: `Authoritative Price Quote: $${output.totalAmount} ${output.currency}`,
        url: '/cart',
        confidence: 1.0,
        fields: ['totalAmount', 'breakdown', 'currency'],
      },
    ];
  },
};
