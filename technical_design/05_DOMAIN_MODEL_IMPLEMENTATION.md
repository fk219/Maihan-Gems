# 05 DOMAIN MODEL IMPLEMENTATION

**Package:** `technical_design/` doc 05 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 7 (domain model, glossary, INV-01..10), 19 (DYO), 26 (pricing).
**Evidence status:** `[INFERRED]` implementation of the locked model. Aggregate semantics trace to `[OBSERVED]`/`[VERIFIED]` source facts.

---

## Purpose

Define the aggregates, value objects, invariants and domain services as pure TypeScript, with the exact behaviour the locked schema constrains.

## Aggregates and roots

| Aggregate | Root | Bounded by | Invariants |
|---|---|---|---|
| Gemstone | `Gemstone` | one physical stone or one matched pair | INV-05, INV-07 (via documents) |
| Setting | `Setting` | one reusable design | none beyond identity |
| SettingVariant | `SettingVariant` | one design in one metal | INV-04 |
| Product | `Product` | one sellable unit | INV-01, INV-02, INV-03, INV-09 |
| DyoConfiguration | `DyoConfiguration` | one user configuration | INV-08 |
| Cart | `Cart` | one cart | none (commerce invariants) |
| Order | `Order` | one order | immutability after placement |
| Certificate | `Certificate` | one document | INV-07 |
| Conversation | `Conversation` | one thread | none |

Cross-aggregate references are by id only. A `Product` holds `settingVariantId`, never a `SettingVariant` object. This keeps aggregates independently loadable and prevents accidental lazy-loading graphs.

## Value objects

| Value object | Definition | Validation |
|---|---|---|
| `GemRef` | `K<digits>` or `PR<digits>` | regex `^(K\|PR)\d+$`; `isPair` derived from the prefix |
| `SourceSku` | observed SKU | must be uppercase-normalised; only ever set from an observed field |
| `DerivedSku` | parsed SKU | carries `DerivedSkuProvenance { method: 'URL_SLUG', parserVersion, confidence }` |
| `Sku` (composite) | `{ settingCore, metalCode, gemRef? }` | `metalCode` must resolve in `metals`; `gemRef` optional for setting-only SKUs |
| `MetalCode` | one of 15 enum members | `W10 Y10 R10 W14 Y14 R14 W18 Y18 R18 PT SL YW14 YW18 WY14 WY18` |
| `WeightCt` | `NUMERIC(8,3)` carats | positive; `Ct.Tw` total is a sum, never a parse of a single string |
| `DimensionsMm` | length, width, depth | each positive; depth <= min(length,width) is a WARN not an error, because source data is noisy |
| `Money` | `{ amount: string, currency: 'USD' }` | amount as a decimal string; **never a float** |
| `ConfigurationHash` | `sha256:<hex>` | recomputable; carries `hashVersion` |
| `EvidenceStatus` | one of 5 enum members | assigned at write, never inferred at read |

## The `DerivedSku` type (critical)

The locked architecture forbids manufacturing source SKUs. This is enforced in the type system, not by convention.

```ts
type ProductIdentity =
  | { kind: 'OBSERVED'; sku: SourceSku }            // from product.sku
  | { kind: 'DERIVED';  sku: DerivedSku };          // parsed from the URL slug

// Invariants enforced by construction:
//  - a DERIVED identity may never be written to products.source_sku
//  - a DERIVED identity requires sku_evidence_status = 'INFERRED'
//  - a DERIVED identity requires state = 'DRAFT'
```

`[VERIFIED]` Basis: the parser reproduces all 1,024 observed SKUs exactly, 0 mismatches (gate V19). `[VERIFIED]` The 221 records parse to 221 distinct SKUs, **0 of which collide** with the observed set (gate V20), so they are new products rather than duplicates.

## Invariant implementations

### INV-01, INV-02, INV-03 (product composition)

```ts
export function assertComposition(p: ProductComposition): void {
  if (p.kind === 'CONFIGURED') {
    if (!p.settingVariantId) throw new InvariantError('INV-01', 'setting_variant_id required');
    const hasStone = !!p.gemstoneId, hasPair = !!p.gemstonePairId;
    if (hasStone === hasPair) throw new InvariantError('INV-01', 'exactly one of gemstone_id or gemstone_pair_id');
  }
  if (p.gemstonePairId && p.jewelleryType !== 'EARRINGS')
    throw new InvariantError('INV-02', 'pair only on earrings');
  if (p.jewelleryType === 'EARRINGS' && p.kind === 'CONFIGURED' && !p.gemstonePairId)
    throw new InvariantError('INV-03', 'earrings require a pair');
}
```

`[VERIFIED]` Basis for INV-02 and INV-03: across the migrated evidence, `PR` references appear **only** on earrings (113 of 113) and `K` references only on ring (830), pendant (212) and necklace (90), with zero exceptions.

These are also database constraints. The domain check exists to produce a precise error message; the database constraint is the enforcement. Tests must prove the **database** rejects violations.

### INV-04 (metal)

```ts
// metalCode alone determines purity and colour. Purity and colour are never free text.
// Verified: 1:1 mapping between 14 SKU metal codes and slug phrases, no ambiguity.
```

### INV-05 (variety matches slug)

Applied at import: the variety parsed from the slug must equal the assigned `variety_id`. On mismatch the row is **quarantined**, not reassigned. `[VERIFIED]` Baseline 19,666 of 19,666.

### INV-06 (price reproducible)

```ts
export interface PriceBreakdown {
  gemstoneComponent: Money; settingComponent: Money; sideStoneComponent: Money;
  makingComponent: Money; discountComponent: Money; taxComponent: Money; total: Money;
  pricingRuleVersion: string;
}
```
A breakdown is produced only by `packages/domain/pricing`. Any total that cannot be produced from a breakdown is a bug.

### INV-07 (unverified never rendered as fact)

```ts
export function presentField(f: CertificateField): Presentation {
  if (f.verificationStatus === 'VERIFIED') return { value: f.value, badge: 'VERIFIED' };
  if (f.confidence < 0.50)              return { value: null, badge: 'WITHHELD' };
  return { value: f.value, badge: 'UNVERIFIED', confidence: f.confidence };
}
```
`[INFERRED]` The charter's worked example is encoded literally: origin `Nigeria` at confidence 0.54 yields `{ value: 'Nigeria', badge: 'UNVERIFIED', confidence: 0.54 }`, never `Origin: Nigeria` as fact.

### INV-08 (inferred identifiers gated)

A `DerivedSku` cannot reach a published state without an approval record. `assertPublishable` fails when `skuEvidenceStatus === 'INFERRED'` and no approval exists.

### INV-09 (stable slug)
Slug changes require a redirect row; `assertSlugChangeAllowed` enforces it.

### INV-10 (soft delete scope)
`assertDeletable(table)` throws for `orders`, `order_items`, `payments`, `refunds`, `order_events`, `audit_logs`, `domain_events`, `verification_events`, `conversations`, `messages`, `tool_calls`.

## Domain services (pure)

| Service | Input | Output | Notes |
|---|---|---|---|
| `SkuGrammar.parse` | url slug | `SkuComposition \| null` | validated 1,024/1,024 |
| `SkuGrammar.compose` | `{ designCore, metalCode, gemRef? }` | SKU string | inverse of parse |
| `StoneAttributeTokenizer` | raw spec string | `string[]` + `tokenCount` | fixes D9 doubled values |
| `DimensionParser` | `"Length: 9.84 Width: 7.82 Height: 5.32 ..."` | `DimensionsMm[]` | splits on the repeated `Length:` marker |
| `WeightParser` | `"2.87 Ct. 3.11 Ct."` | `WeightCt[]` | 1 token single, 2 tokens pair |
| `TotalWeightCalculator` | `WeightCt[]` | `WeightCt` | verified against `Ct.Tw.` for 113/113 pairs |
| `CompatibilityEvaluator` | configuration + rules | `CompatibilityResult` | see doc 14 |
| `PriceCalculator` | line items + rule version | `PriceBreakdown` | see doc 16 |
| `ConfigurationHasher` | canonical configuration | `ConfigurationHash` | see doc 14 |
| `EvidenceResolver` | row + field name | `EvidenceStatus` | drives AI refusal and UI badges |

## The D9 tokenizer (defect fix, D9)

`[VERIFIED]` 113 source records carry concatenated per-stone values: `"Blue Blue"`, `"Emerald Cut Emerald Cut"`, `"Length: X Width: Y Height: Z Length: X2 Width: Y2 Height: Z2"`, `"2.87 Ct. 3.11 Ct."`.

This is **not** a duplicate-render artefact. For pairs it genuinely describes two stones: the weights sum to the `Ct.Tw.` figure in the product name (113 of 113). Naive normalisation would create a facet literally named `Pink Pink`.

```ts
export function tokenizeStoneValues(raw: string, field: SpecField): TokenResult {
  // 'weight'      -> split on /([\d.]+)\s*Ct\./g        -> tokenCount 1 or 2
  // 'dimensions'  -> split on /Length:/g                  -> tokenCount 1 or 2
  // single-valued-> if value === value.trim().split(/\s+/)[0] repeated, tokenCount = 2 (a pair)
  //                else tokenCount = 1
}
```
`tokenCount` drives `gemstone_stones` row creation and `clarity_labels.is_doubled`.

## Evidence propagation

Every domain object carries the evidence status of its fields, because the AI layer and the UI both need it and neither may re-derive it.

```ts
interface Evidenced<T> { value: T; evidence: EvidenceStatus; sourceUrl?: string }
```

Rules:
- A value normalised from a source string is at most `EXTRACTED`.
- A value resolved by a validated parser from a slug is at most `EXTRACTED`.
- A value chosen by us is `INFERRED`.
- A value with no evidence is `null` with `UNKNOWN`, never a default.

## Dependencies

None. `packages/domain` imports only Zod (for runtime type parsing where needed).

## Validation rules

Enforced by the CI purity test (doc 03):
1. No SQL, no HTTP, no Redis, no config, no model SDK.
2. Every invariant has a unit test.
3. Every parser is pure and property-tested.
4. Money is a decimal string; a float type appearing in a price path fails review.

## Error handling

`InvariantError { code, message, details }` where `code` is one of `INV-01`..`INV-10`. Distinct from `DomainError` (business rule failure) and from the transport error envelope (doc 07).

## Security boundaries

The domain package holds no identity, no session and no credential. It cannot read customer data. It receives plain values and returns plain values, which is why the same logic is safe to call from the AI layer, the worker and the admin.

## Observability

Domain services are pure, so they emit no telemetry directly. Callers wrap them in a span named `<domain>.<service>` with the input hash and outcome. Never log raw customer input.

## Testing requirements

| Test | Proves |
|---|---|
| INV-01..INV-10 unit tests | Each invariant rejects its violation |
| Parser corpus test | 1,024/1,024 SKU round-trip |
| Tokenizer test | All 113 doubled records tokenise to 2 |
| Weight sum test | 113/113 pairs match `Ct.Tw.` |
| Metal mapping test | 14 codes, 1:1, no code maps to two phrases |
| Money test | No float appears in any price path |
| Purity test | Zero forbidden imports |

## Failure modes

| Failure | Response |
|---|---|
| Invariant violated in domain | Throw `InvariantError`; transaction aborts |
| Invariant violated at the database | 422; alerts, because it should be unreachable |
| Parser regression | Property test fails; import halted at gate V1/V2/V3 |

## Implementation constraints

1. Domain code never imports I/O. This is the load-bearing rule of the whole architecture.
2. No invariant is implemented only in application code.
3. No derived value is written to an observed column.
4. Money is `NUMERIC` end to end, decimal string in TypeScript.

## Evidence status

`[INFERRED]` for all code. `[OBSERVED]`/`[VERIFIED]` for every domain rule that rests on measured source behaviour, each cited inline above. Ring size, engraving and side stones have **no** source evidence and therefore have no domain behaviour in this document; see doc 14 section "Out of scope".