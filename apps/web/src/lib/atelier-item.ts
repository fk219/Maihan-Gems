import { productImage } from './storefront-images.js';
import type { StorefrontCard } from './storefront-types.js';

export interface AtelierItem {
  id: string;
  slug: string;
  title: string;
  kind: string;
  priceUsd: number;
  image: string;
  specs?: string;
  stoneType?: string | null;
  caratTotal?: number | null;
  shape?: string | null;
  colorHue?: string | null;
  originCountry?: string | null;
  treatment?: string | null;
  jewelryType?: string | null;
  metalColor?: string | null;
  settingFor?: string | null;
}

export function cardSpecs(product: StorefrontCard): string {
  const parts: string[] = [];
  if (product.caratTotal) parts.push(`${product.caratTotal} ct`);
  if (product.shape) parts.push(product.shape.replace(/_/g, ' '));
  if (product.originCountry) parts.push(product.originCountry);
  if (product.settingFor) parts.push(product.settingFor);
  if (product.jewelryType) parts.push(product.jewelryType);
  if (product.metalColor) parts.push(product.metalColor);
  return parts.join(' · ');
}

export function cardToAtelier(product: StorefrontCard): AtelierItem {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    kind: product.kind,
    priceUsd: product.priceUsd,
    image: productImage({
      kind: product.kind,
      stoneType: product.stoneType,
      jewelryType: product.jewelryType,
      settingFor: product.settingFor,
      style: product.style,
      title: product.title,
      colorHue: product.colorHue,
      variety: product.variety,
      quantityType: product.quantityType,
      imageUrl: product.imageUrl,
    }),
    specs: cardSpecs(product),
    stoneType: product.stoneType,
    caratTotal: product.caratTotal,
    shape: product.shape,
    colorHue: product.colorHue,
    originCountry: product.originCountry,
    treatment: product.treatment,
    jewelryType: product.jewelryType,
    metalColor: product.metalColor,
    settingFor: product.settingFor,
  };
}

export function itemImage(item: AtelierItem): string {
  return productImage({
    kind: item.kind,
    stoneType: item.stoneType,
    jewelryType: item.jewelryType,
    settingFor: item.settingFor,
    title: item.title,
    colorHue: item.colorHue,
    imageUrl: item.image,
  });
}
