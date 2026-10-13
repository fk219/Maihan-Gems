'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { NgcProduct } from '../../lib/ngc/types.js';
import { catalogImageSrc, fallbackMediaUrl, galleryImages, galleryReports, galleryVideos, spinFrameUrl, spinMedia } from '../../lib/ngc/media.js';
import { imageTo3dHook } from '../../lib/ngc/compat.js';
import { cardToAtelier } from '../../lib/atelier-item.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { formatMoney } from '../../lib/currency.js';
import { VirtualTryOnModal } from '../webar/VirtualTryOnModal.js';
import { ThreeDViewer } from '../webar/ThreeDViewer.js';
import { JewelryConfiguratorCanvas, type MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { CatalogImage } from './CatalogImage.js';
import { ProductActions } from './ProductActions.js';
import { LuxuryProductCard } from './LuxuryProductCard.js';
import { useStorefront } from './StorefrontProvider.js';

function tryOnMode(product: NgcProduct): 'hand' | 'ear' | 'neck' | 'room' {
  if (product.kind === 'stone_pair' || product.settingType === 'earring' || product.jewelryType === 'earring') return 'ear';
  if (product.jewelryType === 'pendant' || product.jewelryType === 'necklace' || product.settingType === 'pendant_necklace') return 'neck';
  if (product.kind === 'loose_stone') return 'room';
  return 'hand';
}

export function ProductStudio({
  product,
  related,
}: {
  product: NgcProduct;
  related: StorefrontCard[];
}) {
  const { currency, rates } = useStorefront();
  const photos = galleryImages(product);
  const videos = galleryVideos(product);
  const reports = galleryReports(product);
  const [tab, setTab] = useState<'piece' | 'reports'>('piece');
  const [active, setActive] = useState(0);
  const [tryOn, setTryOn] = useState(false);
  const [spin, setSpin] = useState(1);
  const images = tab === 'piece' ? photos : reports;
  const current = images[active] ?? photos[0];
  const src = current ? catalogImageSrc(product, current) : catalogImageSrc(product);
  const fallback = current ? fallbackMediaUrl(current) : '';
  const item = cardToAtelier({
    id: product.id,
    sku: product.id,
    slug: product.slug,
    title: product.title,
    kind: product.kind === 'setting' ? 'setting' : product.kind === 'jewelry' || product.kind === 'dyo_composite' ? 'jewelry' : 'gemstone',
    description: null,
    priceUsd: product.priceUsd,
    stoneType: product.stoneType,
    variety: product.subcategory,
    caratTotal: product.weightCt,
    shape: product.shape,
    colorHue: product.color,
    originCountry: product.origin,
    treatment: product.enhancement,
    quantityType: product.kind === 'stone_pair' ? 'pair' : 'single',
    jewelryType: product.jewelryType,
    settingFor: product.settingType,
    style: [...product.styles],
    metalType: product.metalName,
    metalColor: product.metalName,
    imageUrl: src,
    vendorName: 'Maihan Gems',
    certificateLab: product.lab,
  });
  const mode = tryOnMode(product);
  const hook = imageTo3dHook(product);
  const dyoHref = product.kind === 'setting' ? `/design-your-own?setting=${product.id}` : `/design-your-own?stone=${product.id}`;
  const frames = product.spin?.framesCount ?? 0;
  const pattern = product.spin?.urlPattern;
  const spinItem = spinMedia(product);
  const spinSrc = spinItem ? catalogImageSrc(product, spinItem) : '';
  const glb = product.threeDFilePath || product.media.find((m) => m.kind.includes('glb'))?.url || '';

  const metalFinish = useMemo((): MetalFinish => {
    const name = (product.metalName ?? '').toLowerCase();
    if (name.includes('rose')) return 'ROSE_GOLD';
    if (name.includes('platinum')) return 'PLATINUM';
    if (name.includes('white')) return 'WHITE_GOLD';
    return 'YELLOW_GOLD';
  }, [product.metalName]);

  return (
    <main className="lx-section ngc-pdp">
      <div className="lx-wrap">
        <nav className="lx-crumb" aria-label="Breadcrumb">
          {(product.breadcrumbs.length ? product.breadcrumbs : [{ name: 'Home', path: '/' }, { name: product.title, path: null }]).map((crumb, index) => (
            <span key={`${crumb.name}-${index}`}>
              {index > 0 ? <span aria-hidden="true"> / </span> : null}
              {crumb.path ? <Link href={crumb.path}>{crumb.name}</Link> : <span>{crumb.name}</span>}
            </span>
          ))}
        </nav>

        <ol className="ngc-stepper">
          <li className={product.kind !== 'setting' ? 'is-on' : ''}>1 Choose your gemstone</li>
          <li className={product.kind === 'setting' ? 'is-on' : ''}>2 Choose your setting</li>
          <li>3 Review your design</li>
        </ol>

        <div className="lx-pdp ngc-pdp__grid">
          <div className="lx-pdp__media ngc-gallery">
            <div className="ngc-gallery__tabs">
              <button type="button" className={tab === 'piece' ? 'is-on' : ''} onClick={() => { setTab('piece'); setActive(0); }}>
                {product.kind === 'setting' ? 'Setting' : 'Stone'} {photos.length}
              </button>
              <button type="button" className={tab === 'reports' ? 'is-on' : ''} onClick={() => { setTab('reports'); setActive(0); }}>
                Reports {reports.length}
              </button>
            </div>
            <div className="ngc-gallery__stage">
              {current?.kind === 'video' ? (
                <video src={src} controls poster={catalogImageSrc(product) || undefined} />
              ) : (
                <CatalogImage src={src} fallback={fallback} alt={product.title} />
              )}
            </div>
            <div className="ngc-thumbs">
              {images.map((media, index) => (
                <button
                  key={`${media.kind}-${index}`}
                  type="button"
                  className={index === active ? 'is-on' : ''}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  onClick={() => setActive(index)}
                >
                  <CatalogImage src={catalogImageSrc(product, media)} fallback={fallbackMediaUrl(media)} alt="" />
                </button>
              ))}
            </div>
            {videos.length > 0 ? (
              <div className="ngc-videos">
                {videos.slice(0, 3).map((video) => (
                  <figure key={video.cloudinaryPublicId ?? video.url ?? video.fileName}>
                    <video src={catalogImageSrc(product, video)} controls poster={catalogImageSrc(product) || undefined} />
                    <figcaption>{video.title}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            {spinSrc ? (
              <div className="ngc-spin">
                <p className="lx-kicker">360°</p>
                <video src={spinSrc} controls poster={catalogImageSrc(product) || undefined} />
              </div>
            ) : pattern && frames > 1 ? (
              <div className="ngc-spin">
                <p className="lx-kicker">360°</p>
                <CatalogImage src={spinFrameUrl(pattern, spin)} alt={`${product.title} 360 frame ${spin}`} />
                <input type="range" min={1} max={frames} value={spin} onChange={(e) => setSpin(Number(e.target.value))} aria-label="360 rotation" />
              </div>
            ) : null}
            {glb ? <ThreeDViewer glbUrl={glb} title={product.title} posterUrl={src} onTryArClick={() => setTryOn(true)} /> : (
              <div className="ngc-procedural">
                <p className="lx-kicker">3D preview</p>
                <JewelryConfiguratorCanvas
                  metal={metalFinish}
                  stone={{
                    shape: product.shape ?? 'Round',
                    carat: product.weightCt ?? 1,
                    color: product.color ?? '#C9A84C',
                  }}
                />
                <p className="lx-card__specs">
                  {hook.status === 'pending_service'
                    ? 'Procedural preview from shape, millimetres and colour. Image-to-3D service hook is ready when a model is approved.'
                    : 'Source GLB attached.'}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="lx-kicker">{product.availability}</p>
            <h1 className="lx-h2">{product.title}</h1>
            <p className="lx-card__specs">Item ID: {product.id}</p>
            {product.shipDaysMin ? (
              <p className="lx-lede">Est. ship: {product.shipDaysMin}–{product.shipDaysMax} days. Rush service may be available upon request.</p>
            ) : (
              <p className="lx-lede">This piece is available to ship now, typically within 1–3 business days. Rush service may be available upon request.</p>
            )}
            <p className="lx-card__specs">14 Day No Hassle Return · Free shipping</p>
            {product.kind === 'setting' ? (
              <p className="lx-pdp-price">Price calculated during the next step</p>
            ) : (
              <ProductActions item={item} />
            )}
            {product.pricePerCt ? (
              <p className="lx-card__specs">Per carat {formatMoney(product.pricePerCt, currency, rates)}</p>
            ) : null}
            {product.dyoEnabled ? (
              <p>
                <Link href={dyoHref} className="lx-btn lx-btn--ghost">
                  {product.kind === 'setting' ? 'Create jewellery with this setting' : 'Create jewellery with this stone'}
                </Link>
              </p>
            ) : null}
            <button type="button" className="lx-btn lx-btn--solid" onClick={() => setTryOn(true)}>
              Virtual try-on
            </button>
            <p className="lx-card__specs">{product.interestCount} collectors have asked after this piece.</p>
          </div>
        </div>

        <section className="ngc-details">
          <h2 className="lx-h3">Product details</h2>
          <dl className="lx-dossier">
            {(product.detailsTable.length > 0 ? product.detailsTable : [
              { label: 'Item ID', values: [product.id] },
              { label: 'Weight', values: [product.weightCt ? `${product.weightCt} Ct.` : ''] },
              { label: 'Color', values: [product.color ?? ''] },
              { label: 'Shape', values: [product.shape ?? ''] },
              { label: 'Origin', values: [product.origin ?? ''] },
              { label: 'Enhancements', values: [product.enhancement ?? ''] },
            ]).filter((row) => row.values.some(Boolean)).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.values.join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        {product.descriptionHtml ? (
          <section className="ngc-copy">
            <h2 className="lx-h3">Product description</h2>
            <div className="ngc-copy__body" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          </section>
        ) : null}

        <section className="ngc-trust">
          <h2 className="lx-h3">Quality, value & heart</h2>
          <ul>
            <li>100% natural gemstones</li>
            <li>Free shipping worldwide</li>
            <li>14 day return</li>
            <li>Supports local charities</li>
          </ul>
        </section>

        {related.length > 0 ? (
          <section>
            <h2 className="lx-h3">You may also like</h2>
            <div className="lx-grid">
              {related.slice(0, 4).map((card) => (
                <LuxuryProductCard key={card.id} product={card} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <VirtualTryOnModal
        open={tryOn}
        onClose={() => setTryOn(false)}
        metal={metalFinish}
        carat={product.weightCt ?? 1}
        title={`Try on · ${product.title}`}
        mode={mode}
        sharePath={`${product.path || `/product/${product.slug}`}?tryon=1`}
      />
    </main>
  );
}
