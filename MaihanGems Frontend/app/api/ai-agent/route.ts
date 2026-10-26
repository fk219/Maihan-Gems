import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateConciergeAgentTurn,
  type GemologistFocusMode,
} from '@/lib/ai-concierge-agent';
import { formatUsd } from '@/lib/storefront-data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const focusMode = (body?.focusMode as GemologistFocusMode) || 'all';
    const maxBudget = typeof body?.maxBudget === 'number' ? body.maxBudget : null;
    const unheatedOnly = Boolean(body?.unheatedOnly);

    if (!prompt) {
      return NextResponse.json(
        { error: 'Please provide a search query or question for the AI Gemologist.' },
        { status: 400 }
      );
    }

    // 1. Evaluate deterministic agent turn (product cards, comparisons, DYO proposal, citations, wishlist & cart actions)
    const agentTurn = evaluateConciergeAgentTurn(prompt, {
      focusMode,
      maxBudget,
      unheatedOnly,
    });

    // 2. If server GEMINI_API_KEY is configured, enhance the gemologist commentary via Gemini 3.8 Flash
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const stonesSummary = agentTurn.products
          .map(
            (s, i) =>
              `[${i + 1}] ${s.id}: ${s.name}, ${s.carat.toFixed(2)}ct, ${s.origin}, ${s.clarity}, ${s.treatmentDisclosed}, ${formatUsd(s.price)}`
          )
          .join(' | ');

        const dyoContext = agentTurn.dyoProposal
          ? `Bespoke DYOJ Pairing: ${agentTurn.dyoProposal.stone.name} + ${agentTurn.dyoProposal.setting.name} in ${agentTurn.dyoProposal.metalLabel} (${formatUsd(agentTurn.dyoProposal.totalPrice)}).`
          : '';

        const actionsExecuted = agentTurn.clientActions
          .map((a) =>
            a.type === 'ADD_TO_CART'
              ? `Added ${a.item.name} to Bag`
              : a.type === 'ADD_TO_WISHLIST'
              ? `Saved ${a.stoneName} to Wishlist`
              : `Synced ${a.stoneIds.join(', ')} to Compare`
          )
          .join(', ');

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Client query: "${prompt}".
Focus Mode: ${focusMode}.
Intent detected: ${agentTurn.intent}.
Matching vault specimens: [${stonesSummary}].
${dyoContext}
Executed client actions: [${actionsExecuted || 'None'}].
Write a warm, authoritative, plain-English 2–3 sentence response (max 55 words) as the Senior AI Gemologist of Maihan Gems Geneva. Reference the specific specimen IDs (like [1] ${agentTurn.products[0]?.id || 'MG-TZ-0131'}) and explain why they stand out in origin, clarity, or value. Confirm any executed Wishlist, Bag, Compare, or DYOJ Ring action accurately.`,
          config: {
            systemInstruction:
              'You are the Senior AI Gemologist of Maihan Gems Geneva. Be knowledgeable, clear, warm, and grounded strictly in the provided vault inventory.',
          },
        });

        if (response.text && response.text.trim().length > 0) {
          agentTurn.reply = response.text.trim();
        }
      } catch {
        // Fallback cleanly to deterministic reply if Gemini call times out or is rate-limited
      }
    }

    return NextResponse.json(agentTurn);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error in AI Gemologist.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
