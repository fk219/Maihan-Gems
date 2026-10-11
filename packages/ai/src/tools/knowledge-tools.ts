/**
 * packages/ai/src/tools/knowledge-tools.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4, doc 19
 *
 * search_knowledge tool: hybrid knowledge retrieval with trust-tier weighting.
 */
import { z } from 'zod';
import type { Tool, ToolContext, AuthzDecision, Citation } from './types.js';

const SearchKnowledgeInput = z.object({
  query: z.string().min(2),
  docKinds: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(10).default(3),
});

const KnowledgeChunkItem = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  docKind: z.string(),
  trustTier: z.enum(['VERIFIED_PRODUCT_DATA', 'CURATED', 'COMMUNITY', 'UNVERIFIED']),
  content: z.string(),
  similarity: z.number(),
});

const SearchKnowledgeOutput = z.object({
  chunks: z.array(KnowledgeChunkItem),
});

export const searchKnowledgeTool: Tool<
  z.infer<typeof SearchKnowledgeInput>,
  z.infer<typeof SearchKnowledgeOutput>
> = {
  name: 'search_knowledge',
  version: '1.0.0',
  description: 'Search official gemmological knowledge articles, care guides, origin profiles, and policies.',
  inputSchema: SearchKnowledgeInput,
  outputSchema: SearchKnowledgeOutput,
  mutates: false,
  timeoutMs: 3000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const chunks = await ctx.services.knowledge.search(input.query, input.docKinds, input.limit);
    return {
      chunks: chunks.map((c: any) => ({
        id: String(c.id),
        title: String(c.title ?? 'Gemmology Knowledge'),
        slug: String(c.slug ?? 'education'),
        docKind: String(c.doc_kind ?? c.docKind ?? 'GUIDE'),
        trustTier: c.trust_tier ?? c.trustTier ?? 'CURATED',
        content: String(c.content ?? ''),
        similarity: Number(c.similarity ?? 0.85),
      })),
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    return output.chunks.map((c) => ({
      type: 'KNOWLEDGE',
      id: c.id,
      label: c.title,
      url: `/education/${c.slug}`,
      confidence: c.trustTier === 'VERIFIED_PRODUCT_DATA' ? 1.0 : c.similarity,
      fields: ['content', 'trust_tier'],
    }));
  },
};
