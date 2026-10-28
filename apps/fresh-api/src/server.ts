// F3-V vendor portal API — fresh clean schema (technical_design/43 §3).
// DEV-ONLY service: binds to 127.0.0.1. Admin routes require the dev bearer
// token (FRESH_ADMIN_TOKEN). Vendor routes are identified by vendor code only —
// real vendor authentication (sessions/RBAC) lands with F3-AUTH.

import http from 'node:http';
import { z } from 'zod';
import { pool, withTx, PORT, HOST, ADMIN_TOKEN, type Db } from './db.js';
import { createVendor, approveOnboarding, rejectOnboarding, suspendOnboarding, getVendor } from './onboarding.js';
import { approveSubmission, rejectSubmission, listSubmissions } from './submissions.js';
import { VocabError, StateError, ConflictError } from './validation.js';
import { gemstoneSubmissionSchema, settingSubmissionSchema, productSubmissionSchema } from './validation.js';

const submissionSchemas = { gemstone: gemstoneSubmissionSchema, setting: settingSubmissionSchema, product: productSubmissionSchema } as const;

type Ctx = { method: string; path: string; query: URLSearchParams; body: unknown; headers: http.IncomingHttpHeaders };
type Handler = (ctx: Ctx, params: Record<string, string>) => Promise<{ status: number; json: unknown }>;

const ok = (json: unknown): { status: number; json: unknown } => ({ status: 200, json });
const created = (json: unknown): { status: number; json: unknown } => ({ status: 201, json });

function requireAdmin(ctx: Ctx): void {
  const auth = ctx.headers.authorization ?? '';
  if (auth !== `Bearer ${ADMIN_TOKEN}`) {
    const e = new Error('admin bearer token required') as Error & { status?: number };
    e.status = 401;
    throw e;
  }
}

async function requireOnboardedVendor(client: Db, code: string): Promise<void> {
  const v = await getVendor(client, code);
  if (v.onboarding_status !== 'APPROVED' || v.status !== 'ACTIVE') {
    const e = new Error(`vendor '${code}' is not onboarded/active`) as Error & { status?: number };
    e.status = 409;
    throw e;
  }
}

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [
  { method: 'GET', pattern: /^\/healthz$/, handler: async () => ok({ ok: true, service: 'fresh-api' }) },

  { method: 'POST', pattern: /^\/api\/v1\/vendors$/, handler: async (ctx) => {
    const r = await withTx((c) => createVendor(c, ctx.body));
    return created(r);
  } },

  { method: 'GET', pattern: /^\/api\/v1\/vendors\/(?<code>V-[A-Za-z]{2}-\d{3})$/, handler: async (_ctx, p) => ok(await getVendor(pool, p.code!)) },

  { method: 'POST', pattern: /^\/api\/v1\/admin\/onboarding\/(?<code>V-[A-Za-z]{2}-\d{3})\/(?<action>approve|reject|suspend)$/, handler: async (ctx, p) => {
    requireAdmin(ctx);
    const note = (ctx.body as { note?: string } | null)?.note ?? null;
    await withTx(async (c) => {
      if (p.action === 'approve') await approveOnboarding(c, p.code!, 'admin');
      else if (p.action === 'reject') await rejectOnboarding(c, p.code!, note ?? 'no reason given', 'admin');
      else await suspendOnboarding(c, p.code!, note ?? 'suspended', 'admin');
    });
    return ok(await getVendor(pool, p.code!));
  } },

  { method: 'POST', pattern: /^\/api\/v1\/vendors\/(?<code>V-[A-Za-z]{2}-\d{3})\/submissions$/, handler: async (ctx, p) => {
    const body = (ctx.body ?? {}) as { submission_kind?: string };
    const kind = body.submission_kind;
    const schema = submissionSchemas[kind as keyof typeof submissionSchemas];
    if (!schema) {
      const e = new Error('submission_kind must be one of gemstone | setting | product') as Error & { status?: number };
      e.status = 422;
      throw e;
    }
    const payload = schema.parse(body);
    const r = await withTx(async (c) => {
      await requireOnboardedVendor(c, p.code!);
      const { rows } = await c.query(`SELECT id FROM fresh.vendors WHERE code = $1`, [p.code!.toUpperCase()]);
      const inserted = await c.query(
        `INSERT INTO fresh.vendor_submissions (vendor_id, submission_kind, payload, status)
         VALUES ($1,$2,$3::jsonb,'SUBMITTED') RETURNING id`,
        [rows[0]!.id, kind, JSON.stringify(payload)],
      );
      return { submission_id: Number(inserted.rows[0]!.id) };
    });
    return created(r);
  } },

  { method: 'GET', pattern: /^\/api\/v1\/vendors\/(?<code>V-[A-Za-z]{2}-\d{3})\/submissions$/, handler: async (ctx, p) =>
    ok(await listSubmissions(pool, ctx.query.get('status'), p.code!)) },

  { method: 'GET', pattern: /^\/api\/v1\/admin\/submissions$/, handler: async (ctx) => {
    requireAdmin(ctx);
    return ok(await listSubmissions(pool, ctx.query.get('status'), ctx.query.get('vendor')));
  } },

  { method: 'POST', pattern: /^\/api\/v1\/admin\/submissions\/(?<id>\d+)\/(?<action>approve|reject)$/, handler: async (ctx, p) => {
    requireAdmin(ctx);
    const id = Number(p.id);
    if (p.action === 'approve') {
      const r = await withTx((c) => approveSubmission(c, id, 'admin'));
      return ok(r);
    }
    const note = (ctx.body as { note?: string } | null)?.note ?? 'no reason given';
    await withTx((c) => rejectSubmission(c, id, note, 'admin'));
    return ok({ id, status: 'REJECTED' });
  } },

  { method: 'GET', pattern: /^\/api\/v1\/catalogue\/(?<kind>gemstones|settings|products)$/, handler: async (ctx, p) => {
    const status = ctx.query.get('status') ?? 'ACTIVE';
    const limit = Math.min(Number(ctx.query.get('limit') ?? 50), 200);
    const offset = Number(ctx.query.get('offset') ?? 0);
    const { rows } = await pool.query(
      `SELECT ref, slug, name, price_amount, currency, status FROM fresh.${p.kind} WHERE status = $1 ORDER BY ref LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    return ok({ kind: p.kind, status, count: rows.length, items: rows });
  } },
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  let body: unknown = null;
  if (raw) { try { body = JSON.parse(raw); } catch { res.writeHead(400).end('{"error":"invalid JSON body"}'); return; } }

  const ctx: Ctx = { method: req.method ?? 'GET', path: url.pathname, query: url.searchParams, body, headers: req.headers };
  try {
    for (const r of routes) {
      if (r.method !== ctx.method) continue;
      const m = ctx.path.match(r.pattern);
      if (!m) continue;
      const out = await r.handler(ctx, m.groups ?? {});
      res.writeHead(out.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out.json, null, 2));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: `no route: ${ctx.method} ${ctx.path}` }));
  } catch (e) {
    const err = e as Error & { status?: number; code?: string };
    const status = err.status
      ?? (err instanceof z.ZodError || err instanceof VocabError ? 422
        : err instanceof ConflictError ? 409
        : err instanceof StateError ? 409
        : err.code === '23505' ? 409
        : 500);
    const detail = err instanceof z.ZodError ? err.issues : err.message;
    if (status === 500) console.error('fresh-api 500:', err);
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify({ error: detail }));
  }
});

server.listen(PORT, HOST, () => console.log(`fresh-api listening on http://${HOST}:${PORT} (dev; localhost only)`));

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => { server.close(() => pool.end().then(() => process.exit(0))); });
}
