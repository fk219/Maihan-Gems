'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { formatMoney, type StorefrontCurrency } from '../../lib/currency.js';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command.js';
import { useStorefront } from './StorefrontProvider.js';

interface InstantHit {
  slug: string;
  title: string;
  priceUsd: number;
  kind: string;
}

const PROMPTS = [
  'Untreated 3ct Ceylon sapphire',
  'Sapphire pairs under 15,000',
  'Pigeon blood ruby oval',
  'Halo ring setting',
];

export function HeroSearch() {
  const router = useRouter();
  const { currency, rates } = useStorefront();
  const [q, setQ] = useState('');
  const [palette, setPalette] = useState(false);
  const [hits, setHits] = useState<InstantHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
      if (!res.ok) return;
      const data = (await res.json()) as { items: InstantHit[] };
      setHits(data.items ?? []);
    }, 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const go = (value = q) => {
    const next = value.trim();
    if (next.length === 0) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <div className="lx-search">
      <button type="button" className="lx-text-btn" onClick={() => setPalette(true)}>
        Open the stone index
      </button>
      <CommandDialog open={palette} onOpenChange={setPalette} title="Stone index" description="Search the vault or start from a known request.">
        <Command>
          <CommandInput placeholder="Stone, cut, or setting" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>No indexed match yet. Search still runs against the catalogue.</CommandEmpty>
            <CommandGroup heading="Known requests">
              {PROMPTS.map((prompt) => (
                <CommandItem key={prompt} value={prompt} onSelect={() => { setPalette(false); go(prompt); }}>
                  {prompt}
                </CommandItem>
              ))}
            </CommandGroup>
            {hits.length > 0 ? (
              <CommandGroup heading="Catalogue">
                {hits.map((hit) => (
                  <CommandItem key={hit.slug} value={hit.title} onSelect={() => { setPalette(false); router.push(`/product/${hit.slug}`); }}>
                    {hit.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
      <form
        className="lx-search__box"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe the gem you’re looking for…"
          aria-label="Describe the gem you are looking for"
        />
        <button type="submit">Search</button>
      </form>
      {hits.length > 0 ? (
        <div className="lx-instant" role="listbox">
          {hits.map((hit) => (
            <a key={hit.slug} href={`/product/${hit.slug}`}>
              <span>{hit.title}</span>
              <span>{formatMoney(hit.priceUsd, currency as StorefrontCurrency, rates)}</span>
            </a>
          ))}
        </div>
      ) : null}
      <div className="lx-search__hints">
        {PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => go(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
