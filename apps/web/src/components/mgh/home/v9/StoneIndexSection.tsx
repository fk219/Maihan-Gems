import Link from 'next/link';
import type { GemstoneItem } from '@/lib/mgh/fixtures';
import { certificateReference, formatCarat } from '../format';

/**
 * One illustrative photograph per variety. These are open-licence stock
 * photographs (see docs/IMAGE_CREDITS.md), committed at /media/stock/ — they
 * stand in for the variety while the live catalogue has no photography, and
 * every plate that uses one says "illustrative" on the plate itself.
 * `position` tunes the crop per photograph; no colour filter is applied.
 */
const VARIETY_PLATES: Record<
  string,
  { src: string; alt: string; position: string; width: number; height: number }
> = {
  tanzanite: {
    src: '/media/stock/tanzanite.jpg',
    alt: 'A faceted violet-blue tanzanite with bright facet flashes, photographed on black',
    position: '50% 50%',
    width: 1444,
    height: 1141,
  },
  sapphire: {
    src: '/media/stock/sapphire.jpg',
    alt: 'An oval blue sapphire with violet and pink zoning, held on a pin against a warm beige ground',
    position: '50% 38%',
    width: 3000,
    height: 4000,
  },
  ruby: {
    src: '/media/stock/ruby.jpg',
    alt: 'Deep red ruby crystals set in white calcite matrix against a black ground',
    position: '46% 52%',
    width: 1920,
    height: 1275,
  },
  emerald: {
    src: '/media/stock/emerald.jpg',
    alt: 'A vivid green emerald crystal standing in white calcite matrix against a black ground',
    position: '40% 32%',
    width: 1920,
    height: 1590,
  },
  opal: {
    src: '/media/stock/opal.jpg',
    alt: 'A rough opal showing green and red play-of-colour on a dark charcoal ground',
    position: '50% 55%',
    width: 1920,
    height: 1920,
  },
  spinel: {
    src: '/media/stock/spinel.jpg',
    alt: 'Small red spinel octahedral crystals scattered through white marble on a black ground',
    position: '52% 50%',
    width: 2240,
    height: 1632,
  },
};

/**
 * The collection is the page's photography-led spread: the variety plates come
 * first, each variety's name over its photograph, and the ledger of records
 * underneath carries the carat, origin and certificate facts. Each row is a
 * real catalogue row; a variety with no record is omitted rather than filled.
 *
 * The plates are illustrative photography of the variety, not a pictured
 * record's stone. The lead plate carries that record's carat only because the
 * caption names the record's weight and the word "illustrative" in the same
 * line. A variety with no photograph gets no plate; it is never given a
 * borrowed one.
 */
export function StoneIndexSection({ records }: { records: readonly GemstoneItem[] }) {
  if (records.length === 0) return null;

  const origins = new Set(
    records.map((record) => record.origin.trim()).filter((origin) => origin.length > 0),
  );

  const lead = records.find((record) => VARIETY_PLATES[record.varietySlug] !== undefined);
  const leadPlate = lead ? VARIETY_PLATES[lead.varietySlug] : undefined;
  const tiles = records
    .filter((record) => record !== lead && VARIETY_PLATES[record.varietySlug] !== undefined)
    .slice(0, 4)
    .flatMap((record) => {
      const plate = VARIETY_PLATES[record.varietySlug];
      return plate === undefined ? [] : [{ record, plate }];
    });

  return (
    <section className="v9-gallery" aria-labelledby="v9-gallery-title" data-reveal>
      <div className="v9-gallery__grid">
        <div className="v9-gallery__mosaic">
          {lead && leadPlate ? (
            <figure className="v9-gallery__plate">
              <img
                src={leadPlate.src}
                alt={leadPlate.alt}
                width={leadPlate.width}
                height={leadPlate.height}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: leadPlate.position }}
              />
              <figcaption className="v9-gallery__overlay">
                <span className="v9-gallery__overlay-name">{lead.variety || 'Gemstone'}</span>
                <span className="v9-gallery__overlay-meta">
                  {formatCarat(lead.carat)} · Illustrative photograph
                </span>
              </figcaption>
            </figure>
          ) : null}

          {tiles.length > 0 ? (
            <div className="v9-gallery__tiles">
              {tiles.map(({ record, plate }) => (
                <figure key={record.id} className="v9-gallery__tile">
                  <img
                    src={plate.src}
                    alt={plate.alt}
                    width={plate.width}
                    height={plate.height}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition: plate.position }}
                  />
                  <figcaption className="v9-gallery__overlay">
                    <span className="v9-gallery__overlay-name">{record.variety || 'Gemstone'}</span>
                    <span className="v9-gallery__overlay-meta">Illustrative</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>

        <div className="v9-gallery__panel">
          <p className="v9-eyebrow">The collection</p>
          <h2 id="v9-gallery-title" className="v9-display v9-gallery__title">
            Eight varieties. One record each.
          </h2>
          <p className="v9-promise">
            See the stone, the carat it weighs, the origin it carries and the certificate it
            references, before you ask a question.
          </p>

          <p className="v9-count">
            {records.length} {records.length === 1 ? 'variety' : 'varieties'} with a record
            {origins.size > 0
              ? ` · ${origins.size} ${origins.size === 1 ? 'origin' : 'origins'}`
              : ''}
          </p>

          <ol className="v9-gallery__index">
            {records.map((record, index) => (
              <li key={record.id}>
                <Link href={`/products/${record.slug}`} className="v9-gallery__row">
                  <span className="v9-gallery__num" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="v9-gallery__variety">{record.variety || 'Gemstone'}</span>
                  <span className="v9-gallery__carat">{formatCarat(record.carat)}</span>
                  <span className="v9-gallery__origin">
                    {record.origin || 'Origin not recorded'}
                  </span>
                  <span className="v9-gallery__cert">
                    {certificateReference(record.evidence)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <Link href="/gemstones" className="v9-action">
            See every gemstone
            <span aria-hidden="true" className="v9-action__arrow">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
