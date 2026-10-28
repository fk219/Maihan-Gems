# @maihan/fresh-api

Dev API service on the **fresh clean schema** (`maihan_dev.fresh`) — vendor portal, auth, storefront reads. Authority: `technical_design/43` + `42`.

## Run

```bash
DATABASE_URL="postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev" \
FRESH_ADMIN_TOKEN=<dev-token> \
pnpm --filter @maihan/fresh-api start        # localhost:3010 (FRESH_API_PORT to change)
```

## Surfaces

| Area | Endpoints | Auth |
|---|---|---|
| Health | `GET /healthz` | — |
| Customer auth | `POST /auth/register · /auth/login · /auth/logout`, `GET /auth/me` | scrypt passwords; session token (shown once), SHA-256 at rest |
| Vendor portal | `POST /vendors` (self-register → PENDING) · admin `POST /admin/onboarding/{code}/approve\|reject\|suspend` (approve returns the **vendor API key once**) · vendor `POST\|GET /vendors/{code}/submissions` (requires `X-Vendor-Key`) · admin `GET /admin/submissions`, `POST /admin/submissions/{id}/approve\|reject` | admin bearer (dev) · vendor key (hash at rest) |
| Approvals | approve mints **our semantic code** via `code_counters`, inserts the catalogue row (priced → ACTIVE, unpriced → DRAFT), records `resulting_ref` + audit rows | admin |
| Storefront reads | `GET /catalogue/{gemstones,products,settings}` (+filters) · `/catalogue/gemstones/{ref}` (media, per-pair stones, treatments) · `/catalogue/products/{ref}` (composition) · `/catalogue/varieties` · `/catalogue/families` | public; never exposes vendor-internal columns |

## Honest limits (DEV)

- Binds to `127.0.0.1` only; admin routes use a static dev bearer token.
- Vendor keys are verified by SHA-256; rotation endpoint comes with F3-AUTH round 2.
- No rate limiting yet (localhost).
