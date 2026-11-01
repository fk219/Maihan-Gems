-- FRESH CLEAN SCHEMA — 0019 ready-made stock + reservation provenance
-- 1) READY_MADE products carry a stock quantity.
-- 2) Reservations know their order, so cancellation/expiry never releases a
--    stone that a newer reservation holds.
-- 3) Trigram indexes make product search as fast as stones/settings.

BEGIN;

ALTER TABLE fresh.products
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
ALTER TABLE fresh.products
  DROP CONSTRAINT IF EXISTS products_quantity_check;
ALTER TABLE fresh.products
  ADD CONSTRAINT products_quantity_check CHECK (quantity >= 0);

ALTER TABLE fresh.inventory_reservations
  ADD COLUMN IF NOT EXISTS order_id bigint REFERENCES fresh.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS inventory_reservations_order_idx ON fresh.inventory_reservations (order_id);

CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON fresh.products USING gin (name fresh.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_slug_trgm_idx ON fresh.products USING gin (slug fresh.gin_trgm_ops);

COMMIT;
