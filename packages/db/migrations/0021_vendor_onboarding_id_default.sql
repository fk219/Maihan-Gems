-- 0021_vendor_onboarding_id_default
-- Fixes 0020: new vendor registrations insert without an explicit id, but the
-- table was created without a default. Backfilled rows kept their job ids.
ALTER TABLE vendor_onboarding
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
