'use client';

/**
 * apps/web/src/components/ai/AiConciergeDrawer.tsx
 *
 * Storefront Luxury AI Concierge Client Island.
 *
 * Authority & Styling:
 *   - technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md
 *   - Design.md (Swiss Private Banking precision combined with modern Dubai luxury)
 *   - Connects to /api/v1/ai/chat with live SSE streaming or standard JSON response
 *   - Provides natural language gemstone discovery, bespoke atelier mounting guidance,
 *     gemstone comparison, and human specialist handoff.
 *   - Invariant: Zero mutating tools; strictly grounded in authoritative catalog & certificates.
 */
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: Array<{
    readonly title: string;
    readonly uri: string;
    readonly trustTier: string;
  }>;
  readonly suggestions?: Array<{
    readonly label: string;
    readonly href: string;
  }>;
  readonly isStreaming?: boolean;
}

const INITIAL_MESSAGE: Message = {
  id: 'init-msg',
  role: 'assistant',
  content:
    'Welcome to Maihan Gems Private Client Concierge. I can assist you with natural earth-mined gemstone provenance, 18K gold and platinum mounting compatibility, laboratory certification standards, or commissioning a bespoke piece with our atelier.',
  suggestions: [
    { label: 'Explore Ceylon Sapphires', href: '/search?q=sapphire' },
    { label: 'Design Your Own Piece', href: '/design-your-own' },
    { label: 'View Master Mountings', href: '/settings' },
  ],
};

export function AiConciergeDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationKey] = useState(() => `conv_${Date.now().toString(36)}`);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    const userMessageId = `usr_${Date.now()}`;
    const assistantMessageId = `asst_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: query },
      { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationKey,
          surface: 'chat_panel',
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Check if response is SSE stream
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let citations: any[] = [];
        let buffer = '';

        const applyFrame = (event: string, data: any) => {
          if (event === 'content_delta') {
            const text = typeof data?.text === 'string'
              ? data.text
              : typeof data?.delta === 'string'
                ? data.delta
                : '';
            if (text.length > 0) {
              accumulated += text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulated, citations }
                    : msg,
                ),
              );
            }
          } else if (event === 'citation' && data?.citation) {
            citations = [...citations, data.citation];
          } else if (event === 'done' && typeof data?.response === 'string') {
            accumulated = data.response;
            if (Array.isArray(data.citations)) citations = data.citations;
          } else if (typeof data?.response === 'string') {
            accumulated = data.response;
            if (Array.isArray(data.citations)) citations = data.citations;
          }
        };

        const drain = (flush: boolean) => {
          const blocks = buffer.split('\n\n');
          buffer = flush ? '' : (blocks.pop() ?? '');
          for (const block of blocks) {
            let event = 'message';
            const dataLines: string[] = [];
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
            }
            if (dataLines.length === 0) continue;
            try {
              applyFrame(event, JSON.parse(dataLines.join('\n')));
            } catch {
              // Ignore a malformed frame; a later frame can still render.
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          drain(false);
        }
        buffer += decoder.decode();
        drain(true);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    accumulated ||
                    'The concierge returned no answer. Please try again or ask for a human specialist.',
                  citations,
                  isStreaming: false,
                }
              : msg,
          ),
        );
      } else {
        // Standard JSON fallback
        const data = await res.json();
        const respText =
          data?.data?.response ??
          data?.response ??
          'Thank you for your inquiry. How else may I assist your gemstone search today?';
        const cites = data?.data?.citations ?? [];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: respText, citations: cites, isStreaming: false }
              : msg,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  'Our gemstone advisory network is currently busy. Please contact our Private Client Salon directly or retry momentarily.',
                isStreaming: false,
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Concierge Advisor Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="ai-concierge-trigger"
        aria-label="Open Maihan Gems Private Client Concierge"
        aria-expanded={isOpen}
      >
        <span className="ai-concierge-trigger__icon" aria-hidden="true">
          ✦
        </span>
        <span className="ai-concierge-trigger__label">Client Concierge</span>
      </button>

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div className="ai-concierge-backdrop" onClick={() => setIsOpen(false)}>
          <aside
            className="ai-concierge-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Maihan Gems Private Client Concierge"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="ai-concierge-drawer__header">
              <div className="ai-concierge-drawer__brand">
                <span className="ai-concierge-drawer__sparkle" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <h2 className="ai-concierge-drawer__title">Private Client Concierge</h2>
                  <p className="ai-concierge-drawer__sub">
                    Direct Gemmological Advisory · GIA/Gübelin Standards
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ai-concierge-drawer__close"
                aria-label="Close Concierge"
              >
                ✕
              </button>
            </div>

            {/* Conversation Log */}
            <div className="ai-concierge-drawer__messages">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`ai-message ${
                    m.role === 'user' ? 'ai-message--user' : 'ai-message--assistant'
                  }`}
                >
                  <div className="ai-message__bubble">
                    <p className="ai-message__text">{m.content}</p>

                    {m.isStreaming && (
                      <span className="ai-message__cursor" aria-label="Streaming response">
                        ▊
                      </span>
                    )}

                    {m.citations && m.citations.length > 0 && (
                      <div className="ai-message__citations">
                        <span className="ai-message__citation-title">Grounded References:</span>
                        {m.citations.map((cite, idx) => (
                          <span key={idx} className="ai-message__citation-badge">
                            {cite.title} ({cite.trustTier})
                          </span>
                        ))}
                      </div>
                    )}

                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="ai-message__suggestions">
                        {m.suggestions.map((sug, idx) => (
                          <Link
                            key={idx}
                            href={sug.href}
                            onClick={() => setIsOpen(false)}
                            className="ai-message__suggestion-chip"
                          >
                            {sug.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSubmit} className="ai-concierge-drawer__form">
              <div className="ai-concierge-drawer__input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Inquire about gem varieties, origins, mountings..."
                  className="ai-concierge-drawer__input"
                  disabled={isLoading}
                  aria-label="Message to Concierge"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="ai-concierge-drawer__submit"
                  aria-label="Send message"
                >
                  {isLoading ? '···' : 'Send'}
                </button>
              </div>
              <p className="ai-concierge-drawer__disclaimer">
                Grounded in authoritative gemmological data. Orders and financial transactions
                require verified confirmation.
              </p>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}

export default AiConciergeDrawer;
