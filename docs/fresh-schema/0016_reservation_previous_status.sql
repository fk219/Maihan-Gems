-- FRESH CLEAN SCHEMA — 0016 reservation provenance for safe restock
-- Cancelling an order restores the stone to the status it had before the
-- reservation (never silently publishes a DRAFT stone).

BEGIN;

ALTER TABLE fresh.inventory_reservations ADD COLUMN IF NOT EXISTS previous_status text;

COMMIT;
