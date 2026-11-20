-- 0020_vendors
-- ADR-026 — multivendor marketplace. Expand-then-contract:
--   * new tables only;
--   * `products.vendor_id` is added NULLABLE and backfilled to the seeded
--     PLATFORM vendor, so the 9,900 migrated products keep a valid owner
--     before a NOT NULL tightening in a later migration.
-- No locked column is dropped or weakened.
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  legal_name      TEXT,
  email           CITEXT NOT NULL UNIQUE,
  country         CHAR(2),
  state           TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (state IN ('PENDING','APPROVED','SUSPENDED','TERMINATED')),
  -- Platform commission in basis points (1500 = 15.00%). Bounded: a negative
  -- or absurd commission is a data defect, not a negotiation.
  commission_bps  INTEGER NOT NULL DEFAULT 1500
    CHECK (commission_bps BETWEEN 0 AND 5000),
  payout_currency CHAR(3) NOT NULL DEFAULT 'USD',
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendors_state_idx ON vendors (state);

CREATE TABLE IF NOT EXISTS vendor_members (
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'OWNER'
    CHECK (role IN ('OWNER','MANAGER','STAFF')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, user_id)
);

CREATE INDEX IF NOT EXISTS vendor_members_user_idx ON vendor_members (user_id);

-- Every commercial row gains an owner. Nullable first; the backfill assigns
-- the platform vendor, which is a seeded, real row — never a magic UUID.
ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
ALTER TABLE gemstones ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

INSERT INTO vendors (slug, display_name, legal_name, email, state, commission_bps)
VALUES ('platform', 'Maihan Gems', 'Maihan Gems', 'atelier@maihan.invalid', 'APPROVED', 0)
ON CONFLICT (slug) DO NOTHING;

UPDATE products SET vendor_id = (SELECT id FROM vendors WHERE slug = 'platform')
WHERE vendor_id IS NULL;
UPDATE gemstones SET vendor_id = (SELECT id FROM vendors WHERE slug = 'platform')
WHERE vendor_id IS NULL;

CREATE INDEX IF NOT EXISTS products_vendor_idx ON products (vendor_id);
CREATE INDEX IF NOT EXISTS gemstones_vendor_idx ON gemstones (vendor_id);

-- Per-vendor money for one order. The order keeps its single pricing snapshot;
-- this table is how that snapshot is split and later paid out.
CREATE TABLE IF NOT EXISTS order_vendor_allocations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id      UUID NOT NULL REFERENCES vendors(id),
  subtotal       NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  commission     NUMERIC(12,2) NOT NULL CHECK (commission >= 0),
  vendor_payable NUMERIC(12,2) NOT NULL CHECK (vendor_payable >= 0),
  currency       CHAR(3) NOT NULL DEFAULT 'USD',
  state          TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (state IN ('PENDING','RELEASED','REFUNDED','CANCELLED')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS order_vendor_allocations_vendor_idx
  ON order_vendor_allocations (vendor_id, state);

-- Append-only ledger. A refund or payout is a new row, never an edit, so the
-- balance is always reconstructible from history.
CREATE TABLE IF NOT EXISTS vendor_ledger (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vendor_id  UUID NOT NULL REFERENCES vendors(id),
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('SALE','COMMISSION','REFUND','PAYOUT','ADJUSTMENT')),
  amount     NUMERIC(12,2) NOT NULL,
  currency   CHAR(3) NOT NULL DEFAULT 'USD',
  reference  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_ledger_vendor_idx
  ON vendor_ledger (vendor_id, id DESC);
