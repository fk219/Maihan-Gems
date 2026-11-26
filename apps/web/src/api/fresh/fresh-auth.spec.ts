/**
 * apps/web/src/api/fresh/fresh-auth.spec.ts
 *
 * develop's `/api/fresh-auth/**` sign-in family through the REAL pipeline.
 *
 * These paths are thin adapters over main's auth handlers and must stay that
 * way:
 *   - a successful register writes a `users` row and a verification token, and
 *     opens NO session (main's rule: verify the address first);
 *   - develop's `first_name`/`last_name` become main's strict `displayName`,
 *     because the contract rejects unknown fields;
 *   - request-reset is non-enumerating and always 200;
 *   - logout clears the cookie even with no session;
 *   - no caller value is interpolated into SQL.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogDatabase } from '@maihan/db';

import { createFreshAuthCompatApi } from './index.js';

const IDS = { traceId: 'a'.repeat(32), requestId: 'req_test_auth' };
const EMAIL = 'new-customer@example.test';
const PASSWORD = 'correct horse battery staple';

interface Captured {
  readonly text: string;
  readonly values: unknown[];
}

function buildFake(existingUser: unknown = null): {
  db: CatalogDatabase;
  queries: Captured[];
  writes: string[];
} {
  const queries: Captured[] = [];
  const writes: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function decompose(query: any): { text: string; values: unknown[] } {
    const chunks: unknown[] = Array.isArray(query?.queryChunks) ? query.queryChunks : [];
    const parts: string[] = [];
    const values: unknown[] = [];
    const walk = (items: unknown[]): void => {
      for (const raw of items) {
        if (raw === null || raw === undefined) {
          parts.push('$');
          values.push(null);
          continue;
        }
        const chunk = raw as { value?: unknown; queryChunks?: unknown[] };
        if (Array.isArray(chunk.value) && chunk.value.every((p) => typeof p === 'string')) {
          parts.push((chunk.value as string[]).join(''));
          continue;
        }
        if (Array.isArray(chunk.queryChunks)) {
          walk(chunk.queryChunks);
          continue;
        }
        parts.push('$');
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
          values.push(raw);
          continue;
        }
        values.push(chunk.value === undefined ? raw : chunk.value);
      }
    };
    walk(chunks);
    return { text: parts.join('').replace(/\s+/g, ' ').trim(), values };
  }

  async function execute(query: unknown): Promise<{ rows: unknown[] }> {
    const { text, values } = decompose(query);
    queries.push({ text, values });
    if (/\b(INSERT|UPDATE|DELETE)\b/i.test(text)) writes.push(text);

    if (text.includes('FROM users') && text.includes('WHERE email =')) {
      return { rows: existingUser === null ? [] : [existingUser] };
    }
    if (text.startsWith('INSERT INTO users')) {
      return {
        rows: [
          {
            id: 'user-new',
            email: String(values[0]),
            password_hash: String(values[1]),
            display_name: String(values[2]),
            admin_role: null,
            state: 'ACTIVE',
            email_verified_at: null,
          },
        ],
      };
    }
    if (text.includes('INSERT INTO email_verification_tokens')) {
      return { rows: [{ id: 'token-1', expires_at: String(values[2]) }] };
    }
    if (text.includes('INSERT INTO password_reset_tokens')) return { rows: [] };
    if (text.startsWith('UPDATE sessions SET revoked_at')) return { rows: [] };
    throw new Error(`fake-executor: unmatched SQL — ${text.slice(0, 160)}`);
  }

  return { db: { execute } as unknown as CatalogDatabase, queries, writes };
}

function api(fake: ReturnType<typeof buildFake>, environment = 'test') {
  return createFreshAuthCompatApi({ db: fake.db, ids: IDS, environment });
}

function post(
  fake: ReturnType<typeof buildFake>,
  path: string,
  body: unknown,
): Promise<Response> {
  return api(fake)(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('/api/fresh-auth routing', () => {
  it('rejects a GET on a POST-only path with Allow', async () => {
    const fake = buildFake();
    const response = await api(fake)(new Request('http://localhost/api/fresh-auth/login'));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toContain('POST');
    expect(fake.queries).toHaveLength(0);
  });

  it('an unknown fresh-auth path is 404, never 500', async () => {
    const fake = buildFake();
    const response = await api(fake)(
      new Request('http://localhost/api/fresh-auth/2fa', { method: 'POST' }),
    );
    expect(response.status).toBe(404);
  });
});

describe('register', () => {
  it('translates first/last name into displayName and never opens a session', async () => {
    const fake = buildFake();
    const response = await post(fake, '/api/fresh-auth/register', {
      email: EMAIL,
      password: PASSWORD,
      first_name: 'Amina',
      last_name: 'Khan',
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['user']).toMatchObject({ email: EMAIL, displayName: 'Amina Khan' });
    expect(body['verification']).toMatchObject({ required: true });

    const insert = fake.queries.find((q) => q.text.startsWith('INSERT INTO users'));
    expect(insert?.values).toEqual(expect.arrayContaining([EMAIL, 'Amina Khan']));
    expect(fake.queries.some((q) => q.text.includes('INSERT INTO sessions'))).toBe(false);
    // The dev verification token is aliased for develop's component.
    expect(typeof body['dev_verification_token']).toBe('string');
  });

  it('falls back to the email as displayName when no name was supplied', async () => {
    const fake = buildFake();
    const response = await post(fake, '/api/fresh-auth/register', {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(response.status).toBe(201);
    const insert = fake.queries.find((q) => q.text.startsWith('INSERT INTO users'));
    expect(insert?.values).toContain(EMAIL);
    expect(insert?.values).toContain(EMAIL);
  });

  it('binds the email and never interpolates it', async () => {
    const fake = buildFake();
    await post(fake, '/api/fresh-auth/register', {
      email: EMAIL,
      password: PASSWORD,
      first_name: 'Amina',
    });
    for (const query of fake.queries) {
      expect(query.text).not.toContain(EMAIL);
      expect(query.text).not.toContain(PASSWORD);
    }
  });

  it('refuses an already-registered address with a 400, before any insert', async () => {
    const fake = buildFake({
      id: 'user-existing',
      email: EMAIL,
      password_hash: 'scrypt$placeholder',
      display_name: 'Existing',
      admin_role: null,
      state: 'ACTIVE',
      email_verified_at: null,
    });
    const response = await post(fake, '/api/fresh-auth/register', {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(response.status).toBe(400);
    expect(fake.writes).toHaveLength(0);
  });
});

describe('request-reset and logout', () => {
  it('request-reset is always 200 and binds the email', async () => {
    const fake = buildFake();
    const response = await post(fake, '/api/fresh-auth/request-reset', { email: EMAIL });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fake.queries[0]?.values).toContain(EMAIL);
    expect(fake.queries[0]?.text).not.toContain(EMAIL);
  });

  it('logout clears the session cookie with no session present', async () => {
    const fake = buildFake();
    const response = await post(fake, '/api/fresh-auth/logout', {});
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('maihan_session=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
