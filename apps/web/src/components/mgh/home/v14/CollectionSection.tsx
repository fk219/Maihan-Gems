import Link from 'next/link';

import { formatCarat, formatUsd } from '../format';
import { SectionAction } from './SectionAction';

/**
 * The collection: loose stones, image led.
 *
 * The tray is three plates from the catalogue's stone records, each plate a
 * link to that record, each caption carrying only what the record returns:
 * the variety, the carat and the price. No record, no plate.
 *
 * At 390 the plates are square so the tray, the heading and the action stay
 * inside one phone screen; the record's full name is held back because the
 * variety, carat and price already say what it is. From 768 the plates return
 * to the portrait crop the stone photography was made for, the full record
 * name appears, and the middle plate drops 32 px so the tray is asymmetric
 * rather than a repeated card grid.
 */
export interface Stone {
  id: string;
  variety: string;
  name: string;
  href: string;
  image: string;
  width: number;
  height: number;
  carat: number;
  price: number;
}

export function CollectionSection({ stones }: { stones: readonly Stone[] }) {
  if (stones.length === 0) return null;

  return (
    <section
      className="mh14-collection"
      data-section="collection"
      aria-labelledby="mh14-collection-title"
    >
      <div className="mh14-wrap">
        <div className="mh14-collection__head">
          <h2 id="mh14-collection-title" className="mh14-h2">
            Loose stones.
          </h2>
          <p className="mh14-lede">
            Three vault records, with the carat, the price and the photograph each one holds.
          </p>
        </div>

        <ul className="mh14-tray" role="list">
          {stones.map((stone) => (
            <li key={stone.id} className="mh14-tray__item">
              <Link href={stone.href} className="mh14-tray__link">
                <span className="mh14-tray__plate">
                  <img
                    src={stone.image}
                    alt=""
                    width={stone.width}
                    height={stone.height}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="mh14-tray__name">{stone.variety}</span>
                <span className="mh14-tray__fact">
                  {formatCarat(stone.carat)}
                  <span aria-hidden="true"> · </span>
                  {formatUsd(stone.price)}
                </span>
                <span className="mh14-tray__record">{stone.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mh14-collection__foot">
          <SectionAction href="/gemstones">Enter the collection</SectionAction>
          <p className="mh14-collection__note">
            Illustrative photographs of the variety. Carat and price are the record&rsquo;s.
          </p>
        </div>
      </div>
    </section>
  );
}
