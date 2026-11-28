import Link from 'next/link';

/**
 * The product card, exactly as the brand spec draws it:
 *
 *   image (1:1 stone / 4:5 piece)
 *   spec line   12/18 label, +0.07em, muted
 *   name        16/22 Cormorant
 *   price       14/20 Jost, tabular, or "On request"
 *   evidence    12/18 label with a dot — ink, never gold
 *
 * Radius 0, no border, no shadow, no lift. Hover draws the name's rule over
 * 200 ms and settles the image to 0.96 over 300 ms. Every field comes from a
 * record: it prints what the record carries and never fills a gap.
 */
export interface ProductCardData {
  id: string;
  name: string;
  /** "2.41 ct · Sapphire · Ceylon" — uppercased by the label step. */
  spec: string;
  /** "$4,850" or "On request". Never a dash. */
  price: string;
  /** "Report · SSEF-119402" or "Evidence not recorded". */
  evidence: string;
  href: string;
  image: string | null;
}

export function ProductCard({
  card,
  ratio = '1:1',
}: {
  card: ProductCardData;
  ratio?: '1:1' | '4:5';
}) {
  return (
    <Link href={card.href} className="mh12-card" data-ratio={ratio}>
      {card.image === null ? null : (
        <span className="mh12-card__frame">
          <img
            src={card.image}
            alt=""
            width={900}
            height={ratio === '1:1' ? 900 : 1125}
            loading="lazy"
            decoding="async"
          />
        </span>
      )}
      <span className="mh12-card__body">
        {card.spec.length > 0 ? (
          <span className="mh12-label mh12-card__spec">{card.spec}</span>
        ) : null}
        <span className="mh12-cardname mh12-card__name">
          <span className="mh12-card__draw">{card.name}</span>
        </span>
        <span className="mh12-price mh12-card__price">{card.price}</span>
        <span className="mh12-label mh12-card__evidence">
          <span aria-hidden="true" className="mh12-card__dot" />
          {card.evidence}
        </span>
      </span>
    </Link>
  );
}
