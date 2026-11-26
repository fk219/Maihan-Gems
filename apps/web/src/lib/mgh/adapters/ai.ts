/**
 * M6 — AI Gemologist page adapter (applet chat turn → repo AI concierge seam).
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md (the repo's
 * AI surface is POST /api/v1/ai/chat — conversations, messages and telemetry
 * persistence all live behind that one handler; the applet's `/api/applet
 * Gemini-proxy route` is deliberately NOT recreated).
 *
 * Contract (adapt, never invent): the applet's AiConciergeWorkspace calls the
 * deterministic local agent for search/DYO/wishlist turns; the model-side
 * reply enrichment is routed here instead of the applet's /api/ai-agent.
 * Response mapping keeps honesty first:
 * - repo `data.response` → applet `reply`
 * - repo `data.citations` ({type,id,label,url,confidence}) → applet
 *   {index,label,sublabel:type,id→sublabel fallback}
 * - `gemologicalNotes` stays the deterministic local turn's (the repo's turn
 *   reply carries author notes inside its text; nothing is fabricated)
 * - no key/HTTP failure → null, and the workspace keeps its deterministic
 *   local reply (honest degraded path; `DEGRADED_NO_MODEL_PROVIDER` is the
 *   repo handler's own telemetry label for keyless runs).
 *
 * Client actions (wishlist/bag/compare) never go through this adapter: they
 * act on the provider's local bag only, matching the repo's no-write AI
 * architecture (ADR-003). The tool registry still offers create_customer_
 * request/transfer_to_human via the server orchestrator.
 */

export interface AiGemologistReply {
  reply: string;
  gemologicalNotes: string[];
  citations: { index: number; label: string; sublabel: string; href: string }[];
  conversationKey: string | null;
}

type RepoChatCitation = {
  type?: unknown;
  id?: unknown;
  label?: unknown;
  url?: unknown;
};

function mapCitations(raw: unknown): AiGemologistReply['citations'] {
  if (!Array.isArray(raw)) return [];
  const out: AiGemologistReply['citations'] = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue;
    const rec = item as RepoChatCitation;
    const href = typeof rec.url === 'string' && rec.url.length > 0 ? rec.url : null;
    const label = typeof rec.label === 'string' && rec.label.trim().length > 0 ? rec.label : null;
    if (!label || !href) continue;
    const sublabel =
      typeof rec.type === 'string' && rec.type.length > 0
        ? rec.type
        : typeof rec.id === 'string'
          ? rec.id
          : 'EVIDENCE';
    out.push({ index: out.length + 1, label, sublabel, href });
  }
  return out;
}

export async function requestGemologistModelReply(
  message: string,
  conversationKey: string | null,
): Promise<AiGemologistReply | null> {
  try {
    const res = await fetch('/api/v1/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        surface: 'chat_panel',
        stream: false,
        ...(conversationKey ? { conversationKey } : {}),
      }),
    });
    if (!res.ok) return null;
    const payload: unknown = await res.json();
    if (payload === null || typeof payload !== 'object') return null;
    const data = (payload as Record<string, unknown>)['data'];
    if (data === null || typeof data !== 'object') return null;
    const rec = data as Record<string, unknown>;
    const responseText = rec['response'];
    if (typeof responseText !== 'string' || responseText.length === 0) return null;
    return {
      reply: responseText,
      gemologicalNotes: [],
      citations: mapCitations(rec['citations']),
      conversationKey: typeof rec['conversationKey'] === 'string' ? rec['conversationKey'] : null,
    };
  } catch {
    return null;
  }
}
