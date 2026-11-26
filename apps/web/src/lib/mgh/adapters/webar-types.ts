/**
 * apps/web/src/lib/mgh/adapters/webar-types.ts
 *
 * Client-safe VIEW types for the M3 WebAR pages. The applet's
 * `WebArAssetRecord` (the reference viewer's input) carries fixture-authored
 * calibration figures (RI / carat / dimensions / swatches) that the repo's
 * `webar_assets` table does NOT hold — and no value may be invented
 * (INV-07). `WebArAssetView` is therefore the same record with the
 * calibration fields nullable, plus the REAL model facts the DB does hold
 * (the GLB `modelUrl` = `cdnUrl`, format, lattice, budget bytes, state):
 *
 *   null ⇒ the applet prints its honest 'Not evidenced' marker; type-wise the
 *   fixture `WebArAssetRecord` stays assignable where the reference pages
 *   feed fixture rows (none remain after M3 — the migrated pages render this
 *   view exclusively).
 *
 * Everything here is presentation derivation over REAL data:
 * - title      → humanised storage key of the asset itself
 * - modelUrl   → the row's cdnUrl (the actual GLB byte path)
 * - primaryColorHex/secondaryColorHex → hue-vocabulary palette lookup so the
 *   procedural inspection studio renders the asset's real colour hue
 *   (viewport colour of the paper model, not a calibrated chromaticity
 *   claim); null when the hue is unknown (the studio keeps its own default).
 */

/** The colour hue vocabulary the seeded procedural assets address. */
export const WEBAR_HUES = [
  'blue',
  'violet',
  'red',
  'pink',
  'green',
  'yellow',
  'orange',
  'purple',
  'white',
] as const;

export type WebarHue = (typeof WEBAR_HUES)[number];

/**
 * Presentation palette — one swatch per seeded hue, used to render the
 * procedural inspection studio in the asset's own colour family. This is
 * viewport colour of the paper model, not a calibrated chromaticity claim.
 */
const WEBAR_HUE_HEX: Record<WebarHue, string> = {
  blue: '#1D4ED8',
  violet: '#4338CA',
  red: '#B91C1C',
  pink: '#EC4899',
  green: '#047857',
  yellow: '#D4AF37',
  orange: '#D97706',
  purple: '#7E22CE',
  white: '#E5E7EB',
};

export function hueSwatch(hue: string | null): string | null {
  if (!hue) return null;
  return (WEBAR_HUE_HEX as Record<string, string>)[hue] ?? null;
}

export function hueOfStorageKey(storageKey: string): WebarHue | null {
  const match = storageKey.match(/brilliant-([a-z]+)/i);
  const candidate = typeof match?.[1] === 'string' ? match[1] : null;
  if (!candidate) return null;
  return (WEBAR_HUES as readonly string[]).includes(candidate) ? (candidate as WebarHue) : null;
}

export interface WebArAssetView {
  assetId: string;
  title: string;
  sku: string;
  kind: 'gemstone' | 'pair' | 'setting';
  cutGeometry: 'round' | 'cushion' | 'octagon' | 'oval' | 'solitaire-ring';
  primaryColorHex: string | null;
  secondaryColorHex: string | null;
  /** Calibration figures the vault does not record stay null. */
  ior: number | null;
  caratOrScale: number | null;
  dimensionsMm: string | null;
  calibrationNote: string;  /** The REAL GLB byte path (= `webar_assets.cdn_url`). */
  modelUrl: string;
  modelFormat: string;
  polyCount: number | null;
  fileBytes: number | null;
  state: string;
  jewelleryType: string;
}

export interface WebarHandoffSession {
  status: 'valid' | 'invalid' | 'expired' | 'replayed' | 'unready';
  token: string;
  webarAssetId: string | null;
  asset: WebArAssetView | null;
  expiresAt: string | null;
  productId: string | null;
  backProductSlug: string | null;
}
