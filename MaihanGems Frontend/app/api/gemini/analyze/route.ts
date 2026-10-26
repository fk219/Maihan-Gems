import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MODELS = [
  'gemini-4-argon',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const requestedModel = typeof body?.model === 'string' ? body.model : 'gemini-3.8-flash';
    const model = ALLOWED_MODELS.includes(requestedModel as (typeof ALLOWED_MODELS)[number])
      ? requestedModel
      : 'gemini-3.8-flash';

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required for gemological analysis.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured in server environment variables. Configure GEMINI_API_KEY in AI Studio Secrets to enable live Gemini synthesis.',
          modelUsed: model,
        },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          'You are the Chief Gemologist at Maihan Gems. Provide concise, evidence-based gemological commentary. Never invent lab report numbers or undisclosed treatments.',
      },
    });

    return NextResponse.json({
      text: response.text || 'No response text returned from model.',
      modelUsed: model,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error calling Gemini API.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
