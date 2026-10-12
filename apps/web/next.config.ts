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

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
    if (!dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'agentation$': false,
      };
    }
    return config;
  },
};

export default nextConfig;
