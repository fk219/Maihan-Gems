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
}

export class ConfigError extends Error {
  constructor(readonly variable: string, reason: string) {
    super(`[CONFIG] ${variable}: ${reason}`);
    this.name = 'ConfigError';
  }
}

const POSTGRES_SCHEMES = ['postgres://', 'postgresql://'];
const REDIS_SCHEMES = ['redis://', 'rediss://'];

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
 */
export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    databaseUrl: requireUrl(env['DATABASE_URL'], 'DATABASE_URL', POSTGRES_SCHEMES),
    redisUrl: optionalUrl(env['REDIS_URL'], 'REDIS_URL', REDIS_SCHEMES),
    apiPort: parsePort(env['API_PORT']),
    environment: env['ENVIRONMENT'] ?? env['NODE_ENV'] ?? 'local',
    adminSeedEmail: env['ADMIN_SEED_EMAIL'] ?? null,
    adminSeedPassword: env['ADMIN_SEED_PASSWORD'] ?? null,
    mediaStorage: parseMediaStorage(env),
  };
}
