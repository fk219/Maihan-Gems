/**
 * apps/web/src/lib/site-origin.spec.ts
 *
 * The two resolution paths the request-scoped pages rely on:
 *   1. `SITE_URL` is the override and always wins;
 *   2. otherwise the origin comes from `x-forwarded-proto` + host.
 *
 * A deployment with neither produces `null` (the caller omits the URL), never
 * a guessed domain and never the old hard failure.
 */
import { describe, expect, it } from 'vitest';

import { configuredSiteOrigin, resolveSiteOrigin, type HeaderReader } from './site-origin.js';

function headers(entries: Record<string, string>): HeaderReader {
  const normalized = new Map(
    Object.entries(entries).map(([key, value]) => [key.toLowerCase(), value] as const),
  );
  return { get: (name) => normalized.get(name.toLowerCase()) ?? null };
}

describe('configuredSiteOrigin', () => {
  it('returns the configured base without a trailing slash', () => {
    expect(configuredSiteOrigin({ SITE_URL: 'https://maihan.example/' })).toBe('https://maihan.example');
  });

  it('is null when SITE_URL is absent or blank', () => {
    expect(configuredSiteOrigin({})).toBeNull();
    expect(configuredSiteOrigin({ SITE_URL: '   ' })).toBeNull();
  });
});

describe('resolveSiteOrigin — override path', () => {
  it('SITE_URL wins over the request headers', () => {
    const origin = resolveSiteOrigin(
      headers({ host: 'preview.internal:3000', 'x-forwarded-proto': 'http' }),
      { SITE_URL: 'https://maihan.example/' },
    );
    expect(origin).toBe('https://maihan.example');
  });
});

describe('resolveSiteOrigin — derived path', () => {
  it('uses x-forwarded-proto and the forwarded host', () => {
    const origin = resolveSiteOrigin(
      headers({
        'x-forwarded-host': 'shop.maihan.example',
        'x-forwarded-proto': 'https',
        host: '10.0.0.4:3000',
      }),
      {},
    );
    expect(origin).toBe('https://shop.maihan.example');
  });

  it('takes the first value of a comma-separated proxy chain', () => {
    const origin = resolveSiteOrigin(
      headers({
        'x-forwarded-host': 'shop.maihan.example, edge.internal',
        'x-forwarded-proto': 'https, http',
      }),
      {},
    );
    expect(origin).toBe('https://shop.maihan.example');
  });

  it('falls back to Host and defaults to https off loopback', () => {
    const origin = resolveSiteOrigin(headers({ host: 'preview.maihan.example' }), {});
    expect(origin).toBe('https://preview.maihan.example');
  });

  it('uses plain http on loopback when no proto header is present', () => {
    const origin = resolveSiteOrigin(headers({ host: 'localhost:3000' }), {});
    expect(origin).toBe('http://localhost:3000');
  });

  it('keeps an IPv6 authority intact', () => {
    const origin = resolveSiteOrigin(
      headers({ host: '[::1]:3000', 'x-forwarded-proto': 'http' }),
      {},
    );
    expect(origin).toBe('http://[::1]:3000');
  });

  it('ignores a forged protocol value and uses the truthful default', () => {
    const origin = resolveSiteOrigin(
      headers({ host: 'shop.maihan.example', 'x-forwarded-proto': 'javascript' }),
      {},
    );
    expect(origin).toBe('https://shop.maihan.example');
  });

  it('rejects a Host header that carries a path or a scheme', () => {
    expect(resolveSiteOrigin(headers({ host: 'evil.example/path' }), {})).toBeNull();
    expect(resolveSiteOrigin(headers({ host: 'https://evil.example' }), {})).toBeNull();
  });

  it('is null when neither SITE_URL nor a Host header exists', () => {
    expect(resolveSiteOrigin(null, {})).toBeNull();
    expect(resolveSiteOrigin(headers({}), {})).toBeNull();
  });
});

/**
 * The two request-scoped surfaces are pinned by name: the product JSON-LD base
 * and the cart canonical both go through `resolveSiteOrigin`, so neither can
 * reintroduce a runtime `SITE_URL` requirement.
 */
describe('page paths', () => {
  it('product JSON-LD base resolves without SITE_URL', () => {
    const base = resolveSiteOrigin(headers({ host: 'shop.maihan.example' }), {});
    expect(base).not.toBeNull();
    expect(`${base}/products/oval-sapphire-ring`).toBe(
      'https://shop.maihan.example/products/oval-sapphire-ring',
    );
  });

  it('cart canonical resolves without SITE_URL', () => {
    const base = resolveSiteOrigin(headers({ host: 'localhost:3000' }), {});
    expect(base === null ? null : `${base}/cart`).toBe('http://localhost:3000/cart');
  });

  it('both paths omit the URL when nothing truthful is available', () => {
    const base = resolveSiteOrigin(null, {});
    expect(base === null ? null : `${base}/cart`).toBeNull();
  });
});
