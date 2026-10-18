/**
 * apps/web/src/app/(storefront)/shop/page.tsx
 *
 * `/shop` — the simple catalogue grid over the storefront schema. Filters,
 * imagery, prices and empty state all come from the storefront data seam.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop the Vault | Maihan Gems',
  description: 'Natural gemstones, matched pairs, settings and finished jewellery from the private vault.',
};

const KINDS = ['gemstone', 'jewelry', 'setting'] as const;
type Kind = (typeof KINDS)[number];

const KIND_LABELS: Record<Kind, string> = {
  gemstone: 'Loose gemstones',
  jewelry: 'Finished jewellery',
  setting: 'Atelier settings',
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const query = await searchParams;
  const kind = KINDS.includes(query.kind as Kind) ? (query.kind as Kind) : undefined;

  const products = await listProducts({ kind, limit: 48 });

  return (
    <CollectionPage
      kicker="The vault"
      title={kind ? KIND_LABELS[kind] : 'Shop the vault'}
      lede="Natural gemstones, matched pairs, settings and finished jewellery. Prices follow your selected currency."
      products={products}
      chips={
        <>
          <Link href="/shop" className={kind ? undefined : 'is-on'} aria-current={kind ? undefined : 'page'}>
            All pieces
          </Link>
          {KINDS.map((row) => (
            <Link
              key={row}
              href={`/shop?kind=${row}`}
              className={kind === row ? 'is-on' : undefined}
              aria-current={kind === row ? 'page' : undefined}
            >
              {KIND_LABELS[row]}
            </Link>
          ))}
        </>
      }
      cta={{ href: '/design-your-own', label: 'Design your own piece' }}
    />
  );
}
