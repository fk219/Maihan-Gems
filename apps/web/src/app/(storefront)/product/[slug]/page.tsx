import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LuxuryProductCard } from '../../../../components/storefront/LuxuryProductCard.js';
import { ProductActions } from '../../../../components/storefront/ProductActions.js';
import { ProductStudio } from '../../../../components/storefront/ProductStudio.js';
import { cardToAtelier } from '../../../../lib/atelier-item.js';
import { findNgcProduct, ngcCards } from '../../../../lib/ngc/catalog.js';
import { getProductBySlug, listProducts } from '../../../../lib/storefront-data.js';
import { productImage } from '../../../../lib/storefront-images.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ngc = findNgcProduct(slug);
  if (ngc) return { title: `${ngc.title} | Maihan Gems` };
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.title} | Maihan Gems` : 'Piece | Maihan Gems' };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ngc = findNgcProduct(slug);
  if (ngc) {
    const related = ngcCards({ kind: ngc.kind, stoneSlug: ngc.stoneType?.toLowerCase().replace(/[^a-z0-9]+/g, '-'), limit: 5 }).filter(
      (row) => row.sku !== ngc.id,
    );
    return <ProductStudio product={ngc} related={related} />;
  }

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
        <nav className="lx-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">·</span>
          <Link href="/browse">Vault</Link>
          <span aria-hidden="true">·</span>
          <span>{product.title}</span>
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
          <div className="lx-grid" style={{ marginTop: '3rem' }}>
            {related.map((row) => (
              <LuxuryProductCard key={row.id} product={row} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
