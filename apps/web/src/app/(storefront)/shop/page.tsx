/**
 * Simple shop page using the new storefront schema
 */
import Link from 'next/link';
import { getStorefrontRepository } from '@/lib/db';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { kind?: string; region?: string };
}) {
  const repo = getStorefrontRepository();
  const kind = searchParams.kind as 'gemstone' | 'jewelry' | 'setting' | undefined;
  const regionCode = searchParams.region || 'USD';

  const products = await repo.listProducts({
    kind,
    limit: 24,
    region_code: regionCode,
  });

  const regions = await repo.getRegions();

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="font-serif text-4xl text-[#08121E]">Maihan Gems</h1>
          <p className="mt-2 font-sans text-sm text-[#64748B]">
            Natural Untreated Gemstones & Master Atelier Settings
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/shop"
            className={`rounded-md px-4 py-2 font-sans text-sm ${
              !kind
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#64748B] hover:bg-gray-50'
            }`}
          >
            All Products
          </Link>
          <Link
            href="/shop?kind=gemstone"
            className={`rounded-md px-4 py-2 font-sans text-sm ${
              kind === 'gemstone'
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#64748B] hover:bg-gray-50'
            }`}
          >
            Gemstones
          </Link>
          <Link
            href="/shop?kind=jewelry"
            className={`rounded-md px-4 py-2 font-sans text-sm ${
              kind === 'jewelry'
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#64748B] hover:bg-gray-50'
            }`}
          >
            Jewelry
          </Link>
          <Link
            href="/shop?kind=setting"
            className={`rounded-md px-4 py-2 font-sans text-sm ${
              kind === 'setting'
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#64748B] hover:bg-gray-50'
            }`}
          >
            Settings
          </Link>

          {/* Region selector */}
          <select
            className="ml-auto rounded-md border border-gray-300 px-4 py-2 font-sans text-sm"
            defaultValue={regionCode}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set('region', e.target.value);
              window.location.href = url.toString();
            }}
          >
            {regions.map((region: any) => (
              <option key={region.code} value={region.code}>
                {region.name} ({region.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product: any) => (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="group overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-square bg-gray-100">
                {product.primary_image ? (
                  <img
                    src={product.primary_image}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-serif text-lg text-[#08121E] group-hover:text-[#C9A84C]">
                  {product.title}
                </h3>
                {product.description && (
                  <p className="mt-1 line-clamp-2 font-sans text-sm text-[#64748B]">
                    {product.description}
                  </p>
                )}
                {product.regional_price > 0 && (
                  <p className="mt-2 font-mono text-base font-medium text-[#C9A84C]">
                    {product.regional_currency} {product.regional_price.toLocaleString()}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  {product.stone_type && (
                    <span className="inline-block rounded bg-[#F1F5F9] px-2 py-1 font-sans text-xs text-[#64748B]">
                      {product.stone_type}
                    </span>
                  )}
                  {product.jewelry_type && (
                    <span className="inline-block rounded bg-[#F1F5F9] px-2 py-1 font-sans text-xs text-[#64748B]">
                      {product.jewelry_type}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {products.length === 0 && (
          <div className="py-12 text-center">
            <p className="font-sans text-lg text-[#64748B]">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
