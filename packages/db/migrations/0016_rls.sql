-- 0016_rls
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.16, verbatim.
-- One logical unit: 6 ENABLE ROW LEVEL SECURITY statements and their 6
-- policies, kept adjacent in the same migration so an RLS-enabled table can
-- never exist without a policy (Phase 0 defect D-07: enabling RLS without a
-- policy denies all rows to non-superusers).
-- Neon connects over the network, so RLS is defence-in-depth for customer data
-- rather than the primary boundary. The primary boundary is the application
-- service layer.

ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE addresses     ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE carts         ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Every table with RLS enabled MUST have at least one policy. Enabling RLS
-- without a policy denies all rows to non-superusers, which would silently
-- break addresses, carts, conversations and messages. Verified in Phase 0.
CREATE POLICY customers_own ON customers
  USING (identity_user_id = current_setting('app.user_subject', true));
--> statement-breakpoint
CREATE POLICY addresses_own ON addresses
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE identity_user_id = current_setting('app.user_subject', true)
  ));
--> statement-breakpoint
CREATE POLICY carts_own ON carts
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE identity_user_id = current_setting('app.user_subject', true)
    )
    OR anonymous_session_id = current_setting('app.anonymous_session_id', true)
  );
--> statement-breakpoint
CREATE POLICY orders_own ON orders
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE identity_user_id = current_setting('app.user_subject', true)
  ));
--> statement-breakpoint
CREATE POLICY conversations_own ON conversations
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE identity_user_id = current_setting('app.user_subject', true)
    )
    OR current_setting('app.staff', true) = 'true'
  );
--> statement-breakpoint
CREATE POLICY messages_own ON messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE customer_id IN (
      SELECT id FROM customers
      WHERE identity_user_id = current_setting('app.user_subject', true)
    )
  ));
-- Admin access uses a separate BYPASSRLS role; every bypass is still recorded
-- in audit_logs by the service layer.
