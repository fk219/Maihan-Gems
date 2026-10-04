# 04 DATABASE IMPLEMENTATION

**Package:** `technical_design/` doc 04 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 8 (validated: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, 6 RLS policies, 1 trigger, 2 functions, 1 view, 2 vector columns, both HNSW indexes).
**Evidence status:** `[INFERRED]` implementation structure over a `[OBSERVED]`-validated schema. The schema is preserved exactly; this document defines how it is applied and queried.

---

## Purpose

Define exactly how the validated PostgreSQL schema is provisioned, ordered, versioned, queried and secured. **The schema is not redesigned.**

## Target

Neon PostgreSQL 16+. Single database, single `public` schema. Partitioning is not used: at the validated scale (largest table `domain_events`, indexed by status and time) it would add operational cost without measured benefit. Revisit only if measured.

## Schema inventory by ownership group

| Source of Truth § | Group | Tables |
|---|---|---|
| 8.4 | Migration staging | `import_batches`, `staging_source_pages`, `staging_parsed_urls`, `staging_conflicts` |
| 8.5 | Taxonomy and reference | `gemstone_species`, `gemstone_varieties`, `gemstone_colours`, `colour_intensities`, `gemstone_origins`, `treatments`, `treatment_labels`, `clarities`, `clarity_labels`, `metals`, `setting_styles`, `jewellery_types` |
| 8.6 | Catalog core | `gemstones`, `gemstone_stones`, `settings`, `setting_variants`, `setting_compatibility_rules`, `products`, `product_gemstones` |
| 8.7 | DYO | `dyo_configurations`, `dyo_price_snapshots`, `dyo_quotes` |
| 8.8 | Pricing | `price_lists`, `price_entries`, `price_model_observations` |
| 8.9 | Commerce | `customers`, `customer_profiles`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `refunds`, `discounts`, `product_addons`, `fulfillments`, `order_events` |
| 8.10 | Trust | `certificates`, `certificate_ocr_runs`, `certificate_extractions`, `certificate_anomalies`, `certificate_reviews`, `verification_events` |
| 8.11 | Assets | `assets`, `asset_variants`, `asset_usages`, `webar_assets`, `ar_handoff_tokens` |
| 8.12 | CMS | `pages`, `page_revisions`, `navigations`, `redirects`, `seo_metadata` |
| 8.13 | AI | `conversations`, `messages`, `tool_calls`, `knowledge_documents`, `knowledge_chunks`, `product_embeddings`, `ai_interactions`, `ai_evaluations`, `guardrail_events` |
| 8.14 | Operations | `domain_events`, `event_consumers`, `jobs`, `audit_logs`, `webhook_receipts`, `rate_limit_counters`, `feature_flags` |

Total: 74. Every one is created; no table is added or removed by this design.

## Extensions

Installed by migration 0001, in this order:

```sql
CREATE EXTENSION IF NOT EXISTS vector;             -- required, verified executable
CREATE EXTENSION IF NOT EXISTS citext;             -- customers.email
CREATE EXTENSION IF NOT EXISTS pg_trgm;            -- trigram GIN
CREATE EXTENSION IF NOT EXISTS unaccent;           -- search normalisation
CREATE EXTENSION IF NOT EXISTS btree_gin;          -- not yet required; see note
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- optional, needs shared_preload_libraries
```

Phase 0 executed `vector` only; the four contrib extensions were validated structurally. **Migration 0001 must confirm contrib availability on the target Neon instance before proceeding** and fail loudly if absent. `btree_gin` is declared but currently unrequired: no index places a scalar column inside GIN (doc 02, doc 12).

## Migration ordering

Migrations are numbered, forward-only, and applied in order. Each is a logical unit matching one §8 subsection.

| # | Migration | Contents | Depends on |
|---|---|---|---|
| 0001 | `extensions` | the six `CREATE EXTENSION` | - |
| 0002 | `enums` | all 33 `CREATE TYPE ... AS ENUM` | 0001 |
| 0003 | `migration_staging` | `import_batches` + 3 staging tables | 0002 |
| 0004 | `taxonomy_reference` | the 12 tables of §8.5 | 0003 |
| 0005 | `catalog_core` | `gemstones`, `gemstone_stones`, `settings`, `setting_variants`, `setting_compatibility_rules`, `products`, `product_gemstones` + the 3 product CHECK constraints | 0004 |
| 0006 | `catalog_search` | the `gemstones_search_document_fn` function + `gemstones_search_document_trg` trigger + the `gemstones` GIN index | 0005 |
| 0007 | `dyo` | `dyo_configurations`, `dyo_price_snapshots`, `dyo_quotes` | 0005 |
| 0008 | `pricing` | `price_lists`, `price_entries`, `price_model_observations` | 0005 |
| 0009 | `commerce` | 13 commerce tables + `orders` indexes + the **deferred** `dyo_configurations_customer_fk` | 0005, 0007 |
| 0010 | `trust` | 6 certificate tables | 0005, 0007 |
| 0011 | `assets` | `assets`, `asset_variants`, `asset_usages`, `webar_assets`, `ar_handoff_tokens` | 0005, 0003 |
| 0012 | `cms` | `pages`, `page_revisions`, `navigations`, `redirects`, `seo_metadata` | 0011 |
| 0013 | `ai` | 9 AI tables including both HNSW indexes | 0012, 0009, 0010 |
| 0014 | `operations` | `domain_events`, `event_consumers`, `jobs`, `audit_logs`, `webhook_receipts`, `rate_limit_counters`, `feature_flags` | 0002 |
| 0015 | `search_function` | `match_knowledge_chunks` | 0013 |
| 0016 | `rls` | 6 `ENABLE ROW LEVEL SECURITY` + 6 policies | 0009, 0013 |
| 0017 | `trust_view` | `certificate_public` view | 0010 |

### Why 0009 carries a deferred foreign key

`dyo_configurations` is created in 0007 and `customers` in 0009, while `cart_items` and `order_items` (in 0009) reference `dyo_configurations`. Declaring the FK inline in 0007 creates a cycle at block level. Phase 0 proved the FK graph is acyclic once the constraint is added after both endpoints exist:

```sql
ALTER TABLE dyo_configurations
  ADD CONSTRAINT dyo_configurations_customer_fk
  FOREIGN KEY (customer_id) REFERENCES customers(id);
```

This was defect D-05, found by live execution and fixed before lock.

## Constraints

### Enum-backed integrity
31 enum types are used in columns. Every CHECK that mirrors an enum must be omitted: the enum already constrains. The only explicit CHECKs are those expressing cross-column or cross-table invariants.

### Invariant constraints (all nine verified present)

| Constraint | Table | Enforces |
|---|---|---|
| `gemstones_kind_ck` | `gemstones` | SINGLE implies 1 stone, PAIR implies 2 |
| `gemstones_pair_weight_ck` | `gemstones` | a pair has positive total weight |
| `products_composition_ck` | `products` | INV-01 composition by `kind` |
| `products_no_pair_on_non_earrings_ck` | `products` | INV-02 |
| `products_earrings_need_pair_ck` | `products` | INV-03 |
| `dyo_one_stone_ck` | `dyo_configurations` | stone XOR pair XOR neither |
| `dyo_pair_is_earrings_ck` | `dyo_configurations` | INV-02 for configurations |
| `certificates_subject_ck` | `certificates` | at least one subject attached |
| `dyo_configurations_customer_fk` | `dyo_configurations` | referential integrity (deferred, D-05) |

Application code must **not** re-implement these. Tests must prove the database rejects violations, not merely that the application avoids them.

### Uniqueness strategy
Natural keys use a plain unique constraint; conditional uniqueness uses a partial unique index. Two patterns recur:

```sql
-- soft-delete-aware identity
CREATE UNIQUE INDEX ON products (slug) WHERE deleted_at IS NULL;

-- nullable identity
CREATE UNIQUE INDEX ON products (source_url)
  WHERE source_url IS NOT NULL AND deleted_at IS NULL;
```

## Index strategy by access pattern

| Pattern | Index | Rationale |
|---|---|---|
| Product by slug | `products (slug) WHERE deleted_at IS NULL` | storefront hot path |
| Facet filter | `products (variety_id, state)`, `(colour_id, state)`, `(jewellery_type, state)` | facet selectivity drives the plan |
| Price sort | `products (price_amount) WHERE deleted_at IS NULL AND state='ACTIVE'` | partial: only sellable rows sort |
| Stone facet | `gemstones (variety_id, price_amount)`, `(variety_id, total_weight_ct)` | combined filter plus sort |
| Variant lookup | `setting_variants (sku) WHERE deleted_at IS NULL` | DYO and catalogue |
| Variant by metal | `setting_variants (metal_code, state) WHERE deleted_at IS NULL` | metal facet |
| Partial indexes | `WHERE deleted_at IS NULL` / `WHERE state = 'ACTIVE'` | keeps index size proportional to live rows |
| Queue claim | `jobs (queue, state, run_after) WHERE state = 'QUEUED'` | dispatcher hot path |
| Outbox poll | `domain_events (status, available_at) WHERE status = 'PENDING'` | dispatcher hot path |
| Review queue | `certificate_extractions (confidence) WHERE confidence < 0.85` | partial on the low-confidence tail |
| Handoff queue | `conversations (state, updated_at DESC) WHERE state <> 'CLOSED'` | partial on open conversations |

## Full-text and vector

```sql
-- generated/maintained search documents
CREATE INDEX ON gemstones USING gin (to_tsvector('english', search_document));
CREATE INDEX ON knowledge_chunks USING gin (to_tsvector('english', content));
CREATE INDEX ON knowledge_documents USING gin (to_tsvector('english', name));

-- trigram fallback
CREATE INDEX ... USING gin (gem_ref gin_trgm_ops);
CREATE INDEX ... USING gin (title  gin_trgm_ops);

-- vectors
CREATE INDEX ON knowledge_chunks   USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE INDEX ON product_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
```

`gemstones.search_document` is materialised because **PostgreSQL forbids subqueries in index expressions** (Phase 0 defect D-03). It is maintained by `gemstones_search_document_fn` through `gemstones_search_document_trg`, a `BEFORE INSERT OR UPDATE` row trigger that resolves variety, colour, intensity, origin, treatment and clarity labels. The trigger was functionally tested in Phase 0.

Dimension is fixed at 1024 (ADR-018). A model change is a versioned re-embed, not a migration.

## Row-Level Security

Six tables, six policies. Enabling RLS without a policy denies all rows, so the pairing is asserted by test (Phase 0 defect D-07).

| Table | Policy | Predicate |
|---|---|---|
| `customers` | `customers_own` | `identity_user_id = current_setting('app.user_subject', true)` |
| `addresses` | `addresses_own` | `customer_id IN (SELECT id FROM customers WHERE identity_user_id = ...)` |
| `carts` | `carts_own` | owned by customer **or** matching `app.anonymous_session_id` |
| `orders` | `orders_own` | `customer_id IN (owned)` |
| `conversations` | `conversations_own` | owned **or** `app.staff = 'true'` |
| `messages` | `messages_own` | via owned `conversations` |

Both `app.*` settings are set by the application service **after** authorization, never from client input. Admin uses a separate `BYPASSRLS` role; every bypass is written to `audit_logs`.

## Transaction boundaries

| Operation | Scope | Rule |
|---|---|---|
| Command | One transaction | State change plus `domain_events` insert in the same transaction (ADR-020) |
| Repository | None | Repositories never open transactions |
| Route handler | None | Handlers never open transactions |
| Job | One transaction | One job, one transaction; emits no business events |
| Batch import | Chunked | Per-chunk transactions with resumable cursors |
| Outbox dispatch | One transaction | Mark `PENDING` to `PUBLISHED` with `SKIP LOCKED` |

`packages/db` exports a single `withTransaction` helper; nested use is rejected at runtime.

## Repository / query layer

Drizzle, one repository per aggregate, in `packages/db/src/repositories/`.

```ts
// pattern, applied to every repository
export const productRepository = {
  async findBySlug(slug: string, tx: Tx): Promise<Product | null>,
  async search(input: SearchInput, tx: Tx): Promise<SearchPage>,
  async facetCounts(input: FacetInput, tx: Tx): Promise<FacetCounts>,
};
```

Rules:
- Every method takes an explicit transaction handle. There is no ambient connection acquisition in a repository.
- Row-to-domain mapping lives in `mappers/`, never inline.
- Raw SQL is permitted only where Drizzle cannot express the query (trigram, `ts_rank_cd`, HNSW operators, the LATERAL in `certificate_public`). Such queries are marked and reviewed.
- **No repository method may compute a price, evaluate compatibility, or make an authorization decision.** Those are domain concerns (doc 05).

## Validation rules

1. CI asserts, against a freshly migrated database: 74 tables, 33 enums, 94 FKs, 591 CHECK, 263 indexes, the 9 named invariants, 6 RLS tables with 6 policies, 2 vector columns, 2 HNSW indexes, 1 trigger, 2 functions, 1 view.
2. CI asserts the FK graph is acyclic and fully topologically sortable.
3. CI diffs the Drizzle schema against the migration-generated schema; drift fails.
4. Migration 0001 fails loudly if any required extension is unavailable.

## Error handling

| SQLSTATE | Meaning | Application response |
|---|---|---|
| `23505` unique violation | Identity conflict | 409 `VERSION_CONFLICT` or idempotent replay |
| `23503` FK violation | Missing parent | 422 domain error, never raw SQL text |
| `23514` CHECK violation | Invariant breach | 422 with the violated invariant named |
| `40001` / `40P01` | Serialisation / deadlock | Retry with jitter, max 3 |
| `57014` | Statement timeout | Retry once, then 503 |
| `42501` | Insufficient privilege | 403, and alert if unexpected |

Raw SQL error text is never returned to a client.

## Security boundaries

- The application role receives `SELECT, INSERT, UPDATE` on business tables and **no** `UPDATE`/`DELETE` on `audit_logs` or `domain_events`.
- `customers.email` is `CITEXT`; case-insensitive uniqueness is enforced by the type, not by application logic.
- Certificate, report and appraisal documents are private; public reads pass only through `certificate_public`, which withholds values below 0.50 confidence.
- Migration credentials and the application credential differ.

## Observability

- `pg_stat_statements` for slow queries (extension optional).
- Per-repository span attributes: table, operation, row count. Never row content.
- Metrics: pool utilisation, pool wait, slow query count, transaction duration histogram, deadlock count.

## Testing requirements

| Test | Proves |
|---|---|
| Schema fidelity | Object counts and constraint names match the locked schema |
| FK acyclicity | Full topological sort succeeds |
| Invariant bite tests | Each of the 9 constraints rejects a violating insert |
| RLS cross-customer | Customer A cannot read B's rows, per table |
| RLS completeness | No RLS-enabled table lacks a policy |
| Trigger behaviour | `search_document` populated on insert and update |
| View behaviour | `certificate_public` withholds low-confidence values |
| Transaction nesting | Nested `withTransaction` is rejected |
| Migration idempotency | Re-running all migrations is a no-op |
| HNSW sanity | A vector insert and a nearest-neighbour query succeed |

## Failure modes

| Failure | Detection | Response |
|---|---|---|
| Extension missing on target | Migration 0001 | Fail loudly before any table is created |
| Invariant violation in production | 422 + metric | Never reachable by design; alert if it fires |
| Trigger absent after migration | CI introspection test | Block release |
| Drift between Drizzle and DB | CI schema diff | Block merge |
| Slow query from a missing index | `pg_stat_statements` | Add a migration; never a hotfix |

## Implementation constraints

1. **The schema is frozen.** Any change requires an ADR that supersedes or extends Source of Truth section 8, plus a full re-validation against PostgreSQL 16.
2. Migrations are forward-only, expand-then-contract. A destructive change ships one release after the code stops using the column.
3. Every migration must apply on an empty database and be re-runnable without effect.
4. `citext`, `pg_trgm`, `unaccent`, `btree_gin` availability is confirmed on Neon before migration 0001 completes.

## Evidence status

`[INFERRED]` implementation structure. The schema itself is `[OBSERVED]`-validated: every table, column, type, constraint, index, policy, trigger, function and view listed here was created and introspected on a live PostgreSQL 16.2 instance during Phase 0, and the 11 defects found and fixed are recorded in `PROJECT_SOURCE_OF_TRUTH.md` section 35.1. The one number corrected during validation is the setting-variant count, **10,349**, not 9,484.