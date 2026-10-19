/**
 * packages/ai/src/whatsapp/formatter.ts
 *
 * Authority: technical_design/20_WHATSAPP_ARCHITECTURE.md §6
 *
 * Formats AI responses for WhatsApp constraints:
 * - Strips HTML tags and excessive Markdown syntax
 * - Converts bullet structures to clean text lists with '-'
 * - Converts citations to concise 'Source: <id>'
 * - Splits long messages (>4,000 characters) with explicit (1/2), (2/2) markers
 */
import type { WhatsAppSplitMessage } from './types.js';

const CHUNK_LIMIT = 4000;

export function formatForWhatsApp(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Convert block tags and list items to proper spacing/bullets
  text = text.replace(/<\/?(h[1-6]|p|div)>/gi, '\n');
  text = text.replace(/<li>/gi, '\n- ');
  text = text.replace(/<\/li>/gi, '');
  text = text.replace(/<\/?(ul|ol)>/gi, '\n');

  // 2. Remove any remaining HTML tags completely
  text = text.replace(/<[^>]*>/g, '');

  // 3. Normalize Markdown bold **word** -> *word* (WhatsApp style)
  text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');

  // 4. Normalize headers: '# Title' -> '*Title*'
  text = text.replace(/^#+\s*(.+)$/gm, '*$1*');

  // 5. Clean Markdown links [Label](url) -> Label (url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

  // 6. Ensure bullet points use clean '-'
  text = text.replace(/^\s*[*\u2022]\s+/gm, '- ');

  // Collapse multiple blank lines
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');

  return text.trim();
}

export function splitWhatsAppMessage(text: string): WhatsAppSplitMessage {
  const formatted = formatForWhatsApp(text);
  if (formatted.length <= CHUNK_LIMIT) {
    return {
      chunks: [formatted],
      isChunked: false,
    };
  }

  const chunks: string[] = [];
  let remaining = formatted;

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_LIMIT) {
      chunks.push(remaining);
      break;
    }

    // Try finding boundary at newline or period within CHUNK_LIMIT
    let splitIdx = remaining.lastIndexOf('\n', CHUNK_LIMIT);
    if (splitIdx === -1 || splitIdx < CHUNK_LIMIT * 0.7) {
      splitIdx = remaining.lastIndexOf('. ', CHUNK_LIMIT);
      if (splitIdx !== -1) splitIdx += 1;
    }
    if (splitIdx === -1 || splitIdx < CHUNK_LIMIT * 0.5) {
      splitIdx = remaining.lastIndexOf(' ', CHUNK_LIMIT);
    }
    if (splitIdx === -1) {
      splitIdx = CHUNK_LIMIT;
    }

    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }

  const total = chunks.length;
  const numberedChunks = chunks.map((c, idx) => `(${idx + 1}/${total})\n${c}`);

  return {
    chunks: numberedChunks,
    isChunked: true,
  };
}
