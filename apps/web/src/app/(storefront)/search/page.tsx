import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { ProductCard } from '@/components/mgh/ProductCard';
import { searchCatalogGemstones } from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  return {
    title: query ? `Search “${query}” | Maihan Gems` : 'Search the Vault | Maihan Gems',
    description: 'Search the live Maihan Gems catalogue by reference, variety, origin or cut.',
    alternates: { canonical: `${SITE_URL}/search` },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || '';
  const stones = query ? await searchCatalogGemstones(query, 24) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">Search</li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 space-y-4">
        <div>
          <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C]">THE VAULT LEDGER</p>
          <h1 className="mt-1 font-[family-name:var(--font-eb-garamond)] text-4xl font-normal text-[#121211]">
            {query ? `Results for “${query}”` : 'Search the vault'}
          </h1>
          <p className="mt-2 text-sm font-[family-name:var(--font-eb-garamond)] text-[#4E4C47]">
            {query ? `${stones.length} live result${stones.length === 1 ? '' : 's'}` : 'Search by reference, variety, origin or cut.'}
          </p>
        </div>
        <form action="/search" method="GET" role="search" className="flex max-w-xl items-center gap-2 rounded-full border border-[#E4DFD5] bg-white p-1.5 pl-4 focus-within:border-[#D4AF37]">
          <Search className="h-4 w-4 shrink-0 text-[#9A7B2C]" />
          <label htmlFor="vault-search-q" className="sr-only">Search the vault</label>
          <input id="vault-search-q" name="q" defaultValue={query} placeholder="Search reference, variety, origin or shape…" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#121211] placeholder:text-[#A39E93] focus:outline-none" />
          <button type="submit" className="rounded-full px-5 py-2.5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] font-semibold gold-gradient-cta">Search</button>
        </form>
      </div>

      {!query ? (
        <div className="rounded-sm border border-[#E4DFD5] bg-white p-10 text-center space-y-4">
          <Search className="mx-auto h-6 w-6 text-[#9A7B2C]" />
          <p className="text-sm text-[#4E4C47]">Start with a stone, a colour, an origin or a cut — or ask the concierge in plain language.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/browse" className="rounded-sm px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta">Browse the vault</Link>
            <Link href="/concierge" className="rounded-sm border border-[#E4DFD5] px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#4E4C47] hover:border-[#D4AF37]/60">Ask the concierge</Link>
          </div>
        </div>
      ) : stones.length === 0 ? (
        <div className="rounded-sm border border-[#E4DFD5] bg-white p-10 text-center space-y-3">
          <p className="text-sm text-[#4E4C47]">No stones in the vault match “{query}”.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/concierge?q=${encodeURIComponent(query)}`} className="rounded-sm px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta">Ask the concierge</Link>
            <Link href="/browse" className="rounded-sm border border-[#E4DFD5] px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#4E4C47] hover:border-[#D4AF37]/60">Browse all stones</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {stones.map((stone) => <ProductCard key={stone.id} stone={stone} />)}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-[#E4DFD5] pt-5 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
        <Link href="/browse" className="hover:text-[#9A7B2C]">Browse the vault</Link>
        <Link href="/concierge" className="hover:text-[#9A7B2C]">Ask the concierge</Link>
        <Link href="/design-your-own" className="hover:text-[#9A7B2C]">Design your own</Link>
      </div>
    </div>
  );
}
