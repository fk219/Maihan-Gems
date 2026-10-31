import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/mgh/site-url';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';
const BASE = SITE_URL.replace(/\/$/, '');
const PAGE = 200;
const MAX_OFFSET = 60_000;

interface ListPage<T> { items?: T[] }

async function fetchAll<T>(path: string, extra: Record<string, string> = {}): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; offset <= MAX_OFFSET; offset += PAGE) {
    try {
      const qs = new URLSearchParams({ ...extra, limit: String(PAGE), offset: String(offset) });
      const res = await fetch(`${FRESH_API_URL}${path}?${qs.toString()}`, { cache: 'no-store' });
      if (!res.ok) break;
      const data = (await res.json()) as ListPage<T>;
      const items = data.items ?? [];
      out.push(...items);
      if (items.length < PAGE) break;
    } catch {
      break;
    }
  }
  return out;
}

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    '', '/browse', '/gemstones', '/pairs', '/settings', '/jewellery', '/varieties',
    '/design-your-own', '/about', '/contact', '/education', '/financing',
    '/protection-plan', '/showrooms', '/policy',
  ].map((path) => ({
    url: `${BASE}${path || '/'}`,
    changeFrequency: (path === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: path === '' ? 1 : 0.6,
  }));

  const [varieties, gems, settings, products] = await Promise.all([
    fetchAll<{ slug: string }>('/api/v1/catalogue/varieties'),
    fetchAll<{ slug: string; kind: string }>('/api/v1/catalogue/gemstones'),
    fetchAll<{ ref: string }>('/api/v1/catalogue/settings'),
    fetchAll<{ slug: string }>('/api/v1/catalogue/products'),
  ]);

  return [
    ...staticRoutes,
    ...varieties.map((v) => ({ url: `${BASE}/varieties/${v.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...gems
      .filter((g) => g.kind === 'SINGLE')
      .map((g) => ({ url: `${BASE}/product/${g.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...settings.map((s) => ({ url: `${BASE}/settings/${s.ref}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${BASE}/products/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];
}
