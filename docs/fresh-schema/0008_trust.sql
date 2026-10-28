-- FRESH CLEAN SCHEMA — 0008 trust: certificates + diamond 4C (technical_design/43 §4)
-- Deferred design (doc 42 §9) now realised. Private docs; claims recorded honestly.

BEGIN;

CREATE TABLE fresh.certificates (
  id          bigserial PRIMARY KEY,
  owner_kind  text NOT NULL CHECK (owner_kind IN ('gemstone','product')),
  owner_id    bigint NOT NULL,
  agency      text NOT NULL,                         -- GIA / IGI / IGL / APPRAISAL / SARIN
  cert_no     text NOT NULL,
  url         text,                                  -- private storage; signed URLs at app layer
  issued_at   date,
  verified    text NOT NULL DEFAULT 'UNVERIFIED' CHECK (verified IN ('UNVERIFIED','VERIFIED','FLAGGED')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificates_owner_doc_uq UNIQUE (owner_kind, owner_id, agency, cert_no)
);
CREATE INDEX certificates_owner_idx ON fresh.certificates (owner_kind, owner_id);

-- diamond 4C grading (applies to natural AND lab-grown diamonds; melee has no row — honest)
CREATE TABLE fresh.diamond_grades (
  gemstone_id   bigint PRIMARY KEY REFERENCES fresh.gemstones(id) ON DELETE CASCADE,
  colour_grade  text CHECK (colour_grade IN ('D','E','F','G','H','I','J','K','L','M','N')),
  clarity_grade text CHECK (clarity_grade IN ('FL','IF','VVS1','VVS2','VS1','VS2','SI1','SI2','I1','I2','I3')),
  cut_grade     text CHECK (cut_grade IN ('EXCELLENT','VERY_GOOD','GOOD','FAIR','POOR')),
  fluorescence  text CHECK (fluorescence IN ('NONE','FAINT','MEDIUM','STRONG','VERY_STRONG')),
  cert_agency   text,
  cert_no       text,
  table_pct     numeric(4,1),
  depth_pct     numeric(4,1)
);

CREATE TABLE fresh.verification_events (                -- append-only trust ledger
  id         bigserial PRIMARY KEY,
  cert_id    bigint NOT NULL REFERENCES fresh.certificates(id) ON DELETE CASCADE,
  action     text NOT NULL,                            -- SUBMITTED / VERIFIED / FLAGGED / REVOKED
  actor      text,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
