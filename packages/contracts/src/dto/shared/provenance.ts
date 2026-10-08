/**
 * packages/contracts/src/dto/shared/provenance.ts
 *
 * The provenance contract every Phase 3 product and stone response carries
 * (plan Phase 3 task 5): source URL, evidence status and import batch must
 * be answerable from any response, and "no response exposes a field whose
 * evidence status it does not also declare" (plan acceptance criteria).
 *
 * The evidence statuses are the Phase 2 evidence hierarchy OBSERVED /
 * EXTRACTED / PATTERN / INFERRED / UNKNOWN (Source of Truth 8.3, mirrored in
 * packages/domain). The contract REUSES the domain union — it never widens,
 * re-maps or re-transcribes it. Promotion of INFERRED to OBSERVED (or
 * UNKNOWN to VERIFIED — a status that exists only for documents, not rows)
 * is a Phase 12 curation act; the port can only echo the stored status.
 *
 * `importBatch` is the `import_batches.batch_key` of the import that created
 * the row (the provenance key the migration pipeline records), not a raw
 * internal UUID: internal ids never leave the repository layer (doc 07).
 */
import type { EvidenceStatus } from '@maihan/domain';

import { z } from 'zod';
import { EvidenceStatusSchema } from '../catalog/enums.js';

export type { EvidenceStatus };

/** A provenance field always declares the evidence status of the value it exposes. */
const sourceUrlField = z.string().url().nullable();

export const ProductProvenanceSchema = z
  .object({
    source_url: sourceUrlField,
    source_sku: z.string().nullable(),
    source_sku_derived: z.string().nullable(),
    import_batch: z.string().nullable(),
    price_evidence: EvidenceStatusSchema,
    sku_evidence: EvidenceStatusSchema,
  })
  .strict();

export type ProductProvenance = z.infer<typeof ProductProvenanceSchema>;

export const GemstoneProvenanceSchema = z
  .object({
    source_url: sourceUrlField,
    ref_evidence: EvidenceStatusSchema,
    price_evidence: EvidenceStatusSchema,
    import_batch: z.string().nullable(),
  })
  .strict();

export type GemstoneProvenance = z.infer<typeof GemstoneProvenanceSchema>;

export const SettingVariantProvenanceSchema = z
  .object({
    source_url: sourceUrlField,
    evidence_status: EvidenceStatusSchema,
    price_evidence: EvidenceStatusSchema,
    import_batch: z.string().nullable(),
  })
  .strict();

export type SettingVariantProvenance = z.infer<typeof SettingVariantProvenanceSchema>;

export const SettingProvenanceSchema = z
  .object({
    source_url: sourceUrlField,
    evidence_status: EvidenceStatusSchema,
    import_batch: z.string().nullable(),
  })
  .strict();

export type SettingProvenance = z.infer<typeof SettingProvenanceSchema>;
