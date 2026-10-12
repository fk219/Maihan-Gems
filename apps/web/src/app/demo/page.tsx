/**
 * Demo storefront page - standalone without layout dependencies
 */
import Link from 'next/link';
import { getStorefrontRepository } from '../../lib/db';

export const dynamic = 'force-dynamic';

export default async function DemoStorefrontPage() {
  const repo = getStorefrontRepository();
  
  const gemstones = await repo.listProducts({ kind: 'gemstone', limit: 8 });
  const jewelry = await repo.listProducts({ kind: 'jewelry', limit: 6 });
  const settings = await repo.listProducts({ kind: 'setting', limit: 6 });

  return (
    <html lang="en">
      <head>
        <title>Maihan Gems - Natural Gemstones & Fine Jewelry</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FAFAF8]" style={{
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {/* Header */}
        <header className="border-b border-[#E5E5E5] bg-[#08121E] text-white">
          <div className="container mx-auto px-6 py-8">
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="text-5xl font-light tracking-wide">
              Maihan Gems
            </h1>
            <p className="mt-2 text-sm font-light tracking-wide text-[#C9A84C]">
              Natural Untreated Gemstones & Master Atelier Settings
            </p>
          </div>
        </header>

        {/* Hero */}
        <section className="bg-gradient-to-b from-[#0D1B2A] to-[#08121E] py-20 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="text-6xl font-light">
              Discover Earth's Finest
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-gray-300">
              Explore our curated collection of 100% natural, earth-mined gemstones,
              each certified for authenticity and accompanied by master atelier settings
              crafted in 18K gold and platinum.
            </p>
          </div>
        </section>

        {/* Featured Gemstones */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="mb-8 text-4xl font-light text-[#08121E]">
              Featured Gemstones
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {gemstones.map((product: any) => (
                <div key={product.id} className="group overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-xl">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-24 w-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="text-xl font-medium text-[#08121E]">
                      {product.title}
                    </h3>
                    {product.stone_type && (
                      <p className="mt-1 text-sm text-[#64748B]">{product.stone_type}</p>
                    )}
                    {product.weight_ct && (
                      <p className="mt-1 text-sm font-medium text-[#475569]">{product.weight_ct} ct</p>
                    )}
                    {product.regional_price > 0 && (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace' }} className="mt-3 text-lg font-medium text-[#C9A84C]">
                        {product.regional_currency} {product.regional_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Settings */}
        <section className="bg-[#0D1B2A] py-16 text-white">
          <div className="container mx-auto px-6">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="mb-8 text-4xl font-light">
              Master Atelier Settings
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {settings.map((product: any) => (
                <div key={product.id} className="overflow-hidden rounded-lg bg-[#08121E] shadow-lg">
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-600">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="text-xl font-medium">
                      {product.title}
                    </h3>
                    {product.setting_type && (
                      <p className="mt-1 text-sm text-[#94A3B8]">{product.setting_type}</p>
                    )}
                    {product.regional_price > 0 && (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace' }} className="mt-3 text-base font-medium text-[#C9A84C]">
                        {product.regional_currency} {product.regional_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Jewelry */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="mb-8 text-4xl font-light text-[#08121E]">
              Fine Jewelry
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {jewelry.map((product: any) => (
                <div key={product.id} className="overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md">
                  <div className="aspect-square bg-gray-50">
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 style={{ fontFamily: 'Cormorant Garamond, serif' }} className="text-xl font-medium text-[#08121E]">
                      {product.title}
                    </h3>
                    {product.jewelry_type && (
                      <p className="mt-1 text-sm text-[#64748B]">{product.jewelry_type}</p>
                    )}
                    {product.regional_price > 0 && (
                      <p style={{ fontFamily: 'JetBrains Mono, monospace' }} className="mt-3 text-lg font-medium text-[#C9A84C]">
                        {product.regional_currency} {product.regional_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[#E5E5E5] bg-[#08121E] py-12 text-white">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm font-light text-gray-400">
              © 2026 Maihan Gems. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
