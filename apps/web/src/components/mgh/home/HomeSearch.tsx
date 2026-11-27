'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, X } from 'lucide-react';

/**
 * The hero's search. It is the page's centrepiece, not a pill with a magnifier:
 * a 60 px field on a hairline, a real submit action, and a typeahead panel that
 * floats over the hero so opening it never moves the page.
 *
 * Suggestions are read from the existing catalogue typeahead endpoint
 * (`/api/fresh/catalogue/gemstones?q=`). Nothing is pre-seeded, ranked by hand
 * or invented; when the endpoint returns nothing, the panel says so and offers
 * the full catalogue search instead. The endpoint exposes no kind/scope facet,
 * so the field does not offer one.
 *
 * Keyboard: "/" focuses, Escape clears then blurs, Enter submits (or opens the
 * active suggestion), ArrowUp/Down move through results.
 */
interface ApiItem {
  ref?: string;
  slug?: string;
  name?: string;
  kind?: 'SINGLE' | 'PAIR';
  variety?: string | null;
  origin?: string | null;
  price_amount?: string | number | null;
}

interface Suggestion {
  key: string;
  name: string;
  meta: string;
  price: string;
  href: string;
}

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function toSuggestion(item: ApiItem, index: number): Suggestion | null {
  const name = (item.name ?? '').trim();
  if (!name) return null;
  const slug = (item.slug ?? '').trim();
  const isPair = item.kind === 'PAIR';
  // Pairs have a listing surface, not a single-product dossier.
  const href = isPair ? '/pairs' : slug ? `/products/${slug}` : '/search';
  const meta = [isPair ? 'Matched pair' : (item.variety ?? '').trim(), (item.origin ?? '').trim()]
    .filter(Boolean)
    .join(' · ');
  const amount = Number(item.price_amount ?? 0);
  const price =
    Number.isFinite(amount) && amount > 0
      ? `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
      : '';
  return { key: `${slug || name}-${index}`, name, meta, price, href };
}

export function HomeSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [announcement, setAnnouncement] = useState('');

  const optionId = (index: number) => `${listId}-option-${index}`;
  const panelId = `${listId}-panel`;
  const trimmed = query.trim();
  const panelOpen = open && trimmed.length >= 2 && status !== 'idle';
  const showList = panelOpen && status === 'ready';

  useEffect(() => {
    if (trimmed.length < 2) {
      setStatus('idle');
      setResults([]);
      setActive(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus('loading');
      fetch(`/api/fresh/catalogue/gemstones?q=${encodeURIComponent(trimmed)}&limit=6`, {
        signal: controller.signal,
        cache: 'no-store',
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('catalogue');
          const data = (await response.json()) as { items?: ApiItem[] };
          const items = (data.items ?? [])
            .map(toSuggestion)
            .filter((item): item is Suggestion => item !== null)
            .slice(0, 6);
          setResults(items);
          setStatus(items.length > 0 ? 'ready' : 'empty');
          setActive(-1);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setStatus('error');
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  useEffect(() => {
    if (status === 'loading') setAnnouncement('Searching the catalogue');
    else if (status === 'ready')
      setAnnouncement(`${results.length} ${results.length === 1 ? 'record' : 'records'} found`);
    else if (status === 'empty') setAnnouncement('No records found');
    else if (status === 'error') setAnnouncement('The catalogue could not be read');
    else setAnnouncement('');
  }, [status, results.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setActive(-1);
      router.push(href);
    },
    [router],
  );

  const submit = () => {
    if (active >= 0 && results[active]) {
      go(results[active].href);
      return;
    }
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    go(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current + 1) % results.length);
      return;
    }
    if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current <= 0 ? results.length - 1 : current - 1));
      return;
    }
    if (event.key === 'Enter' && active >= 0 && results[active]) {
      event.preventDefault();
      go(results[active].href);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (query) {
        setQuery('');
        setResults([]);
        setStatus('idle');
        setOpen(false);
        setActive(-1);
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setStatus('idle');
    setActive(-1);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="mh6-search"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form
        role="search"
        action="/search"
        method="get"
        aria-label="Search the catalogue"
        className="mh6-search__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <span className="mh6-search__icon" aria-hidden="true">
          <Search />
        </span>

        <label htmlFor="mh6-home-search" className="sr-only">
          Search gemstones by variety, origin or reference
        </label>

        <input
          ref={inputRef}
          id="mh6-home-search"
          name="q"
          type="text"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={panelOpen ? panelId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search by variety, origin or reference"
          className="mh6-search__input"
        />

        {query ? (
          <button type="button" className="mh6-search__clear" onClick={clear} aria-label="Clear search">
            <X aria-hidden="true" />
          </button>
        ) : null}

        <button type="submit" className="mh6-search__submit" aria-label="Search the catalogue">
          <span>Search</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </form>

      <p className="mh6-search__status sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {panelOpen ? (
        <div className="mh6-search__panel" id={panelId}>
          {status === 'loading' ? <p className="mh6-search__state">Reading the catalogue…</p> : null}

          {status === 'error' ? (
            <div className="mh6-search__state">
              <p>The catalogue could not be read just now.</p>
              <Link href="/search" className="mh6-search__state-link">
                Open the catalogue search
              </Link>
            </div>
          ) : null}

          {status === 'empty' ? (
            <div className="mh6-search__state">
              <p>No record matches “{trimmed}”.</p>
              <Link
                href={`/search?q=${encodeURIComponent(trimmed)}`}
                className="mh6-search__state-link"
              >
                Search the full catalogue
              </Link>
            </div>
          ) : null}

          {showList ? (
            <div id={listId} role="listbox" aria-label="Catalogue suggestions" className="mh6-search__list">
              {results.map((result, index) => (
                <div
                  key={result.key}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  className={`mh6-search__option${index === active ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(result.href)}
                >
                  <span className="mh6-search__option-main">
                    <span className="mh6-search__option-name">{result.name}</span>
                    {result.meta ? (
                      <span className="mh6-search__option-meta">{result.meta}</span>
                    ) : null}
                  </span>
                  {result.price ? (
                    <span className="mh6-search__option-price">{result.price}</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
