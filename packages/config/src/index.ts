/**
 * packages/config — environment schema, feature flags, constants.
 *
 * Owns: env parsing, feature flags, constants.
 * Must never contain: the secrets themselves.
 *
 * This is the ONLY package permitted to read `process.env`. Per
 * technical_design/03 implementation constraint 3, no other package may read
 * it — the ESLint boundary config enforces that as a lint error.
 *
 * The env schema arrives now because a runtime dependency first needs
 * configuration: Phase 3 tasks 6-10 start the catalogue API process, which
 * needs its database, its optional Redis cache and its listener port.
 * Secrets themselves live in the platform secret manager only: never in the
 * repository, the database, a config table, a log or a trace (AGENTS.md 10).
 * Nothing parsed here is ever written to a log by this package.
 *
 * No schema library is introduced: the surface is four variables and each
 * validation is a plain predicate (a new runtime dependency would require an
 * ADR — SKILL_MATRIX_AND_TOOLING.md §13).
 */

/**
 * Object-storage selection for media delivery (Track A5).
 *
 * `none` is a valid, explicit state: the media endpoint answers 500 rather
 * than redirecting to a path nothing serves. `local` is for development and
 * tests; `s3` covers Cloudflare R2 and any S3-compatible endpoint.
 *
 * Values are carried, never logged. The credential fields exist for the
 * driver constructor only.
 */
export type MediaStorageConfig =
  | { readonly driver: 'none' }
  | { readonly driver: 'local'; readonly root: string }
  | {
      readonly driver: 's3';
      readonly endpoint: string;
      readonly bucket: string;
      readonly region: string;
      readonly accessKeyId: string;
      readonly secretAccessKey: string;
      readonly publicBaseUrl: string;
    };

export interface RuntimeConfig {
  /** PostgreSQL connection string — the source of truth (ADR-002). */
  readonly databaseUrl: string;
  /** Redis URL — cache/rate-limit acceleration only; absent means bypass. */
  readonly redisUrl: string | null;
  /** Listener port for the catalogue API process. */
  readonly apiPort: number;
  /** Environment name; namespaces cache keys so environments never share. */
  readonly environment: string;
  /**
   * One-shot bootstrap credentials for `pnpm run create-admin`. Read from the
   * environment, never from a file in the repository, and never logged.
   */
  readonly adminSeedEmail: string | null;
  readonly adminSeedPassword: string | null;
  /** Media driver configuration; `none` means the endpoint fails closed. */
  readonly mediaStorage: MediaStorageConfig;
  /** Transactional email delivery; `sink` is the default and sends nothing. */
  readonly email: EmailConfig;
  /**
   * Public origin used to build absolute links in email (order, reset, vendor
   * portal). Required in production: a localhost link in a customer's inbox is
   * worse than a startup failure.
   */
  readonly appBaseUrl: string;
}

/**
 * How transactional email leaves the process (BUILD_BACKLOG Track B4).
 *
 * `none`  — no transport. `send()` fails closed rather than pretending.
 * `sink`  — the default. A bounded in-memory ring buffer, plus an optional
 *           file under `EMAIL_MAILBOX_DIR` in non-production only.
 * `smtp`  — a real SMTP relay over `node:net`/`node:tls`, no new dependency.
 *
 * There is no provider adapter yet: the transactional-email provider is a
 * deferred client decision (technical_design/02). The SMTP transport is the
 * protocol, not a vendor.
 */
export type EmailConfig =
  | { readonly transport: 'none' }
  | {
      readonly transport: 'sink';
      readonly from: string;
      readonly capacity: number;
      readonly mailboxDir: string;
      readonly writeToDisk: boolean;
    }
  | {
      readonly transport: 'smtp';
      readonly from: string;
      readonly host: string;
      readonly port: number;
      readonly security: SmtpSecurity;
      readonly user: string | null;
      readonly pass: string | null;
      readonly allowInsecure: boolean;
      readonly timeoutMs: number;
    };

export type SmtpSecurity = 'plain' | 'starttls' | 'tls';

export class ConfigError extends Error {
  constructor(readonly variable: string, reason: string) {
    super(`[CONFIG] ${variable}: ${reason}`);
    this.name = 'ConfigError';
  }
}

const POSTGRES_SCHEMES = ['postgres://', 'postgresql://'];
const REDIS_SCHEMES = ['redis://', 'rediss://'];

/**
 * Environments that must never expose development affordances (token echo,
 * operator CLIs, seed routes). `ENVIRONMENT` is free text by design — the
 * cache namespace needs an operator-chosen name — so the production test is
 * explicit and case-insensitive rather than "anything but local".
 */
export function isProductionEnvironment(environment: string): boolean {
  const normalised = environment.trim().toLowerCase();
  return normalised === 'production' || normalised === 'prod';
}

/**
 * The environment name on its own, without requiring DATABASE_URL.
 *
 * Development-only tooling must be able to refuse a production host BEFORE it
 * touches configuration or a connection string, so this is a separate read
 * rather than a field on the loaded config.
 */
export function runtimeEnvironment(env: NodeJS.ProcessEnv = process.env): string {
  return env['ENVIRONMENT'] ?? env['NODE_ENV'] ?? 'local';
}

function requireUrl(value: string | undefined, variable: string, schemes: string[]): string {
  if (value === undefined || value === '') {
    throw new ConfigError(variable, 'required but not set');
  }
  if (!schemes.some((scheme) => value.startsWith(scheme))) {
    throw new ConfigError(variable, `must start with ${schemes.join(' or ')}`);
  }
  return value;
}

function optionalUrl(value: string | undefined, variable: string, schemes: string[]): string | null {
  if (value === undefined || value === '') return null;
  return requireUrl(value, variable, schemes);
}

function optionalString(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requireString(value: string | null, variable: string): string {
  if (value === null) throw new ConfigError(variable, 'required but not set');
  return value;
}

/**
 * Media storage is opt-in: with no `MEDIA_DRIVER` and no `R2_ENDPOINT` the
 * driver is `none`, and the A5 endpoint fails closed. That is deliberate —
 * redirecting to a local path in production would 404 and look like data
 * loss. All-or-nothing S3 configuration fails at startup, never mid-request.
 */
function parseMediaStorage(env: NodeJS.ProcessEnv): MediaStorageConfig {
  const declared = optionalString(env['MEDIA_DRIVER'])?.toLowerCase() ?? null;
  if (declared !== null && declared !== 'local' && declared !== 's3') {
    throw new ConfigError('MEDIA_DRIVER', 'must be "local" or "s3"');
  }

  const endpoint = optionalString(env['R2_ENDPOINT']);
  if (declared === null && endpoint === null) return { driver: 'none' };
  const driver = declared ?? 's3';

  if (driver === 'local') {
    return { driver: 'local', root: optionalString(env['MEDIA_ROOT']) ?? '.media' };
  }

  return {
    driver: 's3',
    endpoint: requireString(endpoint, 'R2_ENDPOINT'),
    bucket: requireString(optionalString(env['R2_BUCKET']), 'R2_BUCKET'),
    region: optionalString(env['R2_REGION']) ?? 'auto',
    accessKeyId: requireString(optionalString(env['R2_ACCESS_KEY_ID']), 'R2_ACCESS_KEY_ID'),
    secretAccessKey: requireString(
      optionalString(env['R2_SECRET_ACCESS_KEY']),
      'R2_SECRET_ACCESS_KEY',
    ),
    publicBaseUrl: requireString(
      optionalString(env['MEDIA_PUBLIC_BASE_URL']),
      'MEDIA_PUBLIC_BASE_URL',
    ),
  };
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('API_PORT', 'must be an integer between 1 and 65535');
  }
  return port;
}

function parseBoolean(value: string | undefined, variable: string): boolean | null {
  if (value === undefined || value.trim() === '') return null;
  const normalised = value.trim().toLowerCase();
  if (normalised === 'true' || normalised === '1' || normalised === 'yes') return true;
  if (normalised === 'false' || normalised === '0' || normalised === 'no') return false;
  throw new ConfigError(variable, 'must be true or false');
}

function parseIntegerInRange(
  value: string | undefined,
  variable: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ConfigError(variable, `must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

/**
 * An address we are willing to put in a `From:` header. Deliberately strict:
 * no whitespace, no angle brackets, no CR/LF, exactly one `@` with a dotted
 * domain. The SMTP transport repeats this check.
 */
function parseEmailAddress(value: string | undefined, variable: string, fallback?: string): string {
  const candidate = (value ?? fallback ?? '').trim();
  if (candidate === '') throw new ConfigError(variable, 'required but not set');
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(candidate)) {
    throw new ConfigError(variable, 'must be a bare email address');
  }
  return candidate;
}

/**
 * Email configuration.
 *
 * Defaults are chosen so that a missing environment is SAFE, not convenient:
 * `sink` sends nothing anywhere, and a production process may not write the
 * mailbox to disk. `smtp` fails at startup when any required variable is
 * missing — never mid-order.
 */
function parseEmailConfig(env: NodeJS.ProcessEnv, environment: string): EmailConfig {
  const declared = optionalString(env['EMAIL_TRANSPORT'])?.toLowerCase() ?? 'sink';
  if (declared !== 'none' && declared !== 'sink' && declared !== 'smtp') {
    throw new ConfigError('EMAIL_TRANSPORT', 'must be "none", "sink" or "smtp"');
  }

  if (declared === 'none') return { transport: 'none' };

  const production = isProductionEnvironment(environment);
  const from = parseEmailAddress(env['EMAIL_FROM'], 'EMAIL_FROM', 'no-reply@maihan-gems.invalid');

  if (declared === 'sink') {
    const writeToDisk = parseBoolean(env['EMAIL_SINK_WRITE_TO_DISK'], 'EMAIL_SINK_WRITE_TO_DISK');
    if (production && writeToDisk === true) {
      throw new ConfigError(
        'EMAIL_SINK_WRITE_TO_DISK',
        'must be false in production: rendered mail carries customer data',
      );
    }
    return {
      transport: 'sink',
      from,
      capacity: parseIntegerInRange(env['EMAIL_SINK_CAPACITY'], 'EMAIL_SINK_CAPACITY', 100, 1, 10_000),
      mailboxDir: optionalString(env['EMAIL_MAILBOX_DIR']) ?? '.mail',
      writeToDisk: writeToDisk ?? !production,
    };
  }

  const host = requireString(optionalString(env['SMTP_HOST']), 'SMTP_HOST');
  const port = parseIntegerInRange(env['SMTP_PORT'], 'SMTP_PORT', 587, 1, 65_535);
  const securityValue = optionalString(env['SMTP_SECURITY'])?.toLowerCase() ?? null;
  if (securityValue !== null && securityValue !== 'plain' && securityValue !== 'starttls' && securityValue !== 'tls') {
    throw new ConfigError('SMTP_SECURITY', 'must be "plain", "starttls" or "tls"');
  }
  const security: SmtpSecurity = securityValue ?? (port === 465 ? 'tls' : 'starttls');
  const user = optionalString(env['SMTP_USER']);
  const pass = optionalString(env['SMTP_PASS']);
  if ((user === null) !== (pass === null)) {
    throw new ConfigError('SMTP_USER', 'SMTP_USER and SMTP_PASS must be set together');
  }
  const allowInsecure =
    parseBoolean(env['SMTP_ALLOW_INSECURE'], 'SMTP_ALLOW_INSECURE') ?? false;
  if (production && allowInsecure) {
    throw new ConfigError('SMTP_ALLOW_INSECURE', 'must be false in production');
  }
  if (security === 'plain' && user !== null && !allowInsecure) {
    throw new ConfigError(
      'SMTP_SECURITY',
      'refusing to send credentials over plaintext; set SMTP_SECURITY=starttls or tls',
    );
  }

  return {
    transport: 'smtp',
    from,
    host,
    port,
    security,
    user,
    pass,
    allowInsecure,
    timeoutMs: parseIntegerInRange(env['SMTP_TIMEOUT_MS'], 'SMTP_TIMEOUT_MS', 10_000, 1_000, 120_000),
  };
}

/**
 * The public origin for absolute links. A trailing slash is removed so joining
 * a path never produces `//`.
 *
 * This is NOT required here: apps/web also loads this config, and adding a new
 * mandatory production variable would break a deployment that does not build
 * email links. The worker enforces a non-localhost origin at composition time
 * (`createWorker`), which is the only process that needs one.
 */
function parseAppBaseUrl(env: NodeJS.ProcessEnv): string {
  const declared = optionalString(env['APP_BASE_URL']);
  if (declared === null) return 'http://localhost:3000';
  if (!/^https?:\/\/[^\s]+$/i.test(declared)) {
    throw new ConfigError('APP_BASE_URL', 'must be an absolute http(s) URL');
  }
  return declared.replace(/\/+$/, '');
}

/**
 * Parse and validate the runtime environment. Throws `ConfigError` on any
 * problem — configuration fails at startup, never mid-request.
 *
 *   DATABASE_URL  required  postgres://…        the source of truth
 *   REDIS_URL     optional  redis://…           absent => cache/rate-limits bypass
 *   API_PORT      optional  default 3000
 *   ENVIRONMENT   optional  default NODE_ENV or 'local' (cache namespace)
 *   MEDIA_DRIVER  optional  local | s3           absent => s3 when R2_ENDPOINT is set, else none
 *   MEDIA_ROOT    optional  default .media       local driver only
 *   R2_*          conditional                 required as a set for the s3 driver
 *   MEDIA_PUBLIC_BASE_URL conditional         public CDN origin for the s3 driver
 *   EMAIL_TRANSPORT optional none | sink | smtp  default sink (sends nothing)
 *   EMAIL_FROM    optional  default no-reply@maihan-gems.invalid
 *   EMAIL_SINK_*  optional  capacity, dir, write-to-disk (dev only)
 *   SMTP_*        conditional                 required as a set for the smtp transport
 */
export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const environment = runtimeEnvironment(env);
  return {
    databaseUrl: requireUrl(env['DATABASE_URL'], 'DATABASE_URL', POSTGRES_SCHEMES),
    redisUrl: optionalUrl(env['REDIS_URL'], 'REDIS_URL', REDIS_SCHEMES),
    apiPort: parsePort(env['API_PORT']),
    environment,
    adminSeedEmail: env['ADMIN_SEED_EMAIL'] ?? null,
    adminSeedPassword: env['ADMIN_SEED_PASSWORD'] ?? null,
    mediaStorage: parseMediaStorage(env),
    email: parseEmailConfig(env, environment),
    appBaseUrl: parseAppBaseUrl(env),
  };
}
