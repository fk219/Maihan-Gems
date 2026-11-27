import type { Metadata } from 'next';
import type { GemstoneItem, MatchedPairItem } from '@/lib/mgh/fixtures';
import {
  getCatalogGemstoneBySlugOrId,
  getFreshSettingsCatalog,
  getFreshVarietyLinks,
  getHomeCatalogGemstones,
  getHomeCatalogMatchedPairs,
} from '@/lib/mgh/adapters/catalog';
import { HomeHero } from '@/components/mgh/home/HomeHero';
import type { HomePiece } from '@/components/mgh/home/PiecesSection';
import { formatCarat, formatUsd } from '@/components/mgh/home/format';
import { AtelierSection } from '@/components/mgh/home/v9/AtelierSection';
import { CertificateSection } from '@/components/mgh/home/v9/CertificateSection';
import { ClosingSection } from '@/components/mgh/home/v9/ClosingSection';
import { ConfiguratorSection } from '@/components/mgh/home/v9/ConfiguratorSection';
import { GemologistSection } from '@/components/mgh/home/v9/GemologistSection';
import { StoneIndexSection } from '@/components/mgh/home/v9/StoneIndexSection';
import { VendorSection } from '@/components/mgh/home/v9/VendorSection';
import '@/styles/home-v9.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems: Natural Gemstones and Fine Jewelry',
  description:
    'Maihan Gems is a gemstone house: natural loose stones, matched pairs and atelier mountings, each published with the record behind it.',
  alternates: {
    canonical: '/',
  },
};

/** Variety slugs that describe a jewellery form, not a gemstone variety. */
const JEWELLERY_FORMS = new Set(['rings', 'necklaces', 'earrings', 'bracelets', 'pendants']);

/**
 * One record per gemstone variety, for the index. The taxonomy decides the
 * order; a variety with no record is omitted rather than filled. If the
 * taxonomy and the loaded rows share no slug, the section renders nothing:
 * an honest empty state, not a stand-in.
 */
function selectIndexRecords(
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

  const indexRecords = selectIndexRecords(allStones, varieties);
  const pieces = buildPieces(elysian, verdant, pairs[0] ?? null);

  return (
    <div className="mh6-home v9-home">
      <HomeHero />
      <StoneIndexSection records={indexRecords} />
      <ConfiguratorSection />
      <GemologistSection />
      <CertificateSection record={elysian} />
      <AtelierSection pieces={pieces} settings={settings} />
      <VendorSection />
      <ClosingSection />
    </div>
  );
}
