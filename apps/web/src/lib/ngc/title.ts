import type { NgcProduct } from './types.js';

const ID_TITLE = /^[A-Z]{1,3}\d+[A-Z0-9]*$/i;

type TitleSource = Pick<
  NgcProduct,
  | 'id'
  | 'title'
  | 'kind'
  | 'weightCt'
  | 'color'
  | 'stoneType'
  | 'origin'
  | 'centerStones'
  | 'pairStones'
  | 'metalName'
  | 'styles'
  | 'jewelryType'
>;

function firstSpec(product: TitleSource) {
  return product.centerStones[0] ?? product.pairStones[0] ?? product;
}

function caratLabel(weight: number | null | undefined): string | null {
  if (weight == null) return null;
  return `${Number(weight).toFixed(2).replace(/\.?0+$/, '')} Ct.`;
}

/** NGC-style title when the compiled record only stored the SKU. */
export function displayTitle(product: TitleSource): string {
  const raw = (product.title ?? '').trim().replace(/_/g, ' ');
  if (raw && raw !== product.id && !ID_TITLE.test(raw)) return raw;

  const spec = firstSpec(product);
  const weight = product.weightCt ?? spec.weightCt;
  const color = product.color ?? spec.color;
  const stone = product.stoneType ?? spec.stoneType;
  const origin = product.origin ?? spec.origin;

  if (product.kind === 'setting') {
    const style = product.styles[0];
    return [product.metalName, style, 'setting', product.id].filter(Boolean).join(' ');
  }

  if (product.kind === 'jewelry' || product.kind === 'dyo_composite') {
    const seat = (product.jewelryType ?? '').replace(/_/g, ' ');
    return [caratLabel(weight), color, stone, seat, product.metalName, product.id].filter(Boolean).join(' ');
  }

  const bits = [
    caratLabel(weight),
    color,
    stone,
    product.kind === 'stone_pair' ? 'Pair' : null,
    origin ? `from ${origin}` : null,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(' ') : product.id;
}
