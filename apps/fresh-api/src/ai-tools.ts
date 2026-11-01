/**
 * Read-only concierge tools. There is deliberately no write tool: the AI is an
 * orchestration layer over the catalogue, never a database client (ADR-003).
 */
import type { AnyClient } from './db.js';
import { listGemstones, gemstoneDetail } from './storefront.js';
import type { ToolSchema } from './ai-provider.js';

export const AI_TOOLS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'search_catalogue',
      description:
        'Search the live Maihan Gems catalogue. Returns up to 8 stones with reference, name, variety, colour, origin, shape, carat weight and price. Use this for any question about available stones.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Free-text query (name, reference, variety).' },
          variety: { type: 'string', description: 'Variety slug, e.g. ruby, sapphire, tanzanite.' },
          colour: { type: 'string', description: 'Colour slug, e.g. blue, red.' },
          origin: { type: 'string', description: 'Origin slug, e.g. sri-lanka, mozambique.' },
          shape: { type: 'string', description: 'Shape slug, e.g. oval, cushion.' },
          kind: { type: 'string', enum: ['SINGLE', 'PAIR'], description: 'Loose stone or matched pair.' },
          price_max: { type: 'number', description: 'Maximum price in USD.' },
          weight_min: { type: 'number', description: 'Minimum carat weight.' },
          weight_max: { type: 'number', description: 'Maximum carat weight.' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stone',
      description: 'Read one stone by its semantic reference or slug, including treatments and verified certificates.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Reference (G-…/P-…) or slug.' },
        },
        required: ['ref'],
        additionalProperties: false,
      },
    },
  },
];

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

export interface ToolResult {
  tool: string;
  data: unknown;
}

export async function runTool(client: AnyClient, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name === 'search_catalogue') {
    const params = new URLSearchParams({ limit: '8' });
    const q = str(args['q']);
    if (q) params.set('q', q);
    for (const key of ['variety', 'colour', 'origin', 'shape'] as const) {
      const value = str(args[key]);
      if (value) params.set(key, value);
    }
    const kind = str(args['kind']);
    if (kind === 'PAIR' || kind === 'SINGLE') params.set('kind', kind);
    const priceMax = num(args['price_max']);
    if (priceMax) params.set('price_max', priceMax);
    const weightMin = num(args['weight_min']);
    if (weightMin) params.set('weight_min', weightMin);
    const weightMax = num(args['weight_max']);
    if (weightMax) params.set('weight_max', weightMax);
    const result = await listGemstones(client, params);
    return {
      tool: name,
      data: {
        total: result.count,
        items: result.items.map((row) => ({
          ref: row.ref,
          slug: row.slug,
          name: row.name,
          primary_image: row.primary_image,
          variety: row.variety,
          colour: row.colour,
          origin: row.origin,
          shape: row.shape,
          weight_ct: row.weight_ct,
          price_amount: row.price_amount,
          currency: row.currency,
          kind: row.kind,
        })),
      },
    };
  }

  if (name === 'get_stone') {
    const ref = str(args['ref']);
    if (!ref) return { tool: name, data: { error: 'ref is required' } };
    const detail = await gemstoneDetail(client, ref);
    return {
      tool: name,
      data: detail
        ? {
            ref: detail.ref,
            name: detail.name,
            variety: detail.variety,
            colour: detail.colour,
            origin: detail.origin,
            shape: detail.shape,
            weight_ct: detail.weight_ct,
            price_amount: detail.price_amount,
            currency: detail.currency,
            treatments: detail.treatments,
            certificates: detail.certificates,
          }
        : { error: `no stone '${ref}'` },
    };
  }

  return { tool: name, data: { error: `unknown tool '${name}'` } };
}
