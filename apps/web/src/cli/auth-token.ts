/**
 * apps/web/src/cli/auth-token.ts
 *
 * Development-only operator tool for the module that has no email provider
 * yet: mint a verification or password-reset token for an existing account and
 * print it once, so the flow can be completed locally.
 *
 *   pnpm --filter @maihan/web run auth-token -- --email customer@maihan.local
 *   pnpm --filter @maihan/web run auth-token -- --email customer@maihan.local --kind reset
 *
 * Two honest limitations, both deliberate:
 *
 *   1. **It refuses to run in production.** `ENVIRONMENT=production` (or
 *      `prod`) exits non-zero before any database work. A tool that can hand
 *      out a reset token for any address is a complete account-takeover
 *      primitive; it must never exist on a production host.
 *   2. **It cannot print "the latest token".** Tokens are stored as SHA-256
 *      digests only (AGENTS.md §10, ADR-027), so the plaintext of an existing
 *      token is unrecoverable by design — by us as well as by an attacker.
 *      Instead this mints a NEW token through the same repository function the
 *      API uses, and prints that. The effect is the same for a developer: one
 *      usable link for one address.
 *
 * Nothing here logs a password, and the token is written to stdout only (never
 * to a file, never to a database column in plaintext).
 */
import { isProductionEnvironment, loadRuntimeConfig, runtimeEnvironment } from '@maihan/config';
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  generateOpaqueToken,
  hashOpaqueToken,
  tokenExpiry,
} from '@maihan/domain';
import {
  createCatalogDatabase,
  createPool,
  createResetToken,
  createVerificationToken,
  findUserByEmail,
} from '@maihan/db';

type TokenKind = 'verify' | 'reset';

interface Args {
  email: string | null;
  kind: TokenKind;
}

function parseArgs(argv: readonly string[]): Args {
  let email: string | null = null;
  let kind: TokenKind = 'verify';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    if (arg === '--email') {
      email = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === '--kind') {
      const value = (argv[i + 1] ?? '').toLowerCase();
      kind = value === 'reset' ? 'reset' : 'verify';
      i += 1;
      continue;
    }
    if (!arg.startsWith('--') && email === null) email = arg;
  }
  return { email, kind };
}

async function main(): Promise<void> {
  const { email: rawEmail, kind } = parseArgs(process.argv.slice(2));
  const email = rawEmail?.trim().toLowerCase() ?? '';
  if (email.length === 0) {
    process.stderr.write(
      'auth-token: an email is required. Usage: auth-token --email <address> [--kind verify|reset]\n',
    );
    process.exitCode = 1;
    return;
  }

  // The production guard runs BEFORE configuration and before any connection:
  // a tool that mints account credentials must refuse to exist on a production
  // host even if DATABASE_URL happens to be malformed or absent.
  const environment = runtimeEnvironment();
  if (isProductionEnvironment(environment)) {
    process.stderr.write(
      `auth-token: refusing to run with ENVIRONMENT=${environment}. This tool mints account credentials and is development-only.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const config = loadRuntimeConfig();

  const pool = createPool(config.databaseUrl, { max: 1 });
  try {
    const db = createCatalogDatabase(pool);
    const user = await findUserByEmail(db, email);
    if (user === null) {
      process.stderr.write(`auth-token: no account for ${email}.\n`);
      process.exitCode = 1;
      return;
    }

    const token = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(token);
    const ttl = kind === 'reset' ? PASSWORD_RESET_TTL_MS : EMAIL_VERIFICATION_TTL_MS;
    const expiresAt = tokenExpiry(Date.now(), ttl);

    const issued =
      kind === 'reset'
        ? await createResetToken(db, { userId: user.id, tokenHash, expiresAt })
        : await createVerificationToken(db, { userId: user.id, tokenHash, expiresAt });

    const endpoint =
      kind === 'reset'
        ? `POST /api/v1/auth/reset-password  {"token":"<token>","password":"<new password>"}`
        : `POST /api/v1/auth/verify-email    {"token":"<token>"}`;

    process.stdout.write(
      [
        `auth-token: ${kind} token for ${user.email} (dev only; stored hash ${issued.id})`,
        `token: ${token}`,
        `expiresAt: ${issued.expires_at}`,
        `use: ${endpoint}`,
        '',
      ].join('\n'),
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  process.stderr.write(`auth-token: ${message}\n`);
  process.exitCode = 1;
});
