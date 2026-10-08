/**
 * packages/contracts/src/dto/http/paths.ts
 *
 * Task 8 — path-parameter contracts shared by the API layer and the
 * generated OpenAPI (doc 06 validation rule 5: `gemRef`, `sku`, `slug` and
 * UUIDs are pattern-validated BEFORE any database access — and the pattern
 * documented in OpenAPI must be the pattern the handler enforces, so both
 * read this one schema).
 */
import { z } from 'zod';

/** Public identity segment: slug, sku, gemRef, design code. */
export const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

export const IdentifierSchema = z.string().regex(IDENTIFIER_PATTERN, {
  message: 'must match the public identity pattern [A-Za-z0-9][A-Za-z0-9._-]{0,199}',
});

export type Identifier = z.infer<typeof IdentifierSchema>;
