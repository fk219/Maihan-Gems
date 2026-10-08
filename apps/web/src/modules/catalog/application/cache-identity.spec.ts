/**
 * Task 6 — cache key / tag determinism tests.
 *
 * Covers the required matrix:
 *   1. identical query -> identical cache key
 *   2. different filters -> different cache key
 *   3. different pagination cursor -> correct cache differentiation
 *   4. different sort -> correct cache differentiation
 *   5. different resource -> different cache namespace
 *   8. deterministic cache tags
 *   9. deterministic surrogate/cache metadata
 *  10. authorization-sensitive variation
 */
import { describe, expect, it } from 'vitest';
import {
  CACHE_SCHEMA_VERSION,
  actorToken,
  buildCacheKey,
  buildCacheTags,
  cacheNamespace,
  canonicalJson,
  queryIdentity,
  sha256Hex,
  surrogateKeys,
} from './cache-identity.js';

const NS = cacheNamespace('dev');

const base = {
  namespace: NS,
  scope: 'products',
  kind: 'list',
  identity: queryIdentity('/api/v1/products', { limit: 24, sort: 'price', direction: 'asc', filters: {} }),
  generation: '0',
  actor: 'pub',
} as const;

describe('cache key determinism', () => {
  it('1. identical query -> identical cache key', () => {
    const a = queryIdentity('/api/v1/products', {
      filters: { variety: ['tsavorite-garnet'], metal: ['W14'] },
      limit: 24,
      sort: 'price',
      direction: 'asc',
    });
    const b = queryIdentity('/api/v1/products', {
      limit: 24,
      direction: 'asc',
      sort: 'price',
      filters: { metal: ['W14'], variety: ['tsavorite-garnet'] },
    });
    expect(a).toBe(b);
    expect(buildCacheKey({ ...base, identity: a })).toBe(buildCacheKey({ ...base, identity: b }));
  });

  it('canonical JSON is key-order independent but array-order sensitive', () => {
    expect(canonicalJson({ a: 1, b: { c: 2, d: 3 } })).toBe(canonicalJson({ b: { d: 3, c: 2 }, a: 1 }));
    // Filter order is part of the response (rejectedFilters echoes input order),
    // so differently-ordered arrays must NOT collide.
    expect(canonicalJson({ f: ['a', 'b'] })).not.toBe(canonicalJson({ f: ['b', 'a'] }));
  });

  it('2. different filters -> different cache key', () => {
    const none = queryIdentity('/api/v1/products', { filters: {}, limit: 24 });
    const variety = queryIdentity('/api/v1/products', { filters: { variety: ['tsavorite-garnet'] }, limit: 24 });
    const colour = queryIdentity('/api/v1/products', { filters: { color: ['green'] }, limit: 24 });
    expect(none).not.toBe(variety);
    expect(variety).not.toBe(colour);
  });

  it('3. different pagination cursor -> different cache key', () => {
    const first = queryIdentity('/api/v1/products', { cursor: undefined, limit: 24 });
    const next = queryIdentity('/api/v1/products', { cursor: 'eyJ2IjoxfQ', limit: 24 });
    expect(first).not.toBe(next);
  });

  it('4. different sort / direction / limit -> different cache key', () => {
    const price = queryIdentity('/api/v1/products', { sort: 'price', direction: 'asc', limit: 24 });
    const weight = queryIdentity('/api/v1/products', { sort: 'weight', direction: 'asc', limit: 24 });
    const desc = queryIdentity('/api/v1/products', { sort: 'price', direction: 'desc', limit: 24 });
    const page = queryIdentity('/api/v1/products', { sort: 'price', direction: 'asc', limit: 50 });
    expect(new Set([price, weight, desc, page]).size).toBe(4);
  });

  it('5. different resource -> different cache namespace (scope in every key)', () => {
    const product = buildCacheKey({ ...base, scope: 'products', identity: 'same-identity' });
    const setting = buildCacheKey({ ...base, scope: 'settings', identity: 'same-identity' });
    const gemstone = buildCacheKey({ ...base, scope: 'gemstones', identity: 'same-identity' });
    const taxonomy = buildCacheKey({ ...base, scope: 'taxonomy', identity: 'same-identity' });
    expect(new Set([product, setting, gemstone, taxonomy]).size).toBe(4);
    expect(product).toContain(':products:');
    expect(taxonomy).toContain(':taxonomy:');
  });

  it('key carries schema version, namespace, generation and actor (no dimension missing)', () => {
    const key = buildCacheKey(base);
    expect(key).toContain(`v${CACHE_SCHEMA_VERSION}`);
    expect(key.startsWith(`${NS}:`)).toBe(true);
    expect(key).toContain(':g=0:');
    expect(key.endsWith(':pub')).toBe(true);
  });

  it('identical inputs produce byte-identical keys across invocations', () => {
    const keys = Array.from({ length: 50 }, () => buildCacheKey(base));
    expect(new Set(keys).size).toBe(1);
  });

  it('environment namespaces differ and are never shared across environments', () => {
    const dev = cacheNamespace('dev');
    const prod = cacheNamespace('production');
    expect(dev).not.toBe(prod);
    expect(dev.startsWith('mh-dev-')).toBe(true);
    expect(prod.startsWith('mh-production-')).toBe(true);
    // Names that sanitize to the same prefix still differ (hash suffix).
    expect(cacheNamespace('dev')).toBe(dev);
    expect(cacheNamespace('d.e.v')).not.toBe(dev);
  });

  it('raw query strings never appear in a key (bounded, hash-derived identity)', () => {
    const identity = queryIdentity('/api/v1/products', {
      filters: { variety: ['a-very-distinctive-variety-slug'] },
      limit: 24,
    });
    expect(identity).not.toContain('a-very-distinctive-variety-slug');
    expect(identity).toMatch(/^q-[0-9a-f]{40}$/);
  });
});

describe('cache tags (invalidation units)', () => {
  const tagInput = {
    scope: 'products',
    kind: 'product',
    identity: 'some-slug',
    generation: '3',
    visibility: 'public',
  } as const;

  it('8. tags are deterministic', () => {
    const a = buildCacheTags(tagInput);
    const b = buildCacheTags({ ...tagInput });
    expect(a).toEqual(b);
    expect(a).toEqual([
      'catalog.scope.products',
      'catalog.products.product.some-slug',
      'catalog.generation.products=3',
    ]);
  });

  it('list surfaces do not get per-query tags (tag cardinality stays bounded)', () => {
    // The service passes identity=null for list/all surfaces (see
    // catalog-query-service), so the query hash never becomes a tag.
    const tags = buildCacheTags({
      scope: 'products',
      kind: 'list',
      identity: null,
      generation: '0',
      visibility: 'public',
    });
    expect(tags).toContain('catalog.products.list');
    expect(tags.filter((t) => t.startsWith('catalog.products.list.')).length).toBe(0);
  });

  it('tags of different scopes never collide', () => {
    const products = buildCacheTags({ ...tagInput, generation: '0' });
    const settings = buildCacheTags({ ...tagInput, scope: 'settings', generation: '0' });
    expect(products.some((t) => settings.includes(t))).toBe(false);
  });

  it('generation tag changes with the generation (purge-by-generation is exact)', () => {
    const before = buildCacheTags({ ...tagInput, generation: '3' });
    const after = buildCacheTags({ ...tagInput, generation: '4' });
    expect(before[2]).not.toBe(after[2]);
    expect(before[0]).toBe(after[0]);
  });
});

describe('surrogate keys (Task 10 metadata)', () => {
  it('9. surrogate metadata is deterministic and derived from the same tags', () => {
    const tags = buildCacheTags({
      scope: 'settings',
      kind: 'variant',
      identity: 'JS1409W14',
      generation: '2',
      visibility: 'public',
    });
    const first = surrogateKeys(tags, 'public');
    const second = surrogateKeys([...tags], 'public');
    expect(first).toBe(second);
    expect(first).toBe(tags.join(' '));
    expect(first).toContain('catalog.generation.settings=2');
  });

  it('private responses carry no surrogate keys', () => {
    const tags = buildCacheTags({
      scope: 'products',
      kind: 'product',
      identity: 'slug',
      generation: '0',
      visibility: 'private',
    });
    expect(surrogateKeys(tags, 'private')).toBeNull();
  });
});

describe('authorization-sensitive variation', () => {
  it('10. private responses vary by actor; public responses share one entry', () => {
    const priv = 'private' as const;
    const a = actorToken('user-a@example.com', priv);
    const b = actorToken('user-b@example.com', priv);
    expect(a).not.toBe(b);
    expect(actorToken('user-a@example.com', priv)).toBe(a);
    expect(actorToken(null, priv)).toBe('anon');

    // Public responses are identical for every caller -> one shared token.
    expect(actorToken('user-a@example.com', 'public')).toBe(actorToken('user-b@example.com', 'public'));
    expect(actorToken(null, 'public')).toBe('pub');
  });

  it('actor identity is hashed, never present raw in a key (no PII in keys)', () => {
    const actorKey = 'session-user@example.com';
    const key = buildCacheKey({
      ...base,
      scope: 'products',
      kind: 'product',
      actor: actorToken(actorKey, 'private'),
    });
    expect(key).not.toContain(actorKey);
    expect(key).not.toContain('session-user');
    expect(sha256Hex(actorKey).slice(0, 32)).toContain(key.slice(key.indexOf('act-') + 4, 36));
  });
});
