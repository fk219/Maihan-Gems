import Link from 'next/link';

import { formatCarat, formatUsd } from '../format';
import { SectionAction } from './SectionAction';

/**
 * Jewellery: two finished pieces and the mountings they can be built on.
 *
 * On a phone the order is headline, photograph, ledger, action: the section
 * says what it is, shows the bench, then gives the records and the way in.
 * From 1024 the ledger and the action move into the left column and the
 * photograph becomes a portrait plate on the right, so the section reads as a
 * bench sheet rather than as a card row.
 *
 * The lead plate is the first piece's own catalogue photograph. The two pieces
 * print with the carat and price the record carries. The mounting line is
 * text, not a second action; the section's one action opens the jewellery
 * rooms.
 */
export interface Piece {
  id: string;
  name: string;
  href: string;
  image: string;
  carat: number;
  price: number;
}

export function JewellerySection({ pieces }: { pieces: readonly Piece[] }) {
  const lead = pieces[0];

  return (
    <section
      className="mh14-jewellery"
      data-section="jewellery"
      aria-labelledby="mh14-jewellery-title"
    >
      <div className="mh14-wrap mh14-jewellery__grid">
        <header className="mh14-jewellery__head">
          <h2 id="mh14-jewellery-title" className="mh14-h2">
            Finished at the bench.
          </h2>
          <p className="mh14-lede mh14-lede--dark">
            Two atelier pieces, and the mountings a loose stone can be set into.
          </p>
        </header>

        {lead === undefined ? null : (
          <figure className="mh14-jewellery__plate">
            <span className="mh14-jewellery__frame">
              <img
                src={lead.image}
                alt=""
                width={900}
                height={1200}
                loading="lazy"
                decoding="async"
              />
            </span>
            <figcaption className="mh14-jewellery__caption">Record photograph</figcaption>
          </figure>
        )}

        <div className="mh14-jewellery__body">
          {pieces.length > 0 ? (
            <ul className="mh14-jewellery__ledger" role="list">
              {pieces.map((piece) => (
                <li key={piece.id}>
                  <Link href={piece.href} className="mh14-jewellery__row">
                    <span className="mh14-jewellery__row-name">{piece.name}</span>
                    <span className="mh14-jewellery__row-fact">
                      {formatCarat(piece.carat)}
                      <span aria-hidden="true"> · </span>
                      {formatUsd(piece.price)}
                    </span>
                    <span aria-hidden="true" className="mh14-jewellery__row-arrow">
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mh14-jewellery__mountings">
            Mountings are catalogued for rings, earrings and pendants.
          </p>

          <SectionAction href="/jewellery" tone="dark">
            Enter the jewellery rooms
          </SectionAction>
        </div>
      </div>
    </section>
  );
}
