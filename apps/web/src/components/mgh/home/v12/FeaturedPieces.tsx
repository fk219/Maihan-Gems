import { ArrowLink } from './ArrowLink';
import { ProductCard, type ProductCardData } from './ProductCard';

/**
 * The commerce layer every one of the four houses has by screen three: four
 * records with their real prices and their evidence state. The grid is 4-up
 * at 1440 (322 px cards), 3 at 1024, 2 at 768, 1 at 390.
 */
export function FeaturedPieces({ cards }: { cards: readonly ProductCardData[] }) {
  if (cards.length === 0) return null;

  return (
    <section
      className="mh12-band mh12-band--paper mh12-featured"
      data-section="featured"
      data-surface="paper"
      aria-labelledby="mh12-featured-title"
    >
      <div className="mh12-wrap">
        <div className="mh12-featured__head">
          <div>
            <h2 id="mh12-featured-title" className="mh12-h2">
              Four stones, each with its record.
            </h2>
            <p className="mh12-price mh12-featured__note">
              Photography is illustrative; every price and reference is the record&rsquo;s.
            </p>
          </div>
          <ArrowLink href="/gemstones" className="mh12-featured__action">
            See every stone
          </ArrowLink>
        </div>

        <ul className="mh12-grid-4" role="list">
          {cards.map((card) => (
            <li key={card.id}>
              <ProductCard card={card} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
