'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  CURRENCY_COOKIE,
  DEFAULT_FX,
  detectCurrencyFromLocale,
  parseCurrency,
  type StorefrontCurrency,
} from '../../lib/currency.js';
import { getBag, getFavs, subscribeAtelier } from '../../lib/atelier-store.js';

interface StorefrontContextValue {
  currency: StorefrontCurrency;
  setCurrency: (c: StorefrontCurrency) => void;
  rates: Record<StorefrontCurrency, number>;
  bagCount: number;
  favCount: number;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

export function StorefrontProvider({
  children,
  rates,
  initialCurrency = 'USD',
}: {
  children: React.ReactNode;
  rates: Record<StorefrontCurrency, number>;
  initialCurrency?: StorefrontCurrency;
}) {
  const [currency, setCurrencyState] = useState<StorefrontCurrency>(initialCurrency);
  const [bagCount, setBagCount] = useState(0);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    const cookie = parseCurrency(readCookie(CURRENCY_COOKIE));
    if (cookie) {
      setCurrencyState(cookie);
    } else if (!initialCurrency || initialCurrency === 'USD') {
      setCurrencyState(detectCurrencyFromLocale());
    }
    const sync = () => {
      setBagCount(getBag().length);
      setFavCount(getFavs().length);
    };
    sync();
    return subscribeAtelier(sync);
  }, []);

  const setCurrency = (next: StorefrontCurrency) => {
    setCurrencyState(next);
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  };

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rates: { ...DEFAULT_FX, ...rates },
      bagCount,
      favCount,
    }),
    [currency, rates, bagCount, favCount],
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) {
    throw new Error('useStorefront must be used within StorefrontProvider');
  }
  return ctx;
}
