import type { Metadata } from 'next';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { VARIETIES_META } from '@/lib/mgh/fixtures';
import { getHomeCatalogGemstones } from '@/lib/mgh/adapters/catalog';

import { HeroSection } from '@/components/mgh/home/v14/HeroSection';
import { VarietyBand, type Variety } from '@/components/mgh/home/v14/VarietyBand';
import { CollectionSection, type Stone } from '@/components/mgh/home/v14/CollectionSection';
import { JewellerySection, type Piece } from '@/components/mgh/home/v14/JewellerySection';
import { AboutSection } from '@/components/mgh/home/v14/AboutSection';
import { DesignYourOwnSection } from '@/components/mgh/home/v14/DesignYourOwnSection';
import { GemologistSection } from '@/components/mgh/home/v14/GemologistSection';
import { TryOnSection } from '@/components/mgh/home/v14/TryOnSection';
import { CertificateSection } from '@/components/mgh/home/v14/CertificateSection';
import { ClosingSection } from '@/components/mgh/home/v14/ClosingSection';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems: Natural Gemstones and Fine Jewelry',
  description:
    'Maihan Gems is a gemstone house: natural loose stones, matched pairs and atelier mountings, each published with the record behind it.',
  alternates: {
    canonical: '/',
  },
};

/**
 * The eight stone varieties in the catalogue taxonomy, each paired with the
 * catalogue's representative photograph of that variety. `rings` and
 * `necklaces` are jewellery kinds rather than stones and are excluded.
 *
 * The photographs are illustrative stand-ins, not the record of any lot; the
 * band says so in its own line and the site-wide demo badge carries the same
 * notice. The ruby plate is the committed Wikimedia ruby specimen in
 * `media/stock/` because the representative ruby render is the only one shot
 * on a white field, which breaks the dark-fields band. Its caption and credit
 * are in docs/IMAGE_CREDITS.md.
 */
const VARIETY_PHOTO: Readonly<Record<string, string>> = {
  tanzanite: '/media/stone-tanzanite.jpg',
  sapphire: '/media/stone-sapphire.jpg',
  emerald: '/media/stone-emerald.jpg',
  ruby: '/media/stock/ruby.jpg',
  spinel: '/media/stone-spinel-pink.jpg',
  tourmaline: '/media/stone-rubellite.jpg',
  alexandrite: '/media/stone-alexandrite.jpg',
  tsavorite: '/media/stone-tsavorite.jpg',
};

const STONE_VARIETY_SLUGS: ReadonlySet<string> = new Set(Object.keys(VARIETY_PHOTO));

/**
 * The collection's own plates. These are the second set of committed
 * illustrative photographs (media/stock), chosen so the tray does not repeat
 * the exact frame the variety band uses. Each is a photograph of the variety,
 * not of the pictured record's stone, and the tray says so in its own line.
 */
const COLLECTION_PHOTO: Readonly<Record<string, { src: string; width: number; height: number }>> = {
  tanzanite: { src: '/media/stock/tanzanite.jpg', width: 1444, height: 1141 },
  sapphire: { src: '/media/stock/sapphire.jpg', width: 3000, height: 4000 },
  emerald: { src: '/media/stock/emerald.jpg', width: 1920, height: 1590 },
  ruby: { src: '/media/stock/ruby.jpg', width: 1920, height: 1275 },
  spinel: { src: '/media/stock/spinel.jpg', width: 2240, height: 1632 },
};

/** "6.5 – 7.0" from the taxonomy, with the dash normalised for the card. */
function mohs(value: string): string {
  return value.replace(/\s*[\u2013\u2014-]\s*/g, '-');
}

function buildVarieties(): Variety[] {
  return VARIETIES_META.filter((variety) => STONE_VARIETY_SLUGS.has(variety.slug)).map(
    (variety) => ({
      slug: variety.slug,
      name: variety.name,
      fact: `${variety.mineralSpecies} · ${mohs(variety.mohsHardness)} Mohs`,
      href: `/varieties/${variety.slug}`,
      image: VARIETY_PHOTO[variety.slug]!,
    }),
  );
}

function isStone(record: GemstoneItem): boolean {
  return STONE_VARIETY_SLUGS.has(record.varietySlug);
}

function toStone(record: GemstoneItem): Stone {
  const plate = COLLECTION_PHOTO[record.varietySlug];
  return {
    id: record.id,
    variety: record.variety,
    name: record.name,
    href: `/products/${record.slug}`,
    image: plate?.src ?? record.images[0]!,
    width: plate?.width ?? 1200,
    height: plate?.height ?? 1800,
    carat: record.carat,
    price: record.price,
  };
}

function toPiece(record: GemstoneItem): Piece {
  return {
    id: record.id,
    name: record.name,
    href: `/products/${record.slug}`,
    image: record.images[0]!,
    carat: record.carat,
    price: record.price,
  };
}

/** One record per variety, so the collection shows three stones, not three sizes of one. */
function firstOfEachVariety(records: readonly GemstoneItem[]): GemstoneItem[] {
  const seen = new Set<string>();
  const out: GemstoneItem[] = [];
  for (const record of records) {
    if (seen.has(record.varietySlug)) continue;
    seen.add(record.varietySlug);
    out.push(record);
  }
  return out;
}

/**
 * The homepage order is the client brief's: hero, the variety band, the
 * collection, jewellery, the house, design your own, the gemologist, try-on,
 * certificate intelligence, the closing invitation. The footer comes from the
 * storefront layout.
 *
 * Every section carries one idea and one action. Cards are the sections'
 * content: each is one link to one record. Only records that hold a photograph
 * are rendered, so the page never borrows a neighbour's image.
 */
export default async function HomePage() {
  const pool = await getHomeCatalogGemstones();

  const illustrated = pool.filter((record) => record.images.length > 0);
  const stones = firstOfEachVariety(illustrated.filter(isStone)).slice(0, 3);

  const jewellery = illustrated.filter(
    (record) => record.varietySlug === 'rings' || record.varietySlug === 'necklaces',
  );
  // The pendant photograph is the dark one, so it leads the navy section.
  const pieces = [
    ...jewellery.filter((record) => record.varietySlug === 'necklaces'),
    ...jewellery.filter((record) => record.varietySlug === 'rings'),
  ].slice(0, 2);

  const certificate =
    stones.find((record) => (record.evidence.reportNumber ?? '').trim().length > 0) ?? null;

  return (
    <div className="mh14-home">
      <HeroSection />
      <VarietyBand varieties={buildVarieties()} />
      <CollectionSection stones={stones.map(toStone)} />
      <JewellerySection pieces={pieces.map(toPiece)} />
      <AboutSection />
      <DesignYourOwnSection />
      <GemologistSection />
      <TryOnSection />
      <CertificateSection record={certificate} />
      <ClosingSection />
    </div>
  );
}
