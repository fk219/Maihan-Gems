import type { Metadata } from 'next';
import type { GemstoneItem, MatchedPairItem } from '@/lib/mgh/fixtures';
import {
  getCatalogGemstoneBySlugOrId,
  getFreshVarietyLinks,
  getHomeCatalogGemstones,
  getHomeCatalogMatchedPairs,
} from '@/lib/mgh/adapters/catalog';
import { AppointmentSection } from '@/components/mgh/home/AppointmentSection';
import { DyoSection } from '@/components/mgh/home/DyoSection';
import { GemologistSection } from '@/components/mgh/home/GemologistSection';
import { HomeHero } from '@/components/mgh/home/HomeHero';
import { PiecesSection, type HomePiece } from '@/components/mgh/home/PiecesSection';
import { ProvenanceRail } from '@/components/mgh/home/ProvenanceRail';
import { RecordSection } from '@/components/mgh/home/RecordSection';
import { RoomsSection } from '@/components/mgh/home/RoomsSection';
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

/** One record per variety for the provenance rail; a real row or nothing. */
function selectRailRecords(
  stones: readonly GemstoneItem[],
  varieties: readonly { slug: string }[],
): GemstoneItem[] {
  const selected: GemstoneItem[] = [];
  const seen = new Set<string>();
  for (const variety of varieties) {
    const record = stones.find((stone) => stone.varietySlug === variety.slug);
    if (record && !seen.has(record.id)) {
      selected.push(record);
      seen.add(record.id);
    }
    if (selected.length === 8) break;
  }
  if (selected.length > 0) return selected;
  return stones.slice(0, 8);
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
    });
  }
  if (verdant) {
    pieces.push({
      name: verdant.name,
      spec: pieceSpec(verdant.variety, verdant.carat),
      price: formatUsd(verdant.price),
      href: `/products/${verdant.slug}`,
    });
  }
  if (pair) {
    pieces.push({
      name: pair.name,
      spec: `${formatCarat(pair.totalCarat)} tw · Matched pair`,
      price: formatUsd(pair.price),
      href: '/pairs',
    });
  }

  return pieces;
}

export default async function HomePage() {
  const [allStones, pairs, varieties, elysian, verdant] = await Promise.all([
    getHomeCatalogGemstones(),
    getHomeCatalogMatchedPairs(),
    getFreshVarietyLinks(),
    getCatalogGemstoneBySlugOrId('elysian-ring'),
    getCatalogGemstoneBySlugOrId('verdant-drop'),
  ]);

  const leadStone = allStones.reduce<GemstoneItem | null>(
    (lead, stone) => (lead === null || stone.price > lead.price ? stone : lead),
    null,
  );
  const railRecords = selectRailRecords(allStones, varieties);
  const pieces = buildPieces(elysian, verdant, pairs[0] ?? null);

  return (
    <div className="mh6-home">
      <HomeHero />
      <ProvenanceRail records={railRecords} />
      <RecordSection stone={leadStone} />
      <RoomsSection />
      <PiecesSection pieces={pieces} />
      <DyoSection />
      <GemologistSection />
      <AppointmentSection />
    </div>
  );
}
