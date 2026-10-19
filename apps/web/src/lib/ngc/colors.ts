/**
 * Colour-category swatches mapped only to Design.md tokens.
 * There is no purple in the brand palette; violet stones use sapphire-deep.
 */
export const COLOR_SWATCH: Readonly<Record<string, string>> = {
  'Bi Color': '#F0D48A',
  Black: '#16110C',
  Blue: '#1E3A8A',
  Brown: '#8A5E12',
  'Color Change': '#0891B2',
  Green: '#065F46',
  Grey: '#8A867E',
  'Multi Color': '#D4A437',
  Orange: '#EA580C',
  Peach: '#FB923C',
  Pink: '#FB923C',
  Purple: '#0F172A',
  Red: '#991B1B',
  White: '#FAFAF8',
  Yellow: '#D97706',
};

export function swatchFor(name: string): string {
  return COLOR_SWATCH[name] ?? '#D4A437';
}

/**
 * Hex for the procedural 3D stone. Named NGC colours such as "Violetish Blue"
 * are not CSS colours — Three.js would render them white. Tanzanite uses the
 * saturated violet-blue of the K11733 vault photo, not a washed navy swatch.
 */
export function gemHexFor(color: string | null | undefined, stoneType?: string | null): string {
  const text = `${color ?? ''} ${stoneType ?? ''}`.toLowerCase();
  if (text.includes('tanzanite') || text.includes('violet')) return '#6B32E6';
  if (text.includes('paraiba') || text.includes('neon')) return '#06B6D4';
  if (text.includes('emerald') || (text.includes('green') && !text.includes('bluish'))) return '#065F46';
  if (text.includes('ruby') || text.includes('red')) return '#991B1B';
  if (text.includes('padparadscha') || text.includes('peach')) return '#EA580C';
  if (text.includes('pink') || text.includes('pad')) return '#FB923C';
  if (text.includes('yellow') || text.includes('citrine') || text.includes('heliodor')) return '#D97706';
  if (text.includes('orange') || text.includes('spessart')) return '#EA580C';
  if (text.includes('white') || text.includes('colorless')) return '#FAFAF8';
  if (text.includes('black')) return '#16110C';
  if (text.includes('bluish green') || text.includes('teal')) return '#0891B2';
  if (text.includes('blue') || text.includes('sapphire') || text.includes('spinel')) return '#1E3A8A';
  if (text.includes('purple') || text.includes('amethyst')) return '#1E3A8A';
  if (text.includes('brown') || text.includes('cognac')) return '#8B6914';
  if (/^#[0-9a-f]{3,8}$/i.test((color ?? '').trim())) return color!.trim();
  return '#1E3A8A';
}

/**
 * Beer's-law body colour for MeshPhysicalMaterial. Darker and more saturated
 * than the albedo so a short attenuationDistance reads as gem, not glass.
 */
export function gemAttenuationHex(color: string | null | undefined, stoneType?: string | null): string {
  const text = `${color ?? ''} ${stoneType ?? ''}`.toLowerCase();
  if (
    text.includes('tanzanite')
    || text.includes('violet')
    || (color ?? '').toUpperCase() === '#6B32E6'
    || (color ?? '').toUpperCase() === '#8A4AE8'
    || (color ?? '').toUpperCase() === '#7A3AE8'
    || (color ?? '').toUpperCase() === '#6B32E8'
    || (color ?? '').toUpperCase() === '#3A12C2'
  ) {
    return '#3A1578';
  }
  if (text.includes('paraiba') || text.includes('neon')) return '#0E7490';
  if (text.includes('emerald') || (text.includes('green') && !text.includes('bluish'))) return '#022C22';
  if (text.includes('ruby') || text.includes('red')) return '#4A0510';
  if (text.includes('padparadscha') || text.includes('peach') || text.includes('pink') || text.includes('pad')) {
    return '#9A3412';
  }
  if (text.includes('yellow') || text.includes('citrine') || text.includes('heliodor')) return '#92400E';
  if (text.includes('orange') || text.includes('spessart')) return '#9A3412';
  if (text.includes('white') || text.includes('colorless')) return '#E7E5E4';
  if (text.includes('black')) return '#020617';
  if (text.includes('bluish green') || text.includes('teal')) return '#155E75';
  if (text.includes('blue') || text.includes('sapphire') || text.includes('spinel')) return '#0B1F66';
  if (text.includes('purple') || text.includes('amethyst')) return '#1E1B4B';
  if (text.includes('brown') || text.includes('cognac')) return '#3F2A0A';
  return '#0B1F66';
}

/** Refractive index. Tanzanite is 1.69. */
export function gemIor(stoneType?: string | null): number {
  const text = (stoneType ?? '').toLowerCase();
  if (text.includes('diamond')) return 2.42;
  if (text.includes('zircon')) return 1.95;
  if (text.includes('sapphire') || text.includes('ruby') || text.includes('corundum')) return 1.77;
  if (text.includes('garnet') || text.includes('tsavorite') || text.includes('spessart')) return 1.74;
  if (text.includes('spinel')) return 1.72;
  if (text.includes('tanzanite')) return 1.69;
  if (text.includes('topaz') || text.includes('tourmaline') || text.includes('paraiba')) return 1.64;
  if (text.includes('emerald') || text.includes('beryl') || text.includes('aqua') || text.includes('morganite')) return 1.58;
  return 1.7;
}

/** Chromatic-fire intensity mapped into MeshRefractionMaterial aberration (0–1). */
export function gemDispersion(stoneType?: string | null): number {
  const text = (stoneType ?? '').toLowerCase();
  if (text.includes('diamond')) return 0.85;
  if (text.includes('zircon')) return 0.7;
  if (text.includes('tanzanite')) return 0.55;
  if (text.includes('sapphire') || text.includes('ruby')) return 0.28;
  if (text.includes('emerald')) return 0.16;
  return 0.32;
}

/** BVH refraction uniforms derived from stone type. Generic across the catalogue. */
export function gemRefractionParams(stoneType?: string | null): {
  readonly ior: number;
  readonly bounces: number;
  readonly aberrationStrength: number;
  readonly absorption: number;
} {
  const text = (stoneType ?? '').toLowerCase();
  const colorless =
    text.includes('diamond') || text.includes('white') || text.includes('colorless');
  return {
    ior: gemIor(stoneType),
    bounces: 4,
    aberrationStrength: Math.min(0.002, 0.0005 + gemDispersion(stoneType) * 0.0016),
    absorption: colorless ? 0.05 : 0.22,
  };
}
