-- 0023_newsletter_and_requests
--
-- Two shopper-originated records the locked schema did not model:
--
--   1. newsletter_subscriptions — the consent record behind the footer and
--      journal subscribe forms. Consent is explicit and timestamped; an
--      unsubscribe is a timestamp, never a delete (the consent history stays
--      auditable). `email` is CITEXT so one address cannot exist twice by case.
--
--   2. customer_requests — the durable record behind the "create_customer_request"
--      AI tool and the viewing/contact forms. The AI architecture rule
--      (AGENTS.md section 8) says the model never writes to the database: the
--      tool calls an application service, and that service is the only writer
--      of this table. No price, inventory, order, payment, certificate or
--      permission column exists here.
--
-- Expand-only: two new tables and their indexes. No existing table is altered.
-- No data is fabricated or backfilled.

CREATE TABLE newsletter_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT NOT NULL,
  consent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  source          TEXT NOT NULL DEFAULT 'newsletter',
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX newsletter_subscriptions_email_idx ON newsletter_subscriptions (email);
--> statement-breakpoint
CREATE INDEX newsletter_subscriptions_active_idx
  ON newsletter_subscriptions (consent_at DESC)
  WHERE unsubscribed_at IS NULL;
--> statement-breakpoint

CREATE TABLE customer_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent      TEXT NOT NULL CHECK (
                intent IN ('INQUIRY', 'BESPOKE_REQUEST', 'APPOINTMENT', 'CUSTOM_CURATION')
              ),
  source      TEXT NOT NULL DEFAULT 'contact',
  email       CITEXT NOT NULL,
  name        TEXT,
  notes       TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (
                state IN ('SUBMITTED', 'ACKNOWLEDGED', 'CLOSED')
              ),
  customer_id UUID REFERENCES customers(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX customer_requests_created_idx ON customer_requests (created_at DESC);
--> statement-breakpoint
CREATE INDEX customer_requests_email_idx ON customer_requests (email, created_at DESC);
