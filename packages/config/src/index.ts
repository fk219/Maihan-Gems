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

export { STOREFRONT_CONTACT, publishedEmail, publishedPhone } from './storefront.js';
export {
  SPOOFABLE_IDENTITY_HEADERS,
  isDevSeamEnabled,
  isFailClosedMode,
} from './security-mode.js';

export interface RuntimeConfig {
  /** PostgreSQL connection string — the source of truth (ADR-002). */
  readonly databaseUrl: string;
  /** Redis URL — cache/rate-limit acceleration only; absent means bypass. */
  readonly redisUrl: string | null;
  /** Listener port for the catalogue API process. */
  readonly apiPort: number;
  /** Environment name; namespaces cache keys so environments never share. */
  readonly environment: string;
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
 */
export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    databaseUrl: requireUrl(env['DATABASE_URL'], 'DATABASE_URL', POSTGRES_SCHEMES),
    redisUrl: optionalUrl(env['REDIS_URL'], 'REDIS_URL', REDIS_SCHEMES),
    apiPort: parsePort(env['API_PORT']),
    environment: env['ENVIRONMENT'] ?? env['NODE_ENV'] ?? 'local',
  };
}
