/**
 * packages/contracts/src/dto/admin/roles.ts
 *
 * The authoritative role/module/action identifiers for the admin API surface.
 * Mirrors `@maihan/domain/src/auth/roles.ts` by VALUE (contracts cannot take
 * a runtime dependency on domain; the parity assertion on both lists lives in
 * the contracts tests so drift fails CI).
 */
export const ADMIN_ROLES = Object.freeze([
  'ADMIN_SUPER',
  'CATALOG_MANAGER',
  'CONTENT_EDITOR',
  'CONTENT_PUBLISHER',
  'COMMERCE_OPERATOR',
  'TRUST_REVIEWER',
  'CONCIERGE_AGENT',
  'AI_OPERATIONS',
  'MIGRATION_ENGINEER',
  'READ_ONLY_ANALYST',
] as const);

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_MODULES = Object.freeze([
  'content',
  'navigation',
  'seo',
  'products',
  'gemstones',
  'settings',
  'taxonomy',
  'media',
  'orders',
  'refunds',
  'inventory',
  'certificates',
  'anomalies',
  'conversations',
  'ai_logs',
  'evaluation_runs',
  'import_batches',
  'conflicts',
  'derived_approvals',
  'dashboards',
] as const);

export type AdminModule = (typeof ADMIN_MODULES)[number];

export const ADMIN_ACTIONS = Object.freeze([
  'read',
  'list',
  'write',
  'approve',
  'publish',
  'resolve',
  'revert',
  'bulk',
] as const);

export type AdminAction = (typeof ADMIN_ACTIONS)[number];
