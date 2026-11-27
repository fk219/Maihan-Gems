import Link from 'next/link';
import type { HomePiece } from '../PiecesSection';

/**
 * The atelier is a split: the named record's own photograph at plate scale on
 * the left, one statement on the right. Only a record's own image is captioned
 * with that record's name; the meta line is the record's own weight, form and
 * price. The section renders nothing when no record has an image — a split
 * with no photograph would be filler.
 */
export function AtelierSection({ piece }: { piece: HomePiece | null }) {
  if (piece === null || piece.image === null) return null;

  return (
    <section className="v11-section" aria-labelledby="v11-atelier-title">
      <div className="v11-wrap v11-atelier__grid">
        <figure className="v11-atelier__figure v11-enter-media">
          <div className="v11-atelier__plate">
            <img
              src={piece.image}
              alt={`${piece.name}, photographed for the record`}
              width={900}
              height={1200}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="v11-caption v11-atelier__figcap">
            <span className="v11-atelier__name">{piece.name}</span>
            <span className="v11-atelier__meta">
              {piece.spec} · {piece.price}
            </span>
          </figcaption>
        </figure>

        <div className="v11-atelier__copy">
          <h2 id="v11-atelier-title" className="v11-statement v11-enter">
            A finished jewel, or the mounting for your stone.
          </h2>
          <p className="v11-line v11-enter">
            Metal, weight and price are read from the record, never estimated.
          </p>
          <Link href="/jewellery" className="v11-action v11-enter">
            Enter the jewellery rooms
            <span aria-hidden="true" className="v11-action__arrow">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
