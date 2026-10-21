/**
 * apps/web/src/app/headers.spec.ts
 *
 * SECURITY-HEADERS-TEST (P1-30): the platform security headers configured in
 * next.config.ts (CSP, X-Frame-Options, nosniff, Referrer-Policy,
 * Permissions-Policy, COOP + HSTS-in-production) are pinned here so a next
 * upgrade or config refactor cannot silently drop them.
 */
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, buildSecurityHeaders } from '../next.config.js';

describe('platform security headers (next.config.ts contract, P1-30)', () => {
  it('X-Frame-Options DENY, nosniff and Referrer-Policy are always present', () => {
    const xfo = SECURITY_HEADERS.find((h) => h.key === 'X-Frame-Options');
    const nosniff = SECURITY_HEADERS.find((h) => h.key === 'X-Content-Type-Options');
    const rp = SECURITY_HEADERS.find((h) => h.key === 'Referrer-Policy');
    expect(xfo?.value).toBe('DENY');
    expect(nosniff?.value).toBe('nosniff');
    expect(rp?.value).toBe('strict-origin-when-cross-origin');
  });

  it('Permissions-Policy keeps camera on-device only and kills geolocation/mic', () => {
    const pp = SECURITY_HEADERS.find((h) => h.key === 'Permissions-Policy');
    expect(pp?.value).toBe('camera=(self), microphone=(), geolocation=()');
  });

  it('CSP hardens the document surface (no framing, no objects, self default)', () => {
    const csp = SECURITY_HEADERS.find((h) => h.key === 'Content-Security-Policy')!.value;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('production record adds HSTS preload; dev does not', () => {
    const prodHeaders = buildSecurityHeaders({ isDev: false, isProductionRecord: true });
    const hsts = prodHeaders.find((h) => h.key === 'Strict-Transport-Security');
    expect(hsts?.value).toBe('max-age=63072000; includeSubDomains; preload');

    const nonProdHeaders = buildSecurityHeaders({ isDev: true, isProductionRecord: false });
    expect(nonProdHeaders.find((h) => h.key === 'Strict-Transport-Security')).toBeUndefined();
    // Dev CSP keeps ws: for local dev servers.
    const csp = nonProdHeaders.find((h) => h.key === 'Content-Security-Policy')!.value;
    expect(csp).toContain("connect-src 'self' https: ws: wss:");
  });
});
