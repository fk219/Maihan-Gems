/**
 * apps/web/src/api/customer-auth.spec.ts
 *
 * P2.4 — customer identity, end to end through the HTTP surface.
 *
 * No database and no DATABASE_URL: `db` is an in-memory executor that
 * emulates exactly the SQL `@maihan/db` issues for identity. The value of the
 * suite is that it drives the REAL handlers, the REAL scrypt hashing and the
 * REAL token repository contract through `createCatalogApi` — what is faked is
 * Postgres, not the application.
 *
 * Covered:
 *   - register: customer row, unverified, policy enforced, duplicate refused;
 *   - verify: single use, unknown/used token indistinguishable;
 *   - reset: always 200 (no enumeration), single use, weak password does not
 *     burn the link, sessions revoked, cookie cleared;
 *   - me: a customer session works; no cookie is 401;
 *   - production: no token in any response body;
 *   - no response ever contains a password.
 */
import { describe, expect, it } from 'vitest';

import { PASSWORD_RESET_TTL_MS, generateOpaqueToken, hashOpaqueToken } from '@maihan/domain';
import type { CatalogDatabase } from '@maihan/db';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';

const IDS = { traceId: 'c'.repeat(32), requestId: 'req_test_customer_auth' };

interface Query {
  text: string;
  values: unknown[];
}

interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  admin_role: string | null;
  state: 'ACTIVE' | 'SUSPENDED';
  email_verified_at: string | null;
}

interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  revoked_at: number | null;
}

interface TokenRecord {
  table: 'verification' | 'reset';
  user_id: string;
  token_hash: string;
  expires_at: number;
  used_at: number | null;
}

/** Deserialise a drizzle `sql` template into text + ordered values. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decompose(query: any): Query {
  const chunks: unknown[] = Array.isArray(query?.queryChunks) ? query.queryChunks : [];
  const parts: string[] = [];
  const values: unknown[] = [];
  for (const raw of chunks) {
    if (raw === null || raw === undefined) {
      parts.push('');
      values.push(null);
      continue;
    }
    const chunk = raw as { value?: unknown; queryChunks?: unknown[] };
    if (Array.isArray(chunk.value) && chunk.value.every((p) => typeof p === 'string')) {
      parts.push((chunk.value as string[]).join(''));
      continue;
    }
    if (Array.isArray(chunk.queryChunks)) {
      const inner = decompose(chunk);
      parts.push(inner.text);
      continue;
    }
    parts.push('');
    // Drizzle represents bound string parameters as boxed `String` objects in
    // this version, and `null` as a bare null chunk (handled above). The
    // toString tag is used rather than `instanceof`, which is fragile when the
    // module is loaded through a test runner's module graph.
    const tag = Object.prototype.toString.call(raw);
    if (tag === '[object String]') {
      values.push(String(raw));
      continue;
    }
    if (tag === '[object Number]' || tag === '[object Boolean]') {
      values.push((raw as { valueOf(): unknown }).valueOf());
      continue;
    }
    values.push(chunk.value === undefined ? null : chunk.value);
  }
  return { text: parts.join('').replace(/\s+/g, ' ').trim(), values };
}

interface Harness {
  readonly db: CatalogDatabase;
  readonly users: UserRecord[];
  readonly sessions: SessionRecord[];
  readonly tokens: TokenRecord[];
  readonly statements: string[];
  /** Pretend the existence check ran before another insert won the race. */
  emulateInsertRace(): void;
}

function createHarness(): Harness {
  const users: UserRecord[] = [];
  const sessions: SessionRecord[] = [];
  const tokens: TokenRecord[] = [];
  const statements: string[] = [];
  let idCounter = 0;
  let skipNextLookup = false;

  const nextId = (prefix: string): string => {
    idCounter += 1;
    return `${prefix}-${String(idCounter).padStart(4, '0')}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function execute(query: any): Promise<{ rows: any[] }> {
    const { text, values } = decompose(query);
    statements.push(text);

    // ---- users -----------------------------------------------------------
    if (text.startsWith('SELECT id, email, password_hash')) {
      if (skipNextLookup) {
        skipNextLookup = false;
        return { rows: [] };
      }
      const [email] = values as [string];
      const user = users.find((u) => u.email === email);
      return { rows: user === undefined ? [] : [{ ...user }] };
    }

    if (text.startsWith('INSERT INTO users')) {
      const [email, passwordHash, displayName, adminRole] = values as [
        string,
        string,
        string,
        string | null,
      ];
      if (users.some((u) => u.email === email)) {
        // A faithful unique-index violation: the handler must map 23505 to the
        // same message as a sequential duplicate, never a 500.
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505',
        });
      }
      const user: UserRecord = {
        id: nextId('user'),
        email,
        password_hash: passwordHash,
        display_name: displayName,
        admin_role: adminRole,
        state: 'ACTIVE',
        email_verified_at: null,
      };
      users.push(user);
      return { rows: [{ ...user }] };
    }

    if (text.includes('SET email_verified_at = COALESCE')) {
      const [userId] = values as [string];
      const user = users.find((u) => u.id === userId);
      if (user === undefined) return { rows: [] };
      user.email_verified_at ??= new Date().toISOString();
      return { rows: [{ email_verified_at: user.email_verified_at }] };
    }

    if (text.includes('SET password_hash =')) {
      const [passwordHash, userId] = values as [string, string];
      const user = users.find((u) => u.id === userId);
      if (user === undefined) return { rows: [] };
      user.password_hash = passwordHash;
      return { rows: [{ id: user.id }] };
    }

    // ---- sessions --------------------------------------------------------
    if (text.startsWith('INSERT INTO sessions')) {
      const [userId, tokenHash, expiresAt] = values as [string, string, string];
      const session: SessionRecord = {
        id: nextId('session'),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: Date.parse(expiresAt),
        revoked_at: null,
      };
      sessions.push(session);
      return { rows: [{ id: session.id, expires_at: expiresAt }] };
    }

    if (text.startsWith('SELECT s.id, s.user_id')) {
      const [tokenHash] = values as [string];
      const session = sessions.find(
        (s) => s.token_hash === tokenHash && s.revoked_at === null && s.expires_at > Date.now(),
      );
      if (session === undefined) return { rows: [] };
      const user = users.find((u) => u.id === session.user_id);
      if (user === undefined || user.state !== 'ACTIVE') return { rows: [] };
      return {
        rows: [
          {
            id: session.id,
            user_id: user.id,
            expires_at: new Date(session.expires_at).toISOString(),
            email: user.email,
            display_name: user.display_name,
            admin_role: user.admin_role,
            state: user.state,
            email_verified_at: user.email_verified_at,
          },
        ],
      };
    }

    if (text.startsWith('UPDATE sessions SET last_seen_at')) return { rows: [] };

    if (text.includes('UPDATE sessions SET revoked_at = now()')) {
      if (text.includes('WHERE user_id =')) {
        const [userId] = values as [string];
        for (const session of sessions) {
          if (session.user_id === userId && session.revoked_at === null) {
            session.revoked_at = Date.now();
          }
        }
        return { rows: [] };
      }
      const [sessionId] = values as [string];
      const session = sessions.find((s) => s.id === sessionId && s.revoked_at === null);
      if (session !== undefined) session.revoked_at = Date.now();
      return { rows: [] };
    }

    // ---- tokens ----------------------------------------------------------
    if (text.startsWith('INSERT INTO email_verification_tokens')) {
      const [userId, tokenHash, expiresAt] = values as [string, string, string];
      tokens.push({
        table: 'verification',
        user_id: userId,
        token_hash: tokenHash,
        expires_at: Date.parse(expiresAt),
        used_at: null,
      });
      return { rows: [{ id: nextId('vt'), expires_at: expiresAt }] };
    }

    if (text.startsWith('INSERT INTO password_reset_tokens')) {
      const [userId, tokenHash, expiresAt] = values as [string, string, string];
      tokens.push({
        table: 'reset',
        user_id: userId,
        token_hash: tokenHash,
        expires_at: Date.parse(expiresAt),
        used_at: null,
      });
      return { rows: [{ id: nextId('rt'), expires_at: expiresAt }] };
    }

    if (text.startsWith('UPDATE email_verification_tokens') || text.startsWith('UPDATE password_reset_tokens')) {
      const table = text.startsWith('UPDATE email_verification_tokens') ? 'verification' : 'reset';
      const [tokenHash] = values as [string];
      const token = tokens.find(
        (t) => t.table === table && t.token_hash === tokenHash && t.used_at === null,
      );
      if (token === undefined || token.expires_at <= Date.now()) return { rows: [] };
      token.used_at = Date.now();
      return { rows: [{ user_id: token.user_id }] };
    }

    throw new Error(`fake: unmatched SQL — ${text}`);
  }

  return {
    db: { execute } as unknown as CatalogDatabase,
    users,
    sessions,
    tokens,
    statements,
    emulateInsertRace: () => {
      skipNextLookup = true;
    },
  };
}

function buildApi(harness: Harness, environment?: string): CatalogApi {
  const service = createCatalogQueryService({
    port: new FakeCatalogPort(),
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-customer-auth',
  });
  return createCatalogApi({
    service,
    db: harness.db,
    ids: () => ({ ...IDS }),
    ...(environment === undefined ? {} : { environment }),
  });
}

interface AuthResponse {
  user?: { id?: string; email?: string; role?: string | null; emailVerified?: boolean; displayName?: string };
  verification?: { required?: boolean; expiresAt?: string };
  devVerificationToken?: string;
  verified?: boolean;
  emailVerifiedAt?: string;
  ok?: boolean;
  error?: { code?: string; message?: string; details?: Array<{ field?: string; message?: string }> };
}

function post(api: CatalogApi, path: string, body: unknown, cookie?: string): Promise<Response> {
  return api(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie === undefined ? {} : { cookie }),
      },
      body: JSON.stringify(body),
    }),
  );
}

function sessionCookie(response: Response): string {
  const header = response.headers.get('set-cookie') ?? '';
  const pair = header.split(';')[0] ?? '';
  expect(pair.startsWith('maihan_session=')).toBe(true);
  return pair;
}

const STRONG = 'Tsavorite-Garnet-41';
const NEW_STRONG = 'Emerald-Vein-Through-Quartz';
const CUSTOMER = { email: 'ada@example.com', displayName: 'Ada Lovelace', password: STRONG };

async function register(api: CatalogApi, body: unknown = CUSTOMER): Promise<Response> {
  return post(api, '/api/v1/auth/register', body);
}

async function verifiedDevToken(api: CatalogApi): Promise<string> {
  const response = await register(api);
  const body = (await response.json()) as AuthResponse;
  const token = body.devVerificationToken;
  expect(token, 'non-production registration must expose a dev token').toBeTypeOf('string');
  return token as string;
}

describe('POST /api/v1/auth/register', () => {
  it('creates an unverified CUSTOMER (admin_role NULL) and issues a verification token', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');

    const response = await register(api);
    expect(response.status).toBe(201);

    const body = (await response.json()) as AuthResponse;
    expect(body.user).toMatchObject({
      email: CUSTOMER.email,
      displayName: CUSTOMER.displayName,
      role: null,
      emailVerified: false,
    });
    expect(body.verification).toMatchObject({ required: true });
    expect(body.verification?.expiresAt).toBeTypeOf('string');

    expect(h.users).toHaveLength(1);
    expect(h.users[0]?.admin_role).toBeNull();
    expect(h.users[0]?.email_verified_at).toBeNull();
    // The password is stored as an scrypt encoding, never as the password.
    expect(h.users[0]?.password_hash).toMatch(/^scrypt\$/);
    expect(h.users[0]?.password_hash).not.toContain(STRONG);

    // A token row exists, and it holds a 64-char digest — never the token.
    expect(h.tokens).toHaveLength(1);
    expect(h.tokens[0]?.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(h.tokens[0]?.token_hash).not.toBe(body.devVerificationToken);

    // Registration must NOT open a session: the address is unverified.
    expect(h.sessions).toHaveLength(0);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('returns the body with no token when the environment is production', async () => {
    const h = createHarness();
    const api = buildApi(h, 'production');

    const response = await register(api);
    expect(response.status).toBe(201);
    const raw = await response.text();
    expect(raw).not.toContain('devVerificationToken');
    const body = JSON.parse(raw) as AuthResponse;
    expect(body.devVerificationToken).toBeUndefined();
    expect(h.tokens).toHaveLength(1);
  });

  it('never emits a token when the environment is unwired (fail closed)', async () => {
    const h = createHarness();
    const api = buildApi(h);
    const body = (await (await register(api)).json()) as AuthResponse;
    expect(body.devVerificationToken).toBeUndefined();
  });

  it('never emits a token in a non-local environment such as staging', async () => {
    const h = createHarness();
    const api = buildApi(h, 'staging');
    const body = (await (await register(api)).json()) as AuthResponse;
    // The allowlist is explicit: an unknown environment is not "not production".
    expect(body.devVerificationToken).toBeUndefined();
  });

  it('rejects 11 characters before touching the database', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');

    const response = await register(api, { ...CUSTOMER, password: 'short-pass1' });
    expect(response.status).toBe(400);
    const body = (await response.json()) as AuthResponse;
    expect(body.error?.code).toBe('VALIDATION_FAILED');
    expect(body.error?.details?.[0]?.message).toContain('12');

    expect(h.users).toHaveLength(0);
    expect(h.statements.some((s) => s.startsWith('INSERT INTO users'))).toBe(false);
  });

  it('rejects a top-100 password even with punctuation and digits appended', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');

    const response = await register(api, { ...CUSTOMER, password: 'P@ssw0rd1234' });
    expect(response.status).toBe(400);
    const body = (await response.json()) as AuthResponse;
    expect(body.error?.details?.[0]?.message).toMatch(/commonly used/i);
    expect(h.users).toHaveLength(0);
    // The rejected password never appears in the response.
    expect(JSON.stringify(body)).not.toContain('P@ssw0rd');
  });

  it('refuses a duplicate address without creating a second row', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    expect((await register(api)).status).toBe(201);

    const duplicate = await register(api);
    expect(duplicate.status).toBe(400);
    const body = (await duplicate.json()) as AuthResponse;
    expect(body.error?.message).toMatch(/already exists/i);
    expect(h.users).toHaveLength(1);
  });

  it('maps a lost insert race (unique violation) to the same 400, never a 500', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    expect((await register(api)).status).toBe(201);

    // The existence check sees nothing (another request has not committed yet),
    // so the insert is the statement that discovers the duplicate.
    h.emulateInsertRace();
    const racy = await register(api);
    expect(racy.status).toBe(400);
    const body = (await racy.json()) as AuthResponse;
    expect(body.error?.message).toMatch(/already exists/i);
    expect(h.users).toHaveLength(1);
  });

  it('normalises the address so one account cannot exist twice by case', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    expect((await register(api)).status).toBe(201);
    expect((await register(api, { ...CUSTOMER, email: '  ADA@Example.COM ' })).status).toBe(400);
    expect(h.users).toHaveLength(1);
  });
});

describe('POST /api/v1/auth/verify-email', () => {
  it('marks the address verified, exactly once', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    const token = await verifiedDevToken(api);

    const first = await post(api, '/api/v1/auth/verify-email', { token });
    expect(first.status).toBe(200);
    const body = (await first.json()) as AuthResponse;
    expect(body.verified).toBe(true);
    expect(body.emailVerifiedAt).toBeTypeOf('string');
    expect(h.users[0]?.email_verified_at).not.toBeNull();

    const second = await post(api, '/api/v1/auth/verify-email', { token });
    expect(second.status).toBe(400);
    const reused = (await second.json()) as AuthResponse;
    expect(reused.error?.code).toBe('VALIDATION_FAILED');
  });

  it('gives an unknown token the same answer as a used one', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    const token = await verifiedDevToken(api);
    await post(api, '/api/v1/auth/verify-email', { token });

    const usedBody = (await (
      await post(api, '/api/v1/auth/verify-email', { token })
    ).json()) as AuthResponse;
    const unknownBody = (await (
      await post(api, '/api/v1/auth/verify-email', { token: 'z'.repeat(43) })
    ).json()) as AuthResponse;

    expect(unknownBody.error?.message).toBe(usedBody.error?.message);
  });

  it('rejects a malformed token before any SQL runs', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    const response = await post(api, '/api/v1/auth/verify-email', { token: 'short' });
    expect(response.status).toBe(400);
    expect(h.statements).toHaveLength(0);
  });
});

describe('POST /api/v1/auth/request-password-reset', () => {
  it('answers identically for a known and an unknown address', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    await register(api);

    const known = await post(api, '/api/v1/auth/request-password-reset', { email: CUSTOMER.email });
    const unknown = await post(api, '/api/v1/auth/request-password-reset', {
      email: 'nobody@example.com',
    });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual({ ok: true });
    expect(await unknown.json()).toEqual({ ok: true });

    // One reset token exists — for the known account only.
    expect(h.tokens.filter((t) => t.table === 'reset')).toHaveLength(1);
  });

  it('never returns the token, not even in development', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    await register(api);
    const raw = await (await post(api, '/api/v1/auth/request-password-reset', { email: CUSTOMER.email })).text();
    expect(raw).toBe(JSON.stringify({ ok: true }));
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  it('rejects a weak password WITHOUT consuming the link', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    await register(api);
    await post(api, '/api/v1/auth/request-password-reset', { email: CUSTOMER.email });
    const reset = h.tokens.find((t) => t.table === 'reset');
    expect(reset).toBeDefined();

    // A syntactically valid but unknown token: the policy must fail first, so
    // the reset row stays unused and the customer can retry with the same link.
    const response = await post(api, '/api/v1/auth/reset-password', {
      token: 'x'.repeat(43),
      password: 'password1234',
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as AuthResponse;
    expect(body.error?.details?.[0]?.message).toMatch(/commonly used/i);
    expect(reset?.used_at).toBeNull();
  });

  it('rejects an unknown token with the shared message', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    await register(api);
    const before = h.users[0]?.password_hash;
    const response = await post(api, '/api/v1/auth/reset-password', {
      token: 'y'.repeat(43),
      password: NEW_STRONG,
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as AuthResponse;
    expect(body.error?.message).toMatch(/invalid, already used, or has expired/i);
    // An unknown token must not touch the credential it claims to replace.
    expect(h.users[0]?.password_hash).toBe(before);
  });

  it('consumes the token, replaces the hash, revokes every session and clears the cookie', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');

    // A live session BEFORE the reset, so "revoked" is observable.
    await register(api);
    const login = await post(api, '/api/v1/auth/login', {
      email: CUSTOMER.email,
      password: STRONG,
    });
    expect(login.status).toBe(200);
    expect(h.sessions).toHaveLength(1);
    const oldHash = h.users[0]?.password_hash;

    // Register the reset token directly, exactly as the CLI would.
    const token = generateOpaqueToken();
    h.tokens.push({
      table: 'reset',
      user_id: h.users[0]?.id as string,
      token_hash: hashOpaqueToken(token),
      expires_at: Date.now() + PASSWORD_RESET_TTL_MS,
      used_at: null,
    });

    const response = await post(api, '/api/v1/auth/reset-password', {
      token,
      password: NEW_STRONG,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(h.users[0]?.password_hash).not.toBe(oldHash);
    expect(h.users[0]?.password_hash).toMatch(/^scrypt\$/);
    expect(h.sessions.every((s) => s.revoked_at !== null)).toBe(true);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');

    // The old password no longer signs in; the new one does.
    expect(
      (
        await post(api, '/api/v1/auth/login', {
          email: CUSTOMER.email,
          password: STRONG,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await post(api, '/api/v1/auth/login', {
          email: CUSTOMER.email,
          password: NEW_STRONG,
        })
      ).status,
    ).toBe(200);
  });

  it('cannot redeem the same reset token twice', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    await register(api);

    const token = generateOpaqueToken();
    h.tokens.push({
      table: 'reset',
      user_id: h.users[0]?.id as string,
      token_hash: hashOpaqueToken(token),
      expires_at: Date.now() + PASSWORD_RESET_TTL_MS,
      used_at: null,
    });

    expect((await post(api, '/api/v1/auth/reset-password', { token, password: NEW_STRONG })).status).toBe(200);
    expect((await post(api, '/api/v1/auth/reset-password', { token, password: 'Another-Strong-One-7' })).status).toBe(400);
  });
});

describe('customer session through /api/v1/auth/me', () => {
  it('a customer who registers, verifies and signs in is readable through /me', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    const token = await verifiedDevToken(api);
    await post(api, '/api/v1/auth/verify-email', { token });

    const login = await post(api, '/api/v1/auth/login', {
      email: CUSTOMER.email,
      password: STRONG,
    });
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);

    const me = await api(
      new Request('http://localhost/api/v1/auth/me', { headers: { cookie } }),
    );
    expect(me.status).toBe(200);
    const body = (await me.json()) as AuthResponse;
    expect(body.user).toMatchObject({
      email: CUSTOMER.email,
      displayName: CUSTOMER.displayName,
      role: null,
      emailVerified: true,
    });
  });

  it('reports 401 without a session cookie', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    const me = await api(new Request('http://localhost/api/v1/auth/me'));
    expect(me.status).toBe(401);
  });

  it('a revoked session stops resolving immediately', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');
    await register(api);
    const login = await post(api, '/api/v1/auth/login', {
      email: CUSTOMER.email,
      password: STRONG,
    });
    const cookie = sessionCookie(login);

    expect((await api(new Request('http://localhost/api/v1/auth/me', { headers: { cookie } }))).status).toBe(200);

    const logout = await post(api, '/api/v1/auth/logout', {}, cookie);
    expect(logout.status).toBe(200);

    expect((await api(new Request('http://localhost/api/v1/auth/me', { headers: { cookie } }))).status).toBe(401);
  });
});

describe('no secret ever appears in a response', () => {
  it('register, verify, reset and login bodies never echo the password', async () => {
    const h = createHarness();
    const api = buildApi(h, 'local');

    const registerBody = await (await register(api)).text();
    expect(registerBody).not.toContain(STRONG);

    const login = await post(api, '/api/v1/auth/login', { email: CUSTOMER.email, password: STRONG });
    expect(await login.text()).not.toContain(STRONG);
    expect(await (await post(api, '/api/v1/auth/login', { email: CUSTOMER.email, password: 'wrong-Password-9' })).text()).not.toContain(
      'wrong-Password-9',
    );

    const resetBody = await (
      await post(api, '/api/v1/auth/request-password-reset', { email: CUSTOMER.email })
    ).text();
    expect(resetBody).not.toContain(STRONG);
  });
});
