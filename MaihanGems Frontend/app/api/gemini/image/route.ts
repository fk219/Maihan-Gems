import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_IMAGE_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-nano-banana-2.1',
] as const;

const ALLOWED_SIZES = ['1K', '2K', '4K'] as const;
const ALLOWED_ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
  '21:9',
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const requestedModel =
      typeof body?.model === 'string' ? body.model : 'gemini-3-pro-image-preview';
    const model = ALLOWED_IMAGE_MODELS.includes(
      requestedModel as (typeof ALLOWED_IMAGE_MODELS)[number]
    )
      ? requestedModel
      : 'gemini-3-pro-image-preview';

    const requestedSize = typeof body?.imageSize === 'string' ? body.imageSize : '1K';
    const imageSize = ALLOWED_SIZES.includes(requestedSize as (typeof ALLOWED_SIZES)[number])
      ? requestedSize
      : '1K';

    const requestedAspect = typeof body?.aspectRatio === 'string' ? body.aspectRatio : '1:1';
    const aspectRatio = ALLOWED_ASPECT_RATIOS.includes(
      requestedAspect as (typeof ALLOWED_ASPECT_RATIOS)[number]
    )
      ? requestedAspect
      : '1:1';

    if (!prompt) {
      return NextResponse.json(
        { error: 'An image generation prompt is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured or requires a paid API key for studio image generation. Configure GEMINI_API_KEY in AI Studio Secrets.',
          modelUsed: model,
          imageSize,
          aspectRatio,
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
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    let base64DataUrl: string | null = null;
    let textNote = '';

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        base64DataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textNote += part.text;
      }
    }

    if (!base64DataUrl) {
      return NextResponse.json(
        {
          error: textNote || 'Model completed request without returning an inline image payload.',
          modelUsed: model,
          imageSize,
          aspectRatio,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageUrl: base64DataUrl,
      note: textNote,
      modelUsed: model,
      imageSize,
      aspectRatio,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error calling Gemini Image API.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
