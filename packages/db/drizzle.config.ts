// Drizzle Kit configuration — schema migrations for Maihan Gems.
//
// Authority:
//   technical_design/02 section "Tooling by activity" — schema migrations are
//     authored with Drizzle Kit inside packages/db (APPROVED, P0).
//   technical_design/03 section "Layout" — packages/db/migrations holds the
//     ordered, forward-only migration files.
//   technical_design/04 section "Migration ordering" — the authoritative
//     migration sequence 0001..0017, one logical unit per Source of Truth
//     section 8 subsection.
//   technical_design/29 section 4 — migrations are forward-only and expand-
//     then-contract; DATABASE_URL is the single sanctioned database variable
//     (Source of Truth section 29.6).
//
// The migrations in ./migrations are hand-authored custom SQL migrations (the
// validated DDL is ported verbatim; it is not re-derived from a TS schema).
// `drizzle-kit generate --custom` therefore is NOT used to author them; this
// config exists so drizzle-kit CLI commands operate on the same folder the
// programmatic migrator reads.
//
// This file never holds a credential: the URL comes from DATABASE_URL, which
// lives in the gitignored .env or the platform secret manager only.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
