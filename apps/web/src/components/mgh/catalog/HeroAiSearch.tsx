'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, MapPin, Search, Sparkles, X } from 'lucide-react';
import {
  getRealtimeGemologicalSuggestions,
  type GemologicalSuggestionItem,
} from '@/lib/mgh/storefront-data';

const HERO_QUICK_PROMPTS = [
  'Blue Sapphires under $6,000',
  'Compare Tanzanite & Sapphire',
  'Design a Platinum Ring',
];

export function HeroAiSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const suggestions = useMemo(
    () => getRealtimeGemologicalSuggestions(query),
    [query]
  );

  const flatSuggestionItems: GemologicalSuggestionItem[] = useMemo(
    () => [
      ...suggestions.varieties,
      ...suggestions.origins,
      ...suggestions.specimens.slice(0, 2),
    ],
    [suggestions]
  );

  const isDropdownVisible = showSuggestions && (query.trim().length > 0 || isFocused);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateToAiGemologist = (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    router.push(`/concierge?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (highlightedIndex >= 0 && flatSuggestionItems[highlightedIndex]) {
      navigateToAiGemologist(flatSuggestionItems[highlightedIndex].queryValue);
      return;
    }
    const targetQuery = query.trim() || 'Blue Sapphire Ring';
    navigateToAiGemologist(targetQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownVisible || flatSuggestionItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < flatSuggestionItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : flatSuggestionItems.length - 1
      );
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="hero-ai-search-container"
      className="relative w-full max-w-xl mx-auto px-1 sm:px-0 z-30 flex flex-col items-center"
    >
      {/* Minimalist Responsive Search Bar */}
      <form
        action="/concierge"
        method="GET"
        role="search"
        aria-label="Ask AI Gemologist or search gemstones and jewelry"
        onSubmit={handleSubmit}
        className={`relative w-full flex items-center justify-between gap-1.5 sm:gap-2 bg-black/65 backdrop-blur-xl rounded-full p-1.5 pl-3.5 sm:pl-5 transition-all duration-300 ${
          isFocused
            ? 'border border-[#D4AF37] shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
            : 'border border-white/25 hover:border-white/45 shadow-2xl'
        }`}
      >
        <div className="mr-1.5 sm:mr-2.5 text-[#D4AF37] flex items-center shrink-0 pointer-events-none">
          <Search className="h-4 w-4" />
        </div>

        <label htmlFor="hero-ai-search-q" className="sr-only">
          Ask AI Gemologist or search gemstones, rings, necklaces
        </label>

        <input
          ref={inputRef}
          id="hero-ai-search-q"
          type="text"
          inputMode="search"
          name="q"
          autoComplete="off"
          role="combobox"
          aria-expanded={isDropdownVisible}
          aria-controls="hero-gemological-suggestions-listbox"
          aria-autocomplete="list"
          value={query}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask AI Gemologist or search..."
          className="min-w-0 flex-1 bg-transparent py-1.5 font-[family-name:var(--font-eb-garamond)] text-sm sm:text-lg text-white placeholder:text-white/70 focus:outline-hidden"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="p-1.5 text-neutral-300 hover:text-white transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          type="submit"
          data-testid="hero-ai-search-submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full text-[11px] sm:text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.15em] sm:tracking-[0.18em] font-bold gold-gradient-cta text-neutral-950 shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 hidden xs:inline-block sm:inline-block" />
          <span>Search</span>
        </button>
      </form>

      {/* Centered Responsive Quick Prompts Strip */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-full">
        {HERO_QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => navigateToAiGemologist(prompt)}
            className="px-3 py-1 rounded-full bg-black/45 hover:bg-black/75 border border-white/15 hover:border-[#D4AF37]/60 text-[11px] sm:text-xs font-[family-name:var(--font-eb-garamond)] text-white/85 hover:text-[#E6C97A] backdrop-blur-md transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isDropdownVisible && (
        <div
          id="hero-gemological-suggestions-listbox"
          role="listbox"
          aria-label="Popular gemstones and origins"
          data-testid="hero-realtime-suggestions"
          className="absolute left-0 right-0 top-[54px] mt-2 z-50 max-h-[62vh] overflow-y-auto bg-[#0A0A0C]/95 backdrop-blur-2xl border border-white/15 rounded-[22px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] text-left"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
            <span className="font-[family-name:var(--font-eb-garamond)] text-xs uppercase tracking-wider text-[#D4AF37]">
              {query.trim()
                ? `AI Gemologist Matches for “${query.trim()}”`
                : 'Popular Gemstones & Origins'}
            </span>
            <span className="font-[family-name:var(--font-eb-garamond)] text-xs text-neutral-400 tabular-nums">
              {suggestions.totalMatches} results
            </span>
          </div>

          {suggestions.totalMatches === 0 ? (
            <div className="px-4 py-4 text-center">
              <button
                type="button"
                onClick={() => navigateToAiGemologist(query)}
                className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#E6C97A] hover:underline"
              >
                Ask AI Gemologist about “{query.trim()}” →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              {/* Column 1: Gemstones */}
              <div className="p-3 space-y-1">
                <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-neutral-400">
                  <Gem className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Gemstones</span>
                </div>
                {suggestions.varieties.map((item, idx) => {
                  const isSelected = idx === highlightedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => navigateToAiGemologist(item.queryValue)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-full text-left transition-colors ${
                        isSelected ? 'bg-[#D4AF37]/20 text-white' : 'text-neutral-200 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="font-[family-name:var(--font-eb-garamond)] text-sm">
                        {item.label}
                      </span>
                      <span className="font-[family-name:var(--font-eb-garamond)] text-xs text-[#E6C97A]">
                        {item.metric}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Column 2: Origins */}
              <div className="p-3 space-y-1">
                <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-neutral-400">
                  <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Country of Origin</span>
                </div>
                {suggestions.origins.map((item, idx) => {
                  const targetIdx = suggestions.varieties.length + idx;
                  const isSelected = targetIdx === highlightedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => navigateToAiGemologist(item.queryValue)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-full text-left transition-colors ${
                        isSelected ? 'bg-[#D4AF37]/20 text-white' : 'text-neutral-200 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="font-[family-name:var(--font-eb-garamond)] text-sm">
                        {item.label}
                      </span>
                      <span className="font-[family-name:var(--font-eb-garamond)] text-xs text-[#E6C97A]">
                        {item.metric}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HeroAiSearch;
