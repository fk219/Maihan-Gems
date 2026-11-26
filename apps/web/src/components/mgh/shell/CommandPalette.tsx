'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';

interface LiveGem {
  ref: string;
  slug: string;
  name: string;
  kind: 'SINGLE' | 'PAIR';
  variety: string;
  shape: string | null;
  origin: string | null;
  price_amount: string | number | null;
  currency: string;
}
interface LiveSetting {
  ref: string;
  sku: string;
  name: string;
  design_code: string;
  jewellery_type: string;
  metal: string;
  price_amount: string | number | null;
  currency: string;
}

const money = (v: string | number | null, cur: string): string => {
  const n = v == null ? 0 : Number(v);
  return n > 0 ? `$${n.toLocaleString('en-US')} ${cur || 'USD'}` : 'Price on request';
};

export default function CommandPalette() {
  const { isSearchOpen, setSearchOpen } = useStorefront();
  const [query, setQuery] = useState('');
  const [singles, setSingles] = useState<LiveGem[]>([]);
  const [pairs, setPairs] = useState<LiveGem[]>([]);
  const [settings, setSettings] = useState<LiveSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  const runSearch = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) {
      setSingles([]); setPairs([]); setSettings([]); setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [gemRes, setRes] = await Promise.all([
        fetch(`/api/fresh/catalogue/gemstones?q=${encodeURIComponent(q)}&limit=10`, { cache: 'no-store' }),
        fetch(`/api/fresh/catalogue/settings?q=${encodeURIComponent(q)}&limit=4`, { cache: 'no-store' }),
      ]);
      if (gemRes.ok) {
        const data = (await gemRes.json()) as { items?: LiveGem[] };
        const items = data.items ?? [];
        setSingles(items.filter((g) => g.kind === 'SINGLE').slice(0, 4));
        setPairs(items.filter((g) => g.kind === 'PAIR').slice(0, 3));
      }
      if (setRes.ok) {
        const data = (await setRes.json()) as { items?: LiveSetting[] };
        setSettings((data.items ?? []).slice(0, 3));
      }
    } catch {
      setSingles([]); setPairs([]); setSettings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = setTimeout(() => void runSearch(query), 180);
    return () => clearTimeout(timer);
  }, [query, isSearchOpen, runSearch]);

  if (!isSearchOpen) return null;

  const trimmed = query.trim();
  const resultCount = singles.length + pairs.length + settings.length;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-xs pt-16 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Maison Command Search"
    >
      <div className="fixed inset-0" onClick={() => setSearchOpen(false)} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-2xl rounded-sm bg-[#0A0A0B] border border-[#D4AF37]/35 text-[#F7F5F0] shadow-2xl overflow-hidden">
        <form onSubmit={handleFormSubmit} className="flex items-center border-b border-white/10 bg-[#121316] px-4 py-3.5">
          <Search className="h-4 w-4 text-[#D4AF37] mr-3 shrink-0" />
          <label htmlFor="cmdk-search-input" className="sr-only">
            Search gemstones by reference, variety, origin, or cut
          </label>
          <input
            id="cmdk-search-input"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, variety, origin, or shape..."
            className="w-full bg-transparent text-sm text-white placeholder:text-[#76726A] focus:outline-none"
          />
          {loading ? <span className="ml-2 text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#D4AF37]">…</span> : null}
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close command search"
            className="ml-2 p-1 text-[#A39E93] hover:text-white rounded-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </form>

        <div className="max-h-[65vh] overflow-y-auto p-5 space-y-5">
          {!trimmed ? (
            <p className="py-6 text-center text-sm text-[#A39E93]">
              Search the vault by reference, variety, origin, or cut.
            </p>
          ) : resultCount === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#A39E93]">
                {loading ? 'Reading the vault…' : <>No vault records match &ldquo;{trimmed}&rdquo;.</>}
              </p>
              <Link
                href={`/search?q=${encodeURIComponent(trimmed)}`}
                onClick={() => setSearchOpen(false)}
                className="mt-2 inline-block text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#E6C97A] underline"
              >
                Open search ledger
              </Link>
            </div>
          ) : (
            <>
              {singles.length > 0 && (
                <div>
                  <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#D4AF37] mb-2">
                    Loose Gemstones
                  </p>
                  <ul className="divide-y divide-white/10 rounded-sm border border-white/10 bg-[#121316]">
                    {singles.map((stone) => (
                      <li key={stone.ref}>
                        <Link
                          href={`/product/${stone.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-[family-name:var(--font-mono)] text-[#D4AF37] mr-2">
                              {stone.ref}
                            </span>
                            <span className="text-sm font-medium text-white">{stone.name}</span>
                            <span className="text-xs text-[#A39E93] ml-2">
                              · {stone.variety}
                              {stone.shape ? ` · ${stone.shape}` : ''}
                              {stone.origin ? ` · ${stone.origin}` : ''}
                            </span>
                          </div>
                          <span className="text-xs font-[family-name:var(--font-mono)] tabular-nums font-medium text-[#E6C97A]">
                            {money(stone.price_amount, stone.currency)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pairs.length > 0 && (
                <div>
                  <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#D4AF37] mb-2">
                    Matched Pairs
                  </p>
                  <ul className="divide-y divide-white/10 rounded-sm border border-white/10 bg-[#121316]">
                    {pairs.map((pair) => (
                      <li key={pair.ref}>
                        <Link
                          href="/pairs"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-[family-name:var(--font-mono)] text-[#D4AF37] mr-2">
                              {pair.ref}
                            </span>
                            <span className="text-sm font-medium text-white">{pair.name}</span>
                          </div>
                          <span className="text-xs font-[family-name:var(--font-mono)] tabular-nums text-[#E6C97A]">
                            {money(pair.price_amount, pair.currency)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {settings.length > 0 && (
                <div>
                  <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#D4AF37] mb-2">
                    Settings
                  </p>
                  <ul className="divide-y divide-white/10 rounded-sm border border-white/10 bg-[#121316]">
                    {settings.map((setting) => (
                      <li key={setting.ref}>
                        <Link
                          href={`/settings/${setting.ref}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-[family-name:var(--font-mono)] text-[#D4AF37] mr-2">
                              {setting.ref}
                            </span>
                            <span className="text-sm font-medium text-white">{setting.name}</span>
                            <span className="text-xs text-[#A39E93] ml-2">
                              · {setting.jewellery_type} · {setting.metal}
                            </span>
                          </div>
                          <span className="text-xs font-[family-name:var(--font-mono)] tabular-nums text-[#E6C97A]">
                            {money(setting.price_amount, setting.currency)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-[#A39E93]">
            <span className="font-[family-name:var(--font-mono)] uppercase tracking-wider text-[11px]">
              Direct Access
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/design-your-own"
                onClick={() => setSearchOpen(false)}
                className="hover:text-white inline-flex items-center gap-1"
              >
                Design Your Own
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/search"
                onClick={() => setSearchOpen(false)}
                className="hover:text-white inline-flex items-center gap-1"
              >
                Search Ledger
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
