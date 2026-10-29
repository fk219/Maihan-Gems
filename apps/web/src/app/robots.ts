import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/vendor', '/account'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
