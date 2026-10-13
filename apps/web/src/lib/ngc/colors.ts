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
