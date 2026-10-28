-- FRESH CLEAN SCHEMA — 0006 commerce & identity (technical_design/43 §2)
-- Clean business tables: customers, carts, orders, money. Zero provenance.
-- Additive to 0001–0005.

BEGIN;

-- identity -------------------------------------------------------------------
CREATE TABLE fresh.customers (
  id                bigserial PRIMARY KEY,
  email             text NOT NULL,
  password_hash     text NOT NULL,
  first_name        text,
  last_name         text,
  phone             text,
  email_verified_at timestamptz,
  status            text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_email_uq ON fresh.customers (lower(email));

CREATE TABLE fresh.customer_addresses (
  id          bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES fresh.customers(id) ON DELETE CASCADE,
  label       text,
  kind        text NOT NULL CHECK (kind IN ('SHIPPING','BILLING')),
  recipient   text NOT NULL,
  line1       text NOT NULL,
  line2       text,
  city        text NOT NULL,
  region      text,
  postal_code text,
  country     char(2) NOT NULL,
  phone       text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_addresses_customer_idx ON fresh.customer_addresses (customer_id);

CREATE TABLE fresh.auth_sessions (
  id          bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES fresh.customers(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,           -- sha256 of the session token; raw token never stored
  user_agent  text,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_customer_idx ON fresh.auth_sessions (customer_id);

CREATE TABLE fresh.favourites (
  customer_id bigint NOT NULL REFERENCES fresh.customers(id) ON DELETE CASCADE,
  owner_kind  text NOT NULL CHECK (owner_kind IN ('product','gemstone','setting')),
  owner_id    bigint NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, owner_kind, owner_id)
);

-- cart -----------------------------------------------------------------------
CREATE TABLE fresh.carts (
  id         bigserial PRIMARY KEY,
  customer_id bigint REFERENCES fresh.customers(id) ON DELETE SET NULL,  -- NULL = guest cart
  token      text NOT NULL UNIQUE,
  status     text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CONVERTED','ABANDONED','EXPIRED')),
  currency   char(3) NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.cart_items (
  id               bigserial PRIMARY KEY,
  cart_id          bigint NOT NULL REFERENCES fresh.carts(id) ON DELETE CASCADE,
  owner_kind       text NOT NULL CHECK (owner_kind IN ('product','configuration')),
  product_id       bigint REFERENCES fresh.products(id),
  configuration_id bigint REFERENCES fresh.configurations(id),
  quantity         smallint NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  unit_price       numeric(12,2) NOT NULL CHECK (unit_price >= 0),   -- snapshot at add time
  currency         char(3) NOT NULL DEFAULT 'USD',
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_one_owner_ck CHECK (
    (owner_kind = 'product' AND product_id IS NOT NULL AND configuration_id IS NULL) OR
    (owner_kind = 'configuration' AND configuration_id IS NOT NULL AND product_id IS NULL)
  )
);
CREATE INDEX cart_items_cart_idx ON fresh.cart_items (cart_id);

CREATE TABLE fresh.inventory_reservations (
  id         bigserial PRIMARY KEY,
  owner_kind text NOT NULL CHECK (owner_kind IN ('gemstone','product')),
  owner_id   bigint NOT NULL,
  cart_id    bigint REFERENCES fresh.carts(id) ON DELETE SET NULL,
  state      text NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','CONSUMED','RELEASED','EXPIRED')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_reservations_owner_idx ON fresh.inventory_reservations (owner_kind, owner_id, state);

-- orders & money ---------------------------------------------------------------
CREATE TABLE fresh.orders (
  id               bigserial PRIMARY KEY,
  order_number     text NOT NULL UNIQUE,                  -- MG-YYYY-###### app-minted
  customer_id      bigint REFERENCES fresh.customers(id),
  email            text NOT NULL,
  status           text NOT NULL DEFAULT 'PENDING_PAYMENT'
                   CHECK (status IN ('PENDING_PAYMENT','PAID','IN_FULFILLMENT','FULFILLED','DELIVERED','CANCELLED','REFUNDED')),
  currency         char(3) NOT NULL DEFAULT 'USD',
  subtotal         numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount       numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  grand_total      numeric(12,2) NOT NULL CHECK (grand_total >= 0),
  shipping_address jsonb NOT NULL,                        -- frozen snapshot
  billing_address  jsonb,
  customer_note    text,
  placed_at        timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_idx ON fresh.orders (customer_id);
CREATE INDEX orders_status_idx   ON fresh.orders (status, placed_at DESC);

CREATE TABLE fresh.order_items (
  id               bigserial PRIMARY KEY,
  order_id         bigint NOT NULL REFERENCES fresh.orders(id) ON DELETE CASCADE,
  product_id       bigint REFERENCES fresh.products(id),
  configuration_id bigint REFERENCES fresh.configurations(id),
  description      text NOT NULL,                          -- frozen snapshot
  code_snapshot    text NOT NULL,                          -- our semantic code at purchase time
  gemstone_id      bigint REFERENCES fresh.gemstones(id),  -- traceability of the moment
  setting_id       bigint REFERENCES fresh.settings(id),
  quantity         smallint NOT NULL CHECK (quantity > 0),
  unit_price       numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total       numeric(12,2) NOT NULL CHECK (line_total >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_one_source_ck CHECK (
    (product_id IS NOT NULL AND configuration_id IS NULL) OR
    (product_id IS NULL AND configuration_id IS NOT NULL)
  )
);
CREATE INDEX order_items_order_idx ON fresh.order_items (order_id);

CREATE TABLE fresh.payments (
  id           bigserial PRIMARY KEY,
  order_id     bigint NOT NULL REFERENCES fresh.orders(id),
  provider     text NOT NULL,                             -- e.g. stripe / test
  provider_ref text UNIQUE,                               -- provider's own id, if any
  state        text NOT NULL CHECK (state IN ('AUTHORIZED','CAPTURED','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  amount       numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency     char(3) NOT NULL,
  captured_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON fresh.payments (order_id);

CREATE TABLE fresh.refunds (
  id           bigserial PRIMARY KEY,
  payment_id   bigint NOT NULL REFERENCES fresh.payments(id),
  order_id     bigint NOT NULL REFERENCES fresh.orders(id),
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  reason       text,
  state        text NOT NULL CHECK (state IN ('PENDING','SUCCEEDED','FAILED')),
  provider_ref text UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE fresh.discounts (
  id           bigserial PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  kind         text NOT NULL CHECK (kind IN ('PERCENT','FIXED')),
  value        numeric(12,2) NOT NULL CHECK (value > 0),
  min_subtotal numeric(12,2),
  starts_at    timestamptz,
  ends_at      timestamptz,
  usage_limit  integer,
  used_count   integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.order_events (                       -- append-only timeline
  id         bigserial PRIMARY KEY,
  order_id   bigint NOT NULL REFERENCES fresh.orders(id) ON DELETE CASCADE,
  event      text NOT NULL,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON fresh.order_events (order_id, created_at);

CREATE TABLE fresh.order_fulfillments (
  id             bigserial PRIMARY KEY,
  order_id       bigint NOT NULL REFERENCES fresh.orders(id) ON DELETE CASCADE,
  carrier        text,
  tracking_number text,
  state          text NOT NULL DEFAULT 'PREPARING' CHECK (state IN ('PREPARING','SHIPPED','DELIVERED')),
  shipped_at     timestamptz,
  delivered_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers
CREATE OR REPLACE FUNCTION fresh.set_updated_at_0006() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER customers_updated_at_trg BEFORE UPDATE ON fresh.customers FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at_0006();
CREATE TRIGGER carts_updated_at_trg      BEFORE UPDATE ON fresh.carts      FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at_0006();
CREATE TRIGGER orders_updated_at_trg     BEFORE UPDATE ON fresh.orders     FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at_0006();

COMMIT;
