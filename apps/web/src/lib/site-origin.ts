/**
 * apps/web/src/lib/site-origin.ts
 *
 * The canonical origin for Incoming Request surfaces.
 *
 * `SITE_URL` is the deployment's declared canonical base and always wins. When
 * it is absent — a preview, a container, a fresh clone — the origin is derived
 * from the incoming request (`x-forwarded-proto` + host, with
 * `x-forwarded-host` preferred when a proxy sets it). The request is the only
 * other truthful source: it is the origin the visitor actually used.
 *
 * This deliberately does NOT guess a production domain. With neither a
 * configured base nor a request header the answer is `null`, and the caller
 * omits the canonical/JSON-LD URL rather than emitting a wrong one.
 *
 * The sitemap keeps using the stricter `siteBaseUrl()` in `lib/sitemap.ts`: a
 * sitemap is generated OUTSIDE a request and must never invent a host, so there
 * `SITE_URL` stays mandatory. This module exists for request-scoped pages.
 */

export interface HeaderReader {
  get(name: string): string | null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLoopback(hostname: string): boolean {
  const name = hostname.toLowerCase();
  return (
    name === 'localhost' ||
    name === '127.0.0.1' ||
    name === '[::1]' ||
    name === '::1' ||
    name.endsWith('.localhost')
  );
}

/**
 * Split a Host header into hostname and the optional port, rejecting anything
 * that is not a plain authority. A value containing a path, whitespace or a
 * scheme is not a Host header and must not become a canonical base.
 */
function plainAuthority(raw: string): { hostname: string; authority: string } | null {
  const value = raw.trim();
  if (value.length === 0) return null;
  if (/[\s/\\]/.test(value)) return null;
  if (value.includes('://')) return null;

  // IPv6 literal: [::1]:3000
  const ipv6 = /^\[([0-9a-fA-F:]+)\](?::(\d{1,5}))?$/.exec(value);
  if (ipv6 !== null) {
    return { hostname: `[${ipv6[1]}]`, authority: value };
  }
  const parts = value.split(':');
  if (parts.length > 2) return null;
  const hostname = parts[0] ?? '';
  if (hostname.length === 0) return null;
  if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) return null;
  if (parts.length === 2 && !/^\d{1,5}$/.test(parts[1] as string)) return null;
  return { hostname, authority: value };
}

/** The configured base, or null. Never throws. */
export function configuredSiteOrigin(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env['SITE_URL'];
  if (raw === undefined || raw.trim().length === 0) return null;
  return stripTrailingSlash(raw.trim());
}

/**
 * Resolve the canonical origin for an incoming request.
 *
 * Order:
 *   1. `SITE_URL` when set (the deployment override);
 *   2. `x-forwarded-host` (the proxy's public host) or `host`;
 *   3. `x-forwarded-proto`, defaulting to https — except on loopback, where
 *      plain-http local development is the only truthful assumption.
 */
export function resolveSiteOrigin(
  headers: HeaderReader | null,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const configured = configuredSiteOrigin(env);
  if (configured !== null) return configured;

  if (headers === null) return null;
  const rawHost = headers.get('x-forwarded-host') ?? headers.get('host');
  if (rawHost === null) return null;
  const authority = plainAuthority(rawHost.split(',')[0] ?? '');
  if (authority === null) return null;

  const forwardedProto = headers.get('x-forwarded-proto');
  const protoCandidate = forwardedProto === null ? '' : (forwardedProto.split(',')[0] ?? '').trim().toLowerCase();
  const proto =
    protoCandidate === 'http' || protoCandidate === 'https'
      ? protoCandidate
      : isLoopback(authority.hostname)
        ? 'http'
        : 'https';

  return `${proto}://${authority.authority}`;
}
