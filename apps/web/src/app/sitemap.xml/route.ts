import { BASE, chunkCount, escapeXml } from '@/lib/mgh/sitemap';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const count = await chunkCount();
  const entries = Array.from({ length: count }, (_, id) => `${BASE}/sitemap/${id}.xml`);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`),
    '</sitemapindex>',
  ].join('');
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
