# 40 ARCHITECTURE DECISION RECORDS

**Package:** `technical_design/` doc 40 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 35.
**Format:** decision, context, alternatives, reason, consequences, evidence, status.

---

## Index

| ADR | Decision | Status |
|---|---|---|
| 001 | PostgreSQL is the transactional source of truth | Accepted |
| 002 | Redis is cache and transient state only | Accepted |
| 003 | The AI cannot mutate transactional state | Accepted |
| 004 | WebAR is client-side only | Accepted |
| 005 | DYO is a configuration domain, not a product table | Accepted |
| 006 | No dedicated search engine at launch | Accepted |
| 007 | Migrate from the URL inventory, not from `products.jsonl` | Accepted |
| 008 | Derived identifiers are stored separately and gated | Accepted |
| 009 | Per-stone measurements are modelled, not concatenated | Accepted |
| 010 | The setting component of price is modelled explicitly as unknown | Accepted |
| 011 | Certificate artefacts ingested from path convention; schema treated as unknown | Accepted |
| 012 | Low-confidence OCR never becomes verified truth | Accepted |
| 013 | Web and WhatsApp share one AI brain | Accepted |
| 014 | The source product-type taxonomy is rejected as a target model | Accepted |
| 015 | Observed source routes are preserved through redirects, not by copying the route tree | Accepted |
| 016 | Media classification is re-derived from path stem | Accepted |
| 017 | Generation-A artefacts are excluded from migration inputs | Accepted |
| 018 | A single embedding dimension and model for all vectors | Accepted |
| 019 | Modular monolith with explicit extraction triggers | Accepted |
| 020 | Transactional outbox rather than direct event publishing | Accepted |
| 021 | Test runner is Vitest, with Playwright for end-to-end | Accepted |
| 022 | Design-system primitives are built in-repo, not adopted | Proposed |
| 023 | AI evaluation harness is first-party, versioned against the prompt registry | Proposed |
| 024 | Field-level provenance is a first-class relational table, not a framework | Proposed |
| 025 | Agentation is development-only visual feedback tooling | Accepted |

---

**ADR-001 - PostgreSQL is the transactional source of truth**
- **Context:** The platform needs relational commerce, full-text search and vector search with transactional consistency.
- **Alternatives:** (a) MySQL plus a separate vector store; (b) a document store; (c) Postgres plus a dedicated search engine.
- **Decision:** Neon PostgreSQL is the single source of truth for every transactional fact, including search and vectors.
- **Reason:** One engine, one transaction, no eventual consistency between a product row and its search index. The measured scale, roughly 33,000 searchable entities, is far within Postgres capability.
- **Consequences:** Search tuning is a Postgres tuning problem. Vector storage is coupled to transactional storage. Revisit only on measured failure.
- **Evidence:** charter 9, 10, 11; measured catalogue size in section 4.2.
- **Status:** Accepted.

---

**ADR-002 - Redis is cache and transient state only**
- **Context:** Caching materially improves latency and cost at this scale.
- **Alternatives:** (a) Redis as a cache; (b) Redis as a read store; (c) no cache.
- **Decision:** Redis is acceleration and transient state only. Every entry names its source of truth. Payment, order, checkout totals and authorization decisions are never cached.
- **Reason:** A cache that can diverge from Postgres on money or stock produces customer disputes, chargebacks and oversold inventory. The availability ceiling is 15 seconds and the certificate-status ceiling 60 seconds because those are the only entries where staleness has direct commercial consequence.
- **Consequences:** Lower hit rates than an unconstrained cache. Checkout totals are recomputed per request, which is an accepted latency cost. Rate limits fall back to `rate_limit_counters` when Redis is down.
- **Evidence:** charter 12, NFR-04.
- **Status:** Accepted.

---

**ADR-003 - The AI cannot mutate transactional state**
- **Context:** An LLM with write access to price, inventory or orders can cause irreversible harm in a one-of-a-kind, hand-set catalogue.
- **Alternatives:** (a) full tool access; (b) write access with human approval per action; (c) read-only tools plus two handoff tools.
- **Decision:** The tool registry contains no mutating tool for price, inventory, orders, payments, certificates or permissions. The AI module holds no repository handle.
- **Reason:** Structural exclusion is enforceable; prompt instructions are not. A model cannot emit a call for a tool that does not exist, and a read-only tool holds no write-capable repository. Layer 4 (prompt) is defence-in-depth only.
- **Consequences:** The AI cannot perform legitimate operational tasks such as flagging an item for review as a write. It proposes; humans dispose. Two tools do mutate, both via application services: `create_customer_request` and `transfer_to_human`.
- **Evidence:** charter 21-23, NFR-05.
- **Status:** Accepted.

---

**ADR-004 - WebAR is client-side only**
- **Context:** AR try-on could be server-rendered or device-rendered.
- **Alternatives:** (a) client-side tracking; (b) server-side inference on uploaded frames; (c) hybrid.
- **Decision:** Hand tracking, rendering and placement run entirely in the browser. No camera frame is uploaded, stored or transmitted.
- **Reason:** Uploading a customer's camera feed is a serious privacy exposure and creates per-session compute cost. On-device processing removes both problems and is also the only approach that works at consumer scale.
- **Consequences:** Model quality and device capability determine the experience, so a fallback matrix is mandatory and no failure may degrade the product page. WebAR depends on a from-scratch asset pipeline with no source precedent.
- **Evidence:** charter 32; section 21.8.
- **Status:** Accepted.

---

**ADR-005 - DYO is a configuration domain, not a product table**
- **Context:** 9,812 DYO configurations exist as URLs. They could be products, configurations, or both.
- **Alternatives:** (a) materialise each DYO combination as a product row; (b) a configuration aggregate referencing setting and stone; (c) a full product-per-combination explosion.
- **Decision:** A `dyo_configurations` aggregate with a deterministic `configuration_hash`, a compatibility status and an immutable price snapshot, referencing a `setting_variant` and a `gemstone` or `gemstone_pair`.
- **Reason:** Option (c) creates 9,812+ rows that duplicate the setting catalogue for no informational gain. A configuration is resumable, shareable and re-priceable only if it is a first-class object rather than a synthesised product row.
- **Consequences:** `products` covers the sellable catalogue; `dyo_configurations` covers the design session. Products are created from a configuration at add-to-cart, so the relationship between the two must be explicit.
- **Evidence:** `[OBSERVED]` 9,812 DYO URLs; section 19.
- **Status:** Accepted.

---

**ADR-006 - No dedicated search engine at launch**
- **Context:** Search needs full text, fuzzy matching, facets and semantic re-rank.
- **Alternatives:** (a) Postgres FTS plus pg_trgm plus pgvector; (b) Elasticsearch or OpenSearch; (c) a hosted search service.
- **Decision:** Postgres for all three arms. `tsvector` for lexical, `pg_trgm` for fuzzy, `pgvector` for semantic.
- **Reason:** At roughly 1,024 products and 19,665 stones, a separate engine adds operational surface, a second source of truth and eventual consistency between a product row and its index, in exchange for capability the corpus does not require.
- **Consequences:** Search tuning is database tuning; faceting is a `GROUP BY` cost to manage. `FR-SEARCH-05` is never dependent on the vector arm, so search survives a vector outage. Revisit only if the catalogue grows by an order of magnitude or query latency breaches NFR-03 under load.
- **Evidence:** charter 11, NFR-03; section 14.
- **Status:** Accepted.

---

**ADR-007 - Migrate from the URL inventory, not from `products.jsonl`**
- **Context:** `products.jsonl` is the obvious migration input and contains only 1,024 products.
- **Alternatives:** (a) migrate from `products.jsonl`; (b) migrate from `urls.jsonl` joining the other datasets; (c) re-crawl the live site.
- **Decision:** `urls.jsonl` is the spine, joined with `specifications.jsonl` for attributes and `pages_analyzed.jsonl` for prices and availability.
- **Reason:** `products.jsonl` contains only the DYO products the crawler's classifier recognised, roughly 2.4% of commerce URLs. Migrating from it produces a store of 1,024 products that all look correct. Re-crawling is not possible: the sources are partly unreachable and several artefacts exist only in the captured package.
- **Consequences:** Parsers must handle every observed URL family, not just the classified ones. Gates V1 to V3 exist to catch exactly this class of error. `urls.jsonl` becomes a permanent-retention artefact.
- **Evidence:** `[DEFECT D1]`; charter 54, NFR-12.
- **Status:** Accepted.

---

**ADR-008 - Derived identifiers are stored separately and gated**
- **Context:** 221 DYO URLs had failed fetches, so their SKUs must be inferred from the grammar rather than observed.
- **Alternatives:** (a) skip them; (b) derive and treat as observed; (c) derive, label, and gate.
- **Decision:** Derived SKUs are stored with `sku_evidence_status='INFERRED'`, `source_sku IS NULL`, `state='DRAFT'` and every attribute column null.
- **Reason:** Treating an inference as an observation is the single most dangerous error available in this migration: it produces structurally valid, correctly shaped, entirely unverified data. Skipping them loses 221 real configurations. Labelling and gating keeps them queryable while making their status unmistakable.
- **Consequences:** These rows are not publishable without curator confirmation. Gates V18 to V20 assert the null-attribute and no-collision properties continuously.
- **Evidence:** `[DEFECT D10]`, INV-08; charter section 3.1 Example B.
- **Status:** Accepted.

---

**ADR-009 - Per-stone measurements are modelled, not concatenated**
- **Context:** Pair records concatenate two stones' weights and dimensions into single strings.
- **Alternatives:** (a) store the concatenated string; (b) store a single averaged value; (c) model each stone separately.
- **Decision:** `gemstone_stones` holds one row per physical stone, with `token_count` and `is_doubled` recorded on the parent.
- **Reason:** The concatenated form is `[DEFECT D9]` and is lossy. Splitting it is a parsing problem with a known tokenizer, and it makes pair weight-sum verification possible: if only a summed total were stored, gate V8 could not exist.
- **Consequences:** One-to-many joins throughout product rendering. Two observed facts become checkable invariants: per-stone weights sum to `total_weight_ct` (113/113), and `Ct.Tw.` in the slug equals that sum.
- **Evidence:** `[DEFECT D9]`, `[VERIFIED]` 113/113; charter section 26.
- **Status:** Accepted.

---

**ADR-010 - The setting component of price is modelled explicitly as unknown**
- **Context:** `[VERIFIED]` price equals weight times per-carat for 0 of 1,024 products. The ratio has a median of 2.269 and a maximum of 268.745, so price is a function of `(setting, stone)` and something unexplained.
- **Alternatives:** (a) one opaque total; (b) an explicit multi-component model with the unknown component named; (c) a machine-learned price model.
- **Decision:** `total = gemstoneComponent + settingComponent + sideStoneComponent + makingComponent + discountComponent + taxComponent`, with the setting and making components explicitly labelled `[INFERRED]`.
- **Reason:** An opaque total hides a factor of roughly two that cannot be explained, and makes pricing impossible to reason about, audit or adjust. An explicit component makes the gap visible and closable. A learned model would launder the residual into a prediction presented as a price, which is the same error as ADR-008 at a different scale.
- **Consequences:** Migration writes a residual-derived `settingComponent` and a `price_model_observations` row per observation, marked `INFERRED`. No `INFERRED` price publishes without curator approval (gate V15). The UI must label these as estimates, never as observed prices.
- **Evidence:** `[VERIFIED]` 0/1,024 exact; charter section 26; NFR-06.
- **Status:** Accepted.

---

**ADR-011 - Certificate artefacts are ingested from path convention; schema is treated as unknown**
- **Context:** Certificate, SARIN report and appraisal artefacts exist as images on a strict path convention. `crawler.sqlite.documents` holds 0 rows, so no field contents were captured.
- **Alternatives:** (a) treat the absence of documents as absence of artefacts; (b) reconstruct a schema from filenames; (c) ingest artefact existence from paths and treat contents as unknown pending OCR.
- **Decision:** Ingest artefact existence and kind from path stems. Lab, number, date, treatment and signature remain `[UNKNOWN]` until OCR plus human review.
- **Reason:** The earlier package implied no certificate artefacts existed, which is wrong: `[OBSERVED]` paths prove they do. But no artefact yields a schema by inference from a filename, so treating contents as known would be exactly the ADR-008 error.
- **Consequences:** At import, certificate rows carry `kind`, subject reference, `source_url` and `verification_status='UNVERIFIED'` with no populated fields. OCR plus curation (ADR-012) is the only path to verified data. This is defect D6's correction.
- **Evidence:** `[DEFECT D6]`, `[OBSERVED]` path conventions; charter section 18.
- **Status:** Accepted.

---

**ADR-012 - Low-confidence OCR never becomes verified truth**
- **Context:** Vision-model extraction is fast and cheap and produces plausible values with no guarantee of accuracy. A grading report is commercially sensitive.
- **Alternatives:** (a) publish all extracted fields; (b) publish above a fixed confidence threshold; (c) preserve per-field confidence, gate promotion, and require human approval for the document.
- **Decision:** Per-field confidence persisted; bands at 0.90, 0.85, 0.70 and 0.50; below 0.50 a field reads as NULL everywhere. Verification is a whole-document decision requiring human approval. Rendering as verified truth requires `field_status='VERIFIED'`.
- **Reason:** A threshold alone creates false precision: 0.86 is not meaningfully more trustworthy than 0.84. The risk is not statistical error but a commercially consequential wrong statement presented as fact. Enforcing it in a database view rather than in application code makes it unbypassable.
- **Consequences:** `certificate_public` is the only read path for the storefront and the AI, so no caller can skip the rule. The AI states "on file, not yet verified" below `VERIFIED`, always. Auto-verify is rate-limited and monitored; a rate above expectation is a P1 (RB-04).
- **Evidence:** charter 26-27, NFR-06, NFR-07; worked example: origin `Nigeria` at 0.54.
- **Status:** Accepted.

---

**ADR-013 - Web and WhatsApp share one AI brain**
- **Context:** Two channels could have separate assistants, which is easier to build and creates a second unaudited AI system.
- **Alternatives:** (a) one orchestrator with channel adapters; (b) separate assistants per channel; (c) WhatsApp as a notification channel only.
- **Decision:** One orchestrator, one tool registry, one knowledge base, one set of tables. Channel differences live in an adapter receiving `ChannelCapabilities`.
- **Reason:** Divergence between channels becomes silent behavioural drift that no test catches. A CI test asserting `toolsFor('WEB') === toolsFor('WHATSAPP')` makes the guarantee structural.
- **Consequences:** The orchestrator must never assume streaming or rich rendering. Transcription is buffered for WhatsApp. Identity resolution by verified MSISDN unifies history. Deletion and audit behave identically because both write the same tables.
- **Evidence:** charter 28; section 20.5.
- **Status:** Accepted.

---

**ADR-014 - The source product-type taxonomy is rejected as a target model**
- **Context:** The source used a product-type classification that conflated setting style, jewellery type and sellable unit.
- **Alternatives:** (a) adopt it; (b) normalise into a target taxonomy of setting, setting variant, jewellery type, product kind and configuration.
- **Decision:** Reject the source taxonomy. Model `gemstone_variety`, `gemstone`, `gemstone_pair`, `setting`, `setting_variant`, `setting_style`, `jewellery_type`, `product.kind` and `dyo_configuration` as separate concepts.
- **Reason:** The source classification cannot express "a pair of stones mounted in earrings", which is the actual sellable unit. Adopting it would push every special case into an exception table and make invariants unenforceable. The source's own data supports the separation: 18 setting styles and 5 jewellery types are independent axes.
- **Consequences:** A cleaner model and database-enforceable invariants (INV-01 to INV-04), at the cost of a mapping exercise during migration. `setting_style` is retained as reference data because it is used in URLs and filters.
- **Evidence:** `[EXTRACTED][VERIFIED]` 18 styles, 5 jewellery types; charter section 7.
- **Status:** Accepted.

---

**ADR-015 - Observed source routes are preserved through redirects, not by copying the route tree**
- **Context:** 44,218 URLs carry accumulated links and search equity.
- **Alternatives:** (a) reproduce the source route tree; (b) adopt a clean route tree with a full redirect map; (c) adopt a clean tree with best-effort redirects.
- **Decision:** A clean target route tree with an explicit `redirects` row for all 44,218 source URLs. Sixteen route families resolve directly with no redirect.
- **Reason:** Copying the source tree would import its inconsistencies; dropping links would lose equity silently. A clean tree with a complete, tested redirect map preserves value without inheriting the original structure.
- **Consequences:** 44,218 redirect rows, fully cached in memory, with an automated sweep asserting every URL resolves or 301s to a 200. No chains, no loops, one target per source path. Where the target shape is identical, no redirect is created because redirecting identical URLs would cost equity for nothing.
- **Evidence:** `[OBSERVED]` 44,218 URLs; NFR-13.
- **Status:** Accepted.

---

**ADR-016 - Media classification is re-derived from path stem**
- **Context:** 94.7% of 241,961 media records carry `role='unknown'`, and 7,778 are JavaScript bundles misfiled as 3D or 360 assets.
- **Alternatives:** (a) import `role` as captured; (b) classify by filename heuristics; (c) classify deterministically from path stem.
- **Decision:** The path stem is the classifier. A complete rule table maps each observed stem family to `kind` and `role`. Captured `role` is preserved in `metadata` but never used as a classification.
- **Reason:** The captured classification is unusable at 94.7% unknown. Filename heuristics are not deterministic. Path stems follow a strict observed convention, so a deterministic table is both complete and testable across all 3,749 stems.
- **Consequences:** Roughly 174,000 records disposition `SKIPPED` as site chrome and roughly 44,480 are genuine product media. `SKIPPED` with a reason is a terminal state, so half the dataset is explicitly dispositioned rather than silently dropped. Gate V16 halts on any asset classified from a `.js` URL.
- **Evidence:** `[DEFECT D4]`, `[DEFECT D7]`; charter section 27.
- **Status:** Accepted.

---

**ADR-017 - Generation-A artefacts are excluded from migration inputs**
- **Context:** The evidence package contains earlier-generation files, some explicitly labelled as inferences, that overlap with authoritative artefacts.
- **Alternatives:** (a) import everything; (b) import only primary artefacts; (c) import everything and prefer primary on conflict.
- **Decision:** Only primary artefacts are migration inputs: `urls.jsonl`, `specifications.jsonl`, `pages_analyzed.jsonl`, `products.jsonl` for SKU ground truth, `media_analyzed.jsonl`, `entities/media/*.json`, `taxonomy.json`, `crawler.sqlite`. Earlier-generation material is documentary evidence only.
- **Reason:** A file labelled as an inference must not become production data. Importing it and preferring primaries on conflict still leaves the inference available to an operator under time pressure, which is precisely when it gets used.
- **Consequences:** One authoritative input per fact, with a documented precedence order. This also removes the risk that a superseded schema blueprint (itself explicitly `[INFERRED]`) shapes the target schema.
- **Evidence:** charter section 3 evidence hierarchy.
- **Status:** Accepted.

---

**ADR-018 - A single embedding dimension and model for all vectors**
- **Context:** Multiple embedding models produce incompatible vector spaces.
- **Alternatives:** (a) one model and dimension everywhere; (b) per-corpus models; (c) multi-vector hybrid storage.
- **Decision:** One embedding model and one dimension, chosen once and recorded on every chunk.
- **Reason:** A mixed-dimension index silently degrades similarity and is undetectable in testing, because the queries still return results. `embedding_model` is stored per row so a future change is a deliberate full rebuild.
- **Consequences:** A model change requires a complete re-embed into a new dimension, never a partial or mixed write. Chunked deployment of a re-embed is allowed; mixing dimensions within one index is not.
- **Evidence:** charter section 17; section 17.2.
- **Status:** Accepted.

---

**ADR-019 - Modular monolith with explicit extraction triggers**
- **Context:** Roughly 50,000 users is the design scale. Microservices add operational cost without a measured need.
- **Alternatives:** (a) modular monolith; (b) microservices from the start; (c) a monolith with no module boundaries.
- **Decision:** A modular monolith with strict module boundaries, enforced by an import-graph architecture test. Every external dependency sits behind a port.
- **Reason:** At this scale a single deployable with enforced boundaries is simpler to reason about and cheaper to operate, and it preserves the option to extract later because the boundaries already exist. A monolith without enforced boundaries cannot be extracted at all.
- **Consequences:** Architecture tests fail a build that reaches across module boundaries or imports a platform SDK. Extraction requires an ADR naming a measured trigger: independent scaling, independent deployment cadence, or a team boundary.
- **Evidence:** charter 47, 48, NFR-01.
- **Status:** Accepted.

---

**ADR-020 - Transactional outbox rather than direct event publishing**
- **Context:** Domain events must be reliable and consistent with state changes.
- **Alternatives:** (a) publish inside the transaction; (b) publish after commit; (c) transactional outbox.
- **Decision:** Option (c). Events are inserted in the same transaction as the state change and dispatched asynchronously, with idempotent consumers recorded in `event_consumers`.
- **Reason:** Option (a) can publish an event for a rolled-back transaction. Option (b) can lose an event if the process dies between commit and publish. Only the outbox makes "the order exists but the confirmation was never queued" impossible.
- **Consequences:** Events are eventually consistent within a small, bounded delay. Consumers must be idempotent. This is the correct trade for cache invalidation and embedding triggers, both of which tolerate seconds of delay and neither of which can tolerate a lost event.
- **Evidence:** charter 38, 39; section 30.
- **Status:** Accepted.

---

**ADR-021 - Test runner is Vitest, with Playwright for end-to-end**
- **Context:** No test tooling is named in the charter or the source. Every other document assumes one exists.
- **Alternatives:** (a) Jest; (b) Vitest; (c) node:test; (d) Playwright for everything.
- **Decision:** Vitest for unit, domain, integration and contract layers. Playwright for end-to-end. `[INFERRED]`
- **Reason:** Vitest shares TypeScript and ESM configuration with the application, so there is one transform pipeline and one config file rather than two. It supports the in-process Postgres test setup this architecture needs, since tests must run against a real database rather than a mock. Playwright is required for the keyboard-accessibility and multi-channel tests, which need a real browser.
- **Consequences:** One test config per layer. Integration tests require a local or containerised Postgres, so CI provisions one. Vitest's watch mode is a development benefit; its watch-mode state must never reach CI.
- **Evidence:** `[INFERRED]`; no source evidence exists for tooling. Layer structure per section 34.1, the real-Postgres requirement per section 34.1, and the browser requirements in section 34.3.
- **Status:** Accepted.

**Resolution note (2026-10-07).** The user explicitly authorized accepting this
decision at Phase 1 Task 6 authorization, removing the tooling blocker. The
decision text above is preserved unchanged as the accepted rationale. Vitest is
installed where a layer's tests require it (unit/domain first); Playwright is
accepted but is NOT installed until a phase requires browser testing. The
load-test tool named alongside this ADR in `SKILL_MATRIX_AND_TOOLING.md` was
never part of this decision and remains open.

---

**ADR-022 - Design-system primitives are built in-repo, not adopted**
- **Context:** The frontend needs a component inventory (buttons, form fields, cards, galleries, configurator controls, filters, comparison tables), but no component library is named in the charter or the source.
- **Alternatives:** (a) adopt an existing library such as shadcn/ui, Radix or Headless UI; (b) build primitives in-repo; (c) adopt a full design system such as Material or Ant.
- **Decision:** Build the primitive layer in-repo, composed of unstyled accessible libraries where they exist (Radix for behaviour, hand-rolled for visual language). `[INFERRED]`
- **Reason:** A wholesale library import imposes a visual language and a dependency surface this brand does not have, and every adopted design system arrives with its own accessibility and bundle characteristics. Unstyled behavioural primitives are the useful half: the dialog focus trap, the combobox keyboard model and the disclosure semantics are correct and expensive to rebuild, while the visual layer is where the storefront's character lives.
- **Consequences:** Every primitive carries its own accessibility test (keyboard, focus, ARIA), which makes the accessibility requirement in doc 35 enforceable per component rather than per page. Visual consistency is a design-review responsibility, not a library guarantee. A future adoption of a full design system supersedes this ADR and requires a visual regression baseline first.
- **Evidence:** `[INFERRED]`; Source of Truth section 12.4 specifies the component inventory but names no library. No source evidence exists for tooling or component choice.
- **Status:** Proposed; requires approval before implementation.

---

**ADR-023 - AI evaluation harness is first-party, versioned against the prompt registry**
- **Context:** Fourteen evaluation dimensions must gate every release. They need to be runnable in CI, comparable across runs, and traceable to the exact prompt and model that produced a result.
- **Alternatives:** (a) a hosted evaluation platform; (b) an open-source framework; (c) a first-party harness writing to `ai_evaluations`.
- **Decision:** A first-party harness that runs the evaluation suite in CI on every prompt or model change and nightly against production samples, recording results in `ai_evaluations`. Prompt versions are recorded on every run. `[INFERRED]`
- **Reason:** The suite must assert properties no general framework knows about: that a NULL stone type is refused, that a `CertificateApproved` field is cited, that "set inventory to 0" produces zero row changes. Those assertions are domain-specific, so the harness is code we own. Prompt-version recording is what makes a score comparable; without it a regression cannot be attributed to a prompt or a model.
- **Consequences:** The harness is production code and is tested. Evaluation cost is budgeted per the per-surface budget (ADR-003's cost control) and runs nightly against a sample rather than the full transcript. A regression blocks release; a feature flag exists as a temporary mitigation with a recorded expiry.
- **Evidence:** charter section 34.5; NFR-05, NFR-06.
- **Status:** Proposed; requires approval before implementation.

---

**ADR-024 - Field-level provenance is a first-class relational table, not a framework**
- **Context:** NFR-08 requires answering "where did this value came from?" for every migrated field. The volume is roughly 33,000 entities across seven to thirteen attribute fields each.
- **Alternatives:** (a) a provenance framework with automatic instrumentation; (b) an `evidence_status` column on every table plus a `provenance` table; (c) provenance embedded in JSON blobs per row.
- **Decision:** An `evidence_status` column on every migrated table, plus a `provenance` table keyed by entity and field, carrying source artefact, source locator, confidence, evidence status and extraction version. `[INFERRED]`
- **Reason:** A framework gives automatic coverage but makes the evidence status a side effect of instrumentation, which is exactly the property that must be explicit and testable here. JSON blobs are write-only in practice: nobody queries `data->>'origin_evidence'` in an incident. An explicit column is filterable, indexable and enforceable by a gate.
- **Consequences:** A gate asserts 100% provenance coverage over all migrated rows, so an unmigrated field fails the build rather than shipping unlabelled. `evidence_status` is queryable directly, which is what makes gate V15 (no publication from `UNKNOWN` price evidence) a simple filter.
- **Evidence:** charter section 33.5, NFR-08; the requirement that "where did this value come from?" be answerable for every migrated field.
- **Status:** Proposed; requires approval before implementation.

---

**ADR-025 - Agentation is development-only visual feedback tooling**
- **Context:** Developers need a local way to capture visual feedback from the in-progress web application. The locked stack does not include a browser annotation tool.
- **Alternatives:** (a) copy feedback manually into an agent; (b) adopt Agentation as an optional local development overlay; (c) expose annotation collection in the application runtime.
- **Decision:** Accept Agentation 3.1.2 as an `apps/web` development dependency. Load its client component only in `NODE_ENV=development`; alias the package out of production webpack builds. Do not configure an endpoint or MCP server by default.
- **Reason:** The overlay supports local visual review without adding a storefront feature or changing the locked production stack. Client-only lazy loading keeps the DOM-dependent package out of server rendering, and the production alias prevents the package from entering emitted bundles.
- **Consequences:** The annotation toolbar is available during local development only. Agentation reads page DOM when used; annotations remain local unless a developer explicitly configures an endpoint. The package must not be used to collect or transmit customer data, and storefront production bundle budgets must continue to pass.
- **Evidence:** User authorization on 2026-10-12; package documentation supplied with the request; package version and license metadata verified from the installed package.
- **Status:** Accepted by explicit user authorization (2026-10-12).

---

**ADR-026 - The catalogue is a multivendor marketplace; every commercial entity is vendor-owned**

- **Context:** The original charter described a single-seller fine-jewellery business. The client's production target (2026-11-20) is a multivendor marketplace: independent vendors list gemstones and settings, the platform governs them, and money is split between vendor and platform. Every existing commercial table (`products`, `gemstones`, `settings`, `setting_variants`, `price_entries`, `orders`, `refunds`) is single-owner today.
- **Alternatives:** (a) keep single-seller and model vendors as an external integration later; (b) add a `vendor_id` ownership column to commercial tables with a default platform vendor and expand contracts incrementally; (c) a separate per-vendor schema or database.
- **Decision:** Option (b). A `vendors` table is authoritative. Commercial entities gain a nullable `vendor_id` that resolves to a seeded `PLATFORM` vendor for all migrated source data. Enforcement is expand-then-contract (ADR-020 discipline): add nullable, backfill, then tighten to `NOT NULL` only where the domain guarantees an owner. Orders gain `order_vendor_allocations`; money gains a double-entry `vendor_ledger`. Every vendor-scoped read and write carries the vendor boundary in the application service, with RLS as defence-in-depth.
- **Reason:** Nullable-then-tighten is the only migration shape that does not break the 9,900 migrated DRAFT products or the 44,218 redirect spine, and it lets the storefront, admin and vendor portal ship on one schema. A separate schema per vendor multiplies migrations, breaks cross-vendor search, and makes a single order spanning two vendors unrepresentable. A late external integration cannot satisfy the client's requirement that vendors list stock directly.
- **Consequences:** (1) Every catalogue query must decide vendor visibility explicitly; an unscoped query is a defect, enforced by a lint rule and a test that fails when a commercial repository is called without a vendor scope. (2) Order placement becomes a split operation with per-vendor fulfilment state. (3) Payment capture and refunds must allocate to vendors through the ledger; a refund without an allocation is rejected. (4) The AI tool registry gains a vendor scope parameter; no tool may return another vendor's private stock. (5) Search ranking must not privilege the platform vendor. (6) RLS policies extend to vendor-scoped rows.
- **Evidence:** Client direction 2026-11-20; `PROJECT_SOURCE_OF_TRUTH.md` section 7 (current single-business model); `INITIAL_IMPLEMENTATION_PLAN.md` section 37. This ADR amends, and does not silently rewrite, the sections it touches.
- **Status:** Accepted by explicit client authorisation (2026-11-20).

---

**ADR-027 - Admin and vendor identity is session-based; the trusted-header seam is development-only**

- **Context:** Phase 12 Stage A shipped `resolveAdminActor()` reading `x-admin-sub` and `x-admin-role` from request headers, gated by an `allowRoleHeader` flag. That is acceptable for tests and local development and unacceptable in production, where a client could assert its own role. Phase 12's remaining tasks and the vendor portal both need real identity.
- **Alternatives:** (a) a managed identity provider (Auth0, Clerk, Cognito); (b) first-party sessions backed by a `sessions` table with HttpOnly cookies; (c) signed stateless JWTs held in cookies.
- **Decision:** Option (b) for both admin and vendor identities, with a first-party adapter behind the existing `AdminActor` contract. Passwords are hashed with scrypt (Node built-in, no new dependency). Sessions are opaque 256-bit tokens stored as SHA-256 hashes, HttpOnly, Secure, SameSite=Lax, with absolute and idle expiry. The header seam remains available only when `ALLOW_ROLE_HEADER=1` and `NODE_ENV !== 'production'`, and a production build must fail a test if that flag is enabled.
- **Reason:** The `AdminActor` contract already exists and is well tested; replacing only the resolution source keeps every authorisation decision and its tests intact. Native scrypt avoids a new dependency, and hashed opaque tokens mean a database leak does not yield usable sessions. A managed provider remains available later without changing the contract.
- **Consequences:** Two new tables and a login surface. Session revocation is a row update. CSRF protection is required on cookie-authenticated mutations because the cookie is sent automatically. The development seam must be proven unreachable in production by an automated test, not by documentation.
- **Evidence:** `apps/web/src/api/admin/authz.ts`; `packages/contracts/src/dto/admin/actor.ts`; `docs/PHASE12_TRACEABILITY.md` Stage A non-goals.
- **Status:** Accepted by explicit client authorisation (2026-11-20).

---

**ADR-028 - Tailwind CSS 4 and lucide-react are accepted for the operator consoles**

- **Context:** The operator consoles brought over from `develop` (`AdminConsoleApp`, `VendorPortalApp`) are ~4,100 lines of UI that import ~40 icons and a stylesheet that uses Tailwind 4 theme/utilities. Without both, the consoles cannot typecheck or build. The locked stack (doc 02) does not include either.
- **Alternatives:** (a) rewrite 4,100 lines of UI to remove the dependency; (b) copy the two packages at develop's pinned versions; (c) build a bespoke utility layer.
- **Decision:** Option (b). `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3` and `lucide-react@1.61.0` are accepted as storefront/console build dependencies. They apply to `apps/web` only; no package outside the web app may import them.
- **Reason:** Rewriting a working console to satisfy a stack list is unbounded work with a real regression risk, and the alternative utility layer would be a worse version of the same idea. Tailwind is a build-time transform, so it does not enter the runtime bundle beyond the classes actually emitted; lucide is tree-shaken per icon.
- **Consequences:** (1) `apps/web` gains a PostCSS pipeline; bundle budgets remain the gate, and the measured numbers are unchanged (139.9 / 143.4 KB). (2) Icons are a visual vocabulary; a second icon set must not be added. (3) The operator consoles are now the only surface permitted to use Tailwind utilities; storefront pages keep the existing CSS-token system until they are migrated deliberately.
- **Evidence:** `apps/web/src/components/mgh/operator/*`; `apps/web/src/styles/mgh-applet.css`; measured budget output after the change.
- **Status:** Accepted by implementation necessity (2026-11-26), flagged for client review.

---

**ADR-029 - develop's storefront dependency set is accepted, storefront-only**

- **Context:** The client decision of 2026-11-26 is that the storefront must look exactly like `develop` — a verbatim copy of its design tree (`components/mgh`, `app/(storefront)`, `lib/mgh`, styles, engine, hooks, data). That tree is written against the dependency set `develop` pins. The locked stack (doc 02) does not include any of it, and `apps/web` had already accepted Tailwind 4 and lucide-react for the operator consoles under ADR-028.
- **Alternatives:** (a) rewrite ~25,000 lines of design code to remove the dependencies; (b) copy the packages at develop's pinned versions; (c) vendor the libraries into the repository. (a) is unbounded and would not be the design the client approved; (c) imports licence and upgrade debt and hides the version.
- **Decision:** Option (b). `apps/web` declares exactly this set, at develop's pins:
  `three@0.170.0`, `three-mesh-bvh@0.8.3`, `motion@^14.5.0` (14.5.0), `gsap@^3.15.0` (3.15.0), `lenis@^1.3.27` (1.3.27), `sonner@^2.0.8` (2.0.8), `radix-ui@^1.8.1` (1.8.1), `@radix-ui/react-dialog@^1.3.1` (1.3.1), `@radix-ui/react-label@^2.1.17` (2.1.17), `@radix-ui/react-separator@^1.2.0` (1.2.0), `@radix-ui/react-slot@^1.5.0` (1.5.0), `class-variance-authority@^0.7.1` (0.7.1), `cmdk@^1.1.1` (1.1.1), `embla-carousel-react@^8.6.0` (8.6.0), `vaul@^1.1.2` (1.1.2), `cn@^0.5.0` (0.5.0), `clsx@^2.1.1` (2.1.1), `tailwind-merge@^3.7.0` (3.7.0), `@mediapipe/tasks-vision@0.10.17`, plus build-time `tw-animate-css@^1.4.0` (1.4.0) and `shadcn@^4.22.1` (4.22.1), and `next-themes@^0.4.6` (0.4.6) which develop also pins. `@types/three@0.170.0` is the matching dev type package. Parenthesised versions are what the lockfile resolved.
- **Scope:** `apps/web` only. No package outside the web app may import any of them; the API, worker, db, domain and contracts packages remain on the locked stack. `shadcn` is a CLI, not a runtime import; `tw-animate-css` is a CSS import consumed by `styles/operator.css`.
- **Reason:** The design is the deliverable. Pinning develop's versions means the copied CSS/JS behaves as it did in the reference rather than against a drifted major. Installing the whole set once (rather than adding a package per build failure) keeps the lockfile and the review in one place.
- **Bundle implications (measured, not tuned):** after the copy, `check:budgets` FAILs both existing budgets:
  - category page: **213.1 KB gzip** initial JS vs <= 170 KB (22 chunks)
  - product page: **208.0 KB gzip** initial JS vs <= 190 KB (20 chunks)
  - largest chunks: 65.4 KB `930-*.js` (three/react vendor), 62.6 KB `dc99267f-*.js`, 12.1 KB `279-*.js`, 11.6 KB `4758-6b21*.js`, 11.5 KB `9366-*.js`.
  The overrun is recorded, not hidden: the budget file is unchanged. Three's chunk is the single largest object and is lazy (below); the remaining growth is the develop design runtime (header, motion layer, currency/cart providers, carousel/filter client).
- **Heavy dependencies are route-local and lazy:** `three` is imported by exactly one module, `components/mgh/ar/ThreeGemstoneStudio.tsx`, which `ArViewerPageClient` loads through `next/dynamic` with `ssr: false`. `scripts/check-lazy-heavy-deps.mjs` scans every built client chunk for three's class fingerprints, then checks each route's `page_client-reference-manifest.js` plus `rootMainFiles`: the three chunk (490 KB raw, `static/chunks/6284d963.*.js`) is in **no route's initial JS**, including `/ar/[assetId]`. `@mediapipe/tasks-vision` is installed but not imported anywhere in the copied tree, so no MediaPipe bytes ship. Re-run the script after any AR change; it exits 1 if a heavy chunk becomes eager.
- **Consequences:** (1) A framework or library bump is a dependency change and needs its own ADR. (2) The unused-now packages (`three-mesh-bvh`, `motion`, `radix-ui`, the four scoped radix packages, `class-variance-authority`, `cmdk`, `embla-carousel-react`, `vaul`, `@mediapipe/tasks-vision`, `next-themes`, `shadcn`) contribute no runtime bytes today because nothing imported by the copied subset references them; they are declared because the design tree is not complete and the client asked for develop's exact set. Deleting them is a later decision, not a silent trim. (3) The storefront now shares Tailwind 4 with the consoles; ADR-028's "storefront keeps the existing CSS-token system" sentence is superseded for the storefront by this ADR, while main's admin/vendor surfaces keep their own styles.
- **Evidence:** `apps/web/package.json`; `pnpm-lock.yaml`; measured output of `pnpm --filter @maihan/web run check:budgets`; `apps/web/scripts/check-lazy-heavy-deps.mjs`; `apps/web/src/components/mgh/ar/*`; `apps/web/src/styles/operator.css` (tw-animate-css).
- **Status:** Accepted by explicit client decision (2026-11-26), with the budget overrun flagged for client review.

---

**ADR-030 - "Maihan Group App & Portal Design System v2" is adopted across the admin portal, the vendor portal and the storefront**

- **Context:** The client supplied a design-system document ("Maihan Group App & Portal Design System v2": gold `#C9A84C` + navy `#0D1B2A`, Montserrat + Manrope, curved surfaces, a fixed radius/elevation/motion scale). The document scopes itself to the app. On 2026-11-28 the client overrode that scope: adopt it across the **admin portal, vendor portal and storefront**, while keeping the storefront's editorial composition and type scale. The repository currently runs four visual layers — the applet/craft storefront (Cormorant Garamond + Jost), the `portal-premium` console (Urbanist), the older `console-auth` sign-in frames (Inter/Cormorant), and the Fresh consoles with hard-coded hex values.
- **Alternatives:** (a) keep the four layers and style each new surface ad hoc; (b) adopt the document only where it says (the app), leaving the storefront and the consoles on their existing palettes; (c) one token layer plus one primitive set, applied to all three surfaces, with the storefront keeping its editorial scale and section composition.
- **Decision:** Option (c).
  - **Tokens** live in `apps/web/src/styles/maihan-system.css`: the gold scale (7 stops), navy scale (6 stops), light neutrals (canvas/surface/ink/muted/faint/line), the dark neutral ramp (`.dark`, `[data-theme="dark"]`, `[data-portal-theme="dark"]`), the four status pairs (light/dark), the eleven-step radius scale (4 auth, 8 xs, 10 sm, 12 input, 16 card, 18 card-lg, 20 dialog, 22 sidebar, 24 sheet, 26 dock, full pill), the nine elevation tokens, the two easings (`--ease-silk` `.22,1,.36,1`; `--ease-expo` `.16,1,.3,1`) and the three durations (160/240/550 ms).
  - **Primitives** live in `apps/web/src/components/system/`: `Button` (primary/secondary/danger/quiet, sizes md/sm, icon-only), `Input`, `Label`, `Card`, `Chip`, `Kpi`, plus the Sileo `Toaster` and the Skullet re-export. Their recipes are CSS (`.mi-*`) so the console class names (`.portal-btn`, `.portal-input`, `.portal-card`, `.portal-badge`) resolve to the same declarations without a markup rewrite. This honours ADR-022 (primitives in-repo; no component library adopted).
  - **Course correction — families on the storefront:** an earlier reading of the brief kept the storefront's editorial families. The client clarified on 2026-11-28 that both must hold: the **families change** (Montserrat for display and figures, Manrope for body/UI, two families only) while the **composition and type scale stay** (section order, full-bleed plates, one-statement-per-screen rhythm, card rails, scroll behaviour). Where the editorial scale and the system scale disagree, the editorial size wins for hero/statement typography and the system size wins for UI text, cards, labels, buttons, chips and tables. Every such call is recorded in `docs/design-shots/v13/README.md` §4.
  - **Type exposure:** Montserrat (300–700) and Manrope (variable) are loaded with `next/font` in the root layout and exposed as `--font-montserrat` / `--font-manrope`. `--font-display` and `--font-sans` are re-pointed **inside** `.font-portal` and the three portal roots (`.portal-shell`, `.portal-theme`, `.mh-auth`) and adopted on `body` for the rest of the product. They are deliberately not re-declared on `:root`, because that would replace the storefront stack as a side effect rather than as the explicit decision made here.
  - **Storefront scope:** family tokens, the radius scale, the gold tokens, the button/input/card/chip recipes, tabular lining numerals and the 2 px gold focus ring. Layout, section order, plate ratios, section heights and the editorial display sizes are untouched.
  - **Primary-CTA contrast:** the document's primary CTA is white 11 px/800 on a 135° gold gradient. White on the bright gold (`#C9A84C`) is 2.1:1, which fails WCAG AA and the repository's own craft rule. The gradient therefore runs through the **deep end of the client's own gold scale** (`#94701C → #8B6914 → #7E5F11`); every stop clears 4.5:1 against white. The bright stops stay for light, hairlines and non-text fills.
- **Reason:** Four palettes and four typographic stacks on three surfaces is how a brand stops being one brand. A token layer plus one primitive recipe makes the console's existing markup adopt the system without a logic rewrite (the client's explicit constraint), keeps the accessibility rules enforceable in one place, and lets the storefront keep the composition that was approved in v12. Choosing the deep gold stops satisfies both the document's recipe and the AA rule instead of trading one for the other.
- **Consequences:** (1) The storefront now renders Montserrat + Manrope; v12's "Cormorant + Jost only" measurement is superseded and re-measured in v13. (2) The console's `--p-*` variables are now aliases of `--mi-*` tokens; a system change reaches the console without touching a component. (3) Any new colour, radius or shadow must be a token; ad-hoc hex in a console component is a defect (the two Fresh consoles were converted). (4) The `auth-shell` and `console-auth` frames adopt the same gold, radius and focus rules. (5) The document's storefront-scoped type sizes are applied to UI text only; the editorial sizes remain, and the divergence is reported per element.
- **Evidence:** `apps/web/src/styles/maihan-system.css`; `apps/web/src/components/system/*`; `apps/web/src/styles/portal-premium.css` (§ v13); `apps/web/src/app/console-auth.css`; `apps/web/src/app/storefront-craft.css` (§ 17); `apps/web/src/styles/home-v12.css` (§ V13); `apps/web/src/app/layout.tsx`; measured gates in `docs/design-shots/v13/audit.json` and `docs/design-shots/v13/README.md`.
- **Status:** Accepted by explicit client authorisation (2026-11-28).

---

**ADR-031 - Skullet and Sileo are accepted as the skeleton and toast runtimes**

- **Context:** Loading states were hand-rolled shimmer spans (`ListSkeleton`, `CollectionExplorerSkeleton`, `ProductDetailSkeleton`, plus a local `Skeleton` primitive); toasts were `sonner` (mounted in the storefront layout, never called) and one ad-hoc inline notice in `SettingDetailClient`. The client specified Skullet for skeletons and Sileo for toasts and required the package, version and licence to be verified before use.
- **Verification (npm registry, 2026-11-28):**

  | Package | Version | Licence | Repository | Published | Weekly downloads |
  |---|---|---|---|---|---|
  | `skullet` | **0.0.3** | **MIT** | `github.com/lochie/skullet` (package `packages/skullet`) | 2026-10-31 | 337,666 (week 2026-11-21 → 27) |
  | `sileo` | **0.1.6** | **MIT** | `github.com/hiaaryan/sileo` | 2026-10-13 | 90,290 (week 2026-11-21 → 27) |

  Both are real, published packages with an active release in the last month. Skullet is pre-1.0 (0.0.3); that is recorded here as a supply-chain risk, mitigated by pinning the exact version and by the fact that its public surface is two components (`Skeleton`, `SkeletonBox`) behind one local wrapper.
- **Alternatives:** (a) keep the hand-rolled shimmer and the mounted-but-unused sonner; (b) adopt both packages as specified; (c) adopt one and implement the other locally.
- **Decision:** Option (b), with the integration constraints below.
  - **Skullet** (`skullet@0.0.3`, `skullet/react`): the local `Skeleton` primitive now renders `SkeletonBox`, so every existing bone is Skullet's. The theme is set through the package's documented CSS custom properties (`--skullet-base`, `--skullet-highlight`) on `[skullet-bar]` rather than through `<SkulletProvider>`, because the provider pulls the whole 53 KB module into the root layout and with it every route's initial JS. The three composed skeletons keep their **explicit geometry** because a route-level `loading.tsx` has no data to measure, and this repository forbids fabricating sample products to measure against (`AGENTS.md` §6, prohibition 1). Skullet's own reduced-motion handling stops the shimmer; no additional guard was needed. Measurement mode (`<Skeleton data sample>`) remains available for a surface that later has real sample data.
  - **Sileo** (`sileo@0.1.6`): one `<Toaster>` at the portal root (admin page and vendor page modules) and one at the storefront root, replacing `sonner`. It is client-only and lazily imported, and the `notify` helpers import the module on first call, so the toast runtime never enters a route's initial JS. The document's recipe is enforced in CSS (16 px radius, navy-deep 95 %, gold 25 % border) and in the toaster options (`roundness: 16`, `fill: var(--mi-toast-bg)`). Policy: success 4000 ms, error 6000 ms, duplicates by title+description suppressed while the first is visible, maximum three live (oldest dismissed).
  - **Dependency dedupe:** Sileo declares `motion ^12.34.0`; the app already ships `motion ^14.5.0`. Sileo imports only the `motion` proxy (`motion.rect`), which is unchanged across the two majors, so `pnpm-workspace.yaml` pins `sileo>motion` to `^14.5.0`. One motion in the bundle; no new package.
  - **Ad-hoc toast replaced:** `SettingDetailClient`'s 2.5 s inline notice now calls `notifySuccess`; its local `specToast` state was removed.
- **Reason:** The client named both libraries and both solve a real gap: Skullet owns the bone paint, shimmer speed and reduced-motion stop in one place, and Sileo gives the portal and the storefront one toast surface with a physics-based entrance instead of a second bespoke implementation. Pinning exact versions and wrapping both behind local modules keeps the blast radius of a pre-1.0 dependency small.
- **Consequences:** (1) `sonner` remains installed under ADR-029's pin but is no longer mounted; removing it is a separate dependency decision. (2) Sileo ships an SVG-based toast; its visual overrides are CSS on `[data-sileo-*]` attributes, so a major version bump must re-check those selectors. (3) The toast runtime is a deferred chunk, measured in the v13 report. (4) A future non-React surface (e.g. an email template preview) cannot use either library. (5) Skullet's measurement mode is available but unused on purpose; if a surface later has real sample data, it can switch from explicit geometry to a measured skeleton with no API change.
- **Evidence:** `apps/web/package.json` (pinned versions); `pnpm-lock.yaml`; `pnpm-workspace.yaml` (override); `apps/web/src/components/system/Toaster.tsx`; `apps/web/src/components/design-system/Skeleton.tsx`; `apps/web/src/components/catalog/ListSkeleton.tsx`; `apps/web/src/components/catalog/ProductDetailSkeleton.tsx`; `apps/web/src/components/mgh/catalog/CollectionExplorer.tsx`; registry metadata recorded in this ADR.
- **Status:** Accepted by explicit client authorisation (2026-11-28).

---

## ADR governance

| Rule | Detail |
|---|---|
| Format | Decision, context, alternatives, reason, consequences, evidence, status |
| Status values | Proposed, Accepted, Superseded, Rejected |
| Approval | Two reviewers; `ADMIN_SUPER` for any decision affecting money, inventory or trust |
| Superseding | A superseded ADR is never deleted; the chain is preserved because the reasoning is the value |
| Trigger for review | Any NFR relaxation, any `UNKNOWN` becoming load-bearing, any measured failure of a decision's stated condition |
| Implementation coupling | An ADR that changes behaviour requires an expand-then-contract migration (ADR-020 era discipline per doc 29) |

ADR-006, ADR-019 and ADR-010 each name the measured condition that would reopen them: catalogue growth by an order of magnitude, an independent scaling or deployment need, and a residual analysis showing no coherent per-setting value. Recording the reopening condition with the decision is what keeps a decision record from becoming dogma.