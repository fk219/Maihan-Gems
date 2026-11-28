import type { Metadata } from 'next';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import {
  getCatalogGemstoneBySlugOrId,
  getHomeCatalogGemstones,
} from '@/lib/mgh/adapters/catalog';
import { formatCarat, formatUsd } from '@/components/mgh/home/format';
import type { ProductCardData } from '@/components/mgh/home/v12/ProductCard';
import { HeroSection } from '@/components/mgh/home/v12/HeroSection';
import { CategoryRail } from '@/components/mgh/home/v12/CategoryRail';
import { StoneRecordSection } from '@/components/mgh/home/v12/StoneRecordSection';
import { FeaturedPieces } from '@/components/mgh/home/v12/FeaturedPieces';
import { DesignYourOwnSection } from '@/components/mgh/home/v12/DesignYourOwnSection';
import { RecordSection } from '@/components/mgh/home/v12/RecordSection';
import { AiStrip } from '@/components/mgh/home/v12/AiStrip';
import { ServiceStrip } from '@/components/mgh/home/v12/ServiceStrip';
import { ClosingSection } from '@/components/mgh/home/v12/ClosingSection';

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
 * Jewellery kinds are not stones: a card reading "Fine Rings · Botswana"
 * would describe a finished piece as a gem. Everything else in the pool is a
 * loose stone (or a variety the live taxonomy adds later).
 */
const JEWELLERY_VARIETY_SLUGS: ReadonlySet<string> = new Set([
  'rings',
  'necklaces',
  'earrings',
  'bracelets',
  'pendants',
]);

/**
 * A record's title can repeat the weight the spec line already carries
 * ("1.31 ct Violetish Blue Tanzanite"). The card shows the weight once, so a
 * leading weight phrase is dropped from the display name only — no field is
 * altered, and a title without one is printed as it is.
 */
function displayName(name: string): string {
  const stripped = name.replace(/^\d+(?:\.\d+)?\s*ct\s+/i, '').trim();
  return stripped.length > 0 ? stripped : name;
}

function cardSpec(stone: GemstoneItem): string {
  const parts: string[] = [];
  if (Number.isFinite(stone.carat) && stone.carat > 0) parts.push(formatCarat(stone.carat));
  if (stone.variety.trim().length > 0) parts.push(stone.variety.trim());
  if (stone.origin.trim().length > 0) parts.push(stone.origin.trim());
  return parts.join(' · ');
}

function cardEvidence(stone: GemstoneItem): string {
  const report = stone.evidence.reportNumber?.trim();
  return report !== undefined && report.length > 0
    ? `Report · ${report}`
    : 'Evidence not recorded';
}

/**
 * Committed illustrative photographs by variety (docs/IMAGE_CREDITS.md).
 * The demo records' own image fields point at finished-jewellery photographs;
 * printing a necklace above "1.31 ct Tanzanite" would present illustrative
 * stock as the object. A stone card uses the committed variety photograph
 * instead, and the section states that photography is illustrative. A variety
 * without one falls back to the record's own image, then to no image at all.
 */
const VARIETY_ILLUSTRATION: Readonly<Record<string, string>> = {
  tanzanite: '/media/stock/tanzanite.jpg',
  sapphire: '/media/stock/sapphire.jpg',
  emerald: '/media/stock/emerald.jpg',
  ruby: '/media/stock/ruby.jpg',
  spinel: '/media/stock/spinel.jpg',
  opal: '/media/stock/opal.jpg',
  amethyst: '/media/stock/amethyst.jpg',
};

function toCard(stone: GemstoneItem): ProductCardData {
  return {
    id: stone.id,
    name: displayName(stone.name),
    spec: cardSpec(stone),
    price: stone.price > 0 ? formatUsd(stone.price) : 'On request',
    evidence: cardEvidence(stone),
    href: `/products/${stone.slug}`,
    image: VARIETY_ILLUSTRATION[stone.varietySlug] ?? stone.images[0] ?? null,
  };
}

/**
 * Four priced records, one per variety where the pool allows it, so the row
 * reads as a catalogue rather than four crops of the same stone. Unpriced
 * records stay out of the priced row; the card would read "On request" but a
 * price row of four requests is not the commerce layer the page needs.
 */
function buildFeaturedCards(stones: readonly GemstoneItem[]): ProductCardData[] {
  const priced = stones.filter((stone) => stone.price > 0);
  const chosen: GemstoneItem[] = [];
  const seen = new Set<string>();

  for (const stone of priced) {
    if (chosen.length === 4) break;
    if (JEWELLERY_VARIETY_SLUGS.has(stone.varietySlug)) continue;
    if (seen.has(stone.varietySlug)) continue;
    seen.add(stone.varietySlug);
    chosen.push(stone);
  }

  for (const stone of priced) {
    if (chosen.length === 4) break;
    if (!chosen.includes(stone)) chosen.push(stone);
  }

  return chosen.slice(0, 4).map(toCard);
}

/**
 * The record used for the certificate split. The curated record's photograph
 * is the object the record names, so it is preferred; the pool's first
 * reported record is the fallback, and no record means the section does not
 * render.
 */
function pickRecord(
  stones: readonly GemstoneItem[],
  curated: GemstoneItem | null,
): GemstoneItem | null {
  const curatedReport = curated?.evidence.reportNumber?.trim() ?? '';
  if (curated !== null && curatedReport.length > 0) return curated;
  return (
    stones.find((stone) => (stone.evidence.reportNumber?.trim() ?? '').length > 0) ??
    curated ??
    null
  );
}

/**
 * The homepage order is the brand spec's: hero → category rail → stone and
 * record → four priced cards → design your own → record/certificate → AI
 * strip → service strip → closing. The footer comes from the storefront
 * layout.
 */
export default async function HomePage() {
  const [stones, elysian] = await Promise.all([
    getHomeCatalogGemstones(),
    getCatalogGemstoneBySlugOrId('elysian-ring'),
  ]);

  const cards = buildFeaturedCards(stones);
  const record = pickRecord(stones, elysian);

  return (
    <div className="mh12-home">
      <HeroSection />
      <CategoryRail />
      <StoneRecordSection />
      <FeaturedPieces cards={cards} />
      <DesignYourOwnSection />
      <RecordSection record={record} />
      <AiStrip />
      <ServiceStrip />
      <ClosingSection />
    </div>
  );
}
