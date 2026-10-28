-- FRESH CLEAN SCHEMA — 0005 media kinds + limits + 3D / virtual try-on
-- Owner rules (2026-10-28): ≤10 images, ≤5 videos/GIFs, 3D view, VTO per item.
-- Additive to 0001–0004.

BEGIN;

-- media type (display role stays in `role`; kind is the physical media type)
DO $$ BEGIN
  CREATE TYPE fresh.asset_kind AS ENUM ('IMAGE','VIDEO','GIF','MODEL_3D','CERTIFICATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE fresh.assets ADD COLUMN IF NOT EXISTS kind        fresh.asset_kind NOT NULL DEFAULT 'IMAGE';
ALTER TABLE fresh.assets ADD COLUMN IF NOT EXISTS vto_ready   boolean NOT NULL DEFAULT false;
ALTER TABLE fresh.assets ADD COLUMN IF NOT EXISTS calibration jsonb;  -- honest NULL until measured

-- consistency laws
ALTER TABLE fresh.assets ADD CONSTRAINT assets_vto_kind_ck
  CHECK (vto_ready = false OR kind = 'MODEL_3D');
ALTER TABLE fresh.assets ADD CONSTRAINT assets_cert_kind_ck
  CHECK (kind <> 'CERTIFICATE' OR role = 'CERTIFICATE');

-- exactly one PRIMARY per owner
CREATE UNIQUE INDEX IF NOT EXISTS assets_one_primary_uq
  ON fresh.assets (owner_kind, owner_id) WHERE role = 'PRIMARY';

-- per-owner media limits (doc: images ≤10 · video+gif ≤5 · 3D models ≤2)
CREATE OR REPLACE FUNCTION fresh.assert_media_limits() RETURNS trigger AS $$
DECLARE
  n_image  int;  n_video int;  n_model int;
  ok_image boolean := true; ok_video boolean := true; ok_model boolean := true;
BEGIN
  IF NEW.owner_kind = 'configuration' THEN
    RETURN NEW;  -- DYO session renders are unbounded; catalogue items are limited
  END IF;
  SELECT count(*) FILTER (WHERE kind = 'IMAGE'),
         count(*) FILTER (WHERE kind IN ('VIDEO','GIF')),
         count(*) FILTER (WHERE kind = 'MODEL_3D')
    INTO n_image, n_video, n_model
    FROM fresh.assets
   WHERE owner_kind = NEW.owner_kind AND owner_id = NEW.owner_id
     AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF TG_OP = 'UPDATE' AND OLD.kind IS DISTINCT FROM NEW.kind THEN
    -- moving OUT of a bucket frees a slot: subtract the old kind's membership
    IF OLD.kind = 'IMAGE' THEN n_image := n_image - 1;
    ELSIF OLD.kind IN ('VIDEO','GIF') THEN n_video := n_video - 1;
    ELSIF OLD.kind = 'MODEL_3D' THEN n_model := n_model - 1;
    END IF;
  END IF;

  IF NEW.kind = 'IMAGE'      THEN ok_image := n_image  < 10;
  ELSIF NEW.kind IN ('VIDEO','GIF') THEN ok_video := n_video < 5;
  ELSIF NEW.kind = 'MODEL_3D' THEN ok_model := n_model < 2;
  END IF;

  IF NOT ok_image THEN RAISE EXCEPTION 'media limit: max 10 images per %', NEW.owner_kind; END IF;
  IF NOT ok_video THEN RAISE EXCEPTION 'media limit: max 5 videos/gifs per %', NEW.owner_kind; END IF;
  IF NOT ok_model THEN RAISE EXCEPTION 'media limit: max 2 3D models per %', NEW.owner_kind; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_media_limits_trg ON fresh.assets;
CREATE TRIGGER assets_media_limits_trg
  BEFORE INSERT OR UPDATE OF kind ON fresh.assets
  FOR EACH ROW EXECUTE FUNCTION fresh.assert_media_limits();

COMMIT;
