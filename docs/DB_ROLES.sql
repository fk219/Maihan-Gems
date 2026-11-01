-- Production role template (run once per database as a superuser).
-- Passwords are supplied as psql variables:
--   psql "$DATABASE_URL" -v app_password='…' -v migrator_password='…' -f docs/fresh-schema/roles.sql
-- The app role can read/write business data but cannot mutate the audit log.
-- The migration role owns DDL. Apply before switching the app's connection.

SELECT format('CREATE ROLE maihan_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maihan_app')\gexec
SELECT format('CREATE ROLE maihan_migrator LOGIN PASSWORD %L', :'migrator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maihan_migrator')\gexec

GRANT USAGE ON SCHEMA fresh TO maihan_app, maihan_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fresh TO maihan_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fresh TO maihan_app;
GRANT ALL PRIVILEGES ON SCHEMA fresh TO maihan_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA fresh TO maihan_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA fresh TO maihan_migrator;

-- Append-only audit trail.
REVOKE UPDATE, DELETE ON fresh.audit_log FROM maihan_app;

-- Future objects created by the migrator inherit the app grants.
ALTER DEFAULT PRIVILEGES FOR ROLE maihan_migrator IN SCHEMA fresh
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO maihan_app;
ALTER DEFAULT PRIVILEGES FOR ROLE maihan_migrator IN SCHEMA fresh
  GRANT USAGE, SELECT ON SEQUENCES TO maihan_app;
