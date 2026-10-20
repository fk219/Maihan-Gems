/**
 * apps/web/next.config.ts
 *
 * Authority: technical_design/02 (Next.js App Router, rendering and HTTP
 * only), technical_design/08 (frontend architecture).
 *
 * ---------------------------------------------------------------------------
 * Bundler: webpack, not Turbopack (`next build --webpack`, see package.json).
 * ---------------------------------------------------------------------------
 * This repository writes ESM source with explicit `.js` import specifiers
 * (the convention Node's ESM loader requires for the compiled `dist/` output
 * that `apps/web/src/api/**` runs under plain `node`). TypeScript resolves
 * `./x.js` to `./x.ts` under `moduleResolution: "Bundler"`, so `tsc -b` and
 * every package build are correct.
 *
 * Turbopack — the Next 16 default — does NOT resolve a `.js` specifier to a
 * `.ts`/`.tsx` file. `next build` therefore failed with 58 "Module not found:
 * Can't resolve '...js'" errors across the storefront tree. There is no
 * Turbopack option for extension aliasing: `turbopack.resolveExtensions`
 * only extends the list tried for *extensionless* specifiers, and
 * `turbopack.resolveAlias` maps module specifiers, not extensions. Tracked
 * upstream as vercel/next.js#82945 ("support importing .ts/.tsx via .js
 * extension (parity with webpack resolve.extensionAlias)").
 *
 * The supported fix is webpack's documented `resolve.extensionAlias`, which
 * Next exposes through this `webpack()` hook. It is applied to BOTH the
 * server and the client compilers, so client-boundary files (error.tsx etc.)
 * resolve too. No source file, tsconfig or type-safety setting is changed.
 *
 * Nothing else is tuned here: image domains, bundle policy and budgets land
 * with the Phase 4 tasks that own them.
 */
import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https:",
      "media-src 'self' https: blob:",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https:",
      "worker-src 'self' blob:",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    const headers = SECURITY_HEADERS.map((header) => {
      if (header.key !== 'Content-Security-Policy') return header;
      const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "img-src 'self' data: https:",
        "media-src 'self' https: blob:",
        `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        `connect-src 'self' https:${isDev ? ' ws: wss:' : ''}`,
        "worker-src 'self' blob:",
        "form-action 'self'",
      ].join('; ');
      return { ...header, value: csp };
    });
    if (process.env['MAIHAN_ENV'] === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }
    return [{ source: '/:path*', headers }];
  },
  // Next 16 still mounts a shadow-DOM "Issue" chip unless this is false AND
  // the nextjs-portal host is CSS-hidden in globals.css.
  devIndicators: false,
  webpack(config, { dev }) {
    // `.js` -> `.ts`/`.tsx` (and `.mjs`/`.cjs` equivalents) so source written
    // for Node ESM output also resolves inside the Next bundler.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      ...(process.env['NEXT_PUBLIC_AGENTATION'] === '1' && dev ? {} : { 'agentation$': false }),
    };
    return config;
  },
};

export default nextConfig;
