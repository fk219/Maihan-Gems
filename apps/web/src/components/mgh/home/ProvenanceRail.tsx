import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { certificateReference, formatCarat } from './format';

/**
 * The variety index is the taxonomy, not a slogan. Every active variety that
 * has at least one record in the loaded catalogue gets exactly one tile; a
 * variety with no record is omitted rather than filled with a stand-in.
 *
 * Each tile carries a material plate and the facts the row actually holds:
 * carat, origin and the certificate reference, or the honest absence of one.
 * The plate is chosen by variety so the tile shows the material the row is
 * made of, never a different stone borrowed from a neighbour. When a variety
 * has no plate of its own the tile falls back to the record's own image, and
 * failing that to a plain typographic plate. Nothing is photographed in.
 *
 * The second copy of the track is purely visual: it is hidden from assistive
 * technology and removed from the tab order, so every record is announced and
 * reachable once. Under reduced motion the track becomes a scrollable rail.
 */
/**
 * Material plates, one per variety the ledger carries. These are the
 * catalogue's own representative stone photographs (see
 * `lib/storefront-images.ts`), not product shots and not claims about any
 * single row.
 *
 * `scale` is the crop, set per photograph so every tile shows the material at
 * a comparable size. The ruby is shot on a pale ground with wide margins, so
 * it needs a tighter crop than the velvet plates to fill the same frame.
 */
const VARIETY_PLATES: Record<string, { src: string; scale: number; blend?: boolean }> = {
  tanzanite: { src: '/media/stone-tanzanite.jpg', scale: 1.24 },
  sapphire: { src: '/media/stone-sapphire.jpg', scale: 1.24 },
  emerald: { src: '/media/stone-emerald.jpg', scale: 1.18 },
  ruby: { src: '/media/stone-ruby.jpg', scale: 2.05, blend: true },
  spinel: { src: '/media/stone-spinel-pink.jpg', scale: 1.24 },
  tourmaline: { src: '/media/stone-paraiba.jpg', scale: 1.24 },
  alexandrite: { src: '/media/stone-alexandrite.jpg', scale: 1.24 },
  tsavorite: { src: '/media/stone-tsavorite.jpg', scale: 1.24 },
};

function plateFor(record: GemstoneItem): { src: string; scale: number; blend?: boolean } | null {
  const mapped = VARIETY_PLATES[record.varietySlug];
  if (mapped !== undefined) return mapped;
  const own = record.images.find((src) => src.trim().length > 0);
  return own === undefined ? null : { src: own, scale: 1.24 };
}

export function ProvenanceRail({ records }: { records: readonly GemstoneItem[] }) {
  if (records.length === 0) return null;

  // Keep the typographic pass at a readable speed whether the taxonomy has
  // eight varieties or forty. This is derived from the row count, not styled
  // by hand.
  const duration = `${Math.max(64, records.length * 9)}s`;
  const style = { '--mh6-index-duration': duration } as CSSProperties;

  const origins = new Set(
    records.map((record) => record.origin.trim()).filter((origin) => origin.length > 0),
  );

  const set = (duplicate: boolean) => (
    <ul className="mh6-index__set" aria-hidden={duplicate ? true : undefined}>
      {records.map((record) => {
        const plate = plateFor(record);
        const warm = plate !== null && plate.blend === true;
        return (
          <li key={`${duplicate ? 'b' : 'a'}-${record.id}`}>
            <Link
              href={`/products/${record.slug}`}
              className="mh6-index__tile"
              tabIndex={duplicate ? -1 : undefined}
            >
              <span className={`mh6-index__plate${warm ? ' mh6-index__plate--warm' : ''}`}>
                {plate !== null ? (
                  <img
                    src={plate.src}
                    alt=""
                    width={1152}
                    height={864}
                    loading="lazy"
                    decoding="async"
                    style={{ '--plate-scale': plate.scale } as CSSProperties}
                  />
                ) : (
                  <span className="mh6-index__monogram" aria-hidden="true">
                    {record.variety.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="mh6-index__body">
                <span className="mh6-index__variety">{record.variety || 'Gemstone'}</span>
                <span className="mh6-index__facts">
                  <span>{formatCarat(record.carat)}</span>
                  <span>{record.origin || 'Origin not recorded'}</span>
                  <span>{certificateReference(record.evidence)}</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="mh6-index" aria-labelledby="mh6-index-title" data-reveal style={style}>
      <div className="mh6-home__wrap mh6-index__head">
        <div className="mh6-index__intro">
          <p className="mh6-eyebrow">The vault</p>
          <h2 id="mh6-index-title" className="mh6-section-title">
            Every variety we hold, one record each.
          </h2>
        </div>
        <div className="mh6-index__aside">
          <p className="mh6-index__count">
            {records.length} {records.length === 1 ? 'variety' : 'varieties'} with a record
            {origins.size > 0 ? ` · ${origins.size} ${origins.size === 1 ? 'origin' : 'origins'}` : ''}
          </p>
          <Link href="/gemstones" className="mh6-link">
            All gemstones
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>

      <div className="mh6-index__viewport">
        <div className="mh6-index__track">
          {set(false)}
          {set(true)}
        </div>
      </div>
    </section>
  );
}
