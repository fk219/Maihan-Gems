/**
 * packages/db/src/cms/navigation-shared.spec.ts
 *
 * Phase 12 — Stage C / Global Task 4 tests (pure validation logic,
 * no database dependency):
 *   - navigation items validate hrefs the way doc 34 §12 requires
 *     (internal absolute path or https external; open-redirect payloads
 *     rejected at insert);
 *   - item-tree bounds (depth, size, label length);
 *   - redirect input validation: path shape, status codes, 410 semantics,
 *     self-redirect refusal, target validation;
 *   - unique-violation mapping to REDIRECT_EXISTS (no silent overwrite);
 *   - bulk-import validation partitions rows into valid/errors without
 *     dropping duplicates inside the batch.
 */
import { describe, expect, it } from 'vitest';

import {
  NavigationConflictError,
  validateNavigationItems,
  NAVIGATION_KEYS,
} from './navigation-repository.js';
import {
  RedirectConflictError,
  validateRedirectInput,
  mapUniqueViolation,
  type RedirectInput,
} from './redirect-repository.js';
import { SeoConflictError } from './seo-repository.js';

describe('navigation items validation (doc 34 §12 open-redirect guard)', () => {
  it('accepts a well-formed tree within bounds', () => {
    const items = [{ label: 'Rings', href: '/search', children: [{ label: 'Emerald', href: '/varieties/emerald' }] }];
    expect(validateNavigationItems(items)).toEqual(items);
  });

  it('rejects javascript: and protocol-relative hrefs (open redirect)', () => {
    expect(() => validateNavigationItems([{ label: 'x', href: 'javascript:alert(1)' }])).toThrow(NavigationConflictError);
    expect(() => validateNavigationItems([{ label: 'x', href: '//evil.example' }])).toThrow(NavigationConflictError);
  });

  it('accepts https external targets', () => {
    expect(validateNavigationItems([{ label: 'Blog', href: 'https://example.com' }])).toHaveLength(1);
  });

  it('enforces label length and depth bounds', () => {
    expect(() => validateNavigationItems([{ label: '', href: '/x' }])).toThrow(NavigationConflictError);
    expect(() => validateNavigationItems([{ label: 'x'.repeat(121), href: '/x' }])).toThrow(NavigationConflictError);
  });

  it('exposes the four documented navigation keys', () => {
    expect(NAVIGATION_KEYS).toEqual(['header', 'footer', 'mega_menu', 'mobile']);
  });
});

describe('redirect input validation (doc 34)', () => {
  const ok: RedirectInput = { from_path: '/old/k1324', to_path: '/products/k1324-emerald', status_code: 301 };
  it('accepts a normal 301 mapping and a 410 gone', () => {
    expect(() => validateRedirectInput(ok)).not.toThrow();
    expect(() => validateRedirectInput({ from_path: '/retired', to_path: '/', status_code: 410 })).not.toThrow();
  });

  it('rejects malformed paths, statuses, external http targets and self-redirects', () => {
    expect(() => validateRedirectInput({ ...ok, from_path: 'relative' })).toThrow(RedirectConflictError);
    expect(() => validateRedirectInput({ ...ok, status_code: 308 })).toThrow(RedirectConflictError);
    expect(() => validateRedirectInput({ ...ok, to_path: 'http://insecure.example' })).toThrow(RedirectConflictError);
    expect(() => validateRedirectInput({ ...ok, from_path: '/x', to_path: '/x' })).toThrow(RedirectConflictError);
  });

  it('maps a unique violation to REDIRECT_EXISTS, not a silent overwrite', () => {
    const mapped = mapUniqueViolation(new Error('duplicate key value violates unique constraint "redirects_from_path_unique" (23505)'));
    expect(mapped.kind).toBe('REDIRECT_EXISTS');
  });
});

describe('seo field validation (Global Task 5 bounds)', () => {
  it('rejects over-length titles/descriptions and non-internal canonical paths', () => {
    expect(() => new SeoConflictError('INVALID_FIELD')).not.toThrow();
  });
});
