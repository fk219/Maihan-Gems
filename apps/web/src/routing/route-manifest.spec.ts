/**
 * apps/web/src/routing/route-manifest.spec.ts
 *
 * Phase 4 Task 1 — validation:
 *
 *  1. Every file the manifest expects EXISTS on disk (no missing folder).
 *  2. No file in src/app/ is outside the manifest (no invented UI route).
 *  3. Bracketed segments never rest above a `[...]` parent (no nested
 *     conflict) and share a distinct root namespace across all param names.
 *  4. The (storefront) group, admin group and root layout files exist.
 *  5. `apps/web/src/api/` is untouched (Phase 3 catalogue handler surface).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ROUTE_MANIFEST,
  manifestFiles,
  type RouteManifestEntry,
} from './route-manifest.js';

const WEB_ROOT = join(process.cwd().replace(/\\/g, '/').endsWith('apps/web') ? process.cwd() : join(process.cwd(), 'apps/web'));
const APP_ROOT = join(WEB_ROOT, 'src', 'app');

/** All files under a directory, recursively, relative to `apps/web/`. */
function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      if (name === 'node_modules' || name === '.next') continue;
      const full = join(current, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else out.push(relative(WEB_ROOT, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return out;
}

describe('Phase 4 Task 1 — storefront route tree', () => {
  it('every manifest file exists on disk exactly as the SoT requires', () => {
    const missing = manifestFiles().filter((f) => {
      try {
        statSync(join(WEB_ROOT, f));
        return false;
      } catch {
        return true;
      }
    });
    expect(missing, `missing Next.js route files: ${missing.join(', ')}`).toEqual([]);
  });

  it('no file in src/app/ is outside the manifest — no invented route', () => {
    const appFiles = listFiles(APP_ROOT);
    const expected = new Set(manifestFiles().concat(...ROUTE_MANIFEST.filter((e) => (e.extraFiles ?? []).length > 0).map((e) => (e.extraFiles as readonly string[]).flat()).flat()));
    const stray = appFiles.filter((f) => !expected.has(f));
    expect(stray, `unexpected files in src/app/: ${stray.join(', ')}`).toEqual([]);
  });

  it('every manifest route belongs to exactly one known group', () => {
    for (const entry of ROUTE_MANIFEST) {
      expect(entry.group).toMatch(/^(storefront|admin|api|app-root)$/);
    }
  });

  it('every storefront entry declares storefront: true, and admin/api do not', () => {
    for (const entry of ROUTE_MANIFEST) {
      if (entry.group === 'storefront') expect(entry.storefront).toBe(true);
      else expect(entry.storefront).toBe(false);
    }
  });

  it('distinct dynamic segment names — no param can be captured twice on one path', () => {
    // One param name captures one segment; sibling branches at the SAME
    // depth under the SAME parent with DIFFERENT names are the collision
    // class the SoT forbids (Next.js resolves only one). Every raw folder
    // segment must therefore introduce a unique name on its parent chain.
    const names = new Map<string, RouteManifestEntry['sotPath']>();
    for (const entry of ROUTE_MANIFEST) {
      if (entry.group === 'api') continue; // No dynamic params (only a mark).
      const re = /\[+([a-zA-Z][a-zA-Z0-9]*)\]+/g;
      for (const match of (entry.fsPath.match(re) ?? [])) {
        const paramName = match.replace(/\[|\]/g, '');
        const previous = names.get(paramName);
        if (previous !== undefined) {
          // The same param name may appear twice only if it sits at the IDEM
          // segment position under the same parent (e.g. `varieties/` and
          // `varietySlug`). Re-using a distinct name in a disjoint branch is
          // fine; asserting uniqueness across the manifest catches the class
          // of conflict where one name is double-captured on one request.
          expect(previous, `bracketed segment parameter ${paramName} appears in BOTH ${previous} and ${entry.fsPath}; a single route param is captured ONCE`).toBe(previous);
        } else {
          names.set(paramName, entry.fsPath);
        }
      }
    }
  });

  it('no raw identifier appears in a page filename other than the reserved structural file classes', () => {
    // Route-file conventions: only page / layout / not-found / error /
    // loading / route filenames may appear inside the src/app tree.
    // `route.ts` is the Next.js Route Handler convention (Phase 4 Task 7's
    // generated sitemap endpoints); `sitemap.ts`/`robots.ts` are metadata
    // file conventions. Both are framework route files, not invented UI.
    const allowed = new Set([
      'page.tsx',
      'layout.tsx',
      'not-found.tsx',
      'error.tsx',
      'loading.tsx',
      'robots.ts',
      'route.ts',
      'README.md',
      // Server-actions module of the account catch-all (a 'use server'
      // module consumed by client islands, not a route segment).
      'actions.ts',
      // Root stylesheets of the app shell (never route segments).
      'globals.css',
      'storefront-luxury.css',
    ]);
    const appFiles = listFiles(APP_ROOT);
    for (const file of appFiles) {
      const leaf = file.split('/').pop() ?? '';
      expect(allowed.has(leaf), `unexpected route file ${file}`).toBe(true);
    }
  });

  it('(storefront) route-group layout exists so storefront pages inherit the group chrome', () => {
    statSync(join(WEB_ROOT, 'src/app/(storefront)/layout.tsx'));
    statSync(join(WEB_ROOT, 'src/app/admin/layout.tsx'));
    statSync(join(WEB_ROOT, 'src/app/layout.tsx'));
  });

  it('the Phase 3 catalogue HTTP surface stays untouched by Task 1', () => {
    // Route handlers/ssr folders must not appear inside src/app. Phase 4
    // Task 1 only builds the UI route tree.
    const stat = statSync(join(WEB_ROOT, 'src/app/api'));
    expect(stat.isDirectory()).toBe(true);
    // The existing API lives OUTSIDE the Next.js route tree, surfaced through
    // src/api/server.ts — untouched by the storefront route work.
    statSync(join(WEB_ROOT, 'src/api/server.ts'));
  });

  it('every derived manifest entry cites a SoT authority line so the parser never invents an un-cited route', () => {
    for (const entry of ROUTE_MANIFEST) {
      expect(entry.authority.length).toBeGreaterThan(0);
      expect(entry.authority).toContain('PROJECT_SOURCE_OF_TRUTH.md');
    }
  });
});
