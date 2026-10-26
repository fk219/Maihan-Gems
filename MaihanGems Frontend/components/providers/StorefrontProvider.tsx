'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  CurrencyCode,
  formatCurrencyAmount,
  getCompareCategoryForId,
  normalizeCompareId,
  sanitizeSameCategoryCompareList,
} from '@/lib/storefront-data';

// Performance budget rule: drawers and command palettes are loaded via next/dynamic after first paint
const DynamicCartDrawer = dynamic(() => import('@/components/shell/CartDrawer'), {
  ssr: false,
});
const DynamicCommandPalette = dynamic(() => import('@/components/shell/CommandPalette'), {
  ssr: false,
});

export interface CartItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  image: string;
  kind: 'gemstone' | 'pair' | 'setting' | 'dyo';
  quantity: number;
  configurationCode?: string;
}

interface StorefrontContextValue {
  cart: CartItem[];
  favorites: string[];
  compareList: string[];
  currency: CurrencyCode;
  isCartOpen: boolean;
  isSearchOpen: boolean;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amountUsd: number) => string;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  cartTotal: number;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

const STORAGE_KEYS = {
  CART: 'maihan_cart_v1',
  FAV: 'maihan_favorites_v1',
  CMP: 'maihan_compare_v1',
  CURRENCY: 'maihan_currency_v1',
};

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [warmed, setWarmed] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEYS.CART);
      if (savedCart) setCart(JSON.parse(savedCart));
      const savedFav = localStorage.getItem(STORAGE_KEYS.FAV);
      if (savedFav) setFavorites(JSON.parse(savedFav));
      const savedCmp = localStorage.getItem(STORAGE_KEYS.CMP);
      if (savedCmp) {
        const parsed = JSON.parse(savedCmp);
        if (Array.isArray(parsed)) {
          setCompareList(sanitizeSameCategoryCompareList(parsed));
        }
      }
      const savedCurr = localStorage.getItem(STORAGE_KEYS.CURRENCY) as CurrencyCode;
      if (savedCurr && (savedCurr === 'USD' || savedCurr === 'AED' || savedCurr === 'BHAT')) {
        setCurrencyState(savedCurr);
      }
    } catch {
      // Ignore storage errors in restricted environments
    }

    // Warm dynamic interactive chunks on idle after hydration
    const timer = window.setTimeout(() => {
      setWarmed(true);
    }, 250);

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setWarmed(true);
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const persistCart = useCallback((next: CartItem[]) => {
    setCart(next);
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'>) => {
      setWarmed(true);
      setCart((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === item.id);
        let next: CartItem[];
        if (existingIndex > -1) {
          // Loose gemstones are unique 1-of-1 specimens, settings/DYO can increment or stay 1
          next = prev.map((entry, idx) =>
            idx === existingIndex
              ? { ...entry, quantity: entry.kind === 'gemstone' ? 1 : entry.quantity + 1 }
              : entry
          );
        } else {
          next = [...prev, { ...item, quantity: 1 }];
        }
        try {
          localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setCartOpen(true);
    },
    []
  );

  const removeFromCart = useCallback(
    (id: string) => {
      persistCart(cart.filter((i) => i.id !== id));
    },
    [cart, persistCart]
  );

  const clearCart = useCallback(() => {
    persistCart([]);
  }, [persistCart]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEYS.FAV, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleCompare = useCallback((rawId: string) => {
    const id = normalizeCompareId(rawId);
    setCompareList((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        try {
          localStorage.setItem(STORAGE_KEYS.CMP, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      }
      const incomingCategory = getCompareCategoryForId(id);
      const sameCategoryPrev = prev.filter(
        (existingId) => getCompareCategoryForId(existingId) === incomingCategory
      );
      const next = [...sameCategoryPrev.slice(-3), id];
      try {
        localStorage.setItem(STORAGE_KEYS.CMP, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.CMP);
    } catch {
      // ignore
    }
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, next);
    } catch {
      // ignore
    }
  }, []);

  const formatPrice = useCallback(
    (amountUsd: number) => formatCurrencyAmount(amountUsd, currency),
    [currency]
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <StorefrontContext.Provider
      value={{
        cart,
        favorites,
        compareList,
        currency,
        isCartOpen,
        isSearchOpen,
        setCurrency,
        formatPrice,
        addToCart,
        removeFromCart,
        clearCart,
        toggleFavorite,
        toggleCompare,
        clearCompare,
        setCartOpen: (open) => {
          if (open) setWarmed(true);
          setCartOpen(open);
        },
        setSearchOpen: (open) => {
          if (open) setWarmed(true);
          setSearchOpen(open);
        },
        cartTotal,
      }}
    >
      {children}
      {(warmed || isCartOpen) && <DynamicCartDrawer />}
      {(warmed || isSearchOpen) && <DynamicCommandPalette />}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) {
    throw new Error('useStorefront must be used inside StorefrontProvider');
  }
  return ctx;
}
