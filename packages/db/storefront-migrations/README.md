# Storefront DDL (0019–0020)

These migrations are **not** applied by `node dist/migrate.js`. Catalog migration `0005_catalog_core.sql` already defines a different `products` table, so the unified storefront schema must be applied separately.

**Local storefront dev:**

```bash
docker compose up -d
export DATABASE_URL="postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev"
pnpm storefront:db:setup
```

Use a fresh volume if you previously ran the full catalog migrator (`docker compose down -v`).
