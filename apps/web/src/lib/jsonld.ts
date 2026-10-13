/**
 * apps/web/src/lib/jsonld.ts
 *
 * JSON-LD builders (Phase 4 Task 8).
 *
 * Authority: PROJECT_SOURCE_OF_TRUTH.md 12.8 — "JSON-LD: `Product` with
 * `offers`, `BreadcrumbList`, `Organization` with the observed address and
 * phone". The source also emitted `WebSite` and `LocalBusiness` [OBSERVED];
 * `Organization` is the target's schema.org-safe equivalent of the observed
 * `LocalBusiness`.
 *
 * Rules honoured here:
 *   - Every field is copied from the Phase 3 contract DTOs or the observed
 *     SoT evidence — nothing is invented. Optional properties the evidence
 *     does not support (images, ratings, reviews, brand, GTIN) are OMITTED,
 *     not fabricated.
 *   - `offers` is emitted only when `price_evidence` is OBSERVED — an offer
 *     without verified price evidence would be fabricated commerce data.
 *   - Availability maps the DTO flag to the schema.org ItemAvailability enum.
 *   - Serialization is safe: JSON.stringify with a replacer that escapes
 *     < > & and U+2028/U+2029, so the payload can never close the <script>
 *     element or inject markup.
 *   - Builders are pure and deterministic for identical input.
 */
import { STOREFRONT_CONTACT } from '@maihan/config';
import type { ProductDetailReadModel } from '@maihan/contracts';

import { siteBaseUrl } from './sitemap.js';

/** The canonical production base URL (shared policy with the sitemap). */
export { siteBaseUrl };

/**
 * Serialise a JSON-LD value for embedding in a <script type="application/ld+json">.
 * JSON.stringify alone does not escape `<`, `>` or `&`; a product title like
 * `</script><script>alert(1)</script>` would otherwise break out. U+2028 and
 * U+2029 are escaped for JS-embedding safety as well.
 *
 * Implemented as a post-processing pass over the JSON text (NOT a replacer —
 * a replacer's return value is itself re-serialised, so inserting `\u003c`
 * there double-escapes the backslash and corrupts the data).
 */
export function serializeJsonLd(node: unknown): string {
  return JSON.stringify(node)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Absolute URL against the canonical base (trailing slashes stripped once). */
export function absoluteUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  if (path === '/' || path === '') return `${b}/`;
  return `${b}${path.startsWith('/') ? path : `/${path}`}`;
}

// ─── Organization ─────────────────────────────────────────────────────────────

/**
 * Public Maihan identity for storefront JSON-LD. NGC source contact details
 * are not copied onto the rebuild.
 */
export const ORGANIZATION_EVIDENCE = {
  name: STOREFRONT_CONTACT.brand,
  telephone: STOREFRONT_CONTACT.phoneDisplay.replace(/\s+/g, ''),
  streetAddress: STOREFRONT_CONTACT.addressLine,
  addressLocality: STOREFRONT_CONTACT.city,
  addressRegion: STOREFRONT_CONTACT.region,
} as const;

/**
 * The site-wide Organization payload, or NULL when no canonical base URL is
 * configured. Static pages (e.g. /_not-found) prerender without SITE_URL and
 * must not fabricate a domain — omitting the entity is the honest fallback.
 * Surfaces whose correctness DEPENDS on the canonical base (sitemap, product
 * canonical URLs) still fail loudly via siteBaseUrl(); a static shell without
 * the Organization entity is safe to omit.
 */
export function organizationJsonLdPayload(env: Record<string, string | undefined> = process.env): string | null {
  const raw = env['SITE_URL'];
  if (raw === undefined || raw.trim() === '') return null;
  return serializeJsonLd({ '@context': 'https://schema.org', ...organizationNode(siteBaseUrl(env)) });
}

/** The Organization node — observed identity only. */
export function organizationNode(base: string): Record<string, unknown> {
  const a = ORGANIZATION_EVIDENCE;
  return {
    '@type': 'Organization',
    name: a.name,
    url: absoluteUrl(base, '/'),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: a.telephone,
        contactType: 'customer service',
        address: {
          '@type': 'PostalAddress',
          streetAddress: a.streetAddress,
          addressLocality: a.addressLocality,
          addressRegion: a.addressRegion,
          addressCountry: 'AE',
        },
      },
    ],
  };
}

// ─── BreadcrumbList ───────────────────────────────────────────────────────────

/** One breadcrumb, the same shape the pages already build for <Breadcrumbs>. */
export interface JsonLdBreadcrumb {
  readonly label: string;
  readonly href?: string;
}

/**
 * The BreadcrumbList node. Mirrors the on-page Breadcrumbs component: a crumb
 * with an `href` is a linked ancestor; the last crumb carries the current
 * page's name (its `item` is included only when the page passes a canonical
 * href for it).
 */
export function breadcrumbListNode(base: string, crumbs: readonly JsonLdBreadcrumb[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => {
      if (crumb.label.trim() === '') {
        throw new Error(`jsonld: breadcrumb ${String(index)} has an empty name — a ListItem without a name is invalid`);
      }
      const item: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
      };
      if (crumb.href !== undefined) item['item'] = absoluteUrl(base, crumb.href);
      return item;
    }),
  };
}

// ─── Product ──────────────────────────────────────────────────────────────────

function availabilityNode(available: boolean): string {
  return available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

/**
 * The Product node for a product-detail page, grounded ONLY in the Phase 3
 * ProductDetail contract:
 *   - `sku` = the observed source SKU, else the clearly-labelled derived SKU;
 *     omitted when the DTO carries neither (no invention).
 *   - `mpn` = the setting-variant SKU for configured pieces (the observed
 *     source emitted `mpn`); omitted when there is no setting variant.
 *   - `brand` is OMITTED: the contracts carry no authoritative brand identity.
 *   - `offers` present ONLY when `price_evidence` is OBSERVED.
 *   - No `image` (no media field on the DTO), no `aggregateRating`/`review`,
 *     no `gtin`, no `priceValidUntil`, no `itemCondition` — none exist.
 */
export function productNode(base: string, detail: ProductDetailReadModel): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Product',
    name: detail.title,
    url: absoluteUrl(base, `/products/${detail.slug}`),
  };

  const sku = detail.provenance.source_sku ?? detail.provenance.source_sku_derived;
  if (sku !== null) node['sku'] = sku;

  if (detail.setting_variant !== null) node['mpn'] = detail.setting_variant.sku;

  const description = detail.short_description ?? detail.description ?? detail.seo_description;
  if (description !== null) node['description'] = description;

  if (detail.variety !== null) node['category'] = detail.variety.name;

  if (detail.provenance.price_evidence === 'OBSERVED') {
    node['offers'] = {
      '@type': 'Offer',
      url: absoluteUrl(base, `/products/${detail.slug}`),
      price: detail.price_amount,
      priceCurrency: detail.currency,
      availability: availabilityNode(detail.availability),
    };
  }

  return node;
}

/**
 * The full product-page payload: a `@graph` with the Product, its
 * BreadcrumbList and the Organization (stable `@id`, so the entity is shared,
 * not duplicated, across pages). Deterministic.
 */
export function productJsonLd(base: string, detail: ProductDetailReadModel, crumbs: readonly JsonLdBreadcrumb[]): string {
  const org = organizationNode(base);
  org['@id'] = `${base.replace(/\/+$/, '')}/#organization`;
  return serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [productNode(base, detail), breadcrumbListNode(base, crumbs), org],
  });
}
