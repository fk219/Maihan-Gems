import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVarietyBySlug } from '@/lib/mgh/adapters/catalog';
import { CollectionExplorer } from '@/components/mgh/catalog/CollectionExplorer';
import { SITE_URL } from '@/lib/mgh/site-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ varietySlug: string }>;
}): Promise<Metadata> {
  const { varietySlug } = await params;
  const variety = await getVarietyBySlug(varietySlug);
  if (!variety) {
    return {
      title: 'Variety Not Found',
      description: 'The requested gemstone variety does not exist in our mineralogical index.',
    };
  }
  return {
    title: `${variety.meta.name} Gemstones Collection`,
    description: variety.meta.lede,
    alternates: {
      canonical: `${SITE_URL}/varieties/${variety.meta.slug}`,
    },
  };
}

export default async function VarietyCollectionPage({
  params,
}: {
  params: Promise<{ varietySlug: string }>;
}) {
  const { varietySlug } = await params;
  const variety = await getVarietyBySlug(varietySlug);
  if (!variety) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/varieties" className="hover:text-[#121211]">Varieties</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">{variety.meta.name}</li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#9A7B2C]">
            {variety.meta.mineralSpecies.toUpperCase()} · {variety.stones.length} LOTS
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#121211]">
            {variety.meta.name}
          </h1>
        </div>
        <div className="flex items-center gap-6 text-xs font-[family-name:var(--font-mono)] text-[#4E4C47]">
          <span>RI {variety.meta.refractiveIndexRange}</span>
          <span>Mohs {variety.meta.mohsHardness}</span>
        </div>
      </div>

      <CollectionExplorer initialItems={variety.stones} lockedVarietySlug={variety.meta.slug} />
    </div>
  );
}
