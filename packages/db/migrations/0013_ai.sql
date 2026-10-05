-- 0013_ai
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.13, verbatim.
-- One logical unit: the 9 AI tables, including both vector(1024) columns and
-- both HNSW indexes. Dimension 1024 is a deliberate single-dimension choice
-- (ADR-018): a model change is a versioned re-embed plus an HNSW rebuild,
-- never a schema change.

CREATE TABLE conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_key   TEXT NOT NULL UNIQUE,
  channel            conversation_channel NOT NULL,
  state              conversation_state NOT NULL DEFAULT 'OPEN',
  customer_id        UUID REFERENCES customers(id),
  external_ref       TEXT,               -- WhatsApp thread key
  locale             TEXT NOT NULL DEFAULT 'en',
  handoff_reason     handoff_reason,
  handed_off_at      TIMESTAMPTZ,
  assigned_agent_id  UUID,
  summary            TEXT,
  summary_model      ai_provider,
  summary_at         TIMESTAMPTZ,
  message_count      INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at          TIMESTAMPTZ,
  UNIQUE (channel, external_ref)
);
--> statement-breakpoint
CREATE INDEX ON conversations (customer_id, updated_at DESC);
--> statement-breakpoint
CREATE INDEX ON conversations (state, updated_at DESC) WHERE state <> 'CLOSED';
--> statement-breakpoint
CREATE INDEX ON conversations (channel, state);
--> statement-breakpoint
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  seq              INTEGER NOT NULL,
  role             message_role NOT NULL,
  content          TEXT NOT NULL,
  content_redacted TEXT,                 -- PII-scrubbed copy for training and eval
  model_provider   ai_provider,
  model_name       TEXT,
  model_version    TEXT,
  prompt_version   TEXT,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  cached_tokens    INTEGER,
  cost_usd         NUMERIC(10,6),
  latency_ms       INTEGER,
  finish_reason    TEXT,
  citations        JSONB NOT NULL DEFAULT '[]'::jsonb,
  guardrail_flags  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, seq)
);
--> statement-breakpoint
CREATE INDEX ON messages (conversation_id, seq);
--> statement-breakpoint
CREATE TABLE tool_calls (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id             UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id        UUID REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name              TEXT NOT NULL,
  tool_version           TEXT NOT NULL,
  input                  JSONB NOT NULL,
  output                 JSONB,
  output_redacted        JSONB,
  authorization_decision TEXT NOT NULL,   -- ALLOW | DENY | ALLOW_SCOPED
  authorization_reason   TEXT,
  actor_type             TEXT NOT NULL,
  actor_id               UUID,
  latency_ms             INTEGER,
  cost_usd               NUMERIC(10,6),
  error_code             TEXT,
  error_message          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON tool_calls (tool_name, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON tool_calls (conversation_id, created_at);
--> statement-breakpoint
CREATE INDEX ON tool_calls (error_code) WHERE error_code IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ON tool_calls (authorization_decision) WHERE authorization_decision = 'DENY';
--> statement-breakpoint
CREATE TABLE knowledge_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  doc_kind         TEXT NOT NULL,   -- EDUCATION | FAQ | GUIDE | VARIETY | TREATMENT | POLICY | JOURNAL
  variety_id       UUID REFERENCES gemstone_varieties(id),
  locale           TEXT NOT NULL DEFAULT 'en',
  source_page_id   UUID REFERENCES pages(id),
  content          TEXT NOT NULL,
  trust_tier       TEXT NOT NULL DEFAULT 'CURATED'
                   CHECK (trust_tier IN ('VERIFIED_PRODUCT_DATA','CURATED','COMMUNITY','UNVERIFIED')),
  status           TEXT NOT NULL DEFAULT 'ACTIVE',
  checksum_sha256  TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  embedded_at      TIMESTAMPTZ,
  embedding_model  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON knowledge_documents (doc_kind, status) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON knowledge_documents (variety_id) WHERE variety_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE knowledge_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  ordinal         INTEGER NOT NULL,
  content         TEXT NOT NULL,
  token_count     INTEGER NOT NULL,
  heading_path    TEXT[],
  embedding       vector(1024),
  embedding_model TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, ordinal)
);
--> statement-breakpoint
CREATE INDEX ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX ON knowledge_chunks USING gin (to_tsvector('english', content));
--> statement-breakpoint
CREATE TABLE product_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  embedding       vector(1024) NOT NULL,
  embedding_model TEXT NOT NULL,
  content_hash    TEXT NOT NULL,      -- drives invalidation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, embedding_model)
);
--> statement-breakpoint
CREATE INDEX ON product_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE TABLE ai_interactions (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id         TEXT NOT NULL UNIQUE,
  conversation_id    UUID REFERENCES conversations(id),
  channel            conversation_channel NOT NULL,
  surface            TEXT NOT NULL,   -- 'chat_panel','whatsapp','admin_assist','search_assist'
  intent             TEXT,
  provider           ai_provider NOT NULL,
  model_name         TEXT NOT NULL,
  model_version      TEXT,
  prompt_version     TEXT NOT NULL,
  input_tokens       INTEGER,
  output_tokens      INTEGER,
  cached_tokens      INTEGER,
  cost_usd           NUMERIC(10,6),
  latency_ms         INTEGER,
  ttfb_ms            INTEGER,
  tool_call_count    SMALLINT NOT NULL DEFAULT 0,
  guardrail_action   TEXT,            -- ALLOW | SANITIZE | BLOCK | ESCALATE
  grounded_ratio     NUMERIC(4,3),    -- cited claims / total claims
  handoff_triggered  BOOLEAN NOT NULL DEFAULT false,
  error_code         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON ai_interactions (created_at DESC);
--> statement-breakpoint
CREATE INDEX ON ai_interactions (surface, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON ai_interactions (model_name, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON ai_interactions (handoff_triggered) WHERE handoff_triggered;
--> statement-breakpoint
CREATE TABLE ai_evaluations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_suite TEXT NOT NULL,
  case_id    TEXT NOT NULL,
  run_id     UUID NOT NULL,
  model_name TEXT,
  prompt_version TEXT,
  expected   JSONB NOT NULL,
  actual     JSONB,
  passed     BOOLEAN NOT NULL,
  dimension  TEXT NOT NULL,   -- factuality, tool_selection, price_safety, refusal, citation, escalation
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eval_suite, case_id, run_id)
);
--> statement-breakpoint
CREATE INDEX ON ai_evaluations (eval_suite, dimension, passed);
--> statement-breakpoint
CREATE TABLE guardrail_events (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  interaction_id   BIGINT REFERENCES ai_interactions(id),
  conversation_id  UUID REFERENCES conversations(id),
  rule_id          TEXT NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('ALLOW','SANITIZE','BLOCK','ESCALATE')),
  trigger_text_hash TEXT,           -- hash only, never raw PII
  detail           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON guardrail_events (rule_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON guardrail_events (action, created_at DESC);
