import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LuxuryProductCard } from '../../../../components/storefront/LuxuryProductCard.js';
import { ProductActions } from '../../../../components/storefront/ProductActions.js';
import { cardToAtelier } from '../../../../lib/atelier-item.js';
import { getProductBySlug, listProducts } from '../../../../lib/storefront-data.js';
import { productImage } from '../../../../lib/storefront-images.js';

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
    colorHue: product.colorHue,
    variety: product.variety,
    quantityType: product.quantityType,
    imageUrl: product.imageUrl,
  });

  const related = (
    await listProducts({
      kind: product.kind,
      stoneType: product.stoneType ?? undefined,
      limit: 4,
    })
  ).filter((p) => p.id !== product.id);

  const dossier = [
    ['Kind', product.kind],
    ['Stone', product.stoneType?.replace(/_/g, ' ')],
    ['Carat', product.caratTotal ? `${product.caratTotal} ct` : null],
    ['Shape', product.shape?.replace(/_/g, ' ')],
    ['Colour', product.colorHue],
    ['Origin', product.originCountry],
    ['Treatment', product.treatment?.replace(/_/g, ' ')],
    ['SKU', product.sku],
  ].filter(([, value]) => Boolean(value));

  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <nav className="lx-card__specs" style={{ marginBottom: '1.5rem' }}>
          <Link href="/">Home</Link> · <Link href="/browse">Vault</Link> · {product.title}
        </nav>
        <div className="lx-pdp">
          <div className="lx-pdp__media">
            <img src={image} alt={product.title} />
          </div>
          <div>
            <span className="lx-kicker">{product.originCountry ?? product.kind}</span>
            <h1 className="lx-h2">{product.title}</h1>
            <p className="lx-lede">
              {[
                product.caratTotal ? `${product.caratTotal} ct` : null,
                product.shape?.replace(/_/g, ' '),
                product.treatment?.replace(/_/g, ' '),
                product.settingFor,
                product.jewelryType,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="lx-lede">{product.description ?? 'A vault piece, listed with the attributes we hold on record.'}</p>
            <ProductActions item={cardToAtelier(product)} />
            <dl className="lx-dossier">
              {dossier.map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
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
