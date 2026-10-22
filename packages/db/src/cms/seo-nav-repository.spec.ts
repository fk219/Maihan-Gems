/**
 * packages/db/src/cms/seo-nav-repository.spec.ts
 *
 * Live-DB integration (DB-gated: skips when no PostgreSQL is reachable, per
 * the repo testing discipline) for the P3-5 admin console repositories:
 * SEO upsert + audit, navigation update + audit, redirect create/conflict/
 * delete + audit, and the jobs-ops requeue guard.
 */
import { afterAll, describe, expect, it } from 'vitest';

import {
  createCatalogDatabase,
  createJobsOpsRepository,
  createPool,
  createSeoNavRepository,
  isRedirectConflict,
  type Pool,
} from '../index.js';

const DATABASE_URL = process.env['DATABASE_URL'] ?? '';
let pool: Pool | null = null;
let reachable = false;

// Top-level probe (like worker.spec): collection-time skipIf must see the
// final value, so the reachability check cannot live inside beforeAll.
if (DATABASE_URL) {
  pool = createPool(DATABASE_URL, { max: 2 });
  try {
    await pool.query('SELECT 1');
    reachable = true;
  } catch {
    reachable = false;
  }
}

afterAll(async () => {
  if (pool) await pool.end().catch(() => undefined);
});

describe.skipIf(!reachable)('seo/nav/redirects repositories (live database)', () => {
  it('upserts SEO metadata with audit rows and second-write before-state', async () => {
    if (!pool) return;
    const repo = createSeoNavRepository(createCatalogDatabase(pool));
    const actorId = crypto.randomUUID();
    const entityId = crypto.randomUUID();

    const first = await repo.upsertSeoMetadata({
      entityKind: 'PRODUCT', entityId, title: 'First title', noindex: false, actorId,
    });
    const second = await repo.upsertSeoMetadata({
      entityKind: 'PRODUCT', entityId, title: 'Second title', description: 'desc', noindex: true, actorId,
    });

    expect(second.id).toBe(first.id);
    expect(second.title).toBe('Second title');
    expect(second.noindex).toBe(true);

    const audits = await pool.query(
      `SELECT action, entity_type, before_state, after_state FROM audit_logs
        WHERE entity_type = 'seo_metadata' AND entity_id = $1 ORDER BY id`, [first.id],
    );
    expect(audits.rows.length).toBe(2);
    expect((audits.rows[1] as { before_state: Record<string, unknown> }).before_state)
      .toMatchObject({ title: 'First title' });

    await pool.query('DELETE FROM audit_logs WHERE entity_type = $1 AND entity_id = $2', ['seo_metadata', first.id]);
    await pool.query('DELETE FROM seo_metadata WHERE id = $1', [first.id]);
  });

  it('updates navigation items with an audit row', async () => {
    if (!pool) return;
    const repo = createSeoNavRepository(createCatalogDatabase(pool));
    await pool.query(
      `INSERT INTO navigations (key, label, items) VALUES ('header', 'Header nav', '[]'::jsonb)
       ON CONFLICT (key, locale) DO NOTHING`,
    );
    const items = [{ label: 'Gemstones', href: '/gemstones' }, { label: 'Design Your Own', href: '/design-your-own' }];
    const row = await repo.updateNavigationItems({ key: 'header', locale: 'en', items, actorId: crypto.randomUUID() });
    expect(row.key).toBe('header');
    expect(Array.isArray(row.items)).toBe(true);

    const audits = await pool.query(
      `SELECT action FROM audit_logs WHERE entity_type = 'navigations' AND entity_id = $1 ORDER BY id DESC LIMIT 1`,
      [row.id],
    );
    expect((audits.rows[0] as { action: string }).action).toBe('UPDATE');
  });

  it('creates, refuses duplicates, then deletes a redirect with audit rows', async () => {
    if (!pool) return;
    const repo = createSeoNavRepository(createCatalogDatabase(pool));
    const actorId = crypto.randomUUID();
    const fromPath = `/admin-spec/${crypto.randomUUID()}`;

    const created = await repo.createRedirect({ fromPath, toPath: '/gemstones', statusCode: 301, actorId });
    expect(created.status_code).toBe(301);

    let conflictCaught = false;
    try {
      await repo.createRedirect({ fromPath, toPath: '/gemstones', statusCode: 302, actorId });
    } catch (error) {
      conflictCaught = isRedirectConflict(error);
    }
    expect(conflictCaught).toBe(true);

    await expect(repo.createRedirect({ fromPath: '/x', toPath: '/x', statusCode: 301, actorId }))
      .rejects.toThrow(/must differ/);

    await repo.deleteRedirect({ id: created.id, actorId });
    const gone = await pool.query('SELECT 1 FROM redirects WHERE id = $1', [created.id]);
    expect(gone.rowCount).toBe(0);

    const audits = await pool.query(
      `SELECT action FROM audit_logs WHERE entity_type = 'redirects' AND entity_id = $1 ORDER BY id`,
      [created.id],
    );
    expect(audits.rows.map((r) => (r as { action: string }).action)).toEqual(['CREATE', 'DELETE']);
    await pool.query('DELETE FROM audit_logs WHERE entity_type = $1 AND entity_id = $2', ['redirects', created.id]);
  });

  it('jobs-ops: requeue refuses non-dead-letter states and requeues a dead-lettered job with audit', async () => {
    if (!pool) return;
    const repo = createJobsOpsRepository(createCatalogDatabase(pool));
    const actorId = crypto.randomUUID();

    const queued = await pool.query(
      `INSERT INTO jobs (job_key, queue, job_type, state) VALUES ($1, 'spec', 'spec.job', 'QUEUED') RETURNING id`,
      [`spec-queued-${crypto.randomUUID()}`],
    );
    const queuedId = (queued.rows[0] as { id: string }).id;
    await expect(repo.requeueDeadLetter({ jobId: queuedId, actorId })).rejects.toThrow(/only DEAD_LETTER/i);

    const dead = await pool.query(
      `INSERT INTO jobs (job_key, queue, job_type, state, last_error) VALUES ($1, 'spec', 'spec.job', 'DEAD_LETTER', 'boom') RETURNING id`,
      [`spec-dead-${crypto.randomUUID()}`],
    );
    const deadId = (dead.rows[0] as { id: string }).id;
    const requeued = await repo.requeueDeadLetter({ jobId: deadId, actorId });
    expect(requeued.state).toBe('QUEUED');
    expect(requeued.attempts).toBe(0);

    const audits = await pool.query(
      `SELECT action FROM audit_logs WHERE entity_type = 'jobs' AND entity_id = $1`,
      [deadId],
    );
    expect((audits.rows[0] as { action: string }).action).toBe('REQUEUE_DEAD_LETTER');

    await pool.query('DELETE FROM audit_logs WHERE entity_type = $1 AND entity_id = $2', ['jobs', deadId]);
    await pool.query('DELETE FROM jobs WHERE id = ANY($1)', [[queuedId, deadId]]);
  });
});
