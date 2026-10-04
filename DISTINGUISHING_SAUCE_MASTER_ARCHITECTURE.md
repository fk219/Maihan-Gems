# Natural Gemstones / Maihan Gems
# Distinguishing Sauce — Master Architecture & Implementation Charter

## Document Status

**Status:** Master architectural source-of-truth for the rebuild  
**Purpose:** Introduce the business vision, distinguishing capabilities, reverse-engineering evidence, proposed technology stack, architectural constraints, and implementation principles to the downstream AI/engineering team.

This document is intended to be supplied together with the complete `reverse_engineered/` package.

The downstream AI must read this document **and** the reverse-engineering package before proposing or implementing architecture.

---

# 1. PURPOSE OF THIS DOCUMENT

This document defines the long-term architectural direction for rebuilding the Natural Gemstones-derived ecommerce experience into the new system.

The reverse-engineered source package answers:

- What exists in the source.
- What pages and routes were discovered.
- What products and specifications were captured.
- What relationships were observed.
- What Design Your Own (DYO) evidence exists.
- What functional signals were detected.
- What remains unknown.

This document answers:

- What we are building.
- Why we are building it.
- What differentiates the new system.
- What technology stack is proposed.
- What architectural principles must govern implementation.
- How the database, backend, frontend, AI, caching, search, media, certificates, WhatsApp and WebAR layers should be designed.
- Which decisions are architectural constraints.
- How the implementation AI should resolve ambiguity.
- What must remain stable throughout implementation.

The implementation AI must combine both sources:

```text
Reverse Engineering Evidence
            +
Business / Product Vision
            +
Proposed Technology Stack
            +
Architectural Constraints
            ↓
      Replacement Architecture
            ↓
Database + Backend + APIs + Frontend
            +
AI + Search + Cache + Assets + WebAR
            ↓
Production System
```

---

# 2. CORE OBJECTIVE

The goal is **not** merely to clone the visual appearance of the source website.

The goal is to reconstruct the observed domain and user experience while creating a substantially more maintainable, scalable and intelligent architecture.

The replacement should preserve the important source-domain concepts while improving:

- architecture
- maintainability
- data quality
- search
- product discovery
- personalization
- DYO
- certificate processing
- AI assistance
- customer service
- media delivery
- WebAR
- observability
- scalability
- security
- developer experience

The result should be a production-grade gemstone and jewelry commerce platform.

---

# 3. ARCHITECTURAL NORTH STAR

The system should be designed around this principle:

> **Source truth is preserved as evidence. Product intelligence is built as structured domain data. AI is an orchestration layer over controlled tools and trusted data. The frontend consumes stable domain APIs.**

Conceptually:

```text
                    CUSTOMER
                       │
        ┌──────────────┼──────────────┐
        │              │              │
       Web           WhatsApp        WebAR
        │              │              │
        └──────────────┼──────────────┘
                       │
                Experience Layer
                       │
              AI / Search / APIs
                       │
              Domain Application Layer
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Catalog          DYO          Commerce
        │              │              │
     Search        Validation      Orders
        │              │              │
        └──────────────┼──────────────┘
                       │
                 Domain Data Layer
                       │
          ┌────────────┼────────────┐
          │            │            │
       Postgres      Redis      Object Storage
       + pgvector                / CDN
```

---

# 4. DISTINGUISHING SAUCE

The new system should not be treated as a normal ecommerce catalog.

Its differentiating layer is the combination of:

1. **Structured gemstone intelligence**
2. **AI gemstone concierge**
3. **Design Your Own intelligence**
4. **Certificate OCR and verification workflow**
5. **WhatsApp AI concierge**
6. **WebAR virtual try-on**
7. **Semantic + structured product discovery**
8. **Source-grounded product knowledge**
9. **Human concierge escalation**
10. **Strict AI safety and commerce guardrails**

These capabilities should be designed as first-class architectural domains, not added as disconnected plugins after the ecommerce system is finished.

---

# 5. REVERSE-ENGINEERING INPUT

The downstream AI must treat the `reverse_engineered/` package as the primary source-evidence package.

Important existing artifacts include:

```text
reverse_engineered/
├── 00_README.md
├── 01_SOURCE_OVERVIEW.md
├── 02_SITEMAP.md
├── 03_PAGE_ARCHITECTURE.md
├── 04_USER_JOURNEYS.md
├── 05_PRODUCT_MODEL.md
├── 06_CATALOG_TAXONOMY.md
├── 07_DESIGN_YOUR_OWN.md
├── 08_SEARCH_FILTERS.md
├── 09_CART_CHECKOUT_ACCOUNT.md
├── 10_CONTENT_CMS.md
├── 11_MEDIA_AND_ASSETS.md
├── 12_CERTIFICATES_DOCUMENTS.md
├── 13_RELATIONSHIPS.md
├── 14_DATABASE_BLUEPRINT.md
├── 15_URL_ROUTE_PATTERNS.md
├── 16_FUNCTIONAL_BEHAVIOUR.md
├── 17_SOURCE_EVIDENCE.md
├── 18_COVERAGE_AND_GAPS.md
├── 19_AI_IMPLEMENTATION_CHECKLIST.md
│
├── data/
├── examples/
├── ai_context/
├── architecture/
└── architecture_handoff/
```

The architecture handoff contains:

```text
architecture_handoff/
├── architecture_readiness_manifest.json
├── ARCHITECTURE_READINESS.md
└── IMPLEMENTATION_AI_INSTRUCTIONS.md
```

These files establish the distinction between:

```text
OBSERVED
EXTRACTED
PATTERN
INFERRED
UNKNOWN
```

That distinction is mandatory throughout the rebuild.

The reverse-engineering package contains broad crawl coverage but detailed HTML analysis is limited to a smaller subset of pages. Therefore the implementation AI must never treat undocumented runtime behavior as confirmed source behavior.

---

# 6. SOURCE-EVIDENCE RULE

The following hierarchy is authoritative:

```text
OBSERVED
    ↓
EXTRACTED
    ↓
PATTERN
    ↓
INFERRED
    ↓
UNKNOWN
```

## OBSERVED

Direct source evidence.

Examples:

- captured product fields
- captured URLs
- captured DYO URLs
- captured HTML
- captured media metadata
- captured specifications

## EXTRACTED

Data deterministically derived from source evidence.

## PATTERN

Repeated structural behavior found across many records.

## INFERRED

A proposed design for the replacement system.

## UNKNOWN

Not enough evidence exists.

### Absolute rule

Never convert:

```text
UNKNOWN
```

into:

```text
FACT
```

without new evidence.

Never convert:

```text
INFERRED
```

into:

```text
OBSERVED
```

because the proposed implementation seems reasonable.

---

# 7. PROPOSED TECHNOLOGY STACK

The following is the proposed target stack.

These are **architecture decisions for the replacement system**, not claims about the original source implementation.

---

## Frontend

### Next.js

Use Next.js as the primary web application framework.

Responsibilities:

- public storefront
- product pages
- category pages
- search
- DYO
- account experience
- commerce UI
- CMS-driven pages
- AI chat interface
- WebAR entry points
- SEO
- SSR/streaming where beneficial

Prefer a clean separation between:

```text
Server-rendered content
Client-side interactive state
Domain API calls
AI streaming UI
WebAR client runtime
```

Do not force highly interactive browser-only features into server components.

---

# 8. API / APPLICATION DEPLOYMENT

The proposed architecture allows the Next.js application and API/BFF layer to be deployed together where practical.

The application boundary should still maintain clean internal domain modules.

Conceptually:

```text
Next.js
├── UI
├── Server Components
├── Route Handlers / API
├── Server-side domain services
└── Client-side interactive modules
```

Do not create microservices merely for theoretical purity.

Start with a modular monolith/application boundary unless measured requirements justify service extraction.

---

# 9. DATABASE

## Neon PostgreSQL

Primary transactional database:

**Neon PostgreSQL**

Postgres is the system of record for:

- products
- gemstones
- jewelry
- specifications
- taxonomy
- customers
- accounts
- carts
- orders
- DYO configurations
- certificates
- content metadata
- asset metadata
- AI conversation state where appropriate
- audit records
- domain events where appropriate

The database must remain authoritative for transactional facts.

---

# 10. VECTOR SEARCH

Use:

**pgvector**

inside PostgreSQL for semantic retrieval.

Use vector embeddings for appropriate entities such as:

- gemstone descriptions
- product descriptions
- educational content
- FAQs
- certificate knowledge where appropriate
- DYO knowledge
- curated knowledge documents

Use HNSW indexes where appropriate after validating data scale and query patterns.

Do not use vector search for facts that should be answered through deterministic relational queries.

Example:

```text
"Which gemstones are available?"
        ↓
SQL / inventory query

"What is the difference between two gemstones?"
        ↓
Structured data + semantic knowledge

"Which stone matches these preferences?"
        ↓
Structured filters + semantic ranking
```

---

# 11. HYBRID SEARCH

Initial search architecture:

```text
PostgreSQL Full-Text Search
            +
pgvector semantic search
            +
structured filters
```

Do not immediately introduce Meilisearch or Algolia.

A dedicated search engine should only be introduced if real measurements demonstrate that Postgres search is insufficient.

This keeps the initial architecture simpler and preserves transactional consistency.

---

# 12. REDIS / CACHING LAYER

Use Redis as the high-speed transient state and caching layer.

Redis may support:

- hot product cache
- taxonomy cache
- search-result cache
- session-related transient state
- rate limiting
- distributed locks where required
- AI conversation transient state
- DYO configuration sessions
- job coordination
- short-lived availability cache
- API response caching where appropriate

Redis is NOT the source of truth for transactional commerce data.

The rule is:

```text
Postgres = source of truth
Redis = acceleration / transient state
```

Never design a system where Redis contains the only copy of critical order, payment or inventory facts.

---

# 13. OBJECT STORAGE / MEDIA

Use:

**Cloudflare R2**

for durable object storage where appropriate.

Use a CDN/image delivery layer such as ImageKit where required for image optimization and delivery.

The asset lifecycle should be:

```text
Source Asset
    ↓
Ingestion
    ↓
Validation
    ↓
Object Storage
    ↓
Image Processing / Optimization
    ↓
CDN
    ↓
Frontend
```

The reverse-engineered media metadata must remain separate from the eventual processed asset URL.

Maintain:

```text
source_url
storage_key
cdn_url
asset_role
position
alt
title
responsive_sources
processing_status
provenance
```

---

# 14. DEPLOYMENT

Primary web deployment target:

**Vercel**

Use Vercel for the Next.js application where appropriate.

The architecture must remain portable enough that business/domain logic is not irreversibly tied to deployment-provider-specific behavior.

---

# 15. AUTHENTICATION

Use a managed authentication solution rather than building password security and account identity infrastructure from scratch.

The selected provider is an implementation detail unless later explicitly locked.

Authentication must remain separate from:

- customer profile
- commerce customer record
- authorization
- admin permissions

Conceptually:

```text
Identity
   ↓
Customer
   ↓
Roles / Permissions
```

---

# 16. COMMERCE / PAYMENTS

The exact commerce/payment boundary must be finalized during architecture design.

Where Shopify is used, treat it as a bounded commerce/payment integration rather than allowing the entire application domain model to become Shopify-shaped.

Potential responsibilities:

- payment processing
- compliance-related payment flows
- refunds
- selected commerce operations

The application should maintain its own domain boundaries and integration adapters.

Do not assume the reverse-engineered source used Shopify.

---

# 17. AI LAYER

AI is one of the primary differentiators.

The AI system should be designed as an orchestration layer, not as an unrestricted chatbot connected directly to the database.

Conceptually:

```text
Customer
   ↓
AI Chat Interface
   ↓
AI Orchestrator
   ↓
Intent / Context
   ↓
Controlled Tools
   ├── Search Inventory
   ├── Product Retrieval
   ├── Compare Gemstones
   ├── Search Knowledge
   ├── Check DYO Compatibility
   ├── Retrieve Certificate
   └── Human Concierge
   ↓
Trusted Data
```

The LLM must never receive unrestricted SQL/database mutation access.

---

# 18. AI MODEL / GATEWAY

Use an AI gateway approach such as:

**Vercel AI Gateway / OpenRouter**

The application should keep model selection behind an abstraction.

This allows:

- model replacement
- fallback models
- cost control
- latency optimization
- multimodal model routing
- experimentation without rewriting business logic

Do not make business logic dependent on one specific LLM.

---

# 19. AI STREAMING

The web AI experience should support streaming responses.

A Next.js/SSE-style architecture can be used for chat streaming.

Conceptually:

```text
Browser
  ↓
Chat API
  ↓
AI Orchestrator
  ↓
Tool Calls
  ↓
LLM
  ↓
Streaming Response
  ↓
Browser
```

Tool calls must remain controlled and auditable.

---

# 20. AI TOOLS

Initial controlled tool set:

```text
search_inventory
get_product
compare_gemstones
search_knowledge
check_dyo_compatibility
get_certificate
create_customer_request
transfer_to_human
```

Additional tools may be introduced only when justified.

Each tool should have:

- strict input schema
- strict output schema
- authorization requirements
- auditability
- timeout
- error handling
- deterministic behavior where possible

---

# 21. AI MUST NOT

The AI must never:

- invent gemstone specifications
- invent certificate information
- invent gemstone origin
- invent treatment
- invent inventory availability
- claim authenticity without evidence
- directly mutate inventory
- directly modify product prices
- create unauthorized discounts
- promise availability
- fabricate backend behavior
- expose private customer data
- execute arbitrary SQL
- bypass business authorization

AI may recommend or explain.

Authoritative systems must decide transactional facts.

---

# 22. PRICE SAFETY

The LLM must never become the final pricing engine.

Pricing should be deterministic.

Conceptually:

```text
Configuration
     ↓
Pricing Service
     ↓
Validated Price
     ↓
Cart
     ↓
Checkout
```

The AI can explain a price.

It must not invent the price.

---

# 23. INVENTORY SAFETY

Inventory must be controlled by deterministic application services.

AI can query:

```text
availability
stock
product status
```

subject to authorization and freshness.

AI cannot directly mutate inventory.

All inventory mutations must pass through domain services and transactional controls.

---

# 24. DYO ARCHITECTURE

Design Your Own should become a first-class domain.

Conceptually:

```text
DYO Product / Base Design
          ↓
Configuration State
          ↓
Gemstone Selection
          ↓
Setting Selection
          ↓
Metal Selection
          ↓
Compatibility Validation
          ↓
Pricing
          ↓
Review
          ↓
Cart
```

The actual source backend model is not fully observed.

Therefore:

- observed DYO values are source evidence
- replacement DYO architecture is an implementation design

Do not manufacture source SKUs for the 221 records where explicit SKU evidence is missing.

---

# 25. DYO DATA MODEL

A proposed DYO model should support:

```text
DYOConfiguration
├── id
├── base_design_id
├── gemstone_id
├── setting_id
├── metal
├── treatment
├── origin
├── selected_options
├── compatibility_status
├── calculated_price
├── currency
├── configuration_hash
├── source_reference
├── created_at
└── updated_at
```

Potential supporting entities:

```text
DYOBaseDesign
DYOOption
DYOOptionValue
DYOCompatibilityRule
DYOConfiguration
DYOPriceSnapshot
```

Do not create all of these blindly.

The final schema must be derived from the actual implementation requirements and validated against the reverse-engineering evidence.

---

# 26. CERTIFICATE OCR / INTELLIGENCE

Certificate processing is another major differentiator.

Pipeline:

```text
Certificate Upload
       ↓
Secure Storage
       ↓
Document/Image Validation
       ↓
Vision / OCR
       ↓
Structured Extraction
       ↓
Zod Validation
       ↓
Anomaly Detection
       ↓
Confidence Scoring
       ↓
Human Review if Required
       ↓
Approved Certificate
       ↓
Database
       ↓
Search / AI Retrieval
```

Store:

- original document
- storage reference
- extracted fields
- model/provider
- model version
- extraction timestamp
- confidence
- validation status
- anomaly results
- review status
- reviewer
- approval timestamp
- source provenance

Never treat OCR output as automatically authoritative.

---

# 27. CERTIFICATE DATA SAFETY

AI must not transform low-confidence OCR into fact.

Example:

```text
OCR:
Origin = "Nigeria"
Confidence = 0.54
```

The system should not automatically expose:

```text
Origin: Nigeria
```

as verified truth.

Instead:

```text
extracted_value
confidence
verification_status
```

must remain explicit.

---

# 28. WHATSAPP AI CONCIERGE

Use:

**Meta WhatsApp Cloud API**

for the WhatsApp AI concierge.

Architecture:

```text
WhatsApp
   ↓
Meta Cloud API
   ↓
Webhook
   ↓
Conversation Service
   ↓
AI Orchestrator
   ↓
Tools / Catalog / CRM / Human Handoff
```

WhatsApp should use the same core AI/domain tools as the website wherever possible.

Do not create two separate intelligence systems.

---

# 29. HUMAN HANDOFF

AI must be able to transfer a conversation to a human concierge.

Triggers may include:

- explicit customer request
- high-value customer context
- low-confidence response
- certificate anomaly
- complex DYO request
- unavailable information
- sensitive commerce operation
- customer dissatisfaction
- policy-defined escalation

The human handoff state must be explicit and persisted.

---

# 30. WEBAR VIRTUAL TRY-ON

WebAR is a client-side capability.

Proposed technology:

- MediaPipe
- WASM
- WebGL
- Three.js
- PBR materials
- Draco-compressed GLB assets
- HDR environments
- Cloudflare R2/CDN

Architecture:

```text
Browser
   ↓
Camera Permission
   ↓
MediaPipe HandLandmarker
   ↓
Hand / Finger Landmark Detection
   ↓
Three.js Scene
   ↓
3D Jewelry Asset
   ↓
Transform / Scale / Rotation
   ↓
PBR Rendering
```

Do not send raw camera video to the backend unless explicitly required and consented to.

---

# 31. WEBAR PERFORMANCE

WebAR should remain client-side wherever possible.

Use:

- lazy loading
- dynamic imports
- SSR-disabled WebAR modules
- compressed GLB assets
- Draco
- optimized textures
- appropriate HDR assets
- GPU-aware rendering
- graceful fallback for unsupported devices

The main storefront must not become slow merely because WebAR exists.

---

# 32. QR MOBILE HANDOFF

Where WebAR or interactive experiences begin on desktop, provide a QR-based mobile handoff where useful.

Conceptually:

```text
Desktop
   ↓
Generate short-lived experience token
   ↓
QR
   ↓
Mobile Browser
   ↓
WebAR Experience
```

Tokens should not expose sensitive customer information.

---

# 33. DATA ARCHITECTURE

The central relational model should broadly cover:

```text
Catalog
├── Product
├── ProductVariant
├── Gemstone
├── JewelrySetting
├── Specification
├── Taxonomy
├── Category
├── Collection
└── ProductMedia

Commerce
├── Customer
├── Cart
├── CartItem
├── Order
├── OrderItem
├── Payment
├── Refund
└── Address

DYO
├── DYOBaseDesign
├── DYOOption
├── DYOOptionValue
├── DYOCompatibilityRule
├── DYOConfiguration
└── DYOPriceSnapshot

Trust
├── Certificate
├── CertificateExtraction
├── CertificateReview
└── VerificationEvent

Content
├── Page
├── ContentBlock
├── SEO
├── Navigation
└── Redirect

AI
├── Conversation
├── Message
├── ToolCall
├── AIInteraction
├── KnowledgeDocument
└── EmbeddingReference

Assets
├── Asset
├── AssetVariant
├── AssetProcessingJob
└── AssetUsage

Operations
├── DomainEvent
├── AuditLog
├── Job
└── IntegrationEvent
```

This is a target conceptual model.

The implementation AI must reconcile it with:

- extracted source entities
- database blueprint
- relationship evidence
- product records
- DYO records
- business requirements

before finalizing migrations.

---

# 34. DATABASE DESIGN PRINCIPLES

Use:

- normalized transactional tables
- explicit foreign keys
- constraints
- indexes based on measured access patterns
- JSONB only where flexibility is genuinely required
- generated/search columns where useful
- pgvector for semantic data
- audit metadata
- timestamps
- soft deletion only where domain requirements justify it

Do not turn the entire database into a JSON document store.

Do not over-normalize purely theoretical entities that have no operational purpose.

---

# 35. PROVENANCE

Every migrated/reconstructed source entity should preserve provenance where useful.

Possible fields:

```text
source_system
source_url
source_identifier
source_record_reference
evidence_status
evidence_version
import_batch
imported_at
```

This allows the new system to answer:

> "Where did this value come from?"

---

# 36. SEARCH ARCHITECTURE

Search should combine:

```text
Structured Filtering
        +
Postgres Full Text
        +
Vector Similarity
        +
Business Ranking
```

Example:

Customer asks:

> "Show me blue gemstones under a certain budget suitable for an engagement ring."

Pipeline:

```text
Intent Extraction
       ↓
Structured Filters
       ↓
Inventory Query
       ↓
Semantic Ranking
       ↓
Business Rules
       ↓
Results
       ↓
AI Explanation
```

The AI should not simply ask an LLM to invent a list.

---

# 37. CACHING STRATEGY

Cache only data that is safe to cache.

Potential layers:

```text
Browser Cache
     ↓
CDN Cache
     ↓
Next.js / Application Cache
     ↓
Redis
     ↓
Postgres
```

Examples of cacheable data:

- product pages
- taxonomy
- CMS content
- public configuration
- search suggestions
- frequently accessed knowledge

Avoid long-lived caching of:

- inventory availability
- checkout state
- payment state
- authorization-sensitive customer information

unless carefully designed.

---

# 38. CACHE INVALIDATION

Every cacheable domain must define:

```text
TTL
Invalidation Event
Stale-While-Revalidate Strategy
Fallback
```

Example:

```text
ProductUpdated
    ↓
Invalidate product cache
    ↓
Invalidate relevant search cache
    ↓
Recompute embedding if needed
```

Caching must be driven by domain events where practical.

---

# 39. DOMAIN EVENTS

Useful event concepts include:

```text
GemstoneCreated
GemstoneUpdated
ProductCreated
ProductUpdated
CertificateUploaded
CertificateProcessed
CertificateApproved
InventoryReserved
InventoryReleased
OrderCreated
PaymentCaptured
RefundCreated
DYOConfigurationCreated
DYOConfigurationValidated
AssetProcessed
EmbeddingGenerated
CustomerConversationCreated
HumanHandoffRequested
```

Events should be introduced only where they provide real architectural value.

---

# 40. AI KNOWLEDGE ARCHITECTURE

The AI knowledge layer should distinguish:

### Transactional Truth

From PostgreSQL.

Examples:

- price
- stock
- product status
- order status

### Structured Product Knowledge

From normalized domain data.

Examples:

- gemstone properties
- dimensions
- origin
- treatment
- cut

### Semantic Knowledge

From embeddings.

Examples:

- educational content
- FAQs
- buying guides
- gemstone comparisons
- curated knowledge

### Conversation Context

From conversation state.

Never allow semantic retrieval to override authoritative transactional data.

---

# 41. AI RESPONSE POLICY

The AI should answer in this order:

```text
1. Determine intent
2. Determine required data
3. Call deterministic tools
4. Retrieve trusted knowledge
5. Validate facts
6. Generate explanation
7. State uncertainty where required
8. Escalate if necessary
```

The LLM should be the reasoning/explanation layer.

It should not be the system of record.

---

# 42. SECURITY

Security must be designed from the beginning.

Requirements include:

- authenticated APIs
- authorization
- input validation
- rate limiting
- secure file upload
- signed storage URLs where appropriate
- webhook verification
- secret management
- audit logs
- least privilege
- tenant/customer data isolation where applicable
- protection against prompt injection
- protection against tool abuse
- safe AI tool permissions

---

# 43. AI SECURITY

Treat external content as untrusted.

The AI must not obey instructions embedded in:

- product descriptions
- uploaded certificates
- web pages
- customer messages
- retrieved documents

Tool permissions must be enforced outside the LLM.

Example:

```text
LLM says:
"Change inventory to 0."

Tool layer:
DENY — tool does not expose arbitrary inventory mutation.
```

---

# 44. OBSERVABILITY

The system should have structured observability across:

- frontend errors
- API latency
- database latency
- cache hit rate
- search latency
- AI latency
- model usage
- tool calls
- certificate processing
- WebAR errors
- WhatsApp webhook failures
- payment failures
- background jobs

AI interactions should be traceable without exposing unnecessary customer-sensitive data.

---

# 45. TESTING STRATEGY

Every major reconstructed capability must be validated against:

1. reverse-engineering evidence
2. representative source records
3. DYO examples
4. relationship data
5. route patterns
6. known uncertainties
7. business requirements

Testing layers:

```text
Unit Tests
    ↓
Domain Tests
    ↓
API Tests
    ↓
Integration Tests
    ↓
E2E Tests
    ↓
AI Evaluation
    ↓
Performance Tests
    ↓
Security Tests
```

---

# 46. AI EVALUATION

AI must have explicit evaluation datasets.

Test:

- factual correctness
- tool selection
- hallucination resistance
- price safety
- inventory safety
- certificate safety
- DYO recommendations
- escalation behavior
- refusal when evidence is insufficient
- citation/provenance where required

Do not evaluate AI only by whether responses "sound good."

---

# 47. PERFORMANCE TARGET

The architecture should be designed with a target of supporting at least approximately:

**50,000 users**

without making premature microservice complexity mandatory.

Design for:

- horizontal web scaling
- database connection management
- efficient queries
- Redis caching
- CDN delivery
- asynchronous processing
- background jobs
- controlled AI concurrency
- asset optimization

Actual capacity must ultimately be validated through load testing.

---

# 48. SCALABILITY PRINCIPLE

Scale based on bottlenecks.

Do not create:

```text
20 microservices
```

because the architecture diagram looks impressive.

Start with a modular application and extract services when:

- scale requires it
- deployment independence matters
- ownership boundaries require it
- failure isolation requires it
- performance requires it

---

# 49. FRONTEND DESIGN PRINCIPLES

The frontend should have a coherent design system.

Create reusable:

- typography
- spacing
- buttons
- cards
- forms
- filters
- product galleries
- price blocks
- specification tables
- certificates
- DYO controls
- AI chat
- AR entry points
- account components

Do not create isolated page-specific UI unless necessary.

---

# 50. SEO

SEO should be first-class.

Support:

- canonical URLs
- metadata
- Open Graph
- structured data
- sitemap generation
- robots directives
- product structured data
- breadcrumb structured data
- content metadata
- clean URLs

The reverse-engineered route structure should inform compatibility decisions.

---

# 51. ROUTING

Observed source routes should be preserved where beneficial.

However, do not blindly copy bad route classifications.

The replacement system should have:

```text
stable canonical route
redirect rules
slug normalization
SEO metadata
404 handling
```

Dynamic routes should resolve through the domain layer.

---

# 52. CMS ARCHITECTURE

Content should be structured.

Potential blocks:

```text
Hero
RichText
Image
ProductCollection
GemstoneCollection
FAQ
BuyingGuide
CertificateGuide
Video
CTA
Banner
```

The implementation AI should derive actual CMS requirements from the reverse-engineered page architecture before finalizing the CMS schema.

---

# 53. ADMIN ARCHITECTURE

Admin is a proposed replacement capability.

Potential modules:

```text
Dashboard
Products
Gemstones
Jewelry
Taxonomy
Inventory
Orders
Customers
DYO
Certificates
Content
Media
AI
Integrations
Audit Logs
```

Permissions should be role-based.

Do not claim these exact source admin screens existed.

---

# 54. MIGRATION STRATEGY

Migration should be staged.

```text
Source Evidence
      ↓
Raw Import
      ↓
Normalization
      ↓
Validation
      ↓
Canonical Domain
      ↓
Search Index
      ↓
Embeddings
      ↓
Production
```

Never directly transform source data into production tables without validation.

Maintain an import/staging layer for uncertain transformations.

---

# 55. SOURCE DATA VS TARGET DATA

Maintain a clear distinction:

```text
SOURCE
Natural Gemstones captured evidence

TARGET
New production application
```

Source fields may be messy.

Target fields should be normalized.

Do not destroy source values merely because the target schema is cleaner.

Where normalization occurs, preserve the original source value where useful.

---

# 56. HANDLING UNKNOWN SOURCE BEHAVIOR

If the reverse-engineering package says:

```text
UNKNOWN
```

the implementation AI must:

1. identify the missing requirement
2. check whether the business vision defines it
3. propose an implementation
4. label it INFERRED
5. document the decision
6. implement it consistently

Do not repeatedly redesign the architecture because an unknown source detail was discovered unless the new evidence materially changes the business goal.

---

# 57. ARCHITECTURE DECISION RECORDS

Important decisions should be recorded.

Example:

```text
ADR-001
Decision: PostgreSQL is the transactional source of truth.
Reason: Structured commerce domain + pgvector + full-text search.

ADR-002
Decision: Redis is cache/transient state only.
Reason: Avoid transactional divergence.

ADR-003
Decision: AI cannot directly mutate DB.
Reason: Safety and deterministic commerce operations.

ADR-004
Decision: WebAR remains client-side.
Reason: Camera/latency/privacy/performance.

ADR-005
Decision: DYO is modeled as a configuration domain.
Reason: Observed DYO patterns + extensibility requirement.
```

Once an architecture decision is locked, later changes must be deliberate.

---

# 58. ARCHITECTURE LOCK

The architecture produced from this document should become the implementation baseline.

The team should follow the approved architecture until:

- evidence proves it incorrect
- measurable performance requires change
- security requires change
- scalability requires change
- business requirements materially change

Do not redesign the entire system merely because a different technology looks interesting.

Technology changes require an explicit architectural reason.

---

# 59. DECISION HIERARCHY

When making implementation decisions, use:

```text
1. Explicit business requirement
2. Observed source evidence
3. Existing approved architecture
4. Security requirements
5. Data integrity requirements
6. Performance evidence
7. Scalability evidence
8. Developer experience
9. Technology preference
```

Do not let technology preference override business requirements or data integrity.

---

# 60. WHAT THE IMPLEMENTATION AI MUST PRODUCE

Before coding the production system, the implementation AI should produce and validate:

## Architecture

- system architecture diagram
- domain architecture
- deployment architecture
- data-flow diagrams
- AI architecture
- search architecture
- caching architecture
- asset architecture
- WebAR architecture

## Database

- ERD
- table definitions
- relationships
- indexes
- constraints
- migration strategy
- provenance strategy
- embedding strategy

## Backend

- module boundaries
- service boundaries
- API contracts
- validation
- authorization
- event model
- background jobs
- integration adapters
- error strategy

## Frontend

- route map
- page hierarchy
- component architecture
- design system
- state management
- data-fetching strategy
- loading/error states
- responsive behavior
- SEO strategy

## AI

- orchestrator architecture
- tools
- tool schemas
- RAG strategy
- embeddings
- model routing
- memory strategy
- guardrails
- evaluation
- human handoff

## Commerce

- cart
- checkout
- payment
- order
- refund
- inventory
- customer

## DYO

- configuration model
- compatibility engine
- pricing
- review
- persistence
- cart integration

## Trust

- certificate ingestion
- OCR
- confidence
- anomaly detection
- review
- provenance

## WebAR

- asset pipeline
- client runtime
- hand tracking
- 3D rendering
- optimization
- device fallback
- QR handoff

---

# 61. IMPLEMENTATION PHASES

Recommended implementation sequence:

```text
PHASE 0
Architecture validation
        ↓
PHASE 1
Database + domain foundation
        ↓
PHASE 2
Catalog + taxonomy + product APIs
        ↓
PHASE 3
Frontend storefront
        ↓
PHASE 4
Search + filters
        ↓
PHASE 5
Cart + checkout + account
        ↓
PHASE 6
DYO
        ↓
PHASE 7
Certificate intelligence
        ↓
PHASE 8
AI concierge
        ↓
PHASE 9
WhatsApp concierge
        ↓
PHASE 10
WebAR
        ↓
PHASE 11
Admin + CMS
        ↓
PHASE 12
Performance + security + observability
        ↓
PHASE 13
Production hardening
```

This sequence may be adjusted by the implementation AI after architecture analysis, but changes must be justified.

---

# 62. DEFINITION OF DONE

The rebuild is not complete merely because pages look similar.

A capability is complete when:

- source requirements are understood
- target architecture is documented
- schema supports the capability
- backend logic exists
- API contracts are stable
- frontend is implemented
- loading/error/empty states exist
- authorization exists
- tests exist
- observability exists
- source evidence is respected
- unknowns are explicitly handled
- performance is acceptable
- security requirements are met

---

# 63. FINAL IMPLEMENTATION PHILOSOPHY

Build a system that is:

**Evidence-grounded**

Do not hallucinate source behavior.

**Domain-driven**

Model gemstones, jewelry, DYO, commerce and certificates explicitly.

**AI-native**

AI is an orchestrator over trusted tools, not a database replacement.

**Search-native**

Combine structured filtering, full-text and semantic retrieval.

**Performance-aware**

Use CDN, Redis, Postgres optimization and asynchronous processing.

**Secure**

Tool permissions and transactional controls must exist outside the LLM.

**Scalable**

Design for the intended user scale without premature microservices.

**Maintainable**

Prefer clear modules and stable boundaries.

**Observable**

Every important operation should be traceable.

**Evolvable**

Technology should be replaceable behind interfaces.

---

# 64. MASTER RULE

The implementation team should always be able to answer:

> Why does this architecture decision exist?

The answer should point to one or more of:

- business requirement
- reverse-engineered evidence
- approved architectural principle
- security requirement
- performance measurement
- scalability requirement

If the answer is simply:

> "Because the AI thought it would be better."

the decision is not sufficiently justified.

---

# 65. FINAL CHARTER

This document, together with the `reverse_engineered/` package, is the architectural starting point for the new system.

The intended workflow is:

```text
Reverse Engineering
        +
Business Requirements
        +
Distinguishing Sauce
        +
Proposed Stack
        +
Architecture Constraints
        ↓
AI Architecture Analysis
        ↓
Approved System Architecture
        ↓
Schema
        ↓
Backend
        ↓
APIs
        ↓
Frontend
        ↓
AI Layer
        ↓
Search
        ↓
Caching
        ↓
DYO
        ↓
Certificates
        ↓
WhatsApp
        ↓
WebAR
        ↓
Testing
        ↓
Production
```

Once the architecture is approved, implementation should follow it consistently.

Changes should be driven by evidence, measurable requirements, security,
performance, scalability or explicit business changes — not by arbitrary
technology drift.

**This is the architectural source-of-truth for the rebuild.**
