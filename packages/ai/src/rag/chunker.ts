/**
 * packages/ai/src/rag/chunker.ts
 *
 * Authority: technical_design/19_RETRIEVAL_AND_RAG_ARCHITECTURE.md §3, ADR-018
 *
 * Markdown heading-boundary chunker:
 * - Chunks target 400 to 800 tokens
 * - Preserves heading_path: e.g. ["Emeralds", "Origin", "Panjshir Valley"]
 * - Deterministic ordinal numbering per document
 */
import type { KnowledgeDoc, KnowledgeChunk } from './types.js';

function estimateTokens(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

export function chunkKnowledgeDocument(doc: KnowledgeDoc): ReadonlyArray<KnowledgeChunk> {
  const lines = doc.content.split('\n');
  const chunks: KnowledgeChunk[] = [];

  let currentHeadingPath: string[] = [doc.title];
  let currentBuffer: string[] = [];
  let currentTokens = 0;
  let ordinal = 1;

  function flushBuffer() {
    if (currentBuffer.length === 0) return;
    const text = currentBuffer.join('\n').trim();
    if (text.length === 0) return;

    chunks.push({
      id: `${doc.id}_chunk_${ordinal}`,
      documentId: doc.id,
      ordinal,
      content: text,
      tokenCount: estimateTokens(text),
      headingPath: [...currentHeadingPath],
      trustTier: doc.trustTier,
      metadata: doc.metadata ?? {},
    });
    ordinal++;
    currentBuffer = [];
    currentTokens = 0;
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const title = headingMatch[2]!.trim();

      // Heading boundary: flush previous section buffer
      if (currentBuffer.length > 0) {
        flushBuffer();
      }

      // Adjust heading path based on heading level
      if (level === 1) {
        currentHeadingPath = [doc.title, title];
      } else if (level === 2) {
        currentHeadingPath = [currentHeadingPath[0] ?? doc.title, title];
      } else {
        currentHeadingPath = [...currentHeadingPath.slice(0, level - 1), title];
      }

      currentBuffer.push(line);
      currentTokens += estimateTokens(line);
    } else {
      currentBuffer.push(line);
      currentTokens += estimateTokens(line);

      // If token count exceeds 700, flush at paragraph break
      if (currentTokens >= 700 && line.trim().length === 0) {
        flushBuffer();
      }
    }
  }

  flushBuffer();
  return chunks;
}
