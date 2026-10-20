/**
 * packages/db/src/auth/auth-repository.ts
 *
 * Authentication, Session Lifecycle, Password Hashing (scrypt), Verification,
 * Password Reset, Notifications, and RBAC Identity Resolution.
 *
 * Security invariants enforced:
 * - Memory-hard password hashing via Node crypto `scryptSync` (N=16384, r=8, p=1,
 *   16-byte random salt, 64-byte derived key) + `timingSafeEqual`.
 * - Dummy hash verification when an email is absent to prevent timing enumeration.
 * - Sessions are HMAC-SHA256 signed AND backed by revocable PostgreSQL rows
 *   (storing only SHA-256 hash of the raw token at rest).
 * - Password reset and email verification tokens are single-use, time-bounded,
 *   and stored only as SHA-256 hashes at rest.
 * - Password reset revokes all active sessions for the account.
 * - Brute-force lockout after 5 consecutive failed login attempts (15m window).
 * - Uses the locked 75-table schema (`customers`, `customer_profiles`, `jobs`,
 *   `audit_logs`) so `pnpm run schema-fidelity` remains 100% intact.
 */
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { ContractError } from '@maihan/contracts';
import { isDevSeamEnabled } from '@maihan/config';
import { ADMIN_ROLES, ROLE_SCOPES, type AdminRole } from '@maihan/domain';
import type { CatalogDatabase } from '../catalog/executor.js';

export type AccountRole = 'CUSTOMER' | 'VENDOR' | AdminRole;

export type VendorOnboardingStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';

export interface AuthenticatedActor {
  readonly customer_id: string;
  readonly email: string;
  /** The managed-identity subject stored on `customers.identity_user_id` —
   * the value the RLS policies compare against `app.user_subject` (doc 09). */
  readonly identity_user_id?: string | null;
  readonly first_name: string | null;
  readonly last_name: string | null;
  readonly phone: string | null;
  readonly role: AccountRole;
  readonly email_verified: boolean;
  readonly email_verified_at: string | null;
  readonly vendor_id: string | null;
  readonly vendor_status: VendorOnboardingStatus | null;
  readonly vendor_name: string | null;
  readonly permissions: readonly string[];
  readonly csrf_token: string;
  readonly session_expires_at: string;
}

export interface RegisterAccountInput {
  readonly email: string;
  readonly password: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly phone?: string;
  readonly role?: 'CUSTOMER' | 'VENDOR';
  readonly vendor_name?: string;
  readonly vendor_country?: string;
  readonly vendor_city?: string;
}

export interface RegisterAccountResult {
  readonly actor: AuthenticatedActor;
  readonly session_token: string;
  readonly csrf_token: string;
  readonly verification_token: string;
}

export interface LoginAccountInput {
  readonly email: string;
  readonly password: string;
  readonly ip_address?: string;
  readonly user_agent?: string;
}

export interface LoginAccountResult {
  readonly actor: AuthenticatedActor;
  readonly session_token: string;
  readonly csrf_token: string;
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_TTL_HOURS = 24 * 7;

function getSessionSecret(): string {
  const configured = process.env['MAIHAN_SESSION_SECRET']?.trim();
  if (configured) return configured;
  if (process.env['MAIHAN_ENV'] === 'production') {
    throw new Error('MAIHAN_SESSION_SECRET must be configured in production.');
  }
  return 'maihan_gems_session_hmac_secret_v1_local_dev';
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, Buffer.from(salt, 'hex'), SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString('hex');
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`;
}

const DUMMY_PASSWORD_HASH = hashPassword('dummy_timing_protection_password_value_123!');

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const saltHex = parts[4] ?? '';
    const expectedHex = parts[5] ?? '';
    if (!saltHex || !expectedHex || !Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
      return false;
    }
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expectedHex.length / 2, {
      N,
      r,
      p,
    });
    const expected = Buffer.from(expectedHex, 'hex');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function signSessionRawToken(rawHex: string): string {
  const sig = createHmac('sha256', getSessionSecret()).update(rawHex, 'utf8').digest('hex');
  return `${rawHex}.${sig}`;
}

function verifySignedSessionToken(signedToken: string): string | null {
  const dot = signedToken.indexOf('.');
  if (dot <= 0) return null;
  const rawHex = signedToken.slice(0, dot);
  const sigHex = signedToken.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/i.test(rawHex) || !/^[0-9a-f]{64}$/i.test(sigHex)) {
    return null;
  }
  const expectedSig = createHmac('sha256', getSessionSecret()).update(rawHex, 'utf8').digest('hex');
  const a = Buffer.from(sigHex, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return rawHex.toLowerCase();
}

export function computePermissionsForRole(role: AccountRole, vendorStatus?: VendorOnboardingStatus | null): string[] {
  if (role === 'CUSTOMER') {
    return [
      'account:read',
      'account:write',
      'addresses:read',
      'addresses:write',
      'cart:write',
      'checkout:write',
      'orders:read_own',
      'orders:cancel_own',
      'refunds:request_own',
      'wishlist:write',
    ];
  }
  if (role === 'VENDOR') {
    const base = ['account:read', 'account:write', 'vendor:profile_read', 'vendor:profile_write'];
    if (vendorStatus === 'APPROVED') {
      base.push(
        'vendor:products_read',
        'vendor:products_write',
        'vendor:products_submit',
        'vendor:inventory_write',
        'vendor:orders_read',
        'vendor:fulfillment_write',
      );
    }
    return base;
  }
  if (role === 'ADMIN_SUPER') {
    return ['admin:*', 'products:*', 'vendors:*', 'orders:*', 'refunds:*', 'customers:*', 'content:*', 'users:*', 'audit:read'];
  }
  const scope = ROLE_SCOPES[role as AdminRole] ?? {};
  const perms: string[] = [];
  for (const [mod, actions] of Object.entries(scope)) {
    for (const act of actions ?? []) {
      perms.push(`${mod}:${act}`);
    }
  }
  return perms;
}

export async function recordNotification(
  db: CatalogDatabase,
  input: {
    customer_id: string;
    email: string;
    kind:
      | 'EMAIL_VERIFICATION'
      | 'PASSWORD_RESET'
      | 'ORDER_CONFIRMATION'
      | 'PAYMENT_STATUS'
      | 'SHIPMENT_UPDATE'
      | 'REFUND_UPDATE'
      | 'VENDOR_STATUS'
      | 'PRODUCT_MODERATION';
    subject: string;
    body: string;
    metadata?: Record<string, unknown>;
    dedupe_key?: string;
  },
): Promise<void> {
  const jobKey =
    input.dedupe_key ??
    `notify:${input.kind}:${input.customer_id}:${Date.now()}:${randomBytes(4).toString('hex')}`;
  await db.execute(sql`
    INSERT INTO notifications (
      customer_id,
      email,
      kind,
      subject,
      body,
      metadata,
      dedupe_key
    ) VALUES (
      ${input.customer_id}::uuid,
      ${input.email},
      ${input.kind},
      ${input.subject},
      ${input.body},
      ${JSON.stringify(input.metadata ?? {})}::jsonb,
      ${jobKey}
    )
    ON CONFLICT (dedupe_key) DO NOTHING
  `);

  // Transactional email delivery (Phase 13 remediation M-05): every recorded
  // notification also enqueues a worker-claimable delivery job on the
  // `default` OPERATIONAL queue (doc 27 §1). The worker's notify.email
  // handler sends it through the configured transactional email provider;
  // with no provider configured the handler completes with an honest
  // OUTBOX_LOG disposition instead of pretending an email was sent.
  await db.execute(sql`
    INSERT INTO jobs (
      job_key,
      queue,
      job_type,
      payload,
      state
    ) VALUES (
      ${jobKey + ':email'},
      'default',
      'notify.email',
      ${JSON.stringify({
        customer_id: input.customer_id,
        email: input.email,
        kind: input.kind,
        subject: input.subject,
        text: input.body,
        category: input.kind,
        created_at: new Date().toISOString(),
      })}::jsonb,
      'QUEUED'
    )
    ON CONFLICT (job_key) DO NOTHING
  `);
}

export async function listCustomerNotifications(
  db: CatalogDatabase,
  customerId: string,
): Promise<Array<{
  id: string;
  kind: string;
  subject: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
}>> {
  const res = await db.execute(sql`
    SELECT id::text AS id, kind, subject, body, metadata, created_at
    FROM notifications
    WHERE customer_id = ${customerId}::uuid
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return (res.rows as Array<{
    id: string;
    kind: string;
    subject: string;
    body: string;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }>).map((row) => ({
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    body: row.body,
    metadata: row.metadata ?? {},
    created_at: new Date(row.created_at).toISOString(),
  }));
}

async function createSessionForCustomer(
  db: CatalogDatabase,
  input: {
    customerId: string;
    email: string;
    role: AccountRole;
    vendorId: string | null;
  },
): Promise<{ sessionToken: string; csrfToken: string; expiresAt: string }> {
  const rawTokenHex = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(24).toString('hex');
  const tokenHash = sha256Hex(rawTokenHex);
  const signedToken = signSessionRawToken(rawTokenHex);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  await db.execute(sql`
    INSERT INTO auth_sessions (
      token_hash,
      customer_id,
      email,
      role,
      vendor_id,
      csrf_token,
      expires_at
    ) VALUES (
      ${tokenHash},
      ${input.customerId}::uuid,
      ${input.email},
      ${input.role},
      ${input.vendorId}::uuid,
      ${csrfToken},
      ${expiresAt}::timestamptz
    )
  `);

  return { sessionToken: signedToken, csrfToken, expiresAt };
}

export async function registerAccount(
  db: CatalogDatabase,
  input: RegisterAccountInput,
): Promise<RegisterAccountResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ContractError('VALIDATION_FAILED', 'A valid email address is required.');
  }
  if (!input.password || input.password.length < 8) {
    throw new ContractError('VALIDATION_FAILED', 'Password must be at least 8 characters long.');
  }

  const existingRes = await db.execute(sql`
    SELECT id FROM customers WHERE lower(email::text) = ${normalizedEmail} AND deleted_at IS NULL LIMIT 1
  `);

  let customerId: string;
  let identityUserId: string | null;
  if (existingRes.rows.length > 0) {
    const existingId = (existingRes.rows[0] as { id: string }).id;
    const credCheck = await db.execute(sql`
      SELECT customer_id FROM auth_credentials WHERE customer_id = ${existingId}::uuid LIMIT 1
    `);
    if (credCheck.rows.length > 0) {
      throw new ContractError('IDEMPOTENCY_CONFLICT', 'An account with this email already exists.');
    }
    customerId = existingId;
    const identityRes = await db.execute(sql`
      SELECT identity_user_id FROM customers WHERE id = ${existingId} LIMIT 1
    `);
    identityUserId = (identityRes.rows[0] as { identity_user_id: string | null } | undefined)?.identity_user_id ?? null;
    await db.execute(sql`
      UPDATE customers
      SET first_name = COALESCE(${input.first_name ?? null}, first_name),
          last_name = COALESCE(${input.last_name ?? null}, last_name),
          phone = COALESCE(${input.phone ?? null}, phone),
          updated_at = now()
      WHERE id = ${customerId}
    `);
  } else {
    identityUserId = 'usr_' + randomBytes(12).toString('hex');
    const ins = await db.execute(sql`
      INSERT INTO customers (
        identity_user_id,
        email,
        first_name,
        last_name,
        phone,
        state
      ) VALUES (
        ${identityUserId},
        ${normalizedEmail},
        ${input.first_name?.trim() || null},
        ${input.last_name?.trim() || null},
        ${input.phone?.trim() || null},
        'ACTIVE'
      )
      RETURNING id
    `);
    customerId = (ins.rows[0] as { id: string }).id;
    await db.execute(sql`
      INSERT INTO customer_profiles (customer_id) VALUES (${customerId}) ON CONFLICT (customer_id) DO NOTHING
    `);
  }

  const role: AccountRole = input.role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';
  let vendorId: string | null = null;
  let vendorStatus: VendorOnboardingStatus | null = null;
  let vendorName: string | null = null;

  if (role === 'VENDOR') {
    const displayName = input.vendor_name?.trim() || `${input.first_name ?? 'Maison'} Gems`;
    const slug = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + randomBytes(3).toString('hex');
    // R1-3 (F-06 completion): permanent vendor state lives in
    // vendor_onboarding, never in the transient jobs queue (doc 27 §1).
    const vendorInsertRes = await db.execute(sql`
      INSERT INTO vendor_onboarding (
        owner_customer_id,
        email,
        slug,
        display_name,
        legal_name,
        country_code,
        city,
        bourse_member,
        status
      ) VALUES (
        ${customerId},
        ${normalizedEmail},
        ${slug},
        ${displayName},
        ${displayName},
        ${input.vendor_country?.trim().toUpperCase().slice(0, 2) || 'AE'},
        ${input.vendor_city?.trim() || 'Dubai'},
        false,
        'PENDING'
      )
      RETURNING id::text AS id
    `);
    vendorId = (vendorInsertRes.rows[0] as { id: string }).id;
    vendorStatus = 'PENDING';
    vendorName = displayName;
  }

  const passwordHash = hashPassword(input.password);

  await db.execute(sql`
    INSERT INTO auth_credentials (
      customer_id,
      email,
      password_hash,
      role,
      vendor_id,
      failed_attempts,
      password_changed_at
    ) VALUES (
      ${customerId}::uuid,
      ${normalizedEmail},
      ${passwordHash},
      ${role},
      ${vendorId}::uuid,
      0,
      now()
    )
    ON CONFLICT (customer_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        vendor_id = EXCLUDED.vendor_id,
        updated_at = now()
  `);

  // Issue single-use email verification token (24h expiry)
  const rawVerifyToken = randomBytes(32).toString('hex');
  const verifyHash = sha256Hex(rawVerifyToken);
  await db.execute(sql`
    INSERT INTO auth_tokens (
      token_hash,
      customer_id,
      email,
      kind,
      expires_at
    ) VALUES (
      ${verifyHash},
      ${customerId}::uuid,
      ${normalizedEmail},
      'EMAIL_VERIFICATION',
      now() + interval '24 hours'
    )
    ON CONFLICT (token_hash) DO NOTHING
  `);

  await recordNotification(db, {
    customer_id: customerId,
    email: normalizedEmail,
    kind: 'EMAIL_VERIFICATION',
    subject: 'Verify your Maihan Gems account',
    body: `Welcome to Maihan Gems. Verify your email with token: ${rawVerifyToken}`,
    metadata: { verification_path: `/account/verify-email?token=${rawVerifyToken}` },
  });

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, after_state, reason
    ) VALUES (
      ${role === 'VENDOR' ? 'VENDOR' : 'CUSTOMER'},
      ${customerId}::uuid,
      'ACCOUNT_REGISTERED',
      'customer',
      ${customerId}::uuid,
      ${JSON.stringify({ email: '[REDACTED]', role, vendor_id: vendorId })}::jsonb,
      'Self-service registration'
    )
  `);

  const session = await createSessionForCustomer(db, {
    customerId,
    email: normalizedEmail,
    role,
    vendorId,
  });

  return {
    actor: {
      customer_id: customerId,
      email: normalizedEmail,
      identity_user_id: identityUserId,
      first_name: input.first_name?.trim() || null,
      last_name: input.last_name?.trim() || null,
      phone: input.phone?.trim() || null,
      role,
      email_verified: false,
      email_verified_at: null,
      vendor_id: vendorId,
      vendor_status: vendorStatus,
      vendor_name: vendorName,
      permissions: computePermissionsForRole(role, vendorStatus),
      csrf_token: session.csrfToken,
      session_expires_at: session.expiresAt,
    },
    session_token: session.sessionToken,
    csrf_token: session.csrfToken,
    verification_token: rawVerifyToken,
  };
}

export async function authenticateAccount(
  db: CatalogDatabase,
  input: LoginAccountInput,
): Promise<LoginAccountResult> {
  const normalizedEmail = (input.email ?? '').trim().toLowerCase();
  const password = input.password ?? '';

  if (!normalizedEmail || !password) {
    throw new ContractError('UNAUTHORIZED', 'Invalid email or password.');
  }

  const custRes = await db.execute(sql`
    SELECT id, email::text AS email, first_name, last_name, phone,
           identity_user_id, email_verified_at::text AS email_verified_at, state::text AS state
    FROM customers
    WHERE lower(email::text) = ${normalizedEmail}
      AND deleted_at IS NULL
    LIMIT 1
  `);

  if (custRes.rows.length === 0) {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    throw new ContractError('UNAUTHORIZED', 'Invalid email or password.');
  }

  const cust = custRes.rows[0] as {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    identity_user_id: string | null;
    email_verified_at: string | null;
    state: string;
  };

  if (cust.state !== 'ACTIVE') {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    throw new ContractError('FORBIDDEN', 'This account has been suspended or deactivated.');
  }

  const credRes = await db.execute(sql`
    SELECT password_hash, role, vendor_id::text AS vendor_id, failed_attempts, locked_until
    FROM auth_credentials
    WHERE customer_id = ${cust.id}::uuid
    LIMIT 1
  `);

  if (credRes.rows.length === 0) {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    throw new ContractError('UNAUTHORIZED', 'Invalid email or password.');
  }

  const cred = credRes.rows[0] as {
    password_hash: string;
    role: AccountRole;
    vendor_id: string | null;
    failed_attempts: number;
    locked_until: Date | string | null;
  };
  if (cred.locked_until && new Date(cred.locked_until).getTime() > Date.now()) {
    throw new ContractError(
      'RATE_LIMITED',
      'Account is temporarily locked due to repeated failed sign-in attempts. Please try again later.',
    );
  }

  const valid = verifyPassword(password, cred.password_hash);
  if (!valid) {
    const attempts = (cred.failed_attempts ?? 0) + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;
    await db.execute(sql`
      UPDATE auth_credentials
      SET failed_attempts = ${attempts},
          locked_until = ${lockedUntil}::timestamptz,
          updated_at = now()
      WHERE customer_id = ${cust.id}::uuid
    `);
    throw new ContractError('UNAUTHORIZED', 'Invalid email or password.');
  }

  // Reset failed attempts on successful login
  if ((cred.failed_attempts ?? 0) > 0 || cred.locked_until !== null) {
    await db.execute(sql`
      UPDATE auth_credentials
      SET failed_attempts = 0, locked_until = NULL, updated_at = now()
      WHERE customer_id = ${cust.id}::uuid
    `);
  }

  let vendorStatus: VendorOnboardingStatus | null = null;
  let vendorName: string | null = null;
  if (cred.vendor_id) {
    // R1-3: read from the normalized vendor_onboarding table.
    const vRes = await db.execute(sql`
      SELECT status, display_name FROM vendor_onboarding WHERE id = ${cred.vendor_id} LIMIT 1
    `);
    if (vRes.rows.length > 0) {
      const vp = vRes.rows[0] as { status: string; display_name: string };
      vendorStatus = (vp.status as VendorOnboardingStatus) ?? 'PENDING';
      vendorName = vp.display_name ?? null;
    }
  }

  const session = await createSessionForCustomer(db, {
    customerId: cust.id,
    email: cust.email,
    role: cred.role,
    vendorId: cred.vendor_id,
  });

  return {
    actor: {
      customer_id: cust.id,
      email: cust.email,
      identity_user_id: cust.identity_user_id,
      first_name: cust.first_name,
      last_name: cust.last_name,
      phone: cust.phone,
      role: cred.role,
      email_verified: cust.email_verified_at !== null,
      email_verified_at: cust.email_verified_at,
      vendor_id: cred.vendor_id,
      vendor_status: vendorStatus,
      vendor_name: vendorName,
      permissions: computePermissionsForRole(cred.role, vendorStatus),
      csrf_token: session.csrfToken,
      session_expires_at: session.expiresAt,
    },
    session_token: session.sessionToken,
    csrf_token: session.csrfToken,
  };
}

export async function verifySession(
  db: CatalogDatabase,
  signedSessionToken: string | null | undefined,
): Promise<AuthenticatedActor | null> {
  if (!signedSessionToken) return null;
  const rawHex = verifySignedSessionToken(signedSessionToken.trim());
  if (!rawHex) return null;

  const tokenHash = sha256Hex(rawHex);
  const sessRes = await db.execute(sql`
    SELECT customer_id::text AS customer_id, csrf_token, expires_at::text AS expires_at
    FROM auth_sessions
    WHERE token_hash = ${tokenHash}
      AND revoked_at IS NULL
      AND expires_at > now()
    LIMIT 1
  `);
  if (sessRes.rows.length === 0) return null;

  const sessRow = sessRes.rows[0] as {
    customer_id: string;
    csrf_token: string;
    expires_at: string;
  };
  const customerId = sessRow.customer_id;

  const custRes = await db.execute(sql`
    SELECT id, email::text AS email, first_name, last_name, phone,
           identity_user_id, email_verified_at::text AS email_verified_at, state::text AS state
    FROM customers
    WHERE id = ${customerId} AND deleted_at IS NULL
    LIMIT 1
  `);
  if (custRes.rows.length === 0) return null;
  const cust = custRes.rows[0] as {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    identity_user_id: string | null;
    email_verified_at: string | null;
    state: string;
  };
  if (cust.state !== 'ACTIVE') return null;

  const credRes = await db.execute(sql`
    SELECT role, vendor_id::text AS vendor_id
    FROM auth_credentials
    WHERE customer_id = ${cust.id}::uuid
    LIMIT 1
  `);
  const cred = credRes.rows[0] as { role: AccountRole; vendor_id: string | null } | undefined;
  const role: AccountRole = cred?.role ?? 'CUSTOMER';
  const vendorId = cred?.vendor_id ?? null;

  let vendorStatus: VendorOnboardingStatus | null = null;
  let vendorName: string | null = null;
  if (vendorId) {
    // R1-3: read from the normalized vendor_onboarding table.
    const vRes = await db.execute(sql`
      SELECT status, display_name FROM vendor_onboarding WHERE id = ${vendorId} LIMIT 1
    `);
    if (vRes.rows.length > 0) {
      const vp = vRes.rows[0] as { status: string; display_name: string };
      vendorStatus = (vp.status as VendorOnboardingStatus) ?? 'PENDING';
      vendorName = vp.display_name ?? null;
    }
  }

  return {
    customer_id: cust.id,
    email: cust.email,
    identity_user_id: cust.identity_user_id,
    first_name: cust.first_name,
    last_name: cust.last_name,
    phone: cust.phone,
    role,
    email_verified: cust.email_verified_at !== null,
    email_verified_at: cust.email_verified_at,
    vendor_id: vendorId,
    vendor_status: vendorStatus,
    vendor_name: vendorName,
    permissions: computePermissionsForRole(role, vendorStatus),
    csrf_token: sessRow.csrf_token,
    session_expires_at: new Date(sessRow.expires_at).toISOString(),
  };
}

export async function revokeSession(
  db: CatalogDatabase,
  signedSessionToken: string | null | undefined,
): Promise<boolean> {
  if (!signedSessionToken) return false;
  const rawHex = verifySignedSessionToken(signedSessionToken.trim());
  if (!rawHex) return false;
  const tokenHash = sha256Hex(rawHex);
  const res = await db.execute(sql`
    UPDATE auth_sessions
    SET revoked_at = now()
    WHERE token_hash = ${tokenHash}
      AND revoked_at IS NULL
    RETURNING id
  `);
  return res.rows.length > 0;
}

export async function revokeAllUserSessions(
  db: CatalogDatabase,
  customerId: string,
): Promise<number> {
  const res = await db.execute(sql`
    UPDATE auth_sessions
    SET revoked_at = now()
    WHERE customer_id = ${customerId}::uuid
      AND revoked_at IS NULL
    RETURNING id
  `);
  return res.rows.length;
}

export async function verifyEmailWithToken(
  db: CatalogDatabase,
  rawToken: string,
): Promise<{ customer_id: string; email: string }> {
  const cleaned = (rawToken ?? '').trim();
  if (!cleaned) {
    throw new ContractError('VALIDATION_FAILED', 'Verification token is required.');
  }
  const tokenHash = sha256Hex(cleaned);
  const res = await db.execute(sql`
    UPDATE auth_tokens
    SET consumed_at = now()
    WHERE token_hash = ${tokenHash}
      AND kind = 'EMAIL_VERIFICATION'
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING customer_id::text AS customer_id, email::text AS email
  `);
  if (res.rows.length === 0) {
    throw new ContractError('UNPROCESSABLE', 'Verification token is invalid, expired, or has already been used.');
  }
  const payload = res.rows[0] as { customer_id: string; email: string };
  await db.execute(sql`
    UPDATE customers SET email_verified_at = now(), updated_at = now()
    WHERE id = ${payload.customer_id}
  `);
  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, reason
    ) VALUES (
      'CUSTOMER',
      ${payload.customer_id}::uuid,
      'EMAIL_VERIFIED',
      'customer',
      ${payload.customer_id}::uuid,
      'Email verified via single-use token'
    )
  `);
  return payload;
}

export async function requestPasswordReset(
  db: CatalogDatabase,
  email: string,
): Promise<{ reset_token_for_sandbox?: string }> {
  const normalizedEmail = (email ?? '').trim().toLowerCase();
  if (!normalizedEmail) return {};
  const custRes = await db.execute(sql`
    SELECT id, email::text AS email FROM customers
    WHERE lower(email::text) = ${normalizedEmail} AND deleted_at IS NULL AND state = 'ACTIVE'
    LIMIT 1
  `);
  if (custRes.rows.length === 0) {
    // Never reveal whether an email is registered
    return {};
  }
  const cust = custRes.rows[0] as { id: string; email: string };
  const rawResetToken = randomBytes(32).toString('hex');
  const resetHash = sha256Hex(rawResetToken);

  await db.execute(sql`
    INSERT INTO auth_tokens (
      token_hash,
      customer_id,
      email,
      kind,
      expires_at
    ) VALUES (
      ${resetHash},
      ${cust.id}::uuid,
      ${cust.email},
      'PASSWORD_RESET',
      now() + interval '30 minutes'
    )
    ON CONFLICT (token_hash) DO NOTHING
  `);

  await recordNotification(db, {
    customer_id: cust.id,
    email: cust.email,
    kind: 'PASSWORD_RESET',
    subject: 'Maihan Gems password recovery',
    body: `A password reset was requested for your account. Token (valid 30 minutes, single use): ${rawResetToken}`,
    metadata: { reset_path: `/account/reset-password?token=${rawResetToken}` },
  });

  // R1-1 fail-closed: the reset token is returned in the internal result ONLY
  // under an explicit developer seam (vitest sets NODE_ENV=test), so automated
  // integration tests can still exercise the complete reset flow. A deployment
  // that forgets MAIHAN_ENV no longer leaks reset tokens into API responses.
  return isDevSeamEnabled() ? { reset_token_for_sandbox: rawResetToken } : {};
}

export async function resetPasswordWithToken(
  db: CatalogDatabase,
  rawToken: string,
  newPassword: string,
): Promise<{ customer_id: string }> {
  const cleaned = (rawToken ?? '').trim();
  if (!cleaned) {
    throw new ContractError('VALIDATION_FAILED', 'Reset token is required.');
  }
  if (!newPassword || newPassword.length < 8) {
    throw new ContractError('VALIDATION_FAILED', 'New password must be at least 8 characters long.');
  }
  const resetHash = sha256Hex(cleaned);
  const res = await db.execute(sql`
    UPDATE auth_tokens
    SET consumed_at = now()
    WHERE token_hash = ${resetHash}
      AND kind = 'PASSWORD_RESET'
      AND consumed_at IS NULL
      AND expires_at > now()
    RETURNING customer_id::text AS customer_id, email::text AS email
  `);
  if (res.rows.length === 0) {
    throw new ContractError('UNPROCESSABLE', 'Password reset token is invalid, expired, or has already been used.');
  }
  const payload = res.rows[0] as { customer_id: string; email: string };
  await db.execute(sql`
    INSERT INTO auth_credentials (
      customer_id, email, password_hash, role, failed_attempts, locked_until, password_changed_at
    ) VALUES (
      ${payload.customer_id}::uuid,
      ${payload.email},
      ${hashPassword(newPassword)},
      'CUSTOMER',
      0,
      NULL,
      now()
    )
    ON CONFLICT (customer_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        failed_attempts = 0,
        locked_until = NULL,
        password_changed_at = now(),
        updated_at = now()
  `);

  // Invalidate all active sessions on security event
  await revokeAllUserSessions(db, payload.customer_id);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, reason
    ) VALUES (
      'CUSTOMER',
      ${payload.customer_id}::uuid,
      'PASSWORD_RESET_COMPLETED',
      'customer',
      ${payload.customer_id}::uuid,
      'Password reset via single-use token; all active sessions revoked'
    )
  `);

  return { customer_id: payload.customer_id };
}

export async function assignAccountRole(
  db: CatalogDatabase,
  input: {
    targetCustomerId: string;
    newRole: AccountRole;
    actorSub: string;
    actorRole: AdminRole;
    reason?: string;
  },
): Promise<{ customer_id: string; role: AccountRole }> {
  if (input.actorRole !== 'ADMIN_SUPER') {
    throw new ContractError('FORBIDDEN', 'Only ADMIN_SUPER may assign or modify account roles.');
  }
  const validRoles = new Set<string>(['CUSTOMER', 'VENDOR', ...ADMIN_ROLES]);
  if (!validRoles.has(input.newRole)) {
    throw new ContractError('VALIDATION_FAILED', `Invalid role: ${input.newRole}`);
  }
  const credRes = await db.execute(sql`
    SELECT role FROM auth_credentials
    WHERE customer_id = ${input.targetCustomerId}::uuid
    LIMIT 1
  `);
  if (credRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Target account credentials not found.');
  }
  const previousRole = (credRes.rows[0] as { role: AccountRole }).role;
  await db.execute(sql`
    UPDATE auth_credentials
    SET role = ${input.newRole}, updated_at = now()
    WHERE customer_id = ${input.targetCustomerId}::uuid
  `);
  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, action, entity_type, entity_id, before_state, after_state, reason
    ) VALUES (
      'ADMIN',
      'ROLE_ASSIGNED',
      'customer',
      ${input.targetCustomerId}::uuid,
      ${JSON.stringify({ role: previousRole })}::jsonb,
      ${JSON.stringify({ role: input.newRole, assigned_by: input.actorSub })}::jsonb,
      ${input.reason ?? 'Administrative role assignment'}
    )
  `);
  return { customer_id: input.targetCustomerId, role: input.newRole };
}

export async function listAccountsForAdmin(
  db: CatalogDatabase,
  limit = 100,
): Promise<Array<{
  customer_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AccountRole;
  state: string;
  email_verified: boolean;
  vendor_id: string | null;
  created_at: string;
}>> {
  const res = await db.execute(sql`
    SELECT c.id::text AS customer_id,
           c.email::text AS email,
           c.first_name,
           c.last_name,
           c.state::text AS state,
           c.email_verified_at IS NOT NULL AS email_verified,
           c.created_at::text AS created_at,
           ac.role AS cred_role,
           ac.vendor_id::text AS cred_vendor_id
    FROM customers c
    LEFT JOIN auth_credentials ac ON ac.customer_id = c.id
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ${limit}
  `);
  return (res.rows as Array<Record<string, unknown>>).map((row) => ({
    customer_id: String(row['customer_id']),
    email: String(row['email'] ?? ''),
    first_name: row['first_name'] ? String(row['first_name']) : null,
    last_name: row['last_name'] ? String(row['last_name']) : null,
    role: (row['cred_role'] as AccountRole | null) ?? 'CUSTOMER',
    state: String(row['state'] ?? 'ACTIVE'),
    email_verified: Boolean(row['email_verified']),
    vendor_id: row['cred_vendor_id'] ? String(row['cred_vendor_id']) : null,
    created_at: new Date(String(row['created_at'])).toISOString(),
  }));
}
