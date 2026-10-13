import { listProducts, type ProductListFilters } from './storefront-data.js';
import { displayStoneName, parseCollectionSlug } from './search-parser.js';
import type { StorefrontCard } from './storefront-types.js';

export interface CollectionView {
  readonly kicker: string;
  readonly title: string;
  readonly lede: string;
  readonly stoneType: string;
  readonly stoneSlug: string;
  readonly products: StorefrontCard[];
}

export async function loadCollectionView(rawSlug: string | undefined): Promise<CollectionView | null> {
  const parsed = parseCollectionSlug(rawSlug);
  if (!parsed) return null;

  const name = displayStoneName(parsed.stoneType);
  const titleContains = name.replace('Paraíba ', 'Paraiba ');

  if (parsed.mode === 'pairs') {
    return {
      kicker: 'Matched pairs',
      title: `${name} pairs`,
      lede: `Pairs kept together for colour, cut and size.`,
      stoneType: parsed.stoneType,
      stoneSlug: parsed.stoneSlug,
      products: await listProducts({
        kind: 'gemstone',
        stoneType: parsed.stoneType,
        quantityType: 'pair',
        limit: 32,
      }),
    };
  }

  if (parsed.mode === 'jewelry') {
    const filters: ProductListFilters = {
      kind: 'jewelry',
      jewelryType: parsed.jewelryType,
      titleContains,
      limit: 32,
    };
    let products = await listProducts(filters);
    if (products.length === 0) {
      products = await listProducts({
        kind: 'jewelry',
        jewelryType: parsed.jewelryType,
        limit: 32,
      });
    }
    return {
      kicker: 'Ready-made',
      title: `${name} ${parsed.formLabel}`,
      lede: `Finished ${parsed.formLabel} from the atelier, shown with ${name.toLowerCase()} first.`,
      stoneType: parsed.stoneType,
      stoneSlug: parsed.stoneSlug,
      products,
    };
  }

  if (parsed.mode === 'settings') {
    return {
      kicker: 'Atelier mountings',
      title: `${name} settings`,
      lede: `Mountings ready to receive a ${name.toLowerCase()}.`,
      stoneType: parsed.stoneType,
      stoneSlug: parsed.stoneSlug,
      products: await listProducts({ kind: 'setting', limit: 32 }),
    };
  }

  return {
    kicker: 'Loose stones',
    title: name,
    lede: `Natural ${name.toLowerCase()} from the vault.`,
    stoneType: parsed.stoneType,
    stoneSlug: parsed.stoneSlug,
    products: await listProducts({ kind: 'gemstone', stoneType: parsed.stoneType, limit: 32 }),
  };
}
