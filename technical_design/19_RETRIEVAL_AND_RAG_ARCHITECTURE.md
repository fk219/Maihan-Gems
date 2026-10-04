# 19 RETRIEVAL AND RAG ARCHITECTURE

**Package:** `technical_design/` doc 19 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 17, charter section 10.
**Related:** doc 12 (search) for the lexical layer, doc 18 (AI orchestration) for the grounding gate.

---

## Purpose

Define the retrieval corpus, trust tiers, chunking, hybrid retrieval, structured-versus-semantic routing and citation format.

## Evidence status

`[OBSERVED]` The source contains education, guide and FAQ content, and LLM-generated product descriptions `[VERIFIED]` 1,024 of 1,024 carry a description, so real prose exists to index.

`[INFERRED]` The entire RAG design, including chunk sizes and score weights. `[INFERRED]` per charter 10: vector search is never used to answer a transactional question.

## 1. Corpus and trust tiers

| Source | Trust tier | Ingest trigger |
|---|---|---|
| CMS pages: education, guides, FAQs | `CURATED` | on publish |
| Variety descriptions and care guides | `CURATED` | on publish |
| Treatment and enhancement guides | `CURATED` | on publish |
| Verified product data rendered as prose | `VERIFIED_PRODUCT_DATA` | generated from structured rows |
| Certificate knowledge: lab glossary, report anatomy | `CURATED` | authored |
| Customer or AI-generated text | `UNVERIFIED` | **not indexed for customer-facing answers** |

`trust_tier` is stored per document and per chunk, and is returned to the model. An `UNVERIFIED` chunk cannot be presented as authoritative even if it is retrieved, because its weight is 0.0.

Product descriptions are `[OBSERVED]` LLM-generated marketing prose and are therefore indexed as `VERIFIED_PRODUCT_DATA` only after human review, never as `CURATED`. Marketing prose that a model wrote is not a curator's statement, and treating it as one would let generated text launder itself into authority.

## 2. Ingestion

```text
Document created or updated
  -> chunk along heading hierarchy, 400-800 tokens, 15% overlap
  -> preserve heading_path for attribution
  -> content checksum; skip if unchanged
  -> embed in batches through the ModelGateway
  -> upsert knowledge_chunks with embedding + embedding_model
  -> emit KnowledgeDocumentUpdated
```

| Decision | Rationale |
|---|---|
| Chunk on heading boundaries | A retrieved chunk is a coherent, citable unit |
| 400-800 tokens, 15% overlap | `[INFERRED]`; tuned against the evaluation suite in doc 32, not by feel |
| `heading_path` stored | Required for an inline `[1] [2]` reference list |
| Checksum skip | Idempotent re-ingest; a republish with no content change costs nothing |
| Embedding model recorded per chunk | Enables a full re-embed when the model or dimension changes (ADR-018) |

Re-embedding is a full rebuild into a new dimension, never a mixed-dimension index. A mixed index silently degrades similarity and would be undetectable in testing.

## 3. Retrieval

Hybrid and weighted, with the trust tier as a multiplicative factor:

```text
score = ( 0.55 * cosine_similarity
        + 0.30 * ts_rank_cd
        + 0.15 * metadata_match ) * trust_tier_weight
```

| Component | Purpose |
|---|---|
| cosine 0.55 | Semantic recall for natural phrasing ("how do I choose a tsavorite") |
| `ts_rank_cd` 0.30 | Lexical precision for exact terms, gem varieties, reference numbers |
| metadata 0.15 | Taxonomy and intent alignment |

`trust_tier_weight`: `VERIFIED_PRODUCT_DATA` 1.0, `CURATED` 0.95, `COMMUNITY` 0.6, `UNVERIFIED` 0.0 (excluded from customer-facing answers entirely).

The lexical term carries 30% weight deliberately. Gemstone vocabulary is sparse and highly specific; a purely semantic index drifts on terms like "tsavorite", "pigeon blood" and "steenstrals".

**Access control is applied as a filter inside the query, never after retrieval.** Admin-only and customer-specific documents are excluded by `doc_kind` and ownership predicates in the SQL, so they cannot enter the candidate set at all and therefore cannot leak through the top-k window. Post-retrieval filtering is a data leak waiting for a sufficient k.

## 4. Structured versus semantic routing

The router decides which subsystem answers. This routing is what keeps the AI honest.

| Question type | Route | Example |
|---|---|---|
| Availability, stock, price, order status | deterministic SQL only | "Which blue tourmalines under $3000 do you have?" |
| Comparison of known entities | structured relational query | "Compare K1324 and K1335" |
| Factual product lookup | tool call | "What is the origin of K1324?" |
| Explanation, education, buying guidance | RAG | "How should I choose a tsavorite?" |
| Design advice spanning both | tools plus RAG | "Which pave setting suits a 1.28ct oval green tourmaline for an engagement ring?" |

Vector search is never used to answer a transactional question. A nearest-neighbour match cannot tell you whether a stone is available today, and an approximate answer to "do you have it in stock" is worse than no answer. Routing is enforced in code through the orchestrator's plan schema, not by prompt wording.

## 5. Answer composition

```text
<untrusted_knowledge>
[1] heading_path: Gems > Tourmaline > Care
    trust_tier: CURATED
    ...
</untrusted_knowledge>
```

Retrieved chunks enter the prompt inside a delimited, labelled untrusted block carrying `heading_path`, document slug and trust tier. The system prompt requires every claim to reference a chunk index; the grounding gate (doc 18 section 6) then verifies each citation resolves to a real chunk **and** that the claim is entailed by it.

Delimiting and labelling is the injection defence for retrieval, and it is the same mechanism used for product descriptions and certificate OCR output: retrieved text is data, never instructions.

## 6. Citation format

Inline `[1]`, `[2]`, with a reference list giving document title, heading path, slug and trust tier. Where a claim derives from a product rather than a document, it cites the product and links to it.

The UI renders citations as chips linking to the source. That is what makes "source-grounded product knowledge" credible rather than decorative: a customer can verify every claim in one click, which is the whole point in a domain where an invented origin is a legal and reputational problem.

## 7. Entities

| Table | Purpose |
|---|---|
| `knowledge_documents` | document, `doc_kind`, `trust_tier`, slug, locale, publish state, checksum |
| `knowledge_chunks` | doc, ordinal, content, `heading_path`, embedding, `embedding_model`, trust tier |
| `knowledge_embeddings_queue` | embed-out work, batched, with attempt count |

`trust_tier` is denormalised onto the chunk so retrieval needs no join to apply the weight, and so a document re-tiering can be audited per chunk.

## 8. Validation rules

1. `trust_tier` is one of `VERIFIED_PRODUCT_DATA`, `CURATED`, `COMMUNITY`, `UNVERIFIED`.
2. `UNVERIFIED` chunks are excluded from customer-facing retrieval by weight 0.0 and by an explicit predicate.
3. Every chunk has a non-empty `heading_path`.
4. Embedding dimension is uniform; a model change triggers a full rebuild.
5. Access predicates are present in the query; a post-retrieval ACL check is a review failure.
6. Every chunk carries the embedding model and prompt version that produced it.

## 9. Error handling

| Code | Status | Behaviour |
|---|---|---|
| `RAG_UNAVAILABLE` | 200 with flag | Structured tools still answer; knowledge portion states it is unavailable |
| `NO_RESULTS` | 200 | "I could not find that"; never a fabricated near match |
| `EMBEDDING_DIM_MISMATCH` | alert | Index rebuild required; retrieval disabled rather than degraded |
| `CHUNK_FAILED` | job dead-letter | Document still serves; the failed chunk is simply absent |

`RAG_UNAVAILABLE` degrades capability, not correctness. The AI keeps answering factual questions from structured tools.

## 10. Security boundaries

- Retrieval never returns admin-only or another customer's documents.
- Retrieved text is untrusted input and can never alter tool permissions.
- `UNVERIFIED` content is excluded from customer-facing answers.
- Prompts carry no credentials, connection strings or internal identifiers.

## 11. Observability

Metrics: retrieval latency by route, zero-result rate, top-k utilisation, score distribution, per-trust-tier hit share, re-embed backlog, citation survival rate after the grounding gate, refusal rate for knowledge questions. Alerts on a rising zero-result rate (corpus or embedding regression) and on any drop in citation survival (grounding regression).

## 12. Testing requirements

| Test | Proves |
|---|---|
| Chunking | No chunk crosses a heading boundary; overlap honoured; `heading_path` correct |
| Idempotent ingest | Unchanged checksum produces no new chunks and no embedding cost |
| Trust weighting | `UNVERIFIED` never appears in a customer-facing result set |
| ACL in query | An admin-only document is absent from the candidate set, not filtered afterwards |
| Lexical precision | Exact variety names and reference numbers retrieve correctly |
| Routing | Transactional questions never hit the vector path |
| Citation entailment | A claim not entailed by its chunk is stripped |
| Dimension change | A model change forces a rebuild; mixed dimensions are rejected |
| Injection | A chunk containing instructions cannot change behaviour |
| Evaluation suite | Grounded answers, refusal accuracy and citation coverage per question class |

## 13. Failure modes

| Failure | Behaviour |
|---|---|
| Vector store down | Structured tools still serve; knowledge portion flagged unavailable |
| Embedding dimension mismatch | Retrieval disabled with an alert; never silently wrong similarity |
| Bad chunking | Heading-boundary test fails in CI |
| Unverified content indexed | Weight 0.0 plus predicate; test asserts absence |
| Prompt injection in a chunk | Delimited, labelled untrusted; logged, inert |
| Re-embed backlog | Chunked deployment; old and new never mixed in one index |

## 14. Implementation constraints

1. Vector search never answers a transactional question.
2. Access control is a query predicate, never a post-retrieval filter.
3. `UNVERIFIED` content is excluded from customer-facing answers.
4. LLM-generated prose is never indexed as `CURATED`.
5. Every claim cites a chunk index, and the grounding gate verifies entailment.

## Evidence status

`[OBSERVED]`: real prose content exists, including 1,024 LLM-generated descriptions. `[INFERRED]`: corpus policy, chunk parameters, score weights, routing table and citation format. No source artefact describes a vector index, so no retrieval behaviour is reconstructible; the design is stated as proposed.