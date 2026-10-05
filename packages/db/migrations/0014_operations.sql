-- 0014_operations
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.14, verbatim.
-- One logical unit: operations tables. domain_events is the transactional
-- outbox (ADR-020) and, with audit_logs, is append-only: the application role
-- receives no UPDATE or DELETE grant.

CREATE TABLE domain_events (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id          UUID NOT NULL UNIQUE,
  event_type        TEXT NOT NULL,
  aggregate_type    TEXT NOT NULL,
  aggregate_id      UUID NOT NULL,
  aggregate_version INTEGER,
  payload           JSONB NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  trace_id          TEXT,
  status            domain_event_status NOT NULL DEFAULT 'PENDING',
  attempts          SMALLINT NOT NULL DEFAULT 0,
  last_error        TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at      TIMESTAMPTZ,
  available_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- domain_events is append-only: the application role receives no UPDATE or DELETE grant.
CREATE INDEX ON domain_events (status, available_at) WHERE status = 'PENDING';
--> statement-breakpoint
CREATE INDEX ON domain_events (aggregate_type, aggregate_id, id);
--> statement-breakpoint
CREATE INDEX ON domain_events (event_type, occurred_at DESC);
--> statement-breakpoint
CREATE INDEX ON domain_events USING gin (payload);
--> statement-breakpoint
CREATE TABLE event_consumers (             -- idempotent consumer offsets
  consumer_name TEXT NOT NULL,
  event_id      BIGINT NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);
--> statement-breakpoint
CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key      TEXT UNIQUE,               -- idempotency
  queue        TEXT NOT NULL,
  job_type     TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  state        job_state NOT NULL DEFAULT 'QUEUED',
  priority     SMALLINT NOT NULL DEFAULT 100,
  attempts     SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  locked_by    TEXT,
  locked_until TIMESTAMPTZ,
  run_after    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error   TEXT,
  result       JSONB,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON jobs (queue, state, run_after) WHERE state = 'QUEUED';
--> statement-breakpoint
CREATE INDEX ON jobs (state, updated_at DESC) WHERE state IN ('RUNNING','FAILED');
--> statement-breakpoint
CREATE INDEX ON jobs USING gin (payload);
--> statement-breakpoint
CREATE TABLE audit_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type    TEXT NOT NULL,      -- CUSTOMER | ADMIN | SYSTEM | AI | JOB
  actor_id      UUID,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  before_state  JSONB,
  after_state   JSONB,
  diff          JSONB,
  ip_hash       TEXT,
  user_agent_hash TEXT,
  trace_id      TEXT,
  request_id    TEXT,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON audit_logs (entity_type, entity_id, id DESC);
--> statement-breakpoint
CREATE INDEX ON audit_logs (actor_type, actor_id, id DESC);
--> statement-breakpoint
CREATE INDEX ON audit_logs (created_at DESC);
-- Append-only: no UPDATE or DELETE grants for the application role.
--> statement-breakpoint
CREATE TABLE webhook_receipts (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider          TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  signature_valid   BOOLEAN NOT NULL,
  event_type        TEXT,
  payload           JSONB NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ,
  processing_error  TEXT,
  UNIQUE (provider, external_event_id)
);
--> statement-breakpoint
CREATE INDEX ON webhook_receipts (provider, processed_at) WHERE processed_at IS NULL;
--> statement-breakpoint
CREATE TABLE rate_limit_counters (
  bucket       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
--> statement-breakpoint
CREATE TABLE feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  rollout_pct SMALLINT NOT NULL DEFAULT 0,
  rules       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID
);
