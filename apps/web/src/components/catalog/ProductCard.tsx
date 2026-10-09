/**
 * apps/web/src/components/catalog/ProductCard.tsx
 *
 * Catalogue component: ProductCard (doc 08 catalog inventory).
 *
 * Renders ONE ProductSummary view model. Every field displayed comes
 * verbatim from the Phase 3 contract; nothing is inferred, no per-record
 * special case exists (doc 08 "the catalogue rule in the UI"). Composed from
 * design-system primitives — no page-local copies.
 *
 * Media: the Phase 3 ProductSummary contract carries no media field, so this
 * card renders NO image rather than fabricating a URL (doc 08 failure modes:
 * "Images fail to load — gallery shows alt"; there is no URL to show).
 */
import { Card } from '../design-system/Card.js';
import { Badge } from '../design-system/Badge.js';
import { Money } from '../design-system/Money.js';
import type { ProductSummary } from '@maihan/contracts';

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
  return (
    <Card href={`/products/${product.slug}`} linkLabel={product.title}>
      <h2 className="product-card__title">
        <a href={`/products/${product.slug}`}>{product.title}</a>
      </h2>
      {product.subtitle !== null && (
        <p className="product-card__subtitle">{product.subtitle}</p>
      )}
      <p className="product-card__meta">
        {KIND_LABEL[product.kind]}
        {product.variety !== null && <> · {product.variety.name}</>}
        {product.total_weight_ct !== null && <> · {product.total_weight_ct} ct</>}
      </p>
      <p className="product-card__price">
        <Money amount={product.price_amount} currency={product.currency} />
      </p>
      <Badge tone={product.availability ? 'positive' : 'neutral'} live>
        {product.availability ? 'Available' : 'Unavailable'}
      </Badge>
    </Card>
  );
}
