/**
 * packages/db/src/cms/seo-nav-repository.ts
 *
 * P3-5 admin console reality: SEO metadata (`seo_metadata`), data-driven
 * navigation (`navigations`) and the redirect manager (`redirects`) — the
 * three CMS-adjacent surfaces that existed in the locked schema but had NO
 * repository functions. Every privileged write lands an audit row (SG-8,
 * inline in the same SQL pattern as the commerce repositories); reads are
 * plain. Redirects' uniqueness is enforced by the schema's `from_path`
 * UNIQUE and surfaced as a typed conflict for the admin 409.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export type SeoEntityKind = 'PRODUCT' | 'GEMSTONE' | 'PAGE' | 'SETTING' | 'DYO';

export interface SeoMetadataRow {
  readonly id: string;
  readonly entity_kind: SeoEntityKind;
  readonly entity_id: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly canonical_path: string | null;
  readonly og_image_url: string | null;
  readonly robots: string | null;
  readonly noindex: boolean;
  readonly updated_at: string;
}

export interface NavigationRow {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly items: unknown;
  readonly locale: string;
  readonly updated_at: string;
}

export interface RedirectRow {
  readonly id: string;
  readonly from_path: string;
  readonly to_path: string;
  readonly status_code: number;
  readonly reason: string | null;
  readonly created_at: string;
}

export interface RedirectConflictError extends Error {
  code: 'REDIRECT_CONFLICT';
}

export function isRedirectConflict(error: unknown): error is RedirectConflictError {
  return error instanceof Error && 'code' in error && (error as RedirectConflictError).code === 'REDIRECT_CONFLICT';
}

export interface SeoNavRepository {
  listSeoMetadata(opts: { limit: number; offset: number; kind?: SeoEntityKind }): Promise<SeoMetadataRow[]>;
  upsertSeoMetadata(input: {
    entityKind: SeoEntityKind;
    entityId: string;
    title?: string | null;
    description?: string | null;
    canonicalPath?: string | null;
    ogImageUrl?: string | null;
    robots?: string | null;
    noindex?: boolean;
    actorId: string;
  }): Promise<SeoMetadataRow>;
  listNavigations(): Promise<NavigationRow[]>;
  updateNavigationItems(input: { key: string; locale: string; items: unknown; actorId: string }): Promise<NavigationRow>;
  listRedirects(opts: { limit: number; offset: number }): Promise<RedirectRow[]>;
  createRedirect(input: {
    fromPath: string;
    toPath: string;
    statusCode: number;
    reason?: string | null;
    actorId: string;
  }): Promise<RedirectRow>;
  deleteRedirect(input: { id: string; actorId: string }): Promise<void>;
}

export function createSeoNavRepository(db: CatalogDatabase): SeoNavRepository {
  const kindOrThrow = (kind: string): SeoEntityKind => {
    if (!['PRODUCT', 'GEMSTONE', 'PAGE', 'SETTING', 'DYO'].includes(kind)) {
      throw new Error(`seo: unknown entity_kind ${kind}`);
    }
    return kind as SeoEntityKind;
  };

  return {
    async listSeoMetadata({ limit, offset, kind }) {
      const rows = await db.execute(sql`
        SELECT id, entity_kind, entity_id, title, description, canonical_path,
               og_image_url, robots, noindex, updated_at
          FROM seo_metadata
         ${kind ? sql`WHERE entity_kind = ${kind}::seo_entity_kind` : sql``}
         ORDER BY updated_at DESC
         LIMIT ${limit} OFFSET ${offset}
      `);
      return (rows.rows as unknown as SeoMetadataRow[]).map((r) => ({
        ...r,
        entity_kind: kindOrThrow(r.entity_kind),
      }));
    },

    async upsertSeoMetadata(input) {
      const before = await db.execute(sql`
        SELECT id, entity_kind, entity_id, title, description, canonical_path,
               og_image_url, robots, noindex
          FROM seo_metadata
         WHERE entity_kind = ${input.entityKind}::seo_entity_kind AND entity_id = ${input.entityId}
      `);
      const prior = before.rows[0] ?? null;

      const updated = await db.execute(sql`
        INSERT INTO seo_metadata (
          entity_kind, entity_id, title, description, canonical_path,
          og_image_url, robots, noindex, updated_at
        ) VALUES (
          ${input.entityKind}::seo_entity_kind,
          ${input.entityId},
          ${input.title ?? null},
          ${input.description ?? null},
          ${input.canonicalPath ?? null},
          ${input.ogImageUrl ?? null},
          ${input.robots ?? null},
          ${input.noindex ?? false},
          now()
        )
        ON CONFLICT (entity_kind, entity_id) DO UPDATE SET
          title          = ${input.title ?? null},
          description    = ${input.description ?? null},
          canonical_path = ${input.canonicalPath ?? null},
          og_image_url   = ${input.ogImageUrl ?? null},
          robots         = ${input.robots ?? null},
          noindex        = ${input.noindex ?? false},
          updated_at     = now()
        RETURNING id, entity_kind, entity_id, title, description,
                  canonical_path, og_image_url, robots, noindex, updated_at
      `);
      const row = updated.rows[0] as unknown as SeoMetadataRow | undefined;
      if (row === undefined) throw new Error('seo: upsert returned no row');

      await db.execute(sql`
        INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason)
        VALUES (
          'ADMIN',
          NULLIF(${input.actorId}, '')::uuid,
          'UPDATE',
          'seo_metadata',
          ${row.id}::uuid,
          ${prior === null ? null : sql`${JSON.stringify(prior)}::jsonb`}::jsonb,
          ${JSON.stringify(row)}::jsonb,
          'SEO metadata edited via admin console'
        )
      `);
      return { ...row, entity_kind: kindOrThrow(row.entity_kind) };
    },

    async listNavigations() {
      const rows = await db.execute(sql`
        SELECT id, key, label, items, locale, updated_at
          FROM navigations
         ORDER BY key, locale
      `);
      return rows.rows as unknown as NavigationRow[];
    },

    async updateNavigationItems({ key, locale, items, actorId }) {
      const prior = await db.execute(sql`
        SELECT id, key, label, items, locale FROM navigations WHERE key = ${key} AND locale = ${locale}
      `);
      const before = (prior.rows[0] as unknown as NavigationRow | undefined) ?? null;

      const updated = await db.execute(sql`
        UPDATE navigations
           SET items = ${JSON.stringify(items)}::jsonb,
               updated_at = now()
         WHERE key = ${key} AND locale = ${locale}
        RETURNING id, key, label, items, locale, updated_at
      `);
      const row = updated.rows[0] as unknown as NavigationRow | undefined;
      if (row === undefined) {
        throw new Error('navigation: unknown key/locale pair');
      }
      await db.execute(sql`
        INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason)
        VALUES (
          'ADMIN',
          NULLIF(${actorId}, '')::uuid,
          'UPDATE',
          'navigations',
          ${row.id}::uuid,
          ${before === null ? null : sql`${JSON.stringify(before)}::jsonb`}::jsonb,
          ${JSON.stringify(row)}::jsonb,
          'Navigation items edited via admin console'
        )
      `);
      return row;
    },

    async listRedirects({ limit, offset }) {
      const rows = await db.execute(sql`
        SELECT id, from_path, to_path, status_code, reason, created_at
          FROM redirects
         ORDER BY from_path
         LIMIT ${limit} OFFSET ${offset}
      `);
      return rows.rows as unknown as RedirectRow[];
    },

    async createRedirect({ fromPath, toPath, statusCode, reason, actorId }) {
      if (![301, 302, 307, 308].includes(statusCode)) {
        throw new Error('redirect: status_code must be 301, 302, 307 or 308');
      }
      if (fromPath === toPath) {
        throw new Error('redirect: from_path and to_path must differ');
      }
      try {
        const inserted = await db.execute(sql`
          INSERT INTO redirects (from_path, to_path, status_code, reason)
          VALUES (${fromPath}, ${toPath}, ${statusCode}, ${reason ?? null})
          RETURNING id, from_path, to_path, status_code, reason, created_at
        `);
        const row = inserted.rows[0] as unknown as RedirectRow | undefined;
        if (row === undefined) throw new Error('redirect: insert returned no row');
        await db.execute(sql`
          INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, after_state, reason)
          VALUES (
            'ADMIN',
            NULLIF(${actorId}, '')::uuid,
            'CREATE',
            'redirects',
            ${row.id}::uuid,
            ${JSON.stringify(row)}::jsonb,
            'Redirect created via admin console'
          )
        `);
        return row;
      } catch (error) {
        // Drizzle wraps driver errors ("Failed query: …"); the original pg
        // error (message + 23505 unique-violation code) sits on `.cause`.
        const cause = (error as { cause?: { code?: string; message?: string } }).cause;
        const wrapped = error instanceof Error ? error.message : '';
        const causeMessage = cause?.message ?? '';
        const isUnique =
          wrapped.includes('unique') ||
          wrapped.includes('duplicate key') ||
          causeMessage.includes('unique') ||
          causeMessage.includes('duplicate key') ||
          cause?.code === '23505';
        if (isUnique) {
          const conflict = new Error(`redirect: a redirect already exists for ${fromPath}`) as RedirectConflictError;
          conflict.code = 'REDIRECT_CONFLICT';
          throw conflict;
        }
        throw error;
      }
    },

    async deleteRedirect({ id, actorId }) {
      const prior = await db.execute(sql`
        SELECT id, from_path, to_path, status_code, reason, created_at FROM redirects WHERE id = ${id}
      `);
      const before = (prior.rows[0] as unknown as NavigationRow | undefined) ?? null;
      if (before === null) throw new Error('redirect: not found');
      await db.execute(sql`DELETE FROM redirects WHERE id = ${id}`);
      await db.execute(sql`
        INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, before_state, reason)
        VALUES (
          'ADMIN',
          NULLIF(${actorId}, '')::uuid,
          'DELETE',
          'redirects',
          ${before.id}::uuid,
          ${JSON.stringify(before)}::jsonb,
          'Redirect removed via admin console'
        )
      `);
    },
  };
}
