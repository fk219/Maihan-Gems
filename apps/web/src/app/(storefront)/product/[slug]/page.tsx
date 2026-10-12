/**
 * Product Detail Page
 * Shows gemstone, jewelry, or setting details with gallery, specs, and purchase options
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Product ${slug} | Maihan Gems`,
    description: 'Natural gemstone details',
  };
}

// Placeholder product data
const PLACEHOLDER_PRODUCT = {
  id: '1',
  slug: 'sap-001',
  title: '3.42 Carat Vivid Royal Blue Ceylon Sapphire',
  kind: 'gemstone',
  stone_type: 'Sapphire',
  variety: 'Ceylon Blue',
  origin_type: 'Natural',
  carat: 3.42,
  shape: 'Cushion',
  cut: 'Faceted Brilliant',
  color: 'Royal Blue',
  intensity: 'Vivid',
  clarity: 'VVS',
  treatment: 'No Enhancement (Unheated)',
  origin_country: 'Sri Lanka',
  origin_region: 'Ceylon',
  length_mm: 9.12,
  width_mm: 7.84,
  depth_mm: 5.23,
  price: 48500,
  currency: 'USD',
  certificate_lab: 'GRS',
  certificate_number: 'GRS2024-042315',
  description: 'An exceptional natural Ceylon sapphire displaying a vivid royal blue color with exceptional clarity. This cushion-cut gemstone exhibits the classic "cornflower blue" hue that Ceylon sapphires are renowned for worldwide. Completely untreated and unheated, preserving its natural beauty as formed deep within the Earth.',
  images: [
    '/assets/gemstones/sapphire.svg',
    '/assets/gemstones/sapphire.svg',
    '/assets/gemstones/sapphire.svg',
  ],
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: _slug } = await params;
  
  const product = PLACEHOLDER_PRODUCT; // TODO: Fetch from database by slug

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px] text-[#8A867E] mb-8">
          <Link href="/" className="hover:text-[#C9A84C] transition-colors">Home</Link>
          <span>→</span>
          <Link href="/browse" className="hover:text-[#C9A84C] transition-colors">Browse</Link>
          <span>→</span>
          <span className="text-[#1A1A18]">{product.stone_type}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          <div>
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] overflow-hidden mb-4">
              <div className="aspect-square bg-[#F7F7F5] flex items-center justify-center p-12">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
            
            {/* Thumbnail Grid */}
            <div className="grid grid-cols-3 gap-4">
              {product.images.slice(0, 3).map((img, i) => (
                <button
                  key={i}
                  className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] overflow-hidden hover:border-[#C9A84C] transition-colors"
                >
                  <div className="aspect-square bg-[#F7F7F5] flex items-center justify-center p-4">
                    <img src={img} alt={`View ${i + 1}`} className="max-w-full max-h-full object-contain" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            {/* Header */}
            <div className="mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A84C] block mb-2">
                {product.origin_country} · {product.origin_type}
              </span>
              <h1 className="font-serif text-4xl font-medium text-[#1A1A18] mb-4 leading-tight">
                {product.title}
              </h1>
              <div className="flex items-center gap-3 text-[13px] text-[#4A4740]">
                <span>{product.shape} Cut</span>
                <span aria-hidden="true" className="text-[rgba(201,168,76,0.5)]">·</span>
                <span className="font-mono tabular-nums">{product.length_mm} × {product.width_mm} × {product.depth_mm} mm</span>
                <span aria-hidden="true" className="text-[rgba(201,168,76,0.5)]">·</span>
                <span className="font-semibold text-[#C9A84C]">{product.certificate_lab} Certified</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 mb-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#8A867E] block mb-1">Price (Inc. VAT)</span>
                  <span className="font-mono text-3xl font-bold text-[#1A1A18] tabular-nums">
                    {product.currency} {product.price.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#8A867E] block mb-1">Per Carat</span>
                  <span className="font-mono text-lg font-semibold text-[#4A4740] tabular-nums">
                    {product.currency} {Math.round(product.price / product.carat).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button className="flex-1 px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 hover:-translate-y-0.5 transition-all">
                  Add to Cart
                </button>
                <button className="px-6 py-3 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1A1A18] bg-white border border-[rgba(201,168,76,0.3)] rounded-[12px] hover:bg-[rgba(201,168,76,0.04)] hover:border-[#C9A84C] transition-all">
                  ♥
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-3">
                Description
              </h2>
              <p className="text-[15px] text-[#4A4740] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Specifications */}
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 mb-6">
              <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-4">
                Specifications
              </h2>
              <dl className="space-y-3">
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Stone Type</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.stone_type}</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Variety</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.variety}</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Carat Weight</dt>
                  <dd className="font-mono font-medium text-[#1A1A18] tabular-nums">{product.carat} ct</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Shape & Cut</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.shape} · {product.cut}</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Color</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.color} ({product.intensity})</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Clarity</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.clarity}</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Treatment</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.treatment}</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Origin</dt>
                  <dd className="font-medium text-[#1A1A18]">{product.origin_region}, {product.origin_country}</dd>
                </div>
                <div className="flex justify-between text-[14px]">
                  <dt className="text-[#8A867E]">Dimensions</dt>
                  <dd className="font-mono font-medium text-[#1A1A18] tabular-nums">
                    {product.length_mm} × {product.width_mm} × {product.depth_mm} mm
                  </dd>
                </div>
              </dl>
            </div>

            {/* Certificate */}
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-[8px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.3)] flex items-center justify-center text-[#C9A84C] flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-sans text-[14px] font-semibold text-[#1A1A18] mb-1">
                    {product.certificate_lab} Certified
                  </h3>
                  <p className="text-[13px] text-[#4A4740] mb-2">
                    Certificate Number: <span className="font-mono font-medium text-[#1A1A18]">{product.certificate_number}</span>
                  </p>
                  <Link
                    href="#"
                    className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C] hover:text-[#8B6914] transition-colors inline-flex items-center gap-1"
                  >
                    View Certificate <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-3xl font-medium text-[#1A1A18]">
              Similar <span className="text-[#C9A84C]">Gemstones</span>
            </h2>
            <Link
              href="/browse"
              className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C] hover:text-[#8B6914] transition-colors"
            >
              View All →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Placeholder for related products - would be fetched from database */}
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-4">
              <div className="aspect-square bg-[#F7F7F5] rounded-[8px] mb-3"></div>
              <p className="text-[13px] text-[#4A4740] mb-1">Similar stone</p>
              <p className="font-mono text-[14px] font-semibold text-[#1A1A18]">USD 42,000</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
