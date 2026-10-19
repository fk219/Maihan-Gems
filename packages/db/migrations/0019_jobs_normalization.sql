-- 0019_jobs_normalization
-- Authority: ADR-027 (Accepted 2026-10-19 by explicit user authorization).
--
-- Normalizes PERMANENT state out of the 90-day `jobs` queue table into real
-- tables, closing audit finding F-06/M-03:
--   auth_credentials, auth_sessions, auth_tokens,
--   favorites, checkout_sessions, inventory_reservations, notifications.
--
-- Expand migration with an idempotent BACKFILL from the existing jobs rows so
-- no live state is lost. The jobs table keeps its queue role for genuinely
-- transient / operational work (domain-event dispatch, notify.email,
-- search bumps, sweeps).

-- ---------------------------------------------------------------------------
-- auth_credentials: password hashes + role assignment (was jobs payload).
-- ---------------------------------------------------------------------------
CREATE TABLE auth_credentials (
  customer_id         UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  email               CITEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'CUSTOMER',
  vendor_id           UUID,
  failed_attempts     INTEGER NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- auth_sessions: signed session tokens (was jobs queue 'auth_sessions').
-- ---------------------------------------------------------------------------
CREATE TABLE auth_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   TEXT NOT NULL UNIQUE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email        CITEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'CUSTOMER',
  vendor_id    UUID,
  csrf_token   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON auth_sessions (customer_id) WHERE revoked_at IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- auth_tokens: single-use email-verification / password-reset tokens.
-- ---------------------------------------------------------------------------
CREATE TABLE auth_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   TEXT NOT NULL UNIQUE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email        CITEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON auth_tokens (customer_id, kind) WHERE consumed_at IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- favorites: wishlist pairs (was a JSONB array inside a jobs payload).
-- ---------------------------------------------------------------------------
CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- checkout_sessions: the observed four-step funnel state (was jobs rows).
-- ---------------------------------------------------------------------------
CREATE TABLE checkout_sessions (
  id                     TEXT PRIMARY KEY,
  cart_token             TEXT NOT NULL,
  customer_id            UUID REFERENCES customers(id),
  email                  CITEXT,
  current_step           TEXT NOT NULL DEFAULT 'SHIPPING',
  state                  TEXT NOT NULL DEFAULT 'ACTIVE'
                         CHECK (state IN ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
  reservation_expires_at TIMESTAMPTZ,
  completed_order_id     UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON checkout_sessions (state) WHERE state = 'ACTIVE';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- inventory_reservations: one-of-one stone holds (was jobs queue rows).
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key      TEXT NOT NULL UNIQUE,
  gemstone_id  UUID NOT NULL REFERENCES gemstones(id),
  session_id   TEXT,
  cart_id      TEXT,
  state        TEXT NOT NULL DEFAULT 'ACTIVE'
               CHECK (state IN ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONSUMED')),
  reserved_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  released_at  TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON inventory_reservations (gemstone_id) WHERE state = 'ACTIVE';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- notifications: durable in-app notification records (email delivery is a
-- separate notify.email job; this table is the record of what the customer
-- sees in the notification centre).
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email       CITEXT NOT NULL,
  kind        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key  TEXT UNIQUE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON notifications (customer_id, created_at DESC);
--> statement-breakpoint

-- ===========================================================================
-- BACKFILL (idempotent: ON CONFLICT DO NOTHING). Existing jobs rows stay in
-- place (append-only history, never deleted); the new tables become the
-- read/write source from this migration forward.
-- ===========================================================================

INSERT INTO auth_credentials (
  customer_id, email, password_hash, role, vendor_id,
  failed_attempts, locked_until, password_changed_at
)
SELECT
  (payload->>'customer_id')::uuid,
  payload->>'email',
  payload->>'password_hash',
  COALESCE(payload->>'role', 'CUSTOMER'),
  NULLIF(payload->>'vendor_id', '')::uuid,
  COALESCE((payload->>'failed_attempts')::int, 0),
  NULLIF(payload->>'locked_until', '')::timestamptz,
  NULLIF(payload->>'password_changed_at', '')::timestamptz
FROM jobs j
WHERE j.queue = 'auth_credentials'
  AND j.payload ? 'customer_id'
  AND j.payload ? 'password_hash'
  AND (j.payload->>'customer_id') ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM customers c WHERE c.id = (j.payload->>'customer_id')::uuid)
ON CONFLICT (customer_id) DO NOTHING;
--> statement-breakpoint

INSERT INTO auth_sessions (
  token_hash, customer_id, email, role, vendor_id, csrf_token, created_at, expires_at
)
SELECT
  split_part(job_key, ':', 3),
  (payload->>'customer_id')::uuid,
  payload->>'email',
  COALESCE(payload->>'role', 'CUSTOMER'),
  NULLIF(payload->>'vendor_id', '')::uuid,
  COALESCE(payload->>'csrf_token', ''),
  COALESCE(NULLIF(payload->>'created_at', '')::timestamptz, created_at),
  locked_until
FROM jobs j
WHERE j.queue = 'auth_sessions'
  AND j.locked_until IS NOT NULL
  AND split_part(job_key, ':', 3) ~ '^[0-9a-f]{64}$'
  AND EXISTS (SELECT 1 FROM customers c WHERE c.id = (j.payload->>'customer_id')::uuid)
ON CONFLICT (token_hash) DO NOTHING;
--> statement-breakpoint

INSERT INTO auth_tokens (token_hash, customer_id, email, kind, created_at, expires_at)
SELECT
  split_part(job_key, ':', 3),
  (payload->>'customer_id')::uuid,
  payload->>'email',
  job_type,
  created_at,
  COALESCE(locked_until, created_at + interval '1 day')
FROM jobs j
WHERE j.queue = 'auth_tokens'
  AND j.job_type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')
  AND j.payload ? 'customer_id'
  AND (j.payload->>'customer_id') ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM customers c WHERE c.id = (j.payload->>'customer_id')::uuid)
ON CONFLICT (token_hash) DO NOTHING;
--> statement-breakpoint

INSERT INTO favorites (customer_id, product_id)
SELECT c.id, p.id
FROM jobs j
JOIN customers c ON j.job_key = ('favorites:customer:' || c.id::text)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(j.payload->'product_ids', '[]'::jsonb)) AS pid
JOIN products p ON (p.id::text = pid OR p.slug = pid)
WHERE j.queue = 'customer_favorites'
ON CONFLICT (customer_id, product_id) DO NOTHING;
--> statement-breakpoint

INSERT INTO checkout_sessions (
  id, cart_token, customer_id, email, current_step, state, payload,
  reservation_expires_at, completed_order_id, created_at, updated_at
)
SELECT
  substr(job_key, length('checkout:session:') + 1),
  COALESCE(payload->>'cart_token', ''),
  CASE WHEN (payload->>'customer_id') ~ '^[0-9a-f-]{36}$' THEN (payload->>'customer_id')::uuid ELSE NULL END,
  NULLIF(payload->>'email', ''),
  COALESCE(payload->>'current_step', 'SHIPPING'),
  CASE
    WHEN state = 'CANCELLED' THEN 'CANCELLED'
    WHEN state = 'SUCCEEDED' THEN 'COMPLETED'
    ELSE 'ACTIVE'
  END,
  payload,
  run_after,
  CASE WHEN (payload->>'completed_order_id') ~ '^[0-9a-f-]{36}$' THEN (payload->>'completed_order_id')::uuid ELSE NULL END,
  COALESCE(NULLIF(payload->>'created_at', '')::timestamptz, created_at),
  updated_at
FROM jobs j
WHERE j.queue = 'checkout_sessions'
  AND length(j.job_key) > length('checkout:session:')
  AND (
    NULLIF(j.payload->>'customer_id', '') IS NULL
    OR EXISTS (SELECT 1 FROM customers c WHERE c.id = (j.payload->>'customer_id')::uuid)
  )
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

INSERT INTO inventory_reservations (
  job_key, gemstone_id, session_id, cart_id, state, reserved_at, expires_at
)
SELECT
  job_key,
  (payload->>'gemstoneId')::uuid,
  NULLIF(payload->>'sessionId', ''),
  NULLIF(payload->>'cartId', ''),
  CASE WHEN state = 'CANCELLED' THEN 'RELEASED' ELSE 'ACTIVE' END,
  COALESCE(NULLIF(payload->>'reservedAt', '')::timestamptz, created_at),
  run_after
FROM jobs j
WHERE j.queue = 'inventory_reservations'
  AND j.payload ? 'gemstoneId'
  AND (j.payload->>'gemstoneId') ~ '^[0-9a-f-]{36}$'
  AND j.run_after IS NOT NULL
  AND EXISTS (SELECT 1 FROM gemstones g WHERE g.id = (j.payload->>'gemstoneId')::uuid)
ON CONFLICT (job_key) DO NOTHING;
--> statement-breakpoint

INSERT INTO notifications (
  customer_id, email, kind, subject, body, metadata, dedupe_key, created_at
)
SELECT
  (payload->>'customer_id')::uuid,
  payload->>'email',
  COALESCE(payload->>'kind', job_type),
  COALESCE(payload->>'subject', 'Maihan Gems notification'),
  COALESCE(payload->>'body', ''),
  COALESCE(payload->'metadata', '{}'::jsonb),
  job_key,
  COALESCE(NULLIF(payload->>'created_at', '')::timestamptz, created_at)
FROM jobs j
WHERE j.queue = 'notifications'
  AND j.payload ? 'customer_id'
  AND (j.payload->>'customer_id') ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM customers c WHERE c.id = (j.payload->>'customer_id')::uuid)
ON CONFLICT (dedupe_key) DO NOTHING;
