/**
 * apps/web/src/components/catalog/ProductCard.tsx
 *
 * Catalogue component: ProductCard (doc 08 catalog inventory).
 *
 * One ProductSummary view model, rendered unboxed. Every field is verbatim
 * from the Phase 3 contract; nothing is inferred and no per-record special
 * case exists. The card has ONE real link (the whole card), named by the
 * title, so keyboard and screen-reader users get one coherent target.
 *
 * Media honesty: ProductSummary carries no media field. Rather than a blank
 * rectangle or a stock photograph, the card renders the design-system
 * LightPlate — a CSS light study with the visible caption "No photograph on
 * file". No image URL, alt text or colour is invented.
 *
 * Motion: one Pass sweep crosses the plate on hover/focus-within. No image
 * swap, no lift, no shadow bloom. Gold remains light: a hairline and a sweep.
 */
import type { ProductSummary } from '@maihan/contracts';

import { Badge } from '../design-system/Badge.js';
import { LightPlate } from '../design-system/LightPlate.js';
import { Money } from '../design-system/Money.js';

export interface ProductCardProps {
  readonly product: ProductSummary;
}

const KIND_LABEL: Record<ProductSummary['kind'], string> = {
  CONFIGURED: 'Configured piece',
  READY_MADE: 'Ready-made setting',
  LOOSE_STONE: 'Loose gemstone',
  STONE_PAIR: 'Matched pair',
  SETTING_ONLY: 'Setting',
};

export function ProductCard({ product }: ProductCardProps) {
  const isAvailable = product.availability;

  return (
    <article className="mh-card">
      <div className="mh-card__status">
        <span className="mh-card__kind">{KIND_LABEL[product.kind]}</span>
        <Badge tone={isAvailable ? 'positive' : 'neutral'} live>
          {isAvailable ? 'Available' : 'Unavailable'}
        </Badge>
      </div>

      <a className="mh-card__link" href={`/products/${product.slug}`}>
        <LightPlate caption="No photograph on file" />

        <div className="mh-card__body">
          {product.variety !== null && (
            <p className="mh-card__variety">{product.variety.name}</p>
          )}

          <h2 className="mh-card__title">{product.title}</h2>

          {product.subtitle !== null && <p className="mh-card__subtitle">{product.subtitle}</p>}

          <p className="mh-card__meta">
            {product.color !== null && (
              <>
                <span>{product.color.name}</span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            {product.total_weight_ct !== null && (
              <>
                <span className="tabular">{product.total_weight_ct} ct</span>
                <span aria-hidden="true"> · </span>
              </>
            )}
            <span className="tabular">
              {product.stone_count} stone{product.stone_count === 1 ? '' : 's'}
            </span>
          </p>

          <div className="mh-card__foot">
            <p className="mh-card__price">
              <Money amount={product.price_amount} currency={product.currency} />
            </p>
            <span className="mh-card__cue">
              View <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </a>
    </article>
  );
}
