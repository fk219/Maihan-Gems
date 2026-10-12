/**
 * packages/db/src/cms/seo-repository.ts
 *
 * Phase 12 — Stage C / Global Task 5 (E12.3), SEO metadata management.
 *
 * The locked `seo_metadata` table (0012_cms.sql): one row per
 * (entity_kind, entity_id); entity_kind is the 0002 enum
 * PRODUCT | CATEGORY | VARIETY | COLLECTION | PAGE | ARTICLE | ORGANIZATION.
 * Storefront metadata (metadata.ts / jsonld.ts) READS these rows; this
 * surface manages them.
 *
 * Validation encoded here (doc 29 metadata norms; SoT conventions):
 *   - entity_kind must be one of the seven enum values;
 *   - title ≤ 60 chars, description ≤ 160 chars (SERP truncation bounds);
 *   - canonical_path must be an internal absolute path;
 *   - robots tokens restricted to noindex/nofollow/noarchive/none;
 *   - no silent overwrite: updates require the expected updated_at.
 * Every write emits an audit entry with before/after state (doc 23 §4).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export const SEO_ENTITY_KINDS = Object.freeze([
  'PRODUCT', 'CATEGORY', 'VARIETY', 'COLLECTION', 'PAGE', 'ARTICLE', 'ORGANIZATION',
] as const);
export type SeoEntityKind = (typeof SEO_ENTITY_KINDS)[number];

export interface SeoRow extends Record<string, unknown> {
  id: string;
  entity_kind: SeoEntityKind;
  entity_id: string;
  title: string | null;
  description: string | null;
  canonical_path: string | null;
  og_image_url: string | null;
  robots: string | null;
  noindex: boolean;
  structured_extra: Record<string, unknown>;
  updated_at: string;
}

export class SeoConflictError extends Error {
  constructor(readonly kind: 'INVALID_KIND' | 'INVALID_FIELD' | 'EXPECTED_STALE' | 'MISSING_ROW' | 'DUPLICATE_KEY' | 'SKIP') {
    super(`SEO: ${kind}`);
    this.name = 'SeoConflictError';
  }
}

export interface AuditWriter {
  (entry: {
    actor_type: 'STAFF' | 'SYSTEM';
    actor_id: string;
    action: 'CREATE' | 'UPDATE';
    entity_type: 'seo_metadata';
    entity_id: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    reason: string;
  }): Promise<void>;
}

export interface SeoInput {
  entity_kind: SeoEntityKind;
  entity_id: string;
  title?: string | null;
  description?: string | null;
  canonical_path?: string | null;
  og_image_url?: string | null;
  robots?: string | null;
  noindex?: boolean;
  structured_extra?: Record<string, unknown>;
}

const ROBOTS_TOKENS = new Set(['noindex', 'nofollow', 'noarchive', 'none', 'index', 'follow']);

function validate(input: SeoInput): void {
  if (!(SEO_ENTITY_KINDS as readonly string[]).includes(input.entity_kind)) {
    throw new SeoConflictError('INVALID_KIND');
  }
  if (!/^[0-9a-fA-F-]{8,36}$/.test(input.entity_id)) throw new SeoConflictError('INVALID_FIELD');
  if (input.title !== undefined && input.title !== null && input.title.length > 60) {
    throw new SeoConflictError('INVALID_FIELD');
  }
  if (input.description !== undefined && input.description !== null && input.description.length > 160) {
    throw new SeoConflictError('INVALID_FIELD');
  }
  if (input.canonical_path !== null && input.canonical_path !== undefined) {
    if (!(input.canonical_path.startsWith('/') && !input.canonical_path.startsWith('//'))) {
      throw new SeoConflictError('INVALID_FIELD');
    }
  }
  if (input.og_image_url !== null && input.og_image_url !== undefined && !input.og_image_url.startsWith('https://')) {
    throw new SeoConflictError('INVALID_FIELD');
  }
  if (input.robots !== null && input.robots !== undefined && input.robots.length > 0) {
    for (const token of input.robots.toLowerCase().split(/[\s,]+/)) {
      if (!ROBOTS_TOKENS.has(token)) throw new SeoConflictError('INVALID_FIELD');
    }
  }
}

export interface SeoRepository {
  get(entityKind: SeoEntityKind, entityId: string): Promise<SeoRow | null>;
  list(opts: { entityKind?: SeoEntityKind; limit: number; offset: number }): Promise<SeoRow[]>;
  /** Create-or-update with optimistic concurrency (never silent overwrite). */
  save(input: SeoInput & { actorId: string; expectedUpdatedAt?: string }): Promise<SeoRow>;
}

export function createSeoRepository(db: CatalogDatabase, audit: AuditWriter): SeoRepository {
  return {
    async get(entityKind, entityId) {
      const r = await db.execute<SeoRow>(
        sql`SELECT * FROM seo_metadata WHERE entity_kind = ${entityKind}::seo_entity_kind AND entity_id = ${entityId}`,
      );
      return r.rows[0] ?? null;
    },

    async list({ entityKind, limit, offset }) {
      const where = entityKind !== undefined
        ? sql`WHERE entity_kind = ${entityKind}::seo_entity_kind`
        : sql``;
      const r = await db.execute<SeoRow>(
        sql`SELECT * FROM seo_metadata ${where} ORDER BY entity_kind, entity_id LIMIT ${limit} OFFSET ${offset}`,
      );
      return r.rows;
    },

    async save({ actorId, expectedUpdatedAt, ...input }) {
      validate(input);
      const existing = await this.get(input.entity_kind, input.entity_id).catch(() => null);

      if (existing === null) {
        if (expectedUpdatedAt !== undefined) throw new SeoConflictError('MISSING_ROW');
        const ins = await db.execute<SeoRow>(
          sql`INSERT INTO seo_metadata (entity_kind, entity_id, title, description, canonical_path, og_image_url, robots, noindex, structured_extra)
              VALUES (${input.entity_kind}::seo_entity_kind, ${input.entity_id}, ${input.title ?? null}, ${input.description ?? null},
                      ${input.canonical_path ?? null}, ${input.og_image_url ?? null}, ${input.robots ?? null}, ${input.noindex ?? false},
                      ${JSON.stringify(input.structured_extra ?? {})}::jsonb)
              ON CONFLICT (entity_kind, entity_id) DO NOTHING
              RETURNING id, entity_kind, entity_id, title, description, canonical_path, og_image_url, robots, noindex, structured_extra, updated_at`,
        );
        const created = ins.rows[0];
        if (created === undefined) throw new SeoConflictError('EXPECTED_STALE');
        await audit({
          actor_type: 'STAFF', actor_id: actorId, action: 'CREATE',
          entity_type: 'seo_metadata', entity_id: created.id,
          before_state: null,
          after_state: { entity_kind: input.entity_kind, entity_id: input.entity_id, title: input.title ?? null, noindex: input.noindex ?? false },
          reason: 'SEO metadata created',
        });
        return created;
      }

      if (expectedUpdatedAt === undefined || expectedUpdatedAt !== existing.updated_at) {
        throw new SeoConflictError('EXPECTED_STALE');
      }
      const upd = await db.execute<SeoRow>(
        sql`UPDATE seo_metadata
               SET title = ${input.title ?? null}, description = ${input.description ?? null},
                   canonical_path = ${input.canonical_path ?? null}, og_image_url = ${input.og_image_url ?? null},
                   robots = ${input.robots ?? null}, noindex = ${input.noindex ?? false},
                   structured_extra = ${JSON.stringify(input.structured_extra ?? existing.structured_extra ?? {})}::jsonb,
                   updated_at = now()
             WHERE entity_kind = ${input.entity_kind}::seo_entity_kind AND entity_id = ${input.entity_id}
               AND updated_at = ${expectedUpdatedAt}
             RETURNING id, entity_kind, entity_id, title, description, canonical_path, og_image_url, robots, noindex, structured_extra, updated_at`,
      );
      const updated = upd.rows[0];
      if (updated === undefined) throw new SeoConflictError('EXPECTED_STALE');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'UPDATE',
        entity_type: 'seo_metadata', entity_id: updated.id,
        before_state: { title: existing.title, noindex: existing.noindex },
        after_state: { title: updated.title, noindex: updated.noindex },
        reason: 'SEO metadata updated (optimistic concurrency held)',
      });
      return updated;
    },
  };
}
