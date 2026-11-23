/**
 * packages/db — the authoritative schema-fidelity expectations.
 *
 * Phase 1 Task 5 established this mirror by transcribing the authoritative,
 * validated schema (PROJECT_SOURCE_OF_TRUTH.md section 8; technical_design/04)
 * as reproduced by the Task 4 ordered migrations, introspected on both
 * sanctioned PostgreSQL 16.15 dev targets (local container and the Neon
 * "Maihan Gems Dev" project), where the two introspections matched exactly.
 * The 2026-11-23 measurement below is the current source of the numbers.
 *
 * The aggregate counts are MEASURED, never reasoned: every number in
 * EXPECTED_COUNTS, and every name in EXPECTED_TABLES / EXPECTED_FOREIGN_KEYS,
 * was read out of the live schema of the Neon `maihan_dev` database
 * (PostgreSQL 18.7) on 2026-11-23 with the shared introspection in
 * packages/db/src/introspect.ts, after migrations 0001-0022 had been applied by
 * packages/db's own runner (`pnpm --filter @maihan/db run migrate`):
 *   83 tables, 33 enums, 83 primary keys, 108 foreign keys, 657 CHECK-class
 *   constraints, 294 indexes, 9 named invariant constraints, 6 RLS tables with
 *   6 policies and 0 policy-less tables, 2 HNSW indexes, 1 trigger, 1 view,
 *   2 functions.
 *
 * The 657 CHECK class reconciles as 40 pg_constraint CHECK entries plus 617
 * NOT NULL column constraints (PostgreSQL keeps NOT NULL in pg_attribute, not
 * pg_constraint). Both components are asserted; the counting semantics are the
 * ones established by packages/db/src/introspect.ts in Task 4.
 *
 * The locked baseline (AGENTS.md section 7; INITIAL_IMPLEMENTATION_PLAN.md
 * section 36 task 5) is 74 tables / 94 FKs / 591 CHECK / 263 indexes. The
 * measured totals sit above it by the approved post-0018 expansions, each of
 * which has an accepted ADR or a recorded client instruction, and the measured
 * delta is accounted for object by object:
 *   0018 CMS review ledger     page_review_state
 *   0019 identity (ADR-027)    users, sessions, password_reset_tokens
 *   0020 vendors (ADR-026)     vendors, vendor_members, vendor_ledger,
 *                              order_vendor_allocations, the nullable
 *                              vendor_id columns on products and gemstones
 *   0021 customer auth         email_verification_tokens
 *   0022 INV-08 review state   four products columns + one partial index
 *                              (ADR-024 shape applied on the client
 *                              instruction of 2026-11-23; ADR-024 itself
 *                              remains Proposed)
 * No object outside those five migrations is present in the measurement.
 *
 * Extension VERSIONS are deliberately not asserted: they are a platform
 * property, not schema drift. The 2026-11-23 measurement of `maihan_dev`
 * reported pgvector 0.8.7, and the architecture only requires >= 0.6 (doc 02),
 * so a platform upgrade must never fail this assertion. Extension NAMES are
 * asserted because the schema cannot exist without them.
 *
 * A drift in any of these expectations means a migration changed the locked
 * schema — which requires an ADR that supersedes or extends Source of Truth
 * section 8 BEFORE the expectation here may change (doc 04, "Implementation
 * constraints"). This file is not the schema's master: it is the fidelity
 * mirror of the authoritative DDL. Never "fix" a failing assertion by editing
 * this file; fix the migration or open the ADR.
 */

/** The 9 named invariant constraints (AGENTS.md section 7; doc 04). */
export const EXPECTED_NAMED_INVARIANTS: readonly string[] = [
  'certificates_subject_ck',
  'dyo_configurations_customer_fk',
  'dyo_one_stone_ck',
  'dyo_pair_is_earrings_ck',
  'gemstones_kind_ck',
  'gemstones_pair_weight_ck',
  'products_composition_ck',
  'products_earrings_need_pair_ck',
  'products_no_pair_on_non_earrings_ck'
];

/** Required extension names. Versions are platform properties and are not asserted. */
export const EXPECTED_EXTENSIONS: readonly string[] = [
  'vector',
  'citext',
  'pg_trgm',
  'unaccent',
  'btree_gin',
  'pg_stat_statements'
];

/** The 83 public tables of the locked schema plus its approved expansions, exact names. */
export const EXPECTED_TABLES: readonly string[] = [
  'addresses',
  'ai_evaluations',
  'ai_interactions',
  'ar_handoff_tokens',
  'asset_usages',
  'asset_variants',
  'assets',
  'audit_logs',
  'cart_items',
  'carts',
  'certificate_anomalies',
  'certificate_extractions',
  'certificate_ocr_runs',
  'certificate_reviews',
  'certificates',
  'clarities',
  'clarity_labels',
  'colour_intensities',
  'conversations',
  'customer_profiles',
  'customers',
  'discounts',
  'domain_events',
  'dyo_configurations',
  'dyo_price_snapshots',
  'dyo_quotes',
  // 0021 customer auth.
  'email_verification_tokens',
  'event_consumers',
  'feature_flags',
  'fulfillments',
  'gemstone_colours',
  'gemstone_origins',
  'gemstone_species',
  'gemstone_stones',
  'gemstone_varieties',
  'gemstones',
  'guardrail_events',
  'import_batches',
  'jewellery_types',
  'jobs',
  'knowledge_chunks',
  'knowledge_documents',
  'messages',
  'metals',
  'navigations',
  'order_events',
  'order_items',
  // 0020 vendors: per-vendor split of one order (ADR-026).
  'order_vendor_allocations',
  'orders',
  'page_revisions',
  'pages',
  // 0019 identity: password reset reuses one token discipline (ADR-027).
  'password_reset_tokens',
  'payments',
  'price_entries',
  'price_lists',
  'price_model_observations',
  'product_addons',
  'product_embeddings',
  'product_gemstones',
  'products',
  'rate_limit_counters',
  'redirects',
  'refunds',
  'seo_metadata',
  // 0019 identity: opaque hashed sessions for admin and vendor users (ADR-027).
  'sessions',
  'setting_compatibility_rules',
  'setting_styles',
  'setting_variants',
  'settings',
  'staging_conflicts',
  'staging_parsed_urls',
  'staging_source_pages',
  'tool_calls',
  'treatment_labels',
  'treatments',
  // 0019 identity + 0020 vendors (ADR-026, ADR-027).
  'users',
  'vendor_ledger',
  'vendor_members',
  'vendors',
  'verification_events',
  'webar_assets',
  'webhook_receipts',
  // Phase 12 Stage B expansion (0018): the CMS review ledger.
  'page_review_state'
];

/** The 33 enum types with their exact member sets. */
export const EXPECTED_ENUMS: readonly { name: string; members: readonly string[] }[] = [
  { name: 'ai_provider', members: ['VERCEL_AI_GATEWAY', 'OPENROUTER', 'AZURE_OPENAI', 'ANTHROPIC', 'LOCAL'] },
  { name: 'asset_processing_state', members: ['PENDING', 'FETCHING', 'VALIDATING', 'PROCESSING', 'READY', 'FAILED', 'SKIPPED'] },
  { name: 'cart_state', members: ['ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED'] },
  { name: 'compatibility_result', members: ['COMPATIBLE', 'INCOMPATIBLE', 'UNKNOWN', 'REQUIRES_REVIEW'] },
  { name: 'content_block_type', members: ['HERO', 'RICH_TEXT', 'IMAGE', 'IMAGE_GALLERY', 'PRODUCT_COLLECTION', 'GEMSTONE_COLLECTION', 'CATEGORY_GRID', 'FAQ', 'BUYING_GUIDE', 'CERTIFICATE_GUIDE', 'COMPARISON_TABLE', 'VIDEO', 'CTA', 'BANNER', 'TESTIMONIAL', 'SHOWROOM_CTA', 'VEDIC_CTA', 'ASTROLOGY_CONTENT', 'CUSTOM_DESIGN_CTA', 'CONTACT_CTA'] },
  { name: 'conversation_channel', members: ['WEB', 'WHATSAPP', 'ADMIN', 'API'] },
  { name: 'conversation_state', members: ['OPEN', 'AWAITING_HUMAN', 'HANDED_OFF', 'RESOLVED', 'CLOSED'] },
  { name: 'cutting_style', members: ['FACETED', 'CABOCHON', 'OTHER'] },
  { name: 'discount_type', members: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'FINANCING', 'PROTECTION_PLAN'] },
  { name: 'document_kind', members: ['CERTIFICATE', 'GEM_REPORT', 'APPRAISAL', 'INVOICE', 'POLICY', 'OTHER'] },
  { name: 'domain_event_status', members: ['PENDING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER'] },
  { name: 'dyo_state', members: ['DRAFT', 'VALIDATING', 'VALID', 'INCOMPATIBLE', 'PRICED', 'ADDED_TO_CART', 'ORDERED', 'EXPIRED'] },
  { name: 'evidence_status', members: ['OBSERVED', 'EXTRACTED', 'PATTERN', 'INFERRED', 'UNKNOWN'] },
  { name: 'gemstone_kind', members: ['SINGLE', 'PAIR'] },
  { name: 'handoff_reason', members: ['CUSTOMER_REQUEST', 'LOW_CONFIDENCE', 'CERTIFICATE_ANOMALY', 'COMPLEX_DYO', 'HIGH_VALUE', 'SENSITIVE_OPERATION', 'POLICY_ESCALATION', 'DISSATISFACTION', 'NO_INFORMATION'] },
  { name: 'jewellery_type', members: ['RING', 'EARRINGS', 'NECKLACE', 'PENDANT', 'BRACELET', 'BROOCH', 'CUFFLINKS', 'CHARM'] },
  { name: 'job_state', members: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'] },
  { name: 'media_kind', members: ['IMAGE', 'LIFESTYLE', 'VIDEO_360', 'VIDEO', 'MODEL_3D', 'CERTIFICATE', 'REPORT', 'APPRAISAL', 'DOCUMENT', 'OTHER'] },
  { name: 'media_role', members: ['PRIMARY', 'GALLERY', 'THUMBNAIL', 'LOGO', 'PACKAGING', 'DETAIL', 'PRONG', 'CERTIFICATE', 'REPORT', 'APPRAISAL', 'PREVIEW_RENDER', 'SCENE_3D', 'OTHER'] },
  { name: 'message_role', members: ['USER', 'ASSISTANT', 'TOOL', 'SYSTEM', 'HUMAN_AGENT'] },
  { name: 'metal_code', members: ['W10', 'Y10', 'R10', 'W14', 'Y14', 'R14', 'W18', 'Y18', 'R18', 'PT', 'SL', 'YW14', 'YW18', 'WY14', 'WY18'] },
  { name: 'order_state', members: ['PENDING_PAYMENT', 'PAID', 'IN_FULFILLMENT', 'FULFILLED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
  { name: 'payment_state', members: ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'VOIDED', 'PARTIALLY_REFUNDED', 'REFUNDED'] },
  { name: 'product_kind', members: ['CONFIGURED', 'READY_MADE', 'LOOSE_STONE', 'STONE_PAIR', 'SETTING_ONLY'] },
  { name: 'product_state', members: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'SOLD_OUT', 'DISCONTINUED'] },
  { name: 'provenance_kind', members: ['SOURCE_CRAWL', 'SOURCE_DERIVED', 'DERIVED_PARSER', 'ADMIN', 'SYSTEM', 'AI_SUGGESTED'] },
  { name: 'record_state', members: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
  { name: 'refund_state', members: ['REQUESTED', 'APPROVED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REJECTED'] },
  { name: 'review_state', members: ['UNREVIEWED', 'PENDING', 'APPROVED', 'REJECTED'] },
  { name: 'seo_entity_kind', members: ['PRODUCT', 'CATEGORY', 'VARIETY', 'COLLECTION', 'PAGE', 'ARTICLE', 'ORGANIZATION'] },
  { name: 'stone_shape', members: ['OVAL', 'ROUND', 'CUSHION', 'EMERALD_CUT', 'PEAR', 'RADIANT', 'PRINCESS', 'HEART', 'TRILLION', 'ASSCHER_OCTAGON', 'BAGUETTE', 'MARQUISE', 'OTHER'] },
  { name: 'treatment_code', members: ['NO_ENHANCEMENT', 'HEAT_TREATED', 'VAPOR_INFUSED_COATING', 'IRRADIATION', 'FRACTURE_FILL', 'OIL', 'OTHER', 'UNKNOWN'] },
  { name: 'verification_status', members: ['UNVERIFIED', 'EXTRACTED', 'CROSS_CHECKED', 'VERIFIED', 'REJECTED'] },
];

/** The 108 foreign-key constraint names, exact names as measured. */
export const EXPECTED_FOREIGN_KEYS: readonly string[] = [
  'addresses_customer_id_fkey',
  'ai_interactions_conversation_id_fkey',
  'ar_handoff_tokens_product_id_fkey',
  'ar_handoff_tokens_webar_asset_id_fkey',
  'asset_usages_asset_id_fkey',
  'asset_variants_asset_id_fkey',
  'assets_import_batch_id_fkey',
  'cart_items_cart_id_fkey',
  'cart_items_configuration_id_fkey',
  'cart_items_price_snapshot_id_fkey',
  'cart_items_product_id_fkey',
  'carts_customer_id_fkey',
  'certificate_anomalies_certificate_id_fkey',
  'certificate_extractions_certificate_id_fkey',
  'certificate_ocr_runs_certificate_id_fkey',
  'certificate_reviews_certificate_id_fkey',
  'certificates_configuration_id_fkey',
  'certificates_gemstone_id_fkey',
  'certificates_product_id_fkey',
  'clarity_labels_clarity_id_fkey',
  'conversations_customer_id_fkey',
  'customer_profiles_customer_id_fkey',
  'dyo_configurations_customer_fk',
  'dyo_configurations_gemstone_id_fkey',
  'dyo_configurations_gemstone_pair_id_fkey',
  'dyo_configurations_setting_id_fkey',
  'dyo_configurations_setting_variant_id_fkey',
  'dyo_price_snapshots_configuration_id_fkey',
  'dyo_quotes_configuration_id_fkey',
  'dyo_quotes_price_snapshot_id_fkey',
  'email_verification_tokens_user_id_fkey',
  'event_consumers_event_id_fkey',
  'fulfillments_order_id_fkey',
  'fulfillments_order_item_id_fkey',
  'gemstone_colours_parent_id_fkey',
  'gemstone_stones_gemstone_id_fkey',
  'gemstone_varieties_species_id_fkey',
  'gemstones_clarity_id_fkey',
  'gemstones_colour_id_fkey',
  'gemstones_import_batch_id_fkey',
  'gemstones_intensity_id_fkey',
  'gemstones_origin_id_fkey',
  'gemstones_species_id_fkey',
  'gemstones_treatment_id_fkey',
  'gemstones_variety_id_fkey',
  'gemstones_vendor_id_fkey',
  'guardrail_events_conversation_id_fkey',
  'guardrail_events_interaction_id_fkey',
  'knowledge_chunks_document_id_fkey',
  'knowledge_documents_source_page_id_fkey',
  'knowledge_documents_variety_id_fkey',
  'messages_conversation_id_fkey',
  'order_events_order_id_fkey',
  'page_review_state_revision_id_fkey',
  'order_items_configuration_id_fkey',
  'order_items_order_id_fkey',
  'order_items_product_id_fkey',
  'order_vendor_allocations_order_id_fkey',
  'order_vendor_allocations_vendor_id_fkey',
  'orders_customer_id_fkey',
  'page_revisions_page_id_fkey',
  'pages_hero_asset_id_fkey',
  'password_reset_tokens_user_id_fkey',
  'payments_order_id_fkey',
  'price_entries_price_list_id_fkey',
  'price_model_observations_import_batch_id_fkey',
  'price_model_observations_product_id_fkey',
  'product_addons_product_id_fkey',
  'product_embeddings_product_id_fkey',
  'product_gemstones_gemstone_id_fkey',
  'product_gemstones_product_id_fkey',
  'products_colour_id_fkey',
  'products_gemstone_id_fkey',
  'products_gemstone_pair_id_fkey',
  'products_import_batch_id_fkey',
  'products_reviewed_by_fkey',
  'products_setting_variant_id_fkey',
  'products_variety_id_fkey',
  'products_vendor_id_fkey',
  'refunds_order_id_fkey',
  'refunds_payment_id_fkey',
  'sessions_user_id_fkey',
  'setting_compatibility_rules_colour_id_fkey',
  'setting_compatibility_rules_forbids_treatment_id_fkey',
  'setting_compatibility_rules_requires_treatment_id_fkey',
  'setting_compatibility_rules_setting_id_fkey',
  'setting_compatibility_rules_variety_id_fkey',
  'setting_variants_import_batch_id_fkey',
  'setting_variants_setting_id_fkey',
  'settings_import_batch_id_fkey',
  'settings_style_id_fkey',
  'staging_conflicts_import_batch_id_fkey',
  'staging_parsed_urls_import_batch_id_fkey',
  'staging_source_pages_import_batch_id_fkey',
  'tool_calls_conversation_id_fkey',
  'tool_calls_message_id_fkey',
  'treatment_labels_treatment_id_fkey',
  // 0020 vendors (ADR-026): the double-entry ledger and membership FKs.
  'vendor_ledger_order_id_fkey',
  'vendor_ledger_vendor_id_fkey',
  'vendor_members_user_id_fkey',
  'vendor_members_vendor_id_fkey',
  'vendors_approved_by_fkey',
  'verification_events_certificate_id_fkey',
  'verification_events_gemstone_id_fkey',
  'verification_events_product_id_fkey',
  'webar_assets_asset_id_fkey',
  'webar_assets_product_id_fkey',
  'webar_assets_setting_variant_id_fkey'
];

/** The 6 RLS-enabled tables and their exact policy names (doc 04; SoT 8.16). */
export const EXPECTED_RLS_POLICIES: readonly { table: string; policy: string }[] = [
  { table: 'addresses', policy: 'addresses_own' },
  { table: 'carts', policy: 'carts_own' },
  { table: 'conversations', policy: 'conversations_own' },
  { table: 'customers', policy: 'customers_own' },
  { table: 'messages', policy: 'messages_own' },
  { table: 'orders', policy: 'orders_own' }
];

/** The 2 HNSW indexes with their exact catalog definitions (ADR-018; doc 04). */
export const EXPECTED_HNSW_INDEXES: readonly { table: string; name: string; definition: string }[] = [
  { table: 'knowledge_chunks', name: 'knowledge_chunks_embedding_idx', definition: "CREATE INDEX knowledge_chunks_embedding_idx ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64')" },
  { table: 'product_embeddings', name: 'product_embeddings_embedding_idx', definition: "CREATE INDEX product_embeddings_embedding_idx ON public.product_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64')" }
];

/** The only user-defined trigger of the locked schema (doc 04, migration 0006). */
export const EXPECTED_TRIGGERS: readonly { table: string; name: string; function: string }[] = [
  { table: 'gemstones', name: 'gemstones_search_document_trg', function: 'gemstones_search_document_fn' },
];

/** The 2 user-defined functions (SoT 8.6 search document, SoT 8.15 hybrid search). */
export const EXPECTED_FUNCTIONS: readonly string[] = ['gemstones_search_document_fn', 'match_knowledge_chunks'];

/** The single user-defined view (SoT 18.7; the INV-07 read model). */
export const EXPECTED_VIEWS: readonly string[] = ['certificate_public'];

/** The 2 vector(1024) columns (ADR-018). */
export const EXPECTED_VECTOR_COLUMNS: readonly string[] = ['knowledge_chunks.embedding', 'product_embeddings.embedding'];

/**
 * 0022 — the INV-08 product review decision, as explicit columns (ADR-024).
 * Mirrors `migrations/0022_product_review_state.sql`: the decision, its note,
 * the reviewer (`users.id`) and the decision timestamp. All four are nullable;
 * NULL means "no decision recorded".
 */
export const EXPECTED_PRODUCT_REVIEW_COLUMNS: readonly string[] = [
  'products.review_state',
  'products.review_note',
  'products.reviewed_by',
  'products.reviewed_at'
];

/**
 * The partial index 0022 adds for the review queue and the INV-08 gate.
 * Asserted by name and by the two fragments that make it the right index:
 * it indexes the decision column and excludes the undecided majority.
 */
export const EXPECTED_PRODUCT_REVIEW_INDEX = {
  name: 'products_review_state_idx',
  definition_includes: ['(review_state)', 'WHERE (review_state IS NOT NULL)']
} as const;

/**
 * The increment 0022 contributes to EXPECTED_COUNTS, derived from the DDL and
 * confirmed by the 2026-11-23 measurement (the measured total already includes
 * it; this object is the cross-check, not an instruction to add again):
 *
 *   foreign_key        +1  `reviewed_by UUID REFERENCES users(id)` creates
 *                          products_reviewed_by_fkey
 *   check              +1  the inline CHECK on review_state creates
 *                          products_review_state_check
 *   check_class_total  +1  CHECK + NOT NULL, and no new NOT NULL column
 *   not_null_columns    0  all four columns are nullable by design
 *   indexes            +1  products_review_state_idx (partial, non-unique)
 *   tables,enums,primary_key,unique,hnsw,vector_columns,triggers,
 *   functions,views,rls_*: 0 (no table, PK, unique, trigger, function, view or
 *                          RLS change)
 */
export const EXPECTED_0022_COUNT_DELTA = {
  foreign_key: 1,
  check: 1,
  check_class_total: 1,
  not_null_columns: 0,
  indexes: 1,
  tables: 0,
  primary_key: 0,
  unique: 0,
  enums: 0
} as const;

/**
 * The measured aggregate totals. Source: the shared introspection in
 * packages/db/src/introspect.ts, run against Neon `maihan_dev`
 * (PostgreSQL 18.7) on 2026-11-23 with migrations 0001-0022 applied. Every
 * number below is transcribed from that report; none is derived by arithmetic.
 *
 * `check` counts pg_constraint CHECK entries and `not_null_columns` counts
 * pg_attribute NOT NULL columns; their sum is `check_class_total` (40 + 617 =
 * 657), which is the "CHECK" class the architecture counts.
 */
export const EXPECTED_COUNTS = {
  tables: 83,
  enums: 33,
  primary_key: 83,
  foreign_key: 108,
  unique: 66,
  check: 40,
  not_null_columns: 617,
  /** check + not_null_columns: 40 + 617 = 657. */
  check_class_total: 657,
  indexes: 294,
  hnsw: 2,
  vector_columns: 2,
  triggers: 1,
  functions: 2,
  views: 1,
  rls_enabled_tables: 6,
  rls_policies: 6,
  rls_tables_without_policy: 0,
  not_valid_foreign_key: 0,
} as const;
