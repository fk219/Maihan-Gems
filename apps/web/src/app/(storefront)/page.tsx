import type { Metadata } from 'next';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { VARIETIES_META } from '@/lib/mgh/fixtures';
import { getCatalogGemstoneBySlugOrId } from '@/lib/mgh/adapters/catalog';
import { formatCarat, formatUsd } from '@/components/mgh/home/format';
import { HeroSection } from '@/components/mgh/home/v12/HeroSection';
import { VarietyMarquee, type Variety } from '@/components/mgh/home/v12/VarietyMarquee';
import { JewellerySection, type Piece } from '@/components/mgh/home/v12/JewellerySection';
import { AboutSection } from '@/components/mgh/home/v12/AboutSection';
import { DesignYourOwnSection } from '@/components/mgh/home/v12/DesignYourOwnSection';
import { GemologistSection } from '@/components/mgh/home/v12/GemologistSection';
import { TryOnSection } from '@/components/mgh/home/v12/TryOnSection';
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
 * The eight stone varieties in the catalogue taxonomy, each paired with the
 * catalogue's representative photograph of that variety. `rings` and
 * `necklaces` are jewellery kinds rather than stones and are excluded.
 *
 * The photographs are illustrative stand-ins, not the record of any lot; the
 * band says so and the site-wide demo badge carries the same notice. The ruby
 * plate is the committed Wikimedia ruby specimen in `media/stock/` because the
 * representative ruby render is the only one shot on a white field, which
 * breaks the dark-fields band. Its caption and credit are in
 * docs/IMAGE_CREDITS.md.
 */
const VARIETY_PHOTO: Readonly<Record<string, { src: string; alt: string }>> = {
  tanzanite: {
    src: '/media/stone-tanzanite.jpg',
    alt: 'A faceted violet-blue tanzanite on black velvet',
  },
  sapphire: {
    src: '/media/stone-sapphire.jpg',
    alt: 'A cushion-cut royal blue sapphire on black velvet',
  },
  emerald: {
    src: '/media/stone-emerald.jpg',
    alt: 'An emerald-cut green emerald on black velvet',
  },
  ruby: {
    src: '/media/stock/ruby.jpg',
    alt: 'Red ruby crystals in white calcite on a black field',
  },
  spinel: {
    src: '/media/stone-spinel-pink.jpg',
    alt: 'A cushion-cut neon pink spinel on black velvet',
  },
  tourmaline: {
    src: '/media/stone-rubellite.jpg',
    alt: 'A cushion-cut rubellite tourmaline, deep pink, on black velvet',
  },
  alexandrite: {
    src: '/media/stone-alexandrite.jpg',
    alt: 'An oval alexandrite shifting between green and violet',
  },
  tsavorite: {
    src: '/media/stone-tsavorite.jpg',
    alt: 'A faceted vivid green tsavorite garnet on black velvet',
  },
};

const STONE_VARIETY_SLUGS: ReadonlySet<string> = new Set(Object.keys(VARIETY_PHOTO));

function buildVarieties(): Variety[] {
  return VARIETIES_META.filter((variety) => STONE_VARIETY_SLUGS.has(variety.slug)).map(
    (variety) => {
      const photo = VARIETY_PHOTO[variety.slug]!;
      const mohs = variety.mohsHardness.replace(/\s*[\u2013\u2014]\s*/g, '-');
      return {
        slug: variety.slug,
        name: variety.name,
        fact: `${variety.name} \u00b7 ${mohs} Mohs`,
        href: `/varieties/${variety.slug}`,
        image: photo.src,
        alt: photo.alt,
      };
    },
  );
}

/**
 * The two finished pieces the fixture ledger holds. Each card uses the
 * record's own photograph and the record's own carat and price; nothing is
 * computed from weight and no piece is invented.
 */
function toPiece(record: GemstoneItem | null): Piece | null {
  if (record === null) return null;
  const image = record.images[0];
  if (image === undefined) return null;
  return {
    id: record.id,
    name: record.name,
    fact: `${formatCarat(record.carat)} · ${formatUsd(record.price)}`,
    href: `/products/${record.slug}`,
    image,
    alt: `${record.name}, photographed for its catalogue record`,
  };
}

/**
 * The homepage order is the client brief's: hero, the variety band, jewellery,
 * the house, design your own, the gemologist, try-on, the closing invitation.
 * The footer comes from the storefront layout. Every section carries one idea
 * and one action; the cards carry a photograph, one fact line and one link.
 */
export default async function HomePage() {
  const [elysian, verdant] = await Promise.all([
    getCatalogGemstoneBySlugOrId('elysian-ring'),
    getCatalogGemstoneBySlugOrId('verdant-drop'),
  ]);

  const pieces = [toPiece(elysian), toPiece(verdant)].filter((piece): piece is Piece => piece !== null);

  return (
    <div className="mh12-home">
      <HeroSection />
      <VarietyMarquee varieties={buildVarieties()} />
      <JewellerySection pieces={pieces} />
      <AboutSection />
      <DesignYourOwnSection />
      <GemologistSection />
      <TryOnSection />
      <ClosingSection />
    </div>
  );
}
