# LESSONS

Durable lessons from the reverse-engineering and architecture phase. Each is
verified against a project document, not a recollection.

---

## 1. The catalogue was almost lost to a plausible-looking file

**Lesson: `products.jsonl` is NOT the catalogue. Migrate from `urls.jsonl`.**

The reverse-engineering package presented `products.jsonl` as the product
catalogue, with `product_type_counts.json` reporting `{"jewelry": 1245}`. It
holds 1,245 records — **2.4% of commerce URLs** — because the crawler's
classifier recognised only DYO pages.

**Why it is dangerous:** the file is named correctly, is internally consistent,
and parses cleanly. Migrating from it would have produced a working store with
1,024 products, and nothing would have errored. 33,934 commerce URLs would have
vanished without a single warning.

**Rule:** `urls.jsonl` is the migration spine. Join `specifications.jsonl` for
attributes and `pages_analyzed.jsonl` for prices and availability.

**Defence:** gate V14 reconciles per-family counts, and a permanent
catalogue-completeness regression test asserts all five source families are
present. Source: ADR-007, defect D1.

---

## 2. A single unrecognised suffix cost 865 SKUs

**Lesson: verify every count against a second, independent derivation.**

An earlier revision stated 9,484 setting variants. The parser used at the time
did not match the `SL` (Sterling Silver) suffix, so all 865 silver SKUs were
silently excluded. `10,349 − 865 = 9,484` exactly.

**Why it is dangerous:** the number was plausible, internally consistent, and
wrong. A parser that silently drops an unrecognised token produces a smaller
number, never an error.

**Correct value: 10,349.** If you encounter 9,484 anywhere, it is the defect,
not the truth.

**Rule:** every count needs a cross-check — a slug-parse pass rate, a weight-sum
check, a checksum. Source: `PROJECT_SOURCE_OF_TRUTH.md` §4.2, plan §35.1.

---

## 3. JavaScript bundles were counted as 3D assets

**Lesson: verify asset claims by content, not by filename substring.**

`three_d` (6,923) and `three_sixty` (855) asset classes were Nuxt JavaScript
bundles misclassified because hex filenames contained `3d` or `360`.

**Consequence if unfixed:** the project would have planned a WebGL asset
migration against 7,778 files that contain no 3D data, and would have believed
the source had a WebAR implementation it never had.

**Rule:** classify media deterministically from the path stem; never from
filename substring matching. JavaScript URLs are explicitly `SKIPPED`. Gate V16
halts on any asset classified from a `.js` URL. Source: defect D4, ADR-016.

---

## 4. Filenames prove existence, never contents

**Lesson: distinguish "the artefact exists" from "we know what is in it".**

Certificate, SARIN report and appraisal artefacts are provably present — the
strict path conventions `/stone/{ref}/cert/`, `/sarin/`, `/appraisal/` establish
it. But `crawler.sqlite.documents` holds **0 rows**. Lab name, certificate
number, issue date, treatment declaration and signature are all `[UNKNOWN]`.

**Why it matters:** an earlier draft implied no certificate artefacts existed.
That was wrong. The correction is not to invent a document schema; it is to
ingest artefact *existence* from paths and treat contents as unknown pending OCR
plus human review.

**Rule:** `[OBSERVED]` existence does not license `[OBSERVED]` contents. Source:
defect D6, ADR-011.

---

## 5. Price is not a weight calculation, and the gap must stay visible

**Lesson: when you cannot explain a number, name the gap rather than hiding it.**

`price == weight × per_carat` holds for **0 of 1,024** recovered prices. The
ratio `price / (weight × per_carat)` has median 2.269 and max 268.745.

The setting and making components are `[UNKNOWN]`. Design choice: a six-component
model with `settingComponent` named explicitly, rather than one opaque total.
Migrated residuals are derived, stored in `price_model_observations`, labelled
`[INFERRED]`, and never published without curator approval (gate V15).

**Why it matters:** an opaque total hides a 2× factor nobody can explain. A
named component makes the gap visible and closable. A learned model would launder
the residual into a prediction presented as a price.

**Rule:** price computation is deterministic, versioned and reproducible from a
snapshot. Money is `NUMERIC` end to end; **no floats in any price path**. Source:
ADR-010, NFR-06.

---

## 6. Concatenated multi-stone strings destroy verifiable invariants

**Lesson: model the physical reality, even when the source collapsed it.**

Pair records concatenate two stones' weights and dimensions into single strings
(defect D9). Splitting them into one `gemstone_stones` row per stone made two
previously impossible checks possible: per-stone weights sum to
`total_weight_ct` (verified 113/113), and `Ct.Tw.` in the slug equals that sum.

**Rule:** a lossy source format that is convenient to parse can still be the
reason a critical invariant cannot be enforced. Source: ADR-009, gates V8, V9.

---

## 7. Structurally valid, entirely empty data exists in the package

**Lesson: treat automated extraction output as untrusted until reviewed.**

`entities/gemstones/all_gemstones.json` is 11 KB of all-null objects. It has the
correct shape, the correct field names, and no data.

**Consequence:** this is the concrete argument that AI-generated extraction must
never write production rows unattended. Every AI proposal is recorded with
`provenance_kind='AI_SUGGESTED'` and `review_state='PENDING'`, and can never
publish directly. Source: `technical_design/23` §5.

---

## 8. Inferred identity must be stored separately, always

**Lesson: keep derived identifiers in dedicated columns behind a human gate.**

221 DYO URLs had failed fetches. Their SKUs are derivable from the grammar
(`JS{design}{metal}-{gemRef}`, verified 1,024/1,024) but were never observed.
They are zero duplicates of the observed 1,024, so they are 221 additional
distinct products.

Required state, enforced by gates V18, V19, V20 and INV-08:

- `source_sku` → `NULL`. **Never manufacture a source SKU.**
- `source_sku_derived` → the parsed value
- `sku_evidence_status` → `INFERRED`
- every attribute column → `NULL`
- `state` → `DRAFT`, unpublished

**Why the null-attribute rule is absolute:** for 3 of the 8 stones in the
captured subset, no stone-level record otherwise exists. Inferring weight,
colour or price from a sibling product would create data with no source at all,
wearing the costume of migrated data.

Source: ADR-008, `PROJECT_SOURCE_OF_TRUTH.md` §19.1.

---

## 9. 97.7% of the crawled HTML is worthless

**Lesson: check the yield before paying for the storage.**

42,928 of 44,173 crawled pages have no HTML at all (97.7%). Of the files that
exist, only **1,024** contain real content; the other 43,149 are 502 error
shells.

**Retention decision:** archive the 1,024 real files compressed (1.4 GB → roughly
15–20%). Dropping the error shells loses no evidence.

**WAL trap:** checkpoint `crawler.sqlite`'s WAL into the main file before
archiving, or the 26 MB `-wal` may hold committed rows absent from the main
file. Source: `technical_design/31` §2, plan §22.4.

---

## 10. Never silently promote INFERRED to observed

**Lesson: the label is the product.**

Every factual claim about the source carries an evidence status. `[UNKNOWN]` is
a **valid, final answer** — not a failure, not a gap to fill with a guess.

Why this is the load-bearing habit: in this domain the most damaging AI failure
is not an outage. It is a confidently stated invented origin or treatment that
nobody can audit. 911 of 1,024 products have **no structured stone type**, so the
refusal path is the common path, not the exception.

Unverifiable claims are **stripped, not softened.** "This is probably untreated"
is still an invented claim wearing a hedge. Source: NFR-06, `AGENTS.md` §4.

---

## 11. Preserve the provenance chain end to end

**Lesson: an unattributable value is an unfixable value.**

Every migrated row carries `evidence_status`, `source_url`, `import_batch_id`,
and where useful `raw_spec`. Every field must answer "where did this value come
from?"

**Why it matters:** without provenance a wrong value is merely wrong. With it, a
wrong value is traceable to the exact artefact and parser that produced it, and
therefore correctable. `docs/evidence/MANIFEST.md` records storage location,
SHA-256 and retention class per artefact, so provenance is checkable without
vendoring the data into Git. Source: NFR-08, `AGENTS.md` §9.

---

## 12. Preserve raw source values verbatim

**Lesson: normalise late, never during load.**

Staging loads verbatim. Normalisation happens only in the canonical stage.

**Why it matters:** normalising during load destroys the ability to answer "what
did the source actually say" — and the whole evidence discipline depends on being
able to ask that question. Source: plan §22.2, `technical_design/33` §1.

---

## 13. Inferred architecture is not observed behaviour

**Lesson: label target design as target design.**

The source's technology stack is `[UNKNOWN]`. The only observed technology fact
is that its frontend was Nuxt/Vue SSR (`/_nuxt/*.js` bundles). Everything in
`technical_design/02` is `[INFERRED]` target architecture.

The sharpest example: WebAR. `[VERIFIED]` the source contains **no WebGL or GLB
assets**. WebAR is entirely target architecture, not reconstructed behaviour,
and it is the largest cost risk in the project. Source: `technical_design/21` §1,
`technical_design/02` evidence status.

---

## 14. An empty `.gitignore` is a loaded gun

**Lesson: verify the ignore rule, do not assume it.**

`.gitignore` existed but was **0 bytes**. `naturalgemstones/` — 46,810 files — was
therefore untracked but **not ignored**, and appeared in `git status` as a
staging candidate.

**Fixed:** the archive is now explicitly ignored, verified with
`git check-ignore`. `.opencode/memory/` is explicitly *not* ignored, because it is
project memory and must reach GitHub.

**Rule:** verify with `git check-ignore <path>` after any `.gitignore` change.
Never rely on `git add .` not sweeping something in. Source: `.gitignore`,
`AGENTS.md` §13.

---

## 15. Report contradictions; do not silently fix them

**Lesson: a quietly corrected inconsistency destroys the audit trail.**

Four inconsistencies between the plan, the source of truth and the technical
design were found during validation and **reported rather than fixed**, because
fixing them required editing the authoritative plan:

1. Plan §35.2 says "no technology has been chosen" while ADR-021 names candidates
2. Plan task 9 uses enum counts (15 metals, 8 jewellery types) where observed
   counts are 14 and 5
3. Plan says "thirteen" AI evaluation dimensions where both other documents
   enumerate fourteen
4. Pre-ADR-022 wording survives in two places

Two genuine reference errors *were* corrected, because they were introduced
during this work and pointed at the wrong decision: `technical_design/39` cited
ADR-022 for AI evaluation tooling after ADR-022 was reassigned, and its
known-unknowns list had a duplicate row number.

**Rule:** correct your own errors immediately; report someone else's and let the
owner decide. Source: `SKILL_MATRIX_AND_TOOLING.md` §6.5, `CURRENT_STATE.md` §8.

---

## 16. Design tokens beat a one-time ORM choice for money

**Lesson: name the unknown component; do not paper over it.**

The setting component of price is `[UNKNOWN]`. The architecture names it as a
distinct column so it can be closed later, rather than hiding it inside a total
that nobody can audit or adjust.

The same pattern recurs throughout: `certificate_public` exists so the
verification rule is unbypassable; `price_model_observations` exists so a residual
is inspectable; `staging_conflicts` exists so a conflict is reviewable.

**Rule:** every "unknown" gets a named home. An unnamed unknown becomes an
assumption nobody notices. Source: ADR-010, `technical_design/16` §2.