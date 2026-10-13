/**
 * Colour-category swatches mapped only to Design.md tokens.
 * There is no purple in the brand palette; violet stones use sapphire-deep.
 */
export const COLOR_SWATCH: Readonly<Record<string, string>> = {
  'Bi Color': '#E8C96A',
  Black: '#08121E',
  Blue: '#1E3A8A',
  Brown: '#8B6914',
  'Color Change': '#0891B2',
  Green: '#065F46',
  Grey: '#8A867E',
  'Multi Color': '#C9A84C',
  Orange: '#EA580C',
  Peach: '#FB923C',
  Pink: '#FB923C',
  Purple: '#0F172A',
  Red: '#991B1B',
  White: '#FAFAF8',
  Yellow: '#D97706',
};

export function swatchFor(name: string): string {
  return COLOR_SWATCH[name] ?? '#C9A84C';
}

/**
 * Hex for the procedural 3D stone. Named NGC colours such as "Violetish Blue"
 * are not CSS colours — Three.js would render them white. Map to Design.md gem
 * accents where they fit, and to a close gem hue otherwise.
 */
export function gemHexFor(color: string | null | undefined, stoneType?: string | null): string {
  const text = `${color ?? ''} ${stoneType ?? ''}`.toLowerCase();
  if (text.includes('tanzanite') || text.includes('violet')) return '#3B4BB8';
  if (text.includes('paraiba') || text.includes('neon')) return '#06B6D4';
  if (text.includes('emerald') || (text.includes('green') && !text.includes('bluish'))) return '#065F46';
  if (text.includes('ruby') || text.includes('red')) return '#991B1B';
  if (text.includes('padparadscha') || text.includes('peach')) return '#EA580C';
  if (text.includes('pink') || text.includes('pad')) return '#FB923C';
  if (text.includes('yellow') || text.includes('citrine') || text.includes('heliodor')) return '#D97706';
  if (text.includes('orange') || text.includes('spessart')) return '#EA580C';
  if (text.includes('white') || text.includes('colorless')) return '#FAFAF8';
  if (text.includes('black')) return '#08121E';
  if (text.includes('bluish green') || text.includes('teal')) return '#0891B2';
  if (text.includes('blue') || text.includes('sapphire') || text.includes('spinel')) return '#1E3A8A';
  if (text.includes('purple') || text.includes('amethyst')) return '#1E3A8A';
  if (text.includes('brown') || text.includes('cognac')) return '#8B6914';
  if (/^#[0-9a-f]{3,8}$/i.test((color ?? '').trim())) return color!.trim();
  return '#1E3A8A';
}
