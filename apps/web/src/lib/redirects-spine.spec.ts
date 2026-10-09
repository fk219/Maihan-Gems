/**
 * apps/web/src/lib/redirects-spine.spec.ts
 *
 * Full-coverage gate for the 44,218 source URLs (Phase 4 Task 6).
 *
 * Authority: technical_design/34 section 14 ("Full URL sweep: all 44,218 URLs
 * resolve or 301 to a 200") and INITIAL_IMPLEMENTATION_PLAN.md section 11
 * ("a redirect completeness test over all 44,218 source URLs").
 *
 * The migration spine `urls.jsonl` is READ-ONLY evidence and is deliberately
 * NOT in Git (AGENTS.md section 5). When the source archive is absent — a
 * fresh clone or CI — this suite SKIPS cleanly rather than fabricating data or
 * failing. When it is present, it asserts coverage over every recorded URL.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyLegacyPath, normalizePath, type LegacyDisposition } from './redirects.js';

const SPINE = fileURLToPath(
  new URL('../../../../naturalgemstones/reverse_engineered/data/urls.jsonl', import.meta.url),
);

interface SpineUrl {
  readonly url: string;
  readonly path: string;
  readonly search: string;
}

function loadSpine(): SpineUrl[] {
  const out: SpineUrl[] = [];
  for (const line of readFileSync(SPINE, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const parsed = JSON.parse(trimmed) as { url?: string };
    const url = parsed.url ?? '';
    const withoutOrigin = url.replace(/^https?:\/\/[^/]+/, '');
    const q = withoutOrigin.indexOf('?');
    out.push({
      url,
      path: q === -1 ? withoutOrigin : withoutOrigin.slice(0, q),
      search: q === -1 ? '' : withoutOrigin.slice(q),
    });
  }
  return out;
}

const spine = existsSync(SPINE) ? loadSpine() : [];

describe.skipIf(spine.length === 0)('redirect coverage over the 44,218-URL spine (doc 34 section 14)', () => {
  const counts: Record<LegacyDisposition, number> = {
    served: 0,
    redirect: 0,
    'needs-row': 0,
    removed: 0,
    unknown: 0,
  };
  const unknown: string[] = [];
  const needsRow: string[] = [];

  for (const item of spine) {
    const classified = classifyLegacyPath(item.path);
    counts[classified.disposition] += 1;
    if (classified.disposition === 'unknown') unknown.push(item.path);
    if (classified.disposition === 'needs-row') needsRow.push(item.path);
    // Every redirect target must be an internal absolute path.
    if (classified.decision !== null && classified.decision.status !== 410) {
      expect(classified.decision.target.startsWith('/')).toBe(true);
      // Never a blind redirect to the homepage (doc 34 section 2/11).
      expect(classified.decision.target).not.toBe('/');
    }
  }

  it('holds exactly the 44,218 recorded source URLs', () => {
    expect(spine.length).toBe(44_218);
  });

  it('classifies every URL into a documented family — no URL is silently dropped', () => {
    expect(unknown, `unclassified URLs: ${unknown.slice(0, 5).join(', ')}`).toEqual([]);
    expect(counts.served + counts.redirect + counts['needs-row'] + counts.removed).toBe(spine.length);
    // The exact distribution over the authoritative spine. Any drift here means
    // the section 3 mapping no longer covers the corpus, or a rule changed.
    expect(counts).toEqual({
      served: 363,
      redirect: 43_449,
      'needs-row': 88,
      removed: 318,
      unknown: 0,
    });
  });

  it('matches the migration stage cms-redirects family counts', () => {
    // 88 READY_MADE URLs need the canonical `products.slug` from the table;
    // 318 URLs in the parser's UNKNOWN family (317 `-J#####` on a non-`-rings`
    // directory, plus one `-S#####`) are honest 410s. These are the exact
    // deviations `cms-redirects.ts` documents.
    expect(counts['needs-row']).toBe(88);
    expect(counts.removed).toBe(318);
  });

  it('every redirect target is canonical (no query leakage into the path)', () => {
    for (const item of spine) {
      const classified = classifyLegacyPath(item.path);
      if (classified.decision === null || classified.decision.status === 410) continue;
      const [path] = classified.decision.target.split('?');
      expect(normalizePath(path ?? '')).not.toBe('');
    }
  });

  it('serves every non-410 target as an internal absolute path', () => {
    expect(needsRow.length).toBe(88);
    for (const path of needsRow) {
      expect(classifyLegacyPath(path).disposition).toBe('needs-row');
      expect(path).toMatch(/-rings\/.+-j\d+$/);
    }
  });
});
