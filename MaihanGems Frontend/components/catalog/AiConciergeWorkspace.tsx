'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Heart,
  Scale,
  ShoppingBag,
  Compass,
  Check,
  Send,
  ArrowUpRight,
  Copy,
  RefreshCw,
  Plus,
  BookOpen,
  Edit3,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import {
  evaluateConciergeAgentTurn,
  buildConciergeDyoProposal,
  type ConciergeAgentResponse,
  type ConciergeDyoProposal,
  type GemologistFocusMode,
} from '@/lib/ai-concierge-agent';
import {
  getAllGemstones,
  getAllSettings,
  formatUsd,
} from '@/lib/storefront-data';
import { DirhamLogo } from '@/components/ui/DirhamLogo';

interface ChatTurn {
  id: string;
  timestamp: string;
  userPrompt: string;
  focusMode: GemologistFocusMode;
  response: ConciergeAgentResponse;
  executedReceipts: string[];
  showCompareOverride?: boolean;
  showDyoOverride?: boolean;
}

const STARTER_AGENT_COMMANDS = [
  '1.31 ct Tanzanite',
  'Compare Tanzanite & Sapphire',
  'Design a Platinum Ring with MG-TZ-0131',
  'Unheated Sapphires under $7,000',
  'Add MG-TZ-0131 to Wishlist',
];

function InChatDyoBuilder({ initialProposal }: { initialProposal: ConciergeDyoProposal }) {
  const { addToCart, toggleFavorite, favorites } = useStorefront();
  const allStones = getAllGemstones();
  const allSettings = getAllSettings().filter((s) => !s.acceptsPairsOnly);

  const [stoneId, setStoneId] = useState(initialProposal.stone.id);
  const [settingSku, setSettingSku] = useState(initialProposal.setting.sku);
  const [metalCode, setMetalCode] = useState<'PT950' | '18K_YG' | '18K_RG' | '18K_WG'>(
    initialProposal.metalCode
  );
  const [ringSize, setRingSize] = useState(initialProposal.ringSize);
  const [addedDyo, setAddedDyo] = useState(false);

  const liveProposal = buildConciergeDyoProposal(stoneId, settingSku, metalCode, ringSize);
  const isStoneFav = favorites.includes(liveProposal.stone.id);

  const handleAddBespokeToBag = () => {
    addToCart({
      id: liveProposal.configurationCode,
      sku: `${liveProposal.stone.sku} + ${liveProposal.setting.sku}`,
      slug: liveProposal.stone.slug,
      name: `Bespoke ${liveProposal.stone.name} · ${liveProposal.setting.name}`,
      subtitle: `${liveProposal.metalLabel} · Size ${liveProposal.ringSize}`,
      price: liveProposal.totalPrice,
      image: liveProposal.stone.images[0],
      kind: 'dyo',
      configurationCode: liveProposal.configurationCode,
    });
    setAddedDyo(true);
    window.setTimeout(() => setAddedDyo(false), 2500);
  };

  return (
    <div
      data-testid="concierge-dyo-studio"
      className="rounded-[24px] border border-[#E5D4B3] bg-[#FAF8F4] text-[#181613] p-5 sm:p-6 shadow-[0_12px_32px_rgba(185,150,75,0.12)] space-y-5 font-[family-name:var(--font-eb-garamond)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D4B3] pb-3.5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#9A7B2C] font-semibold">
            DYOJ · IN-CHAT BESPOKE COMPOSER
          </p>
          <h3 className="text-xl sm:text-2xl font-normal text-[#181613] mt-0.5">
            {liveProposal.stone.name} × {liveProposal.setting.name}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#7A7060]">
            COMPLETE CREATION
          </p>
          <p
            data-testid="concierge-dyo-total"
            className="text-xl sm:text-2xl tabular-nums font-semibold text-[#8B6B23]"
          >
            {formatUsd(liveProposal.totalPrice)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-5 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-[16px] p-2.5 aspect-square flex flex-col justify-between border border-[#E5D4B3]">
            <img
              src={liveProposal.stone.images[0]}
              alt={liveProposal.stone.name}
              referrerPolicy="no-referrer"
              className="h-4/5 w-full object-contain"
            />
            <span className="text-[10px] uppercase tracking-wider text-[#181613] font-semibold truncate">
              {liveProposal.stone.id}
            </span>
          </div>
          <div className="bg-white rounded-[16px] p-2.5 aspect-square flex flex-col justify-between border border-[#E5D4B3]">
            <img
              src={liveProposal.setting.images[0]}
              alt={liveProposal.setting.name}
              referrerPolicy="no-referrer"
              className="h-4/5 w-full object-contain"
            />
            <span className="text-[10px] uppercase tracking-wider text-[#181613] font-semibold truncate">
              {liveProposal.setting.name}
            </span>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
          <div>
            <label
              htmlFor="dyo-chat-stone"
              className="block text-[11px] uppercase tracking-[0.18em] text-[#8B6B23] mb-1 font-semibold"
            >
              Center Gemstone
            </label>
            <select
              id="dyo-chat-stone"
              value={stoneId}
              onChange={(e) => setStoneId(e.target.value)}
              className="w-full rounded-full border border-[#E5D4B3] bg-white px-3.5 py-2 text-sm text-[#181613] focus:border-[#C5A059] focus:outline-none"
            >
              {allStones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatUsd(s.price)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dyo-chat-setting"
              className="block text-[11px] uppercase tracking-[0.18em] text-[#8B6B23] mb-1 font-semibold"
            >
              Atelier Setting
            </label>
            <select
              id="dyo-chat-setting"
              value={settingSku}
              onChange={(e) => setSettingSku(e.target.value)}
              className="w-full rounded-full border border-[#E5D4B3] bg-white px-3.5 py-2 text-sm text-[#181613] focus:border-[#C5A059] focus:outline-none"
            >
              {allSettings.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.name} (+{formatUsd(s.basePrice)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[#8B6B23] mb-1 font-semibold">
              Precious Alloy
            </span>
            <div className="flex flex-wrap gap-1.5">
              {liveProposal.setting.metals.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => setMetalCode(m.code)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    metalCode === m.code
                      ? 'border-[#0A0A0B] bg-[#0A0A0B] text-[#E6C97A] font-semibold'
                      : 'border-[#E5D4B3] bg-white text-[#5C5346] hover:border-[#C5A059]'
                  }`}
                >
                  {m.code.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="dyo-chat-size"
              className="block text-[11px] uppercase tracking-[0.18em] text-[#8B6B23] mb-1 font-semibold"
            >
              Ring Size
            </label>
            <select
              id="dyo-chat-size"
              value={ringSize}
              onChange={(e) => setRingSize(e.target.value)}
              className="w-full rounded-full border border-[#E5D4B3] bg-white px-3.5 py-2 text-sm text-[#181613] focus:border-[#C5A059] focus:outline-none"
            >
              {liveProposal.setting.sizes.map((sz) => (
                <option key={sz} value={sz}>
                  Size {sz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5D4B3]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddBespokeToBag}
            data-testid="concierge-dyo-add-to-bag"
            className="inline-flex items-center gap-2 px-5 py-2 text-xs uppercase tracking-[0.18em] font-bold gold-gradient-cta rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            {addedDyo ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
            {addedDyo ? 'Added Bespoke Piece' : 'Add Bespoke to Bag'}
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(liveProposal.stone.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs uppercase tracking-wider rounded-full border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isStoneFav
                ? 'border-[#C5A059] bg-[#FAF3E3] text-[#8B6B23] font-semibold'
                : 'border-[#E5D4B3] bg-white text-[#5C5346] hover:text-[#181613]'
            }`}
          >
            <Heart className="h-3.5 w-3.5" fill={isStoneFav ? 'currentColor' : 'none'} />
            {isStoneFav ? 'Saved' : 'Save Stone'}
          </button>
        </div>

        <Link
          href={`/design-your-own?code=${encodeURIComponent(liveProposal.configurationCode)}`}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-[#8B6B23] hover:text-[#181613] font-semibold whitespace-nowrap shrink-0"
        >
          Open DYOJ Studio <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function AiConciergeWorkspace({ initialQuery = '' }: { initialQuery?: string }) {
  const {
    addToCart,
    toggleFavorite,
    toggleCompare,
    favorites,
    compareList,
    cart,
    setCartOpen,
    formatPrice,
    currency,
  } = useStorefront();

  const [inputPrompt, setInputPrompt] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);

  const initializedRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomEndRef = useRef<HTMLDivElement | null>(null);

  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;
  const compareRef = useRef(compareList);
  compareRef.current = compareList;

  const executeClientActions = useCallback(
    (response: ConciergeAgentResponse): string[] => {
      const receipts: string[] = [];
      for (const action of response.clientActions) {
        if (action.type === 'ADD_TO_WISHLIST') {
          if (!favoritesRef.current.includes(action.stoneId)) {
            toggleFavorite(action.stoneId);
          }
          receipts.push(`Saved ${action.stoneName} (${action.sku}) to Wishlist`);
        } else if (action.type === 'ADD_TO_CART') {
          addToCart(action.item);
          receipts.push(
            `Added ${action.item.name} (${formatUsd(action.item.price)}) to Vault Bag`
          );
        } else if (action.type === 'SYNC_COMPARE') {
          for (const id of action.stoneIds) {
            if (!compareRef.current.includes(id)) {
              toggleCompare(id);
            }
          }
          receipts.push(`Synced ${action.stoneIds.join(' · ')} to Compare`);
        }
      }
      return receipts;
    },
    [addToCart, toggleCompare, toggleFavorite]
  );

  const submitAgentPrompt = useCallback(
    async (rawText: string, shouldScroll = true) => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      const localTurn = evaluateConciergeAgentTurn(trimmed, {
        focusMode: 'all',
        maxBudget: null,
        unheatedOnly: false,
      });
      const receipts = executeClientActions(localTurn);
      const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setTurns((prev) => [
        ...prev,
        {
          id: turnId,
          timestamp: nowTime,
          userPrompt: trimmed,
          focusMode: 'all',
          response: localTurn,
          executedReceipts: receipts,
        },
      ]);

      if (shouldScroll) {
        window.setTimeout(() => {
          bottomEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 60);
      }

      setIsGenerating(true);
      try {
        const res = await fetch('/api/ai-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmed,
            focusMode: 'all',
            maxBudget: null,
            unheatedOnly: false,
          }),
        });
        if (res.ok) {
          const serverData: ConciergeAgentResponse = await res.json();
          if (serverData && serverData.reply) {
            setTurns((prev) =>
              prev.map((t) =>
                t.id === turnId
                  ? {
                      ...t,
                      response: {
                        ...t.response,
                        reply: serverData.reply,
                        gemologicalNotes:
                          serverData.gemologicalNotes || t.response.gemologicalNotes,
                        citations: serverData.citations || t.response.citations,
                      },
                    }
                  : t
              )
            );
          }
        }
      } catch {
        // Keep deterministic local response
      } finally {
        setIsGenerating(false);
      }
    },
    [executeClientActions]
  );

  useEffect(() => {
    const startQuery = initialQuery.trim() || '1.31 ct Tanzanite';
    if (initializedRef.current === startQuery) return;
    initializedRef.current = startQuery;
    void submitAgentPrompt(startQuery, false);
  }, [initialQuery, submitAgentPrompt]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;
    const text = inputPrompt.trim();
    setInputPrompt('');
    void submitAgentPrompt(text, true);
  };

  const handleNewConsultation = () => {
    setTurns([]);
    setInputPrompt('');
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyTurn = async (turn: ChatTurn) => {
    const textToCopy = `${turn.userPrompt}\n\n${turn.response.reply}\n\n${(
      turn.response.gemologicalNotes || []
    ).join('\n')}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // Ignore in restricted iframe
    }
    setCopiedTurnId(turn.id);
    window.setTimeout(() => setCopiedTurnId(null), 2000);
  };

  const handleToggleCompareInTurn = (turnId: string) => {
    setTurns((prev) =>
      prev.map((t) => {
        if (t.id !== turnId) return t;
        const nextShow = !t.showCompareOverride;
        let compared = t.response.comparedProducts;
        if (compared.length < 2) {
          const all = getAllGemstones();
          const lead = t.response.products[0] || all[0];
          const second = t.response.products[1] || all.find((s) => s.id !== lead.id) || all[0];
          compared = [lead, second];
        }
        return {
          ...t,
          showCompareOverride: nextShow,
          response: {
            ...t.response,
            comparedProducts: compared,
          },
        };
      })
    );
  };

  const handleToggleDyoInTurn = (turnId: string, stoneId?: string) => {
    setTurns((prev) =>
      prev.map((t) => {
        if (t.id !== turnId) return t;
        const targetStoneId =
          stoneId || t.response.products[0]?.id || getAllGemstones()[0].id;
        const nextProposal = buildConciergeDyoProposal(targetStoneId);
        return {
          ...t,
          showDyoOverride: stoneId ? true : !t.showDyoOverride,
          response: {
            ...t.response,
            dyoProposal: nextProposal,
          },
        };
      })
    );
  };

  const renderPrice = (amountUsd: number) => {
    if (currency === 'AED') {
      const aedVal = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(Math.round(amountUsd * 3.6725));
      return (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <DirhamLogo className="h-3.5 w-3.5 text-[#8B6B23] shrink-0" />
          <span>{aedVal}</span>
        </span>
      );
    }
    return <span className="tabular-nums">{formatPrice(amountUsd)}</span>;
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-[calc(100vh-112px)] golden-cloud-gallery text-[#181613] font-[family-name:var(--font-eb-garamond)] flex flex-col justify-between">
      {/* =========================================================================
          1. ULTRA-MINIMALIST TOP BAR (GEMINI / PERPLEXITY STYLE)
         ========================================================================= */}
      <header className="w-full border-b border-[#E5D4B3]/60 bg-[#FAF7F0]/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#D4AF37]/50 text-[#9A7B2C] shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-normal text-[#181613] leading-none">
                AI Gemologist
              </h1>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#8B6B23] mt-0.5">
                Maihan Vault &amp; Bespoke Advisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleNewConsultation}
              data-testid="gemologist-new-chat-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#C5A059] bg-white hover:bg-[#FAF3E3] text-[#181613] uppercase tracking-[0.16em] font-semibold transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#9A7B2C]" />
              <span>New Chat</span>
            </button>

            <Link
              href="/favorites"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E5D4B3] bg-white/80 hover:border-[#C5A059] text-[#5C5346] hover:text-[#181613] uppercase tracking-[0.14em]"
            >
              <Heart className="h-3 w-3 text-[#9A7B2C]" />
              <span>{favorites.length}</span>
            </Link>

            <Link
              href="/compare"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#E5D4B3] bg-white/80 hover:border-[#C5A059] text-[#5C5346] hover:text-[#181613] uppercase tracking-[0.14em]"
            >
              <Scale className="h-3 w-3 text-[#9A7B2C]" />
              <span>{compareList.length}</span>
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181613] text-[#E6C97A] hover:bg-[#2A2621] uppercase tracking-[0.14em] cursor-pointer"
            >
              <ShoppingBag className="h-3 w-3" />
              <span>{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. CENTERED MINIMALIST CHAT STREAM (RIGHT = USER, LEFT = AI GEMOLOGIST)
         ========================================================================= */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 flex flex-col justify-between">
        {/* Empty State Greeting (Gemini / Perplexity Minimalist Welcome) */}
        {turns.length === 0 && (
          <div className="my-auto py-12 text-center space-y-6 max-w-xl mx-auto">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#D4AF37]/50 text-[#9A7B2C] shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-normal text-[#181613]">
                How may I assist your search?
              </h2>
              <p className="text-base text-[#5C5346]">
                Ask about natural gemstones, compare origins side by side, or compose a custom ring.
              </p>
            </div>
          </div>
        )}

        {/* Conversation Turns List */}
        <div className="space-y-10" data-testid="concierge-turns-list">
          {turns.map((turn) => {
            const showCompare =
              turn.showCompareOverride !== undefined
                ? turn.showCompareOverride
                : turn.response.comparedProducts.length >= 2;
            const showDyo =
              turn.showDyoOverride !== undefined
                ? turn.showDyoOverride
                : Boolean(turn.response.dyoProposal);

            return (
              <div key={turn.id} className="space-y-6">
                {/* ===============================================================
                    RIGHT SIDE: USER MESSAGE BUBBLE
                   =============================================================== */}
                <div
                  data-testid="concierge-user-message"
                  className="flex justify-end items-start gap-2"
                >
                  <div className="group relative max-w-[85%] sm:max-w-[72%] rounded-[24px] rounded-tr-[6px] bg-[#181613] text-[#FAF7F0] px-5 py-3.5 shadow-[0_8px_24px_rgba(24,22,19,0.12)] border border-[#D4AF37]/35">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-base sm:text-lg leading-snug font-normal">
                        {turn.userPrompt}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setInputPrompt(turn.userPrompt);
                          inputRef.current?.focus();
                        }}
                        aria-label="Edit prompt"
                        title="Edit prompt"
                        className="opacity-60 hover:opacity-100 text-[#E6C97A] p-1 rounded-full transition-opacity cursor-pointer shrink-0"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ===============================================================
                    LEFT SIDE: AI GEMOLOGIST RESPONSE
                   =============================================================== */}
                <div
                  data-testid="concierge-ai-message"
                  className="flex justify-start items-start gap-3 sm:gap-4"
                >
                  {/* Minimalist Left AI Avatar */}
                  <div className="h-9 w-9 rounded-full bg-white border border-[#D4AF37]/60 flex items-center justify-center text-[#9A7B2C] shadow-xs shrink-0 mt-1">
                    <Sparkles className="h-4 w-4" />
                  </div>

                  {/* Left-Aligned AI Response Stream */}
                  <div className="flex-1 min-w-0 max-w-[92%] space-y-4">
                    {/* Compact Perplexity-Style Source Pills */}
                    {turn.response.citations && turn.response.citations.length > 0 && (
                      <div
                        data-testid="concierge-citations-strip"
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        {turn.response.citations.map((cit, idx) => (
                          <Link
                            key={`${turn.id}-cit-${idx}`}
                            href={cit.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E5D4B3] bg-white/90 hover:border-[#C5A059] text-xs text-[#4E463A] transition-colors"
                          >
                            <BookOpen className="h-3 w-3 text-[#9A7B2C]" />
                            <span className="font-semibold text-[#181613]">{cit.label}</span>
                            <span className="text-[#8B6B23]">· {cit.sublabel}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* AI Gemologist Text Response */}
                    <div className="rounded-[22px] rounded-tl-[6px] border border-[#E5D4B3]/90 bg-white/95 px-5 py-4 sm:px-6 sm:py-5 shadow-[0_10px_30px_rgba(185,150,75,0.08)] space-y-3.5">
                      <p
                        data-testid="concierge-agent-reply"
                        className="text-base sm:text-[18px] text-[#181613] leading-relaxed"
                      >
                        {turn.response.reply}
                      </p>

                      {turn.response.gemologicalNotes &&
                        turn.response.gemologicalNotes.length > 0 && (
                          <ul
                            data-testid="concierge-gemological-notes"
                            className="space-y-1.5 border-t border-[#EFE6D4] pt-3 text-sm text-[#4E463A]"
                          >
                            {turn.response.gemologicalNotes.map((note, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <ShieldCheck className="h-4 w-4 text-[#9A7B2C] shrink-0 mt-0.5" />
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                      {/* Executed Action Receipts */}
                      {turn.executedReceipts.length > 0 && (
                        <div
                          data-testid="concierge-action-receipts"
                          className="flex flex-wrap items-center gap-2 pt-1"
                        >
                          {turn.executedReceipts.map((rcpt, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15803D]/10 border border-[#15803D]/30 text-xs font-semibold text-[#15803D]"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {rcpt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Product Cards (Compact Left-Aligned Grid) */}
                    {turn.response.products.length > 0 && (
                      <div
                        data-testid="concierge-product-cards"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      >
                        {turn.response.products.map((stone) => {
                          const isFav = favorites.includes(stone.id);
                          const isCmp = compareList.includes(stone.id);

                          return (
                            <article
                              key={stone.id}
                              data-testid={`concierge-stone-card-${stone.id}`}
                              className="rounded-[20px] border border-[#E5D4B3] bg-white overflow-hidden flex flex-col justify-between shadow-[0_8px_24px_rgba(185,150,75,0.08)] hover:border-[#C5A059] transition-all"
                            >
                              <div>
                                <div className="relative h-40 bg-[#FAF7F0] p-3 flex items-center justify-center border-b border-[#EFE6D4]">
                                  <img
                                    src={stone.images[0]}
                                    alt={stone.name}
                                    referrerPolicy="no-referrer"
                                    className="max-h-full max-w-full object-contain"
                                  />
                                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-[#181613]/90 text-[#E6C97A] rounded-full">
                                    {stone.sku}
                                  </span>
                                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-white/95 border border-[#E5D4B3] text-[#181613] rounded-full font-semibold">
                                    {stone.carat.toFixed(2)} ct
                                  </span>
                                </div>

                                <div className="p-4 space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <Link
                                      href={`/products/${stone.slug}`}
                                      className="text-lg font-medium text-[#181613] hover:text-[#8B6B23] leading-snug"
                                    >
                                      {stone.name}
                                    </Link>
                                    <span className="text-base font-semibold text-[#181613] shrink-0">
                                      {renderPrice(stone.price)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#6E6250]">
                                    {stone.origin} · {stone.shape} · {stone.clarity}
                                  </p>
                                </div>
                              </div>

                              <div className="p-3.5 pt-0 space-y-2">
                                <div className="grid grid-cols-3 gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleFavorite(stone.id)}
                                    data-testid={`concierge-card-fav-${stone.id}`}
                                    className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] uppercase tracking-wider rounded-full border transition-colors cursor-pointer ${
                                      isFav
                                        ? 'border-[#C5A059] bg-[#FAF3E3] text-[#8B6B23] font-semibold'
                                        : 'border-[#E5D4B3] text-[#5C5346] hover:border-[#C5A059]'
                                    }`}
                                  >
                                    <Heart
                                      className="h-3 w-3 shrink-0"
                                      fill={isFav ? 'currentColor' : 'none'}
                                    />
                                    <span>{isFav ? 'Saved' : 'Save'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleCompare(stone.id)}
                                    data-testid={`concierge-card-compare-${stone.id}`}
                                    className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] uppercase tracking-wider rounded-full border transition-colors cursor-pointer ${
                                      isCmp
                                        ? 'border-[#C5A059] bg-[#FAF3E3] text-[#8B6B23] font-semibold'
                                        : 'border-[#E5D4B3] text-[#5C5346] hover:border-[#C5A059]'
                                    }`}
                                  >
                                    <Scale className="h-3 w-3 shrink-0" />
                                    <span>{isCmp ? 'Compared' : 'Compare'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleDyoInTurn(turn.id, stone.id)}
                                    data-testid={`concierge-card-dyo-${stone.id}`}
                                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] uppercase tracking-wider rounded-full border border-[#E5D4B3] text-[#5C5346] hover:border-[#C5A059] hover:text-[#181613] transition-colors cursor-pointer"
                                  >
                                    <Compass className="h-3 w-3 shrink-0 text-[#9A7B2C]" />
                                    <span>DYOJ</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    addToCart({
                                      id: stone.id,
                                      sku: stone.sku,
                                      slug: stone.slug,
                                      name: stone.name,
                                      subtitle: `${stone.shape} · ${stone.carat.toFixed(2)} ct · ${stone.origin}`,
                                      price: stone.price,
                                      image: stone.images[0],
                                      kind: 'gemstone',
                                    })
                                  }
                                  data-testid={`concierge-card-bag-${stone.id}`}
                                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs uppercase tracking-[0.16em] font-semibold bg-[#181613] text-[#E6C97A] hover:bg-[#2A2621] rounded-full transition-colors cursor-pointer"
                                >
                                  <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                                  <span>Add to Bag</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {/* Side-by-Side Comparison Matrix inside AI Turn */}
                    {showCompare && turn.response.comparedProducts.length >= 2 && (
                      <div
                        data-testid="concierge-compare-matrix"
                        className="rounded-[20px] border border-[#E5D4B3] bg-white overflow-hidden shadow-xs"
                      >
                        <div className="bg-[#181613] text-white px-5 py-3 flex items-center justify-between">
                          <span className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                            Side-by-Side Gemstone Comparison
                          </span>
                          <Link
                            href="/compare"
                            className="text-xs uppercase tracking-[0.16em] text-[#E6C97A] hover:underline"
                          >
                            Open Full Compare Page →
                          </Link>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-[#EFE6D4] bg-[#FAF7F0]">
                                <th className="p-3.5 text-xs uppercase tracking-[0.16em] text-[#7A7060] w-36">
                                  Attribute
                                </th>
                                {turn.response.comparedProducts.map((s) => (
                                  <th
                                    key={s.id}
                                    className="p-3.5 border-l border-[#EFE6D4] min-w-[180px]"
                                  >
                                    <span className="text-[10px] uppercase tracking-wider text-[#9A7B2C] block">
                                      {s.sku}
                                    </span>
                                    <Link
                                      href={`/products/${s.slug}`}
                                      className="text-base font-semibold text-[#181613] hover:text-[#8B6B23]"
                                    >
                                      {s.name}
                                    </Link>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE6D4]">
                              <tr>
                                <td className="p-3.5 font-medium text-[#5C5346]">Price</td>
                                {turn.response.comparedProducts.map((s) => (
                                  <td
                                    key={s.id}
                                    className="p-3.5 border-l border-[#EFE6D4] font-semibold text-[#181613]"
                                  >
                                    {renderPrice(s.price)}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td className="p-3.5 font-medium text-[#5C5346]">Carat &amp; Cut</td>
                                {turn.response.comparedProducts.map((s) => (
                                  <td key={s.id} className="p-3.5 border-l border-[#EFE6D4]">
                                    {s.carat.toFixed(2)} ct · {s.shape}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td className="p-3.5 font-medium text-[#5C5346]">Origin</td>
                                {turn.response.comparedProducts.map((s) => (
                                  <td key={s.id} className="p-3.5 border-l border-[#EFE6D4]">
                                    {s.origin}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td className="p-3.5 font-medium text-[#5C5346]">Treatment</td>
                                {turn.response.comparedProducts.map((s) => (
                                  <td key={s.id} className="p-3.5 border-l border-[#EFE6D4]">
                                    {s.treatmentDisclosed}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* In-Chat DYOJ Composer */}
                    {showDyo && turn.response.dyoProposal && (
                      <InChatDyoBuilder initialProposal={turn.response.dyoProposal} />
                    )}

                    {/* Minimalist Action Row + Follow-up Suggestion Chips */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyTurn(turn)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#E5D4B3] bg-white/80 hover:border-[#C5A059] text-xs text-[#5C5346] hover:text-[#181613] cursor-pointer"
                        >
                          {copiedTurnId === turn.id ? (
                            <>
                              <Check className="h-3 w-3 text-[#15803D]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-[#9A7B2C]" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleCompareInTurn(turn.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs cursor-pointer ${
                            showCompare
                              ? 'border-[#181613] bg-[#181613] text-[#E6C97A]'
                              : 'border-[#E5D4B3] bg-white/80 text-[#5C5346] hover:border-[#C5A059]'
                          }`}
                        >
                          <Scale className="h-3 w-3" />
                          <span>{showCompare ? 'Hide Compare' : 'Compare Table'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDyoInTurn(turn.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs cursor-pointer ${
                            showDyo
                              ? 'border-[#181613] bg-[#181613] text-[#E6C97A]'
                              : 'border-[#E5D4B3] bg-white/80 text-[#5C5346] hover:border-[#C5A059]'
                          }`}
                        >
                          <Compass className="h-3 w-3" />
                          <span>{showDyo ? 'Hide DYOJ' : 'Custom Ring Studio'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void submitAgentPrompt(turn.userPrompt, true)}
                          aria-label="Regenerate response"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#E5D4B3] bg-white/80 hover:border-[#C5A059] text-xs text-[#5C5346] hover:text-[#181613] cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3 text-[#9A7B2C]" />
                          <span>Retry</span>
                        </button>
                      </div>

                      {turn.response.suggestedFollowUps.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {turn.response.suggestedFollowUps.slice(0, 2).map((followUp) => (
                            <button
                              key={followUp}
                              type="button"
                              onClick={() => void submitAgentPrompt(followUp, true)}
                              className="px-3 py-1 text-xs rounded-full border border-[#E5D4B3] bg-[#FAF3E3]/70 hover:border-[#C5A059] text-[#181613] transition-colors cursor-pointer"
                            >
                              {followUp} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex justify-start items-center gap-3 text-sm text-[#8B6B23] animate-pulse">
              <div className="h-8 w-8 rounded-full bg-white border border-[#D4AF37]/50 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <span>AI Gemologist is inspecting vault specimens...</span>
            </div>
          )}

          <div ref={bottomEndRef} />
        </div>
      </main>

      {/* =========================================================================
          3. STICKY BOTTOM CHAT INPUT BAR (GEMINI / PERPLEXITY MINIMALIST DOCK)
         ========================================================================= */}
      <div
        data-testid="concierge-bottom-composer"
        className="sticky bottom-0 z-30 w-full bg-gradient-to-t from-[#FAF7F0] via-[#FAF7F0]/95 to-transparent pt-3 pb-5 px-4 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-2.5">
          {/* Minimalist Prompt Suggestion Pills Above Bottom Input */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {STARTER_AGENT_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => void submitAgentPrompt(cmd, true)}
                className="px-3.5 py-1 text-xs text-[#4E463A] bg-white/90 border border-[#E5D4B3] hover:border-[#C5A059] hover:text-[#181613] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Bottom Pill Chat Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 rounded-full bg-white border border-[#C5A059]/80 shadow-[0_12px_36px_rgba(24,22,19,0.1)] p-1.5 pl-5 focus-within:border-[#8B6B23] focus-within:shadow-[0_14px_42px_rgba(185,150,75,0.2)] transition-all"
          >
            <Sparkles className="h-4 w-4 text-[#9A7B2C] shrink-0" />
            <label htmlFor="concierge-agent-input" className="sr-only">
              Ask the AI Gemologist
            </label>
            <input
              ref={inputRef}
              id="concierge-agent-input"
              data-testid="concierge-agent-input"
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask AI Gemologist anything about gemstones, origins, comparisons, or custom rings..."
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-[#181613] placeholder:text-[#8C8273] focus:outline-none"
            />
            {inputPrompt && (
              <button
                type="button"
                onClick={() => setInputPrompt('')}
                aria-label="Clear prompt"
                className="p-1.5 text-[#8C8273] hover:text-[#181613] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              data-testid="concierge-agent-submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs uppercase tracking-[0.18em] font-bold gold-gradient-cta rounded-full transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
