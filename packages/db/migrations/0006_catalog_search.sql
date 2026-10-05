-- 0006_catalog_search
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.6 (function, trigger and
-- index verbatim); grouping per technical_design/04 section "Migration
-- ordering": migration 0006 carries the gemstones search machinery.
-- The search_document column is created in 0005; a Postgres expression index
-- cannot contain a subquery or reference another table (Phase 0 defect D-03),
-- so the resolved label set is materialised into search_document by this
-- trigger and indexed as a single-column expression.

CREATE OR REPLACE FUNCTION gemstones_search_document_fn() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  NEW.search_document := concat_ws(' ',
    NEW.gem_ref,
    coalesce(NEW.cut_label, ''),
    coalesce(NEW.shape::text, ''),
    coalesce(NEW.cutting_style::text, ''),
    (SELECT v.name       FROM gemstone_varieties v WHERE v.id = NEW.variety_id),
    (SELECT v.display_name FROM gemstone_varieties v WHERE v.id = NEW.variety_id),
    (SELECT c.name       FROM gemstone_colours  c WHERE c.id = NEW.colour_id),
    (SELECT i.name       FROM colour_intensities i WHERE i.id = NEW.intensity_id),
    (SELECT o.name       FROM gemstone_origins  o WHERE o.id = NEW.origin_id),
    (SELECT t.label      FROM treatments       t WHERE t.id = NEW.treatment_id),
    (SELECT cl.label     FROM clarities        cl WHERE cl.id = NEW.clarity_id));
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
CREATE TRIGGER gemstones_search_document_trg
  BEFORE INSERT OR UPDATE ON gemstones
  FOR EACH ROW EXECUTE FUNCTION gemstones_search_document_fn();
--> statement-breakpoint
-- Full-text over the resolved label set (never over the raw doubled strings of D9).
CREATE INDEX ON gemstones USING gin (to_tsvector('english', search_document));
