# ADR-035 — Fresh clean database: business-first schema, zero migration metadata

- **Status:** Accepted by explicit owner authorization (2026-10-28). Scope of this
  acceptance: the **design and draft DDL** (technical_design/41 +
  `docs/fresh-schema/`). Cutting the live implementation over to the fresh
  schema is a separate, future owner decision.

- **Context:** The locked schema (74+ tables, `packages/db/migrations/0001…0022`)
  was designed as the target of a corpus migration from the reverse-engineered
  source, so it carries migration machinery the owner does not want in the
  product database: 4 staging tables (`import_batches`,
  `staging_source_pages`, `staging_parsed_urls`, `staging_conflicts`),
  field-level provenance (ADR-024 model: `evidence_status`, `source_url`,
  `raw_spec`, `sku_evidence_status`), verbatim source-label tables, price
  observation tables, and a 44,218-row redirect table. The owner reviewed what
  the project learned from that design and decided the database going forward
  should be **designed by us, for us**: three business pillars (Gemstones by
  variety · Settings by jewellery type · Jewellery incl. nose ring), existing
  source entries **cleaned** into that model, **zero provenance**, no redirects,
  fresh SEO start.

- **Alternatives considered:** (a) keep the locked schema and migrate data into
  it as planned (rejected: carries migration metadata the owner explicitly
  rejected); (b) design a fresh schema ignoring the locked one (rejected:
  discards validated business knowledge); (c) **chosen** — design a fresh,
  clean catalogue-first schema informed by the locked architecture's learnings,
  dropping migration-specific apparatus, deferring commerce/AI/ops to later
  increments.

- **Decision:**
  1. Adopt `technical_design/41_FRESH_CLEAN_DATABASE_DESIGN.md` as the
     authoritative design for future schema work: v1 = 17 tables, 5 enums,
     2 functions, 5 triggers, in schema `fresh`; draft DDL in
     `docs/fresh-schema/0001_reference.sql` + `0002_catalogue.sql` (validated
     on a scratch database 2026-10-28: clean apply; F-INV-01/02/03 composition
     law enforced by CHECKs + one trigger; scratch dropped afterwards).
  2. **Zero provenance:** no evidence columns, no staging tables, no import
     batch metadata in the fresh schema. Honesty moves from DB metadata to
     **cleaning acceptance rules** (doc 41 §6): unknown → NULL, never invented;
     the 221 inferred-identity DYO rows are dropped entirely, not carried.
  3. **No redirects** (doc-34 scope descoped) and no old-URL parity work.
  4. The locked schema and all existing code remain **untouched** for now
     ("design first, decide later"); ADR-024 (provenance storage) is thereby
     made moot for the fresh schema and stays Proposed.

- **Reason:** A database designed for the business is simpler to reason about,
  cheaper to maintain, and matches how the owner actually works (three
  categories, cleaned data, no archaeology). Every migration-machinery table
  existed to serve a corpus import that the fresh schema will never run;
  keeping them would be permanent cost for no remaining purpose.

- **Consequences:** The corpus-migration plan (doc 33), its gates V1–V22 as
  *schema/provenance* mechanisms, and doc-34 redirects are **superseded for
  future schema work** and retained as historical reference. The cleaning
  script must be acceptance-gated (doc 41 §6 counts) because the DB no longer
  carries provenance to fall back on. Existing locked-schema implementation
  (apps/web, packages/db seeds/tests) keeps running unchanged until a separate
  cut-over decision, at which point an expand-then-migrate plan will be
  authored.

- **Evidence:** Owner decisions recorded in session 2026-10-28 (keep existing
  entries cleaned into the three pillars; zero provenance; no redirects;
  design-first for existing code; "start building"). DDL validation transcript
  recorded in `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` §24 (2026-10-28).

- **Status:** Accepted (2026-10-28).
