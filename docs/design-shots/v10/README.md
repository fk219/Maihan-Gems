# Design pass v10 — real photography, no app-screenshot proofs

Status: measured on `main` with `DATABASE_URL` unset for the build. The client
verdict on the v9 proof captures was that **app screenshots look cheap**. This
pass replaces them with real open-licence gemstone photography and rebuilds the
sections around the imagery. No new dependency; images are committed at
`apps/web/public/media/stock/` and served locally — nothing is hotlinked.

> Concurrent-work note: a second design pass (v11) ran in this same worktree
> while v10 was in flight. The v11 sections consumed the same stock assets and
> rewired `apps/web/src/app/(storefront)/page.tsx` to them. The v10 captures
> below were taken with the v9 wiring temporarily restored; the file was then
> restored byte-identically to the v11 wiring (SHA-256 verified). The homepage
> currently renders v11; the v10 section code lives in
> `apps/web/src/components/mgh/home/v9/` + `src/styles/home-v9.css` and re-renders
> whenever `page.tsx` imports it.

---

## 1. What changed

| Before (v9) | After (v10) |
|---|---|
| Four app-screenshot "proof" captures (`/proof/*.jpg`) in the DYO, gemologist, certificate and vendor sections | All four deleted. The DYO, gemologist and certificate sections carry real gemstone photography, captioned as illustrative; the vendor section is copy-only |
| One catalogue tanzanite photo beside the variety index | A photography-led mosaic: one lead plate + four variety tiles, variety name and carat over the image |
| No image licence record | `docs/IMAGE_CREDITS.md` — every file's source page, author and licence |
| `scripts/capture-proofs.mjs` | Removed (nothing else referenced it). Added `scripts/fetch-stock-stones.mjs`, which documents provenance and re-verifies every committed asset |

Every section keeps its eyebrow, its promise line, exactly one action, and the
global demo-content badge (untouched, global chrome). Captions say
"illustrative" wherever a photograph stands in for inventory; the demo badge
marks the fixture ledger site-wide.

---

## 2. The sections

| # | Section | Photography | Honesty |
|---|---|---|---|
| 1 | The collection | Lead plate: faceted violet-blue tanzanite with "Tanzanite · 1.31 ct · Illustrative photograph" over it; four tiles (sapphire, emerald, ruby, spinel), each labelled "Illustrative" | The carat over the plate belongs to the record named beside it; the label "illustrative" is on the plate itself. A variety with no photograph gets no tile |
| 2 | Design your own | Rough tanzanite crystal, portrait plate on black | "Illustrative photograph — the stone before the bench. The studio configures the record … never a stand-in stone." |
| 3 | AI gemologist | Cut amethysts under raking light, wide plate | "Illustrative photography — … the concierge answers from the records, not from a photograph." |
| 4 | Certificate intelligence | Deep blue diamond in a white-diamond halo | "Illustrative photography — a deep blue diamond, not the record's stone. The fields at left belong to the Elysian Ring record alone." |
| 5 | Atelier | Two large 4:5 plates — the Elysian Ring and Verdant Drop records' own committed images, captioned with each record's name, weight, form and price | Unchanged provenance; these are the records' own images |
| 6 | Vendor programme | None (was the login-card screenshot) | A picture of a login card is not evidence; the section is copy-only |
| 7 | Closing | None (one line, one action) | Unchanged |

The navbar, hero search and every other route are untouched. `api/`,
`packages/`, the admin and vendor consoles: untouched.

---

## 3. Photography provenance

Nine photographs, all Wikimedia Commons, all public domain / CC0 / CC BY
(attribution recorded per file):

| File | Stone | Author | Licence |
|---|---|---|---|
| `tanzanite.jpg` | Faceted tanzanite (lead plate) | Didier Descouens | CC BY 3.0 |
| `tanzanite-rough.jpg` | Rough tanzanite (DYO) | Géry Parent | Public domain |
| `sapphire.jpg` | Blue sapphire on pin (tile) | Delphine Montagne | CC BY 4.0 |
| `ruby.jpg` | Ruby crystals in matrix (tile) | Géry Parent | Public domain |
| `emerald.jpg` | Emerald crystal in matrix (tile) | Géry Parent | CC0 |
| `spinel.jpg` | Spinel octahedra in marble (tile) | Nessa Eull | CC0 |
| `opal.jpg` | Play-of-colour opal | Masha Milshina | CC BY 4.0 |
| `amethyst.jpg` | Cut amethysts (gemologist) | Eden, Janine and Jim | CC BY 2.0 |
| `diamond.jpg` | Deep blue diamond (certificate) | Smithsonian Institution Archives | Public domain |

Full source-page URLs and download variants: `docs/IMAGE_CREDITS.md`. Each
download was verified: JPEG magic bytes, long edge ≥ 1200 px parsed from the SOF
marker. Repo weight: ≈ 8.6 MB total.

---

## 4. Measured gates

Build: `next build`, `DATABASE_URL` unset → **exit 0**. Server for captures ran
with an unreachable database on port 3112, so every catalogue row is the
labelled fixture ledger, matching the v8/v9 measurement basis.

| Gate | Result |
|---|---|
| `pnpm -r run typecheck` | **0 errors**, exit 0 |
| `next build`, `DATABASE_URL` unset | **exit 0** |
| `@maihan/web` tests | **618 passed / 21 skipped**, 0 failed (unchanged) |
| `node scripts/check-slop.mjs` | **clean** |
| axe at 1440 / 1024 / 768 / 390 | **4 / 4 captures, 0 violation nodes, 0 rule types** |
| Horizontal overflow | **0 px** at all four widths |
| Demo badge | Still present (global chrome), verified in the served HTML |

### 4.1 Caption contrast over photography (numeric)

Sampled from the committed JPEGs (System.Drawing), composited with the scrim
actually shipped in `home-v9.css`, measured against `#F5F0E6`:

| Caption | Sampled image region | Composite | Contrast |
|---|---|---|---|
| Lead plate (tanzanite) | rgb(19, 18, 25) | #0C0B0B | **17.29 : 1** |
| Sapphire tile | rgb(149, 124, 96) | #372E24 | **11.71 : 1** |
| Emerald tile | rgb(73, 72, 68) | #1F1E1B | **14.73 : 1** |
| Ruby tile | rgb(117, 115, 113) | #2D2B29 | **12.38 : 1** |
| Spinel tile | rgb(143, 116, 93) | #352C23 | **12.09 : 1** |
| Worst case: pure-white photograph, tile scrim | rgb(255, 255, 255) | #585856 | **6.29 : 1** |
| Worst case: pure-white photograph, lead scrim | rgb(255, 255, 255) | #31302F | **11.53 : 1** |

All pass WCAG AA (≥ 4.5:1) — including the hypothetical worst case of a pure
white photograph behind the caption. No colour filter is applied to any image;
plates carry a subtle vignette only. axe's `color-contrast` **incomplete** nodes
(124) are the over-photography nodes axe cannot decide; the probe above settles
them.

---

## 5. Evidence layout

```
docs/design-shots/v10/
  README.md              this file
  after/                 v10 home at 1440 / 1024 / 768 / 390 + audit.json
  sections/              collection, dyo, gemologist, certificate, atelier,
                         vendor, close — at 1440 / 1024 / 768 / 390
```

Reproduce:

```bash
DATABASE_URL= pnpm --filter @maihan/web build
DATABASE_URL=postgres://127.0.0.1:1/maihan_offline SITE_URL=http://localhost:3112 PORT=3112 \
  pnpm --filter @maihan/web start
BASE_URL=http://localhost:3112 LABEL=after OUT_DIR=../../../docs/design-shots/v10 \
  WIDTHS=1440,1024,768,390 SHOT_ROUTES=home node scripts/craft-audit.mjs --only=home
BASE_URL=http://localhost:3112 node scripts/v10-section-shots.mjs
node scripts/fetch-stock-stones.mjs   # re-download + re-verify the stock assets
```

---

## 6. Honest gaps

- **Opal.** A photograph was sourced and committed (`opal.jpg`), but the index
  has no opal variety row in the fixture ledger, so no tile uses it — a tile for
  a variety with no record would present the range as having that stone. It is
  available the moment the catalogue carries an opal row.
- **Tourmaline, alexandrite, tsavorite.** Index varieties with records but no
  sourced photograph; their rows are text-only in the ledger. No borrowed or
  fabricated images.
- **Vendor programme.** Copy-only by decision. If the portal door ever warrants
  a plate, it should be a designed plate, not a screenshot of a login form.
- **The pictured stones are not the pictured records.** Every plate says
  "illustrative" on the image itself; the demo badge covers the fixture ledger.
  When the live catalogue photographs arrive, the plates are replaced by
  per-record media and the word "illustrative" disappears with them.

## 7. Deliberately not done

- **No new dependency** — downloads used Node 24's built-in fetch; dimension
  checks parsed JPEG SOF markers directly; the contrast probe used PowerShell's
  System.Drawing. No image-processing library was added.
- **No hotlinking.** All nine images are committed and served locally.
- **No colour filters** on any photograph; crops are object-position tuned per
  image; the only treatment is a subtle inset vignette.
- **No redesign of the locked architecture, the navbar, the hero search, or any
  other route.** The demo-content badge and its fixture flag are untouched.
