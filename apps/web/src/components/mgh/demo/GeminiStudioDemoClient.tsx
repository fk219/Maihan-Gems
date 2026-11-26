'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Sparkles, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

const TEXT_MODELS = [
  {
    id: 'gemini-4-argon',
    label: 'gemini-4-argon (Complex Provenance & Inclusion Reasoning)',
  },
  {
    id: 'gemini-3.8-flash',
    label: 'gemini-3.8-flash (Balanced Salon Curation & Pairing)',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'gemini-3.1-flash-lite (Fast Low-Latency Optical Triage)',
  },
] as const;

const IMAGE_MODELS = [
  {
    id: 'gemini-3-pro-image-preview',
    label: 'gemini-3-pro-image-preview (High-Quality Studio Macro)',
  },
  {
    id: 'gemini-nano-banana-2.1',
    label: 'gemini-nano-banana-2.1 (Rapid Bespoke Concept Sketch)',
  },
] as const;

const IMAGE_SIZES = ['1K', '2K', '4K'] as const;
const ASPECT_RATIOS = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
  '21:9',
] as const;

export default function GeminiStudioDemoClient() {
  // Text Intelligence state
  const [selectedTextModel, setSelectedTextModel] = useState<string>('gemini-4-argon');
  const [textPrompt, setTextPrompt] = useState<string>(
    'Evaluate the optical pleochroism and bespoke ring setting suitability for Lot MG-TZ-0131 (1.31 ct Round Violetish Blue Tanzanite, VSI clarity, disclosed heat treatment, Merelani Hills origin).'
  );
  const [textLoading, setTextLoading] = useState(false);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  // Image Studio state
  const [selectedImageModel, setSelectedImageModel] = useState<string>(
    'gemini-3-pro-image-preview'
  );
  const [imageSize, setImageSize] = useState<string>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [imagePrompt, setImagePrompt] = useState<string>(
    'Macro studio photograph of a 1.31 carat round violetish-blue tanzanite resting on an unpolished warm travertine stone block, neutral daylight illumination, sharp facet reflections.'
  );
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setTextLoading(true);
    setTextError(null);
    setTextResult(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedTextModel,
          prompt: textPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTextError(data.error || 'Gemini API request failed.');
      } else {
        setTextResult(data.text);
      }
    } catch (err: unknown) {
      setTextError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setTextLoading(false);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageLoading(true);
    setImageError(null);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedImageModel,
          imageSize,
          aspectRatio,
          prompt: imagePrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error || 'Image generation request failed.');
      } else {
        setGeneratedImageUrl(data.imageUrl);
      }
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. Gemological Intelligence Workbench */}
      <section className="bg-[#F1EFEA] border border-[#E4E0D8] p-6 sm:p-8 space-y-5">
        <div className="border-b border-[#E4E0D8] pb-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#1E3A5F]">
            Server-Side Gemini Intelligence
          </p>
          <h2 className="font-serif text-2xl mt-1">
            Gemological Provenance &amp; Curation Synthesis
          </h2>
          <p className="text-xs text-[#575551] mt-1">
            Select between complex reasoning (<code>gemini-4-argon</code>), balanced
            curation (<code>gemini-3.8-flash</code>), or fast optical triage (
            <code>gemini-3.1-flash-lite</code>).
          </p>
        </div>

        <form onSubmit={handleRunAnalysis} className="space-y-4">
          <div>
            <label
              htmlFor="gemini-text-model"
              className="block font-mono text-xs uppercase tracking-wider text-[#575551] mb-1.5"
            >
              Gemini Reasoning Model
            </label>
            <select
              id="gemini-text-model"
              value={selectedTextModel}
              onChange={(e) => setSelectedTextModel(e.target.value)}
              className="w-full bg-[#F8F7F4] border border-[#E4E0D8] px-3 py-2 text-sm text-[#141413]"
            >
              {TEXT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="gemini-text-prompt"
              className="block font-mono text-xs uppercase tracking-wider text-[#575551] mb-1.5"
            >
              Gemological Inquiry
            </label>
            <textarea
              id="gemini-text-prompt"
              rows={4}
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              className="w-full bg-[#F8F7F4] border border-[#E4E0D8] p-3 text-sm text-[#141413]"
            />
          </div>

          <button
            type="submit"
            disabled={textLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#162C49] disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {textLoading ? 'Synthesizing Dossier Note…' : 'Run Gemological Analysis'}
          </button>
        </form>

        {textError && (
          <div
            role="alert"
            className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs space-y-1"
          >
            <p className="font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Honest API Telemetry
            </p>
            <p>{textError}</p>
          </div>
        )}

        {textResult && (
          <div className="p-4 bg-[#F8F7F4] border border-[#E4E0D8] space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#15803D] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Response from {selectedTextModel}
            </p>
            <p className="text-sm text-[#141413] whitespace-pre-line leading-relaxed">
              {textResult}
            </p>
          </div>
        )}
      </section>

      {/* 2. Studio Macro Image Generation Workbench */}
      <section className="bg-[#F1EFEA] border border-[#E4E0D8] p-6 sm:p-8 space-y-5">
        <div className="border-b border-[#E4E0D8] pb-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#1E3A5F]">
            Bespoke Macro Studio Visualization
          </p>
          <h2 className="font-serif text-2xl mt-1">
            Gemstone &amp; Setting Concept Image Generator
          </h2>
          <p className="text-xs text-[#575551] mt-1">
            Supports <code>gemini-3-pro-image-preview</code> and{' '}
            <code>gemini-nano-banana-2.1</code> with configurable resolution (1K, 2K,
            4K) and aspect ratios.
          </p>
        </div>

        <form onSubmit={handleGenerateImage} className="space-y-4">
          <div>
            <label
              htmlFor="gemini-image-model"
              className="block font-mono text-xs uppercase tracking-wider text-[#575551] mb-1.5"
            >
              Image Generation Model
            </label>
            <select
              id="gemini-image-model"
              value={selectedImageModel}
              onChange={(e) => setSelectedImageModel(e.target.value)}
              className="w-full bg-[#F8F7F4] border border-[#E4E0D8] px-3 py-2 text-sm text-[#141413]"
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block font-mono text-xs uppercase tracking-wider text-[#575551] mb-1.5">
                Output Resolution
              </span>
              <div className="flex gap-1.5" role="group" aria-label="Image size">
                {IMAGE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setImageSize(sz)}
                    aria-pressed={imageSize === sz}
                    className={`flex-1 py-1.5 text-xs font-mono uppercase border ${
                      imageSize === sz
                        ? 'bg-[#141413] text-white border-[#141413]'
                        : 'bg-[#F8F7F4] text-[#141413] border-[#E4E0D8]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="gemini-aspect-ratio"
                className="block font-mono text-xs uppercase tracking-wider text-[#575551] mb-1.5"
              >
                Aspect Ratio
              </label>
              <select
                id="gemini-aspect-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-[#F8F7F4] border border-[#E4E0D8] px-3 py-1.5 text-sm font-mono text-[#141413]"
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar} value={ar}>
                    {ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="gemini-image-prompt"
              className="block font-mono text-xs uppercase tracking-wider text-[#575551] mb-1.5"
            >
              Studio Lighting &amp; Subject Prompt
            </label>
            <textarea
              id="gemini-image-prompt"
              rows={3}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="w-full bg-[#F8F7F4] border border-[#E4E0D8] p-3 text-sm text-[#141413]"
            />
          </div>

          <button
            type="submit"
            disabled={imageLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#162C49] disabled:opacity-50"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {imageLoading
              ? `Rendering ${imageSize} (${aspectRatio})…`
              : `Generate ${imageSize} Studio Render`}
          </button>
        </form>

        {imageError && (
          <div
            role="alert"
            className="p-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs space-y-1"
          >
            <p className="font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Honest Image API Status
            </p>
            <p>{imageError}</p>
          </div>
        )}

        {generatedImageUrl && (
          <div className="p-4 bg-[#F8F7F4] border border-[#E4E0D8] space-y-2">
            <p className="font-mono text-xs text-[#15803D]">
              Rendered via {selectedImageModel} · {imageSize} · {aspectRatio}
            </p>
            <div className="relative w-full aspect-square bg-[#E4E0D8] overflow-hidden">
              <Image
                src={generatedImageUrl}
                alt={imagePrompt}
                fill
                referrerPolicy="no-referrer"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
