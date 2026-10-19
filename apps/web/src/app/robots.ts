import type { MetadataRoute } from 'next';

import { siteBaseUrl } from '../lib/sitemap.js';

export const dynamic = 'force-dynamic';

/**
 * robots.txt — generated. Protected portals and APIs are disallowed; the
 * catalogue, PDPs and content pages are crawlable. Sitemap points at the
 * canonical index. SITE_URL unset → still emits a rules-only robots.txt
 * (no wrong-domain sitemap reference — never guess a canonical base).
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/admin',
    '/admin/',
    '/vendor',
    '/vendor/',
    '/account',
    '/account/',
    '/api/',
    '/checkout',
    '/checkout/',
  ];
  try {
    const base = siteBaseUrl().replace(/\/$/, '');
    return {
      rules: [{ userAgent: '*', allow: '/', disallow }],
      sitemap: `${base}/sitemap.xml`,
      host: base,
    };
  } catch {
    return { rules: [{ userAgent: '*', allow: '/', disallow }] };
  }
}
