'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { searchCatalogue, formatUsd } from '@/lib/mgh/storefront-data';

export default function CommandPalette() {
  const { isSearchOpen, setSearchOpen } = useStorefront();
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!isSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  if (!isSearchOpen) return null;

  const results = searchCatalogue(query || 'tanzanite');
  const totalMatches =
    results.gemstones.length + results.pairs.length + results.settings.length + results.articles.length;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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
            Search gemstones by SKU, variety, origin, or cut
          </label>
          <input
            id="cmdk-search-input"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU (MG-TZ-0131), variety, origin, or shape..."
            className="w-full bg-transparent text-sm text-white placeholder:text-[#76726A] focus:outline-none"
          />
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
          {totalMatches === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#A39E93]">
                No vault records match &ldquo;{query}&rdquo;.
              </p>
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => setSearchOpen(false)}
                className="mt-2 inline-block text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#E6C97A] underline"
              >
                Open search ledger
              </Link>
            </div>
          ) : (
            <>
              {results.gemstones.length > 0 && (
                <div>
                  <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#D4AF37] mb-2">
                    Loose Gemstones ({results.gemstones.length})
                  </p>
                  <ul className="divide-y divide-white/10 rounded-sm border border-white/10 bg-[#121316]">
                    {results.gemstones.slice(0, 4).map((stone) => (
                      <li key={stone.id}>
                        <Link
                          href={`/product/${stone.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-[family-name:var(--font-mono)] text-[#D4AF37] mr-2">
                              {stone.sku}
                            </span>
                            <span className="text-sm font-medium text-white">{stone.name}</span>
                            <span className="text-xs text-[#A39E93] ml-2">
                              · {stone.shape} · {stone.origin}
                            </span>
                          </div>
                          <span className="text-xs font-[family-name:var(--font-mono)] tabular-nums font-medium text-[#E6C97A]">
                            {formatUsd(stone.price)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.pairs.length > 0 && (
                <div>
                  <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#D4AF37] mb-2">
                    Matched Pairs ({results.pairs.length})
                  </p>
                  <ul className="divide-y divide-white/10 rounded-sm border border-white/10 bg-[#121316]">
                    {results.pairs.map((pair) => (
                      <li key={pair.id}>
                        <Link
                          href="/pairs"
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                        >
                          <div>
                            <span className="text-xs font-[family-name:var(--font-mono)] text-[#D4AF37] mr-2">
                              {pair.sku}
                            </span>
                            <span className="text-sm font-medium text-white">{pair.name}</span>
                          </div>
                          <span className="text-xs font-[family-name:var(--font-mono)] tabular-nums text-[#E6C97A]">
                            {formatUsd(pair.price)}
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
                href="/design-your-own/review/DYO-MG-8841"
                onClick={() => setSearchOpen(false)}
                className="hover:text-white inline-flex items-center gap-1"
              >
                DYO Dossier (DYO-MG-8841)
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link
                href="/ar/webar-tz-0131"
                onClick={() => setSearchOpen(false)}
                className="hover:text-white inline-flex items-center gap-1"
              >
                3D Optical Studio
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
