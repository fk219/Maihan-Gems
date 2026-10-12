/**
 * packages/db/src/cms/navigation-repository.ts
 *
 * Phase 12 — Stage C / Global Task 4 (E12.3), navigation half.
 *
 * Administrative management of the locked `navigations` table
 * (0012_cms.sql): one row per (key, locale); `items` is the nested
 * JSONB tree [{label, href, children, variety_id, external}];
 * `key` ∈ header | footer | mega_menu | mobile (doc 22 §3 data-driven
 * navigation; doc 34: navigation is data-driven).
 *
 * Safety rules encoded here:
 *   - INSERT ... ON CONFLICT (key, locale) DO UPDATE keeps the row-level
 *     upsert deterministic and never silently overwrites: the SQL updates
 *     ONLY when the caller supplies the `expectedUpdatedAt` the reader saw
 *     (optimistic concurrency), and the repository refuses otherwise.
 *   - Item hrefs are validated BEFORE the write (same-origin absolute path
 *     or https external) so an open-redirect payload can never reach the
 *     table (doc 34 §12).
 *   - Every write emits an audit entry with before/after state (doc 23 §4).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export const NAVIGATION_KEYS = Object.freeze(['header', 'footer', 'mega_menu', 'mobile'] as const);
export type NavigationKey = (typeof NAVIGATION_KEYS)[number];

export interface NavigationItem {
  label: string;
  href: string;
  external?: boolean;
  variety_id?: string;
  children?: NavigationItem[];
}

export interface NavigationRow extends Record<string, unknown> {
  id: string;
  key: string;
  locale: string;
  items: NavigationItem[];
  updated_at: string;
}

export class NavigationConflictError extends Error {
  constructor(readonly kind: 'EXPECTED_STALE' | 'MISSING_ROW' | 'INVALID_KEY' | 'INVALID_HREF') {
    super(`NAVIGATION: ${kind}`);
    this.name = 'NavigationConflictError';
  }
}

export class NavigationAuditError extends Error {
  constructor(readonly kind: 'DUPLICATE_KEY' | 'SKIP') {
    super(`NAVIGATION_AUDIT: ${kind}`);
    this.name = 'NavigationAuditError';
  }
}

export interface AuditWriter {
  (entry: {
    actor_type: 'STAFF' | 'SYSTEM';
    actor_id: string;
    action: 'CREATE' | 'UPDATE';
    entity_type: 'navigations';
    entity_id: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    reason: string;
  }): Promise<void>;
}

/** Validate a single href: internal absolute path or https external URL. */
function isSafeHref(href: string): boolean {
  if (href.startsWith('/')) return !href.startsWith('//') && !href.includes('\\');
  if (href.startsWith('https://')) return true;
  return false;
}

/** Recursively validate an items tree (label + safe href, bounded depth). */
export function validateNavigationItems(items: unknown, depth = 0): NavigationItem[] {
  if (!Array.isArray(items)) throw new NavigationConflictError('INVALID_HREF');
  if (depth > 4 || items.length > 60) throw new NavigationConflictError('INVALID_HREF');
  return items.map((raw) => {
    if (typeof raw !== 'object' || raw === null) throw new NavigationConflictError('INVALID_HREF');
    const item = raw as Record<string, unknown>;
    const label = typeof item['label'] === 'string' ? (item['label'] as string) : '';
    const href = typeof item['href'] === 'string' ? (item['href'] as string) : '';
    if (label.length === 0 || label.length > 120) throw new NavigationConflictError('INVALID_HREF');
    if (!isSafeHref(href)) throw new NavigationConflictError('INVALID_HREF');
    const out: NavigationItem = { label, href };
    if (item['external'] === true) out['external'] = true;
    if (typeof item['variety_id'] === 'string') out['variety_id'] = item['variety_id'] as string;
    if (item['children'] !== undefined) {
      out['children'] = validateNavigationItems(item['children'], depth + 1);
    }
    return out;
  });
}

export interface NavigationRepository {
  get(key: string, locale: string): Promise<NavigationRow | null>;
  list(locale: string): Promise<NavigationRow[]>;
  /** Create or (with expectedUpdatedAt) update one navigation tree. */
  save(input: {
    key: string;
    locale: string;
    items: unknown;
    actorId: string;
    /** Optimistic-concurrency stamp from the reader; omit = create-if-absent. */
    expectedUpdatedAt?: string;
  }): Promise<NavigationRow>;
}

export function createNavigationRepository(db: CatalogDatabase, audit: AuditWriter): NavigationRepository {
  return {
    async get(key, locale) {
      if (!(NAVIGATION_KEYS as readonly string[]).includes(key)) throw new NavigationConflictError('INVALID_KEY');
      const r = await db.execute<NavigationRow>(
        sql`SELECT id, key, locale, items, updated_at FROM navigations WHERE key = ${key} AND locale = ${locale}`,
      );
      return r.rows[0] ?? null;
    },

    async list(locale) {
      const r = await db.execute<NavigationRow>(
        sql`SELECT id, key, locale, items, updated_at FROM navigations WHERE locale = ${locale} ORDER BY key`,
      );
      return r.rows;
    },

    async save({ key, locale, items, actorId, expectedUpdatedAt }) {
      if (!(NAVIGATION_KEYS as readonly string[]).includes(key)) throw new NavigationConflictError('INVALID_KEY');
      const validated = validateNavigationItems(items);

      const existing = await this.get(key, locale).catch(() => null);

      if (existing === null) {
        if (expectedUpdatedAt !== undefined) throw new NavigationConflictError('MISSING_ROW');
        const ins = await db.execute<NavigationRow>(
          sql`INSERT INTO navigations (key, locale, items)
              VALUES (${key}, ${locale}, ${JSON.stringify(validated)}::jsonb)
              ON CONFLICT (key, locale) DO NOTHING
              RETURNING id, key, locale, items, updated_at`,
        );
        const created = ins.rows[0];
        if (created === undefined) throw new NavigationConflictError('EXPECTED_STALE');
        await audit({
          actor_type: 'STAFF', actor_id: actorId, action: 'CREATE',
          entity_type: 'navigations', entity_id: created.id,
          before_state: null,
          after_state: { key, locale, item_count: validated.length },
          reason: 'Navigation created (data-driven navigation, doc 22 §3)',
        });
        return created;
      }

      if (expectedUpdatedAt === undefined || expectedUpdatedAt !== existing.updated_at) {
        throw new NavigationConflictError('EXPECTED_STALE');
      }
      const upd = await db.execute<NavigationRow>(
        sql`UPDATE navigations
               SET items = ${JSON.stringify(validated)}::jsonb, updated_at = now()
             WHERE key = ${key} AND locale = ${locale} AND updated_at = ${existing.updated_at}
             RETURNING id, key, locale, items, updated_at`,
      );
      const updated = upd.rows[0];
      if (updated === undefined) throw new NavigationConflictError('EXPECTED_STALE');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'UPDATE',
        entity_type: 'navigations', entity_id: updated.id,
        before_state: { key, locale, item_count: (existing.items ?? []).length },
        after_state: { key, locale, item_count: validated.length },
        reason: 'Navigation updated (data-driven navigation, doc 22 §3)',
      });
      return updated;
    },
  };
}
