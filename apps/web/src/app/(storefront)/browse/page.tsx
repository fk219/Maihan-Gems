/**
 * Browse/Search page for the storefront
 * Lists products with filters and search
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Browse Gemstones & Jewelry | Maihan Gems',
  description: 'Discover our collection of natural gemstones, fine jewelry, and designer settings',
};

// Placeholder data - will be replaced with database queries
const PLACEHOLDER_PRODUCTS = [
  {
    id: '1',
    slug: 'sap-001',
    title: '3.42 Carat Vivid Royal Blue Ceylon Sapphire',
    kind: 'gemstone',
    stone_type: 'Sapphire',
    carat: 3.42,
    shape: 'Cushion',
    origin: 'Ceylon, Sri Lanka',
    treatment: 'Natural Unheated',
    price: 48500,
    currency: 'USD',
    image: '/assets/gemstones/sapphire.svg',
  },
  {
    id: '2',
    slug: 'rub-001',
    title: '2.94 Carat Pigeon Blood Burmese Ruby',
    kind: 'gemstone',
    stone_type: 'Ruby',
    carat: 2.94,
    shape: 'Oval',
    origin: 'Myanmar',
    treatment: 'Natural Unheated',
    price: 87000,
    currency: 'USD',
    image: '/assets/gemstones/ruby.svg',
  },
  {
    id: '3',
    slug: 'eme-001',
    title: '4.23 Carat Colombian Emerald',
    kind: 'gemstone',
    stone_type: 'Emerald',
    carat: 4.23,
    shape: 'Emerald Cut',
    origin: 'Colombia',
    treatment: 'Traditional Oil',
    price: 38500,
    currency: 'USD',
    image: '/assets/gemstones/emerald.svg',
  },
];

const STONE_TYPES = ['All', 'Sapphire', 'Ruby', 'Emerald', 'Diamond', 'Paraiba', 'Spinel', 'Tanzanite'];
const SHAPES = ['All', 'Round', 'Oval', 'Cushion', 'Emerald Cut', 'Pear', 'Marquise'];
const TREATMENTS = ['All', 'Unheated', 'Heated', 'Traditional'];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stone?: string; shape?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const stoneFilter = params.stone || 'All';
  // const shapeFilter = params.shape || 'All'; // TODO: Use for filtering

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-white border-b border-[rgba(201,168,76,0.15)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A867E] block mb-2">
            Natural Gemstones & Fine Jewelry
          </span>
          <h1 className="font-serif text-4xl font-medium text-[#1A1A18] mb-4">
            Explore Our <span className="text-[#C9A84C]">Collection</span>
          </h1>
          
          {/* Search Bar */}
          <form action="/browse" method="GET" className="max-w-2xl">
            <div className="relative flex items-center bg-white rounded-[12px] border border-[rgba(201,168,76,0.25)] shadow-[0_4px_12px_-2px_rgba(201,168,76,0.08)] focus-within:border-[#C9A84C] focus-within:ring-2 focus-within:ring-[rgba(201,168,76,0.2)] transition-all">
              <div className="pl-4 text-[#C9A84C]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by stone type, shape, color, or SKU..."
                className="w-full py-3 pl-3 pr-28 text-[14px] text-[#1A1A18] placeholder-[#8A867E] bg-transparent outline-none font-sans"
              />
              <button 
                type="submit" 
                className="absolute right-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white bg-[#08121E] hover:bg-[#C9A84C] rounded-[8px] transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] p-6 sticky top-24">
              <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A4740] mb-6">
                Refine Search
              </h2>

              {/* Stone Type Filter */}
              <div className="mb-6">
                <h3 className="font-sans text-[13px] font-semibold text-[#1A1A18] mb-3">Stone Type</h3>
                <div className="space-y-2">
                  {STONE_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="stone"
                        value={type}
                        defaultChecked={type === stoneFilter}
                        className="w-4 h-4 text-[#C9A84C] focus:ring-[#C9A84C]"
                      />
                      <span className="text-[13px] text-[#4A4740] group-hover:text-[#1A1A18]">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Shape Filter */}
              <div className="mb-6">
                <h3 className="font-sans text-[13px] font-semibold text-[#1A1A18] mb-3">Shape</h3>
                <div className="space-y-2">
                  {SHAPES.map((shape) => (
                    <label key={shape} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="shape"
                        value={shape}
                        className="w-4 h-4 text-[#C9A84C] focus:ring-[#C9A84C]"
                      />
                      <span className="text-[13px] text-[#4A4740] group-hover:text-[#1A1A18]">{shape}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Treatment Filter */}
              <div className="mb-6">
                <h3 className="font-sans text-[13px] font-semibold text-[#1A1A18] mb-3">Treatment</h3>
                <div className="space-y-2">
                  {TREATMENTS.map((treatment) => (
                    <label key={treatment} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="treatment"
                        value={treatment}
                        className="w-4 h-4 text-[#C9A84C] focus:ring-[#C9A84C]"
                      />
                      <span className="text-[13px] text-[#4A4740] group-hover:text-[#1A1A18]">{treatment}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-sans text-[13px] font-semibold text-[#1A1A18] mb-3">Price Range (USD)</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full px-3 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full px-3 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] outline-none"
                  />
                </div>
              </div>

              <button className="w-full px-4 py-2.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 transition-all">
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[13px] text-[#4A4740]">
                Showing <span className="font-semibold text-[#1A1A18]">{PLACEHOLDER_PRODUCTS.length}</span> products
              </p>
              <select className="px-4 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] text-[#4A4740] focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] outline-none">
                <option>Sort by: Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Carat: Low to High</option>
                <option>Carat: High to Low</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {PLACEHOLDER_PRODUCTS.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  className="group bg-white border border-[rgba(201,168,76,0.12)] rounded-[12px] overflow-hidden transition-all duration-500 hover:border-[rgba(201,168,76,0.35)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(139,105,20,0.08)] flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-[#F7F7F5] overflow-hidden flex items-center justify-center p-6">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="max-h-full max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A867E]">
                      1-of-1
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A867E] block mb-1">
                        {product.origin} · {product.treatment}
                      </span>
                      <h3 className="font-serif text-xl font-medium text-[#1A1A18] leading-tight group-hover:text-[#C9A84C] transition-colors">
                        {product.title}
                      </h3>
                      <div className="mt-2.5 flex items-center gap-2 text-[12px] text-[#4A4740]">
                        <span>{product.shape}</span>
                        <span aria-hidden="true" className="text-[rgba(201,168,76,0.5)]">·</span>
                        <span className="font-mono tabular-nums">{product.carat} ct</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[rgba(0,0,0,0.05)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A867E] block">
                          Price (Inc. VAT)
                        </span>
                        <span className="font-mono text-base font-semibold text-[#1A1A18] tabular-nums">
                          {product.currency} {product.price.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C9A84C] group-hover:text-[#8B6914] flex items-center gap-1 transition-colors">
                        View <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-12">
              <button className="px-4 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] text-[#4A4740] hover:border-[#C9A84C] hover:text-[#1A1A18] transition-colors">
                Previous
              </button>
              <button className="px-4 py-2 bg-[#C9A84C] text-white rounded-[8px] text-[13px] font-semibold">
                1
              </button>
              <button className="px-4 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] text-[#4A4740] hover:border-[#C9A84C] hover:text-[#1A1A18] transition-colors">
                2
              </button>
              <button className="px-4 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] text-[#4A4740] hover:border-[#C9A84C] hover:text-[#1A1A18] transition-colors">
                3
              </button>
              <button className="px-4 py-2 border border-[rgba(201,168,76,0.25)] rounded-[8px] text-[13px] text-[#4A4740] hover:border-[#C9A84C] hover:text-[#1A1A18] transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
