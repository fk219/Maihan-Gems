/**
 * packages/ai/src/tools/inventory-tools.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4
 *
 * Controlled read-only tools for catalogue discovery:
 * - search_inventory
 * - get_product
 * - get_gemstone
 * - compare_gemstones
 */
import { z } from 'zod';
import type { Tool, ToolContext, AuthzDecision, Citation } from './types.js';

// ─── 1. search_inventory ─────────────────────────────────────────────────────

const SearchInventoryInput = z.object({
  query: z.string().optional(),
  variety: z.string().optional(),
  shape: z.string().optional(),
  minCarat: z.number().positive().optional(),
  maxCarat: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

const SearchInventoryOutput = z.object({
  items: z.array(z.record(z.unknown())),
  total: z.number(),
  facets: z.record(z.unknown()).optional(),
});

export const searchInventoryTool: Tool<
  z.infer<typeof SearchInventoryInput>,
  z.infer<typeof SearchInventoryOutput>
> = {
  name: 'search_inventory',
  version: '1.0.0',
  description: 'Search available gemstones and pieces with structured mineralogical and pricing filters.',
  inputSchema: SearchInventoryInput,
  outputSchema: SearchInventoryOutput,
  mutates: false,
  timeoutMs: 3000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const result = await ctx.services.catalog.search(input);
    return {
      items: result.items,
      total: result.total,
      facets: result.facets,
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    return output.items.map((item: any) => ({
      type: item.slug ? 'PRODUCT' : 'GEMSTONE',
      id: String(item.id ?? item.gem_ref ?? item.slug),
      label: String(item.title ?? item.name ?? 'Gemstone Piece'),
      url: item.slug ? `/products/${item.slug}` : `/gemstones/${item.gem_ref}`,
      confidence: 1.0,
      fields: ['variety', 'carat', 'price', 'shape'],
    }));
  },
};

// ─── 2. get_product ──────────────────────────────────────────────────────────

const GetProductInput = z.object({
  slug: z.string().optional(),
  productId: z.string().optional(),
}).refine((data) => data.slug !== undefined || data.productId !== undefined, {
  message: 'Either slug or productId must be provided.',
});

const GetProductOutput = z.object({
  product: z.record(z.unknown()).nullable(),
  found: z.boolean(),
});

export const getProductTool: Tool<
  z.infer<typeof GetProductInput>,
  z.infer<typeof GetProductOutput>
> = {
  name: 'get_product',
  version: '1.0.0',
  description: 'Retrieve full technical details, verified provenance and mounting specs for a canonical product.',
  inputSchema: GetProductInput,
  outputSchema: GetProductOutput,
  mutates: false,
  timeoutMs: 2000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const product = await ctx.services.catalog.getProduct(input);
    return {
      product,
      found: product !== null,
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    if (!output.product) return [];
    const p: any = output.product;
    return [
      {
        type: 'PRODUCT',
        id: String(p.id ?? p.slug),
        label: String(p.title ?? 'Product Detail'),
        url: `/products/${p.slug}`,
        confidence: 1.0,
        fields: ['title', 'price', 'provenance', 'specifications'],
      },
    ];
  },
};

// ─── 3. get_gemstone ─────────────────────────────────────────────────────────

const GetGemstoneInput = z.object({
  gemRef: z.string().min(1),
});

const GetGemstoneOutput = z.object({
  gemstone: z.record(z.unknown()).nullable(),
  found: z.boolean(),
});

export const getGemstoneTool: Tool<
  z.infer<typeof GetGemstoneInput>,
  z.infer<typeof GetGemstoneOutput>
> = {
  name: 'get_gemstone',
  version: '1.0.0',
  description: 'Retrieve physical dimensions, carat weight, origin, cut, and treatment verification for a gemstone.',
  inputSchema: GetGemstoneInput,
  outputSchema: GetGemstoneOutput,
  mutates: false,
  timeoutMs: 2000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const gemstone = await ctx.services.catalog.getGemstone(input.gemRef);
    return {
      gemstone,
      found: gemstone !== null,
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    if (!output.gemstone) return [];
    const g: any = output.gemstone;
    return [
      {
        type: 'GEMSTONE',
        id: String(g.gem_ref ?? g.id),
        label: `Gemstone ${g.gem_ref ?? ''}`,
        url: `/gemstones/${g.gem_ref}`,
        confidence: 1.0,
        fields: ['weight_ct', 'dimensions', 'origin', 'treatments'],
      },
    ];
  },
};

// ─── 4. compare_gemstones ───────────────────────────────────────────────────

const CompareGemstonesInput = z.object({
  gemRefs: z.array(z.string().min(1)).min(2).max(4),
});

const CompareGemstonesOutput = z.object({
  stones: z.array(z.record(z.unknown())),
  attributesCompared: z.array(z.string()),
});

export const compareGemstonesTool: Tool<
  z.infer<typeof CompareGemstonesInput>,
  z.infer<typeof CompareGemstonesOutput>
> = {
  name: 'compare_gemstones',
  version: '1.0.0',
  description: 'Compare 2 to 4 gemstones side-by-side with explicit preservation of null and verified attributes.',
  inputSchema: CompareGemstonesInput,
  outputSchema: CompareGemstonesOutput,
  mutates: false,
  timeoutMs: 3000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const stones = await ctx.services.catalog.getGemstones(input.gemRefs);
    return {
      stones,
      attributesCompared: ['weight_ct', 'shape', 'colour', 'origin', 'treatment', 'dimensions', 'price'],
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    return output.stones.map((g: any) => ({
      type: 'GEMSTONE',
      id: String(g.gem_ref ?? g.id),
      label: `Gemstone ${g.gem_ref ?? ''}`,
      url: `/gemstones/${g.gem_ref}`,
      confidence: 1.0,
      fields: ['weight_ct', 'shape', 'origin', 'treatment'],
    }));
  },
};
