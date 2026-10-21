-- 0022_integrity_indexes.sql — P1-27 (deep audit 2026-10-21)
--
-- Purpose (P1-27): FK-supporting indexes on live query paths plus the two
-- FK relationships for dangling integrity pointers. The locked schema's
-- constraint set is untouched — this is an expand migration, not a redesign.
--
-- Notes:
-- * Several of these indexes are partial on the nullable side, matching the
--   query predicates actually traced in the repositories (openapi/code paths
--   cited in §9.3 of the audit file).
-- * The two FK pointers (`carts.converted_order_id`,
--   `checkout_sessions.completed_order_id`) were UUID columns with no
--   constraint at all; they now point at `orders(id)` with default NO ACTION,
--   so a dangling forward reference is impossible and an order referenced by
--   a conversion cannot be destroyed underneath it.
-- * Defensive data-fix first: any existing dangling pointer is nulled before
--   the constraint is attached (live DBs verified clean at authoring time;
--   the fix keeps the migration idempotent-safe on drifted environments).

-- ── Defensive data-fix (idempotent) ────────────────────────────────────────
UPDATE carts
SET converted_order_id = NULL
WHERE converted_order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = carts.converted_order_id);

UPDATE checkout_sessions
SET completed_order_id = NULL
WHERE completed_order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = checkout_sessions.completed_order_id);

-- ── FKs for the two integrity pointers ─────────────────────────────────────
ALTER TABLE carts
  ADD CONSTRAINT carts_converted_order_fk
  FOREIGN KEY (converted_order_id) REFERENCES orders (id);

ALTER TABLE checkout_sessions
  ADD CONSTRAINT checkout_sessions_completed_order_fk
  FOREIGN KEY (completed_order_id) REFERENCES orders (id);

-- ── FK-supporting indexes traced to live query paths (§9.3 audit list) ────
-- cart: add/update/merge hot path
CREATE INDEX IF NOT EXISTS cart_items_product_configuration_idx
  ON cart_items (product_id, configuration_id);
CREATE INDEX IF NOT EXISTS cart_items_price_snapshot_idx
  ON cart_items (price_snapshot_id) WHERE price_snapshot_id IS NOT NULL;

-- order placement reads DYO snapshots via cart lines
CREATE INDEX IF NOT EXISTS order_items_configuration_idx
  ON order_items (configuration_id) WHERE configuration_id IS NOT NULL;

-- order-time document lookups (order-repository.ts certificate query)
CREATE INDEX IF NOT EXISTS certificates_product_idx
  ON certificates (product_id) WHERE product_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS certificates_configuration_idx
  ON certificates (configuration_id) WHERE configuration_id IS NOT NULL;

-- DYO hot paths (conversion, compatible-settings, reservations)
CREATE INDEX IF NOT EXISTS dyo_configurations_gemstone_idx
  ON dyo_configurations (gemstone_id) WHERE gemstone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dyo_configurations_gemstone_pair_idx
  ON dyo_configurations (gemstone_pair_id) WHERE gemstone_pair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dyo_configurations_setting_variant_idx
  ON dyo_configurations (setting_variant_id) WHERE setting_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dyo_quotes_configuration_idx
  ON dyo_quotes (configuration_id);
CREATE INDEX IF NOT EXISTS dyo_quotes_price_snapshot_idx
  ON dyo_quotes (price_snapshot_id);

-- pair availability joins
CREATE INDEX IF NOT EXISTS products_gemstone_pair_idx
  ON products (gemstone_pair_id) WHERE gemstone_pair_id IS NOT NULL;

-- ledger FK paths
CREATE INDEX IF NOT EXISTS tool_calls_message_idx
  ON tool_calls (message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_consumers_event_idx
  ON event_consumers (event_id);
CREATE INDEX IF NOT EXISTS refunds_payment_idx
  ON refunds (payment_id);
CREATE INDEX IF NOT EXISTS fulfillments_order_item_idx
  ON fulfillments (order_item_id);
CREATE INDEX IF NOT EXISTS verification_events_product_idx
  ON verification_events (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_interactions_conversation_idx
  ON ai_interactions (conversation_id);
CREATE INDEX IF NOT EXISTS guardrail_events_conversation_idx
  ON guardrail_events (conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS knowledge_documents_source_page_idx
  ON knowledge_documents (source_page_id) WHERE source_page_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkout_sessions_customer_idx
  ON checkout_sessions (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS favorites_product_idx
  ON favorites (product_id);
