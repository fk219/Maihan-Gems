'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Gem, Search, Sparkles } from 'lucide-react';
import { MediaImage } from '@/components/mgh/ui/MediaImage';

interface LiveGem {
  ref: string;
  slug: string;
  name: string;
  kind: 'SINGLE' | 'PAIR';
  variety: string;
  shape: string | null;
  origin: string | null;
  weight_ct: string | number | null;
  price_amount: string | number | null;
  currency: string;
  primary_image: string | null;
}

interface ConciergeResult {
  interpretation: Array<{ label: string; value: string }>;
  items: LiveGem[];
  total: number;
  refusal?: string;
  reply?: string | null;
  model?: boolean;
}

const money = (v: string | number | null, cur: string): string => {
  const n = v == null ? 0 : Number(v);
  return n > 0 ? `$${n.toLocaleString('en-US')} ${cur || 'USD'}` : 'Price on request';
};

const EXAMPLES = [
  'Oval tanzanite',
  'Cushion amethyst',
  'Ruby from Mozambique',
  'Matched pairs',
];

export function LiveConcierge({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<ConciergeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/fresh/concierge', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!res.ok) throw new Error('The concierge could not reach the vault.');
      setResult((await res.json()) as ConciergeResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The concierge could not reach the vault.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery.trim()) void ask(initialQuery);
  }, [initialQuery, ask]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.24em] text-[#9A7B2C]">AI GEMOLOGIST · LIVE VAULT</p>
        <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl sm:text-5xl font-normal text-[#121211]">Ask the gemologist</h1>
        <p className="text-sm text-[#4E4C47]">
          Describe a stone — variety, colour, origin, shape, budget or carat. The concierge reads the live catalogue and refuses rather than guessing.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void ask(query); }}
        className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-[#E4DFD5] bg-white p-1.5 pl-4 shadow-sm focus-within:border-[#D4AF37]"
      >
        <Search className="h-4 w-4 shrink-0 text-[#9A7B2C]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Unheated blue sapphire from Sri Lanka under $8,000"
          aria-label="Ask the gemologist"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#121211] placeholder:text-[#A39E93] focus:outline-none"
        />
        <button type="submit" disabled={busy || !query.trim()} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] font-semibold gold-gradient-cta disabled:opacity-60">
          <Sparkles className="h-3.5 w-3.5" /> {busy ? 'Reading…' : 'Ask'}
        </button>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" onClick={() => { setQuery(example); void ask(example); }} className="rounded-full border border-[#E4DFD5] px-3.5 py-1.5 text-[11px] text-[#5C4E3C] hover:border-[#D4AF37]/60 hover:text-[#9A7B2C] transition-colors">
            {example}
          </button>
        ))}
      </div>

      {error ? <p className="text-center text-xs text-[#9B3A2A]">{error}</p> : null}

      {result ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {result.interpretation.map((i) => (
              <span key={`${i.label}-${i.value}`} className="rounded-full border border-[#D4AF37]/40 bg-[#FCF8EC] px-3 py-1 text-[10.5px] font-[family-name:var(--font-mono)] uppercase tracking-[0.12em] text-[#9A7B2C]">
                {i.label}: {i.value}
              </span>
            ))}
            <span className="text-[11px] text-[#76726A]">{result.total} match{result.total === 1 ? '' : 'es'}</span>
            <span className="text-[9px] font-[family-name:var(--font-mono)] uppercase tracking-[0.14em] text-[#A39E93]">
              {result.model ? 'Model-assisted' : 'Deterministic reading'}
            </span>
          </div>

          {result.reply ? (
            <div className="mx-auto max-w-2xl rounded-sm border border-[#D4AF37]/40 bg-[#FCF8EC] p-4">
              <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#9A7B2C]">Concierge</p>
              <p className="mt-1 text-sm leading-relaxed text-[#3D362C]">{result.reply}</p>
            </div>
          ) : null}

          {result.refusal ? (
            <div className="mx-auto max-w-xl rounded-sm border border-[#E4DFD5] bg-white p-8 text-center space-y-3">
              <Gem className="mx-auto h-6 w-6 text-[#9A7B2C]" />
              <p className="text-sm text-[#4E4C47]">{result.refusal}</p>
              <Link href="/browse" className="inline-block rounded-sm px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta">Browse the vault</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {result.items.map((stone) => (
                <Link
                  key={stone.ref}
                  href={stone.kind === 'PAIR' ? '/pairs' : `/product/${stone.slug || stone.ref}`}
                  className="group rounded-sm border border-[#E4DFD5] bg-white overflow-hidden hover:border-[#D4AF37]/60 transition-colors"
                >
                  <div className="relative flex h-36 items-center justify-center bg-[#FBF7EC]">
                    {stone.primary_image ? (
                      <MediaImage src={stone.primary_image} alt={stone.name} className="h-full w-full object-cover" sizes="(max-width: 640px) 100vw, 25vw" />
                    ) : (
                      <span className="text-3xl text-[#D4AF37]/50 font-serif">{stone.variety.charAt(0)}</span>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-sm font-medium text-[#121211] group-hover:text-[#9A7B2C]">{stone.name}</p>
                    <p className="text-[11px] text-[#76726A]">
                      {stone.variety}{stone.shape ? ` · ${stone.shape}` : ''}{stone.origin ? ` · ${stone.origin}` : ''}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9A7B2C]">
                      {stone.ref}{stone.weight_ct ? ` · ${Number(stone.weight_ct).toFixed(2)} ct` : ''}
                    </p>
                    <p className="text-sm font-medium text-[#9A7B2C]">{money(stone.price_amount, stone.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-[#E4DFD5] pt-5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
        <Link href="/browse" className="inline-flex items-center gap-1.5 hover:text-[#9A7B2C]">Search the ledger <ArrowRight className="h-3 w-3" /></Link>
        <Link href="/design-your-own" className="inline-flex items-center gap-1.5 hover:text-[#9A7B2C]">Design your own <ArrowRight className="h-3 w-3" /></Link>
        <Link href="/contact" className="inline-flex items-center gap-1.5 hover:text-[#9A7B2C]">Speak to a gemologist <ArrowRight className="h-3 w-3" /></Link>
      </div>
    </div>
  );
}
