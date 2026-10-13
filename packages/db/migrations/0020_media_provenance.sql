-- Storefront media provenance: source URL and dealer name so imported
-- imagery can be replaced later without losing the original reference.
ALTER TABLE media ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS source_vendor TEXT;
