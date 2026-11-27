import type { Metadata } from 'next';
import type { GemstoneItem, MatchedPairItem } from '@/lib/mgh/fixtures';
import {
  getCatalogGemstoneBySlugOrId,
  getHomeCatalogGemstones,
  getHomeCatalogMatchedPairs,
} from '@/lib/mgh/adapters/catalog';
import { HomeHero } from '@/components/mgh/home/HomeHero';
import type { HomePiece } from '@/components/mgh/home/PiecesSection';
import { formatCarat, formatUsd } from '@/components/mgh/home/format';
import { StoneMarquee } from '@/components/mgh/home/v11/StoneMarquee';
import { CollectionSection } from '@/components/mgh/home/v11/CollectionSection';
import { AtelierSection } from '@/components/mgh/home/v11/AtelierSection';
import { DesignYourOwnSection } from '@/components/mgh/home/v11/DesignYourOwnSection';
import { CertificateSection } from '@/components/mgh/home/v11/CertificateSection';
import { GemologistSection } from '@/components/mgh/home/v11/GemologistSection';
import { TryOnSection } from '@/components/mgh/home/v11/TryOnSection';
import { ClosingSection } from '@/components/mgh/home/v11/ClosingSection';
import '@/styles/home-v11.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems: Natural Gemstones and Fine Jewelry',
  description:
    'Maihan Gems is a gemstone house: natural loose stones, matched pairs and atelier mountings, each published with the record behind it.',
  alternates: {
    canonical: '/',
  },
};

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
  const [allStones, pairs, elysian, verdant] = await Promise.all([
    getHomeCatalogGemstones(),
    getHomeCatalogMatchedPairs(),
    getCatalogGemstoneBySlugOrId('elysian-ring'),
    getCatalogGemstoneBySlugOrId('verdant-drop'),
  ]);

  const pieces = buildPieces(elysian, verdant, pairs[0] ?? null);
  const atelierPlate =
    pieces.find((piece) => piece.image !== null && piece.image.length > 0) ?? null;

  return (
    <div className="mh6-home v11-home">
      <HomeHero />
      <StoneMarquee records={allStones} />
      <CollectionSection />
      <AtelierSection piece={atelierPlate} />
      <DesignYourOwnSection />
      <CertificateSection record={elysian} />
      <GemologistSection />
      <TryOnSection />
      <ClosingSection />
    </div>
  );
}
