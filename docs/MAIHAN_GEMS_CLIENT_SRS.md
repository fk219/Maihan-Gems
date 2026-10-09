# FKodelabs
## Maihan Gems - Software Requirements Specification

- **Prepared by:** FKodelabs
- **Prepared for:** Maihan Group
- **Project:** Maihan Gems
- **Document version:** 1.1
- **Date:** 8 October 2026

**Status:** Client scope baseline

## 1. Executive Summary

Maihan Gems is being rebuilt as a complete luxury gemstone and jewellery commerce platform based on the validated public-facing evidence of the Natural Gemstones business. It will bring together a reconstructed gemstone catalogue, matched gemstone pairs, jewellery settings, ready-made pieces, and a guided Design Your Own (DYO) experience in one customer and business system.

This is more than a conventional online shop. Customers need to discover and compare distinctive stones, understand what is known about each item, configure compatible jewellery, and complete a dependable purchase. The business also needs practical tools to manage products, pricing, inventory, content, customer requests, certificates, and orders. Search, preserved URLs, AI-assisted gemological guidance, customer communication, and optional virtual try-on extend that experience.

The platform includes an AI-powered gemstone advisory layer designed to behave as a commercially useful gemological assistant, not a generic chatbot. It supports product discovery, comparison, recommendation, and customer education using approved catalogue facts and verified business data. This capability helps move the platform beyond a static storefront into a premium digital buying and advisory experience.

The project outcome is a coherent digital platform that turns the reconstructed catalogue and business evidence into a discoverable, trustworthy, and operable shopping experience. It will preserve useful links and relationships from the existing ecosystem while making gaps in source information visible rather than presenting guesses as facts.

The target platform is delivered in dependency-led stages. This SRS defines its client-facing requirements, but does not set a delivery schedule or assert that every later-stage capability will be available in the first public release. The commercial proposal or statement of work defines the contracted release boundary.

## 2. Business Objectives

1. Deliver a refined, responsive shopping experience consistent with a premium gemstone brand.
2. Make a broad and varied gemstone and setting catalogue easier to browse, filter, compare, and understand.
3. Enable guided custom jewellery discovery through compatible stone, pair, setting, and metal choices.
4. Support a safe purchase journey with clear pricing, customer accounts, orders, and staff oversight.
5. Give authorised staff practical control of catalogue data, inventory, content, approvals, and customer operations.
6. Preserve the value of existing URLs and source-to-catalogue relationships during reconstruction and migration.
7. Use AI and document intelligence to assist customers and staff without replacing verified business facts or human approval.
8. Establish a maintainable platform that can be expanded without treating uncertain source information as confirmed.

## 3. Project Scope

The workstreams below describe the intended platform. They will be sequenced around their dependencies; provider decisions, source-data limitations, and client-supplied assets may affect the depth or timing of individual capabilities.

| Workstream | Client-facing outcome | Delivery note |
|---|---|---|
| 1. Customer Storefront | Premium, responsive pages for the home, categories, products, settings, education, and customer journeys. | Uses approved brand identity, images, and content. |
| 2. Gemstone Catalogue | Reconstructed catalogue for loose gemstones, matched pairs, settings and metal variants, configured products, and ready-made jewellery. | Product facts retain evidence status; coverage varies by source record. |
| 3. Search & Discovery | Keyword search, relevant filters, category discovery, and comparison tools. | Search behaviour and ranking are target capabilities, not claims about the original site's internal search. |
| 4. Design Your Own | Guided jewellery configuration, compatibility feedback, saved designs, and a route to purchase. | Compatibility and pricing depend on approved business rules and validated catalogue data. |
| 5. E-commerce | Cart, checkout, payment hand-off, order records, and customer-facing purchase information. | Payment, tax, shipping, and refund rules require client decisions and provider access. |
| 6. Customer Accounts | Registration/sign-in, profile and address management, saved items/designs, and order history or tracking. | Migration of legacy customer accounts or order history is not assumed. |
| 7. Admin & Operations | Staff tools for catalogue, inventory, pricing, orders, customer requests, approvals, and operational review. | Admin roles and workflows are new capabilities; no source admin system has been established. |
| 8. CMS | Editorial management for approved pages, guides, navigation, and SEO content with review and publishing controls. | Existing page copy was not recovered; client-approved copy and policy content are dependencies. |
| 9. AI Gemologist | Conversational gemstone guidance, catalogue-backed product cards, comparisons, and guided DYO selection with human hand-off where appropriate. | Depends on approved knowledge content, catalogue data, and deterministic DYO/pricing services. |
| 10. Certificate Intelligence | Secure document handling, field extraction, cross-checks, and human review before a claim is treated as verified. | Document formats and certificate fields are not established by the source evidence. |
| 11. WhatsApp Concierge | A customer support channel using the same approved guidance and escalation rules as the website. | Requires an approved provider account, credentials, business setup, and consent rules. |
| 12. WebAR / Virtual Try-On | On-device try-on for supported devices and products with approved, suitable 3D assets. | Conditional on 3D model production, fit data, and device validation; the source contains no usable 3D models. |
| 13. Migration & SEO | Reconstruct and migrate the evidenced catalogue and media, map existing URLs, and preserve search visibility through appropriate redirects and metadata. | Records are migrated according to evidence and validation rules; unknown information is not manufactured. |
| 14. QA, Deployment & Handover | Verification, agreed user acceptance testing, production deployment, and operational handover. | Requires client approvals, production access, and all launch-critical business decisions. |

## 4. Functional Requirements

Each statement below describes a business outcome for the target platform. The acceptance tests and release staging will be agreed against the contracted scope.

### Storefront, Catalogue & Discovery

**FR-01.** Customers shall be able to browse loose gemstones, gemstone pairs, jewellery settings, configured jewellery, and ready-made products.

**FR-02.** Customers shall be able to browse relevant category and variety pages, including gemstone colour and jewellery-type collections where supported by the catalogue.

**FR-03.** Customers shall be able to filter catalogue results using available attributes such as gemstone variety, colour, origin, shape, weight, treatment, style, metal, and price.

**FR-04.** Search shall accept customer terms, support agreed spelling variations and synonyms, and return useful suggestions when a search produces no suitable results.

**FR-05.** Product detail pages shall present available specifications, price and availability status, images, and certificate/document status without implying that missing or unverified data is confirmed.

**FR-06.** Customers shall be able to view product imagery and use text descriptions or status labels where visual presentation alone would omit important information.

**FR-07.** Customers shall be able to save favourites and compare selected products where those products have comparable information.

### Design Your Own

**FR-08.** Customers shall be able to start a design from an eligible gemstone or pair and view settings that have been approved as compatible.

**FR-09.** The configurator shall enforce the agreed jewellery compatibility rules and explain when a combination is unavailable or not yet verified.

**FR-10.** Customers shall be able to select supported setting and metal options and review the resulting configuration.

**FR-11.** A configured design shall display a current, server-validated quote before it is added to the cart; the platform shall not derive an unsupported price from weight alone.

**FR-12.** Customers shall be able to save, share, or resume a supported design, subject to the approved account and configuration rules.

### E-commerce & Customer Accounts

**FR-13.** Customers shall be able to add eligible catalogue products and validated configurations to a cart and review item and order totals.

**FR-14.** Customers shall be able to check out as a guest or signed-in customer; checkout shall collect required information and provide a final order review.

**FR-15.** The checkout shall use a client-selected payment provider and shall report the provider's payment outcome clearly to the customer.

**FR-16.** The platform shall revalidate price and availability before order placement and shall require the customer's confirmation if a displayed total changes.

**FR-17.** Authorised staff shall be able to review orders and perform the cancellation, refund, and fulfilment actions approved by the business.

**FR-18.** Customers shall be able to register or sign in, manage supported profile and address information, and view their saved items and order history.

**FR-19.** The platform shall provide clear customer-facing order status or tracking information to the extent supported by the approved fulfilment process.

### Admin, Operations & CMS

**FR-20.** Authorised staff shall be able to find, review, and update catalogue records and their publication status.

**FR-21.** Authorised staff shall be able to manage inventory and prices according to client-approved rules, with changes attributable to an authorised user.

**FR-22.** Staff shall be able to review and resolve data-quality issues, inferred identifiers, and migration conflicts before affected records are presented as confirmed.

**FR-23.** The admin experience shall provide role-appropriate access to products, settings, orders, customer requests, documents, content, and operational queues.

**FR-24.** Privileged staff actions shall be recorded for review, and catalogue changes affecting multiple records shall support a preview before application.

**FR-25.** Editors shall be able to create and revise approved marketing, education, and customer-information pages using managed content components.

**FR-26.** The CMS shall support review and approval before publishing trust-sensitive content, as well as navigation, page metadata, and revision history.

**FR-27.** Staff shall be able to view agreed operational indicators and outstanding review work relevant to catalogue, order, content, and customer support operations.

### Migration, SEO & Customer Guidance

**FR-28.** The migration shall use the validated source URL inventory and related evidence to reconstruct catalogue entities and their relationships; it shall not treat the flat product export as the complete catalogue.

**FR-29.** The platform shall preserve existing routes where practical and provide a reviewed redirect mapping for routes that change, including relevant query parameters.

**FR-30.** Public pages shall support editable page titles, descriptions, canonical URLs, sitemap inclusion, and structured search metadata where the content is supported.

**FR-31.** The AI Gemologist shall provide conversational, preference-led gemstone discovery and comparison, display catalogue-backed product cards, and guide customers through DYO choices using existing eligible stones/pairs, settings, and metals. Product cards shall reference real catalogue items and be rendered from approved product data; guided designs remain subject to deterministic compatibility and pricing rules.

**FR-32.** AI responses shall be grounded in deterministic product and search information, shall identify or cite their supporting information where appropriate, and shall refuse or escalate when required facts are absent or unverified.

**FR-33.** AI shall not directly change authoritative prices, stock, orders, payments, certificates, or permissions.

### Trust, Communication & Advanced Experience

**FR-34.** Authorised users shall be able to submit supported certificates and reports for extraction and review; extracted fields shall remain unverified until the required human approval is recorded.

**FR-35.** Where enabled, WhatsApp shall provide customer assistance through the same approved product guidance and escalation rules as the website, subject to the selected provider's policies and client consent settings.

**FR-36.** Where approved 3D assets and supported devices are available, customers shall be able to launch an optional virtual try-on with a clear non-AR product-viewing alternative.

## 5. Key Customer Journeys

**A. Browse and purchase a gemstone.** A customer browses a category, opens a product page, reviews available specifications and evidence status, adds the item to the cart, confirms current price and availability, completes checkout, and receives an order record.

**B. Search and filter inventory.** A customer enters a gemstone or jewellery need, refines results using available filters, reviews matches and comparisons, and opens a suitable product.

**C. Configure jewellery using DYO.** A customer selects an eligible stone or pair, reviews approved compatible settings, chooses supported options, and receives an explanation if a requested combination is not approved.

**D. Add configured jewellery to cart and checkout.** The selected configuration is validated and priced using the approved rules, added to the cart, rechecked before purchase, and submitted through the configured payment process.

**E. Use an account and track an order.** A customer signs in, views saved products or designs, and checks the order information made available through the approved fulfilment process.

**F. Manage products and orders as staff.** An authorised staff member searches for a record, reviews its evidence and current status, applies a permitted update, and leaves an attributable operational record.

**G. Get AI-assisted gemstone guidance.** A customer describes a preference or question; the concierge retrieves relevant products or approved knowledge, explains only supported facts, and offers human assistance when information is insufficient.

**H. Submit and review a certificate.** An authorised user submits a supported document, the platform extracts and cross-checks available fields, a reviewer resolves flagged items, and only approved information is presented as verified.

## 6. Migration & Data Preservation

Reconstructing the existing Natural Gemstones ecosystem is a core part of the project value. The migration is based on the complete validated URL inventory and corroborating source files, not on a single incomplete product export. Catalogue identity, evidence provenance, route relationships, and useful media references are preserved where the source supports them.

| Source finding | Client-facing interpretation |
|---|---|
| **44,218 source URLs** were recorded. | The URL inventory provides the migration and route-mapping baseline. |
| **33,934 commerce URLs** are absent from the 1,245-record `products.jsonl` export. | That export is not the catalogue; migration must reconstruct catalogue families from the wider evidence. |
| The URL inventory contains **19,665 loose gemstone entities**, **3,072 gemstone pairs**, and **10,349 setting variants across 951 designs**. | The target catalogue represents stones, pairs, designs, and metal variants as distinct but related business items. |
| **9,812 DYO configuration URLs** were observed; **1,024** have captured product SKUs and **221** have derived identity only. | The migration preserves observed and derived identity separately; a derived identity is not treated as a confirmed product record. |
| **88 ready-made products** were observed. | These form a separate catalogue family. |
| **241,961 media records**, including approximately **44,480 product-media records**, were inventoried. | Media will be classified and migrated according to relevance, availability, and approved usage rights; the raw record count is not a promise that every record is a usable product image. |
| Captured price evidence exists for **1,024 products**. In all 1,024 cases, price did not equal weight multiplied by price per carat. | Captured prices can be reconciled for those records; other prices and the underlying setting-price rules require client-approved decisions rather than simple extrapolation. |

For clarity, migration information is handled in three evidence categories:

- **Observed or verified:** present in source records and checked against the validated inventory. This includes the counts above and captured prices for 1,024 products.
- **Derived or inferred:** deterministically parsed or proposed from source patterns. The 221 identity-only DYO records are inferred and remain unpublished until reviewed; derived attributes are not silently promoted to verified facts.
- **Unknown or incomplete:** not established by the available evidence. Product specifications, live stock, historical customer/order records, business rules, certificate fields, and content may be partial or unavailable. The platform will retain these gaps for review rather than fabricate values.

The source reported `InStock` for all 1,024 priced products but did not establish per-item live inventory. That observation is not treated as a current stock feed. Similarly, the available evidence does not establish an export of original customer accounts or transaction history, so migration of those records is not included unless the client supplies a valid source and authorises its use.

## 7. SEO, Performance, Security & Quality

- **URL continuity:** Existing route shapes will be retained where appropriate. Changed routes will use a reviewed permanent or temporary redirect as applicable; useful query parameters will not be discarded without an agreed mapping. Removed routes will not be sent to unrelated pages as a substitute.
- **Search visibility:** Public pages will support descriptive metadata, canonical URLs, sitemaps, and structured data based only on approved facts. Redirects and key routes will be verified before launch.
- **Responsive and accessible experience:** Customer-facing flows will support mobile, tablet, and desktop layouts. The accessibility target is WCAG 2.2 AA, including keyboard-operable purchase journeys, visible focus, text alternatives, and no reliance on colour alone.
- **Performance:** The project targets a 75th-percentile Largest Contentful Paint below 2.5 seconds on product and category pages. Search targets are below 400 ms at the 95th percentile for filtered search and below 800 ms when semantic reranking is used. These targets are verified against an agreed test environment and representative test conditions; no unmeasured capacity claim is implied.
- **Security and privacy:** Customer and business data will be access-controlled. Privileged actions will be auditable; private documents will not be exposed as public files; payment and messaging callbacks will be validated before processing. Camera frames used for virtual try-on will remain on the device.
- **Quality assurance:** Catalogue counts, migration relationships, route mappings, pricing safeguards, accessibility, security controls, and supported customer journeys will be tested. Issues will be prioritised by severity, with critical and high-severity defects resolved before acceptance.
- **Monitoring and operation:** The deployed platform will include agreed operational monitoring and handover information. Monitoring providers, alert recipients, and production environment access depend on client provisioning and approval.
- **Production release:** Deployment will occur to the client-approved production environment after launch-critical decisions, credentials, content, and acceptance gates are complete.

## 8. AI & Advanced Features

**AI Gemologist.** This is a prominent product-discovery and guided jewellery-design experience, not a simple chatbot or scripted FAQ. It helps customers express preferences, understand and compare gemstones, explore real catalogue products through product cards, and work through a DYO design assembled from eligible catalogue items. The application renders cards from actual catalogue records and approved media; model output is not business truth. Compatibility, pricing, availability, and purchase actions remain under deterministic application control.

The assistant is disclosed as AI and must not claim to be a human or credentialed gemologist. Missing, stale, or unverified facts result in an explicit unknown/refusal or human handoff. The AI does not create new sellable products, jewellery images/renders, 3D models, or manufacturing-ready bespoke designs. Those are outside this defined scope unless separately approved.

**Certificate intelligence.** Certificate and appraisal artefacts are present, but their complete field schema is unknown. Extraction and comparison are therefore decision-support capabilities. A human reviewer must approve material certificate claims before they are displayed as verified; lab integrations are not assumed.

**WhatsApp Concierge.** The WhatsApp channel is a customer-support extension of the same grounded concierge, not a separate decision system. Its enablement depends on the client's approved business account, provider access, credentials, consent requirements, and any required message templates. Broadcast marketing campaigns are not included in this scope baseline.

**WebAR / virtual try-on.** The source contains no usable 3D models. Virtual try-on therefore depends on creation or supply of suitable jewellery models, fit data, rights to use those assets, and testing on supported devices. The experience is optional and must have a usable non-AR alternative. The quantity of models and any asset-production service must be confirmed in the commercial scope; it is not implied by catalogue migration.

## 9. Deliverables

1. A responsive Maihan Gems customer storefront and reconstructed, evidence-labelled catalogue.
2. Search, discovery, comparison, and product-detail experiences for supported catalogue families.
3. A guided DYO experience using client-approved compatibility and pricing rules.
4. Cart, checkout, payment-provider integration, customer accounts, and order-facing journeys as defined by the approved business rules.
5. Staff-facing administration and CMS capabilities for the contracted workstreams.
6. The source URL and catalogue migration, with reconciliation, provenance, and reviewed redirects.
7. Contracted AI Gemologist with catalogue-backed product cards and guided DYO assistance; certificate intelligence, WhatsApp, and WebAR remain subject to the dependencies and conditions in this SRS.
8. QA evidence, agreed UAT support, production deployment, and handover documentation.

## 10. Assumptions, Dependencies & Client Responsibilities

The client will provide, approve, or arrange access to the following as applicable:

- Brand guidelines, logos, approved product and lifestyle imagery, and rights to use all supplied or migrated assets.
- Approval of catalogue presentation, source-data corrections, publication decisions, and any inferred records.
- Product pricing, pricing formulae, compatibility rules, inventory practices, currency, and commercial disclosures.
- The selected payment provider and credentials, plus tax, shipping, discount, refund, and order policies.
- Legal, privacy, returns, warranty, and customer-facing policy content.
- Approved page copy, education content, product descriptions, and translation decisions. Existing page copy was not recovered; multilingual delivery is not part of this baseline.
- Payment, hosting, analytics, monitoring, and production environment access needed for the agreed deployment.
- WhatsApp business account, selected provider access, credentials, consent requirements, and approved message templates if that channel is enabled.
- Representative certificate/report examples and approval rules for any certificate-intelligence workflow.
- Suitable 3D models, model-production approval, fit information, and supported-device criteria if WebAR is to be enabled.
- Timely decisions and review of deliverables, data exceptions, and user acceptance results.

Missing or late client inputs can prevent dependent functionality from being completed, verified, or deployed. A dependency does not authorise the project team to invent a provider, commercial rule, product fact, or asset.

## 11. Acceptance Criteria

The project or contracted release will be eligible for acceptance when:

1. The agreed requirements for that release have been implemented and demonstrated.
2. Migration counts, data relationships, provenance handling, and URL mappings pass the agreed reconciliation checks.
3. Critical and high-severity defects under the agreed severity criteria are resolved; remaining lower-severity items are documented and dispositioned with the client.
4. Agreed user acceptance testing is completed and the client records its outcome.
5. Launch-critical business decisions, access, and content dependencies are resolved or explicitly excluded from the accepted release.
6. The agreed release is deployed to the approved production environment.
7. Handover documentation and access information agreed for the release are provided.

## 12. Scope Control & Change Requests

This SRS is the baseline for the stated requirements and assumptions. New features, major workflow changes, new third-party integrations or customer channels, materially different business rules, new data sources, additional languages, expanded 3D asset production, or a change in acceptance conditions may affect effort, dependencies, and cost.

Such changes require a written change request and commercial approval before work begins. A dependency, open client decision, or conditional capability described here is not approval to substitute an unselected provider, assume unavailable data, or expand the agreed release.

## 13. Project Summary / Sign-Off

Signing below confirms that the parties have reviewed this SRS as the requirements baseline for the scope and release boundary stated in the commercial proposal or statement of work.

| Sign-off item | Details |
|---|---|
| Sender | FKodelabs |
| Recipient / Client | Maihan Group |
| Project | Maihan Gems |
| SRS Version | 1.1 |
| Authorised Representative (FKodelabs) |  |
| Client Representative |  |
| Signature |  |
| Date |  |
