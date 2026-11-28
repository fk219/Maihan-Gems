import { ArrowLink } from './ArrowLink';

/**
 * Two finished pieces, each with the record's own photograph, carat and
 * price. Nothing is computed from weight and no piece is invented.
 *
 * On a phone the cards are a 2-up snap rail at 52vw, so both pieces are
 * visible and the second one is deliberately clipped by the margin. On
 * desktop the rail becomes an asymmetric split: a four-column lead, a
 * three-column second piece set lower, and the section's action in the
 * remaining copy column.
 */
export interface Piece {
  id: string;
  name: string;
  fact: string;
  href: string;
  image: string;
  alt: string;
}

export function JewellerySection({ pieces }: { pieces: readonly Piece[] }) {
  return (
    <section
      className="mh12-jewellery"
      data-section="jewellery"
      aria-labelledby="mh12-jewellery-title"
    >
      <div className="mh12-wrap mh12-jewellery__body">
        <div className="mh12-jewellery__head">
          <span className="mh12-rule" aria-hidden="true" />
          <h2 id="mh12-jewellery-title" className="mh12-h2">
            Finished at the bench.
          </h2>
          <ArrowLink href="/jewellery">Enter the jewellery rooms</ArrowLink>
        </div>

        {pieces.length > 0 ? (
          <ul className="mh12-jewellery__rail" role="list">
            {pieces.map((piece) => (
              <li key={piece.id}>
                <a className="mh12-card" href={piece.href}>
                  <span className="mh12-card__frame">
                    <img
                      src={piece.image}
                      alt=""
                      width={900}
                      height={1200}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <h3 className="mh12-h3 mh12-card__name">{piece.name}</h3>
                  <span className="mh12-card__fact">{piece.fact}</span>
                  <span className="mh12-card__action">
                    <span className="mh12-u">View the record</span>
                    <span aria-hidden="true" className="mh12-card__arrow">
                      &rarr;
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
