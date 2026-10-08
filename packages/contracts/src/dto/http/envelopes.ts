/**
 * packages/contracts/src/dto/http/envelopes.ts
 *
 * Task 8 — the documented HTTP envelopes, composed from the existing
 * catalogue DTOs. One envelope for success, one for errors; OpenAPI is
 * generated from exactly these schemas, so the documented surface and the
 * executed surface cannot diverge.
 *
 * Authority:
 *   SoT 11.2 response shape — `{ "data": [...], "meta": {...}, "facets": {...} }`;
 *   plan Phase 3 acceptance — unknown filters surface as `rejectedFilters`
 *     with a reason (camelCase wire name; the port's `rejected_filters`
 *     result field is renamed ONCE, here, at the HTTP boundary);
 *   SoT 10.4 / doc 07 §4 — the single error envelope:
 *     `{ "error": { code, message, details?, requestId, traceId } }`.
 *
 * Composition rule: every payload field comes from a Phase 3 DTO already
 * committed (entities / facets / filters / provenance). This module adds
 * envelope WRAPPERS only — no field is invented, and what OpenAPI documents
 * is exactly what handlers return (tested in apps/web).
 */
import { z } from 'zod';
import {
  ProductDetailSchema,
  ProductSummarySchema,
  GemstoneDetailSchema,
  SettingDetailSchema,
} from '../catalog/entities.js';
import { SettingVariantEnvelopeSchema } from '../catalog/queries.js';
import { FacetSetSchema, FacetDefinitionListSchema } from '../catalog/facets.js';
import { PageMetaSchema, RejectedFilterSchema } from '../catalog/filters.js';
import {
  ColourSchema,
  MetalSchema,
  OriginSchema,
  VarietySchema,
} from '../catalog/taxonomy.js';
import { ContractErrorCodeSchema } from '../../errors.js';

/** `{ data }` wrapper — the documented detail-response shape (SoT 11.2, 11.4). */
const dataEnvelope = <T extends z.ZodTypeAny>(payload: T) =>
  z.object({ data: payload }).strict();

// ─── Success envelopes ────────────────────────────────────────────────────────

export const ProductListEnvelopeSchema = z
  .object({
    data: z.array(ProductSummarySchema),
    meta: PageMetaSchema,
    facets: FacetSetSchema,
    rejectedFilters: z.array(RejectedFilterSchema),
  })
  .strict();

export const SettingListEnvelopeSchema = z
  .object({
    data: z.array(SettingDetailSchema),
    meta: PageMetaSchema,
    facets: FacetSetSchema,
    rejectedFilters: z.array(RejectedFilterSchema),
  })
  .strict();

export const ProductDetailEnvelopeSchema = dataEnvelope(ProductDetailSchema);
export const GemstoneDetailEnvelopeSchema = dataEnvelope(GemstoneDetailSchema);
export const SettingDesignEnvelopeSchema = dataEnvelope(SettingDetailSchema);
export const SettingVariantEnvelopeResponseSchema = dataEnvelope(SettingVariantEnvelopeSchema);

/** `/taxonomy/varieties` — SoT 11.2: varieties with species linkage. */
export const VarietyListEnvelopeSchema = dataEnvelope(z.array(VarietySchema));
/** `/taxonomy/colors` — the colour tree with modifiers. */
export const ColourListEnvelopeSchema = dataEnvelope(z.array(ColourSchema));
/** `/taxonomy/origins` — origin list. */
export const OriginListEnvelopeSchema = dataEnvelope(z.array(OriginSchema));
/** `/taxonomy/metals` — the metal codes. */
export const MetalListEnvelopeSchema = dataEnvelope(z.array(MetalSchema));
/** `/taxonomy/facets` — filter definitions (counts live on the list responses). */
export const FacetDefinitionEnvelopeSchema = dataEnvelope(FacetDefinitionListSchema);

// ─── Error envelope ───────────────────────────────────────────────────────────

/**
 * SoT 10.4: ONE error envelope, closed code registry, machine-readable
 * `details`, request/trace correlation echoed on every error response.
 */
export const ErrorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: ContractErrorCodeSchema,
        message: z.string().min(1),
        details: z.array(z.record(z.unknown())).optional(),
        requestId: z.string().min(1),
        traceId: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type ProductListEnvelope = z.infer<typeof ProductListEnvelopeSchema>;
export type SettingListEnvelope = z.infer<typeof SettingListEnvelopeSchema>;
