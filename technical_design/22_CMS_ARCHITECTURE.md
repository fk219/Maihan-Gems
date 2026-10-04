# 22 CMS ARCHITECTURE

**Package:** `technical_design/` doc 22 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 22.
**Evidence status:** `[OBSERVED]` routes and JSON-LD; `[UNKNOWN]` the original CMS; `[INFERRED / PROPOSED]` the editorial workflow.

---

## Purpose

Define page content, block rendering, separation of content/SEO/navigation/presentation, the editorial workflow, and how published content feeds the AI knowledge base.

## 1. Evidence position

`[OBSERVED]` 25 functional routes including `/education` with 14 children, `/blog`, `/showroom`, `/meet-our-team`, `/michael-arnstein`, `/contact-us`, `/financing`, `/extend-protection-plan`. `[OBSERVED]` The source emitted `WebSite` and `LocalBusiness` JSON-LD with an address and phone.

`[UNKNOWN]` The original CMS platform, editorial workflow, publishing permissions and revision behaviour.

`[OBSERVED][DEFECT D5]` The package's `content/` directories are empty. No content was ever extracted. So the CMS must be built from observed routes and structure, not recovered from captured content.

## 2. Content model

`pages.blocks` holds a typed block array. Each block is `{ type, props, id, visibility }`. Rendering is one component per `content_block_type`, so a new block type is a migration plus one component.

| Block type | Used for | Evidence |
|---|---|---|
| `HERO` | home, education, variety landing | B |
| `RICH_TEXT` | long-form copy | B |
| `IMAGE`, `IMAGE_GALLERY` | editorial imagery | B |
| `PRODUCT_COLLECTION` | curated merchandise on a page | B |
| `GEMSTONE_COLLECTION` | curated stones on a page | B |
| `CATEGORY_GRID` | variety and colour indexes | E: route triplets |
| `FAQ` | FAQ pages | E: `/education/frequently-asked-questions` |
| `BUYING_GUIDE` | buying-guide pages | E: `/education/beginners-guide-to-buying-a-gemstone` |
| `CERTIFICATE_GUIDE` | explaining reports and certificates | E: `stone/{ref}/cert`, `sarin` paths |
| `COMPARISON_TABLE` | gemstone comparisons | B |
| `VIDEO` | the white-glove 360 video | E: `phone-video` |
| `CTA` | conversion blocks | B |
| `BANNER` | announcements | B |
| `TESTIMONIAL` | reviews | `[UNKNOWN]` in source |
| `SHOWROOM_CTA` | showroom funnel | E: `/showroom/preview` |
| `VEDIC_CTA`, `ASTROLOGY_CONTENT` | Vedic astrology vertical | E: `vedic` style, 860 settings |
| `CUSTOM_DESIGN_CTA` | DYO entry | E: `/design-your-own` |
| `CONTACT_CTA` | concierge and contact | E: `/contact-us` |

`TESTIMONIAL` is the only block type with no evidence in either direction. It is included because a jewellery storefront needs social proof, and it is marked as an explicit `[UNKNOWN]` so it is never presented as reconstructed.

## 3. Separation of concerns

| Concern | Stored in | Why separate |
|---|---|---|
| Content | `pages.blocks`, versioned in `page_revisions` | Copy changes on an editorial cadence |
| SEO | `seo_metadata` | SEO changes without touching copy, and is authored differently |
| Navigation | `navigations` | Navigation changes on a different cadence **and a different authorization path** from page content |
| Presentation | `template` plus the block renderer registry | Layout changes are a deployment, not an edit |

Navigation being on a different authorization path is the reason it is not embedded in page blocks: publishing a page must not silently alter global navigation.

## 4. Editorial workflow `[INFERRED / PROPOSED]`

```text
DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED
```

| Rule | Detail |
|---|---|
| `IN_REVIEW` | Requires a second approver for trust-bearing pages: `BUYING_GUIDE`, `CERTIFICATE_GUIDE`, `TREATMENT`-related copy |
| Why | These documents feed the AI knowledge base and therefore affect what the AI may assert |
| Publishing | Emits `PageUpdated`, invalidating the page cache and re-triggering RAG ingestion |
| Revisions | `page_revisions` retains every published state, enabling one-click revert |
| Archive | Removes from navigation and search, keeps the URL serving a redirect target |

The two-approver rule is a trust control, not a workflow preference. A single editor rewriting a buying guide silently changes what the AI is permitted to tell customers about treatments and certificates.

## 5. Knowledge integration

Published pages whose kind is `EDUCATION` or `FAQ`, plus variety descriptions, are chunked and embedded into `knowledge_documents` and `knowledge_chunks` (doc 19).

| Rule | Detail |
|---|---|
| `trust_tier` assigned at publication | Never inferred from content shape |
| Publish for humans, exclude from the AI corpus | A deliberate and necessary capability |
| Republish | Re-chunks and re-embeds only changed content, via checksum |
| Archive | Removes chunks from customer-facing retrieval immediately |

A page can be live for humans and invisible to the AI. That is the mechanism for publishing something correct-but-unindexed while its evidence is still being curated, and it is far cheaper than retracting a published page.

## 6. Validation rules

1. `pages.blocks` is valid JSON conforming to the block registry schema on every write.
2. Every block has a stable `id`, so revisions diff meaningfully.
3. Unknown block types fail validation; they are never silently dropped at render time.
4. `visibility` is an explicit boolean, defaulting to visible, never null.
5. `PUBLISHED` requires `seo_metadata.title` and a canonical URL.
6. Trust-bearing pages require two distinct approvers.
7. `seo_metadata` never carries a canonical that disagrees with the route map (doc 34).
8. Archived pages are excluded from navigation and search but keep a redirect target.

## 7. API

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/pages/{slug}` | public | published only; cached with Surrogate-Key |
| POST | `/pages` | `CONTENT_EDITOR` | creates DRAFT |
| PATCH | `/pages/{id}` | `CONTENT_EDITOR` | edits blocks, creates a revision |
| POST | `/pages/{id}/submit` | `CONTENT_EDITOR` | DRAFT to IN_REVIEW |
| POST | `/pages/{id}/approve` | `CONTENT_PUBLISHER` | IN_REVIEW to PUBLISHED; second approver required for trust-bearing |
| POST | `/pages/{id}/archive` | `CONTENT_PUBLISHER` | PUBLISHED to ARCHIVED |
| GET | `/pages/{id}/revisions` | `CONTENT_EDITOR` | revision history |
| POST | `/pages/{id}/revisions/{rev}/restore` | `CONTENT_PUBLISHER` | revert as a new revision |
| PUT | `/navigations/{key}` | `CONTENT_PUBLISHER` | separate authorization path |
| PUT | `/seo/{id}` | `CONTENT_EDITOR` | SEO without touching content |

## 8. Error handling

| Code | Status | Meaning |
|---|---|---|
| `PAGE_NOT_FOUND` | 404 | Unknown or archived slug |
| `INVALID_BLOCK` | 422 | Block fails the registry schema |
| `UNKNOWN_BLOCK_TYPE` | 422 | Type not in the registry; refused rather than dropped |
| `APPROVAL_REQUIRED` | 409 | Trust-bearing page needs a second approver |
| `SELF_APPROVAL_FORBIDDEN` | 409 | Approver equals author |
| `REVISION_CONFLICT` | 409 | Concurrent edit; refetch and rebase |
| `CANONICAL_CONFLICT` | 409 | SEO canonical disagrees with the route map |
| `AI_CORPUS_EXCLUDED` | 200 with flag | Page published but deliberately not indexed |

## 9. Security boundaries

- Content writes require `CONTENT_EDITOR`; publication requires `CONTENT_PUBLISHER`.
- Revisions are append-only; restore creates a new revision rather than rewriting history.
- Every publish, archive and restore writes an `audit_logs` row with before and after state.
- Block props are schema-validated, so no arbitrary HTML or script can be injected through content.
- Rich text stores a restricted markup subset; raw HTML is rejected, not sanitised silently.

## 10. Observability

Metrics: pages by state, publish throughput, review queue age, revision count per page, block-type usage, RAG ingestion lag after publish, 404 rate by slug, SEO metadata completeness. Alerts on review-queue age and on RAG ingestion lag (a published trust-bearing page whose chunks are not yet searchable is a grounding gap).

## 11. Testing requirements

| Test | Proves |
|---|---|
| Block registry | Every registered type renders; every unknown type is rejected |
| Schema validation | Malformed blocks and bad `props` fail on write |
| Stable ids | Revisions diff block-by-block |
| Two-approver rule | Trust-bearing pages cannot be self-approved; non-trust pages can |
| Emit on publish | `PageUpdated` fires and invalidates cache and RAG |
| Knowledge exclusion | An excluded page is absent from retrieval while still rendering publicly |
| Checksum ingest | Republishing unchanged content creates no new chunks |
| Archive | Page leaves navigation and search; the URL still resolves to its redirect target |
| SEO isolation | Editing SEO leaves blocks and revisions untouched |
| XSS | Script and event-handler payloads in rich text are rejected |

## 12. Failure modes

| Failure | Behaviour |
|---|---|
| Invalid block published | Validation refuses the write; the previous revision stays live |
| Concurrent edit | 409 with a rebase path |
| RAG ingestion lags | Alert; the page is live for humans, absent from AI answers, stated honestly |
| Navigation corrupted | Revisions allow revert; the storefront header has a static fallback |
| Trust content changed by one person | Blocked by the two-approver rule |
| Archival breaks inbound links | Redirect target retained; doc 34 governs the redirect |

## 13. Implementation constraints

1. One component per `content_block_type`; an unknown type fails loudly.
2. Content, SEO, navigation and presentation are separate concerns with separate authorization.
3. Trust-bearing pages require two approvers.
4. `trust_tier` is set at publication, never inferred.
5. A page may be published for humans and excluded from the AI corpus.

## Evidence status

`[OBSERVED]`: 25 routes, `/education` with 14 children, the `WebSite` and `LocalBusiness` JSON-LD, the route-derived block evidence codes, and D5 (empty `content/` directories). `[UNKNOWN]`: the original CMS platform, editorial workflow and revision behaviour, hence the `[INFERRED / PROPOSED]` label on section 4 and on `TESTIMONIAL`.