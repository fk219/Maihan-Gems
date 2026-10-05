-- 0009_commerce
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.9, verbatim.
-- One logical unit: the 13 commerce tables plus the deferred foreign key
-- dyo_configurations_customer_fk. The FK is declared here, at the point both
-- endpoints exist (dyo_configurations in 0007, customers here), so that
-- schema application order is strictly one-pass and acyclic (doc 04, defect
-- D-05).

CREATE TABLE customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_user_id   TEXT UNIQUE,              -- managed auth provider subject
  email              CITEXT UNIQUE,
  email_verified_at  TIMESTAMPTZ,
  phone              TEXT,
  first_name         TEXT,
  last_name          TEXT,
  marketing_opt_in   BOOLEAN NOT NULL DEFAULT false,
  accepts_cookies    BOOLEAN NOT NULL DEFAULT false,
  astrology_opt_in   BOOLEAN NOT NULL DEFAULT false,   -- Vedic vertical, FR-CMS-03
  preferred_currency CHAR(3) NOT NULL DEFAULT 'USD',
  state              record_state NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON customers (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON customers (identity_user_id) WHERE identity_user_id IS NOT NULL;
--> statement-breakpoint
CREATE TABLE customer_profiles (
  customer_id           UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  birth_date            DATE,
  birth_place           TEXT,
  zodiac_sign           TEXT,
  birth_chart_reference TEXT,
  ring_size             NUMERIC(3,1),         -- [UNKNOWN] in source; customer-entered
  notes                 TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE addresses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id),
  kind         TEXT NOT NULL CHECK (kind IN ('SHIPPING','BILLING','SHOWROOM','PICKUP')),
  full_name    TEXT NOT NULL,
  recipient    TEXT,
  line1        TEXT, line2 TEXT, line3 TEXT,
  city         TEXT NOT NULL, region TEXT, postal_code TEXT,
  country_code CHAR(2) NOT NULL DEFAULT 'US',
  phone        TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON addresses (customer_id) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TABLE carts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_token           TEXT NOT NULL UNIQUE,
  customer_id          UUID REFERENCES customers(id),
  anonymous_session_id TEXT,
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  state                cart_state NOT NULL DEFAULT 'ACTIVE',
  pricing_snapshot     JSONB,                  -- advisory only, never authoritative
  expires_at           TIMESTAMPTZ NOT NULL,
  converted_order_id   UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON carts (customer_id, state);
--> statement-breakpoint
CREATE INDEX ON carts (anonymous_session_id, state);
--> statement-breakpoint
CREATE INDEX ON carts (expires_at) WHERE state = 'ACTIVE';
--> statement-breakpoint
CREATE TABLE cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id           UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  configuration_id  UUID REFERENCES dyo_configurations(id),
  quantity          SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price        NUMERIC(12,2) NOT NULL,
  price_snapshot_id UUID REFERENCES dyo_price_snapshots(id),
  engraving_text    TEXT,
  options           JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, configuration_id)
);
--> statement-breakpoint
CREATE INDEX ON cart_items (cart_id);
--> statement-breakpoint
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT NOT NULL UNIQUE,
  customer_id      UUID REFERENCES customers(id),
  email            TEXT NOT NULL,
  state            order_state NOT NULL DEFAULT 'PENDING_PAYMENT',
  currency         CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal         NUMERIC(12,2) NOT NULL,
  discount_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_total   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total      NUMERIC(12,2) NOT NULL,
  pricing_snapshot JSONB NOT NULL,             -- frozen and auditable
  shipping_address JSONB NOT NULL,
  billing_address  JSONB,
  customer_note    TEXT,
  internal_note    TEXT,
  placed_at        TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  fulfilled_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  idempotency_key  TEXT UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON orders (customer_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON orders (state, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON orders (placed_at DESC);
--> statement-breakpoint
-- Deferred foreign key: dyo_configurations is created in section 8.7, before
-- customers exists here in section 8.9. Declared at the point both sides exist
-- so that schema application order is strictly one-pass and acyclic.
ALTER TABLE dyo_configurations
  ADD CONSTRAINT dyo_configurations_customer_fk
  FOREIGN KEY (customer_id) REFERENCES customers(id);
--> statement-breakpoint
CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id              UUID REFERENCES products(id),
  configuration_id        UUID REFERENCES dyo_configurations(id),
  sku_snapshot            TEXT NOT NULL,
  title_snapshot          TEXT NOT NULL,
  configuration_snapshot  JSONB,               -- full immutable config at order time
  gem_snapshot            JSONB NOT NULL,      -- stone specs as sold
  document_snapshot       JSONB,               -- certificate references as sold
  quantity                SMALLINT NOT NULL CHECK (quantity > 0),
  unit_price              NUMERIC(12,2) NOT NULL,
  line_total              NUMERIC(12,2) NOT NULL,
  production_days         SMALLINT,
  state                   TEXT NOT NULL DEFAULT 'PENDING',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON order_items (order_id);
--> statement-breakpoint
CREATE INDEX ON order_items (product_id);
--> statement-breakpoint
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  provider            TEXT NOT NULL,            -- [UNKNOWN] in source
  provider_payment_id TEXT UNIQUE,
  state               payment_state NOT NULL DEFAULT 'CREATED',
  amount              NUMERIC(12,2) NOT NULL,
  captured_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  refunded_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  method_type         TEXT,                      -- card, financing, wallet
  method_last4        TEXT,
  failure_code        TEXT,
  failure_message     TEXT,
  idempotency_key     TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at         TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON payments (order_id, state);
--> statement-breakpoint
CREATE INDEX ON payments (provider, provider_payment_id);
--> statement-breakpoint
CREATE TABLE refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        UUID NOT NULL REFERENCES payments(id),
  order_id          UUID NOT NULL REFERENCES orders(id),
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  reason            TEXT NOT NULL,
  state             refund_state NOT NULL DEFAULT 'REQUESTED',
  provider_refund_id TEXT,
  requested_by      UUID,
  approved_by       UUID,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON refunds (order_id, state);
--> statement-breakpoint
CREATE TABLE discounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT UNIQUE,
  name               TEXT NOT NULL,
  type               discount_type NOT NULL,
  value              NUMERIC(12,2),
  currency           CHAR(3),
  scope              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- varieties, categories, products
  min_subtotal       NUMERIC(12,2),
  max_redemptions    INTEGER,
  redemption_count   INTEGER NOT NULL DEFAULT 0,
  per_customer_limit SMALLINT,
  valid_from         TIMESTAMPTZ NOT NULL,
  valid_to           TIMESTAMPTZ,
  state              record_state NOT NULL DEFAULT 'ACTIVE',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discounts_code_ck CHECK (code IS NULL OR code <> '')
);
--> statement-breakpoint
CREATE INDEX ON discounts (state, valid_from, valid_to);
--> statement-breakpoint
-- Financing and protection plan: FR-COM-04, observed via /financing and
-- /extend-protection-plan.
CREATE TABLE product_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id),
  addon_type  discount_type NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  state       record_state NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE fulfillments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID REFERENCES order_items(id),
  kind            TEXT NOT NULL CHECK (kind IN
                    ('SHIPMENT','PICKUP','APPRAISAL','ENGRAVING','CERTIFICATE','WHITE_GLOVE_VIDEO')),
  carrier         TEXT, tracking_number TEXT, tracking_url TEXT,
  state           TEXT NOT NULL DEFAULT 'PENDING',
  shipped_at      TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON fulfillments (order_id, kind);
--> statement-breakpoint
CREATE TABLE order_events (                -- append-only state timeline
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  from_state  order_state,
  to_state    order_state NOT NULL,
  actor_type  TEXT NOT NULL,
  actor_id    UUID,
  reason      TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON order_events (order_id, id);
