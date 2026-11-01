import { chunkEntries, escapeXml } from '@/lib/mgh/sitemap';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const raw = (await ctx.params).id.replace(/\.xml$/i, '');
  const id = Number(raw);
  const entries = await chunkEntries(id);
  if (entries === null) return new Response('Not found', { status: 404 });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((e) =>
      `<url><loc>${escapeXml(e.loc)}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`),
    '</urlset>',
  ].join('');
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
