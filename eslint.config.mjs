import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Maihan Gems ESLint flat configuration — architecture boundaries.
 *
 * Authority:
 *   technical_design/01 lines 46-58  forbidden import table
 *   technical_design/03 lines 87-97  per-package forbidden imports
 *   technical_design/01 line 56      process.env readable only by packages/config
 *   technical_design/01 line 55      packages/ai may not import db repositories
 *                                    (the structural half of ADR-003)
 *
 * These are not style preferences. They are the mechanism that makes the
 * architecture enforceable rather than aspirational. A boundary rule that is not
 * a lint error is a comment.
 *
 * Scope: structural/boundary enforcement only. No formatting or stylistic rules
 * are configured here; adding them is a separate decision and not required by
 * Task 1.
 */

// Domain must stay pure and testable without infrastructure.
const DOMAIN_FORBIDDEN = [
  {
    // Database and data access.
    group: ['@maihan/db', '@maihan/db/*', 'drizzle-orm', 'drizzle-orm/*', 'pg', 'pg/*'],
    message:
      'packages/domain must not import database code. Invariants are testable without infrastructure; any need for I/O is a signal the logic is in the wrong layer. (technical_design/03)',
  },
  {
    // The model must not exist as far as the domain is concerned.
    group: ['@maihan/ai', '@maihan/ai/*'],
    message:
      'packages/domain must not know the model exists. Domain logic must never import a provider SDK. (technical_design/01)',
  },
  {
    // Configuration is injected, never read.
    group: ['@maihan/config', '@maihan/config/*'],
    message:
      'packages/domain must not import packages/config. Configuration reaches the domain by injection so the domain stays pure and testable. (technical_design/01)',
  },
  {
    // Applications.
    group: ['@maihan/web', '@maihan/web/*', '@maihan/worker', '@maihan/worker/*'],
    message: 'packages/domain must not import an application. (technical_design/03)',
  },
  {
    // Cache.
    group: ['ioredis', 'ioredis/*', 'redis', 'redis/*'],
    message:
      'packages/domain must not import a cache client. Redis is never truth (ADR-002). (technical_design/03)',
  },
  {
    // Framework.
    group: ['next', 'next/*', 'react', 'react-dom', 'react/*'],
    message: 'packages/domain must not import a framework. (technical_design/03)',
  },
  {
    // Node builtins: fs and net above all, since these are what make a package impure.
    group: ['node:fs', 'node:fs/*', 'node:net', 'node:net/*', 'node:http', 'node:http/*'],
    message:
      'packages/domain must not perform I/O. `now()` is passed in, never called inside domain logic. (technical_design/01)',
  },
];

// Contracts parse and coerce. They do not reach data.
const CONTRACTS_FORBIDDEN = [
  {
    group: ['@maihan/db', '@maihan/db/*', 'drizzle-orm', 'drizzle-orm/*'],
    message:
      'packages/contracts must not import database code. It owns DTO and event schemas, not queries. (technical_design/03)',
  },
  {
    group: ['@maihan/web', '@maihan/web/*', '@maihan/worker', '@maihan/worker/*'],
    message: 'packages/contracts must not import an application. (technical_design/03)',
  },
];

// The database layer must not know about applications or about the model.
const DB_FORBIDDEN = [
  {
    group: ['@maihan/web', '@maihan/web/*', '@maihan/worker', '@maihan/worker/*'],
    message: 'packages/db must not import an application. (technical_design/03)',
  },
  {
    group: ['@maihan/ai', '@maihan/ai/*'],
    message: 'packages/db must not import the AI package. (technical_design/03)',
  },
];

// The migration CLI is standalone. It must never be reachable from a runtime app.
const MIGRATE_FORBIDDEN = [
  {
    group: ['@maihan/web', '@maihan/web/*', '@maihan/worker', '@maihan/worker/*'],
    message:
      'tools/migrate is standalone. Migration tooling must never be imported by a runtime app. (technical_design/03)',
  },
];

// Structural half of ADR-003: no AI package may hold a repository handle.
const AI_FORBIDDEN = [
  {
    group: ['@maihan/db/*repositories*', '@maihan/db/src/repositories*'],
    message:
      'packages/ai must not import db repositories directly. AI reaches data only via other modules\' query services. This is the structural half of ADR-003: with no repository handle there is no write path to hold. (technical_design/01)',
  },
];

export default tseslint.config(
  {
    // Ignore everything that is not our own source or config.
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      // The reverse-engineering source archive. Never linted, never modified.
      // Its absence is expected in a fresh clone (AGENTS.md section 5).
      'naturalgemstones/**',
      // ECC harness files are tool configuration, not application source.
      '.opencode/**',
      'technical_design/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Node CLI scripts. `apps/web/scripts/**` runs under `node`, so process
    // and console exist; this is not application source.
    files: ['apps/web/scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly', document: 'readonly', window: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },

  {
    // Structural rules only. Applied to every TypeScript source file.
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // No floating promises or unawaited async in domain or tooling code.
      'no-restricted-imports': 'off',
      eqeqeq: ['error', 'smart'],
      'no-console': 'error',
      'prefer-const': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // packages/domain — pure. No I/O, no framework, no config, no model.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: DOMAIN_FORBIDDEN }],
      // The domain must not read process.env. Configuration reaches it by
      // injection via packages/config. (technical_design/01 line 56)
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.object.name='process'][object.property.name='env']",
          message:
            'packages/domain must not read process.env. Configuration reaches the domain by injection through packages/config. (technical_design/01)',
        },
      ],
      // `no-restricted-syntax` above is narrow on purpose. It catches the direct
      // `process.env.X` form, which is the only form this rule is authorised to
      // police. Destructuring or aliasing process.env is not detectable by a
      // syntactic rule and is out of scope; CI's dependency-drift gate covers
      // the resulting runtime dependency question.
    },
  },

  // Spec files inside packages/domain are test harness code, not domain
  // runtime logic: the purity rule polices domain logic. The colocated purity
  // test may read the package's own package.json (node:fs) to assert the
  // declared dependency surface (doc 03 validation rule 3). Specs are never
  // imported by runtime code: index.ts does not re-export them, and compiled
  // spec files are unreachable through the package's exports map.
  {
    files: ['packages/domain/src/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: DOMAIN_FORBIDDEN.filter(
            (p) => !p.group.some((g) => g === 'node:fs' || g.startsWith('node:fs/')),
          ),
        },
      ],
      // Test harness code may also locate evidence fixtures via an environment
      // override (NATURALGEMSTONES_ROOT); runtime domain code may not.
      'no-restricted-syntax': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  // packages/contracts — parse and coerce only.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/contracts/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: CONTRACTS_FORBIDDEN }],
    },
  },

  // ---------------------------------------------------------------------------
  // packages/db — never an application, never the AI package.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/db/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: DB_FORBIDDEN }],
    },
  },

  // ---------------------------------------------------------------------------
  // tools/migrate — standalone.
  // ---------------------------------------------------------------------------
  {
    files: ['tools/migrate/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: MIGRATE_FORBIDDEN }],
    },
  },

  // ---------------------------------------------------------------------------
  // packages/ai — the structural half of ADR-003.
  //
  // NOTE: packages/ai does not exist yet. It is named as a component in
  // technical_design/01 and 03 but omitted from INITIAL_IMPLEMENTATION_PLAN.md
  // section 5, the authority for Task 1's layout, and it is Phase 9 work.
  // The rule is declared now so that the boundary cannot be violated by the
  // package's eventual creation. ESLint tolerates a files glob that matches
  // nothing; the rule activates the moment the package appears.
  // ---------------------------------------------------------------------------
  {
    files: ['packages/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: AI_FORBIDDEN }],
    },
  },

  // ---------------------------------------------------------------------------
  // apps/web — no SQL, no business logic in the rendering surface.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/web/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'pg', 'pg/*'],
              message:
                'apps/web must not import a database driver. SQL lives in packages/db behind repositories. A route handler reads a session, validates, calls one service, serializes. (technical_design/01, 03)',
            },
            {
              group: ['@maihan/worker', '@maihan/worker/*'],
              message:
                'apps/web must not import apps/worker. Neither application imports the other. (technical_design/03)',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // apps/worker — no SQL, no business logic outside handlers.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/worker/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'pg', 'pg/*'],
              message:
                'apps/worker must not import a database driver. SQL lives in packages/db behind repositories. (technical_design/03)',
            },
            {
              group: ['@maihan/web', '@maihan/web/*'],
              message:
                'apps/worker must not import apps/web. Neither application imports the other. (technical_design/03)',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Module public surface.
  //
  // technical_design/01 line 53 and technical_design/03: `index.ts` is the ONLY
  // public surface of a module. A deep import into another module's
  // subdirectory is a lint error, which is what makes "modules communicate
  // through application services" mechanically true rather than a convention.
  //
  // The pattern below forbids reaching into a module's internals. It matches a
  // specifier containing `/modules/<name>/<something>` while permitting
  // `/modules/<name>` itself. Verified to fire on `@/modules/catalog` + a
  // subpath and to stay clean on the bare `@/modules/catalog` barrel.
  //
  // KNOWN LIMITATION, stated rather than hidden: this rule matches the ALIAS
  // import form, which is the form technical_design/03 mandates
  // (`import { getProductBySlug } from '@/modules/catalog'`). A deep import
  // written as a relative path, such as `../catalog/domain/entities`, is NOT
  // caught here, because a syntactic glob cannot tell an intra-module `../`
  // (legitimate) from a cross-module one (forbidden).
  //
  // That gap is closed by the import-graph architecture test, which parses the
  // AST and enforces module boundaries structurally. technical_design/01 lists
  // it as the boundary-lint proof and ADR-019 makes it the enforcement
  // mechanism; technical_design/32 lists it as a CI gate. That test needs a
  // test runner and is therefore blocked on ADR-021. Until it exists, the
  // alias form is the only deep-import vector this rule polices.
  // ---------------------------------------------------------------------------
  {
    files: ['apps/web/src/modules/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/*'],
              message:
                'index.ts is the enforced public surface of a module. Import the module, not its internals. Modules communicate through application services only. (technical_design/03)',
            },
            {
              group: ['**/modules/*/infrastructure', '**/modules/*/infrastructure/*'],
              message:
                'Cross-module access goes through the owning module\'s application service, never its repository. (PROJECT_SOURCE_OF_TRUTH.md 10.2)',
            },
          ],
        },
      ],
    },
  },
);
