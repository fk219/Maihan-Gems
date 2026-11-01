/**
 * Deterministic gemologist concierge.
 *
 * Parses a natural-language request against the live vocabulary (variety,
 * colour, origin, shape), budget and carat, then searches the catalogue with
 * the same trigram-ranked endpoint the storefront uses. There is no model
 * provider configured: this is not an LLM, and it refuses rather than
 * inventing when nothing matches.
 */
import type { AnyClient } from './db.js';
import { listGemstones } from './storefront.js';
import { askModel, modelConfigured, type ModelMessage } from './ai-provider.js';
import { AI_TOOLS, runTool } from './ai-tools.js';

interface Vocab { slug: string; name: string }

export interface ConciergeResult {
  interpretation: Array<{ label: string; value: string }>;
  items: Array<Record<string, unknown>>;
  total: number;
  refusal?: string;
  reply?: string | null;
  model?: boolean;
}

function bestMatch(rows: Vocab[], query: string): Vocab | null {
  const matches = rows
    .filter((row) => query.includes(row.name.toLowerCase()) || query.includes(row.slug.replace(/-/g, ' ')))
    .sort((a, b) => b.name.length - a.name.length);
  return matches[0] ?? null;
}

async function deterministicQuery(client: AnyClient, rawQuery: string): Promise<ConciergeResult> {
  const query = rawQuery.trim().slice(0, 200);
  if (!query) {
    return { interpretation: [], items: [], total: 0, refusal: 'Ask about a variety, colour, origin, shape, budget or carat weight.' };
  }
  const lower = query.toLowerCase();

  const [varieties, colours, origins, shapes] = await Promise.all([
    client.query<Vocab>(`SELECT slug, name FROM fresh.gemstone_varieties`),
    client.query<Vocab>(`SELECT slug, name FROM fresh.gemstone_colours`),
    client.query<Vocab>(`SELECT slug, name FROM fresh.gemstone_origins`),
    client.query<Vocab>(`SELECT slug, name FROM fresh.shapes`),
  ]);

  const variety = bestMatch(varieties.rows, lower);
  const colour = bestMatch(colours.rows, lower);
  const origin = bestMatch(origins.rows, lower);
  const shape = bestMatch(shapes.rows, lower);

  const budget = /(?:under|below|max|less than|up to|≤|<)\s*\$?\s*([\d][\d,]{2,})/i.exec(query)
    ?? /\$\s*([\d][\d,]{2,})/i.exec(query);
  const carat = /(\d+(?:\.\d+)?)\s*(?:ct|carat)/i.exec(query);
  const explicitPair = /\b(pairs?|earrings?|matched)\b/i.test(query);
  const kind = explicitPair ? 'PAIR' : 'SINGLE';

  const params = new URLSearchParams({ kind, limit: '8' });
  const interpretation: Array<{ label: string; value: string }> = [{ label: 'Type', value: kind === 'PAIR' ? 'Matched pair' : 'Loose stone' }];
  if (variety) { params.set('variety', variety.slug); interpretation.push({ label: 'Variety', value: variety.name }); }
  if (colour) { params.set('colour', colour.slug); interpretation.push({ label: 'Colour', value: colour.name }); }
  if (origin) { params.set('origin', origin.slug); interpretation.push({ label: 'Origin', value: origin.name }); }
  if (shape) { params.set('shape', shape.slug); interpretation.push({ label: 'Shape', value: shape.name }); }
  if (budget) {
    const max = Number(budget[1]!.replace(/,/g, ''));
    params.set('price_max', String(max));
    interpretation.push({ label: 'Budget', value: `Up to $${max.toLocaleString('en-US')}` });
  }
  if (carat) {
    const weight = Number(carat[1]);
    params.set('weight_min', String(Math.round(weight * 0.9 * 1000) / 1000));
    params.set('weight_max', String(Math.round(weight * 1.1 * 1000) / 1000));
    interpretation.push({ label: 'Carat', value: `≈ ${weight} ct` });
  }
  if (!variety && !colour && !origin && !shape && !budget && !explicitPair) {
    params.set('q', query);
    interpretation.push({ label: 'Search', value: query });
  }

  const result = await listGemstones(client, params);
  if (result.count === 0) {
    return {
      interpretation,
      items: [],
      total: 0,
      refusal: 'No stones in the vault match that reading. Try a variety, colour, origin, shape, budget or carat weight — the concierge refuses rather than guessing.',
    };
  }
  return { interpretation, items: result.items, total: result.count };
}

const SYSTEM_PROMPT = [
  'You are the Maihan Gems concierge, a gemologist assistant for a fine-gemstone house.',
  'Only state facts returned by the search_catalogue or get_stone tools. Never invent stones, prices, origins, treatments, certificates or availability.',
  'If the tools return nothing, say the vault has no match and suggest a broader query.',
  'Do not give investment, appraisal or valuation advice. Do not promise reservations.',
  'Keep the reply under 80 words, calm and precise.',
].join(' ');

interface SearchToolData { total?: number; items?: Array<Record<string, unknown>> }

/** Optional model turn: read-only tools only, falls back to the deterministic reading. */
async function modelTurn(client: AnyClient, query: string, base: ConciergeResult): Promise<ConciergeResult | null> {
  if (!modelConfigured()) return null;
  const messages: ModelMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: query },
  ];
  const first = await askModel(messages, AI_TOOLS);
  if (!first) return null;

  if (first.toolCalls.length === 0) {
    return { ...base, items: [], total: 0, refusal: undefined, reply: first.content || null, model: true };
  }

  const calls = first.toolCalls.filter((call) => ['search_catalogue', 'get_stone'].includes(call.name)).slice(0, 2);
  if (!calls.length) return { ...base, reply: first.content || null, model: true };

  let items = base.items;
  let total = base.total;
  const toolMessages: ModelMessage[] = [];
  for (const call of calls) {
    const result = await runTool(client, call.name, call.arguments);
    if (call.name === 'search_catalogue') {
      const data = result.data as SearchToolData;
      items = data.items ?? [];
      total = data.total ?? items.length;
    }
    toolMessages.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.name,
      content: JSON.stringify(result.data),
    });
  }

  const assistant: ModelMessage = {
    role: 'assistant',
    content: first.content,
    tool_calls: calls.map((call) => ({
      id: call.id,
      type: 'function' as const,
      function: { name: call.name, arguments: JSON.stringify(call.arguments) },
    })),
  };
  const second = await askModel([...messages, assistant, ...toolMessages], []);
  const reply = second?.content || first.content || (total > 0 ? `${total} matching stones in the vault.` : null);

  return {
    ...base,
    items,
    total,
    refusal: total === 0 ? base.refusal : undefined,
    reply,
    model: true,
  };
}

export async function conciergeQuery(client: AnyClient, rawQuery: string): Promise<ConciergeResult> {
  const base = await deterministicQuery(client, rawQuery);
  try {
    return (await modelTurn(client, rawQuery.trim().slice(0, 200), base)) ?? base;
  } catch {
    return base;
  }
}
