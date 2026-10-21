/**
 * packages/domain/src/auth/roles.ts
 *
 * Phase 12 — Stage A / Global Task A1 (E12.8 foundation).
 *
 * The authoritative ten-role RBAC matrix (doc 23 §3, doc 09 Authorization).
 * These role names are NOT replaceable: doc 23 enumerates them as the system's
 * role set; policies, DB role grants and admin UI all key off these exact
 * identifiers.
 *
 * Pure data: zero runtime dependencies (the domain purity constraint).
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

/** Modules from doc 23 §3 scope table (action surfaces, not UI pages). */
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
  'discounts',
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

/** Doc 23 §9/§10 + plan §19 verbs, normalised to one action vocabulary. */
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

/**
 * The scope table (doc 23 §3). `ADMIN_SUPER` is implicit-everything and is
 * asserted by the polcy test rather than expanded here.
 */
export type RoleScope = Partial<Record<AdminModule, readonly AdminAction[]>>;

/** Contextual type so array literals widen to the action union, not string[]. */
function scope(scope: RoleScope): RoleScope {
  return scope;
}

export const ROLE_SCOPES: Readonly<Record<AdminRole, RoleScope>> = Object.freeze({
  ADMIN_SUPER: {}, // implicit-everything, see hasCapability()
  CATALOG_MANAGER: scope({
    products: ['read', 'list', 'write', 'bulk'],
    gemstones: ['read', 'list', 'write', 'bulk'],
    settings: ['read', 'list', 'write'],
    taxonomy: ['read', 'list', 'write'],
    media: ['read', 'list', 'write'],
    discounts: ['read', 'list', 'write'],
  }),
  CONTENT_EDITOR: scope({
    content: ['read', 'list', 'write'],
    navigation: ['read', 'list', 'write'],
    seo: ['read', 'list', 'write'],
  }),
  CONTENT_PUBLISHER: scope({
    content: ['read', 'list', 'write', 'approve', 'publish'],
    navigation: ['read', 'list', 'write', 'publish'],
    seo: ['read', 'list', 'write', 'publish'],
  }),
  COMMERCE_OPERATOR: scope({
    orders: ['read', 'list'],
    refunds: ['read', 'list', 'write', 'approve'],
    inventory: ['read', 'list', 'write', 'bulk'],
    discounts: ['read', 'list'],
  }),
  TRUST_REVIEWER: scope({
    certificates: ['read', 'list', 'approve'],
    anomalies: ['read', 'list', 'resolve'],
  }),
  CONCIERGE_AGENT: scope({
    conversations: ['read', 'list'],
    products: ['read', 'list'],
    gemstones: ['read', 'list'],
  }),
  AI_OPERATIONS: scope({
    ai_logs: ['read', 'list'],
    conversations: ['read', 'list'],
    evaluation_runs: ['read', 'list', 'write'],
    anomalies: ['read', 'list'],
  }),
  MIGRATION_ENGINEER: scope({
    import_batches: ['read', 'list'],
    conflicts: ['read', 'list', 'resolve'],
    derived_approvals: ['read', 'list', 'approve'],
  }),
  READ_ONLY_ANALYST: scope({
    dashboards: ['read', 'list'],
  }),
});

/**
 * Single source of the capability decision (doc 23 §4: "written once and
 * shared by API and admin"). ADMIN_SUPER passes every (module, action);
 * every other role must hold the action in its module scope.
 */
export function hasCapability(
  role: AdminRole,
  module: AdminModule,
  action: AdminAction,
): boolean {
  if (role === 'ADMIN_SUPER') return true;
  return ROLE_SCOPES[role][module]?.includes(action) ?? false;
}

/**
 * The two-person rule (plan task 3): trust-bearing content (certificate
 * verification and derived-reference approval) requires an approver DIFFERENT
 * from the submitter, and never permits self-approval.
 */
export const TWO_PERSON_MODULES = Object.freeze(['content', 'derived_approvals', 'certificates'] as const) as readonly AdminModule[];

export function requiresTwoPersonRule(module: AdminModule): boolean {
  return (TWO_PERSON_MODULES as readonly string[]).includes(module);
}
