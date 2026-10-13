import 'server-only';

import { cookies, headers } from 'next/headers';

import { storefrontBySlug } from './storefronts.js';
import type { StorefrontBrand } from './types.js';

export async function currentStorefront(): Promise<StorefrontBrand> {
  const fromHeader = (await headers()).get('x-maihan-storefront');
  const fromCookie = (await cookies()).get('maihan_storefront')?.value;
  return storefrontBySlug(fromHeader || fromCookie);
}
