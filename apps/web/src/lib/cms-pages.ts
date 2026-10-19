/**
 * apps/web/src/lib/cms-pages.ts
 *
 * Storefront CMS reads against the locked `pages` table (status PUBLISHED,
 * deleted_at IS NULL). Content pages — policy, education, blog, showrooms —
 * render the PUBLISHED head revision only (doc 22); unpublished rows never
 * leak to the storefront. Rich text is rendered through the doc-09 sanitisers
 * downstream; this module returns stored blocks verbatim.
 */
import 'server-only';
import { createPool } from '@maihan/db';

export interface CmsPage {
  slug: string;
  title: string;
  pageKind: string;
  blocks: CmsBlock[];
  updatedAt: string | null;
}

export interface CmsBlock {
  type: string;
  props: Record<string, unknown>;
}

const LOCAL_DATABASE_URL = 'postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev';

function resolveDatabaseUrl(): string {
  const configured = process.env['DATABASE_URL']?.trim() ?? '';
  if (!configured || configured.includes('<SECRET>') || configured.includes('<user>')) {
    return LOCAL_DATABASE_URL;
  }
  return configured;
}

function mapBlocks(value: unknown): CmsBlock[] {
  if (!Array.isArray(value)) return [];
  const out: CmsBlock[] = [];
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const type = record['type'];
    if (typeof type !== 'string' || type.length === 0) continue;
    const props = (record['props'] ?? {}) as Record<string, unknown>;
    out.push({ type, props });
  }
  return out;
}

export async function getCmsPageBySlug(slug: string): Promise<CmsPage | null> {
  const pool = createPool(resolveDatabaseUrl());
  try {
    const res = await pool.query<Record<string, unknown>>(
      `SELECT slug, title, page_kind, blocks, updated_at
       FROM pages
       WHERE slug = $1 AND status = 'PUBLISHED' AND deleted_at IS NULL
       LIMIT 1`,
      [slug],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      slug: String(row['slug']),
      title: String(row['title']),
      pageKind: String(row['page_kind']),
      blocks: mapBlocks(row['blocks']),
      updatedAt: row['updated_at'] instanceof Date ? row['updated_at'].toISOString() : null,
    };
  } catch {
    // CMS read failure degrades to the caller's static fallback — never a
    // fabricated replacement page.
    return null;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function listCmsPages(pageKind: string, limit = 24): Promise<CmsPage[]> {
  const pool = createPool(resolveDatabaseUrl());
  try {
    const res = await pool.query<Record<string, unknown>>(
      `SELECT slug, title, page_kind, blocks, updated_at
       FROM pages
       WHERE page_kind = $1 AND status = 'PUBLISHED' AND deleted_at IS NULL
       ORDER BY published_at DESC NULLS LAST, title ASC
       LIMIT $2`,
      [pageKind, limit],
    );
    return res.rows.map((row) => ({
      slug: String(row['slug']),
      title: String(row['title']),
      pageKind: String(row['page_kind']),
      blocks: mapBlocks(row['blocks']),
      updatedAt: row['updated_at'] instanceof Date ? row['updated_at'].toISOString() : null,
    }));
  } catch {
    return [];
  } finally {
    await pool.end().catch(() => undefined);
  }
}
