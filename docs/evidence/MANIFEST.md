# Migration Evidence Manifest

**Task:** Phase 1, Task 3 (`INITIAL_IMPLEMENTATION_PLAN.md` §36 task 3)
**Authoritative definition:** `INITIAL_IMPLEMENTATION_PLAN.md` §22.3; `technical_design/31` §2A (retention class A — "Must remain permanently"); `technical_design/03` (manifest location)
**Verification timestamp (UTC):** 2026-10-07T08:21:53+00:00
**Verified by:** read-only byte-level inspection and SHA-256 of the archive present in this environment. No value is copied from prior documentation; every checksum below was computed from the actual file bytes during this run.

---

## 1. Purpose

This manifest records, for every migration-critical source artifact: its actual
storage path, its SHA-256 digest, its retention class, why it is
migration-critical, and the consequence of its loss. It provides provenance
without vendoring the source evidence into Git.

- The source archive is **read-only**. It is never modified by any tool in this
  repository, including during manifest generation.
- The archive is **intentionally excluded from Git** (`.gitignore`), because it
  contains ~3 GB of evidence that would make the repository unusable. Git LFS is
  not used (`INITIAL_IMPLEMENTATION_PLAN.md` §22.4).
- The archive **must exist in durable external object storage** with checksum
  verification, and must be **reachable read-only** when migration/import runs
  (`INITIAL_IMPLEMENTATION_PLAN.md` §22.3). This Codespace copy is one restore
  of that archive; the durable copy is authoritative.
- Every checksum in this file is **machine-verifiable** against that archive:
  `sha256sum <path>` must reproduce the recorded digest exactly.

## 2. Archive location

| Item | Value |
|---|---|
| Archive root (repository-relative) | `naturalgemstones/` |
| Present in this environment | Yes |
| Files in archive (this run) | 46,810 |
| Total archive size (this run) | 3,069,038,249 bytes (~3.0 GB) |
| Git status | Untracked; excluded by `.gitignore` (verified — see §7) |
| Durably retained copy | Required — durable external object storage, outside Git |

## 3. Retention classification

The retention classes used here are the ones defined by the authoritative
documents, not invented for this manifest. `technical_design/31` §2 divides
evidence retention into classes A–E and places **every artifact in this
manifest in class “A. Must remain permanently.”** `INITIAL_IMPLEMENTATION_PLAN.md`
§22.3 adds the operational requirement:

> retained in durable object storage with checksum verification, reachable
> read-only at import time, and **not** vendored into Git.

Class A therefore means, for every row in §4:

- durable external archive/object storage — **REQUIRED**
- reachable read-only when migration/import is executed — **REQUIRED**
- checksum-verifiable against this manifest — **REQUIRED**
- GitHub repository — **EXCLUDED**

## 4. Migration-critical artifacts

Twelve physical files implement the ten authoritative logical entries of
`INITIAL_IMPLEMENTATION_PLAN.md` §22.3. The `crawler.sqlite` family is three
physical files recorded as separate rows under one logical artifact (hashes are
never combined); `report.json` and `appraisal.json` are two physical files under
one logical entry.

| # | Artifact | Actual path | Size (bytes) | SHA-256 | Retention | Why critical | Loss consequence |
|---|---|---|---:|---|---|---|---|
| 1a | `crawler.sqlite` | `naturalgemstones/crawler.sqlite` | 158,937,088 | `47efd08b7ffb25e66026affddcaa630e2cb4f4ca33fd7fb99722a458ca1aa2f2` | A — must remain permanently | Only relational source of truth for the captured crawler state; `documents`, `links`, `media_assets` are 0 rows but their **schema** is the only record of what the crawler intended to capture | Cannot re-derive without a re-crawl; parts of the source are unreachable, so a re-crawl cannot recover them. Amended 2026-10-08 — see §10 |
| 1b | `crawler.sqlite-wal` | `naturalgemstones/crawler.sqlite-wal` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | A — must remain permanently | Part of the indivisible SQLite evidence unit; may contain committed rows absent from the main file (see §5) | Committed rows present only in the WAL are lost, and the main file alone cannot be trusted as complete. Amended 2026-10-08 — see §10 |
| 1c | `crawler.sqlite-shm` | `naturalgemstones/crawler.sqlite-shm` | 32,768 | `fd4c9fda9cd3f9ae7c962b0ddf37232294d55580e1aa165aa06129b8549389eb` | A — must remain permanently | Part of the indivisible SQLite evidence unit; retained alongside WAL for integrity | Loss of the index alone is not evidence loss, but removing it breaks the unit's integrity verification. Amended 2026-10-08 — see §10 |
| 2 | `urls.jsonl` | `naturalgemstones/reverse_engineered/data/urls.jsonl` | 30,487,158 | `4da9a6decbeeb5627e525e06819deee35a8eb9583b3d722e94039b16c1d264c4` | A — must remain permanently | **The migration spine.** All 44,218 URLs, including the 33,934 commerce URLs absent from `products.jsonl` | **Catalogue unrecoverable.** 33,934 commerce URLs are destroyed |
| 3 | `specifications.jsonl` | `naturalgemstones/reverse_engineered/data/specifications.jsonl` | 4,910,327 | `1413cf64e7dc22f10ebcafb8f94ebf244cfe11a075d1b4e87fde504a27b212d3` | A — must remain permanently | The 13 attribute fields for 1,024 products, and the D9 concatenated values | **Attributes unrecoverable** |
| 4 | `pages_analyzed.jsonl` | `naturalgemstones/reverse_engineered/data/pages_analyzed.jsonl` | 468,158,614 | `63dbb1ee6ba9366ce79e7f70985e659bdd492c94a94a8995b95ec32976da71ea` | A — must remain permanently | **The only source of price, availability and JSON-LD** | **All 1,024 prices permanently lost** (defect D8) |
| 5 | `products.jsonl` | `naturalgemstones/reverse_engineered/data/products.jsonl` | 929,149 | `972238d7e2a6801a64a85a7f74bd13f8727d0eaea41339e21e85f550a39480c9` | A — must remain permanently | Observed `product.sku` ground truth for the 1,024-record corpus | Cannot validate the SKU grammar parser (gates V3, V19) |
| 6 | `media_analyzed.jsonl` | `naturalgemstones/reverse_engineered/data/media_analyzed.jsonl` | 179,221,878 | `369a55756f5dfcb6b8296e5c63b0184a3648b29a59e4550290d260446f20bb09` | A — must remain permanently | Asset URL inventory with host and path stem; basis for path-stem asset classification (ADR-016) | Asset classification impossible |
| 7 | `taxonomy.json` | `naturalgemstones/reverse_engineered/data/taxonomy.json` | 25,959 | `275d9352ea92311a21cab1d6d96ce036779ba10ea259ec44c30418fe1a8a555e` | A — must remain permanently | Field value distributions with counts; seeds reference data and validates normalizers | Facet seeding loses its evidence basis |
| 8a | `report.json` | `naturalgemstones/reverse_engineered/entities/media/report.json` | 21,216 | `0994c5ce4edf989e7543cde2d1dfa9d96e6b18daf65a4c9d85c21a6b1e3d836f` | A — must remain permanently | Only structured evidence that certificate/report artefacts exist (defect D6) | Certificate seed lost |
| 8b | `appraisal.json` | `naturalgemstones/reverse_engineered/entities/media/appraisal.json` | 42,022 | `d2e5a929b10fdaa370bb8b16cd2971a00d834029a737d3851c7c9875da97a089` | A — must remain permanently | Only structured evidence that appraisal artefacts exist (defect D6) | Certificate seed lost |
| 9 | `source_snapshots/manifest.jsonl` | `naturalgemstones/reverse_engineered/raw/source_snapshots/manifest.jsonl` | 23,986,007 | `d40bcb9fa7e95726eaab1350d3d926b84a771181843a1959f0f34929a954a450` | A — must remain permanently | HTML SHA-256 hashes, enabling integrity verification of any re-crawl | Cannot prove a re-crawl captured the same content |
| 10 | `PROJECT_SOURCE_OF_TRUTH.md` | `PROJECT_SOURCE_OF_TRUTH.md` | 315,740 | `ff40ea8f9325ac9c7264bbba35d1bf222a9da64a45ce64983b036056ae06a50c` | A — must remain permanently | The durable architecture authority; supersedes all other documents for implementation questions. The only entry tracked in Git (repository root, not in the archive) | Architecture lost |

### 4.1 Path disambiguation (recorded so the same mistake is not repeated)

Two logical artifacts have similarly named files elsewhere in the archive. The
authoritative documents (`INITIAL_IMPLEMENTATION_PLAN.md` §22.3,
`technical_design/31` §2A) fix the canonical paths and sizes; the manifest uses
those paths only.

| Candidate path | Size | Disposition |
|---|---:|---|
| `naturalgemstones/reverse_engineered/data/products.jsonl` | 929,149 | **Canonical** (matches the documented 929 KB; class A) |
| `naturalgemstones/exports/products.jsonl` | 910,603 | Not a manifest entry — `technical_design/31` §2B lists `exports/*` as class B, “redundant with the JSONL datasets and `crawler.sqlite`” |
| `naturalgemstones/reverse_engineered/data/taxonomy.json` | 25,959 | **Canonical** (matches the documented 26 KB; class A) |
| `naturalgemstones/reverse_engineered/architecture/taxonomy/taxonomy.json` | 249 | Not a manifest entry — different, smaller file; not the referenced artifact |

## 5. SQLite WAL state (observed, read-only)

**SUPERSEDED by Amendment A2 (§10), recorded 2026-10-08.** The pre-amendment
observations below are retained verbatim as part of the historical evidence.

The three SQLite files were inspected **byte-level only**. No SQLite library was
invoked, no connection was opened, and no `PRAGMA wal_checkpoint` was executed —
this task must not modify the source archive in any way.

| File | Observed |
|---|---|
| `crawler.sqlite` | Valid SQLite 3 database. Page size 4096. Header write/read version bytes = 2/2 → **the database is in WAL mode**. Change counter 8182; last written by SQLite 3.45.1 |
| `crawler.sqlite-wal` | Valid WAL file (magic `377f0682`, format 3007000, page size 4096 matching the DB, checkpoint sequence 1). **26,157,912 bytes ≈ 6,349 frames** of content |
| `crawler.sqlite-shm` | Present, 65,536 bytes. Its wal-index header does **not** correspond to the current WAL (salt mismatch) — consistent with a stale index left by the terminated crawler process. Checkpoint progress cannot be determined from it |

**WAS THE WAL CHECKPOINTED? — NOT BY THIS TASK, AND NOT VERIFIABLY BY ANYONE.**

- This task **did not** checkpoint the WAL, did **not** open the database, and
  did **not** modify the archive.
- The WAL is **non-empty at 26 MB**; a checkpoint would normally reset it to
  zero length. There is no byte-level evidence that a checkpoint has occurred,
  and the stale `-shm` cannot prove otherwise.
- Therefore the documented risk stands: **the `-wal` may hold committed rows
  absent from the main database file** (`technical_design/31` §2A;
  `.opencode/memory/LESSONS.md` §9).
- Consequence for migration work: the three files must be **retained and
  restored together as one indivisible evidence unit**. If a checkpoint is ever
  needed, it must be performed on a **disposable copy** — never in place.

## 6. Source archive safety

- The archive is **read-only evidence**. This task performed only read operations.
- The archive is **not committed** and must never be staged
  (`AGENTS.md` §5; `git add .`/`git add -A` are prohibited by `AGENTS.md` §6).
- **No file inside the archive was created, modified, renamed or deleted** during
  manifest generation. Proven: the pre/post inventory shows an identical file
  count (46,810) and identical total size
  (3,069,038,249 bytes), all 13 artifact hashes are stable
  across the run, and `git status` reports nothing for the archive path.
- All working files for this task were written **outside** the archive
  (`/tmp`), and no checksum or report file was created inside it.

## 7. Git exclusion verification

```
$ git check-ignore -v naturalgemstones/
.gitignore:19:/naturalgemstones	naturalgemstones/
```

The archive is ignored by an explicit rule and is untracked. It must remain so.

## 8. Verification summary

*(Snapshot of the verification performed at manifest generation — 13/13 digests
then matched. The 2026-10-08 state of the `crawler.sqlite` evidence unit is
recorded by Amendment A2, §10, which re-verified all other physical artifacts.)*

| Check | Result |
|---|---|
| Required artifacts found | **13 / 13 physical files** (10 logical entries) |
| Artifacts missing | **0** |
| SHA-256 checksums generated from actual bytes | **13 / 13** |
| Checksum failures | **0** |
| Checksums stable across the verification run | **13 / 13** |
| Archive file count before / after | 46,810 / 46,810 — unchanged |
| Archive size before / after | 3,069,038,249 / 3,069,038,249 bytes — unchanged |
| Archive modifications detected | **0** |
| Archive Git-ignored | **Yes** (§7) |
| Secrets in this manifest | **0** — relative paths, digests, sizes and retention metadata only |

## 9. How to verify this manifest

From the archive root's parent directory (the repository root):

```
sha256sum naturalgemstones/crawler.sqlite \
          naturalgemstones/crawler.sqlite-wal \
          naturalgemstones/crawler.sqlite-shm \
          naturalgemstones/reverse_engineered/data/urls.jsonl \
          naturalgemstones/reverse_engineered/data/specifications.jsonl \
          naturalgemstones/reverse_engineered/data/pages_analyzed.jsonl \
          naturalgemstones/reverse_engineered/data/products.jsonl \
          naturalgemstones/reverse_engineered/data/media_analyzed.jsonl \
          naturalgemstones/reverse_engineered/data/taxonomy.json \
          naturalgemstones/reverse_engineered/entities/media/report.json \
          naturalgemstones/reverse_engineered/entities/media/appraisal.json \
          naturalgemstones/reverse_engineered/raw/source_snapshots/manifest.jsonl
```

Each digest must match the SHA-256 column in §4 exactly (lowercase hex).
`PROJECT_SOURCE_OF_TRUTH.md` is verified the same way from the repository root.

---

## 10. Amendment A2 — crawler.sqlite evidence unit (recorded 2026-10-08)

This amendment is NOT a re-derivation, re-crawl, normalisation or repair of any
source value. It records that the three physical files of the `crawler.sqlite`
evidence unit changed **physical byte layout** on **2026-10-07 20:15:30 UTC**
during Phase 2 work, while the **logical content remained complete and
equivalent** to every recorded baseline (proof below). No other manifest entry
is affected: all ten other physical artifacts were re-hashed on 2026-10-08 and
are byte-identical to their recorded digests.

### 10.1 What happened (incident record, first person — the migration agent)

During the GT17 media census the migration agent ran a one-off read of the
crawler database with the `sqlite3` CLI:

```
sqlite3 naturalgemstones/crawler.sqlite "SELECT count(*) FROM assets WHERE url LIKE '%.js';"
```

The CLI opens a database read-write. On the last connection close, SQLite
performed a **WAL checkpoint** (TRUNCATE mode): all committed frames of the
26,157,912-byte WAL (≈ 6,349 frames of 4,120 bytes = 24-byte frame header +
4,096-byte page) were merged into the main database file, the WAL file was
truncated to 0 bytes, and the shared-memory index (`-shm`) was rewritten
(now 32,768 bytes). `AGENTS.md` §5 forbids exactly this ("modify crawler.sqlite
including its -wal / -shm files"). The archive's own §5 warning ("a checkpoint
must be performed on a disposable copy — never in place") describes the
precaution this read skipped. The fault belongs to the Phase 2 migration agent,
not to the archive, the manifest generation, or any upstream task.

### 10.2 The original recorded values, preserved verbatim as historical evidence

These are the digests and sizes recorded at manifest generation (§4 rows 1a–1c
before this amendment). They are NOT invalidated as facts about the pre-incident
state; they no longer describe the current physical bytes.

| File | Recorded size (bytes) | Recorded SHA-256 |
|---|---:|---|
| `crawler.sqlite` | 158,924,800 | `bc469757f9f59395bd1704a89d6ad5aee45a9ed83f84d04b25a9e58b4a0eb27e` |
| `crawler.sqlite-wal` | 26,157,912 | `f49422f596d77be91687a80111ff0c54542d4d4c9e4218ef6e9831d6f9226fb0` |
| `crawler.sqlite-shm` | 65,536 | `5d4b2b5a92d7b7830ac5dbeed08aff1d8649801bc436aab0d5f3a269300a5c32` |

### 10.3 Current values (verified 2026-10-08, read-only)

| File | Size (bytes) | SHA-256 |
|---|---:|---|
| `crawler.sqlite` | 158,937,088 | `47efd08b7ffb25e66026affddcaa630e2cb4f4ca33fd7fb99722a458ca1aa2f2` |
| `crawler.sqlite-wal` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `crawler.sqlite-shm` | 32,768 | `fd4c9fda9cd3f9ae7c962b0ddf37232294d55580e1aa165aa06129b8549389eb` |

The main file grew by exactly **12,288 bytes = 3 appended 4,096-byte pages**;
the remaining WAL frames overwrote existing pages in place (hence the changed
digest at an almost unchanged size). The database header's journal-mode bytes
changed from WAL (2/2) to delete/non-WAL (1/1) and the change counter advanced —
physical journal bookkeeping, not data.

### 10.4 Why the change is non-semantic to any recorded baseline

A SQLite WAL checkpoint **merges** committed frames into the database file; it
is lossless for committed data by construction — the reviewer's fear in §5
("committed rows present only in the WAL are lost") describes *discarding* the
WAL, which did not happen. The checkpointed main file is a logical **superset**
of the pre-checkpoint main file. The logical content was then verified
exhaustively, read-only, with an immutable connection
(`file:...?immutable=1` — no lock, no write, no checkpoint possible):

| Verification | Result | Recorded baseline |
|---|---|---|
| `PRAGMA integrity_check` | `ok` | — |
| assets | 180,545 | 180,545 (SoT §4.3) |
| pages | 44,173 | 44,173 (SoT §4.3) |
| products | 1,245 | 1,245 (SoT §4.3) |
| specifications | 12,401 | 12,401 (SoT §4.3) |
| urls | 44,218 | 44,218 (SoT §4.3) |
| sitemaps | 4 | 4 (SoT §4.3) |
| crawl_errors / documents / links / media_assets | 0 / 0 / 0 / 0 | 0 (SoT §4.3) |
| Total rows, 10 data tables | **282,586** | **282,586 (SoT §4.3, exact)** |
| `sqlite_sequence` (SQLite-internal) | 3 rows | (not a data table) |
| JavaScript-asset census (defect D4) | 7,776 | 7,776 |
| `PRAGMA freelist_count` | 0 | — |
| Schema of all 11 tables (incl. `documents`, `links`, `media_assets`) | intact; schema SHA-256 `acd38c59d3a11415d30c7ceafdfc1871cbab2a21ac76e95fc0a4b60ef349f3da` | semantics per §4 row 1a |

Row counts post-checkpoint **exactly equal** every census recorded in
`PROJECT_SOURCE_OF_TRUTH.md` §4.3. Had the WAL contained committed rows beyond
that baseline they would now be IN the main file and the counts would have
grown; they did not change. The verifiable conclusion: the checkpoint moved
data from WAL into the main file and the logical content equals the recorded
state — nothing was lost, nothing was added, nothing was altered at row level.
What changed is byte layout and journal bookkeeping only.

### 10.5 Why the original bytes could not be restored

Restoration was attempted-first per the Phase 2 closeout procedure. The archive
is deliberately Git-excluded (`AGENTS.md` §5; verified §7), it is not vendored,
and a filesystem-wide search on 2026-10-08 found **no second copy** of any
`crawler.sqlite*` file in this environment. A byte-exact reversal of the
checkpoint would require re-separating merged pages from the current file —
i.e. fabricating physical bytes — which is prohibited. Recrawling is
unreachable (SoT §4.4). The evidence-manifest therefore records the current
state as the checkable truth, with the original digests preserved above, so
that the manifest's REQUIRED property — artifacts are checksum-verifiable
against this manifest — remains true instead of permanently violated.

### 10.6 Standing rule going forward

Every future read of a SQLite file under the archive must use a read-only,
immutable connection (`file:<path>?immutable=1`, Python
`sqlite3.connect` with a `mode=ro&immutable=1` URI) or `sqlite3 -readonly`.
The `sqlite3` CLI default, `VACUUM`, `PRAGMA journal_mode` changes, schema
operations and any other write-capable access are prohibited. Do not regenerate
or "repair" the archive: it is evidence.

### 10.7 Other-artifact re-verification (2026-10-08)

`urls.jsonl`, `specifications.jsonl`, `products.jsonl`, `taxonomy.json`,
`report.json`, `appraisal.json`, `pages_analyzed.jsonl`, `media_analyzed.jsonl`
and `raw/source_snapshots/manifest.jsonl` were re-hashed after the incident and
match §4 exactly (Prefixes recorded: `4da9a6de…`, `1413cf64…`, `972238d7…`,
`275d9352…`, `0994c5ce…`, `d2e5a929…`).
