# 02 TECH STACK

**Package:** `technical_design/` doc 02 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 7 (proposed stack), section 29 (deployment).
**Evidence status:** `[INFERRED]` for every target technology. None is a claim about the source system.

---

## Purpose

Fix the exact technology set, its role, and the boundary each one occupies, so that no technology enters the build without a decision record.

## Locked stack

| Layer | Technology | Version target | Role | Boundary |
|---|---|---|---|---|
| Web framework | Next.js (App Router) | current LTS | Storefront, admin, AR route, route handlers | Rendering and HTTP only |
| Language | TypeScript | 5.x | All application and tooling code | n/a |
| Runtime | Vercel Node runtime | LTS | `apps/web`, `apps/worker` | Execution environment |
| Primary database | Neon PostgreSQL | 16+ | Transactional truth, full-text, vectors | `packages/db` only |
| Vector search | pgvector | 0.6+ | `vector(1024)` plus HNSW | Inside Postgres |
| Trigram search | pg_trgm | contrib | Typo tolerance | Inside Postgres |
| Diacritic folding | unaccent | contrib | Search normalisation | Inside Postgres |
| Case-insensitive text | citext | contrib | `customers.email` | Inside Postgres |
| Cache / transient | Redis | 7.x | Cache, rate limits, sessions, coordination, locks | Never truth |
| Object storage | Cloudflare R2 | - | Originals, renditions, private documents | `packages/ai`-free path |
| Image CDN | ImageKit | - | Format negotiation, resizing, delivery | Public imagery only |
| ORM / query layer | Drizzle ORM | current | Schema, migrations, typed queries | `packages/db` only |
| Validation | Zod | 3.x/4.x | DTOs, event schemas, config parsing | Edge of every boundary |
| AI gateway | Vercel AI Gateway, OpenRouter fallback | - | Model routing behind `ModelGateway` | `packages/ai` only |
| WhatsApp | Meta WhatsApp Cloud API | - | Channel | `integrations` module |
| AR hand tracking | MediaPipe HandLandmarker (WASM) | - | 21 landmarks | Browser only |
| AR rendering | Three.js + WebGL2 | - | PBR scene | Browser only |
| AR assets | Draco-compressed GLB, KTX2 textures | - | Geometry and textures | R2 + CDN |
| Observability | OpenTelemetry + Sentry-compatible error reporting | - | Traces, metrics, logs, errors | `packages/observability` |

## Development-only tooling

| Activity | Tool | Version | Package | Boundary |
|---|---|---|---|---|
| Visual feedback and browser annotations | Agentation | 3.1.2 | `apps/web` devDependency | Loaded only in development; no configured endpoint or MCP server |

Agentation is approved by ADR-025 solely for local development feedback. Its
browser component reads page DOM to create annotations; annotations remain
local unless a developer explicitly configures an endpoint. It is not part of
the storefront design system or production runtime.

## Explicitly NOT in the stack

| Rejected | Reason |
|---|---|
| Dedicated search engine (Meilisearch, Algolia, Typesense, Elasticsearch) | ADR-006. Measured catalogue is ~33,000 searchable entities; Postgres meets NFR-03 |
| Microservices | ADR-019. Modular monolith; extraction requires a named trigger |
| External vector database | ADR-001, ADR-018. Vectors live with transactional data |
| ORM beyond Drizzle | Source of Truth section 10.3 names Drizzle as the repository layer |
| GraphQL | Deferred decision. No over-fetching problem observed |
| Event broker (Kafka, RabbitMQ) | ADR-020. Transactional outbox in Postgres is sufficient at this scale |
| Redis as write-through store for orders | ADR-002. Never truth |

## Open technical decisions

| Decision | Status | Note |
|---|---|---|
| **Test runner, E2E driver, load-test tool** | **OPEN — ADR-021** | Source of Truth section 34 specifies test layers and required coverage but names no tool. Not selected here, to avoid introducing an unapproved technology. Must be decided at Phase 1 kickoff, before the first test is written |
| Component library / design system primitives | **OPEN — ADR-022 candidate** | Source of Truth section 12.4 specifies the component inventory but no library. Recommend building primitives in-repo rather than adopting one, but that is a decision to record |
| Migration-runner for raw HTML ingest | Deferred | Only if Phase 24 requires re-fetching the 502 shell pages |
| Email / transactional messaging provider | Deferred decision | Needed by Phase 6 notifications |

Nothing in the "NOT in the stack" table may be introduced without a new ADR superseding the referenced one.

## Tooling by activity

| Activity | Tool | Package |
|---|---|---|
| Lint, boundaries | ESLint with `no-restricted-imports` | repo root |
| Typecheck | `tsc --noEmit` across all packages | repo root |
| Unit / domain / integration tests | **OPEN — ADR-021** | per package |
| E2E | **OPEN — ADR-021** | `apps/web` |
| Load | **OPEN — ADR-021** | `tools/` |
| Schema migrations | Drizzle Kit | `packages/db` |
| Import pipeline | Custom CLI (Node) | `tools/migrate` |
| Secrets | Platform secret manager (Vercel env) | n/a |

## Dependency direction for packages

```
contracts  <- domain  <- db
config     <- everything
observability <- everything
ai         <- contracts, domain
```

`packages/domain` depends on no runtime package. This is what keeps invariants unit-testable without infrastructure.

## Versioning policy

- Application packages: exact versions, lockfile committed.
- Extensions: pinned to versions known available on Neon (16+ for the core; contrib extensions from the Neon standard image).
- Embedding model: single model, single dimension 1024 (ADR-018). A model change is a versioned re-embed job, not a schema change.
- 3D asset budgets: enforced as data, not as library versions.

## Inputs / Outputs

**Inputs:** Source of Truth sections 7, 11, 12, 14, 29, 35 (ADRs 001, 002, 006, 018, 019).
**Outputs:** the table above, which is the sole authority on "may I add this dependency".

## Validation rules

1. Any new runtime or development dependency requires an ADR and an entry in this document.
2. `packages/domain` may declare only Zod (if types need runtime parsing) and nothing else.
3. No provider SDK may be imported outside `packages/ai` (AI providers), `integrations` (WhatsApp, payments) and `packages/db`.
4. Browser-only libraries (MediaPipe, Three.js) may not be imported by any server bundle; the AR route enforces `ssr: false`.

## Testing requirements

A CI job asserts that the declared dependency sets of each package match this document. Drift fails the build.

## Failure modes

| Failure | Response |
|---|---|
| Undeclared dependency added | CI dependency-drift job fails |
| Browser library leaks into a server bundle | Build-time bundle analysis fails |
| Test toolchain chosen ad hoc | Blocked: ADR-021 must exist first |

## Implementation constraints

1. This table is closed. Additions require an ADR.
2. Removing a locked technology also requires an ADR superseding the original.
3. Extension availability must be confirmed on the target Neon instance before migration runs, since Phase 0 validated `citext`, `pg_trgm`, `unaccent` and `btree_gin` structurally only.

## Evidence status

`[INFERRED]` throughout. The source system's stack is explicitly `[UNKNOWN]` in Source of Truth section 4.5: the only observed technology fact is that the source frontend was Nuxt/Vue SSR (`/_nuxt/*.js` bundles, `[OBSERVED]`), which is a fact about the source and not a constraint on this build.