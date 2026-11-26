import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CollectionExplorer } from '@/components/mgh/catalog/CollectionExplorer';
import { getCatalogColourCollection } from '@/lib/mgh/adapters/catalog';
import { SITE_URL } from '@/lib/mgh/site-url';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ colourSlug: string }>;
}): Promise<Metadata> {
  const { colourSlug } = await params;
  const colour = await getCatalogColourCollection(colourSlug);
  if (!colour) {
    return {
      title: 'Colour Collection Not Found',
      description: 'The requested spectral hue collection does not exist.',
    };
  }
  return {
    title: `${colour.meta.name} Gemstones Collection`,
    description: colour.meta.lede,
    alternates: {
      canonical: `${SITE_URL}/colour/${colour.meta.slug}`,
    },
  };
}

export default async function ColourCollectionPage({
  params,
}: {
  params: Promise<{ colourSlug: string }>;
}) {
  const { colourSlug } = await params;
  const colour = await getCatalogColourCollection(colourSlug);
  if (!colour) {
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
          <li aria-current="page" className="font-medium text-[#121211]">{colour.meta.name}</li>
        </ol>
      </nav>

      <div className="border-b border-[#E4DFD5] pb-6 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="h-9 w-9 rounded-full shrink-0 border border-black/15"
          style={{ backgroundColor: colour.meta.hex }}
        />
        <div>
          <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em] text-[#9A7B2C]">
            SPECTRAL HUE · {colour.stones.length} LOTS
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[#121211]">
            {colour.meta.name}
          </h1>
        </div>
      </div>

      <CollectionExplorer initialItems={colour.stones} lockedColourSlug={colour.meta.slug} />
    </div>
  );
}
