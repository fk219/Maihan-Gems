'use client';

export interface AtelierItem {
  id: string;
  slug: string;
  title: string;
  kind: string;
  priceUsd: number;
  image: string;
  specs?: string;
}

const KEYS = {
  bag: 'maihan_bag',
  favs: 'maihan_favs',
  compare: 'maihan_compare',
  currency: 'maihan_currency',
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('maihan-atelier'));
}

export function getBag(): AtelierItem[] {
  return read<AtelierItem[]>(KEYS.bag, []);
}

export function getFavs(): AtelierItem[] {
  return read<AtelierItem[]>(KEYS.favs, []);
}

export function getCompare(): AtelierItem[] {
  return read<AtelierItem[]>(KEYS.compare, []);
}

export function toggleFav(item: AtelierItem): boolean {
  const favs = getFavs();
  const exists = favs.some((f) => f.id === item.id);
  write(KEYS.favs, exists ? favs.filter((f) => f.id !== item.id) : [...favs, item]);
  return !exists;
}

export function isFav(id: string): boolean {
  return getFavs().some((f) => f.id === id);
}

export function addToBag(item: AtelierItem): void {
  const bag = getBag();
  if (!bag.some((b) => b.id === item.id)) write(KEYS.bag, [...bag, item]);
}

export function removeFromBag(id: string): void {
  write(KEYS.bag, getBag().filter((b) => b.id !== id));
}

export function toggleCompare(item: AtelierItem): boolean {
  const list = getCompare();
  const exists = list.some((c) => c.id === item.id);
  const next = exists ? list.filter((c) => c.id !== item.id) : [...list, item].slice(-4);
  write(KEYS.compare, next);
  return !exists;
}

export function subscribeAtelier(listener: () => void): () => void {
  const on = () => listener();
  window.addEventListener('maihan-atelier', on);
  window.addEventListener('storage', on);
  return () => {
    window.removeEventListener('maihan-atelier', on);
    window.removeEventListener('storage', on);
  };
}
