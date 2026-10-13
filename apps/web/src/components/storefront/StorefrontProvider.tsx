'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  CURRENCY_COOKIE,
  DEFAULT_FX,
  detectCurrencyFromLocale,
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
}: {
  children: React.ReactNode;
  rates: Record<StorefrontCurrency, number>;
}) {
  const [currency, setCurrencyState] = useState<StorefrontCurrency>('USD');
  const [bagCount, setBagCount] = useState(0);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    const cookie = readCookie(CURRENCY_COOKIE);
    if (cookie === 'USD' || cookie === 'AED' || cookie === 'THB') {
      setCurrencyState(cookie);
    } else {
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
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000`;
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
