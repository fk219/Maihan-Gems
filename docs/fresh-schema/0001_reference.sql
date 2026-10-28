-- FRESH CLEAN SCHEMA v1 — reference vocabulary
-- Owner-approved design: technical_design/41 (ADR-035, 2026-10-28).
-- Zero provenance. No staging, no import metadata, no evidence columns.

BEGIN;

CREATE SCHEMA IF NOT EXISTS fresh;

CREATE TYPE fresh.catalog_status       AS ENUM ('DRAFT','ACTIVE','RESERVED','SOLD','ARCHIVED');
CREATE TYPE fresh.configuration_status AS ENUM ('OPEN','QUOTED','CONVERTED','EXPIRED','CANCELLED');
CREATE TYPE fresh.gemstone_kind        AS ENUM ('SINGLE','PAIR');
CREATE TYPE fresh.product_kind         AS ENUM ('READY_MADE','CONFIGURED');
CREATE TYPE fresh.asset_role           AS ENUM ('PRIMARY','GALLERY','VIDEO','CERTIFICATE');

CREATE TABLE fresh.gemstone_varieties (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  species    text,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.gemstone_colours (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  hex_preview char(7),
  sort        integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.gemstone_origins (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.shapes (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.clarities (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.treatments (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.metals (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  purity     text,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.setting_styles (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  slug       text NOT NULL UNIQUE,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.jewellery_types (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  sort       integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
