'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Menu,
  X,
} from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import {
  getRealtimeGemologicalSuggestions,
  getHeroAnchorGemstone,
  type GemologicalSuggestionItem,
} from '@/lib/mgh/storefront-data';
import { FormattedPrice } from '@/components/mgh/ui/FormattedPrice';

export function HeroBlueprintSection() {
  const router = useRouter();
  const { currency, setCurrency, cart, setCartOpen } = useStorefront();
  const heroStone = getHeroAnchorGemstone();

  // Search state & suggestion autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<GemologicalSuggestionItem[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Update real-time suggestions as user types
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const results = getRealtimeGemologicalSuggestions(searchQuery.trim());
      const flattened = [
        ...results.varieties,
        ...results.origins,
        ...results.specimens.slice(0, 2),
      ];
      setSuggestions(flattened);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      router.push('/concierge');
      return;
    }

    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      handleSelectSuggestion(suggestions[highlightedIndex]);
      return;
    }

    router.push(`/concierge?q=${encodeURIComponent(query)}`);
    setIsFocused(false);
  };

  const handleSelectSuggestion = (suggestion: GemologicalSuggestionItem) => {
    setIsFocused(false);
    if (suggestion.href) {
      router.push(suggestion.href);
    } else {
      const target = suggestion.queryValue || suggestion.label;
      router.push(`/concierge?q=${encodeURIComponent(target)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearchSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  return (
    <section
      data-testid="hero-blueprint-section"
      className="bg-[#0A0A0B] p-2 sm:p-4 md:p-6 lg:p-7 text-[#F7F5F0]"
    >
      {/* ========================================================================= */}
      {/* DESKTOP VIEW (lg+): Visual Blueprint with Precision Interactive Controls  */}
      {/* ========================================================================= */}
      <div className="hidden lg:block relative w-full max-w-[1720px] mx-auto rounded-[32px] xl:rounded-[40px] border border-white/25 sm:border-[#D4AF37]/40 overflow-hidden shadow-[0_25px_90px_rgba(0,0,0,0.95)] bg-[#0A0A0B] aspect-[1672/941]">
        
        {/* Visual Blueprint Master Art Direction Image */}
        <img
          src="/mgh/assets/aistudio/file_000000001ed4820ca6195c16d01e11bc_cebb7639.png"
          alt="Maihan Gems — Rare by nature. Timeless by design."
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          loading="eager"
          fetchPriority="high"
        />

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE HOTSPOTS & CONTROLS OVER BLUEPRINT       */}
        {/* ---------------------------------------------------- */}

        {/* 1. Top-Left Logo Link */}
        <Link
          href="/"
          aria-label="Maihan Gems Home"
          className="absolute z-30 transition-all rounded-lg hover:ring-1 hover:ring-[#D4AF37]/40"
          style={{
            left: '4.2%',
            top: '4.0%',
            width: '11.5%',
            height: '8.5%',
          }}
          title="Maihan Gems Genève"
        />

        {/* 2. Top-Center Pill Navigation Links */}
        <nav
          aria-label="Hero Pill Navigation"
          className="absolute z-30 flex items-center justify-between"
          style={{
            left: '32.1%',
            top: '4.7%',
            width: '35.8%',
            height: '6.8%',
          }}
        >
          <Link
            href="/"
            aria-label="Home"
            className="h-full rounded-full transition-opacity hover:opacity-85"
            style={{ width: '22%' }}
            title="Home"
          />
          <Link
            href="/browse"
            aria-label="Shop High Gemstones"
            className="h-full rounded-full transition-opacity hover:opacity-85 flex items-center justify-center text-transparent"
            style={{ width: '18%' }}
            title="Shop Gemstones"
          >
            Shop
          </Link>
          <Link
            href="/varieties"
            aria-label="Gemstone Varieties and Collections"
            className="h-full rounded-full transition-opacity hover:opacity-85 flex items-center justify-center text-transparent"
            style={{ width: '22%' }}
            title="Collections"
          >
            Collections
          </Link>
          <Link
            href="/about"
            aria-label="Our Story & Provenance Protocol"
            className="h-full rounded-full transition-opacity hover:opacity-85 flex items-center justify-center text-transparent"
            style={{ width: '20%' }}
            title="Our Story"
          >
            Our Story
          </Link>
          <Link
            href="/contact"
            aria-label="Private Salons & Contact"
            className="h-full rounded-full transition-opacity hover:opacity-85 flex items-center justify-center text-transparent"
            style={{ width: '18%' }}
            title="Contact Salons"
          >
            Contact
          </Link>
        </nav>

        {/* 3. Top-Right Social Icons + Utilities Tray */}
        {/* Gap between Pill Nav (ends at 68%) and Social Icons (starts at 85%): Currency Switcher + Cart */}
        <div
          className="absolute z-30 flex items-center gap-2.5"
          style={{
            left: '69.5%',
            top: '4.7%',
            height: '6.8%',
          }}
        >
          {/* Integrated Luxury Currency Switcher */}
          <div
            role="group"
            aria-label="Hero currency selector"
            className="inline-flex items-center rounded-sm border border-[#D4AF37]/45 bg-black/75 backdrop-blur-md p-0.5 text-[10px] font-[family-name:var(--font-mono)] tracking-wider shadow-lg"
          >
            {(['USD', 'AED', 'BHAT'] as const).map((curr) => {
              const isActive = currency === curr;
              return (
                <button
                  key={curr}
                  type="button"
                  data-testid={`hero-currency-btn-${curr.toLowerCase()}`}
                  onClick={() => setCurrency(curr)}
                  aria-pressed={isActive}
                  className={`px-2 py-0.5 rounded-[2px] transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0A0A0B] font-bold shadow-xs'
                      : 'text-[#C8C3B8] hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              );
            })}
          </div>

          {/* Cart Drawer Trigger */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open vault cart (${cartCount} specimens)`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/75 border border-[#D4AF37]/40 hover:border-[#E6C97A] text-white hover:text-[#E6C97A] backdrop-blur-md transition-all shadow-lg cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="text-xs font-[family-name:var(--font-mono)] tabular-nums font-semibold">
              {cartCount}
            </span>
          </button>
        </div>

        {/* Social Media Hotspots matching exact blueprint icons */}
        <div
          className="absolute z-30 flex items-center justify-between"
          style={{
            left: '84.9%',
            top: '5.8%',
            width: '12.0%',
            height: '5.1%',
          }}
        >
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Instagram"
            className="w-[23%] h-full rounded-md hover:ring-1 hover:ring-[#D4AF37]/60 transition-all"
            title="Instagram"
          />
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Facebook"
            className="w-[23%] h-full rounded-md hover:ring-1 hover:ring-[#D4AF37]/60 transition-all"
            title="Facebook"
          />
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="YouTube"
            className="w-[23%] h-full rounded-md hover:ring-1 hover:ring-[#D4AF37]/60 transition-all"
            title="YouTube"
          />
          <Link
            href="/concierge"
            aria-label="Pinterest / AI Concierge"
            className="w-[23%] h-full rounded-md hover:ring-1 hover:ring-[#D4AF37]/60 transition-all"
            title="Pinterest / AI Concierge"
          />
        </div>

        {/* 4. Active AI-Style Search Bar Overlay */}
        <div
          className="absolute z-40"
          style={{
            left: '4.48%',
            top: '65.35%',
            width: '51.9%',
            height: '9.14%',
          }}
        >
          <form
            onSubmit={handleSearchSubmit}
            className={`w-full h-full rounded-full transition-all duration-300 flex items-center justify-between px-3 ${
              isFocused || searchQuery
                ? 'bg-[#121110]/95 backdrop-blur-md border border-[#E6C97A] shadow-[0_0_35px_rgba(212,175,55,0.35)] pl-4'
                : 'hover:border hover:border-[#E6C97A]/40 hover:bg-black/10 cursor-text pl-14'
            }`}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Show sparkle icon when typing/focused */}
            {(isFocused || searchQuery) && (
              <span className="text-[#E6C97A] text-base select-none mr-2">✦</span>
            )}

            {/* Live Typing Input */}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder={isFocused ? 'Ask AI Concierge — variety, carat, origin...' : ''}
              aria-label="Discover a gemstone, colour, or intention"
              className="w-full h-full bg-transparent text-white text-base outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 font-[family-name:var(--font-sans)] font-light placeholder:text-[#A8A49C]"
            />

            {/* Circular Gold Action Button Hotspot */}
            <button
              type="submit"
              aria-label="Submit search to AI Concierge"
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-108 active:scale-95 cursor-pointer shrink-0 ${
                isFocused || searchQuery ? 'bg-[#E6C97A] text-[#121211] shadow-md' : ''
              }`}
              title="Search AI Concierge"
            >
              {(isFocused || searchQuery) ? (
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              ) : (
                <span className="sr-only">Submit</span>
              )}
            </button>
          </form>

          {/* Real-time Gemological Autocomplete Suggestions Dropdown */}
          {isFocused && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              role="listbox"
              aria-label="Gemological Suggestions"
              className="absolute top-full left-0 right-0 mt-3 z-50 rounded-xl border border-[#D4AF37]/50 bg-[#0E0E11]/98 backdrop-blur-xl shadow-2xl p-2.5 space-y-1 overflow-hidden"
            >
              <div className="px-3 py-1.5 flex items-center justify-between text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#D4AF37]">
                <span>Gemological Directory</span>
                <span className="text-[#8A857B]">Use ↑ ↓ to navigate</span>
              </div>

              {suggestions.map((item, index) => {
                const isSelected = index === highlightedIndex;
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectSuggestion(item)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left rounded-lg text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#D4AF37]/25 text-[#E6C97A]'
                        : 'text-[#EFECE6] hover:bg-white/5 hover:text-[#E6C97A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-white/5 text-[#D4AF37] border border-white/10 shrink-0">
                        {item.kind}
                      </span>
                      <span className="truncate font-medium">{item.label}</span>
                    </div>
                    <span className="text-[11px] text-[#A39E93] shrink-0 ml-2">
                      {item.sublabel}
                    </span>
                  </button>
                );
              })}

              {/* AI Concierge Direct Action */}
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="w-full mt-1 pt-2 border-t border-white/10 px-3 py-2 text-left rounded-lg text-xs text-[#E6C97A] hover:bg-[#D4AF37]/15 flex items-center justify-between transition-colors font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ask AI Concierge Agent about &ldquo;{searchQuery}&rdquo;
                </span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* 5. Card 1 Link ("A WORLD OF RARE BEAUTY") */}
        <Link
          href="/browse"
          aria-label="Explore A World of Rare Beauty"
          className="absolute z-30 rounded-[20px] transition-all hover:ring-2 hover:ring-[#D4AF37]/60 group"
          style={{
            left: '70.81%',
            top: '36.13%',
            width: '26.43%',
            height: '28.27%',
          }}
          title="A World of Rare Beauty — View Collection"
        >
          <div className="w-full h-full rounded-[20px] bg-white/0 group-hover:bg-white/[0.04] transition-colors" />
        </Link>

        {/* 6. Card 2 Link (Emerald Ring) */}
        <Link
          href="/browse?variety=emerald"
          aria-label="Explore Colombian Emeralds"
          className="absolute z-30 rounded-[20px] transition-all hover:ring-2 hover:ring-[#D4AF37]/60 group"
          style={{
            left: '70.81%',
            top: '65.88%',
            width: '12.91%',
            height: '24.44%',
          }}
          title="Colombian Emeralds — Muzo Mine"
        >
          <div className="w-full h-full rounded-[20px] bg-white/0 group-hover:bg-white/[0.04] transition-colors" />
        </Link>

        {/* 7. Card 3 Link (Ruby in Tweezers) */}
        <Link
          href="/browse?variety=ruby"
          aria-label="Explore Burmese Rubies"
          className="absolute z-30 rounded-[20px] transition-all hover:ring-2 hover:ring-[#D4AF37]/60 group"
          style={{
            left: '84.33%',
            top: '65.88%',
            width: '12.91%',
            height: '24.44%',
          }}
          title="Burmese Rubies — Mogok Valley"
        >
          <div className="w-full h-full rounded-[20px] bg-white/0 group-hover:bg-white/[0.04] transition-colors" />
        </Link>

        {/* 8. Bottom-Left Brand Tagline Link */}
        <Link
          href="/about"
          aria-label="Maihan Gems Enduring Value"
          className="absolute z-30 rounded-md transition-all hover:ring-1 hover:ring-[#D4AF37]/40"
          style={{
            left: '4.42%',
            top: '83.0%',
            width: '26.3%',
            height: '8.0%',
          }}
          title="Exceptional gemstones. Enduring value."
        />
      </div>

      {/* ========================================================================= */}
      {/* RESPONSIVE MOBILE & TABLET VIEW (< lg): Fluid Stacking Luxury Architecture */}
      {/* ========================================================================= */}
      <div className="lg:hidden relative w-full rounded-[24px] sm:rounded-[32px] border border-white/20 sm:border-[#D4AF37]/35 overflow-hidden shadow-2xl bg-[#0A0A0B] p-5 sm:p-8 space-y-8">
        
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
          <img
            src="/mgh/hero-blueprint/hero-subject.png"
            alt="Editorial Backdrop"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent" />
        </div>

        {/* Mobile Header Bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 pb-5">
          <Link href="/" className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 text-[#E6C97A]">
              <span className="text-xs">✦</span>
              <span className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-light tracking-[0.24em] text-white uppercase">
                MAIHAN
              </span>
            </div>
            <span className="text-[8px] font-[family-name:var(--font-mono)] tracking-[0.32em] uppercase text-[#D4AF37]">
              — GEMS —
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Mobile Currency Switcher */}
            <div
              role="group"
              aria-label="Mobile currency selector"
              className="inline-flex items-center rounded-sm border border-[#D4AF37]/40 bg-black/60 p-0.5 text-[9px] font-[family-name:var(--font-mono)]"
            >
              {(['USD', 'AED', 'BHAT'] as const).map((curr) => {
                const isActive = currency === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`px-1.5 py-0.5 rounded-[2px] transition-all ${
                      isActive ? 'bg-[#D4AF37] text-[#0A0A0B] font-bold' : 'text-[#A39E93]'
                    }`}
                  >
                    {curr}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="p-2 rounded-lg bg-black/50 border border-white/20 text-white"
            >
              <ShoppingBag className="h-4 w-4 text-[#D4AF37]" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg bg-black/50 border border-white/20 text-white"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="relative z-20 grid grid-cols-2 gap-2 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#E8E4DC] p-3 rounded-xl bg-[#141418] border border-white/10">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-sm bg-white/5">
              Home
            </Link>
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-sm bg-white/5">
              Shop
            </Link>
            <Link href="/varieties" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-sm bg-white/5">
              Collections
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-sm bg-white/5">
              Our Story
            </Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-sm bg-white/5">
              Contact
            </Link>
            <Link href="/concierge" onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-sm bg-[#D4AF37]/20 text-[#E6C97A] font-semibold">
              ✦ AI Concierge
            </Link>
          </nav>
        )}

        {/* Mobile Headline */}
        <div className="relative z-20 space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-normal text-white leading-[1.04] tracking-tight">
            Rare <span className="italic font-normal">by</span> nature.
            <br />
            Timeless <span className="italic font-normal">by</span> design.
          </h1>
        </div>

        {/* Mobile AI Search Bar */}
        <div className="relative z-20">
          <form
            onSubmit={handleSearchSubmit}
            className="w-full rounded-full border border-[#D4AF37]/50 bg-black/75 p-1.5 pl-4 flex items-center justify-between gap-2 shadow-lg"
          >
            <span className="text-[#E6C97A] text-sm">✦</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Discover a gemstone, colour..."
              className="w-full bg-transparent text-white text-sm outline-none placeholder:text-[#A8A49C]"
            />
            <button
              type="submit"
              className="bg-[#E6C97A] text-[#121211] p-2.5 rounded-full shrink-0"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Mobile Brand Tagline */}
        <div className="relative z-20 border-l-2 border-[#D4AF37] pl-3 space-y-0.5">
          <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.24em] text-[#D4AF37]">
            MAIHAN GEMS
          </p>
          <p className="text-xs text-[#D8D2C4]">
            Exceptional gemstones. Enduring value.
          </p>
        </div>

        {/* Mobile Floating Cards Grid */}
        <div className="relative z-20 space-y-3 pt-2">
          <Link
            href="/browse"
            className="block aspect-[16/9.6] rounded-2xl overflow-hidden border border-white/20 shadow-xl"
          >
            <img
              src="/mgh/hero-blueprint/card-world-beauty.png"
              alt="A World of Rare Beauty"
              className="w-full h-full object-cover"
            />
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/browse?variety=emerald"
              className="block aspect-square rounded-xl overflow-hidden border border-white/20 shadow-lg"
            >
              <img
                src="/mgh/hero-blueprint/card-emerald-ring.png"
                alt="Colombian Emerald"
                className="w-full h-full object-cover"
              />
            </Link>
            <Link
              href="/browse?variety=ruby"
              className="block aspect-square rounded-xl overflow-hidden border border-white/20 shadow-lg"
            >
              <img
                src="/mgh/hero-blueprint/card-ruby-tweezers.png"
                alt="Burmese Ruby"
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        </div>

        {/* Mobile Evidence Strip */}
        <div className="relative z-20 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-[family-name:var(--font-mono)] text-[#C8C3B8]">
          <div>
            <span className="text-[#D4AF37]">{heroStone.id}</span> · {heroStone.name} · <FormattedPrice amount={heroStone.price} className="text-[#E6C97A]" />
          </div>
          <Link href="/concierge" className="text-[#E6C97A] inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> AI Concierge →
          </Link>
        </div>

      </div>

    </section>
  );
}
