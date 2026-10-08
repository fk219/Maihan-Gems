/**
 * apps/web/src/api/query.ts
 *
 * Task 8 — request validation at the HTTP boundary.
 *
 * Three jobs, all schema-driven so there is exactly one description of each
 * parameter (doc 06 "Validation rules": every query parameter has a Zod
 * schema in packages/contracts; unknown fields are a 400, not ignored input):
 *
 *   1. COERCE the flat query string into the JSON-shaped value the Zod
 *      contract expects (repeated params -> arrays, "true" -> boolean,
 *      numerals -> number). The Zod schema itself decides the types — this
 *      module walks the schema, it does not carry a second copy of the
 *      field list.
 *
 *   2. PARSE with the flat contract (`*QueryParamsSchema`), which is
 *      `.strict()`: an unknown parameter rejects with a machine-readable
 *      path. Defaulted fields (limit/sort/direction) are applied here, so
 *      semantically identical requests produce identical cache keys (Task 6).
 *
 *   3. NEST the parsed flat parameters into the port input shape
 *      (`filters`), the exact inverse of the composition in contracts'
 *      http-query.ts.
 *
 * Identity path segments are pattern-validated HERE, before any database
 * access (doc 06 validation rule 5).
 */
import { z } from 'zod';
import {
  IdentifierSchema,
  ProductListQueryParamsSchema,
  SettingListQueryParamsSchema,
  type ProductListQueryParams,
  type ProductListQuery,
  type SettingListQueryParams,
  type SettingListQuery,
} from '@maihan/contracts';

/** Raw query string values, in arrival order. */
export type RawQuery = Record<string, string[]>;

export function readRawQuery(url: URL): RawQuery {
  const raw: RawQuery = {};
  for (const [key, value] of url.searchParams.entries()) {
    const existing = raw[key];
    if (existing === undefined) raw[key] = [value];
    else existing.push(value);
  }
  return raw;
}

/** Unwrap wrappers to the schema that determines the value's shape. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  for (;;) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
      current = current.unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = current.removeDefault();
    } else if (current instanceof z.ZodEffects) {
      current = current.innerType();
    } else {
      return current;
    }
  }
}

/**
 * Coerce one parameter's raw values against its schema.
 * Anything that does not match passes through UNCOERCED so the contract
 * itself produces the 400 (never a guessed conversion).
 */
function coerceValue(schema: z.ZodTypeAny, rawValues: string[]): unknown {
  const inner = unwrap(schema);

  if (inner instanceof z.ZodArray) {
    const element = unwrap(inner.element);
    // Each repeated parameter value is coerced AS A SINGLE element.
    return rawValues.map((value) => coerceScalar(element, [value]));
  }
  return coerceScalar(inner, rawValues);
}

function coerceScalar(schema: z.ZodTypeAny, rawValues: string[]): unknown {
  const single = rawValues[0];
  if (single === undefined) return rawValues;
  if (schema instanceof z.ZodNumber) {
    // Multiple values for a scalar -> keep the array: z.number() rejects it.
    return rawValues.length === 1 ? Number(single) : rawValues;
  }
  if (schema instanceof z.ZodBoolean) {
    if (rawValues.length !== 1) return rawValues;
    if (single === 'true') return true;
    if (single === 'false') return false;
    return single; // rejected by z.boolean() with a precise path
  }
  return rawValues.length === 1 ? single : rawValues;
}

/**
 * Build the parsed contract input from a flat query string.
 * Unknown keys are passed through verbatim so `.strict()` can reject them
 * with their name in `details` — they are never silently dropped.
 */
export function coerceParams<S extends z.ZodTypeAny>(schema: S, raw: RawQuery): unknown {
  const objectSchema = unwrap(schema);
  if (!(objectSchema instanceof z.ZodObject)) {
    throw new Error('query schema must be a ZodObject');
  }
  const shape = objectSchema.shape as Record<string, z.ZodTypeAny>;
  const out: Record<string, unknown> = {};

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const values = raw[key];
    if (values === undefined) continue;
    out[key] = coerceValue(fieldSchema, values);
  }

  for (const [key, values] of Object.entries(raw)) {
    if (shape[key] === undefined) out[key] = values.length === 1 ? values[0] : values;
  }

  return out;
}

/** Products list: parse the HTTP query and re-nest `filters` for the port. */
export function parseProductListQuery(raw: RawQuery): ProductListQuery {
  const params = ProductListQueryParamsSchema.parse(coerceParams(ProductListQueryParamsSchema, raw)) as ProductListQueryParams;
  const { limit, cursor, sort, direction, ...filters } = params;
  return { limit, cursor, sort, direction, filters };
}

/** Settings list: parse the HTTP query and re-nest `filters` for the port. */
export function parseSettingListQuery(raw: RawQuery): SettingListQuery {
  const params = SettingListQueryParamsSchema.parse(coerceParams(SettingListQueryParamsSchema, raw)) as SettingListQueryParams;
  const { limit, cursor, ...filters } = params;
  return { limit, cursor, filters };
}

/**
 * Path-segment identity pattern (doc 06 validation rule 5), before any DB
 * access. The pattern itself is the shared contract schema, so the value the
 * handler enforces is the value OpenAPI documents.
 */
export function requireIdentifier(value: string | undefined, field: string): string {
  const result = IdentifierSchema.safeParse(value);
  if (!result.success) {
    throw new z.ZodError(
      result.error.issues.map((issue) => ({ ...issue, path: [field] })),
    );
  }
  return result.data;
}
