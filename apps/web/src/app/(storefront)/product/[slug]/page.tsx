import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LuxuryProductCard } from '../../../../components/storefront/LuxuryProductCard.js';
import { getProductBySlug, listProducts } from '../../../../lib/storefront-data.js';
import { productImage } from '../../../../lib/storefront-images.js';
import { formatMoney } from '../../../../lib/currency.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.title} | Maihan Gems` : 'Piece | Maihan Gems' };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const image = productImage({
    kind: product.kind,
    stoneType: product.stoneType,
    jewelryType: product.jewelryType,
    settingFor: product.settingFor,
    style: product.style,
    title: product.title,
  });

  const related = (
    await listProducts({
      kind: product.kind,
      stoneType: product.stoneType ?? undefined,
      limit: 4,
    })
  ).filter((p) => p.id !== product.id);

  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <nav className="lx-card__specs" style={{ marginBottom: '1.5rem' }}>
          <Link href="/">Home</Link> · <Link href="/browse">Vault</Link> · {product.title}
        </nav>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2.5rem' }} className="lx-pdp">
          <div className="lx-card__media" style={{ aspectRatio: '1 / 1', maxWidth: 640 }}>
            <img src={image} alt={product.title} />
          </div>
          <div>
            <span className="lx-kicker">{product.originCountry ?? product.kind}</span>
            <h1 className="lx-h2">{product.title}</h1>
            <p className="lx-card__specs" style={{ margin: '1rem 0' }}>
              {[
                product.caratTotal ? `${product.caratTotal} ct` : null,
                product.shape,
                product.treatment?.replace(/_/g, ' '),
                product.settingFor,
                product.jewelryType,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', margin: '1.25rem 0' }}>
              {formatMoney(product.priceUsd, 'USD')}
              <span style={{ display: 'block', fontSize: '0.85rem', color: '#8a867e', marginTop: '0.35rem' }}>
                {formatMoney(product.priceUsd, 'AED')} · {formatMoney(product.priceUsd, 'THB')}
              </span>
            </p>
            <p style={{ color: '#4a4740', lineHeight: 1.7, maxWidth: 520 }}>
              {product.description ?? 'A vault piece, listed with the attributes we hold on record.'}
            </p>
            <p style={{ marginTop: '1.5rem' }}>
              <Link href="/cart" className="lx-more">Add from the card on the home grid, or enquire via concierge</Link>
            </p>
          </div>
        </div>
        {related.length > 0 ? (
          <div style={{ marginTop: '4rem' }}>
            <h2 className="lx-h2" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Nearby in the vault</h2>
            <div className="lx-grid">
              {related.map((item) => (
                <LuxuryProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
