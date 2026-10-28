# 42 SEMANTIC CODE ARCHITECTURE

**Status:** Approved design (owner-approved 2026-10-28, session batch "Semantic Codes + Vendors").
**Companion to:** `technical_design/41_FRESH_CLEAN_DATABASE_DESIGN.md` (schema) and ADR-035 (fresh clean database).
**Purpose:** every identifier on the platform is a **readable document** — from the code alone you can tell what the item is, which family/variety, and which vendor supplied it. This document is the single reference for that system.

---

## 1. Anatomy — how to read a code

```text
G - COR - RUB - AE 014 - 00317
│    │     │     │  │      └─ unique number (scope: type + variety + vendor)
│    │     │     └──┴─ vendor: AE = country (Dubai) · 014 = vendor #14 in country
│    │     └─ variety code: RUB = ruby (3–4 letters, unique)
│    └─ family code: COR = corundum
└─ type: G = gemstone single
```

## 2. Master formats — every entity, every case

| # | Entity | Format | House (HQ) example | Vendor example |
|---|---|---|---|---|
| 1 | Gemstone single | `G-{FAM}-{VAR}-{CC}{VV}-{NNNNN}` | `G-QUA-AME-HQ-00412` | `G-COR-RUB-AE014-00317` |
| 2 | Matched pair | `P-{FAM}-{VAR}-{CC}{VV}-{NNNNN}` | `P-BER-AQU-HQ-00021` | `P-COR-SAP-TH009-00012` |
| 3 | Setting | `S-{JT}-{DSGN}-{MET}-{CC}{VV}` | `S-R-JS1003-PT-HQ` | `S-R-D0912-W18-TH009` |
| 4 | Jewellery — configured | `J-{JT}-C-{MET}-{CC}{VV}-{NNNNN}` | `J-E-C-W14-HQ-00001` | — (configured is always house-assembled) |
| 5 | Jewellery — ready-made | `J-{JT}-M-{MET}-{CC}{VV}-{NNNNN}` | `J-R-M-HQ-00042` | `J-N-M-AE014-00087` |
| 6 | DYO configuration (runtime) | `DYO-{NNNN}` | `DYO-0031` | — |
| 7 | Vendor | `V-{CC}-{NNN}` | `V-HQ-000` (code segment only; DB keeps `vendor_id NULL` = house) | `V-AE-014`, `V-TH-009` |
| 8 | Vendor's own reference | vendor's own format | — | `RB-123` — **vendor portal/admin only; never shown on the storefront** |

**Legend**

| Symbol | Meaning |
|---|---|
| `G` / `P` / `S` / `J` / `DYO` / `V` | gemstone single / pair / setting / jewellery / configuration session / vendor |
| `{FAM}` | family code, §4 (3 letters) |
| `{VAR}` | variety code, §5 (3–4 letters, unique) |
| `{JT}` | jewellery type: R ring · E earring · P pendant · N necklace · B bracelet · X nose ring |
| `{DSGN}` | design code (grouping of one design across metals) — legacy series `JS####`, new designs continue the numeric series |
| `{MET}` | metal code: PT · SL · W10/Y10 · W14/Y14/R14 · W18/Y18/R18 · YW14/WY14 · YW18/WY18 (§ 41 §4.3) |
| `{CC}` | vendor country, ISO-2 (AE, TH, IN, US…). `HQ` = house |
| `{VV}` | vendor number within that country (3 digits) |
| `C` / `M` in jewellery | **C**onfigured (setting + stone assembled by us) · **M**ade (ready-made, supplied whole) |

## 3. Worked examples (live, from the loaded database)

```text
G-00001 → G-QUA-AME-HQ-00412      Purple Amethyst 2.28ct Trillion (house amethyst #412)
P-00001 → P-QUA-SPN-HQ-00001      Pink Spinel pair 7.48ct (3.610 + 3.870, dims stored per piece)
S-00001 → S-R-JS1003-PT-HQ        Pave Ring Setting, Platinum 950 (house)
J-00001 → J-E-C-R14-HQ-00001      Halo Blue Aquamarine Earring 5.98Ct.Tw., 14K Rose Gold — $7,213
            ├── setting: S-E-JS1383-R14-HQ   (design JS1383, 14K Rose Gold)
            └── pair:    P-BER-AQU-HQ-00005  (Blue Aquamarine pair 5.98ct)
J-01155 → J-E-M-Y14-HQ-01155      Gemstone Drops 0.51ct Earring Round 14K Yellow Gold (ready-made)
```

**Composition trace (the "Dubai stone + Thailand setting" case):**

```text
J-E-C-W14-HQ-00001
 ├── S-R-D0912-W18-TH009   → vendor V-TH-009 (Thailand), vendor_ref "SET-991"
 └── G-COR-RUB-AE014-00317 → vendor V-AE-014 (Dubai),    vendor_ref "AQ-5521"
```
One join answers "which vendor's stone and which vendor's setting are in this piece"; both vendors find their item by their own reference.

## 4. Gemstone families — the 11 family codes

| Code | Family | Covers (non-exhaustive) |
|---|---|---|
| `QUA` | Quartz | citrine, amethyst, rose/smoky/rutilated quartz, prasiolite, ametrine, aventurine, tiger's eye, agate, carnelian, onyx, bloodstone (chalcedony) |
| `BER` | Beryl | emerald, aquamarine, morganite, heliodor, goshenite, red beryl |
| `COR` | Corundum | ruby, sapphire (all colours incl. padparadscha — colour is an attribute) |
| `GAR` | Garnet | garnet + rhodolite, tsavorite, hessonite, demantoid, spessartite, almandine, malaya, grossular, mali, andradite |
| `TOU` | Tourmaline | tourmaline, paraíba, rubellite, chrome |
| `FEL` | Feldspar | moonstone, labradorite, sunstone, amazonite, andesine |
| `SPI` | Spinel | spinel, cobalt spinel |
| `CHB` | Chrysoberyl | chrysoberyl, alexandrite, cat's-eye chrysoberyl |
| `TOP` | Topaz | topaz, imperial topaz, precious topaz |
| `SIN` | Single-species | diamond, peridot, zircon, turquoise, opals, tanzanite, jade, lapis, fluorite, and the rare/species stones |
| `ORG` | Organic | pearl, coral, amber |

## 5. Variety code registry (86 varieties)

Existing 76 (cleaned from the source routes) + 10 owner-added. Codes are unique across the whole variety registry (collision-checked at mint).

| Code | Variety | Family | Source |
|---|---|---|---|
| CIT | citrine | QUA | cleaned |
| SPN | spinel | SPI | cleaned |
| TRM | tourmaline | TOU | cleaned |
| AME | amethyst | QUA | cleaned |
| MON | moonstone | FEL | cleaned |
| GRN | garnet | GAR | cleaned |
| AQU | aquamarine | BER | cleaned |
| PER | peridot | SIN | cleaned |
| CBY | chrysoberyl | CHB | cleaned |
| ZIR | zircon | SIN | cleaned |
| RHO | rhodolite garnet | GAR | cleaned |
| TPZ | topaz | TOP | cleaned |
| TSV | tsavorite garnet | GAR | cleaned |
| ALX | alexandrite | CHB | cleaned |
| CRL | coral | ORG | cleaned |
| PRA | prasiolite | QUA | cleaned |
| TAN | tanzanite | SIN | cleaned |
| HES | hessonite garnet | GAR | cleaned |
| WOP | white opal (light opal) | SIN | cleaned |
| AMT | ametrine | QUA | cleaned |
| JAD | jade | SIN | cleaned |
| KUN | kunzite | SIN | cleaned |
| QRT | quartz | QUA | cleaned |
| TGE | tiger's eye | QUA | cleaned |
| RBT | rubellite tourmaline | TOU | cleaned |
| DEM | demantoid garnet | GAR | cleaned |
| LAP | lapis | SIN | cleaned |
| SPS | spessartite garnet | GAR | cleaned |
| TRQ | turquoise | SIN | cleaned |
| MOR | morganite | BER | cleaned |
| PRB | paraíba tourmaline | TOU | cleaned |
| SPH | sphene (titanite) | SIN | cleaned |
| RQU | rutilated quartz | QUA | cleaned |
| CSP | cobalt spinel | SPI | cleaned |
| AGT | agate | QUA | cleaned |
| MLG | malaya garnet | GAR | cleaned |
| PTP | precious topaz | TOP | cleaned |
| CJO | crystal opal (jelly opal) | SIN | cleaned |
| RQS | rose quartz | QUA | cleaned |
| BOP | black opal (dark opal) | SIN | cleaned |
| FOP | fire opal (flame opal) | SIN | cleaned |
| SMQ | smoky quartz | QUA | cleaned |
| CTM | chrome tourmaline | TOU | cleaned |
| ALM | almandine garnet | GAR | cleaned |
| BRL | beryl | BER | cleaned |
| GRD | grandidierite | SIN | cleaned |
| HEL | heliodor | BER | cleaned |
| APT | apatite | SIN | cleaned |
| BIP | boulder opal (ironstone opal) | SIN | cleaned |
| MAL | malachite | SIN | cleaned |
| GRS | grossular garnet | GAR | cleaned |
| CRN | carnelian | QUA | cleaned |
| PHE | phenakite | SIN | cleaned |
| SNL | sinhalite | SIN | cleaned |
| KRN | kornerupine | SIN | cleaned |
| IOL | iolite | SIN | cleaned |
| MGL | mali garnet | GAR | cleaned |
| FLU | fluorite | SIN | cleaned |
| ADL | andalusite | SIN | cleaned |
| SCP | scapolite | SIN | cleaned |
| CDI | chrome diopside | SIN | cleaned |
| JER | jeremejevite | SIN | cleaned |
| KYN | kyanite | SIN | cleaned |
| ADG | andradite garnet | GAR | cleaned |
| ITP | imperial topaz | TOP | cleaned |
| HAU | hauyne | SIN | cleaned |
| AND | andesine | FEL | cleaned |
| GSH | goshenite | BER | cleaned |
| RHN | rhodonite | SIN | cleaned |
| DIO | diopside | SIN | cleaned |
| TAF | taaffeite | SIN | cleaned |
| BLO | bloodstone (heliotrope) | QUA | cleaned |
| PRL | pearl | ORG | cleaned |
| RDC | rhodochrosite | SIN | cleaned |
| ONX | onyx | QUA | cleaned |
| RBE | red beryl | BER | cleaned |
| **RUB** | **ruby** | **COR** | **owner-added (empty, vendor-ready)** |
| **SAP** | **sapphire** | **COR** | **owner-added** |
| **EME** | **emerald** | **BER** | **owner-added** |
| **DIA** | **diamond** | **SIN** | **owner-added** |
| **AMB** | **amber** | **ORG** | **owner-added** |
| **LAB** | **labradorite** | **FEL** | **owner-added** |
| **SUN** | **sunstone** | **FEL** | **owner-added** |
| **AVN** | **aventurine** | **QUA** | **owner-added** |
| **CEC** | **cat's-eye chrysoberyl** | **CHB** | **owner-added** |
| **AMZ** | **amazonite** | **FEL** | **owner-added** |

## 6. Minting rules — how codes are born and why they never repeat

1. **All codes are system-minted.** Vendors never enter our codes; they may supply only their own `vendor_ref` (nullable, `UNIQUE(vendor_id, vendor_ref)` — two vendors may both use "RB-123").
2. **Uniqueness tail scope = type + variety + vendor** (e.g. every Dubai vendor's ruby counts 1, 2, 3…). The **full code is UNIQUE-constrained** in the database, so even a minting bug cannot create a duplicate — Postgres rejects it (23505).
3. **Counters live in the database** (`code_counters(scope_key, next_no)`), incremented atomically (`UPDATE … RETURNING`). Concurrency-safe: two simultaneous creators never receive the same number. The cleaning tool seeds counters as `max(minted)+1` per scope after loading.
4. **Forward-only.** Codes are never reused. Items are **soft-deleted** (`status → ARCHIVED`), never hard-deleted, so a retired number stays occupied forever.
5. **Deterministic reloads.** The cleaning tool mints in a fixed (sorted) order, so `--force` reloads reproduce the **same** codes — verified in Phase F2.
6. **Immutable at birth.** A code is minted once and never edited. Live attributes (colour, weight, price, status, carat, metal-of-a-vendor-item) are DB truth; if a *composition* changes, a **new** product gets a new code.

## 7. What is in the code vs what is in the database

| In the code (immutable identity) | In the DB (live truth) |
|---|---|
| type, family, variety | colour, clarity, shape/cut, weight (ct), dimensions |
| vendor country + vendor number | stone **origin** (Ceylon/Burma — different concept from vendor country!) |
| metal (settings & jewellery), jewellery type, kind C/M | treatment(s) — multi-valued, `gemstone_treatments` join |
| house vs vendor (HQ vs CC-VV) | `origin_type` NATURAL / LAB_CREATED / SIMULANT |
| design code (settings) | setting stone-capacity range `min_ct` / `max_ct` |
| — | price, currency, status, quantity, certificates |
| — | **media: ≤10 images · ≤5 videos/GIFs · ≤2 3D models per item; VTO = `MODEL_3D` asset with `vto_ready` + `calibration` (NULL until measured)** |

## 8. Business rules recorded with this architecture

| # | Rule |
|---|---|
| R-1 | **DYO promotion gate:** a customer's DYO design may be listed publicly (as a CONFIGURED product) **only if it was sold** (configuration reached `CONVERTED` via an order). Un-sold designs stay private forever. Listing is an admin curation decision. |
| R-2 | **vendor_ref is vendor-only.** Vendor portal + admin surfaces; never rendered on the storefront. |
| R-3 | **Variety governance:** a vendor may request a new variety; an admin approves it and assigns family + unique code. Nobody creates ad-hoc varieties. |
| R-4 | **Vendor onboarding mints `V-{CC}-{NNN}`** sequentially per country; `V-HQ-000` is reserved (house; no DB row). |
| R-5 | **Metal lives in the code; carat lives in the DB** (setting capacity `min_ct/max_ct`; jewellery carat = its stone, one join). Both render everywhere on PDP/DYO/API. |

## 9. Deferred (recorded, scheduled)

| Item | Where |
|---|---|
| Diamond 4C grading model (cut grade, fluorescence, GIA/IGI cert no.; lab-diamond grades too; melee NULL) | F3 certificates/trust increment |
| Certificate linkage + claim verification (vendor "unheated" claims etc.) | F3 certificates increment |
| DYO warnings from treatments (e.g. opal doublet not recommended for rings) | F3 AI/knowledge layer |

## 10. Cross-references

- Schema: `technical_design/41` (§4 tables, §6 cleaning rules)
- Decision: ADR-035 (`docs/adr/ADR-035-fresh-clean-database-schema.md`)
- DDL: `docs/fresh-schema/0003_vendors.sql`, `0004_semantic_codes.sql`
- Load state: `MAIHAN_GEMS_DEEP_TECHNICAL_AUDIT.md` §22.7 series + §24
