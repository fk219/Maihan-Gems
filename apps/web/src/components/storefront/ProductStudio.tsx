'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { NgcMediaItem, NgcProduct } from '../../lib/ngc/types.js';
import { catalogImageSrc, fallbackMediaUrl, galleryImages, galleryPoster, galleryReports, galleryVideos, spinFrameUrl, spinMedia } from '../../lib/ngc/media.js';
import { gemHexFor } from '../../lib/ngc/colors.js';
import { displayTitle } from '../../lib/ngc/title.js';
import { imageTo3dHook } from '../../lib/ngc/compat.js';
import { cardToAtelier } from '../../lib/atelier-item.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { formatMoney } from '../../lib/currency.js';
import { VirtualTryOnModal } from '../webar/VirtualTryOnModal.js';
import { ThreeDViewer } from '../webar/ThreeDViewer.js';
import { JewelryConfiguratorCanvas, type MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { CatalogImage } from './CatalogImage.js';
import { ProductActions } from './ProductActions.js';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/motion-accordion.js';
import { AnimatedBackground } from '../ui/animated-background.js';
import { GalleryCarousel } from '../ui/gallery-carousel.js';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs.js';
import { TextEffect } from '../ui/text-effect.js';
import { ReadMore } from './ReadMore.js';
import { useStorefront } from './StorefrontProvider.js';

function specRows(
  spec: {
    stoneType: string | null;
    weightCt: number | null;
    lengthMm: number | null;
    widthMm: number | null;
    depthMm: number | null;
    color: string | null;
    colorIntensity: string | null;
    clarity: string | null;
    shape: string | null;
    cut: string | null;
    cuttingStyle: string | null;
    enhancement: string | null;
    origin: string | null;
    lab: string | null;
    pricePerCt: number | null;
  },
  prefix: string,
  perCarat: string,
): Array<{ label: string; values: string[] }> {
  const dim = [spec.lengthMm, spec.widthMm, spec.depthMm].filter((n) => n != null && n > 0).join(' / ');
  return [
    { label: prefix ? `${prefix} stone type` : 'Stone type', values: [spec.stoneType ?? ''] },
    { label: prefix ? `${prefix} dimensions (MM)` : 'Dimensions (MM)', values: [dim] },
    { label: prefix ? `${prefix} weight` : 'Weight', values: [spec.weightCt ? `${spec.weightCt} Ct.` : ''] },
    { label: prefix ? `${prefix} color` : 'Color', values: [spec.color ?? ''] },
    { label: prefix ? `${prefix} color intensity` : 'Color intensity', values: [spec.colorIntensity ?? ''] },
    { label: prefix ? `${prefix} clarity` : 'Clarity', values: [spec.clarity ?? ''] },
    { label: prefix ? `${prefix} shape` : 'Shape', values: [spec.shape ?? ''] },
    { label: prefix ? `${prefix} cut` : 'Cut', values: [spec.cut ?? ''] },
    { label: prefix ? `${prefix} cutting style` : 'Cutting style', values: [spec.cuttingStyle ?? ''] },
    { label: prefix ? `${prefix} enhancements` : 'Enhancements', values: [spec.enhancement ?? ''] },
    { label: prefix ? `${prefix} origin` : 'Origin', values: [spec.origin ?? ''] },
    { label: prefix ? `${prefix} lab` : 'Lab', values: [spec.lab ?? ''] },
    { label: prefix ? `${prefix} per carat` : 'Per carat price', values: [perCarat] },
  ];
}

function detailRows(product: NgcProduct, perCarat: string): Array<{ label: string; values: readonly string[] }> {
  if (product.detailsTable.length > 1) {
    return product.detailsTable.filter((row) => row.values.some(Boolean));
  }
  const rows: Array<{ label: string; values: string[] }> = [
    { label: 'Item ID', values: [product.id] },
    { label: 'Metal', values: [product.metalName ?? ''] },
    { label: 'Style', values: [...product.styles] },
  ];
  if (product.centerStones.length > 0) {
    rows.push(...specRows(product.centerStones[0]!, 'Center', perCarat));
  } else {
    rows.push(...specRows(product, '', perCarat));
  }
  if (product.sideStones[0]) {
    rows.push(...specRows(product.sideStones[0], 'Side', ''));
  }
  return rows.filter((row) => row.values.some(Boolean));
}

function tryOnMode(product: NgcProduct): 'hand' | 'ear' | 'neck' | 'room' {
  if (product.kind === 'stone_pair' || product.settingType === 'earring' || product.jewelryType === 'earring') return 'ear';
  if (product.jewelryType === 'pendant' || product.jewelryType === 'necklace' || product.settingType === 'pendant_necklace') return 'neck';
  if (product.kind === 'loose_stone') return 'room';
  return 'hand';
}

type SlideKind = 'photo' | 'video' | 'spin' | 'report' | 'preview3d';

interface GallerySlide {
  readonly id: string;
  readonly kind: SlideKind;
  readonly label: string;
  readonly media?: NgcMediaItem;
  readonly poster?: string;
}

function ZoomStage({
  src,
  fallback,
  alt,
}: {
  src: string;
  fallback: string;
  alt: string;
}) {
  const [origin, setOrigin] = useState('50% 50%');
  const [zoom, setZoom] = useState(false);
  return (
    <div
      className={`ngc-gallery__stage${zoom ? ' is-zoom' : ''}`}
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * 100;
        const y = ((event.clientY - box.top) / box.height) * 100;
        setOrigin(`${x}% ${y}%`);
      }}
    >
      <div className="ngc-gallery__zoom" style={{ transformOrigin: origin }}>
        <CatalogImage src={src} fallback={fallback} alt={alt} />
      </div>
    </div>
  );
}

function sanitizeDescriptionHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<(iframe|object|embed|form|meta|link|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed|form|meta|link|style)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(['"]?)\s*javascript:[^'"\s>]*\2/gi, '$1="#"');
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
  const spinItem = spinMedia(product);
  const [tab, setTab] = useState<'piece' | 'reports' | 'preview3d'>('piece');
  const [active, setActive] = useState(0);
  const [tryOn, setTryOn] = useState(false);
  const [spin, setSpin] = useState(1);

  const pieceSlides = useMemo<GallerySlide[]>(() => {
    const slides: GallerySlide[] = photos.map((media, index) => ({
      id: `photo-${index}`,
      kind: 'photo',
      label: media.kind === 'lifestyle_image' ? 'Lifestyle' : 'Photo',
      media,
      poster: galleryPoster(product, media),
    }));
    videos.forEach((media, index) => {
      slides.push({
        id: `video-${index}`,
        kind: 'video',
        label: media.title || 'Video',
        media,
        poster: galleryPoster(product, media),
      });
    });
    if (spinItem) {
      slides.push({
        id: 'spin',
        kind: 'spin',
        label: '360°',
        media: spinItem,
        poster: galleryPoster(product, spinItem),
      });
    }
    return slides;
  }, [photos, videos, spinItem, product]);

  const reportSlides = useMemo<GallerySlide[]>(
    () =>
      reports.map((media, index) => ({
        id: `report-${index}`,
        kind: 'report',
        label: media.title || (media.kind === 'certificate' ? 'Certificate' : media.kind.replace(/_/g, ' ')),
        media,
        poster: galleryPoster(product, media),
      })),
    [reports, product],
  );

  const slides = tab === 'piece' ? pieceSlides : tab === 'reports' ? reportSlides : [];
  const current = slides[active] ?? slides[0];
  const src = current?.media ? catalogImageSrc(product, current.media) : catalogImageSrc(product);
  const fallback = current?.media ? fallbackMediaUrl(current.media) : '';
  const mounted = product.kind === 'setting' || product.kind === 'jewelry' || product.kind === 'dyo_composite';
  const title = displayTitle(product);
  const item = cardToAtelier({
    id: product.id,
    sku: product.id,
    slug: product.slug,
    title,
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
  const spinSrc = spinItem ? catalogImageSrc(product, spinItem) : '';
  const glb = product.threeDFilePath || product.media.find((m) => m.kind.includes('glb'))?.url || '';

  const metalFinish = useMemo((): MetalFinish => {
    const name = (product.metalName ?? '').toLowerCase();
    if (name.includes('rose')) return 'ROSE_GOLD';
    if (name.includes('platinum')) return 'PLATINUM';
    if (name.includes('white')) return 'WHITE_GOLD';
    return 'YELLOW_GOLD';
  }, [product.metalName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tryon') === '1') setTryOn(true);
  }, []);

  const pieceLabel = product.kind === 'setting' ? 'Setting' : product.kind === 'jewelry' || product.kind === 'dyo_composite' ? 'Jewellery' : 'Stone';

  return (
    <main className="lx-section ngc-pdp">
      <div className="lx-wrap lx-wrap--wide">
        <nav className="lx-crumb" aria-label="Breadcrumb">
          {(product.breadcrumbs.length ? product.breadcrumbs : [{ name: 'Home', path: '/' }, { name: product.title, path: null }]).map((crumb, index) => (
            <span key={`${crumb.name}-${index}`}>
              {index > 0 ? <span aria-hidden="true"> / </span> : null}
              {crumb.path ? <Link href={crumb.path}>{crumb.name}</Link> : <span>{crumb.name === product.id || crumb.name === product.title ? title : crumb.name}</span>}
            </span>
          ))}
        </nav>

        <ol className="ngc-stepper">
          <li className={product.kind !== 'setting' ? 'is-on' : ''}>1 Choose your gemstone</li>
          <li className={product.kind === 'setting' ? 'is-on' : ''}>2 Choose your setting</li>
          <li>3 Review your design</li>
        </ol>

        <div className="lx-pdp ngc-pdp__grid">
          <div className="ngc-gallery">
            <Tabs value={tab} onValueChange={(value) => { setTab(value as typeof tab); setActive(0); }}>
            <TabsList variant="line" className="ngc-gallery__tabs">
              <AnimatedBackground
                defaultValue={tab}
                className="border-b border-[#16110c]"
                transition={{ duration: 0.3, bounce: 0 }}
                onValueChange={(id) => {
                  if (id === 'piece' || id === 'preview3d' || id === 'reports') {
                    setTab(id);
                    setActive(0);
                  }
                }}
              >
                <TabsTrigger value="piece" data-id="piece">{pieceLabel} {pieceSlides.length}</TabsTrigger>
                <TabsTrigger value="preview3d" data-id="preview3d">3D</TabsTrigger>
                <TabsTrigger value="reports" data-id="reports">Reports {reportSlides.length}</TabsTrigger>
              </AnimatedBackground>
            </TabsList>
            <div className={`ngc-gallery__layout${tab === 'preview3d' ? ' ngc-gallery__layout--solo' : ''}`}>
              {tab !== 'preview3d' ? (
                <div className="ngc-thumbs">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      className={index === active ? 'is-on' : ''}
                      aria-label={`${slide.label} ${index + 1} of ${slides.length}`}
                      onClick={() => setActive(index)}
                    >
                      {slide.kind === 'video' ? <span className="ngc-thumbs__play" aria-hidden="true" /> : null}
                      {slide.kind === 'spin' ? <span className="ngc-thumbs__badge">360°</span> : null}
                      {slide.kind === 'report' ? <span className="ngc-thumbs__badge">Cert</span> : null}
                      <CatalogImage
                        src={slide.poster ?? (slide.media ? catalogImageSrc(product, slide.media) : '')}
                        fallback={slide.kind === 'video' || slide.kind === 'spin' ? '' : slide.media ? fallbackMediaUrl(slide.media) : ''}
                        alt=""
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              {tab === 'preview3d' ? (
                <div className="ngc-gallery__stage ngc-gallery__stage--3d">
                  {glb && mounted ? (
                    <ThreeDViewer glbUrl={glb} title={title} posterUrl={src} onTryArClick={() => setTryOn(true)} />
                  ) : (
                    <JewelryConfiguratorCanvas
                      mode={mounted ? 'mounted' : 'stone'}
                      metal={metalFinish}
                      stone={{
                        shape: product.shape ?? product.centerStones[0]?.shape ?? 'Round',
                        carat: product.weightCt ?? product.centerStones[0]?.weightCt ?? 1,
                        color: gemHexFor(product.color ?? product.centerStones[0]?.color, product.stoneType ?? product.centerStones[0]?.stoneType),
                        lengthMm: product.lengthMm ?? product.centerStones[0]?.lengthMm,
                        widthMm: product.widthMm ?? product.centerStones[0]?.widthMm,
                        stoneType: product.stoneType ?? product.centerStones[0]?.stoneType,
                      }}
                      label={mounted ? `3D preview · ${title}` : `Loose ${product.stoneType ?? 'gemstone'} in 3D`}
                    />
                  )}
                </div>
              ) : current?.kind === 'video' ? (
                <div className="ngc-gallery__stage">
                  <video src={src} controls poster={current.poster || catalogImageSrc(product) || undefined} />
                </div>
              ) : current?.kind === 'spin' && spinSrc ? (
                <div className="ngc-gallery__stage ngc-gallery__stage--spin">
                  <video src={spinSrc} controls poster={current.poster || catalogImageSrc(product) || undefined} />
                </div>
              ) : current?.kind === 'spin' && pattern && frames > 1 ? (
                <div className="ngc-gallery__stage ngc-gallery__stage--spin">
                  <CatalogImage src={spinFrameUrl(pattern, spin)} alt={`${title} 360 frame ${spin}`} />
                  <input type="range" min={1} max={frames} value={spin} onChange={(e) => setSpin(Number(e.target.value))} aria-label="360 rotation" />
                </div>
              ) : (
                <ZoomStage src={src} fallback={fallback} alt={title} />
              )}
            </div>
            {tab === 'preview3d' ? (
              <p className="lx-card__specs">
                {mounted
                  ? hook.status === 'pending_service'
                    ? 'Procedural mounting from metal, millimetres and colour. Image-to-3D service hook is ready when a model is approved.'
                    : 'Source GLB attached.'
                  : 'Loose stone preview from colour, cut and millimetres. It rotates on the studio canvas.'}
              </p>
            ) : null}
            </Tabs>
          </div>

          <div className="ngc-pdp__buy">
            <p className="lx-kicker">{product.availability}</p>
            <TextEffect as="h1" per="word" preset="fade" speedReveal={0.8} className="lx-h2">{title}</TextEffect>
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
            <section className="ngc-details">
              <h2 className="lx-h3">Product details</h2>
              <dl className="lx-dossier">
                {detailRows(product, product.pricePerCt ? formatMoney(product.pricePerCt, currency, rates) : '').map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.values.join(' · ')}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {mode === 'hand' ? (
              <button type="button" className="lx-btn lx-btn--solid" onClick={() => setTryOn(true)}>
                Virtual try-on
              </button>
            ) : (
              <p className="lx-card__specs">Camera try-on is available for rings. This piece stays in the studio view.</p>
            )}
            <p className="lx-card__specs">{product.interestCount} collectors have asked after this piece.</p>
          </div>
        </div>

        <Accordion className="border-t border-[#d4a437]/30">
          <AccordionItem value="specs" className="border-b border-[#d4a437]/30">
            <AccordionTrigger className="flex w-full items-center justify-between py-4 text-left font-[family-name:var(--font-serif)] text-2xl">
              Specifications
            </AccordionTrigger>
            <AccordionContent>
              <dl className="lx-dossier">
                {detailRows(product, product.pricePerCt ? formatMoney(product.pricePerCt, currency, rates) : '').map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.values.join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
          {product.descriptionHtml ? (
            <AccordionItem value="description" className="border-b border-[#d4a437]/30">
              <AccordionTrigger className="flex w-full items-center justify-between py-4 text-left font-[family-name:var(--font-serif)] text-2xl">Product description</AccordionTrigger>
              <AccordionContent>
                <ReadMore html={sanitizeDescriptionHtml(product.descriptionHtml)} />
              </AccordionContent>
            </AccordionItem>
          ) : null}
          <AccordionItem value="shipping" className="border-b border-[#d4a437]/30">
            <AccordionTrigger className="flex w-full items-center justify-between py-4 text-left font-[family-name:var(--font-serif)] text-2xl">Shipping and returns</AccordionTrigger>
            <AccordionContent>
              <p>
                Free shipping worldwide. Loose gemstones and ready-to-ship jewellery may be returned within 14 days.
                Custom pieces follow the same window unless they are made to order.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {reports.length > 0 ? (
          <section className="ngc-copy ngc-certificate">
            <h2 className="lx-h3">Certificate & reports</h2>
            <div className="ngc-certificate__grid">
              {reports.map((report, index) => (
                <figure key={`${report.kind}-${index}`}>
                  <CatalogImage src={catalogImageSrc(product, report)} fallback={fallbackMediaUrl(report)} alt={report.title || 'Certificate'} />
                  <figcaption>{report.title || report.kind.replace(/_/g, ' ')}</figcaption>
                </figure>
              ))}
            </div>
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
            <GalleryCarousel
              slides={related.slice(0, 6).map((card) => ({
                title: card.title,
                button: 'View the piece',
                src: card.imageUrl || '/media/stone-sapphire.jpg',
                href: `/product/${card.slug}`,
              }))}
            />
          </section>
        ) : null}
      </div>
      <VirtualTryOnModal
        open={tryOn}
        onClose={() => setTryOn(false)}
        metal={metalFinish}
        carat={product.weightCt ?? 1}
        title={`Try on · ${title}`}
        mode={mode === 'hand' ? 'hand' : mode}
        stoneColor={gemHexFor(product.color, product.stoneType)}
        sharePath={`/product/${product.id}?tryon=1`}
      />
    </main>
  );
}
