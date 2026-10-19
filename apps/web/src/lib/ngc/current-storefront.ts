import 'server-only';

import { cookies, headers } from 'next/headers';

import { storefrontBySlug } from './storefronts.js';
import type { StorefrontBrand } from './types.js';

function resolveHostStorefrontSlug(host: string | null): string | null {
  if (!host) return null;
  const lower = host.toLowerCase().split(':')[0] ?? '';
  if (lower.startsWith('sapphire.') || lower.includes('maihansapphire')) return 'sapphire';
  if (lower.startsWith('ruby.') || lower.includes('maihanruby')) return 'ruby';
  if (lower.startsWith('emerald.') || lower.includes('maihanemerald')) return 'emerald';
  return null;
}

export async function currentStorefront(): Promise<StorefrontBrand> {
  const hdrs = await headers();
  const fromHeader = hdrs.get('x-maihan-storefront');
  const fromHost = resolveHostStorefrontSlug(
    hdrs.get('x-forwarded-host') ?? hdrs.get('host'),
  );
  const fromCookie = (await cookies()).get('maihan_storefront')?.value;
  return storefrontBySlug(fromHeader || fromHost || fromCookie);
}
