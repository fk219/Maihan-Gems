/**
 * packages/contracts/src/openapi/endpoints.ts
 *
 * Task 8 — the Phase 3 catalogue endpoint catalog: id, path template,
 * request schemas and response envelope, in ONE place.
 *
 * Why here and not in apps/web: OpenAPI must be generated from the contract
 * layer (plan task 8: "Generate OpenAPI from Zod DTOs"), and the route table
 * in apps/web must document exactly what exists. apps/web derives its route
 * table from THIS catalog (path + id), so a path string exists once, the
 * OpenAPI parity test compares handlers rather than two hand-kept lists, and
 * an endpoint cannot be documented without being implemented (its handler
 * key must exist — tested in apps/web).
 *
 * Evidence status: the endpoint set is the Phase 3 scope of the plan
 * (outputs: `/api/v1/products`, `/products/{slug}`, `/gemstones/{gemRef}`,
 * `/settings`, `/settings/{sku}`, `/taxonomy/*`) resolved against SoT 11.2 —
 * `[INFERRED / PROPOSED]` target API, per PROJECT_SOURCE_OF_TRUTH §11.
 */
import { z } from 'zod';
import {
  ColourListEnvelopeSchema,
  FacetDefinitionEnvelopeSchema,
  GemstoneDetailEnvelopeSchema,
  MetalListEnvelopeSchema,
  OriginListEnvelopeSchema,
  ProductDetailEnvelopeSchema,
  ProductListEnvelopeSchema,
  SettingDesignEnvelopeSchema,
  SettingListEnvelopeSchema,
  SettingVariantEnvelopeResponseSchema,
  VarietyListEnvelopeSchema,
} from '../dto/http/envelopes.js';
import { ProductListQueryParamsSchema, SettingListQueryParamsSchema } from '../dto/catalog/http-query.js';
import { IdentifierSchema } from '../dto/http/paths.js';

export interface CatalogEndpoint {
  /** Handler key in apps/web (`HANDLERS[endpoint.id]`). */
  readonly id: string;
  /** OpenAPI path template with the `/api/v1` base. */
  readonly path: string;
  readonly summary: string;
  /** Flat query-parameter schema (GET list endpoints). */
  readonly query?: z.AnyZodObject;
  /** Path-parameter schema, keyed by template placeholder. */
  readonly pathParams?: z.AnyZodObject;
  /** The success envelope schema — the SAME schema handlers return. */
  readonly response: z.ZodTypeAny;
  /** Whether the port can answer this route with a not-found contract error. */
  readonly canRespondNotFound: boolean;
}

export const CATALOG_ENDPOINTS: readonly CatalogEndpoint[] = [
  {
    id: 'listProducts',
    path: '/api/v1/products',
    summary: 'Keyset-paginated product listing with structured filters, single-pass facets and rejectedFilters',
    query: ProductListQueryParamsSchema,
    response: ProductListEnvelopeSchema,
    canRespondNotFound: false,
  },
  {
    id: 'productDetail',
    path: '/api/v1/products/{slug}',
    summary: 'Product detail by public slug, with provenance',
    pathParams: z.object({ slug: IdentifierSchema }),
    response: ProductDetailEnvelopeSchema,
    canRespondNotFound: true,
  },
  {
    id: 'gemstoneDetail',
    path: '/api/v1/gemstones/{gemRef}',
    summary: 'Gemstone detail by public gem reference, with per-stone rows and provenance',
    pathParams: z.object({ gemRef: IdentifierSchema }),
    response: GemstoneDetailEnvelopeSchema,
    canRespondNotFound: true,
  },
  {
    id: 'listSettings',
    path: '/api/v1/settings',
    summary: 'Setting design listing with structured filters, facets and rejectedFilters',
    query: SettingListQueryParamsSchema,
    response: SettingListEnvelopeSchema,
    canRespondNotFound: false,
  },
  {
    id: 'settingVariant',
    path: '/api/v1/settings/{sku}',
    summary: 'Single setting variant with its design',
    pathParams: z.object({ sku: IdentifierSchema }),
    response: SettingVariantEnvelopeResponseSchema,
    canRespondNotFound: true,
  },
  {
    id: 'settingDesign',
    path: '/api/v1/settings/designs/{designCode}',
    summary: 'Setting design detail with its variants',
    pathParams: z.object({ designCode: IdentifierSchema }),
    response: SettingDesignEnvelopeSchema,
    canRespondNotFound: true,
  },
  {
    id: 'taxonomyVarieties',
    path: '/api/v1/taxonomy/varieties',
    summary: 'Gemstone varieties with species linkage and evidence status',
    response: VarietyListEnvelopeSchema,
    canRespondNotFound: false,
  },
  {
    id: 'taxonomyColours',
    path: '/api/v1/taxonomy/colors',
    summary: 'Colour tree with modifiers and evidence status',
    response: ColourListEnvelopeSchema,
    canRespondNotFound: false,
  },
  {
    id: 'taxonomyOrigins',
    path: '/api/v1/taxonomy/origins',
    summary: 'Origin list with evidence status',
    response: OriginListEnvelopeSchema,
    canRespondNotFound: false,
  },
  {
    id: 'taxonomyMetals',
    path: '/api/v1/taxonomy/metals',
    summary: 'Metal codes with labels',
    response: MetalListEnvelopeSchema,
    canRespondNotFound: false,
  },
  {
    id: 'taxonomyFacets',
    path: '/api/v1/taxonomy/facets',
    summary:
      'Facet definitions: the closed filter dimensions and their value vocabulary (value counts are computed per query on the list endpoints)',
    response: FacetDefinitionEnvelopeSchema,
    canRespondNotFound: false,
  },
];
