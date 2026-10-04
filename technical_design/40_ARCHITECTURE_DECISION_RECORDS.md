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
| 021 | Test runner is Vitest, with Playwright for end-to-end | Proposed |
| 022 | Design-system primitives are built in-repo, not adopted | Proposed |
| 023 | AI evaluation harness is first-party, versioned against the prompt registry | Proposed |
| 024 | Field-level provenance is a first-class relational table, not a framework | Proposed |

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
- **Status:** Proposed; requires approval before implementation.

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