import type { Metadata } from 'next';
import type { GemstoneItem, MatchedPairItem } from '@/lib/mgh/fixtures';
import {
  getCatalogGemstoneBySlugOrId,
  getFreshSettingsCatalog,
  getFreshVarietyLinks,
  getHomeCatalogGemstones,
  getHomeCatalogMatchedPairs,
} from '@/lib/mgh/adapters/catalog';
import { AboutSection } from '@/components/mgh/home/AboutSection';
import { AppointmentSection } from '@/components/mgh/home/AppointmentSection';
import { DyoSection } from '@/components/mgh/home/DyoSection';
import { GemologistSection } from '@/components/mgh/home/GemologistSection';
import { HomeHero } from '@/components/mgh/home/HomeHero';
import { JewellerySection } from '@/components/mgh/home/JewellerySection';
import type { HomePiece } from '@/components/mgh/home/PiecesSection';
import { ProvenanceRail } from '@/components/mgh/home/ProvenanceRail';
import { TryOnSection } from '@/components/mgh/home/TryOnSection';
import { formatCarat, formatUsd } from '@/components/mgh/home/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Natural Gemstones & Fine Jewelry',
  description:
    'Shop natural loose gemstones, matched earring pairs, and custom gold and platinum jewelry.',
  alternates: {
    canonical: '/',
  },
};

/** Variety slugs that describe a jewellery form, not a gemstone variety. */
const JEWELLERY_FORMS = new Set(['rings', 'necklaces', 'earrings', 'bracelets', 'pendants']);

/**
 * One record per gemstone variety, for the marquee. The taxonomy decides the
 * order; a variety with no record is omitted rather than filled. If the
 * taxonomy and the loaded rows share no slug, the rail renders nothing — an
 * honest empty state, not a stand-in.
 */
function selectRailRecords(
  stones: readonly GemstoneItem[],
  varieties: readonly { slug: string }[],
): GemstoneItem[] {
  const selected: GemstoneItem[] = [];
  const seen = new Set<string>();
  for (const variety of varieties) {
    if (JEWELLERY_FORMS.has(variety.slug)) continue;
    const record = stones.find((stone) => stone.varietySlug === variety.slug);
    if (record && !seen.has(record.id)) {
      selected.push(record);
      seen.add(record.id);
    }
  }
  return selected;
}

function pieceSpec(variety: string, carat: number): string {
  const form = variety === 'Rings' ? 'Ring' : variety === 'Necklaces' ? 'Necklace' : variety;
  return `${formatCarat(carat)} · ${form}`;
}

function buildPieces(
  elysian: GemstoneItem | null,
  verdant: GemstoneItem | null,
  pair: MatchedPairItem | null,
): HomePiece[] {
  const pieces: HomePiece[] = [];

  if (elysian) {
    pieces.push({
      name: elysian.name,
      spec: pieceSpec(elysian.variety, elysian.carat),
      price: formatUsd(elysian.price),
      href: `/products/${elysian.slug}`,
      image: elysian.images[0] ?? null,
    });
  }
  if (verdant) {
    pieces.push({
      name: verdant.name,
      spec: pieceSpec(verdant.variety, verdant.carat),
      price: formatUsd(verdant.price),
      href: `/products/${verdant.slug}`,
      image: verdant.images[0] ?? null,
    });
  }
  if (pair) {
    pieces.push({
      name: pair.name,
      spec: `${formatCarat(pair.totalCarat)} tw · Matched pair`,
      price: formatUsd(pair.price),
      href: '/pairs',
      image: pair.images[0] ?? null,
    });
  }

  return pieces;
}

export default async function HomePage() {
  const [allStones, pairs, varieties, settings, elysian, verdant] = await Promise.all([
    getHomeCatalogGemstones(),
    getHomeCatalogMatchedPairs(),
    getFreshVarietyLinks(),
    getFreshSettingsCatalog(),
    getCatalogGemstoneBySlugOrId('elysian-ring'),
    getCatalogGemstoneBySlugOrId('verdant-drop'),
  ]);

  const railRecords = selectRailRecords(allStones, varieties);
  const pieces = buildPieces(elysian, verdant, pairs[0] ?? null);
  // The atelier band shows the ring the commission is built around; when the
  // row is absent the editorial plate stands in, and no product caption is
  // printed beside it.
  const atelierImage = elysian?.images[0] ?? '/mgh/images/elysian-ring.jpg';
  const atelierHref = elysian === null ? null : `/products/${elysian.slug}`;
  // The jewellery plate is a different record from the atelier ring, so the
  // page never shows the same photograph twice.
  const jewelleryFigure =
    pieces.find((piece) => piece.image !== null && piece.href !== atelierHref) ??
    pieces.find((piece) => piece.image !== null) ??
    null;

  return (
    <div className="mh6-home">
      <HomeHero />
      <ProvenanceRail records={railRecords} />
      <DyoSection image={atelierImage} />
      <JewellerySection pieces={pieces} settings={settings} figure={jewelleryFigure} />
      <AboutSection />
      <GemologistSection />
      <TryOnSection />
      <AppointmentSection />
    </div>
  );
}
