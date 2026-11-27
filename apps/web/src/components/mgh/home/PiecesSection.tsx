import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface HomePiece {
  name: string;
  spec: string;
  price: string;
  href: string;
}

/**
 * Finished pieces are a price list, not a card grid: three rows on obsidian,
 * each with the weight, the form and the price the record carries. Hover adds
 * light (a soft falloff and a gold hairline), never motion.
 */
export function PiecesSection({ pieces }: { pieces: readonly HomePiece[] }) {
  if (pieces.length === 0) return null;

  return (
    <section className="mh6-pieces" aria-labelledby="mh6-pieces-title">
      <div className="mh6-home__wrap">
        <div className="mh6-pieces__head">
          <div>
            <h2 id="mh6-pieces-title" className="mh6-section-title">
              Finished pieces.
            </h2>
            <p className="mh6-pieces__note">
              Three from the atelier, with weight and price on the record.
            </p>
          </div>
          <Link href="/jewellery" className="mh6-link">
            All fine jewellery
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <ul className="mh6-pieces__list" data-reveal-list>
          {pieces.map((piece) => (
            <li key={piece.name}>
              <Link href={piece.href} className="mh6-piece">
                <span className="mh6-piece__name">{piece.name}</span>
                <span className="mh6-piece__spec">{piece.spec}</span>
                <span className="mh6-piece__price">{piece.price}</span>
                <ArrowRight className="mh6-piece__arrow" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
