/**
 * Simple shop page using the new storefront schema
 */
import Link from 'next/link';
import { getStorefrontRepository } from '../../../lib/db';
import type { SimpleProduct } from '@maihan/db';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { kind?: string; region?: string };
}) {
  const repo = getStorefrontRepository();
  const kind = searchParams.kind as 'gemstone' | 'jewelry' | 'setting' | undefined;

  const products = await repo.listProducts(kind, 24);

  return (
    <div className="lx-section" style={{ background: 'var(--warm-alabaster)' }}>
      <div className="lx-wrap">
        <span className="lx-kicker">The vault</span>
        <h1 className="lx-h2">Maihan Gems</h1>
        <p className="lx-lede">Natural untreated gemstones and master atelier settings.</p>

        <div className="lx-facets">
          <Link href="/shop" className={!kind ? 'is-on' : undefined}>
            All products
          </Link>
          <Link href="/shop?kind=gemstone" className={kind === 'gemstone' ? 'is-on' : undefined}>
            Gemstones
          </Link>
          <Link href="/shop?kind=jewelry" className={kind === 'jewelry' ? 'is-on' : undefined}>
            Jewellery
          </Link>
          <Link href="/shop?kind=setting" className={kind === 'setting' ? 'is-on' : undefined}>
            Settings
          </Link>
        </div>

        <div className="lx-grid" style={{ marginTop: '2rem' }}>
          {products.map((product: SimpleProduct) => (
            <Link key={product.id} href={`/shop/${product.slug}`} className="lx-card">
              <div className="lx-card__media" />
              <div className="lx-card__body">
                <h3 className="lx-card__title">{product.title}</h3>
                {product.description ? <p className="lx-card__specs">{product.description}</p> : null}
                <p className="lx-card__meta">
                  {[product.stone_type, product.jewelry_type].filter(Boolean).join(' · ')}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {products.length === 0 ? (
          <p className="lx-empty-copy">No products found</p>
        ) : null}
      </div>
    </div>
  );
}
