/**
 * packages/db/src/identity/customer-auth-repository.spec.ts
 *
 * Unit tests only — a fake executor, no database, no DATABASE_URL.
 *
 * The properties under test are the ones that make a token safe:
 *   - only a SHA-256 digest ever reaches SQL;
 *   - redemption is ONE statement whose predicates are single-use and expiry;
 *   - a second redemption of the same token yields nothing (the race is a
 *     predicate, not a caller check);
 *   - verification is idempotent and keeps the FIRST timestamp.
 *
 * The fake emulates exactly the statements this repository issues and throws
 * on anything else, so a query added without a test is loud rather than
 * silently "passing".
 */
import { describe, expect, it } from 'vitest';

import type { CatalogDatabase } from '../catalog/executor.js';
import {
  consumeResetToken,
  consumeVerificationToken,
  createResetToken,
  createVerificationToken,
  markEmailVerified,
  updatePasswordHash,
} from './customer-auth-repository.js';

interface Query {
  text: string;
  values: unknown[];
}

interface TokenRow {
  table: 'verification' | 'reset';
  user_id: string;
  token_hash: string;
  created_at: number;
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
  db: CatalogDatabase;
  calls: Query[];
  tokens: TokenRow[];
  users: Map<string, { email_verified_at: number | null; password_hash: string }>;
  nowMs(): number;
  advance(ms: number): void;
}

function createHarness(): Harness {
  let clock = Date.UTC(2026, 0, 1, 12, 0, 0);
  const calls: Query[] = [];
  const tokens: TokenRow[] = [];
  const users = new Map<string, { email_verified_at: number | null; password_hash: string }>();
  users.set('user-1', { email_verified_at: null, password_hash: 'scrypt$old' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function execute(query: any): Promise<{ rows: any[] }> {
    const { text, values } = decompose(query);
    calls.push({ text, values });

    if (text.startsWith('INSERT INTO email_verification_tokens')) {
      const [userId, tokenHash, expiresAt] = values as [string, string, string];
      tokens.push({
        table: 'verification',
        user_id: userId,
        token_hash: tokenHash,
        created_at: clock,
        expires_at: Date.parse(expiresAt),
        used_at: null,
      });
      return { rows: [{ id: `vt-${tokens.length}`, expires_at: expiresAt }] };
    }

    if (text.startsWith('INSERT INTO password_reset_tokens')) {
      const [userId, tokenHash, expiresAt] = values as [string, string, string];
      tokens.push({
        table: 'reset',
        user_id: userId,
        token_hash: tokenHash,
        created_at: clock,
        expires_at: Date.parse(expiresAt),
        used_at: null,
      });
      return { rows: [{ id: `rt-${tokens.length}`, expires_at: expiresAt }] };
    }

    if (text.startsWith('UPDATE email_verification_tokens')) {
      const [tokenHash] = values as [string];
      const row = tokens.find(
        (t) => t.table === 'verification' && t.token_hash === tokenHash && t.used_at === null,
      );
      if (row === undefined || row.expires_at <= clock) return { rows: [] };
      row.used_at = clock;
      return { rows: [{ user_id: row.user_id }] };
    }

    if (text.startsWith('UPDATE password_reset_tokens')) {
      const [tokenHash] = values as [string];
      const row = tokens.find(
        (t) => t.table === 'reset' && t.token_hash === tokenHash && t.used_at === null,
      );
      if (row === undefined || row.expires_at <= clock) return { rows: [] };
      row.used_at = clock;
      return { rows: [{ user_id: row.user_id }] };
    }

    if (text.includes('SET email_verified_at = COALESCE')) {
      const [userId] = values as [string];
      const user = users.get(userId);
      if (user === undefined) return { rows: [] };
      user.email_verified_at ??= clock;
      return { rows: [{ email_verified_at: new Date(user.email_verified_at).toISOString() }] };
    }

    if (text.includes('SET password_hash =')) {
      const [passwordHash, userId] = values as [string, string];
      const user = users.get(userId);
      if (user === undefined) return { rows: [] };
      user.password_hash = passwordHash;
      return { rows: [{ id: userId }] };
    }

    throw new Error(`fake: unmatched SQL — ${text}`);
  }

  return {
    db: { execute } as unknown as CatalogDatabase,
    calls,
    tokens,
    users,
    nowMs: () => clock,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

const HOUR = 60 * 60 * 1000;

describe('email verification tokens', () => {
  it('stores the digest and expiry, and returns no token material', async () => {
    const h = createHarness();
    const expiresAt = new Date(h.nowMs() + 24 * HOUR).toISOString();

    const row = await createVerificationToken(h.db, {
      userId: 'user-1',
      tokenHash: 'a'.repeat(64),
      expiresAt,
    });

    expect(row).toEqual({ id: 'vt-1', expires_at: expiresAt });
    expect(Object.keys(row).sort()).toEqual(['expires_at', 'id']);

    const insert = h.calls[0] as Query;
    expect(insert.text).toContain('INSERT INTO email_verification_tokens');
    expect(insert.values).toEqual(['user-1', 'a'.repeat(64), expiresAt]);
    // The only token-shaped value that reaches SQL is a 64-char hex digest.
    expect(insert.values[1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it('redeems once, atomically, then reports the token as unknown', async () => {
    const h = createHarness();
    await createVerificationToken(h.db, {
      userId: 'user-1',
      tokenHash: 'b'.repeat(64),
      expiresAt: new Date(h.nowMs() + 24 * HOUR).toISOString(),
    });

    const first = await consumeVerificationToken(h.db, 'b'.repeat(64));
    expect(first).toEqual({ user_id: 'user-1' });

    const second = await consumeVerificationToken(h.db, 'b'.repeat(64));
    expect(second, 'a consumed token must never redeem twice').toBeNull();

    const statements = h.calls.filter((c) => c.text.startsWith('UPDATE email_verification_tokens'));
    expect(statements).toHaveLength(2);
    for (const statement of statements) {
      // Both guards live in the SQL, so no caller can forget one.
      expect(statement.text).toContain('used_at IS NULL');
      expect(statement.text).toContain('expires_at > now()');
      expect(statement.text).toContain('RETURNING user_id');
      // ONE statement: there is no read-then-write window.
      expect(statement.text.match(/UPDATE/g)).toHaveLength(1);
      expect(statement.text).not.toContain('SELECT');
    }
  });

  it('refuses an expired token even though it was never used', async () => {
    const h = createHarness();
    await createVerificationToken(h.db, {
      userId: 'user-1',
      tokenHash: 'c'.repeat(64),
      expiresAt: new Date(h.nowMs() + HOUR).toISOString(),
    });

    h.advance(2 * HOUR);
    expect(await consumeVerificationToken(h.db, 'c'.repeat(64))).toBeNull();
  });

  it('returns null for an unknown digest without throwing', async () => {
    const h = createHarness();
    expect(await consumeVerificationToken(h.db, 'f'.repeat(64))).toBeNull();
  });
});

describe('password reset tokens', () => {
  it('uses its own table and the same single-use predicate', async () => {
    const h = createHarness();
    await createResetToken(h.db, {
      userId: 'user-1',
      tokenHash: 'd'.repeat(64),
      expiresAt: new Date(h.nowMs() + HOUR).toISOString(),
    });

    expect((h.calls[0] as Query).text).toContain('INSERT INTO password_reset_tokens');

    expect(await consumeResetToken(h.db, 'd'.repeat(64))).toEqual({ user_id: 'user-1' });
    expect(await consumeResetToken(h.db, 'd'.repeat(64))).toBeNull();

    const update = h.calls.find((c) => c.text.startsWith('UPDATE password_reset_tokens')) as Query;
    expect(update.text).toContain('used_at IS NULL');
    expect(update.text).toContain('expires_at > now()');
    expect(update.text).toContain('RETURNING user_id');
    // A reset token can never verify an email: disjoint tables, disjoint SQL.
    expect(update.text).not.toContain('email_verification_tokens');
  });
});

describe('users lifecycle', () => {
  it('marks the address verified and keeps the FIRST timestamp', async () => {
    const h = createHarness();
    const first = await markEmailVerified(h.db, 'user-1');
    expect(first).not.toBeNull();
    const firstAt = first?.email_verified_at;

    h.advance(3 * HOUR);
    const second = await markEmailVerified(h.db, 'user-1');
    expect(second?.email_verified_at).toBe(firstAt);

    const update = h.calls[0] as Query;
    expect(update.text).toContain('COALESCE(email_verified_at, now())');
  });

  it('reports a missing user instead of inventing a verified time', async () => {
    const h = createHarness();
    expect(await markEmailVerified(h.db, 'user-does-not-exist')).toBeNull();
  });

  it('replaces the password hash and reports whether a row changed', async () => {
    const h = createHarness();
    expect(await updatePasswordHash(h.db, 'user-1', 'scrypt$new')).toBe(true);
    expect(h.users.get('user-1')?.password_hash).toBe('scrypt$new');
    expect(await updatePasswordHash(h.db, 'user-missing', 'scrypt$new')).toBe(false);

    const update = h.calls[0] as Query;
    expect(update.values).toEqual(['scrypt$new', 'user-1']);
  });

  it('never returns a password hash from any function', async () => {
    const h = createHarness();
    const results = [
      await markEmailVerified(h.db, 'user-1'),
      await updatePasswordHash(h.db, 'user-1', 'scrypt$new'),
      await consumeVerificationToken(h.db, 'f'.repeat(64)),
      await consumeResetToken(h.db, 'f'.repeat(64)),
    ];
    expect(JSON.stringify(results)).not.toContain('password_hash');
    expect(JSON.stringify(results)).not.toContain('scrypt');
  });
});
