'use client';

import { useEffect, useRef, useState } from 'react';

import { CURRENCIES, type StorefrontCurrency } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useStorefront();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className={`ngc-fx${open ? ' is-open' : ''}`} ref={root}>
      <button
        type="button"
        className="ngc-fx__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Currency ${currency}`}
        onClick={() => setOpen((v) => !v)}
      >
        {currency}
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 8l3-3.5" />
        </svg>
      </button>
      {open ? (
        <ul className="ngc-fx__menu" role="listbox" aria-label="Currencies">
          {CURRENCIES.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === currency}
                className={code === currency ? 'is-on' : ''}
                onClick={() => {
                  setCurrency(code as StorefrontCurrency);
                  setOpen(false);
                }}
              >
                {code}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
