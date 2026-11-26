import { SITE_URL } from '@/lib/mgh/site-url';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';
export const BASE = SITE_URL.replace(/\/$/, '');
export const PER_CHUNK = 5000;

interface SitemapPage { total?: number; items?: Array<{ key: string }> }

async function sitemapPage(kind: string, offset: number, limit: number): Promise<SitemapPage> {
  const qs = new URLSearchParams({ kind, offset: String(offset), limit: String(limit) });
  try {
    const res = await fetch(`${FRESH_API_URL}/api/v1/catalogue/sitemap?${qs.toString()}`, { cache: 'no-store' });
    if (!res.ok) return { total: 0, items: [] };
    return (await res.json()) as SitemapPage;
  } catch {
    return { total: 0, items: [] };
  }
}

async function totals(): Promise<{ gemstones: number; settings: number; products: number }> {
  const [g, s, p] = await Promise.all([
    sitemapPage('gemstone', 0, 1),
    sitemapPage('setting', 0, 1),
    sitemapPage('product', 0, 1),
  ]);
  return { gemstones: g.total ?? 0, settings: s.total ?? 0, products: p.total ?? 0 };
}

export async function chunkCount(): Promise<number> {
  const t = await totals();
  return Math.max(
    1,
    1 + Math.ceil(t.gemstones / PER_CHUNK) + Math.ceil(t.settings / PER_CHUNK) + Math.ceil(t.products / PER_CHUNK),
  );
}

export interface SitemapEntry { loc: string; changefreq: string; priority: number }

const STATIC_ROUTES = [
  '', '/browse', '/gemstones', '/pairs', '/settings', '/jewellery', '/varieties',
  '/design-your-own', '/about', '/contact', '/education', '/financing',
  '/protection-plan', '/showrooms', '/policy',
];

export async function chunkEntries(id: number): Promise<SitemapEntry[] | null> {
  if (!Number.isInteger(id) || id < 0) return null;

  if (id === 0) {
    const res = await fetch(`${FRESH_API_URL}/api/v1/catalogue/varieties`, { cache: 'no-store' }).catch(() => null);
    const varieties = res && res.ok
      ? ((await res.json()) as { items?: Array<{ slug: string }> }).items ?? []
      : [];
    return [
      ...STATIC_ROUTES.map((path) => ({
        loc: `${BASE}${path || '/'}`,
        changefreq: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.6,
      })),
      ...varieties.map((v) => ({ loc: `${BASE}/varieties/${v.slug}`, changefreq: 'weekly', priority: 0.7 })),
    ];
  }

  const t = await totals();
  const gemChunks = Math.ceil(t.gemstones / PER_CHUNK);
  const settingChunks = Math.ceil(t.settings / PER_CHUNK);
  let n = id - 1;

  if (n < gemChunks) {
    const page = await sitemapPage('gemstone', n * PER_CHUNK, PER_CHUNK);
    return (page.items ?? []).map((item) => ({ loc: `${BASE}/product/${item.key}`, changefreq: 'weekly', priority: 0.8 }));
  }
  n -= gemChunks;

  if (n < settingChunks) {
    const page = await sitemapPage('setting', n * PER_CHUNK, PER_CHUNK);
    return (page.items ?? []).map((item) => ({ loc: `${BASE}/settings/${item.key}`, changefreq: 'weekly', priority: 0.7 }));
  }
  n -= settingChunks;

  if (n < Math.ceil(t.products / PER_CHUNK)) {
    const page = await sitemapPage('product', n * PER_CHUNK, PER_CHUNK);
    return (page.items ?? []).map((item) => ({ loc: `${BASE}/products/${item.key}`, changefreq: 'weekly', priority: 0.7 }));
  }

  return [];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
