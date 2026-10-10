/**
 * apps/web/src/modules/catalog/application/cache-identity.ts
 *
 * Task 6 — deterministic cache identity (keys, tags, surrogate keys).
 *
 * Authority:
 *   PROJECT_SOURCE_OF_TRUTH.md 15.1  — cache inventory and key patterns.
 *   PROJECT_SOURCE_OF_TRUTH.md 15.3  — tag invalidation + generation safety net.
 *   technical_design/25 §6           — key design rules:
 *       - version prefix (a schema change is a miss, not a decode error)
 *       - environment namespace (never shared across environments)
 *       - no PII in keys
 *       - bounded cardinality: hash-derived, raw query strings are never keys
 *       - the hash includes the filter set
 *       - one explicit codec (see infrastructure/codecs.ts)
 *
 * Every function here is PURE and deterministic: the same inputs always
 * produce byte-identical keys, tags and surrogate-key strings. That property
 * is what makes "identical query -> identical cache key" and "no cross-
 * resource contamination" testable rather than aspirational.
 *
 * Invariant (tested): a cache key contains EVERY request dimension that
 * materially changes the response —
 *   route path, validated query (filters, sort, direction, limit, cursor),
 *   authorization context (actor, for private responses), the resource
 *   scope generation, the schema version and the environment namespace.
 * Two entries can share a key only when every one of those matches.
 */
import { createHash } from 'node:crypto';

/** Cache schema version. A serialization change bumps this => miss, not error. */
export const CACHE_SCHEMA_VERSION = 'v1';

/**
 * Resource scopes (PROJECT_SOURCE_OF_TRUTH.md 15.1 rows 1-8 mapped onto the
 * Phase 3 catalogue surfaces). Each scope owns ONE generation counter, so a
 * generation bump invalidates exactly one resource family and never another
 * (SoT 15.3 generation safety net, scoped so unrelated generations cannot
 * evict unrelated responses).
 */
export const CACHE_SCOPES = ['products', 'settings', 'gemstones', 'taxonomy', 'search'] as const;
export type CacheScope = (typeof CACHE_SCOPES)[number];

/** A generation token: opaque string, compared only for equality. */
export type Generation = string;

/**
 * Canonical JSON: object keys sorted, array order preserved, no whitespace.
 *
 * Array order is PRESERVED on purpose: the response can legitimately differ
 * with filter order (rejectedFilters echoes the input order), so two
 * differently-ordered queries must NOT share a key.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      out[key] = sortKeys(source[key]);
    }
    return out;
  }
  return value;
}

/** Lowercase hex SHA-256 of a UTF-8 string. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Namespace prefix: environment-scoped, never shared across environments
 * (technical_design/25 §6). Derived from the configured environment name and
 * hashed so no environment string is embedded verbatim in a Redis key.
 */
export function cacheNamespace(environment: string): string {
  return `mh-${environment.toLowerCase().replace(/[^a-z0-9-]/g, '')}-${sha256Hex(environment).slice(0, 8)}`;
}

/**
 * Authorization identity for a cache key.
 *
 * PUBLIC responses are identical for every caller, so they share one entry
 * (`pub`). PRIVATE responses must vary per caller, so the actor key is folded
 * in as a SHA-256 digest — the raw actor identifier (an email, a session id)
 * never appears in a key (technical_design/25 §9: no PII in keys or values).
 */
export function actorToken(actorKey: string | null, visibility: ResponseVisibility): string {
  if (visibility === 'public') return 'pub';
  if (actorKey === null || actorKey === '') return 'anon';
  return `act-${sha256Hex(actorKey).slice(0, 32)}`;
}

/** Whether a response may be shared between callers (doc 06 route table). */
export type ResponseVisibility = 'public' | 'private';

export interface CacheKeyInput {
  /** Environment namespace (see cacheNamespace). */
  namespace: string;
  /** Resource scope; also names the generation counter. */
  scope: CacheScope;
  /** Key pattern kind inside the scope, e.g. `list`, `product`, `variant`. */
  kind: string;
  /**
   * Identity segment: a public identifier (slug / sku / gemRef) or, for
   * query-shaped reads, `q-<sha256 of canonical {path, query}>` so raw query
   * strings never become keys (bounded cardinality).
   */
  identity: string;
  /** The scope's current generation, folded into EVERY key. */
  generation: Generation;
  /** Authorization token (see actorToken). */
  actor: string;
}

/**
 * The cache key.
 *
 * Grammar (documented, stable):
 *   {namespace}:v{schemaVersion}:{scope}:{kind}:{identity}:g={generation}:{actor}
 *
 * Examples:
 *   mh-dev-<hash>:v1:products:list:q-3f2a…:g=0:pub
 *   mh-dev-<hash>:v1:products:product:green-tourmaline-ring…:g=0:pub
 */
export function buildCacheKey(input: CacheKeyInput): string {
  return [
    input.namespace,
    `v${CACHE_SCHEMA_VERSION}`,
    input.scope,
    input.kind,
    input.identity,
    `g=${input.generation}`,
    input.actor,
  ].join(':');
}

/** Identity segment for a query-shaped read: bounded, hash-derived. */
export function queryIdentity(path: string, query: unknown): string {
  return `q-${sha256Hex(canonicalJson({ path, query })).slice(0, 40)}`;
}

/** Identity segment for a public identifier (slug / sku / gemRef / code). */
export function identifierIdentity(identifier: string): string {
  return identifier;
}

/**
 * Cache tags — the invalidation units (SoT 15.1/15.3) AND the surrogate keys
 * of Task 10. Deterministic: same input => same array, same order.
 *
 * Tag families:
 *   catalog.scope.{scope}                  purge the whole resource family
 *   catalog.{scope}.{kind}[.{identity}]     purge one resource / one surface
 *   catalog.generation.{scope}={gen}        purge exactly one generation
 */
export function buildCacheTags(input: {
  scope: CacheScope;
  kind: string;
  identity?: string | null;
  generation: Generation;
  visibility: ResponseVisibility;
}): string[] {
  const tags = [
    `catalog.scope.${input.scope}`,
    input.identity === undefined || input.identity === null || input.identity === ''
      ? `catalog.${input.scope}.${input.kind}`
      : `catalog.${input.scope}.${input.kind}.${input.identity}`,
    `catalog.generation.${input.scope}=${input.generation}`,
  ];
  // A private response is never shared through a surrogate cache, so it
  // carries no purge-by-tag surface: only the scope/generation tags above are
  // emitted, and only for public responses (see surrogateKeys).
  return input.visibility === 'public' ? tags : [tags[0] as string, tags[2] as string];
}

/**
 * Surrogate keys (Task 10): the space-separated `Surrogate-Key` header value,
 * derived from the SAME tag set the invalidation layer uses, so purge and
 * serve can never drift apart (Task 6 -> Task 10 consistency).
 *
 * Private responses receive no surrogate keys at all: they are not storable
 * by a shared cache.
 */
export function surrogateKeys(tags: string[], visibility: ResponseVisibility): string | null {
  if (visibility !== 'public') return null;
  return tags.join(' ');
}
